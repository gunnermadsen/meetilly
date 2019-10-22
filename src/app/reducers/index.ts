import { ActionReducerMap, MetaReducer } from '@ngrx/store';
import { storeFreeze } from 'ngrx-store-freeze';
import { environment } from '../../environments/environment';
import { AuthenticationReducer } from '../core/authentication/store/reducer/authentication.reducer';


// tslint:disable-next-line: no-empty-interface
export interface AppState {

}

export const reducers: ActionReducerMap<AppState> = {
    Authentication: AuthenticationReducer
};

// tslint:disable-next-line: eofline
export const metaReducers: MetaReducer<AppState>[] = !environment.production ? [storeFreeze] : [];