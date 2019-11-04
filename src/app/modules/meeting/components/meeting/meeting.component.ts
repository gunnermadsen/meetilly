import { Component, OnInit, ViewChild, ElementRef, OnDestroy, ChangeDetectorRef, ViewChildren, QueryList } from '@angular/core'
import { ActivatedRoute } from '@angular/router'
import { FormGroup, FormControl } from '@angular/forms'

import { takeUntil, map, tap, debounceTime, skipWhile } from 'rxjs/operators'
import { Subject, merge, Observable, fromEvent, BehaviorSubject, combineLatest } from 'rxjs'
import { sizeConstraints } from './constraints'
import adapter from 'webrtc-adapter'
import { ToastrService } from 'ngx-toastr'
import * as md5 from 'md5'

import { MeetingService } from '@/modules/main/services/meeting.service'
import { IPayload } from '@/modules/main/models/payload.model'
import { MatSelectChange } from '@angular/material'
import { DataChannelConnections, WebcamStreams, DisplayStreams, PeerConnections } from '@/modules/meeting/models/meeting.model'
import { Store } from '@ngrx/store'
import { AppState } from '@/reducers'
import { setMeetingViewState } from '@/modules/main/store/actions/meeting.actions'

@Component({
  selector: 'app-meeting',
  templateUrl: './meeting.component.html',
  styleUrls: ['./meeting.component.scss'],
})
export class MeetingComponent implements OnInit, OnDestroy {
  @ViewChild('smallVideoArea', { static: false }) private _smallVideoArea: ElementRef<HTMLVideoElement>
  @ViewChild('mainVideoArea', { static: false }) private _mainVideoArea: ElementRef<HTMLVideoElement>
  @ViewChild('screenShareVideoArea', { static: false }) private _screenShareVideoArea: ElementRef<HTMLVideoElement>
  @ViewChild('videoContainer', { static: false }) private _videoContainer: ElementRef<HTMLElement>
  @ViewChild('screenShareContainer', { static: false }) private _screenShareContainer: ElementRef<HTMLElement>
  @ViewChildren('remoteVideo') private _remoteVideoAreas: QueryList<ElementRef<HTMLVideoElement>>
  private messengerForm: FormGroup
  public selectedUser: FormControl = new FormControl()
  private _dataChannels: DataChannelConnections = {}
  private _webcamStreams: WebcamStreams = {}
  private _displayStreams: DisplayStreams = {}
  private _connections: PeerConnections = {}
  public speakerList: MediaDeviceInfo[] = []
  public cameraList: MediaDeviceInfo[]
  public microphoneList: MediaDeviceInfo[]
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
  public isSharingScreen: boolean = false
  public isMessageTargetSelected: boolean = false

  public get webcamStreamsLength() {
    const value = Object.values(this._webcamStreams).length
    return value
  }

  public get webcamStreams() {
    return this.webcamStreams
  }

  constructor(private _route: ActivatedRoute, private _meetingService: MeetingService, private _cdr: ChangeDetectorRef, private _toastrService: ToastrService, private _store$: Store<AppState>) {
    this._meetingID = this._route.snapshot.queryParams.meetingId
    this.member = this._route.snapshot.queryParams.member
    this.type = this._route.snapshot.queryParams.mode

    this.meetingData = this._route.snapshot.data.result[0]
    this.oppositeUserType = this.type === 'host' ? 'guest' : 'host'
    
    this.messengerForm = new FormGroup({
      Message: new FormControl('')
    })

    const id = md5(Math.floor(Math.random() * 8932839).toString())
    this._localId = id
    
    this._initializeMeetingSignaling(id)
  }
  
  ngOnInit() {
    this._listenForOpenConnection()
  }

  private _listenForOpenConnection(): void {
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
      map((payload: IPayload) => payload),
      takeUntil(this.destroy$)
    ).subscribe((payload: any) => this._handleSocketMessageEvent(payload))

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

    this.isStreamingReady = true

    this._addMember(payload)

    this._clientId = id

    this._clientIds.push(id)

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
      
      case "exchange":
        this._addMember(event)
        break

