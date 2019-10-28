import { Component, OnInit, ViewChild, ElementRef, OnDestroy, ViewEncapsulation, ChangeDetectorRef } from '@angular/core'
import { ActivatedRoute } from '@angular/router'
import { takeUntil, map, startWith, delay, endWith, tap } from 'rxjs/operators'
import { MeetingService } from '../../../main/services/meeting.service'
import { Subject, merge, Observable, fromEvent, BehaviorSubject } from 'rxjs'

import { IPayload } from '../../../main/models/payload.model'

import adapter from 'webrtc-adapter';
import { FormGroup, FormControl } from '@angular/forms'

@Component({
  selector: 'app-meeting',
  templateUrl: './meeting.component.html',
  styleUrls: ['./meeting.component.scss'],
  encapsulation: ViewEncapsulation.None 
})
export class MeetingComponent implements OnInit, OnDestroy {
  @ViewChild('smallVideoArea', { static: false }) private _smallVideoArea: ElementRef<HTMLVideoElement>
  @ViewChild('mainVideoArea', { static: false }) private _mainVideoArea: ElementRef<HTMLVideoElement>
  @ViewChild('screenShareVideoArea', { static: false }) private _screenShareVideoArea: ElementRef<HTMLVideoElement>
  @ViewChild('videoContainer', { static: false }) private _videoContainer: ElementRef<HTMLElement>
  @ViewChild('screenShareContainer', { static: false }) private _screenShareContainer: ElementRef<HTMLElement>
  private messengerForm: FormGroup
  private _url: string = null
  public connection: RTCPeerConnection
  private dataChannel: RTCDataChannel
  private _webcamStream: MediaStream = null
  private _displayStream: MediaStream = null
  private _transceiver: (track: MediaStreamTrack) => RTCRtpTransceiver
  private _meetingID: number = null
  private _member: string = null
  public meetingData: any = null
  private _type: string = null
  private destroy$: Subject<boolean> = new Subject<boolean>()
  private _displayControls$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(true)
  public displayControls$: Observable<boolean> = this._displayControls$.asObservable()
  public isStreamingReady: boolean = false
  public isVideoConfereneMode: boolean = false
  public logMode: string = null
  // public messages: any[] = Array.from({ length: 10 }).map((_: any, index: number) => {
  //   return {
  //     contentType: 'message',
  //     userType: index % 2 === 0 ? 'guest' : 'host',
  //     body: "I am trying to develop a Video Calling/Conferencing application using WebRTC and node.js. Right now there is no facility to control bandwidth during during video call. Is there any way to control/reduce bandwidth. (like I want make whole my web application to work on 150 kbps while video conferencing"
  //   }
  // })
  public messages: any[] = []
  public isMuted: boolean = false
  public isDashboardHidden: boolean = false

  constructor(private _route: ActivatedRoute, private _meetingService: MeetingService, private _cdr: ChangeDetectorRef) {
    this._initializeMessenger()
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
    this._type = this._route.snapshot.queryParams.mode

    this.meetingData = this._route.snapshot.data.result[0]
    console.log(this.meetingData)
    this.logMode = this._type === 'host' ? 'guest' : 'host'

    merge(this._meetingService.waiting$, this._meetingService.signal$, this._meetingService.closed$).pipe(
      takeUntil(this.destroy$), 
      map((payload: IPayload) => payload)
    ).subscribe((payload: IPayload) => this._handleSocketMessageEvent(payload))

    this._checkForReadiness()
  }

  private _checkForReadiness() {
    this._meetingService.signal('initialize', { meetingId: this._meetingID, mode: "waiting" })
  }

