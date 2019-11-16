import { Injectable } from '@angular/core'
import { Socket } from 'ngx-socket-io';
import { Observable } from 'rxjs';
import { IPayload } from '@/modules/main/models/payload.model';

@Injectable({ providedIn: 'root' })
export class SocketService {
    public signal$: Observable<any> = this._socket.fromEvent<any>('signal')
    public ready$: Observable<any> = this._socket.fromEvent<any>('ready')
    public standby$: Observable<any> = this._socket.fromEvent<any>('standby')
    public closed$: Observable<any> = this._socket.fromEvent<any>('closed')
    public exchange$: Observable<any> = this._socket.fromEvent<any>('exchange')
    public timer$: Observable<any> = this._socket.fromEvent<any>('timer')
    public transfer$: Observable<any> = this._socket.fromEvent<any>('filetransfer')

    constructor(private _socket: Socket) {}

    public signal(signal: string, payload: IPayload): void {
        this._socket.emit(signal, payload)
    }
}