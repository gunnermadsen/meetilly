import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { AppState } from '@/reducers';
import { Store } from '@ngrx/store';

import { v4 } from 'uuid'

import * as meeting from '../../store/actions/meeting.actions'

@Component({
  selector: 'app-meeting-tool',
  templateUrl: './meeting-tool.component.html',
  styleUrls: ['./meeting-tool.component.scss']
})
export class MeetingToolComponent implements OnInit {
  private _userId: string = JSON.parse(localStorage.getItem('Account')).Id
  public get form() {
    return this._meetingToolFormGroup
  }

  private _meetingToolFormGroup: FormGroup

  constructor(private _formBuilder: FormBuilder, private _store$: Store<AppState>) { }

  ngOnInit() {
    this._meetingToolFormGroup = this._formBuilder.group({
      UserId: this._userId,
      MeetingId: v4(),
      Code: Math.floor(Math.random() * 90929298),
      Name: ['Test Meeting From Browser'],
      Description: ['Testing Meeting creation from browser'],
      CreatedOn: new Date(),
      EditedOn: new Date()
    })
  }

  public save(): void {
    this._store$.dispatch(meeting.createMeeting({ meeting: this.form.value }))
  }

}