  private _initializePeerConnection() {

    this.logEvent(`New RTC Peer Connection initialized for ${this._type}`)
    this.connection = new RTCPeerConnection({
      iceServers: [
        // Session Traversal Utilities for NAT (STUN) 
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

    // fromEvent(document, 'mousemove').pipe(
    //   tap(() => this._displayControls$.next(true)),
    //   delay(5000),
    //   tap(() => this._displayControls$.next(false)),
    //   takeUntil(this.destroy$)
    // ).subscribe()
  }

  private _handleSocketMessageEvent(event?: IPayload) {

    switch (event.mode) {
      case "waiting":
        // we continuously check to see if someone else has joined the room. 
        // the server will continue to emit 'signal' events while there is only one client in the room
        this._checkForReadiness()
        break

      case "closed":
        if (this.connection) {
          this._checkForReadiness()
          this._initializePeerConnection()
        }
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

  private _initializeMessenger(): void {
    this.messengerForm = new FormGroup({
      Message: new FormControl('')
    })
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

  public handleTrackEvent(event: RTCTrackEvent) {
    this.logEvent("*** Track event triggering state change on main video area srcObject")
    this._mainVideoArea.nativeElement.srcObject = event.streams[0]
  }

  public handleICEConnectionStateChangeEvent(event: Event) {

    const state = this.connection.iceConnectionState
    this.logEvent(`*** ICE connection state changed to: ${state}`)

    switch (state) {
      case "closed":
        this.endVideoConference(state)
        this.closeMeeting()
        break
      case "failed":
      case "disconnected":
        this.logEvent(`---> Peer connection has '${state}'. Attempting to reconnect to ${this._type}`)
        this.endVideoConference(state)
        this.closeMeeting()
        // this.connection.createOffer({ iceRestart: true })
        this._checkForReadiness()
        // this._initializeMeeting()
        // this._initializeMeetingOpenListener()
        break
    }
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
      const offer = await this.connection.createOffer()
      this.logEvent("---> Offer Created")
      
      if (this.connection.signalingState !== "stable") {
        this.logEvent("--->* Signaling state is unstable. Will negotiate new offer when stable.")
        return
      }

      // Establish the offer as the local peer's current description.
      await this.connection.setLocalDescription(offer)
      this.logEvent("---> Set local description to the offer")

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

  private async _handleNewICECandidateMessage(payload: IPayload) {

    const candidate: RTCIceCandidate = new RTCIceCandidate(payload.data)

    this.logEvent("*** Adding received ICE candidate: " + JSON.stringify(candidate))

    try {

      if (candidate) {
        
        await this.connection.addIceCandidate(candidate)
        this.logEvent("---> Ice Candiate Added")

      } else {
        return
      }

    } catch (error) {

      this._reportError(error)

    }
  }

  private async _handleVideoOfferMessage(message: IPayload) {

    // const getUserMedia = navigator.mediaDevices.getUserMedia || navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia;
    
    this.logEvent(`*** Received video chat offer from ${this.logMode}`)
  
    if (!this.connection) {
      this._initializePeerConnection()
    }

    const description: RTCSessionDescription = new RTCSessionDescription(message.data)

    try {
      if (this.connection.signalingState !== "stable" && description.type === 'offer') {

        this.logEvent("---> But the signaling state isn't stable, so triggering rollback")

        await Promise.all([
          this.connection.setLocalDescription({ type: "rollback" }),
          this.connection.setRemoteDescription(description)
        ])
        return

      } else {
        this.logEvent("---> Setting remote description")
        await this.connection.setRemoteDescription(description)
      }

    } catch (error) {
      this._logError(error)
    }

    if (!this._webcamStream) {

      try {

        if (this.connection.signalingState === "have-remote-offer" || this.connection.signalingState === "have-local-pranswer") {
          this.logEvent("---> Creating and Sending Answer to Caller")
          const answer: RTCSessionDescriptionInit = await this.connection.createAnswer()
  
          this.logEvent("---> Setting Answer to Local Description")
          await this.connection.setLocalDescription(answer)
        } else {
          return
        }

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

  public endVideoConference(state: string) {

    this.logEvent("Closing the Video Conference")

    if (this.connection) {
      this.logEvent("--> Closing the MediaStream Tracks")

      if (this._smallVideoArea.nativeElement.srcObject) {
        this._smallVideoArea.nativeElement.pause()
        this._webcamStream.getTracks().forEach((stream: MediaStreamTrack) => stream.stop())
      }

      this._videoContainer.nativeElement.style.display = 'none'

      this.isVideoConfereneMode = !this.isVideoConfereneMode

    }
  }

  public closeMeeting(): void {
    if (this.connection) {

      this.connection.getTransceivers().forEach((track: RTCRtpTransceiver) => track.stop())

      this.logEvent("--> Closing the peer connection")
      this.logEvent("--> Closing the data channel")

      this.connection.close()
      this.dataChannel.close()
      this.connection = null
      this.dataChannel = null
      this._webcamStream = null
      this._displayStream = null
    }
  }

  public muteMicrophone(event: MouseEvent): void {
    this.isMuted = !this.isMuted
    this._webcamStream.getAudioTracks()[0].enabled = !this._webcamStream.getAudioTracks()[0].enabled
  }

  public async enterVideoConferenceMode(event: MouseEvent): Promise<void> {
    this.logEvent(`*** Entering Video Conference mode`)

    this.isDashboardHidden = true

    this._videoContainer.nativeElement.style.display = 'inline-block'

    if (!this.connection) {
      this._initializePeerConnection()
    }

    try {

      const constraints: MediaStreamConstraints = {
        audio: true,
        video: {
          width: { min: 1280, ideal: 1280, max: 1920 },
          height: { min: 720, ideal: 720, max: 1080 }
        }
      }

      this._webcamStream = await navigator.mediaDevices.getUserMedia(constraints)
      this.logEvent(`---> Acquired user media for ${this.logMode}`)

      this._smallVideoArea.nativeElement.srcObject = this._webcamStream
      this.logEvent(`---> Added webcam stream to small video area element on ${this.logMode}`)

      this._addTracksToConnection(this._webcamStream)

    } catch (error) {
      this._handleGetUserMediaError(error)
      return
    }
  }

  public async enterScreenSharingMode(event: MouseEvent): Promise<void> {
    try {
      this.logEvent(`*** Entering Screen Sharing Mode`)

      const constraints = {
        audio: true,
        video: {
          width: { min: 1280, ideal: 1280, max: 1920 },
          height: { min: 720, ideal: 720, max: 1080 }
        }
      }

      if (adapter.browserDetails.browser === 'firefox') {
        adapter.browserShim.shimGetDisplayMedia(window, 'screen')
      }
      
      this._displayStream = await navigator.mediaDevices.getDisplayMedia(constraints)
      this.logEvent(`---> Display media has been set to _displayStream`)

      this._screenShareVideoArea.nativeElement.srcObject = this._displayStream
      this.logEvent(`---> Added DisplayStream to screenshare video area`)

      this._addTracksToConnection(this._displayStream)
      
      this._screenShareContainer.nativeElement.style.display = 'none'

      this.isDashboardHidden = true

    } catch (error) {
      this._handleGetDisplayMediaError(error)
    }
  }

  private _addTracksToConnection(stream: MediaStream): void {
    // RTCPeerConnection ontrack event fired when addTrack() is called
    stream.getTracks().forEach((track: MediaStreamTrack) => {
      this.connection.addTrack(track, this._webcamStream)
      this.logEvent(`---> Added track: ${track.label}; to connection`)
    })
  }

  private handleDataChannelEvent(event: RTCDataChannelEvent) {
    this.logEvent(`---> Data Channel Initiated on ${this.logMode}`)
    this.dataChannel = event.channel
    this.dataChannel.onmessage = this.handleDataChannelMessage.bind(this)

    this.dataChannel.onopen = this.handleReceiveChannelStatusChange.bind(this)
    this.dataChannel.onclose = this.handleReceiveChannelStatusChange.bind(this)
  }

  private handleReceiveChannelStatusChange(event: Event) {
    if (this.dataChannel) {
      this.logEvent("Data channel's status has changed to " + this.dataChannel.readyState)
    }
  }

  private handleDataChannelMessage(event: MessageEvent) {
    this.logEvent(`*** DataChannel Message Received: ${event.data}`)
    const message = JSON.parse(event.data)

    this.messages.push(message)
    this._cdr.detectChanges()
  }

  private handleDataChannelOnOpenEvent() {
    if (this.dataChannel.readyState === 'open') {
      this.logEvent("Data Channel open")
      this.dataChannel.onmessage = this.handleDataChannelMessage.bind(this)
    }
  }

  public alignMessage(type: string): string {
    return type === this.logMode ? 'flex-start' : 'flex-end'
  }

  public setBackgroundColor(type: string): string {
    return type === this.logMode ? 'rgba(16, 160, 16, 0.92)' : 'rgba(71, 139, 213, 0.988)' // greeen : blue (respectively)
  }

  public sendMessage(event: MouseEvent): void {

    const content = {
      sender: this._member,
      body: this.messengerForm.controls['Message'].value,
      contentType: 'message',
      userType: this._type,
      timestamp: new Date()
    }

    this.messages.push(content)
    this.messengerForm.controls['Message'].setValue("")

    this.dataChannel.send(JSON.stringify(content))
    this.logEvent(`*** DataChannel message sent: ${JSON.stringify(content)}`)
  }

  public sendFile(changeEvent: any): void {

    if (!changeEvent.target.files) {
      return
    }

    const file: File = changeEvent.target.files[0]
    const chunk = 16384

    const message = {
      sender: this._member,
      body: "Download file",
      filename: file.name,
      filesize: file.size,
      contentType: 'file',
      userType: this._type,
      timestamp: new Date()
    }

    this.messages.push(message)
    
    const payload = JSON.stringify(message) 

    this.dataChannel.send(payload)

    return 

    this._meetingService.signal('files', {
      meetingId: this._meetingID,
      member: this._member,
      filename: file.name,
      filesize: file.size,
      isUpload: true,
      data: payload,
      userType: this._type
    })
    
    const sliceFile = (offset: any) => {

      const reader = new FileReader()

      reader.onload = () => {
        return (event: any) => {

          this.dataChannel.send(event.target.result)

          if (file.size > (offset + event.target.result.byteLength)) {
            setTimeout(sliceFile, 0, (offset + chunk))
          }

          // set file upload progress here
        }
      }

      const slice = file.slice(offset, (offset + chunk))
      reader.readAsArrayBuffer(slice)
    }
    sliceFile(0)
    // this.fileTransfer = false
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

  private _handleGetDisplayMediaError(error: Error): void {
    switch (error.name) {
      case "NotFoundError":
      case "AbortError":
      case "InvalidStateError":
      case "NotAllowedError":
      case "NotFoundError":
      case "NotReadableError":
      case "NotReadableError":
      case "OverconstrainedError":
      case "TypeError":
        this._logError(error)
        break
    }
  }

  public logEvent(text: string): void {
    const time = new Date()
    console.log("[" + time.toLocaleTimeString() + "] " + text)
  }

  private _logError(text: any): void {
    const time = new Date()
    console.error("[" + time.toLocaleTimeString() + "] " + text)
  }

  private _reportError(message: Error) {
    this._logError(`Error ${message.name}: ${message.message}`)
  }

  ngOnDestroy() {
    this.destroy$.next(false)
    this.destroy$.unsubscribe()
    this._displayControls$.next(null)
    this._displayControls$.unsubscribe()
  }

}
