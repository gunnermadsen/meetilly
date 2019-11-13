import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { IMeeting } from '@/shared/models/meeting.model';
import { isPlatformBrowser } from '@angular/common';

@Injectable({ providedIn: 'root' })
export class HttpMeetingService {

    private _userId: string

    constructor(private http: HttpClient, @Inject(PLATFORM_ID) private _platformId: Object) {
        if (isPlatformBrowser(this._platformId)) {
            this._userId = JSON.parse(localStorage.getItem('Account')).Id
        }
    }

    public createMeeting(meeting: IMeeting): Observable<any> {
        return this.http.post<any>('/api/meetings/new', meeting);
    }

    public fetchMeetings(): Observable<IMeeting[]> {
        return this.http.get<IMeeting[]>(`/api/meetings?id=${this._userId}`);
    }

    public updateMeeting(meeting: IMeeting): Observable<any> {
        return this.http.put('/api/meetings', meeting);
    }

    public deleteMeeting(id: string): Observable<any> {
        return this.http.delete<any>(`/api/meetings/${id}`);
    }

    public verifyMeeting(code: string): Observable<any> {
        return this.http.post<any>('/api/meetings/verify', { code: code })
    }

}