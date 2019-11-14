import { Injectable } from '@angular/core';
import { Socket } from 'ngx-socket-io';
import { Observable } from 'rxjs';
import { IPayload } from '../../main/models/payload.model';
import { delay } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class MeetingService {
    public signal$: Observable<any> = this._socket.fromEvent<any>('signal')
    public ready$: Observable<any> = this._socket.fromEvent<any>('ready')
    public standby$: Observable<any> = this._socket.fromEvent<any>('standby')
    public closed$: Observable<any> = this._socket.fromEvent<any>('closed')
    public exchange$: Observable<any> = this._socket.fromEvent<any>('exchange')
    public timer$: Observable<any> = this._socket.fromEvent<any>('timer')
    public transfer$: Observable<any> = this._socket.fromEvent<any>('filetransfer')

    public get socket(): Socket {
        return this._socket
    }

    constructor(private _socket: Socket) { }

    public signal(signal: string, payload: IPayload): void {
        this._socket.emit(signal, payload)
    }
}