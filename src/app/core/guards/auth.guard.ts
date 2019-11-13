import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { CoreModule } from '../core.module';
import { CanActivate, Router } from '@angular/router';
import { isPlatformBrowser } from '@angular/common';


@Injectable({ providedIn: CoreModule })
export class AuthGuardService implements CanActivate {

  private _account: Storage

  constructor(private router: Router, @Inject(PLATFORM_ID) private _platformId: Object) {
    if (isPlatformBrowser(this._platformId)) {
      this._account = JSON.parse(localStorage.getItem('Account'))
    }
  }

  canActivate(): boolean {
    
    if (this._account && this._account.JWTToken) {
      return true;
    } else {
      this.router.navigateByUrl('/login');
      return false;
    }
  }
}
