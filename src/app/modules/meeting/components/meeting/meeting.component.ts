import { Component, OnInit, ViewChild, ElementRef, OnDestroy, ChangeDetectorRef, ViewChildren, QueryList, HostListener } from '@angular/core'
import { ActivatedRoute, Router } from '@angular/router'
import { FormControl } from '@angular/forms'

import { takeUntil, map, tap, debounceTime, skipWhile } from 'rxjs/operators'
import { Subject, merge, Observable, fromEvent, BehaviorSubject, combineLatest, interval } from 'rxjs'
import { sizeConstraints } from './constraints'
import adapter from 'webrtc-adapter'
import { ToastrService } from 'ngx-toastr'

import * as uuid from 'uuid'

import { MeetingService } from '@/modules/meeting/services/meeting.service'
import { IPayload } from '@/modules/main/models/payload.model'
import { MatSelectChange, MatTableDataSource } from '@angular/material'
import { DataChannelConnections, WebcamStreams, DisplayStreams, PeerConnections } from '@/modules/meeting/models/meeting.model'
import { Store } from '@ngrx/store'
import { AppState } from '@/reducers'
import { setMeetingViewState } from '@/modules/main/store/actions/meeting.actions'
import { IUser } from '@/modules/meeting/models/users.model'

@Component({
  selector: 'app-meeting',
  templateUrl: './meeting.component.html',
  styleUrls: ['./meeting.component.scss'],
})
export class MeetingComponent implements OnInit, OnDestroy {
  @ViewChild('smallVideoArea', { static: false }) private _smallVideoArea: ElementRef<HTMLVideoElement>
  @ViewChild('mainVideoArea', { static: false }) private _mainVideoArea: ElementRef<HTMLVideoElement>
  @ViewChild('videoContainer', { static: false }) private _videoContainer: ElementRef<HTMLElement>
  // @ViewChildren('remoteVideo') private _remoteVideoAreas: QueryList<ElementRef<HTMLVideoElement>>
  public selectedUser: FormControl = new FormControl()
  public messageToggle: FormControl = new FormControl({ disabled: true })
  public messageArea: FormControl = new FormControl()
  private _dataChannels: DataChannelConnections = {}
  private _webcamStreams: WebcamStreams = {}
  private _displayStreams: DisplayStreams = {}
  private _connections: PeerConnections = {}
  // private _connectionMap: Map<Symbol, RTCPeerConnection> = new Map<Symbol, RTCPeerConnection>()
  public speakerList: MediaDeviceInfo[] = []
  public cameraList: MediaDeviceInfo[]
  public microphoneList: MediaDeviceInfo[]
  private _fileBuffer: ArrayBuffer[] = []
  private _fileSize: number
  private _meetingID: number = null
  public userName: string = null
  public meetingData: any = null
  public dataSource: MatTableDataSource<IUser>
  public displayedColumns: string[] = ['name', 'type', 'clientId']
  public userType: string = null
  private destroy$: Subject<boolean> = new Subject<boolean>()
  private _closeConference$: Subject<boolean> = new Subject<boolean>()
  private _displayControls$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(true)
  public displayControls$: Observable<boolean> = this._displayControls$.asObservable()
  private _users$: BehaviorSubject<IUser[]> = new BehaviorSubject<IUser[]>([])
  public users$: Observable<IUser[]> = this._users$.asObservable()
  public oppositeUserType: string = null
  public messages: any[] = []
  public users: IUser[] = []
  public tabs: IPayload[] = []
  public selectedDataChannelId: string
  public selectedConnectionId: string
  public isStreamingReady: boolean = false
  public isVideoConferenceMode: boolean = false
  public isMuted: boolean = false
  public isDashboardHidden: boolean = false
  public isPaused: boolean = false
  public isSharingScreen: boolean = false
  public isFileTransfering: boolean = false
  public isMessageTargetSelected: boolean = false
  public isVoice: boolean = false
  private _connectionId: string
  public timeCounter$: Observable<number>
  
