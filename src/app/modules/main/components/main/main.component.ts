import { Component, OnInit, Inject, PLATFORM_ID } from '@angular/core';
import { Router } from '@angular/router';
import { Observable } from 'rxjs';
import { IMeeting } from '@/shared/models/meeting.model';
import { Store, select } from '@ngrx/store';
import { AppState } from '@/reducers';

import * as meetings from '@/modules/main/store/selectors/meeting.selectors'
import { fetchMeetings } from '@/modules/main/store/actions/meeting.actions';
import { isPlatformBrowser } from '@angular/common';
import { FormGroup, FormControl } from '@angular/forms';

import * as md5 from 'md5'

@Component({
  selector: 'app-main',
  templateUrl: './main.component.html',
  styleUrls: ['./main.component.scss']
})
export class MainComponent implements OnInit {

  public meetings$: Observable<IMeeting[]>

  private _joinMeetingForm: FormGroup

  public get form() {
    return this._joinMeetingForm
  }

  private _userName: string

  constructor(private _router: Router, private _store$: Store<AppState>, @Inject(PLATFORM_ID) private _platformId: object) { }

  ngOnInit() {

    this._joinMeetingForm = new FormGroup({
      MeetingNumber: new FormControl('43464561')
    })

    this._store$.dispatch(fetchMeetings())

    this.meetings$ = this._store$.pipe(
      select(meetings.selectMeetings)
    )

    // for SSR Safety (TEMPORARY username access until accout information will be configured to be stored in ngrx store)
    if (isPlatformBrowser(this._platformId)) {
      this._userName = JSON.parse(localStorage.getItem('Account')).UserName
    }

  }

  public routeToPath(path: string): void {
    this._router.navigate([path])
  }

  public startMeetingAsHost(event: MouseEvent, id: number): void {

    const meetingId = id.toString()

    const options = {
      queryParams: {
        mode: 'host',
        meetingId: meetingId,
        member: this._userName,
        // connectionId: md5(Math.floor(Math.random() * 8932839).toString())
      }
    }

    this._router.navigate(['/meeting'], options)
    // this._openWindow('host', meetingId)
  }

  public joinMeetingAsGuest(): void {

    const meetingId = this.form.controls['MeetingNumber'].value

    const options = { 
      queryParams: {
        mode: 'guest',
        meetingId: meetingId,
        member: this._userName,
        // connectionId: md5(Math.floor(Math.random() * 8932839).toString())
      }
    }

    this._router.navigate(['/meeting'], options)
    // this._openWindow('guest', meetingId)
  }

  public deleteMeeting(meeting: IMeeting): void {
    console.log(meeting)
  }

  public editMeeting(meeting: IMeeting): void {
    console.log(meeting)
  }

  private _openWindow(mode: string, meetingId: string, connectionId?: string): void {
    window.open(`/meeting?mode=${mode}&meetingId=${meetingId}&member=${this._userName}`, "_blank", "width=1500, height=1000") // &connectionId=${connectionId}
  }

}
