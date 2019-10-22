import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({providedIn: 'root'})
export class HttpAuthService {
    constructor(private http: HttpClient) {}

    public login(user: any): Observable<any> {
        return this.http.post<any>('/api/users/login', user);
    }

    public logout(): Observable<any> {
        return this.http.get<any>('/api/users/logout');
    }

    public register(user: any): Observable<any> {
        return this.http.post<any>('/api/users/register', user);
    }

}