  public get webcamStreamsLength() {
    const value = Object.values(this._webcamStreams).length
    return value
  }

  public get webcamStreams() {
    return this.webcamStreams
  }

  constructor(private _route: ActivatedRoute, private _meetingService: MeetingService, private _cdr: ChangeDetectorRef, private _toastrService: ToastrService, private _store$: Store<AppState>, private _router: Router) {
    this._meetingID = this._route.snapshot.queryParams.meetingId
    this.userName = this._route.snapshot.queryParams.member
    this.userType = this._route.snapshot.queryParams.mode
    this._connectionId = uuid.v4()

    this.meetingData = this._route.snapshot.data.result[0]

    this.oppositeUserType = this.userType === 'host' ? 'guest' : 'host'
    
    this._initializeMeetingSignaling()
    this._checkForReadiness(null)

  }
  
  ngOnInit() {
    this._listenForReadyEvent()
  }

  private _listenForReadyEvent(): void {
    this._meetingService.ready$.pipe(takeUntil(this.destroy$)).subscribe((payload: IPayload) => {

      this.logEvent(`**** Initial Signal Emitted by ${this.userType}`)
      this._addMember({ ...payload, clientId: this._connectionId })

      this.logEvent(`---> ${this.userType} sending 'signal' event on socketID: ${payload.roomId}`)

      this._meetingService.signal('signal', {
        meetingId: this._meetingID,
        roomId: payload.roomId,
        clientId: this._connectionId,
        member: this.userName,
        mode: 'signaling',
        data: null, 
        receiver: this.oppositeUserType,
        sender: this.userType
      })
    })
  }
  
  private _initializeMeetingSignaling(): void {
    merge(
      this._meetingService.timer$,
      this._meetingService.signal$,
      this._meetingService.closed$,
      this._meetingService.standby$,
      this._meetingService.exchange$,
      this._meetingService.transfer$
    )
    .pipe(
      map((payload: IPayload) => payload),
      takeUntil(this.destroy$)
    ).subscribe((payload: any) => this._handleSocketMessageEvent(payload))
  }

  private _checkForReadiness(roomId: string | null): void {
    //check the socket server to see if there are other meetting participants
    // on this signal, we obtain a socket id
    this.logEvent(`**** ${this.userType} sending 'standby' event. Socket ID has not been set`)

    this._meetingService.signal('standby', { 
      meetingId: this._meetingID,
      mode: "waiting",
      roomId: roomId,
      sender: this.userType,
      receiver: this.oppositeUserType,
      member: this.userName 
    })
  }

  private _initializePeerConnection(payload?: IPayload): void {

    this.logEvent(`**** Creating New RTC Peer Connection for ${this.userType}`)

    this.isStreamingReady = true
    const roomId = payload.roomId
    const id = payload.clientId

    this.logEvent(`---> Connection id set to ${id}`)

    this._connections[id] = new RTCPeerConnection({
      iceServers: [
        // Session Traversal Utilities for NAT (STUN)
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun.services.mozilla.com' },
      ]
    })

    this._dataChannels[id] = this._connections[id].createDataChannel("messageChannel")

    this._dataChannels[id].onopen                       = this._handleDataChannelOnOpenEvent          .bind(this, id, roomId)
    this._connections[id].ondatachannel                 = this._handleDataChannelEvent                .bind(this, id, roomId)
    this._connections[id].onicecandidate                = this._handleICECandidateEvent               .bind(this, id, roomId)
    this._connections[id].oniceconnectionstatechange    = this._handleICEConnectionStateChangeEvent   .bind(this, id, roomId)
    this._connections[id].onicegatheringstatechange     = this._handleICEGatheringStateChangeEvent    .bind(this, id, roomId)
    this._connections[id].onsignalingstatechange        = this._handleSignalingStateChangeEvent       .bind(this, id, roomId)
    this._connections[id].onnegotiationneeded           = this._handleNegotiationNeededEvent          .bind(this, id, roomId)
    this._connections[id].ontrack                       = this._handleTrackEvent                      .bind(this, id)
    
    this._addMember({ ...payload, clientId: id })

    // once a connection is established, we want to tell the member under the specified roomId that 
    // this client has created its peer connection so that they can create connections appropriately
    this.logEvent(`---> ${this.userType} sending 'exchange' event on socketID: ${payload.roomId}`)

    this._meetingService.signal('exchange', {
      clientId: id, 
      meetingId: this._meetingID,
      roomId: roomId,
      member: this.userName, 
      receiver: this.oppositeUserType,
      sender: this.userType,
      mode: 'exchange'
    })

    this.logEvent(`---> Connection: ${id} created, Sending 'exchange' signal to users`)
  }

