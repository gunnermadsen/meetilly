import { Injectable } from '@angular/core';
import { Socket } from 'ngx-socket-io';
import { Observable } from 'rxjs';
import { IPayload } from '../models/payload.model';
import { delay } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class MeetingService {
    private _signal$: Observable<any> = this._socket.fromEvent<any>('signal')
    private _connection$: Observable<any> = this._socket.fromEvent<any>('open')

    private _wating$: Observable<any> = this._socket.fromEvent<any>('waiting')

    public get signal$(): Observable<any> {
        return this._signal$
    }

    public get connection$(): Observable<any> {
        return this._connection$
    }

    public get waiting$(): Observable<any> {
        return this._wating$.pipe(delay(3000))
    }

    constructor(private _socket: Socket) { }

    public signal(signal: string, payload: IPayload): void {
        this._socket.emit(signal, payload)
    }
}