      case "joinroom":
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
    this.logEvent(`**** ICE gathering state changed to: ${this._connections[id].iceGatheringState}`)
  }

  private _handleSignalingStateChangeEvent(id: string) {
    this.logEvent(`**** WebRTC signaling state changed to: ${this._connections[id].signalingState}`)
  }

  private _handleTrackEvent(id: string, event: RTCTrackEvent) {
    this.logEvent(`**** Track event triggering state change on main video area srcObject`)
    this._mainVideoArea.nativeElement.srcObject = event.streams[0]
  }

  private _handleICEConnectionStateChangeEvent(id: string) {
    
    const state = this._connections[id].iceConnectionState
    this.logEvent(`**** ICE connection state changed to: ${state}`)

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
        break
    }
  }

  private _handleICECandidateEvent(id: string, event: RTCPeerConnectionIceEvent) {
    if (event.candidate) {
      this.logEvent(`**** Outgoing ICE candidate: ${event.candidate.candidate}`)

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
    this.logEvent("**** Negotiation needed")

    if (this._connections[id].signalingState !== "stable") {
      this.logEvent(`--->* WARNING: --->* Signaling state is: '${this._connections[id].signalingState}'. Will negotiate new offer when signaling state is stable.`)
      return
    }

    try {
      if (this._connections[id].signalingState != "have-remote-offer") {
        const offer = await this._connections[id].createOffer()
        this.logEvent("---> Offer Created")
  
        await this._connections[id].setLocalDescription(offer)
        this.logEvent("---> Set local description to the offer")
  
        this._meetingService.signal('signal', {
          meetingId: this._meetingID,
          clientId: id,
          member: this.member,
          mode: "offer",
          data: this._connections[id].localDescription,
          userType: this.type
        })
        this.logEvent(`---> Sending the offer to the ${this.oppositeUserType}, using localDescription: ${this._connections[id].localDescription}`)
      } else {
        return
      }

    } catch (error) {
      this._reportError(error)
    }
  }

  private async _handleNewICECandidateMessage(payload: IPayload) {

    const candidate: RTCIceCandidate = new RTCIceCandidate(payload.data)
    this.logEvent("**** Adding received ICE candidate")

    const id = payload.clientId

    try {
      /**
       * "stable" | 
       * "have-local-offer" | 
       * "have-remote-offer" | 
       * "have-local-pranswer" | 
       * "have-remote-pranswer" | 
       * "closed"
       */
      if (candidate && this._connections[id].signalingState === "stable") {
        
        await this._connections[id].addIceCandidate(candidate)
        this.logEvent("---> Ice Candiate Added")

      } 
      else {
        return
      }

    } catch (error) {
      this._reportError(error)
    }
  }

  private async _handleOfferMessage(message: IPayload) {
    
    this.logEvent(`**** Received video chat offer from ${this.oppositeUserType}`)

    const id = message.clientId

    if (!this._connections[id]) {
      this.logEvent(`---> A connection with id: ${id}, does not exist. Triggering connection creation`)
      this._initializePeerConnection(message)
    }
  
    const description: RTCSessionDescription = new RTCSessionDescription(message.data)

    try {
      if (this._connections[id].signalingState !== 'stable' && description.type === 'offer') {

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

    try {

      if (this._connections[id].signalingState === "have-remote-offer" || this._connections[id].signalingState === "have-local-pranswer") {
        this.logEvent("---> Creating and Sending Answer to Caller")
        const answer: RTCSessionDescriptionInit = await this._connections[id].createAnswer()

        this.logEvent("---> Setting Answer to Local Description")
        await this._connections[id].setLocalDescription(answer)

        this._meetingService.signal('signal', {
          meetingId: this._meetingID,
          clientId: id,
          member: this.member,
          mode: "answer",
          data: this._connections[id].localDescription,
          userType: this.type
        })

      } else {
        return
      }
    } catch (error) {
      this._logError(error)
    }
  }

  private async _handleAnswerMessage(message: IPayload) {
    this.logEvent("**** Handling Answer Message")

    const id = message.clientId
    const description: RTCSessionDescription = new RTCSessionDescription(message.data)

    try {
      await this._connections[id].setRemoteDescription(description)
      this.logEvent(`---> Set remote description for connection id: ${id}`)

    } catch (error) {
      this._reportError(error)
    }
  }

  public endVideoConference(event: any) {
    this.logEvent("**** Ending the Video Conference")
    this.logEvent("--> Closing the MediaStream Tracks")

    this._resetMeetingRoom(this.selectedConnectionId)
    this._meetingService.signal('signal', { meetingId: this._meetingID, mode: 'hangup', member: this.member, clientId: this.selectedConnectionId })
  }

  public closeMeeting(): void {

    if (this._connections[this.selectedConnectionId]) {

      this.logEvent("**** Closing the peer connection and datachannel")
      
      this._clientIds.forEach((id: string, index: number) => {
        this._connections[id].getTransceivers().forEach((track: RTCRtpTransceiver) => track.stop())
        this._connections[id].close()
        this._dataChannels[id].close()
        this._connections[id] = null
        this._dataChannels = null
        this._webcamStreams[id] = null
        this._displayStreams[id] = null
      })
      
      this.closeConference$.next(null)
      this.closeConference$.unsubscribe()
    }
  }

  private _resetMeetingRoom(id: string): void {
    if (this._smallVideoArea.nativeElement.srcObject) {
      this._webcamStreams[id].getTracks().forEach((stream: MediaStreamTrack) => stream.stop())
      // this._connections[id].getSenders().forEach((sender: RTCRtpSender) => this._connections[id].removeTrack(sender))
    }

    this._store$.dispatch(setMeetingViewState({ meetingViewState: false }))

    this._mainVideoArea.nativeElement.srcObject = null
    this._smallVideoArea.nativeElement.srcObject = null

    this._videoContainer.nativeElement.style.display = 'none'
    this.isVideoConfereneMode = !this.isVideoConfereneMode
    this.isDashboardHidden = false
  }

  public setSelectedUser(event: MatSelectChange): void {
    this.selectedDataChannelId = this._clientIds[event.value]
    this.isMessageTargetSelected = !this.isMessageTargetSelected
    this.tabs.push(this.users[event.value])
    this.selectedUser.setValue(event.value)
  }

  public closeTab(event: MouseEvent, index: number): void {
    this.tabs.splice(index, 1)

    if (this.tabs.length === 0) {
      // hide the tab group and reset the selectedUser Form Control if the tab list length is 0
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
        this.logEvent(`**** Member: ${payload.member}: (${payload.userType}) has been added`)
      }
    })
  }

  private _hangupAndNotify(payload: IPayload): void {
    // end the video conference on the receiving end. for multi member video conferences, we will 
    // simply want to notify the other members that the person has left the room
    if (this._clientIds.length === 1) {
      this._resetMeetingRoom(payload.clientId)
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

  public changeVideo(deviceId: string, type: string): void {
    const constraints = {
      audio: true,
      video: {
        deviceId: { exact: deviceId },
        ...sizeConstraints
      }
    }

    this.changeDevice(type, constraints)
  }

  public changeAudio(deviceId: string, type: string): void {
    const constraints = {
      audio: {
        deviceId: { exact: deviceId },
      },
      video: sizeConstraints
    }

    this.changeDevice(type, constraints)
  }

  public async changeDevice(type: string, constraints: any): Promise<void> {

    let track: MediaStreamTrack
    const id = this.selectedConnectionId

    try {
      this._webcamStreams[id] = await navigator.mediaDevices.getUserMedia(constraints)

      switch (type) {
        case "audiooutput":
        case "audioinput": 
          track = this._webcamStreams[id].getAudioTracks()[0]
          break
        case "videoinput": 
          track = this._webcamStreams[id].getVideoTracks()[0]
          this._smallVideoArea.nativeElement.srcObject = this._webcamStreams[id]
          break
      }

      const sender = this._connections[id].getSenders().find((sender: RTCRtpSender) => sender.track.kind === track.kind)
      sender.replaceTrack(track)

    } catch (error) {
      this._handleGetUserMediaError(error)
    }
  }

  private async _getDeviceList(): Promise<void> {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices()
      this.cameraList = devices.filter((device: MediaDeviceInfo) => device.kind === "videoinput" && device.deviceId !== "default")
      this.speakerList = devices.filter((device: MediaDeviceInfo) => device.kind === "audiooutput" && device.deviceId !== "default")
      this.microphoneList = devices.filter((device: MediaDeviceInfo) => device.kind === "audioinput" && device.deviceId !== "default")
    } catch (error) {
      this._logError(error)
    }
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
      fromEvent(document.getElementById('hardware-menu'), 'click').pipe(
        tap((event: MouseEvent) => {
          event.preventDefault()
          event.stopPropagation()
          this._displayControls$.next(true);
        }),
        debounceTime(10000),
        tap(() => this._displayControls$.next(false))
      ),
      fromEvent(document, 'mousemove').pipe(
        skipWhile(() => this._displayControls$.value),
        tap(() => this._displayControls$.next(true)),
        debounceTime(1500),
        tap(() => this._displayControls$.next(false)),
      ),
      fromEvent(document, 'mouseleave').pipe(
        tap(() => this._displayControls$.next(false))
      )
    ]).pipe(takeUntil(this.closeConference$)).subscribe()
  }

  public async configureVideoConferenceMode(): Promise<void> {
    this.logEvent(`**** Entering Video Conference mode`)

    this.isDashboardHidden = true
    // for now, set the first id in the list of ids to the main id
    this.selectedConnectionId = this._clientIds[0]
    const id = this.selectedConnectionId
    this._videoContainer.nativeElement.style.display = 'inline-block'
  
    this._getDeviceList()

    this._store$.dispatch(setMeetingViewState({ meetingViewState: true }))

    const constraints = {
      audio: true,
      video: sizeConstraints
    }
    
    try {
      this._webcamStreams[id] = await navigator.mediaDevices.getUserMedia(constraints)

      this.logEvent(`---> Acquired user media for ${this.oppositeUserType}`)

      this._smallVideoArea.nativeElement.srcObject = this._webcamStreams[id]
      this.selectedConnectionId = id
      this.logEvent(`---> Added webcam stream to small video area element on ${this.oppositeUserType}`)

      this._addTracksToConnection(this._webcamStreams[id], id)

      this._watchForMouseMovement()

    } catch (error) {
      this._handleGetUserMediaError(error)
    }
  }

  public async configureScreenSharingMode(): Promise<void> {
    
    const id = this.selectedConnectionId
    
    try {
      if (this.isSharingScreen) {
        this._switchTracks(this._webcamStreams[id], id, "video")
        this._displayStreams[id].getTracks().forEach((track: MediaStreamTrack) => track.stop())
        const offer = await this._connections[id].createOffer({ iceRestart: true })
        
        await this._connections[id].setLocalDescription(offer)
        this._addTracksToConnection(this._webcamStreams[id], id)

        this.isSharingScreen = false
        return
      }

      this.logEvent(`**** Entering Screen Sharing Mode`)

      this._displayStreams[id] = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false })
      this.logEvent(`---> Display media has been set`)

      this._switchTracks(this._displayStreams[id], id, "video")
      this._addTracksToConnection(this._displayStreams[id], id)

      this.isSharingScreen = true

    } catch (error) {
      this._handleGetDisplayMediaError(error)
    }
  }

  private _switchTracks(stream: MediaStream, id: string, mode: string): void {
    this._connections[id].getSenders().forEach((sender: RTCRtpSender) => {
      if (sender.track.kind === mode) {
        this._connections[id].removeTrack(sender)
      }
    })
  }

  private _addTracksToConnection(stream: MediaStream, id: string): void {
    stream.getTracks().forEach((track: MediaStreamTrack) => {
      this._connections[id].addTrack(track, stream)
      this.logEvent(`---> Added track: ${track.label} to connection`)
    })
  }

  private _handleDataChannelEvent(id: string, event: RTCDataChannelEvent) {
    this.logEvent(`---> Data Channel Initiated on ${this.oppositeUserType}`)
    this._dataChannels[id]            = event.channel
    this._dataChannels[id].onmessage  = this._handleDataChannelMessage           .bind(this, id)
    this._dataChannels[id].onopen     = this._handleDataChannelStatusChange     .bind(this, id)
    this._dataChannels[id].onclose    = this._handleDataChannelStatusChange     .bind(this, id)
  }

  private _handleDataChannelStatusChange(id: string, event: Event) {
    if (this._dataChannels[id]) {
      this.logEvent(`Data channel's status has changed to ${this._dataChannels[id].readyState}`)
    }
  }

  private _handleDataChannelMessage(id: string, event: MessageEvent) {
    this.logEvent(`**** DataChannel Message Received: ${event.data}`)
    const message = JSON.parse(event.data)
    this._toastrService.info(`New Message from ${message.sender} (${message.userType})`)
    const index: number = message.messageThreadIndex

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

    this.selectedUser.setValue(index)
    this.isMessageTargetSelected = true
    this._cdr.detectChanges()
  }

  private _handleDataChannelOnOpenEvent(id: string) {
    if (this._dataChannels[id].readyState === 'open') {
      this.logEvent("Data Channel open")
      this._dataChannels[id].onmessage = this._handleDataChannelMessage.bind(this, id)
    }
  }

  public sendMessage(): void {
    const id = this.selectedDataChannelId
    const index = this.users.findIndex((user: IPayload) => user.clientId === id)

    const content = {
      sender: this.member,
      body: this.messengerForm.controls['Message'].value,
      contentType: 'message',
      userType: this.type,
      timestamp: new Date(),
      clientId: id,
      messageThreadIndex: index
    }

    if (this.messages.length) {
      this.messages[index].push(content)
    }
    else {
      this.messages.push([content])
    }

    this.messengerForm.controls['Message'].setValue("")
    this._dataChannels[id].send(JSON.stringify(content))
    this.logEvent(`**** DataChannel message sent: ${JSON.stringify(content)}`)
  }

  private _handleGetUserMediaError(error: Error) {
    this._logError(error)
    switch (error.name) {
      case "NotFoundError":
        alert(`${error.name}: Unable to open your call because no camera and/or microphone were found.`)
        break
      case "SecurityError":
      case "PermissionDeniedError":
        alert(`${error.name}: Permission denied while trying to get the users media`)
        break
      default:
        alert(`Error opening your camera and/or microphone: ${error.message}`)
        break
    }
  }

  private _handleGetDisplayMediaError(error: Error): void {
    this._logError(error)
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