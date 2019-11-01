import { Component, OnInit, ViewChild, ElementRef, OnDestroy, ChangeDetectorRef, ViewChildren, QueryList } from '@angular/core'
import { ActivatedRoute } from '@angular/router'
import { FormGroup, FormControl } from '@angular/forms'

import { takeUntil, map, tap, debounceTime, skipWhile } from 'rxjs/operators'
import { Subject, merge, Observable, fromEvent, BehaviorSubject, combineLatest } from 'rxjs'

import adapter from 'webrtc-adapter'
import { ToastrService } from 'ngx-toastr'
import * as md5 from 'md5'

import { MeetingService } from '@/modules/main/services/meeting.service'
import { IPayload } from '@/modules/main/models/payload.model'
import { transition, trigger, state, style, animate } from '@angular/animations'
import { MatSelectChange } from '@angular/material'
import { DataChannelConnections, WebcamStreams, DisplayStreams, PeerConnections, IMessage } from '@/modules/meeting/models/meeting.model'

@Component({
  selector: 'app-meeting',
  templateUrl: './meeting.component.html',
  styleUrls: ['./meeting.component.scss'],
  // encapsulation: ViewEncapsulation.None
})
export class MeetingComponent implements OnInit, OnDestroy {

  @ViewChild('smallVideoArea', { static: false }) 
  private _smallVideoArea: ElementRef<HTMLVideoElement>

  @ViewChild('mainVideoArea', { static: false }) 
  private _mainVideoArea: ElementRef<HTMLVideoElement>

  @ViewChild('screenShareVideoArea', { static: false }) 
  private _screenShareVideoArea: ElementRef<HTMLVideoElement>

  @ViewChild('videoContainer', { static: false }) 
  private _videoContainer: ElementRef<HTMLElement>

  @ViewChild('screenShareContainer', { static: false }) 
  private _screenShareContainer: ElementRef<HTMLElement>

  @ViewChildren('remoteVideo') 
  private _remoteVideoAreas: QueryList<ElementRef<HTMLVideoElement>>

  private messengerForm: FormGroup
  public selectedUser: FormControl = new FormControl()
  private _dataChannels: DataChannelConnections = {}
  private _webcamStreams: WebcamStreams = {}
  private _displayStreams: DisplayStreams = {}
  private _connections: PeerConnections = {}
  private _transceiver: (track: MediaStreamTrack) => RTCRtpTransceiver
  private _meetingID: number = null
  private _clientIds: string[] = []
  private _clientId: string
  private _localId: string
  private _roomId: string
  public member: string = null
  public meetingData: any = null
  public type: string = null
  private destroy$: Subject<boolean> = new Subject<boolean>()
  private closeConference$: Subject<boolean> = new Subject<boolean>()
  private _displayControls$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(true)
  public displayControls$: Observable<boolean> = this._displayControls$.asObservable()
  public oppositeUserType: string = null
  public messages: any[] = []
  public users: IPayload[] = []
  public tabs: IPayload[] = []
  public selectedDataChannelId: string
  public selectedConnectionId: string
  public isStreamingReady: boolean = false
  public isVideoConfereneMode: boolean = false
  public isMuted: boolean = false
  public isDashboardHidden: boolean = false
  public isPaused: boolean = false
  public isMessageTargetSelected: boolean = false
  

  public get webcamStreamsLength() {
    const value = Object.values(this._webcamStreams).length
    return value
  }

  public get webcamStreams() {
    return this.webcamStreams
  }

  constructor(private _route: ActivatedRoute, private _meetingService: MeetingService, private _cdr: ChangeDetectorRef, private _toastrService: ToastrService) {
    this._meetingID = this._route.snapshot.queryParams.meetingId
    this.member = this._route.snapshot.queryParams.member
    this.type = this._route.snapshot.queryParams.mode

    this.meetingData = this._route.snapshot.data.result[0]
    this.oppositeUserType = this.type === 'host' ? 'guest' : 'host'
    
    this.messengerForm = new FormGroup({
      Message: new FormControl('')
    })

    const id = this._generateClientId()
    this._localId = id
    console.info(`Client Id Generated: ${id}`)
    
    this._initializeMeetingSignaling(id)
    
  }
  
  ngOnInit() {
    this._listenForOpenConnection()
  }

