import { ActionReducerMap, MetaReducer } from '@ngrx/store';
import { storeFreeze } from 'ngrx-store-freeze';
import { environment } from '../../environments/environment';
import { AuthenticationReducer } from '../core/authentication/store/reducer/authentication.reducer';
import { MeetingReducer } from '../modules/main/store/reducers/meeting.reducer';


export interface AppState {

}

export const reducers: ActionReducerMap<AppState> = {
    Authentication: AuthenticationReducer,
    Meetings: MeetingReducer
};

export const metaReducers: MetaReducer<AppState>[] = !environment.production ? [storeFreeze] : [];