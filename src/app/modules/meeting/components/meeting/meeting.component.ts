import { Component, OnInit, ViewChild, ElementRef, OnDestroy, ViewChildren, QueryList, ChangeDetectorRef } from '@angular/core'
import { ActivatedRoute } from '@angular/router'
import { FormControl } from '@angular/forms'

import { takeUntil, tap, debounceTime, skipWhile, endWith, map } from 'rxjs/operators'
import { Observable, fromEvent, BehaviorSubject, combineLatest, iif, of } from 'rxjs'
import adapter from 'webrtc-adapter'

import { MeetingService } from '@/modules/meeting/services/meeting.service'
import { MatSelectChange } from '@angular/material'
import { Store, select } from '@ngrx/store'
import { AppState } from '@/reducers'
import { IUser } from '@/modules/meeting/models/users.model'
import { IMessage } from '../../models/message.model'
import { selectMessages } from '../../store/selectors/message.selectors'
import { IPayload } from '@/modules/main/models/payload.model'
import { BreakpointObserver, BreakpointState } from '@angular/cdk/layout';

@Component({
  selector: 'app-meeting',
  templateUrl: './meeting.component.html',
  styleUrls: ['./meeting.component.scss'],
})
export class MeetingComponent implements OnInit, OnDestroy {
  @ViewChild('smallVideoArea', { static: false }) public smallVideoArea: ElementRef<HTMLVideoElement>
  @ViewChild('mainVideoArea', { static: false }) public mainVideoArea: ElementRef<HTMLVideoElement>
  @ViewChild('videoContainer', { static: false }) public videoContainer: ElementRef<HTMLElement>
  // @ViewChildren('remoteVideo') private _remoteVideoAreas: QueryList<ElementRef<HTMLVideoElement>>
  // @ViewChildren('downloadFile') public downloadFile: QueryList<ElementRef<HTMLAnchorElement>>
  private _displayControls$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(true)
  public get displayControls$(): Observable<boolean> {
    return this._displayControls$.asObservable()
  }

  // public get isMessengerOpen$(): Observable<boolean> {
  //   return this._meetingService.
  // }

  public get isStreamingReady$(): Observable<boolean> {
    return this._meetingService.isStreamingReady$
  }

  public get timeCounter$(): Observable<number> {
    return this._meetingService.timeCounter$
  }
  
  public get webcamStreamsLength() {
    const value = Object.values(this._meetingService.webcamStreams).length
    return value
  }

  public get users$(): Observable<IUser[]> {
    return this._meetingService.users$
  }

  public get webcamStreams() {
    return this.webcamStreams
  }

  public get closeConference$(): Observable<boolean> {
    return this._meetingService.isVideoConferenceActive$
  }

  public get isScreenSharing(): boolean {
    return this._meetingService.isSharingScreenMode
  }

  public get cameraList(): MediaDeviceInfo[] {
    return this._meetingService.cameraList
  }

  public get microphoneList(): MediaDeviceInfo[] {
    return this._meetingService.microphoneList
  }

  public get speakerList(): MediaDeviceInfo[] {
    return this._meetingService.speakerList
  }

  public get tabs(): IPayload[] {
    return this._meetingService.tabs
  }

  public get messages(): any[] {
    return this._meetingService.messages
  }

  public selectedUser: FormControl = new FormControl()
  public messageToggle: FormControl = new FormControl({ disabled: true })
  public messageArea: FormControl = new FormControl()
  public messages$: Observable<IMessage[]>
  public isVideoConferenceMode: boolean = false
  public isDashboardHidden: boolean = false
  public isMuted: boolean = false
  public isPaused: boolean = false
  public isSharingScreen: boolean = false
  public isMessageTargetSelected: boolean = false
  public isVoice: boolean = false
  private _connectionId: string
  public sidenavMode$: Observable<string>

  public get oppositeUserType() {
    return this._meetingService.oppositeUserType
  }

  constructor(private _meetingService: MeetingService, private _store$: Store<AppState>, private _route: ActivatedRoute, private _cdr: ChangeDetectorRef, private _breakpointObserver: BreakpointObserver) {
    this.sidenavMode$ = this._breakpointObserver.observe(['(max-width: 1000px)']).pipe(
      map((state: BreakpointState) => state.matches === true ? 'over' : 'side')
    )
    
    this._connectionId = this._meetingService.clientConnectionID
    this._meetingService.initializeMeetingParams(this._route.snapshot)
    this._meetingService.initializeMeetingSignaling()

    this._meetingService.checkForReadiness(null)
  }
  