  private _listenForOpenConnection(): void {
    // wait until ready: when 1 or more users are in a room
    this._meetingService.ready$.pipe(takeUntil(this.destroy$)).subscribe((payload: IPayload) => {
      this.logEvent(`Initial Signal Emitted by ${this.type}`)
      this._addMember(payload)

      this._meetingService.signal('signal', {
        meetingId: this._meetingID,
        clientId: payload.clientId,
        member: this.member,
        mode: 'signaling',
        data: null,
        userType: this.type
      })
    })
  }
  
  private _initializeMeetingSignaling(id: string): void {
  
    merge(
      this._meetingService.waiting$,
      this._meetingService.signal$,
      this._meetingService.closed$,
      this._meetingService.exchange$,
      this._meetingService.multi$
    )
    .pipe(
      map((payload: IPayload) => {
        if (payload.mode === 'exchange') {
          this._addMember(payload)
        }
        return payload;
      }),
      takeUntil(this.destroy$)
    )
    .subscribe((payload: any) => this._handleSocketMessageEvent(payload))

    this._checkForReadiness(id)
  }

  private _checkForReadiness(id: string) {
    this._meetingService.signal('waiting', { 
      meetingId: this._meetingID,
      clientId: id,
      mode: "waiting", 
      userType: this.type, 
      member: this.member 
    })
  }

  private _initializePeerConnection(payload?: IPayload) {

    this.logEvent(`New RTC Peer Connection initialized for ${this.type}`)

    const id = payload.clientId

    this._connections[id] = new RTCPeerConnection({
      iceServers: [
        // Session Traversal Utilities for NAT (STUN)
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun.services.mozilla.com' },
      ]
    })

    this._dataChannels[id] = this._connections[id].createDataChannel(id, { ordered: false })

    this._dataChannels[id].onopen                       = this._handleDataChannelOnOpenEvent          .bind(this, id)
    this._connections[id].ondatachannel                 = this._handleDataChannelEvent                .bind(this, id)
    this._connections[id].onicecandidate                = this._handleICECandidateEvent               .bind(this, id)
    this._connections[id].oniceconnectionstatechange    = this._handleICEConnectionStateChangeEvent   .bind(this, id)
    this._connections[id].onicegatheringstatechange     = this._handleICEGatheringStateChangeEvent    .bind(this, id)
    this._connections[id].onsignalingstatechange        = this._handleSignalingStateChangeEvent       .bind(this, id)
    this._connections[id].onnegotiationneeded           = this._handleNegotiationNeededEvent          .bind(this, id)
    this._connections[id].ontrack                       = this._handleTrackEvent                      .bind(this, id)

    // reveal the meeting room
    this.isStreamingReady = true

    // for reference only
    this._clientId = id

    // add the id to the clients list of ids, 
    // used for referencing peer connections
    this._clientIds.push(id)

    // notify other users that a new user has an RTC Peer connection
    this._meetingService.signal('exchange', {
      clientId: id, 
      meetingId: this._meetingID, 
      member: this.member, 
      userType: this.type, 
      mode: 'exchange'
    })
  }

  private _handleSocketMessageEvent(event: IPayload): void {

    switch (event.mode) {
      case "waiting":
        this._checkForReadiness(event.clientId)
        break
      
      case "joinroom":
        
        break

      case "exchange":
        this._addMember(event)
        break
      
      case "signaling":
        if (!this._connections[event.clientId]) {
          this._initializePeerConnection(event)
        }
        break

      case "offer":
        this._handleOfferMessage(event)
        break

      case "answer":
        this._handleAnswerMessage(event)
        break

      case "icecandidate":
        this._handleNewICECandidateMessage(event)
        break

      case "hangup": 
        this._hangupAndNotify(event)
        break
      
      case "closed":
        if (this._connections.hasOwnProperty(event.clientId)) {
          this._checkForReadiness(event.clientId)
          this._initializePeerConnection(event)
        }
        break

      default:
        this._logError("Unknown message received:")
        this._logError(event)
    }

  }

  private _handleICEGatheringStateChangeEvent(id: string) {
    this.logEvent(`*** ICE gathering state changed to: ${this._connections[id].iceGatheringState}`)
  }