  private _handleSocketMessageEvent(event: IPayload): void {

    switch (event.mode) {
      case "waiting":
        this._checkForReadiness(event.roomId)
        break
      
      case "exchange":
        this._addMember(event)
        break

      case "signaling":
        if (!this._connections[event.clientId] && !this._dataChannels[event.clientId]) {
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
          this._checkForReadiness(event.roomId)
          this._initializePeerConnection(event)
        }
        break

      case "tranfer":
        this._setFileUploadState(event)
        break

      case "starttimer":
        this.beginMeetingTimer()
        break

      default:
        this._logError("Unknown message received:")
        this._logError(event)
    }
  }

  private _handleICEGatheringStateChangeEvent(id: string): void  {
    this.logEvent(`**** ICE gathering state changed to: ${this._connections[id].iceGatheringState}`)
  }

  private _handleSignalingStateChangeEvent(id: string): void {
    this.logEvent(`**** WebRTC signaling state changed to: ${this._connections[id].signalingState}`)
  }

  private _handleTrackEvent(id: string, event: RTCTrackEvent): void {
    // in a meeting with multiple peers, 
    // we want to add their remote media 
    // tracks to smaller video areas that 
    // will be displayed on the right side.
    
    this.logEvent(`**** Track event triggering state change on main video area srcObject`)
    this._mainVideoArea.nativeElement.srcObject = event.streams[0]

    if (this.users.length > 1) {
      console.log(event.streams)
      // this.users.forEach((user: IUser) => )
    }

    this._meetingService.signal('timer', {
      meetingId: this._meetingID,
      clientId: id
    })

    // this.beginMeetingTimer()
    
  }

  private _handleICEConnectionStateChangeEvent(id: string): void {
    
    const state = this._connections[id].iceConnectionState
    this.logEvent(`**** ICE connection state changed to: ${state}`)

    switch (state) {
      case "failed":
        this._restartConnection(id)
        break
      case "closed":
      case "disconnected":
        // this.isStreamingReady = false
        if (this._connections[id]) {
          this.endVideoConference()
          this.closeMeetingConnection()
        }
        // trigger ice renegotiation while creating a new offer
        // this._restartConnection(id)
        break
    }
  }

  private _handleICECandidateEvent(id: string, roomId: string, event: RTCPeerConnectionIceEvent): void {
    if (event.candidate) {
      this.logEvent(`**** Outgoing ICE candidate: ${event.candidate.candidate}`)

      this._meetingService.signal('signal', {
        meetingId: this._meetingID,
        clientId: id,
        roomId: roomId,
        member: this.userName,
        mode: "icecandidate",
        data: event.candidate,
        receiver: this.oppositeUserType,
        sender: this.userType
      })
    }
  }