  ngOnInit() {

    this._meetingService.selectedChatroomUser$.pipe(
      takeUntil(this._meetingService.destroy)
    )
    .subscribe((state: number) => {
      this.selectedUser.setValue(state);
      
      this.isMessageTargetSelected = true

      this._cdr.detectChanges()
    })
  }

  public changeVideo(deviceId: string, type: string): void {
    this._meetingService.changeVideo(deviceId, type)
  }

  public changeAudio(deviceId: string, type: string): void {
    this._meetingService.changeAudio(deviceId, type)
  }

  public muteMicrophone(event: MouseEvent): void {
    this.isMuted = !this.isMuted
    this._meetingService.muteMicrophone()
  }

  public disableVideoCamera(event: MouseEvent): void {
    this.isPaused = !this.isPaused
    this._meetingService.disableVideoCamera()
  }

  public getDeviceList(): void {
    this._meetingService.getDeviceList()
  }

  public setSelectedUser(event: MatSelectChange): void {
    this._meetingService.channelId = this._meetingService.users[event.value].clientId

    this.isMessageTargetSelected = true

    this._meetingService.tab = this._meetingService.users[event.value]
    this.selectedUser.setValue(event.value)

    const index = this._meetingService.users.findIndex((user: IPayload) => user.clientId === this._meetingService.channelId)

    this._meetingService.selectedChatroomUser = index

  }

  public closeTab(event: MouseEvent, index: number): void {
    this._meetingService.tabs.splice(index, 1)

    if (this._meetingService.tabs.length === 0) {
      // hide the tab group and reset the selectedUser Form Control if the tab list length is 0
      this.isMessageTargetSelected = false
      this.selectedUser.setValue(100)
    }
    event.preventDefault()
  }

  public trackByFn<K, V>(key: K, value: V): V {
    return value
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
    ])
    // .pipe(
    //   takeUntil(this._meetingService.isVideoConferenceInactive$)
    // )
    .subscribe()
  }

  private _observeMeetingEvents(): void {
    this._meetingService.mainVideoArea$.pipe(
      takeUntil(this._meetingService.destroy)
    )
      .subscribe((stream: MediaStream) => {
        this.mainVideoArea.nativeElement.srcObject = stream
      })

    this._meetingService.smallVideoArea$.pipe(
      takeUntil(this._meetingService.destroy)
    )
      .subscribe((stream: MediaStream) => {
        this.smallVideoArea.nativeElement.srcObject = stream
      })

    this._meetingService.isVideoConferenceActive$.pipe(
      takeUntil(this._meetingService.destroy)
    )
      .subscribe((state: boolean) => {
        if (!state) {
          this.mainVideoArea.nativeElement.srcObject = null
          this.smallVideoArea.nativeElement.srcObject = null
          this.videoContainer.nativeElement.style.display = 'none'
        }
      })
  }

  public endVideoConference(): void {
    this._meetingService.endVideoConference()
    this.isVideoConferenceMode = !this.isVideoConferenceMode
    this.isDashboardHidden = false
  }

  public sendDataChannelMessage(): void {

    if (!this._meetingService.channelId) {
      alert("Please select a user from the selection")
      return
    }

    this._meetingService.sendDataChannelMessage(this.messageArea.value)

    this.messageArea.setValue("")

  }

  public sendDataChannelFile(event: any): void {

    if (!this._meetingService.channelId) {
      alert("Please select a user from the selection")
      return
    }

    if (!event.target.files) return

    if (event.target.files[0].filesize > 100000000) {
      alert("Your file must be less than 100MB to transfer")
      return
    }

    this._meetingService.sendDataChannelFile(event)

  }

  public configureVideoConferenceMode(): void {

    this.isDashboardHidden = true

    this.videoContainer.nativeElement.style.display = 'inline-block'

    this._observeMeetingEvents()

    this._meetingService.configureVideoConferenceMode()

    this._watchForMouseMovement()

  }

  public configureScreenSharingMode(): void {

    this._meetingService.configureScreenSharingMode()

  }

  public configureCallType(type: string): void {
    this.isVoice = !this.isVoice
    this._meetingService.configureCallType(type)
  }

  public getMessages$(clientId: string): Observable<IMessage[]> {
    return this._store$.pipe(
      select(selectMessages(clientId)),
      tap((messages: IMessage[]) => console.log(messages))
    )
  }

  ngOnDestroy() {
    this._meetingService.endVideoConference()

    this._meetingService.destroyState = false
    this._meetingService.destroy.unsubscribe()
    // this._closeConference$.next(false)
    // this._closeConference$.unsubscribe()
    this._displayControls$.next(false)
    this._displayControls$.unsubscribe()
  }
}