  private _handleSignalingStateChangeEvent(id: string) {
    this.logEvent(`*** WebRTC signaling state changed to: ${this._connections[id].signalingState}`)
    // switch (this._connections[id].signalingState) {
    //   case "closed":
    //     this._closeVideoCall()
    //     break
    // }
  }

  private _handleTrackEvent(id: string, event: RTCTrackEvent) {
    this.logEvent(`*** Track event triggering state change on main video area srcObject`)
    this._mainVideoArea.nativeElement.srcObject = event.streams[0]
  }

  private _handleICEConnectionStateChangeEvent(id: string) {
    
    const state = this._connections[id].iceConnectionState
    this.logEvent(`*** ICE connection state changed to: ${state}`)

    switch (state) {
      case "closed":
        this.endVideoConference(state)
        this.closeMeeting()
        break
      case "failed":
      case "disconnected":
        this.logEvent(`---> Peer connection has '${state}'. Attempting to reconnect to ${this.type}`)
        this.endVideoConference(state)
        this.closeMeeting()
        // this._connections[id].createOffer({ iceRestart: true })
        // this._checkForReadiness(even)
        // this._initializeMeeting()
        // this._initializeMeetingOpenListener()
        break
    }
  }

  private _handleICECandidateEvent(id: string, event: RTCPeerConnectionIceEvent) {
    if (event.candidate) {
      this.logEvent(`*** Outgoing ICE candidate: ${event.candidate.candidate}`)

      this._meetingService.signal('signal', {
        meetingId: this._meetingID,
        clientId: id,
        member: this.member,
        mode: "icecandidate",
        data: event.candidate,
        userType: this.type
      })
    }
  }

  private async _handleNegotiationNeededEvent(id: string, event: Event) {
    this.logEvent("*** Negotiation needed")

    if (this._connections[id].signalingState !== "stable") {
      this.logEvent(`--->* Signaling state is '${this._connections[id].signalingState}'. Will negotiate new offer when signaling state is stable.`)
      return
    }

    try {

      const offer = await this._connections[id].createOffer()
      this.logEvent("---> Offer Created")

      await this._connections[id].setLocalDescription(offer)
      this.logEvent("---> Set local description to the offer")

      // Send the offer to the remote peer.
      this.logEvent(`---> Sending the offer to the ${this.oppositeUserType}, using localDescription: ${this._connections[id].localDescription}`)

      this._meetingService.signal('signal', {
        meetingId: this._meetingID,
        clientId: id,
        member: this.member,
        mode: "offer",
        data: this._connections[id].localDescription,
        userType: this.type
      })

    } catch (error) {

      this._reportError(error)

    }
  }

  private async _handleNewICECandidateMessage(payload: IPayload) {

    const candidate: RTCIceCandidate = new RTCIceCandidate(payload.data)

    const id = payload.clientId

    if (!this._connections[payload.clientId]) {
      this._initializePeerConnection(payload)
    }

    this.logEvent("*** Adding received ICE candidate: " + JSON.stringify(candidate))

    try {

      if (candidate) {
        
        await this._connections[id].addIceCandidate(candidate)
        this.logEvent("---> Ice Candiate Added")

      } else {
        return
      }

    } catch (error) {

      this._reportError(error)

    }
  }

  private async _handleOfferMessage(message: IPayload) {
    
    this.logEvent(`*** Received video chat offer from ${this.oppositeUserType}`)

    const id = message.clientId

    if (!this._connections[id]) {
      this.logEvent(`Client does not have property of: ${id}`)
      this._initializePeerConnection(message)
      // return
    }
  
    const description: RTCSessionDescription = new RTCSessionDescription(message.data)

    try {
      if (this._connections[id].signalingState !== "stable" && description.type === 'offer') {

        this.logEvent("---> But the signaling state isn't stable, so triggering rollback")

        await Promise.all([
          this._connections[id].setLocalDescription({ type: "rollback" }),
          this._connections[id].setRemoteDescription(description)
        ])
        return

      } else {
        this.logEvent("---> Setting remote description")
        await this._connections[id].setRemoteDescription(description)
      }

    } catch (error) {
      this._logError(error)
    }

    if (!this._webcamStreams[id]) {

      try {

        if (this._connections[id].signalingState === "have-remote-offer" || this._connections[id].signalingState === "have-local-pranswer") {
          this.logEvent("---> Creating and Sending Answer to Caller")
          const answer: RTCSessionDescriptionInit = await this._connections[id].createAnswer()
  
          this.logEvent("---> Setting Answer to Local Description")
          await this._connections[id].setLocalDescription(answer)
        } else {
          return
        }

      } catch (error) {
        this._logError(error)
      }

      this._meetingService.signal('signal', {
        meetingId: this._meetingID,
        clientId: id,
        member: this.member,
        mode: "answer",
        data: this._connections[id].localDescription,
        userType: this.type
      })

    }
  }