  private async _handleNegotiationNeededEvent(id: string, roomId: string, event: Event): Promise<void> {
    this.logEvent("**** Negotiation needed")

    try {
      const offer = await this._connections[id].createOffer()

      this.logEvent("---> Offer Created")

      if (this._connections[id].signalingState !== "stable") {
        this.logEvent(`---> Signaling state is unstable.`)
        return
      }

      await this._connections[id].setLocalDescription(offer)
      this.logEvent("---> Set local description to the offer")

      this._meetingService.signal('signal', {
        meetingId: this._meetingID,
        clientId: id,
        roomId: roomId,
        member: this.userName,
        mode: "offer",
        data: this._connections[id].localDescription,
        receiver: this.oppositeUserType,
        sender: this.userType
      })
      
      this.logEvent(`---> Sending the offer to the ${this.oppositeUserType}, using localDescription: ${this._connections[id].localDescription}`)
    } catch (error) {
      this._reportError(error)
    }
  }

  private async _handleNewICECandidateMessage(payload: IPayload): Promise<void> {

    const candidate: RTCIceCandidate = new RTCIceCandidate(payload.data)
    this.logEvent("**** Adding received ICE candidate")

    const id = payload.clientId

    try {
      if (candidate) {
        
        await this._connections[id].addIceCandidate(candidate)
        this.logEvent("---> Ice Candiate Added")

      }
    } catch (error) {
      this._reportError(error)
    }
  }

