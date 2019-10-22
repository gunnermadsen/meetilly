import { Injectable, Inject, PLATFORM_ID } from '@angular/core'
import { Router } from '@angular/router'
import { isPlatformBrowser } from '@angular/common'

import { Observable, of, EMPTY } from 'rxjs'

import { Action } from '@ngrx/store'
import { Actions, ofType, createEffect, OnInitEffects } from '@ngrx/effects'
import { exhaustMap, catchError, tap, map } from 'rxjs/operators'

import { ToastrService } from 'ngx-toastr'

import { HttpAuthService } from 'src/app/core/http/auth.http.service'


import * as account from '../actions/authentication.actions'

@Injectable()
export class AuthenticationEffects implements OnInitEffects {

    constructor(private actions$: Actions, private authService: HttpAuthService, private toastrService: ToastrService, private router: Router, @Inject(PLATFORM_ID) private platformId: object) { }

    public registerUserRequested$: Observable<Action> = createEffect(() => this.actions$.pipe(
        ofType(account.registerUserRequested),

        exhaustMap((action: any): Observable<any> => {

            return this.authService.register(action.payload.user).pipe(

                map((payload: any): Action => account.registrationSuccessful(payload)),

                catchError((error: any): Observable<Action> => of(account.registrationUnsuccessful({ error: error })))

            )
        })
    ))

    public authenticateUserRequested$: Observable<Action> = createEffect(() => this.actions$.pipe(
        ofType(account.authenticateUserRequested),
        exhaustMap((action: any) => {
            return this.authService.login(action.account).pipe(

                map((payload: any) => account.authenticateUserSuccessful({ account: payload })),

                tap((user: any) => this.router.navigateByUrl('/main')),

                catchError((err: any) => of(account.authenticateUserUnsuccessful({ error: err })))

            )
        })

    ))

    public userLogout$: Observable<void> = createEffect(() => this.actions$.pipe(
        ofType(account.logoutUserRequested),
        exhaustMap((action: any) => {
            return this.authService.logout().pipe(
                tap(() => {
                    if (isPlatformBrowser(this.platformId)) {
                        // Client only code.
                        localStorage.removeItem('Account')
                        this.router.navigate(['/login'], { replaceUrl: true }) //, { relativeTo: this.route }
                        this.toastrService.success('You have successfully logged out')
                    }
                }),
                catchError((error: any) => {
                    this.toastrService.error(error)
                    return error
                })
            )
        })
    ), { dispatch: false })

    public registrationUnsuccessful$: Observable<void> = createEffect(() => this.actions$.pipe(
        ofType(account.registrationUnsuccessful),
        tap((action: any) => this.toastrService.error(action.payload.error))
    ), { dispatch: false })

    public registrationSuccessful$: Observable<any> = createEffect(() => this.actions$.pipe(
        ofType(account.registrationSuccessful),
        tap(() => {
            this.toastrService.success('Registration was successsful, you may now log in')
            this.router.navigateByUrl('/login')
        })
    ), { dispatch: false })

    public authenticationUnsuccessful$: Observable<void> = createEffect(() => this.actions$.pipe(
        ofType(account.authenticateUserUnsuccessful),
        tap((action: any) => this.toastrService.error(action.payload.error))
    ), { dispatch: false })

    public authenticationSuccessful$: Observable<void> = createEffect(() => this.actions$.pipe(
        ofType(account.authenticateUserSuccessful),
        tap((action: any) => {
            if (isPlatformBrowser(this.platformId)) {
                // Client only code.
                localStorage.setItem('Account', JSON.stringify(action.account))
            }
        })
    ), { dispatch: false })


    public checkAuthenticationStatus$: Observable<Action | void> = createEffect(() => this.actions$.pipe(
        ofType(account.checkAuthenticationStatus),
        tap(() => {
            if (isPlatformBrowser(this.platformId)) {
                // Client only code.
                const user = JSON.parse(localStorage.getItem("Account"))

                if (user && user.JWTToken) {
                    return account.authenticateUserSuccessful({ account: user })
                } else {
                    return EMPTY
                }
            }
        })
    ), { dispatch: false })


    ngrxOnInitEffects(): any {
        return account.checkAuthenticationStatus()
    }

}