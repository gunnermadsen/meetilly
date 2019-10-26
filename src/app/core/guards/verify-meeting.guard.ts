import { Injectable } from '@angular/core';
import { Resolve, ActivatedRouteSnapshot } from '@angular/router';
import { of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { Store } from '@ngrx/store';
import { AppState } from '@/reducers';
import { HttpMeetingService } from '../http/meeting.http.service';


@Injectable({ providedIn: 'root' }) 
export class MeetingVerificationResolver implements Resolve<any> {
    constructor(private store: Store<AppState>, private meetingService: HttpMeetingService) { }
    resolve(route: ActivatedRouteSnapshot) {

        return this.meetingService.verifyMeeting(route.queryParams.meetingId).pipe(
            map((result: any) => {
                return result;
            }),
            catchError((error: any) => {
                return of({ content: null, message: error.message })
            })
        );
    }
}