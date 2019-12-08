import { Injectable } from '@angular/core'
import { Socket } from 'ngx-socket-io';
import { Observable, merge } from 'rxjs';
import { IPayload } from '@/modules/main/models/payload.model';

@Injectable({ providedIn: 'root' })
export class SocketService {
    public event$: Observable<any>
    constructor(private _socket: Socket) {
        this.event$ = merge(
            this._socket.fromEvent('signal'),
            this._socket.fromEvent('ready'),
            this._socket.fromEvent('standby'),
            this._socket.fromEvent('closed'),
            this._socket.fromEvent('exchange'),
            this._socket.fromEvent('timer'),
            this._socket.fromEvent('filetransfer')
        )
    }

    public signal(signal: string, payload: IPayload): void {
        this._socket.emit(signal, payload)
    }

    public setNamespace(meetingId: string): void {
        this._socket.of(`/${meetingId}`)
    }
}