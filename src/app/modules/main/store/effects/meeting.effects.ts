import { Injectable } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { Action } from '@ngrx/store';
import { Actions, Effect, ofType, createEffect } from '@ngrx/effects';
import { createMeeting, fetchMeetings, saveMeetings, verifyMeeting } from '@/modules/main/store/actions/meeting.actions';
import { exhaustMap, catchError, map, tap } from 'rxjs/operators';
import { HttpMeetingService } from '@/core/http/meeting.http.service';
import { Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { IMeeting } from '@/shared/models/meeting.model';

@Injectable()
export class MeetingEffects {
    public createMeeting$: Observable<void> = createEffect(() => this.actions$.pipe(
        ofType(createMeeting),
        exhaustMap((payload: any) => {
            return this.meetingService.createMeeting(payload.meeting).pipe(
                tap(() => {
                    this.router.navigateByUrl('/main');
                    this.toastrService.success('Your meeting was created successfully')
                }),
                catchError((error: any) => of(throwError(error)))
            )
        })
    ), { dispatch: false })

    public fetchMeetings$: Observable<Action> = createEffect(() => this.actions$.pipe(
        ofType(fetchMeetings),
        exhaustMap(() => {
            return this.meetingService.fetchMeetings().pipe(

                map((payload: IMeeting[]) => {
                    return saveMeetings({ meetings: payload });
                }),

                catchError((error: any) => throwError(error))

            )
        })
    ))

    // public verifyMeeting$: Observable<Action> = createEffect(() => this.actions$.pipe(
    //     ofType(verifyMeeting),
    //     exhaustMap((payload: any) => {
    //         return this.meetingService.verifyMeeting(payload).pipe(

    //         )
    //     })
    // ))

    constructor(private actions$: Actions, private meetingService: HttpMeetingService, private router: Router, private toastrService: ToastrService) {}
}