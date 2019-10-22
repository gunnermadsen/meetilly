import { createFeatureSelector, createSelector } from '@ngrx/store';
import * as authenticationReducer from '../reducer/authentication.reducer';

export const selectAuthenticationState = createFeatureSelector<authenticationReducer.AuthenticationState>('Authentication');
export const userAuthenticationStatus = createSelector(
    selectAuthenticationState,
    authStatus => {
        return authStatus.isLoggedIn;
    }
)

export const selectUser = createSelector(
    selectAuthenticationState,
    authData => {
        return authData;
    }
)


export const selectAuthState = createSelector(
    selectAuthenticationState,
    (state: authenticationReducer.AuthenticationState)  => {
        return state.isLoggedIn
    }
)