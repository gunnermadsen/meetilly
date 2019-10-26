import { Component, OnInit, ViewChild, ElementRef, OnDestroy, Renderer2 } from '@angular/core'
import { Router, ActivatedRouteSnapshot, ActivatedRoute } from '@angular/router'
import { take, takeUntil } from 'rxjs/operators'
import { MeetingService } from '../../../main/services/meeting.service'
import { Observable, Subject } from 'rxjs'

import { config } from '@/app.module'
import { IPayload } from '../../../main/models/payload.model'

import adapter from 'webrtc-adapter';

@Component({
  selector: 'app-meeting',
  templateUrl: './meeting.component.html',
  styleUrls: ['./meeting.component.scss']
})
export class MeetingComponent implements OnInit, OnDestroy {
  private _url: string = null
  public connection: RTCPeerConnection
  private dataChannel: RTCDataChannel
  private _webcamStream: MediaStream = null
  private _transceiver: (track: MediaStreamTrack) => RTCRtpTransceiver
  private _meetingID: number = null
  private _member: string = null
  private _meetingData: any = null
  private _type: string = null
  private destroy$: Subject<boolean> = new Subject<boolean>()

  @ViewChild('smallVideoArea', { static: false }) 
  private _smallVideoArea: ElementRef<HTMLVideoElement>

  @ViewChild('mainVideoArea', { static: false }) 
  private _mainVideoArea: ElementRef<HTMLVideoElement>
  public isStreamingReady: boolean = false
  public logMode: string = null
  constructor(private _route: ActivatedRoute, private _meetingService: MeetingService) {
    this._initializeMeeting()
  }

  ngOnInit() {
    this._initializeMeetingOpenListener()
  }

  private _initializeMeetingOpenListener(): void {
    // wait until the open event is triggered (when 1 or more users are in a room)
    this._meetingService.connection$.pipe(takeUntil(this.destroy$)).subscribe((event: any) => {
      this.logEvent(`Initial Signal Emitted by ${this._type}`)
      this._meetingService.signal('signal', {
        meetingId: this._meetingID,
        member: this._member,
        mode: 'signaling',
        data: null,
        userType: this._type
      })
    })
  }

  private _initializeMeeting(): void {
    this._meetingID = this._route.snapshot.queryParams.meetingId
    this._member = this._route.snapshot.params.userName
    this._meetingData = this._route.snapshot.data.result[0]
    this._type = this._route.snapshot.queryParams.mode
    this.logMode = this._type === 'host' ? 'guest' : 'host'

    this._meetingService.signal$.pipe(takeUntil(this.destroy$)).subscribe((payload: IPayload) => {
      return this._handleSocketMessageEvent(payload);
    })

    this._meetingService.waiting$.pipe(takeUntil(this.destroy$)).subscribe((payload: IPayload) => this._handleSocketMessageEvent(payload))
    // this._initializePeerConnection()
    this._checkForReadiness()
  }

  private _checkForReadiness() {
    this._meetingService.signal('initialize', { meetingId: this._meetingID, mode: "waiting" })
  }