  private async _handleAnswerMessage(message: IPayload) {

    this.logEvent("*** Call recipient has accepted our call")

    const id = message.clientId
    
    const description: RTCSessionDescription = new RTCSessionDescription(message.data)

    try {
      await this._connections[id].setRemoteDescription(description)

    } catch (error) {
      this._reportError(error)
    }

  }

  public endVideoConference(event: any) {

    this.logEvent("Closing the Video Conference")

    this.logEvent("--> Closing the MediaStream Tracks")

    this._resetMeetingRoom()

    this._meetingService.signal('signal', { meetingId: this._meetingID, mode: 'hangup', member: this.member, clientId: this._clientId })

  }

  public closeMeeting(): void {
    if (this._connections[this._roomId]) {

      this._connections[this._roomId].getTransceivers().forEach((track: RTCRtpTransceiver) => track.stop())

      this.logEvent("--> Closing the peer connection")
      this.logEvent("--> Closing the data channel")

      this._connections[this._roomId].close()
      this._dataChannels[this._roomId].close()
      this._connections[this._roomId] = null
      this._dataChannels = null
      this._webcamStreams[this._roomId] = null
      this._displayStreams[this._roomId] = null
      
      this.closeConference$.next(null)
      this.closeConference$.unsubscribe()
    }
  }

  private _resetMeetingRoom(): void {
    if (this._smallVideoArea.nativeElement.srcObject) {

      this._smallVideoArea.nativeElement.pause()
      
      this._clientIds.forEach((id: string, index: number) => {
        this._webcamStreams[id].getTracks().forEach((stream: MediaStreamTrack) => stream.stop())
      })
    }

    this._videoContainer.nativeElement.style.display = 'none'

    this.isVideoConfereneMode = !this.isVideoConfereneMode

    this.isDashboardHidden = false
  }

  public setSelectedUser(event: MatSelectChange): void {
    // set the current context of the datachannel
    this.selectedDataChannelId = this.setCurrentClientId(event.value)

    // show the tab group
    this.isMessageTargetSelected = !this.isMessageTargetSelected

    // add the user to the list of tabs
    this.tabs.push(this.users[event.value])

    // add the index to the FormControl
    this.selectedUser.setValue(event.value)
  }

  public setCurrentClientId(value: number): string {
    // set current context of the datachannel
    // this.selectedId = this._clientIds[event.value]
    return this._clientIds[value]
  }

  public closeTab(event: MouseEvent, index: number): void {
    // remove the tab from the list of tabs
    this.tabs.splice(index, 1)

    if (this.tabs.length === 0) {
      // hide the tab group and reset the selectedUser 
      // Form Control if the tab list length is 0
      this.isMessageTargetSelected = false
      this.selectedUser.setValue(100)
    }
    event.preventDefault()
  }

  private _addMember(payload: IPayload): void {
    if (!this.users.length) {
      this.users.push({ member: payload.member, meetingId: payload.meetingId, clientId: payload.clientId, userType: payload.userType})
      this.logEvent(`Member added as: ${payload.userType}`)
      return
    }

    this.users.forEach((user: IPayload, index: number) => {
      if (user.member === payload.member && user.userType === payload.userType) {
        return 
      }
      if (index === this.users.length - 1) {
        this.users.push({ member: payload.member, meetingId: payload.meetingId, clientId: payload.clientId, userType: payload.userType })
        this.logEvent(`*** Member: ${payload.member}: (${payload.userType}) has been added`)
      }
    })
    console.log(this.users)
  }

  private _generateClientId(): string {
    return md5(Math.floor(Math.random() * 8932839).toString())
  }

