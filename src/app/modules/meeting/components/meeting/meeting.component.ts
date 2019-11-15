import { Component, OnInit, ViewChild, ElementRef, OnDestroy, ViewChildren, QueryList } from '@angular/core'
import { ActivatedRoute } from '@angular/router'
import { FormControl } from '@angular/forms'

import { takeUntil, map, tap, debounceTime, skipWhile } from 'rxjs/operators'
import { Subject, merge, Observable, fromEvent, BehaviorSubject, combineLatest, interval } from 'rxjs'
import adapter from 'webrtc-adapter'

import * as uuid from 'uuid'

import { MeetingService } from '@/modules/meeting/services/meeting.service'
import { IPayload } from '@/modules/main/models/payload.model'
import { MatSelectChange, MatTableDataSource } from '@angular/material'
import { Store, select } from '@ngrx/store'
import { AppState } from '@/reducers'
import { setMeetingViewState } from '@/modules/main/store/actions/meeting.actions'
import { IUser } from '@/modules/meeting/models/users.model'
import { IMessage } from '../../models/message.model';
import { selectMessages } from '../../store/selectors/message.selectors';
import { LoggerService } from '../../services/logger.service';

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
  @ViewChildren('downloadFile') public downloadFile: QueryList<ElementRef<HTMLAnchorElement>>
  private _closeConference$: Subject<boolean> = new Subject<boolean>()
  private _displayControls$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(true)
  public get displayControls$(): Observable<boolean> {
    return this._displayControls$.asObservable()
  }

  public selectedUser: FormControl = new FormControl()
  public messageToggle: FormControl = new FormControl({ disabled: true })
  public messageArea: FormControl = new FormControl()
  public displayedColumns: string[] = ['name', 'type', 'clientId']
  public userType: string = null
  public oppositeUserType: string = null
  public messages$: Observable<IMessage[]>
  public tabs: IPayload[] = []
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
    const value = Object.values(this._meetingService.webcamStreams).length
    return value
  }

  public get webcamStreams() {
    return this.webcamStreams
  }

  constructor(private _route: ActivatedRoute, private _loggerService: LoggerService, private _meetingService: MeetingService, private _store$: Store<AppState>) {
    this.userType = this._route.snapshot.queryParams.mode
    this._connectionId = uuid.v4()

    this.oppositeUserType = this.userType === 'host' ? 'guest' : 'host'

    this._meetingService.initializeMeetingParams()
    this._meetingService.initializeMeetingSignaling()

    this._meetingService.checkForReadiness(null)
  }
  
  ngOnInit() {
    this._meetingService.listenForReadyEvent()

    this.messages$ = this._store$.pipe(
      select(selectMessages(this._connectionId)),
      tap((messages: IMessage[]) => console.log(messages))
    )
  }

  public sendDataChannelMessage(): void {

    this._meetingService.sendDataChannelMessage(this.messageArea.value)

    this.messageArea.setValue("")

  }

  public beginMeetingTimer(): void {
    this.timeCounter$ = interval(1000).pipe(map((time: number) => time * 1000), takeUntil(this._closeConference$))
  }

  public muteMicrophone(event: MouseEvent): void {
    this.isMuted = !this.isMuted
    this._meetingService.muteMicrophone()
  }

  public disableVideoCamera(event: MouseEvent): void {
    this.isPaused = !this.isPaused
    this._meetingService.disableVideoCamera()
  }

  public setSelectedUser(event: MatSelectChange): void {
    this._meetingService.connectionId = this._meetingService.users[event.value].clientId
    this.isMessageTargetSelected = !this.isMessageTargetSelected
    this.tabs.push(this._meetingService.users[event.value])
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

  public configureVideoConferenceMode(): void {

    this.isDashboardHidden = true

    this._meetingService.configureVideoConferenceMode()
    
    this._watchForMouseMovement()

  }

  public sendDataChannelFile(event: any): void {

    if (!this._meetingService.channelId) {
      alert("Please select a user from the selection")
      return
    }

    if (!event.target.files) return

    this._meetingService.sendDataChannelFile(event)

  }

  public configureScreenSharingMode(): void {

    this._meetingService.configureScreenSharingMode()

  }

  public configureCallType(type: string): void {
    this.isVoice = !this.isVoice
    this._meetingService.configureCallType(type)
  }

  ngOnDestroy() {
    this._meetingService.endVideoConference()
    this._closeConference$.next(false)
    this._closeConference$.unsubscribe()
    this._displayControls$.next(false)
    this._displayControls$.unsubscribe()
  }
}