  private async _handleOfferMessage(message: IPayload): Promise<void> {
    
    this.logEvent(`**** Received video chat offer from ${this.oppositeUserType}`)

    const id = message.clientId

    if (!this._connections[id]) {
      this.logEvent(`---> A connection with id: ${id}, does not exist. Triggering new RTC peer creation`)
      this._initializePeerConnection(message)
    }
  
    const description: RTCSessionDescription = new RTCSessionDescription(message.data)

    try {

      if (this.users.length <= 1 && this._connections[id].signalingState !== "stable") {
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
          roomId: message.roomId, //this._findRoomIdUsingClientId(id),
          clientId: id,
          member: this.userName,
          mode: "answer",
          data: this._connections[id].localDescription,
          receiver: this.oppositeUserType,
          sender: this.userType
        })

      }
    } catch (error) {
      this._logError(error)
    }
  }

  private async _handleAnswerMessage(message: IPayload): Promise<void> {
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

  private _handleDataChannelEvent(id: string, roomId: string, event: RTCDataChannelEvent): void {
    this.logEvent(`---> Data Channel Initiated on ${this.oppositeUserType}`)
    this._dataChannels[id]                = event.channel
    this._dataChannels[id].onmessage      = this._handleDataChannelMessage          .bind(this, id)
    this._dataChannels[id].onopen         = this._handleDataChannelStatusChange     .bind(this, id)
    this._dataChannels[id].onclose        = this._handleDataChannelStatusChange     .bind(this, id)
  }

  private _handleDataChannelStatusChange(id: string, event: Event): void {
    if (this._dataChannels[id]) {
      this.logEvent(`Data channel's status has changed to ${this._dataChannels[id].readyState}`)
    }
  }

  private _setFileUploadState(event: any): void {
    this.isFileTransfering = event.data.isFileTransfering
  }

  public sendDataChannelMessage(): void {

    const id = this.selectedDataChannelId

    const index = this.users.findIndex((user: IPayload) => user.clientId === id)

    const message = {
      sender: this.userName, // the username of the participant sending the message
      body: this.messageArea.value,
      contentType: 'message',
      userType: this.userType, // client or host?
      timestamp: new Date(),
      clientId: id,
      messageThreadIndex: index
    }

    this._addMessage(index, message)

    this.messageArea.setValue("")
    this._dataChannels[id].send(JSON.stringify(message))
    this.logEvent(`**** DataChannel message sent: ${JSON.stringify(message)}`)
  }

  private _handleDataChannelMessage(id: string, event: MessageEvent): void {
    this.logEvent(`**** DataChannel Message Received: ${event.data}`)

    const message = JSON.parse(event.data)
    this._toastrService.info(`New Message from ${message.sender} (${message.userType})`)
    const index = this.users.findIndex((user: IPayload) => user.clientId === id)
    
    if (this.tabs.length !== this.users.length) {
      this.tabs.push(this.users[index])
    }

    if (!this.selectedDataChannelId) {
      this.selectedDataChannelId = message.clientId
    }

    this._addMessage(index, message)

    this.selectedUser.setValue(index)
    this.isMessageTargetSelected = true
    this._cdr.detectChanges()
  }

  public sendDataChannelFile(changeEvent: any): void {

    if (!changeEvent.target.files) {
      return
    }

    const file: File = changeEvent.target.files[0]
    const id = this.selectedDataChannelId
    const chunkSize = 16384
    const index = this.users.findIndex((user: IPayload) => user.clientId === id)
    const user = this.users.find((user: IUser) => user.clientId === id)

    const message = {
      sender: this.userName,
      body: "File Transfer",
      file: {
        name: file.name,
        size: file.size,
      },
      contentType: 'file',
      userType: this.userType,
      clientId: id,
      messageThreadIndex: index,
      timestamp: new Date()
    }

    const payload = JSON.stringify(message)

    // this.messages[index].push(message)
    this._addMessage(index, message)

    // this._dataChannels[id].send(payload)

    // tell the targeted participant that a file sharing operation is in progress
    this._meetingService.signal('filetransfer', {
      meetingId: this._meetingID,
      member: this.userName,
      filename: file.name,
      filesize: file.size,
      isUpload: true,
      roomId: user.roomId,
      mode: 'transfer',
      data: {
        payload: payload,
        transferInProgress: true
      },
      sender: this.oppositeUserType
    })

    const sliceFile = (offset: number) => {

      const reader = new FileReader()

      reader.onload = (event: any) => {
        this._dataChannels[id].send(event.target.result)

        if (file.size > (offset + event.target.result.byteLength)) {
          setTimeout(sliceFile, 0, (offset + chunkSize))
        }
      }

      const slice = file.slice(offset, (offset + chunkSize))
      reader.readAsArrayBuffer(slice)
    }
    sliceFile(0)
    // this.fileTransfer = false
  }

  private _addMessage(index: number, message: any): void {
    if (this.messages.length) {
      this.messages[index].push(message)
    } else {
      this.messages.push([message])
    }
  }

  private _handleDataChannelOnOpenEvent(id: string, roomId: string, event: any): void {
    if (this._dataChannels[id].readyState === 'open') {
      this.logEvent("Data Channel open")
      this._dataChannels[id].onmessage = this._handleDataChannelMessage.bind(this, id)
      // this.messageToggle.enable()
    }
  }

  public closeMeetingConnection(): void {

    if (this._connections[this.selectedConnectionId]) {
      
      this.logEvent("**** Closing the peer connection and datachannel")

      const that = this
   
      this.users.forEach((user: IUser, index: number) => {

        const id = user.clientId

        that._stopTracks(id)

        // this._connections[id].getTransceivers().forEach((track: RTCRtpTransceiver) => track.stop())
        that._connections[id].close()
        that._dataChannels[id].close()
        that._connections[id] = null
        that._dataChannels = null
        that._webcamStreams[id] = null
        that._displayStreams[id] = null

      })
    }
  }

  private async _restartConnection(id: string): Promise<void> {
    // for now a dedicated method is used for triggering connection restart
    // let retryCounter: number

    try {
      const offer = await this._connections[id].createOffer({ iceRestart: true })

      await this._connections[id].setLocalDescription(offer)

      this.isStreamingReady = true

    } catch (error) {
      // if we cant restart the connection, log the error and close the meeting
      this._reportError(error)

      // lets try three reconnection attempts
      // if (retryCounter <= 3) {
      //   retryCounter++
      //   this._restartConnection(id)
      // }

      // this.closeMeeting()
      // this.endVideoConference()
    }
  }

  public endVideoConference(): void {
    this.logEvent("**** Closing the videoconference")

    const user = this.users.find((user: IUser) => user.clientId === this.selectedConnectionId)

    // if there is only one other user, close the meeting entirely
    if (this.users.length === 1) {
      this._resetMeetingRoom(user.clientId)
      // this.closeMeetingConnection()
    }

    // when we hangup, we notify the other participant(s) that we are leaving the videoconference
    this._meetingService.signal('signal', {
      meetingId: this._meetingID,
      mode: 'hangup',
      member: this.userName,
      clientId: user.clientId,
      roomId: user.roomId
    })
  }

  private _hangupAndNotify(payload: IPayload): void {
    // simply want to notify the other members that the person has left the room

    if (this.users.length === 1) {
      this._resetMeetingRoom(payload.clientId)
    }
    this._toastrService.info(`${payload.member} (${payload.member}) has left the meeting`)
  }

  private _resetMeetingRoom(id: string): void {
    this.logEvent("**** Ending the Video Conference")
    this.logEvent("---> Closing the User and Display Media Tracks")

    this._stopTracks(id)

    this._store$.dispatch(setMeetingViewState({ meetingViewState: false }))

    // ** TODO ** (Optional)
    // if there are multiple meeting participants, 
    // we could set the srcElement to the next available 
    // participant, otherwise set the srcObject to null.
    // more to come

    this._mainVideoArea.nativeElement.srcObject = null
    this._smallVideoArea.nativeElement.srcObject = null

    this._videoContainer.nativeElement.style.display = 'none'
    this.isVideoConferenceMode = !this.isVideoConferenceMode
    this.isDashboardHidden = false

    this._closeConference$.next(false)
  }

  private _stopTracks(id: string) {
    if (this._webcamStreams[id]) {
      this._webcamStreams[id].getTracks().forEach((track: MediaStreamTrack) => track.stop())
  
      if (this.isSharingScreen) {
        this._displayStreams[id].getTracks().forEach((track: MediaStreamTrack) => track.stop())
        this.isSharingScreen = false
      }
    }
  }

  public beginMeetingTimer(): void {
    this.timeCounter$ = interval(1000).pipe(map((time: number) => time * 1000), takeUntil(this._closeConference$))
  }

  public setSelectedUser(event: MatSelectChange): void {
    this.selectedDataChannelId = this.users[event.value].clientId
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

  public trackByFn<K, V>(key: K, value: V): V {
    return value
  }

  private _addMember(payload: IUser): void {
    const duplicates: IUser[] = this.users.filter((user: IUser) => user.clientId === payload.clientId && user.member === payload.member)
    if (duplicates.length) {
      return
    } else {
      this.users.push({ member: payload.member, meetingId: payload.meetingId, clientId: payload.clientId, sender: payload.sender, roomId: payload.roomId })
      this.logEvent(`**** Member: ${payload.member}: (${payload.sender}) has been added`)
      this.logEvent("Adding new user to behaviorsubject")
      this._users$.next(this.users)
      this.users$.subscribe((users: IUser[]) => console.log(users))
    }
  }

  public muteMicrophone(event: MouseEvent): void {
    this.isMuted = !this.isMuted
    this._webcamStreams[this.selectedConnectionId].getAudioTracks()[0].enabled = !this._webcamStreams[this.selectedConnectionId].getAudioTracks()[0].enabled
  }

  public disableVideoCamera(event: MouseEvent): void {
    this.isPaused = !this.isPaused
    this._webcamStreams[this.selectedConnectionId].getVideoTracks().map((stream: MediaStreamTrack) => stream.enabled = !stream.enabled)
  }

  public async changeVideo(deviceId: string, type: string): Promise<void> {
    const constraints = {
      audio: true,
      video: {
        deviceId: { exact: deviceId },
        ...sizeConstraints
      }
    }

    await this.changeDevice(type, constraints)
  }

  public async changeAudio(deviceId: string, type: string): Promise<void> {
    const constraints = {
      audio: {
        deviceId: { exact: deviceId },
      },
      video: sizeConstraints
    }

    await this.changeDevice(type, constraints)
  }

  public async changeDevice(type: string, constraints: any): Promise<void> {

    let track: MediaStreamTrack
    const id = this.selectedConnectionId

    try {
      this._webcamStreams[id] = await navigator.mediaDevices.getUserMedia(constraints)

      switch (type) {
        case "audiooutput" || "audio":
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

  public async getDeviceList(): Promise<void> {
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
          return this._displayControls$.next(true)
        })
      ),
      fromEvent(document.getElementById('hardware-menu'), 'click').pipe(
        tap((event: MouseEvent) => {
          event.preventDefault()
          event.stopPropagation()
          this._displayControls$.next(true)
        }),
        debounceTime(10000),
        tap(() => this._displayControls$.next(false))
      ),
      fromEvent(document, 'mousemove').pipe(
        skipWhile(() => this._displayControls$.value),
        tap(() => this._displayControls$.next(true)),
        debounceTime(3000),
        tap(() => this._displayControls$.next(false)),
      ),
      fromEvent(document, 'mouseleave').pipe(
        tap(() => this._displayControls$.next(false))
      )
    ]).pipe(takeUntil(this._closeConference$)).subscribe()
  }

  public async configureVideoConferenceMode(): Promise<void> {
    this.logEvent(`**** Entering Video Conference mode`)

    this.isDashboardHidden = true

    this.selectedConnectionId = this.users[0].clientId
    const id = this.selectedConnectionId

    this._videoContainer.nativeElement.style.display = 'inline-block'
    this.getDeviceList()

    this._store$.dispatch(setMeetingViewState({ meetingViewState: true }))
    
    try {
      this._webcamStreams[id] = await navigator.mediaDevices.getUserMedia({ audio: true, video: sizeConstraints })

      this.logEvent(`---> Acquired user media for ${this.oppositeUserType}`)
      this._smallVideoArea.nativeElement.srcObject = this._webcamStreams[id]

      this._addTracksToConnection(this._webcamStreams[id], id)

      this._watchForMouseMovement()

    } catch (error) {
      this._handleGetUserMediaError(error)
    }
  }

  public async configureScreenSharingMode(): Promise<void> {
    
    const id = this.selectedConnectionId
    this.logEvent(`**** Entering Screen Sharing Mode`)
    
    if (this.isSharingScreen) {
      this._switchTracks(this._webcamStreams[id], id, "video")
      this._displayStreams[id].getTracks().forEach((track: MediaStreamTrack) => track.stop())
      this.isSharingScreen = false
      return
    }

    try {
      this._displayStreams[id] = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false })
      this.logEvent(`---> Display media has been set`)

      this._switchTracks(this._displayStreams[id], id, "video")
      this.isSharingScreen = true
    } catch (error) {
      this._handleGetDisplayMediaError(error)
    }
  }

  public async configureCallType(type: string): Promise<void> {

    this.isVoice = !this.isVoice

    const id = this.selectedConnectionId

    return

    const constraints = {
      audio: true
    }

    this.changeDevice(type, constraints)
  }

  private _switchTracks(stream: MediaStream, id: string, mode: string): void {
    const videoTrack = stream.getVideoTracks()
    const sender = this._connections[id].getSenders().find((sender: RTCRtpSender) => sender.track.kind === mode)
    sender.replaceTrack(videoTrack[0])
  }

  private _addTracksToConnection(stream: MediaStream, id: string): void {
    stream.getTracks().forEach((track: MediaStreamTrack) => {
      this._connections[id].addTrack(track, stream)
      this.logEvent(`---> Added track: ${track.label} to connection`)
    })
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

  // @HostListener('window:beforeunload')
  ngOnDestroy() {

    // if (Object.values(this._connections).length) {
    //   this.closeMeeting()
    //   this._resetMeetingRoom(this.selectedConnectionId)
    // }

    this.endVideoConference()

    this.destroy$.next(false)
    this.destroy$.unsubscribe()
    this._closeConference$.next(false)
    this._closeConference$.unsubscribe()
    this._displayControls$.next(false)
    this._displayControls$.unsubscribe()
    
  }
}