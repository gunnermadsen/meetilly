import { Component, ChangeDetectorRef, OnInit } from '@angular/core';
import { MediaMatcher } from '@angular/cdk/layout';
import { Store, select } from '@ngrx/store';
import { AppState } from '@/reducers';
import { logoutUserRequested } from '@/core/authentication/store/actions/authentication.actions';
import { Observable } from 'rxjs';
import { selectAuthState } from '@/core/authentication/store/selectors/authentication.selectors';

import { selectMeetingViewState } from '@/modules/main/store/selectors/meeting.selectors';
import { startWith, map } from 'rxjs/operators';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
  public mobileQuery: MediaQueryList;
  private _mobileQueryListener: () => void;
  public authState$: Observable<boolean>
  public meetingViewState$: Observable<boolean>

  constructor(changeDetectorRef: ChangeDetectorRef, media: MediaMatcher, private _store$: Store<AppState>) {
    this.mobileQuery = media.matchMedia('(max-width: 600px)');
    this._mobileQueryListener = () => changeDetectorRef.detectChanges();
    this.mobileQuery.addListener(this._mobileQueryListener);
  }

  ngOnInit() {
    this.authState$ = this._store$.pipe(
      select(selectAuthState)
    )

    this.meetingViewState$ = this._store$.pipe(
      select(selectMeetingViewState)
    )
  }

  public logout(): void {
    this._store$.dispatch(logoutUserRequested())
  }
  
}
