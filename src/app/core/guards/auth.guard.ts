import { Injectable } from '@angular/core';
import { Store } from '@ngrx/store';
import { AppState } from '../../reducers/index';
import { CoreModule } from '../core.module';
import { CanActivate, Router } from '@angular/router';


@Injectable({ providedIn: CoreModule })
export class AuthGuardService implements CanActivate {

  constructor(private router: Router, private store: Store<AppState>) { }

  canActivate(): boolean {

    const account = JSON.parse(localStorage.getItem('Account'))
    
    if (account && account.JWTToken) {
      return true;
    } else {
      this.router.navigateByUrl('/login');
      return false;
    }
  }
}