  private _hangupAndNotify(payload: IPayload): void {
    // end the video conference on the receiving end.
    // for multi member video conferences, we will 
    // simply want to notify the other members that 
    // the person has left the room
    if (this._clientIds.length === 1) {
      this._resetMeetingRoom()
    }
    this._toastrService.info(`${payload.member} has left the meeting`)
  }

  public muteMicrophone(event: MouseEvent): void {
    this.isMuted = !this.isMuted
    this._webcamStreams[this.selectedConnectionId].getAudioTracks()[0].enabled = !this._webcamStreams[this.selectedConnectionId].getAudioTracks()[0].enabled
  }

  public disableVideoCamera(event: MouseEvent): void {
    this.isPaused = !this.isPaused
    this._webcamStreams[this.selectedConnectionId].getVideoTracks().map((stream: MediaStreamTrack) => stream.enabled = !stream.enabled)
  }

  private _watchForMouseMovement(): void {

    combineLatest([
      fromEvent(document.getElementById('videoconference-controls'), 'mouseenter').pipe(
        skipWhile(() => !this._displayControls$.value),
        tap((event: MouseEvent) => {
          event.preventDefault()
          return this._displayControls$.next(true);
        })
      ),
      fromEvent(document, 'mousemove').pipe(
        skipWhile(() => !this._displayControls$.value),
        tap((event: MouseEvent) => this._displayControls$.next(true)),
        debounceTime(1500),
        tap((event: MouseEvent) => this._displayControls$.next(false)),
      ),
      fromEvent(document, 'mouseleave').pipe(
        tap((event: MouseEvent) => this._displayControls$.next(false))
      )
    ])
    .pipe(takeUntil(this.closeConference$))
    .subscribe()
  }