  private _initializePeerConnection() {

    this.logEvent(`New RTC Peer Connection initialized for ${this._type}`)
    this.connection = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun.services.mozilla.com' },
      ]
    })

    this.dataChannel = this.connection.createDataChannel('meetingChannel', { ordered: false })

    this.dataChannel.onopen = this.handleDataChannelOnOpenEvent.bind(this)
    this.connection.ondatachannel = this.handleDataChannelEvent.bind(this)

    this.connection.onicecandidate = this.handleICECandidateEvent.bind(this)
    this.connection.oniceconnectionstatechange = this.handleICEConnectionStateChangeEvent.bind(this)
    this.connection.onicegatheringstatechange = this.handleICEGatheringStateChangeEvent.bind(this)
    this.connection.onsignalingstatechange = this.handleSignalingStateChangeEvent.bind(this)
    this.connection.onnegotiationneeded = this.handleNegotiationNeededEvent.bind(this)
    this.connection.ontrack = this.handleTrackEvent.bind(this)

    // reveal the meeting room
    this.isStreamingReady = true
  }

  private _handleSocketMessageEvent(event?: IPayload) {

    switch (event.mode) {
      case "waiting":
        // we continuously check to see if someone else has joined the room. 
        // the server will continue to emit 'signal' events while there is only one client in the room
        this._checkForReadiness()
        break

      case "signaling":
        if (!this.connection) {
          this._initializePeerConnection()
        }
        break

      case "offer":
        this._handleVideoOfferMessage(event)
        break

      case "answer":
        this._handleVideoAnswerMessage(event)
        break

      case "icecandidate":
        this._handleNewICECandidateMessage(event)
        break

      // case "hang-up": // The other peer has hung up the call
      //   this._handleHangUpMsg(message)
      //   break

      // Unknown message output to console for debugging.
      default:
        this._logError("Unknown message received:")
        this._logError(event)
    }

  }

  public handleICEGatheringStateChangeEvent(event: Event) {
    this.logEvent("*** ICE gathering state changed to: " + this.connection.iceGatheringState)
  }

  public handleSignalingStateChangeEvent(event: Event) {
    this.logEvent("*** WebRTC signaling state changed to: " + this.connection.signalingState)
    // switch (this.connection.signalingState) {
    //   case "closed":
    //     this._closeVideoCall()
    //     break
    // }
  }

  public handleICEConnectionStateChangeEvent(event: Event) {
    this.logEvent("*** ICE connection state changed to: " + this.connection.iceConnectionState)

    switch (this.connection.iceConnectionState) {
      case "closed":
        this._closeVideoCall()
        break
      case "failed":
      case "disconnected":
        this._closeVideoCall()
        this._initializeMeeting()
        this._initializeMeetingOpenListener()
        break
    }
  }

  public handleTrackEvent(event: RTCTrackEvent) {
    this.logEvent("*** Track event triggering state change on main video area srcObject")
    this._mainVideoArea.nativeElement.srcObject = event.streams[0]
  }

  public handleICECandidateEvent(event: RTCPeerConnectionIceEvent) {
    if (event.candidate) {
      this.logEvent("*** Outgoing ICE candidate: " + event.candidate.candidate)

      this._meetingService.signal('signal', {
        meetingId: this._meetingID,
        member: this._member,
        mode: "icecandidate",
        data: event.candidate, //JSON.stringify({ candidate: event.candidate }),
        userType: this._type
      })
    }
  }

  public async handleNegotiationNeededEvent(event: Event) {
    this.logEvent("*** Negotiation needed")

    try {
      this.logEvent("---> Creating offer")
      const offer = await this.connection.createOffer()

      // If the connection hasn't yet achieved the "stable" state,
      // return to the caller. Another negotiationneeded event
      // will be fired when the state stabilizes.

      if (this.connection.signalingState !== "stable") {
        this.logEvent("     -- The connection isn't stable yet postponing...")
        return
      }

      // Establish the offer as the local peer's current description.
      this.logEvent("---> Setting local description to the offer")
      await this.connection.setLocalDescription(offer)

      // Send the offer to the remote peer.
      this.logEvent(`---> Sending the offer to the ${this.logMode}, using localDescription: ${this.connection.localDescription}`)
      
      this._meetingService.signal('signal', {
        meetingId: this._meetingID,
        member: this._member,
        mode: "offer",
        data: this.connection.localDescription,
        userType: this._type
      })

    } catch (error) {
      this.logEvent("*** The following error occurred while handling the negotiationneeded event:")
      this._reportError(error)
    }
  }

  public logEvent(text: string): void {
    const time = new Date()
    console.log("[" + time.toLocaleTimeString() + "] " + text)
  }

  private _logError(text: any): void {
    const time = new Date()

    // tslint:disable-next-line: no-console
    console.error("[" + time.toLocaleTimeString() + "] " + text)
  }

  private async _handleVideoOfferMessage(message: IPayload) {

    // const getUserMedia = navigator.mediaDevices.getUserMedia || navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia;

    
    this.logEvent(`Received video chat offer from ${this.logMode}`)
  
    if (!this.connection) {
      this._initializePeerConnection()
    }

    const description: RTCSessionDescription = new RTCSessionDescription(message.data)

    try {
      if (this.connection.signalingState !== "stable" && description.type === 'offer') {

        this.logEvent("  - But the signaling state isn't stable, so triggering rollback")

        await Promise.all([
          this.connection.setLocalDescription({ type: "rollback" }),
          this.connection.setRemoteDescription(description)
        ])
        return

      } else {
        this.logEvent("  - Setting remote description")
        await this.connection.setRemoteDescription(description)
      }

    } catch (error) {
      this._logError(error)
    }

    if (!this._webcamStream) {

      try {
        // Add the camera stream to the RTCPeerConnection
        this._webcamStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true })
        this.logEvent(`---> Acquired user media for ${this.logMode}`)

        // set the stream to the video elements srcObject property
        this._smallVideoArea.nativeElement.srcObject = this._webcamStream
        this.logEvent(`---> Added webcam stream to small video area element on ${this.logMode}`)

        this._webcamStream.getTracks().forEach((track: MediaStreamTrack) => {
          this.logEvent(`---> Adding track to RTC Peer Connection ${track.label}`)
          this.connection.addTrack(track, this._webcamStream)
        })

      } catch (err) {
        this._handleGetUserMediaError(err)
        return
      }

      try {
        this.logEvent("---> Creating and Sending Answer to Caller")
        const answer: RTCSessionDescriptionInit = await this.connection.createAnswer()

        this.logEvent("---> Setting Answer to Local Description")
        await this.connection.setLocalDescription(answer)

      } catch (error) {
        this._logError(error)
      }

      this._meetingService.signal('signal', {
        meetingId: this._meetingID,
        member: this._member,
        mode: "answer",
        data: this.connection.localDescription,
        userType: this._type
      })

    }
  }

  private async _handleVideoAnswerMessage(message: IPayload) {

    this.logEvent("*** Call recipient has accepted our call")
    
    const description: RTCSessionDescription = new RTCSessionDescription(message.data)

    try {
      await this.connection.setRemoteDescription(description)

    } catch (error) {
      this._reportError(error)
    }

  }

  private _handleGetUserMediaError(error: Error) {
    this._logError(error)
    switch (error.name) {
      case "NotFoundError":
        alert("Unable to open your call because no camera and/or microphone" +
          "were found.")
        break
      case "SecurityError":
      case "PermissionDeniedError":
        // Do nothing this is the same as the user canceling the call.
        break
      default:
        alert("Error opening your camera and/or microphone: " + error.message)
        break
    }
  }

  private async _handleNewICECandidateMessage(payload: IPayload) {

    const candidate: RTCIceCandidate = new RTCIceCandidate(payload.data)

    this.logEvent("*** Adding received ICE candidate: " + JSON.stringify(candidate))

    try {

      await this.connection.addIceCandidate(candidate)

    } catch (error) {

      this._reportError(error)

    }
  }

  private _reportError(message: Error) {
    this._logError(`Error ${message.name}: ${message.message}`)
  }

  private _closeVideoCall() {

    this.logEvent("Closing the call")

    if (this.connection) {
      this.logEvent("--> Closing the peer connection")

      this.connection.ontrack = null
      this.connection.onicecandidate = null
      this.connection.oniceconnectionstatechange = null
      this.connection.onsignalingstatechange = null
      this.connection.onicegatheringstatechange = null
      this.connection.onnegotiationneeded = null

      this.dataChannel.onmessage = null
      this.dataChannel.onopen = null

      this.connection.getTransceivers().forEach((transceiver: RTCRtpTransceiver) => transceiver.stop())

      if (this._smallVideoArea.nativeElement.srcObject) {
        this._smallVideoArea.nativeElement.pause()
        this._webcamStream.getTracks().forEach((track: MediaStreamTrack) => track.stop())
      }

      this.connection.close()
      this.dataChannel.close()
      this.connection = null
      this.dataChannel = null
      this._webcamStream = null
    }

    // Disable the hangup button

    // document.getElementById("hangup-button").disabled = true
    // targetUsername = null
  }

  private handleDataChannelEvent(event) {
    this.logEvent("Receiving a data channel")
    this.dataChannel = event.channel
    this.dataChannel.onmessage = this.receiveDataChannelMessage

    this.dataChannel.onopen = this.handleReceiveChannelStatusChange
    this.dataChannel.onclose = this.handleReceiveChannelStatusChange
  }


  private handleReceiveChannelStatusChange(event) {
    if (this.dataChannel) {
      this.logEvent("Data channel's status has changed to " + this.dataChannel.readyState)
    }
  }

  private receiveDataChannelMessage(event) {
    this.logEvent("From DataChannel: " + event.data)
    // appendChatMessage(event.data, 'message-out')
  }

  private handleDataChannelOnOpenEvent() {
    if (this.dataChannel.readyState === 'open') {
      this.logEvent("Data Channel open")
      this.dataChannel.onmessage = this.receiveDataChannelMessage
    }
  }

  ngOnDestroy() {
    this.destroy$.next(false)
    this.destroy$.unsubscribe()
  }

}
