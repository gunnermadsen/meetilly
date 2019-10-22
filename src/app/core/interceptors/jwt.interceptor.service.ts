import { Injectable } from '@angular/core';
import {
    HttpEvent, HttpInterceptor, HttpHandler, HttpRequest
} from '@angular/common/http';

import { map } from 'rxjs/operators';
import { environment } from 'src/environments/environment';

@Injectable()
export class URLInterceptorService implements HttpInterceptor {
    intercept(request: HttpRequest<any>, next: HttpHandler) {

        const account = JSON.parse(localStorage.getItem('Account'));

        // if (request.url.includes('/api/account/picture')) {
        //     request = request.clone({
        //         headers: request.headers.set('Content-Type', 'application/x-www-form-urlencoded')
        //     });
        // }

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