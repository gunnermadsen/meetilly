import { Injectable } from '@angular/core';
import { HttpEvent, HttpInterceptor, HttpHandler, HttpRequest } from '@angular/common/http';

import { map } from 'rxjs/operators';
import { environment } from '@env/environment';

@Injectable()
export class URLInterceptorService implements HttpInterceptor {
    intercept(request: HttpRequest<any>, next: HttpHandler) {

        const account = JSON.parse(localStorage.getItem('Account'));

        request = request.clone({ 
            url: `${environment.localRepo}${request.url}`,
            withCredentials: true // (account && account.Token) ? true : false
        });

        if (account && account.JWTToken) {
            request = request.clone({
                headers: request.headers.set('Authorization', `Bearer ${account.JWTToken}`)
            })
        }
        
        return next.handle(request).pipe(
            map((event: HttpEvent<any>) => event)
        );
    }
}