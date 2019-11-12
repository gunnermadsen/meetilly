import { Injectable } from '@angular/core';
import { Socket } from 'ngx-socket-io';
import { Observable } from 'rxjs';
import { IPayload } from '../../main/models/payload.model';
import { delay } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class MeetingService {
    private _signal$: Observable<any> = this._socket.fromEvent<any>('signal')
    private _ready$: Observable<any> = this._socket.fromEvent<any>('ready')
    private _standby$: Observable<any> = this._socket.fromEvent<any>('standby')
    private _closed$: Observable<any> = this._socket.fromEvent<any>('closed')
    private _exchange$: Observable<any> = this._socket.fromEvent<any>('exchange')
    private _timer$: Observable<any> = this._socket.fromEvent<any>('timer')

    public get signal$(): Observable<any> {
        return this._signal$
    }

    public get ready$(): Observable<any> {
        return this._ready$
    }

    public get standby$(): Observable<any> {
        return this._standby$.pipe(delay(3000))
    }

    public get closed$(): Observable<any> {
        return this._closed$
    }

    public get exchange$(): Observable<any> {
        return this._exchange$
    }

    public get timer$(): Observable<any> {
        return this._timer$
    }

    public get socket(): Socket {
        return this._socket
    }

    constructor(private _socket: Socket) { }

    public signal(signal: string, payload: IPayload): void {
        this._socket.emit(signal, payload)
    }
}