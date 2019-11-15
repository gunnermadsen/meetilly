import { ActionReducerMap, MetaReducer } from '@ngrx/store';
import { storeFreeze } from 'ngrx-store-freeze';
import { environment } from '@env/environment';
import { AuthenticationReducer } from '@/core/authentication/store/reducer/authentication.reducer';
import { MeetingReducer } from '@/modules/main/store/reducers/meeting.reducer';
import { MeetingSettingsReducer } from '@/modules/main/store/reducers/meeting-settings.reducer';
import { MessageReducer } from '@/modules/meeting/store/reducers/messages.reducer';


export interface AppState {

}

export const MeetingMap: ActionReducerMap<AppState> = {
    Meetings: MeetingReducer,
    MeetingSettings: MeetingSettingsReducer,
    Messages: MessageReducer
}

export const reducers: ActionReducerMap<AppState> = {
    Authentication: AuthenticationReducer,
    MeetingMap: MeetingMap,
};

export const metaReducers: MetaReducer<AppState>[] = !environment.production ? [storeFreeze] : [];