import { Injectable } from '@angular/core';
import { Socket } from 'ngx-socket-io';
import { Observable, timer } from 'rxjs';
import { IPayload } from '../models/payload.model';
import { delay, distinct, retryWhen, delayWhen } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class MeetingService {
    private _signal$: Observable<any> = this._socket.fromEvent<any>('signal')
    private _ready$: Observable<any> = this._socket.fromEvent<any>('ready')
    private _waiting$: Observable<any> = this._socket.fromEvent<any>('waiting')
    private _closed$: Observable<any> = this._socket.fromEvent<any>('closed')
    private _exchange$: Observable<any> = this._socket.fromEvent<any>('exchange')
    private _multi$: Observable<any> = this._socket.fromEvent<any>('multi')

    public get signal$(): Observable<any> {
        return this._signal$
    }

    public get ready$(): Observable<any> {
        return this._ready$
    }

    public get waiting$(): Observable<any> {
        return this._waiting$.pipe(delay(3000))
    }

    public get closed$(): Observable<any> {
        return this._closed$
    }

    public get exchange$(): Observable<any> {
        return this._exchange$
    }

    public get multi$(): Observable<any> {
        return this._multi$
    }

    public get socket(): Socket {
        return this._socket
    }

    constructor(private _socket: Socket) { }

    public signal(signal: string, payload: IPayload): void {
        this._socket.emit(signal, payload)
    }
}