import { Injectable, ComponentRef } from '@angular/core'
import { Observable, merge, Subject, BehaviorSubject, interval } from 'rxjs'
import { IPayload } from '../../main/models/payload.model'
import { takeUntil, map } from 'rxjs/operators'
import { DataChannelConnections, WebcamStreams, DisplayStreams, PeerConnections } from '../models/meeting.model'
import * as uuid from 'uuid'
import { MeetingComponent } from '../components/meeting/meeting.component'
import { Store } from '@ngrx/store'
import { AppState } from '@/reducers'
import { createMessage, updateFileTransferState } from '../store/actions/message.actions'
import { IMessage, FileMessage } from '../models/message.model'
import { LoggerService } from './logger.service'
import { ToastrService } from 'ngx-toastr'
import { sizeConstraints } from '../components/meeting/constraints'
import { IUser } from '../models/users.model'
import { SocketService } from './socket.service'
import { setMeetingViewState } from '@/modules/main/store/actions/meeting.actions'

@Injectable({ providedIn: 'root' })
export class MeetingService {

    private _transferProgress$: Subject<number> = new Subject<number>()
    public get progress$(): Observable<number> {
        return this._transferProgress$.asObservable()
    }
    public set progress(value: number) {
        this._transferProgress$.next(value)
    }
    

    private _users$: BehaviorSubject<IUser[]> = new BehaviorSubject<IUser[]>([])
    public get users$(): Observable<IUser[]> {
        return this._users$.asObservable()
    }
    public get users(): IUser[] {
        return this._users$.value
    }
    public set user(value: IUser) {
        const duplicates: IUser[] = this._users$.value.filter(
            (user: IUser) => user.clientId === value.clientId && user.member === value.member
        )

        if (!duplicates.length) {
            this._users$.next([...this.users, value])
        }
    }

    /**
     * BehaviorSubject for tracking the state of the video conference, 
     * whether two or more meeting participatns are active in a meeting.
     * Used as a declarative method of unsubscribing to observables
     */
    private _isVideoConferenceInactive$: Subject<boolean> = new Subject<boolean>()
    public get isVideoConferenceInactive$(): Observable<boolean> {
        return this._isVideoConferenceInactive$.asObservable()
    }
    public set isVideoConferenceInactive(value: boolean) {
        this._isVideoConferenceInactive$.next(value)
    }
    

    private _timeCounter$: BehaviorSubject<number> = new BehaviorSubject<number>(null)
    public get timeCounter$(): Observable<number> {
        return this._timeCounter$.asObservable()
    }
    public set timeCounter(value: number) {
        this._timeCounter$.next(value)
    }


    private _destroy$: Subject<boolean> = new Subject<boolean>()
    public get destroy(): Subject<boolean> {
        return this._destroy$
    }
    public set destroyState(value: boolean) {
        this._destroy$.next(value)
    }


