import { Injectable } from '@angular/core';
import {
    HttpEvent, HttpInterceptor, HttpHandler, HttpRequest, HttpErrorResponse
} from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Injectable()
export class HttpErrorInterceptor implements HttpInterceptor {
    intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
        return next.handle(request).pipe(
            catchError((err: HttpErrorResponse) => {
                let errorMessage: string = '';

                if (err.error instanceof ErrorEvent) {
                    errorMessage = `Error: ${err.error.message}`;
                } else {
                    errorMessage = err.error.message;
                }
                return throwError(errorMessage);
            })
        )
    }
}