  public enterVideoConferenceMode(event: MouseEvent): void {
    this.logEvent(`*** Entering Video Conference mode`)

    this.isDashboardHidden = true

    this._videoContainer.nativeElement.style.display = 'inline-block'
    
    const constraints: MediaStreamConstraints = {
      audio: true,
      video: {
        width: { min: 1280, ideal: 1280, max: 1920 },
        height: { min: 720, ideal: 720, max: 1080 }
      }
    }
    
    this._clientIds.forEach( 
      async (id: string, index: number) => {
        try {
          this._webcamStreams[id] = await navigator.mediaDevices.getUserMedia(constraints)
          this.logEvent(`---> Acquired user media for ${this.oppositeUserType}`)
          
          // we only want to set the srcObject once, 
          // even if there are multiple members in the meeting
          if (index === 0) {
            this._smallVideoArea.nativeElement.srcObject = this._webcamStreams[id]
            this.selectedConnectionId = id
            this.logEvent(`---> Added webcam stream to small video area element on ${this.oppositeUserType}`)
          }
          
          // add the tracks to the RTCPeerConnection
          this._addTracksToConnection(this._webcamStreams[id], id)

          this._watchForMouseMovement()
          // this._configureAudioContext()

        } catch (error) {
          this._handleGetUserMediaError(error)
          return
        }
      }
    )
      
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
      
      // this._displayStreams[this._roomId] = await navigator.mediaDevices.getDisplayMedia(constraints)
      this.logEvent(`---> Display media has been set to _connections[this._roomId].displayStream`)

      this._screenShareVideoArea.nativeElement.srcObject = this._displayStreams[this._roomId]
      this.logEvent(`---> Added DisplayStream to screenshare video area`)

      // this._addTracksToConnection(this._displayStreams[this._roomId])
      
      this._screenShareContainer.nativeElement.style.display = 'none'

      this.isDashboardHidden = true

    } catch (error) {
      this._handleGetDisplayMediaError(error)
    }
  }

  private _configureAudioContext(): void {
    const context: AudioContext = new AudioContext()
    const sineWave: OscillatorNode = context.createOscillator()
    const gainNode: GainNode = context.createGain()

    sineWave.connect(gainNode)
    gainNode.connect(context.destination)
    sineWave.start(0)

    gainNode.gain.value = 0.9
  }

  private _addTracksToConnection(stream: MediaStream, id: string): void {
    // RTCPeerConnection ontrack event fired when addTrack() is called
    stream.getTracks().forEach((track: MediaStreamTrack) => {
      this._connections[id].addTrack(track, stream)
      this.logEvent(`---> Added track: ${track.label} to connection`)
    })
  }

  private _handleDataChannelEvent(id: string, event: RTCDataChannelEvent) {
    this.logEvent(`---> Data Channel Initiated on ${this.oppositeUserType}`)
    this._dataChannels[id] = event.channel
    this._dataChannels[id].onmessage = this.handleDataChannelMessage.bind(this, id)

    this._dataChannels[id].onopen = this.handleReceiveChannelStatusChange.bind(this, id)
    this._dataChannels[id].onclose = this.handleReceiveChannelStatusChange.bind(this, id)
  }

  private handleReceiveChannelStatusChange(id: string, event: Event) {
    if (this._dataChannels[id]) {
      this.logEvent("Data channel's status has changed to " + this._dataChannels[id].readyState)
    }
  }

  private handleDataChannelMessage(id: string, event: MessageEvent) {
    this.logEvent(`*** DataChannel Message Received: ${event.data}`)
    const message = JSON.parse(event.data)
    this._toastrService.info(`New Message from ${message.sender} (${message.userType})`)

    const index: number = message.messageThreadIndex
    // add the user to the list of tabs
    if (this.tabs.length !== this.users.length) {
      this.tabs.push(this.users[index])
    }

    if (!this.selectedDataChannelId) {
      this.selectedDataChannelId = message.clientId
    }

    if (this.messages.length) {
      this.messages[index].push(message)
    }
    else {
      this.messages.push([message])
    }

    // this.messages.push([ message ])
    this.selectedUser.setValue(index)
    this.isMessageTargetSelected = true
    this._cdr.detectChanges()
  }

  private _handleDataChannelOnOpenEvent(id: string) {
    if (this._dataChannels[id].readyState === 'open') {
      this.logEvent("Data Channel open")
      this._dataChannels[id].onmessage = this.handleDataChannelMessage.bind(this, id)
    }
  }

  public alignMessage(type: string): string {
    return type === this.oppositeUserType ? 'flex-start' : 'flex-end'
  }

  public setBackgroundColor(type: string): string {
    return type === this.oppositeUserType ? 'rgba(16, 160, 16, 0.92)' : 'rgba(71, 139, 213, 0.988)' // greeen : blue (respectively)
  }

  public sendMessage(event: MouseEvent): void {

    const index = this.users.findIndex((user: IPayload) => user.clientId === this.selectedDataChannelId)

    const content = {
      sender: this.member,
      body: this.messengerForm.controls['Message'].value,
      contentType: 'message',
      userType: this.type,
      timestamp: new Date(),
      clientId: this.selectedDataChannelId,
      messageThreadIndex: index
    }

    if (this.messages.length) {
      this.messages[index].push(content)
    }
    else {
      this.messages.push([content])
    }

    this.messengerForm.controls['Message'].setValue("")

    this._dataChannels[this.selectedDataChannelId].send(JSON.stringify(content))
    this.logEvent(`*** DataChannel message sent: ${JSON.stringify(content)}`)
  }

  public sendFile(changeEvent: any): void {

    if (!changeEvent.target.files) {
      return
    }

    const file: File = changeEvent.target.files[0]
    const chunk = 16384
    const index = this.users.findIndex((user: IPayload) => user.clientId === this.selectedDataChannelId)


    const message = {
      sender: this.member,
      body: "Download file",
      filename: file.name,
      filesize: file.size,
      contentType: 'file',
      userType: this.type,
      timestamp: new Date()
    }

    this.messages[index].push(message)
    
    const payload = JSON.stringify(message) 

    this._dataChannels[this.selectedDataChannelId].send(payload)

    this._meetingService.signal('files', {
      meetingId: this._meetingID,
      member: this.member,
      filename: file.name,
      filesize: file.size,
      isUpload: true,
      data: payload,
      userType: this.type
    })
    
    const sliceFile = (offset: any) => {

      const reader = new FileReader()

      reader.onload = () => {
        return (event: any) => {

          this._dataChannels[this._roomId].send(event.target.result)

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

  private _logInfoEvent(message: string): void {
    const time = new Date()
    console.info("[" + time.toLocaleTimeString() + "] " + message)
  }

  ngOnDestroy() {
    this.destroy$.next(false)
    this.destroy$.unsubscribe()
    this._displayControls$.next(null)
    this._displayControls$.unsubscribe()
  }

}