    private _isStreamingReady: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false)
    public get isStreamingReady(): BehaviorSubject<boolean> {
        return this._isStreamingReady
    }
    public get isStreamingReady$(): Observable<boolean> {
        return this._isStreamingReady.asObservable()
    }


    private _mainVideoArea: BehaviorSubject<MediaStream> = new BehaviorSubject<MediaStream>(null)
    public get mainVideoArea$(): Observable<MediaStream> {
        return this._mainVideoArea.asObservable()
    }
    public set mainVideo(value: MediaStream) {
        this._mainVideoArea.next(value)
    }


    private _smallVideoArea: BehaviorSubject<MediaStream> = new BehaviorSubject<MediaStream>(null)
    public get smallVideoArea$(): Observable<MediaStream> {
        return this._smallVideoArea.asObservable()
    }
    public set smallVideo(stream: MediaStream) {
        this._smallVideoArea.next(stream)
    }

    private _isSharingScreen: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false)
    public get isSharingScreenMode(): boolean {
        return this._isSharingScreen.value
    }
    public set isSharingScreen(value: boolean) {
        this._isSharingScreen.next(value)
    }
   
    private _componentRef: ComponentRef<MeetingComponent>
    public dataChannels: DataChannelConnections = {}
    public webcamStreams: WebcamStreams = {}
    public displayStreams: DisplayStreams = {}
    public connections: PeerConnections = {}
    // private _connectionMap: Map<Symbol, BehaviorSubject<RTCPeerConnection>> = new Map<Symbol, BehaviorSubject<RTCPeerConnection>>()
    public speakerList: MediaDeviceInfo[]
    public cameraList: MediaDeviceInfo[]
    public microphoneList: MediaDeviceInfo[]
    private selectedConnectionId: string
    public get connectionId(): string {
        return this.selectedConnectionId
    }
    public set connectionId(value: string) {
        this.selectedConnectionId = value
    }

    private selectedDataChannelId: string
    public get channelId(): string {
        return this.selectedDataChannelId
    }
    public set channelId(value: string) {
        this.selectedDataChannelId = value
    }

    private _meetingID: number = null
    public userName: string = null
    public userType: string = null
    private readonly _connectionId: string = uuid.v4()
    public get clientConnectionID(): string {
        return this._connectionId
    }

    public meetingData: any = null
    public oppositeUserType: "guest" | "host" = null
    public isFileTransfering: boolean = false

    private _tabs: IPayload[] = []
    public get tabs(): IPayload[] {
        return this._tabs
    }
    public set tab(tab: IPayload) {
        this._tabs.push(tab)
    }

    constructor(private _toastrService: ToastrService, private _loggerService: LoggerService, private _store$: Store<AppState>, private _socketService: SocketService) {
        this._loggerService.logEvent("Meeting Service Constructed")
    }

    public initializeMeetingParams(snapshot: any): void {
        this.meetingData = snapshot.data.result[0]

        this._meetingID = snapshot.queryParams.meetingId
        this.userName = snapshot.queryParams.member
        this.userType = snapshot.queryParams.mode
        this.oppositeUserType = this.userType === 'host' ? 'guest' : 'host'
    }

    public listenForReadyEvent(): void {
        this._socketService.ready$.pipe(takeUntil(this._destroy$)).subscribe((payload: IPayload) => {
            this._loggerService.logEvent(`**** Initial Signal Emitted by ${this.userType}`)

            this.user = { ...payload, clientId: this._connectionId }

            this._loggerService.logEvent(`---> ${this.userType} sending 'signal' event on socketID: ${payload.roomId}`)

            this._socketService.signal('signal', {
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

    public checkForReadiness(roomId: string | null): void {
        //check the socket server to see if there are other meetting participants
        // on this signal, we obtain a socket id
        this._loggerService.logEvent(`**** ${this.userType} sending 'standby' event. Socket ID has not been set`)

        this._socketService.signal('standby', {
            meetingId: this._meetingID,
            mode: "waiting",
            roomId: roomId,
            sender: this.userType,
            receiver: this.oppositeUserType,
            member: this.userName
        })
    }

    public initializeMeetingSignaling(): void {
        merge(
            this._socketService.timer$, 
            this._socketService.signal$, 
            this._socketService.closed$, 
            this._socketService.standby$, 
            this._socketService.exchange$, 
            this._socketService.transfer$
        ).pipe(
            map((payload: IPayload) => payload),
            takeUntil(this._destroy$)
        ).subscribe((payload: any) => this._handleSocketMessageEvent(payload))
    }

    private _handleSocketMessageEvent(event: IPayload): void {

        switch (event.mode) {
            case "waiting":
                this.checkForReadiness(event.roomId)
                break

            case "exchange":
                this.user = event
                break

            case "signaling":
                if (!this.connections[event.clientId] && !this.dataChannels[event.clientId]) {
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
                if (this.connections[event.clientId]) {
                    this.checkForReadiness(event.roomId)
                    this._initializePeerConnection(event)
                }
                break

            case "transfer":
                this._setFileTransferState(event)
                break

            case "starttimer":
                this._beginMeetingTimer()
                break

            default:
                this._loggerService.logError("Unknown message received:")
                this._loggerService.logError(event)
        }
    }

    private _initializePeerConnection(payload?: IPayload): void {

        this._loggerService.logEvent(`**** Creating New RTC Peer Connection for ${this.userType}`)

        this.isStreamingReady.next(true)

        const roomId = payload.roomId
        const id = payload.clientId

        this._loggerService.logEvent(`---> Connection id set to ${id}`)

        this.connections[id] = new RTCPeerConnection({
            iceServers: [
                // Session Traversal Utilities for NAT (STUN)
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:stun.services.mozilla.com' },
            ]
        })

        this.dataChannels[id] = this.connections[id].createDataChannel("messageChannel")

        this.dataChannels[id].onopen = this._handleDataChannelOnOpenEvent.bind(this, id, roomId)
        this.connections[id].ondatachannel = this._handleDataChannelEvent.bind(this, id, roomId)
        this.connections[id].onicecandidate = this._handleICECandidateEvent.bind(this, id, roomId)
        this.connections[id].oniceconnectionstatechange = this._handleICEConnectionStateChangeEvent.bind(this, id, roomId)
        this.connections[id].onicegatheringstatechange = this._handleICEGatheringStateChangeEvent.bind(this, id, roomId)
        this.connections[id].onsignalingstatechange = this._handleSignalingStateChangeEvent.bind(this, id, roomId)
        this.connections[id].onnegotiationneeded = this._handleNegotiationNeededEvent.bind(this, id, roomId)
        this.connections[id].ontrack = this._handleTrackEvent.bind(this, id)

        this.user = { ...payload, clientId: id }

        // once a connection is established, we want to tell the member under the specified roomId that 
        // this client has created its peer connection so that they can create connections appropriately
        this._loggerService.logEvent(`---> ${this.userType} sending 'exchange' event on socketID: ${payload.roomId}`)

        this._socketService.signal('exchange', {
            clientId: id,
            meetingId: this._meetingID,
            roomId: roomId,
            member: this.userName,
            receiver: this.oppositeUserType,
            sender: this.userType,
            mode: 'exchange'
        })
    }

    private _handleICEGatheringStateChangeEvent(id: string): void {
        this._loggerService.logEvent(`**** ICE gathering state changed to: ${this.connections[id].iceGatheringState}`)
    }

    private _handleSignalingStateChangeEvent(id: string): void {
        this._loggerService.logEvent(`**** WebRTC signaling state changed to: ${this.connections[id].signalingState}`)
    }

    private _handleTrackEvent(id: string, event: RTCTrackEvent): void {
        // in a meeting with multiple peers, we want to add their remote media 
        // tracks to smaller video areas that will be displayed on the right side.

        this._loggerService.logEvent(`**** Track event triggering state change on main video area srcObject`)
        
        this.mainVideo = event.streams[0]

        this._socketService.signal('timer', {
            meetingId: this._meetingID,
            clientId: id
        })
    }

    private _handleICEConnectionStateChangeEvent(id: string, roomId: string): void {

        const state = this.connections[id].iceConnectionState
        this._loggerService.logEvent(`**** ICE connection state changed to: ${state}`)

        switch (state) {
            case "failed":
                this._handleNegotiationNeededEvent(id, roomId, true)
                break
            case "closed":
            case "disconnected":
                if (this.connections[id]) {
                    this.endVideoConference()
                    this.closeMeetingConnection()
                }
                break
        }
    }

    private _handleICECandidateEvent(id: string, roomId: string, event: RTCPeerConnectionIceEvent): void {
        if (event.candidate) {
            this._loggerService.logEvent(`**** Outgoing ICE candidate: ${event.candidate.candidate}`)

            this._socketService.signal('signal', {
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

    private async _handleNegotiationNeededEvent(id: string, roomId: string, event: Event | boolean): Promise<void> {
        this._loggerService.logEvent("**** Negotiation needed")

        const mode: boolean = (typeof event === 'boolean') ? true : false

        try {
            const offer = await this.connections[id].createOffer({ iceRestart: mode })

            this._loggerService.logEvent("---> Offer Created")

            if (this.connections[id].signalingState !== "stable") {
                this._loggerService.logEvent(`---> Signaling state is unstable.`)
                return
            }

            await this.connections[id].setLocalDescription(offer)
            this._loggerService.logEvent("---> Set local description to the offer")

            this._socketService.signal('signal', {
                meetingId: this._meetingID,
                clientId: id,
                roomId: roomId,
                member: this.userName,
                mode: "offer",
                data: this.connections[id].localDescription,
                receiver: this.oppositeUserType,
                sender: this.userType
            })

            this._loggerService.logEvent(`---> Sending the offer to the ${this.oppositeUserType}, using localDescription: ${this.connections[id].localDescription}`)
        } catch (error) {
            this._loggerService.reportError(error)
        }
    }

    private async _handleNewICECandidateMessage(payload: IPayload): Promise<void> {

        const candidate: RTCIceCandidate = new RTCIceCandidate(payload.data)
        this._loggerService.logEvent("**** Adding received ICE candidate")

        const id = payload.clientId

        try {
            if (candidate) {

                await this.connections[id].addIceCandidate(candidate)
                this._loggerService.logEvent("---> Ice Candiate Added")

            }
        } catch (error) {
            this._loggerService.reportError(error)
        }
    }

    private async _handleOfferMessage(message: IPayload): Promise<void> {

        this._loggerService.logEvent(`**** Received video chat offer from ${this.oppositeUserType}`)

        const id = message.clientId

        if (!this.connections[id]) {
            this._loggerService.logEvent(`---> A connection with id: ${id}, does not exist. Triggering new RTC peer creation`)
            this._initializePeerConnection(message)
        }

        const description: RTCSessionDescription = new RTCSessionDescription(message.data)

        try {

            if (this.users.length <= 1 && this.connections[id].signalingState !== "stable") {
                this._loggerService.logEvent("---> But the signaling state isn't stable, so triggering rollback")

                await Promise.all([
                    this.connections[id].setLocalDescription({ type: "rollback" }),
                    this.connections[id].setRemoteDescription(description)
                ])

                return

            } else {
                this._loggerService.logEvent("---> Setting remote description")
                await this.connections[id].setRemoteDescription(description)
            }
        } catch (error) {
            this._loggerService.logError(error)
        }

        try {

            if (this.connections[id].signalingState === "have-remote-offer" || this.connections[id].signalingState === "have-local-pranswer") {
                this._loggerService.logEvent("---> Creating and Sending Answer to Caller")
                const answer: RTCSessionDescriptionInit = await this.connections[id].createAnswer()

                this._loggerService.logEvent("---> Setting Answer to Local Description")
                await this.connections[id].setLocalDescription(answer)

                this._socketService.signal('signal', {
                    meetingId: this._meetingID,
                    roomId: message.roomId,
                    clientId: id,
                    member: this.userName,
                    mode: "answer",
                    data: this.connections[id].localDescription,
                    receiver: this.oppositeUserType,
                    sender: this.userType
                })

            }
        } catch (error) {
            this._loggerService.logError(error)
        }
    }

    private async _handleAnswerMessage(message: IPayload): Promise<void> {
        this._loggerService.logEvent("**** Handling Answer Message")

        const id = message.clientId
        const description: RTCSessionDescription = new RTCSessionDescription(message.data)

        try {
            await this.connections[id].setRemoteDescription(description)
            this._loggerService.logEvent(`---> Set remote description for connection id: ${id}`)

        } catch (error) {
            this._loggerService.reportError(error)
        }
    }

    private _handleDataChannelEvent(id: string, roomId: string, event: RTCDataChannelEvent): void {
        this._loggerService.logEvent(`---> Data Channel Initiated on ${this.oppositeUserType}`)
        this.dataChannels[id] = event.channel
        this.dataChannels[id].onmessage = this._handleDataChannelMessage.bind(this, id)
        this.dataChannels[id].onopen = this._handleDataChannelStatusChange.bind(this, id)
        this.dataChannels[id].onclose = this._handleDataChannelStatusChange.bind(this, id)
    }

    private _handleDataChannelStatusChange(id: string, event: Event): void {
        if (this.dataChannels[id]) {
            this._loggerService.logEvent(`Data channel's status has changed to ${this.dataChannels[id].readyState}`)
        }
    }

    public sendDataChannelMessage(content: string): void {

        if (!this.selectedDataChannelId) {
            alert("Please select a user from the selection")
            return
        }

        const index = this.users.findIndex((user: IPayload) => user.clientId === this.selectedDataChannelId)

        const message = this._generateMessage('message', content)

        this._store$.dispatch(createMessage({ message: message }))

        this.dataChannels[this.selectedDataChannelId].send(JSON.stringify(message))
        this._loggerService.logEvent(`**** DataChannel message sent: ${JSON.stringify(message)}`)
    }

    private _generateMessage(contentType: string, body: string, file?: any): IMessage {
        return {
            sender: this.userName, // the username of the participant sending the message
            body: body,
            contentType: contentType,
            file: file ? file : null,
            userType: this.userType, // client or host?
            timestamp: new Date(),
            clientId: this.selectedDataChannelId
        }
    }

    private _configureChatRoom(message: IMessage, index: number): void {

        if (!this.selectedDataChannelId) {
            this.selectedDataChannelId = message.clientId
        }

        if (this.tabs.length !== this.users.length) {
            this.tab = this.users[index]
        }

        this._componentRef.instance.selectedUser.setValue(index)
    }

    public sendDataChannelFile(changeEvent: any): void {

        const file: File = changeEvent.target.files[0]
        const id = this.selectedDataChannelId
        const chunkSize = 16384
        const user = this.users.find((user: IUser) => user.clientId === id)
        const message = this._generateMessage('file', "File Transfer", { name: file.name, size: file.size, progress: 0 })

        this._store$.dispatch(createMessage({ message: message }))

        // tell the targeted participant that a file sharing operation is in progress
        this._socketService.signal('filetransfer', {
            meetingId: this._meetingID,
            roomId: user.roomId,
            member: this.userName,
            mode: 'transfer',
            data: {
                ...message,
                transferInProgress: true
            },
            sender: this.oppositeUserType
        })

        const sliceFile = (offset: number) => {

            const reader = new FileReader()

            reader.onload = (event: any) => {
                this.dataChannels[id].send(event.target.result)

                if (file.size > (offset + event.target.result.byteLength)) {
                    setTimeout(sliceFile, 0, (offset + chunkSize))
                }

                const progress = this._calculateFileTransferProgress((offset + event.target.result.byteLength), file.size)

                this.progress = progress
            }

            const slice = file.slice(offset, (offset + chunkSize))
            reader.readAsArrayBuffer(slice)
        }
        sliceFile(0)
        // this.fileTransfer = false
    }

    private _calculateFileTransferProgress(loaded: number, total: number): number {
        return Math.round(loaded / total * 100)
    }

    private _handleDataChannelMessage(id: string, event: MessageEvent): void {

        if (this.isFileTransfering) {

            const payload: FileMessage = {
                progress: event.data.byteLength,
                buffer: event.data
            }

            this._store$.dispatch(updateFileTransferState({ fileData: payload }))
            return
            // this._fileBuffer.push(event.data)

            // this.fileLoaded += event.data.byteLength

            // this.messages[] = this._calculateFileTransferProgress(this.fileLoaded, this.fileSize)

            // if (this.fileLoaded === this.fileSize) {

            //     this.isFileTransfering = false

            //     const file = new Blob(this._fileBuffer)

            //     this._fileBuffer = []

            //     return
            // }

        } else {
            this._loggerService.logEvent(`**** DataChannel Message Received: ${event.data}`)

            const message = JSON.parse(event.data)
            const index = this.users.findIndex((user: IPayload) => user.clientId === id)

            this._store$.dispatch(createMessage({ message: message }))

            this._configureChatRoom(message, index)
        }

        // this.isMessageTargetSelected = true
    }

    private _handleDataChannelOnOpenEvent(id: string, roomId: string, event: any): void {
        if (this.dataChannels[id].readyState === 'open') {
            this._loggerService.logEvent("Data Channel open")
            this.dataChannels[id].onmessage = this._handleDataChannelMessage.bind(this, id)
        }
    }

    private _setFileTransferState(event: any): void {

        this.isFileTransfering = event.data.transferInProgress
        // this.fileSize = event.data.file.size

        this.channelId = event.data.clientId

        const index = this.users.findIndex((user: IPayload) => user.clientId === event.data.clientId)

        this._store$.dispatch(createMessage({ message: event.data }))

        this._configureChatRoom(event.data, index)
    }

    private _hangupAndNotify(payload: IPayload): void {
        // simply want to notify the other members that the person has left the room
        if (this.users.length === 1) {
            this.resetMeetingRoom(payload.clientId)
        }
        this._toastrService.info(`${payload.member} (${payload.member}) has left the meeting`)
    }

    public endVideoConference(): void {
        this._loggerService.logEvent("**** Closing the videoconference")

        const user = this.users.find((user: IUser) => user.clientId === this.selectedConnectionId)

        // if there is only one other user, close the meeting entirely
        if (this.users.length === 1) {
            this.resetMeetingRoom(user.clientId)
            // this.closeMeetingConnection()
        }

        // when we hangup, we notify the other participant(s) that we are leaving the videoconference
        this._socketService.signal('signal', {
            meetingId: this._meetingID,
            mode: 'hangup',
            member: this.userName,
            clientId: user.clientId,
            roomId: user.roomId
        })
    }

    public closeMeetingConnection(): void {
        if (this.connections[this.selectedConnectionId]) {
            this._loggerService.logEvent("**** Closing the peer connection and datachannel")
            const that = this

            this.users.forEach((user: IUser, index: number) => {
                const id = user.clientId

                that.stopTracks(id)
                that.connections[id].close() 
                that.dataChannels[id].close()
                that.connections[id] = null
                that.dataChannels = null
                that.webcamStreams[id] = null
                that.displayStreams[id] = null
            })
        }
    }

    public resetMeetingRoom(id: string): void {
        this._loggerService.logEvent("**** Ending the Video Conference")
        this._loggerService.logEvent("---> Closing the User and Display Media Tracks")

        this.stopTracks(id)

        this._store$.dispatch(setMeetingViewState({ meetingViewState: false }))

        // ** TODO ** (Optional)
        // if there are multiple meeting participants, we could set the srcElement to the next available 
        // participant, otherwise set the srcObject to null. more to come

        this.isVideoConferenceInactive = true
        
    }

    public async getDeviceList(): Promise<void> {
        try {
            const devices = await navigator.mediaDevices.enumerateDevices()
            this.cameraList = devices.filter((device: MediaDeviceInfo) => device.kind === "videoinput" && device.deviceId !== "default")
            this.speakerList = devices.filter((device: MediaDeviceInfo) => device.kind === "audiooutput" && device.deviceId !== "default")
            this.microphoneList = devices.filter((device: MediaDeviceInfo) => device.kind === "audioinput" && device.deviceId !== "default")
        } catch (error) {
            this._loggerService.logError(error)
        }
    }

    public stopTracks(id: string) {
        if (this.webcamStreams[id]) {
            this.webcamStreams[id].getTracks().forEach((track: MediaStreamTrack) => track.stop())

            if (this.isSharingScreenMode) {
                this.displayStreams[id].getTracks().forEach((track: MediaStreamTrack) => track.stop())
                this.isSharingScreen = false
            }
        }
    }

    public muteMicrophone(): void {
        this.webcamStreams[this.selectedConnectionId].getAudioTracks()[0].enabled = !this.webcamStreams[this.selectedConnectionId].getAudioTracks()[0].enabled
    }

    public disableVideoCamera(): void {
        this.webcamStreams[this.selectedConnectionId].getVideoTracks().map((stream: MediaStreamTrack) => stream.enabled = !stream.enabled)
    }

    private _switchTracks(stream: MediaStream, id: string, mode: string): void {
        const videoTrack = stream.getVideoTracks()
        const sender = this.connections[id].getSenders().find((sender: RTCRtpSender) => sender.track.kind === mode)
        sender.replaceTrack(videoTrack[0])
    }

    private _addTracksToConnection(stream: MediaStream, id: string): void {
        stream.getTracks().forEach((track: MediaStreamTrack) => {
            this.connections[id].addTrack(track, stream)
            this._loggerService.logEvent(`---> Added track: ${track.label} to connection`)
        })
    }

    public async configureVideoConferenceMode(): Promise<void> {
        this._loggerService.logEvent(`**** Entering Video Conference mode`)

        this.isVideoConferenceInactive = false

        this.selectedConnectionId = this.users[0].clientId
        const id = this.selectedConnectionId

        this.getDeviceList()

        this._store$.dispatch(setMeetingViewState({ meetingViewState: true }))

        try {
            this.webcamStreams[id] = await navigator.mediaDevices.getUserMedia({ audio: true, video: sizeConstraints })

            this._loggerService.logEvent(`---> Acquired user media for ${this.oppositeUserType}`)

            this.smallVideo = this.webcamStreams[id]
            this._addTracksToConnection(this.webcamStreams[id], id)

        } catch (error) {
            this._handleGetUserMediaError(error)
        }
    }

    private _beginMeetingTimer(): void {
        interval(1000).pipe(
            map((time: number) => this.timeCounter = (time * 1000)),
            // takeUntil(this.isVideoConferenceInactive$)
        ).subscribe()
    }

    public async configureScreenSharingMode(): Promise<void> {

        const id = this.selectedConnectionId

        this._loggerService.logEvent(`**** Entering Screen Sharing Mode`)

        if (this.isSharingScreenMode) {
            this._switchTracks(this.webcamStreams[id], id, "video")
            this.displayStreams[id].getTracks().forEach((track: MediaStreamTrack) => track.stop())
            this.isSharingScreen = false
            return
        }

        try {
            this.displayStreams[id] = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false })
            this._loggerService.logEvent(`---> Display media has been set`)

            this.isSharingScreen = true

            this._switchTracks(this.displayStreams[id], id, "video")
        } catch (error) {
            this._loggerService.logError(error)
        }
    }

    private _handleGetUserMediaError(error: Error) {
        this._loggerService.logError(error)
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

    public async configureCallType(type: string): Promise<void> {

        const id = this.selectedConnectionId

        return

        const constraints = {
            audio: true
        }

        this.changeDevice(type, constraints)
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
            this.webcamStreams[id] = await navigator.mediaDevices.getUserMedia(constraints)

            switch (type) {
                case "audioinput":
                case "audiooutput" || "audio":
                    track = this.webcamStreams[id].getAudioTracks()[0]
                    break
                case "videoinput":
                    track = this.webcamStreams[id].getVideoTracks()[0]
                    this._componentRef.instance.smallVideoArea.nativeElement.srcObject = this.webcamStreams[id]
                    break
            }

            const sender = this.connections[id].getSenders().find((sender: RTCRtpSender) => sender.track.kind === track.kind)
            sender.replaceTrack(track)

        } catch (error) {
            this._handleGetUserMediaError(error)
        }
    }
}