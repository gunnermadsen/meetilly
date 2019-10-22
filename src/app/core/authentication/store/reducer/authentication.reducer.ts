import { createReducer, on, Action } from '@ngrx/store';
import { authenticateUserSuccessful, logoutUserRequested } from '../actions/authentication.actions';

export interface AuthenticationState {
    isLoggedIn: boolean;
    account: any
}

export const initialAuthenticationState: AuthenticationState = {
    isLoggedIn: false,
    account: undefined
};

const reducer = createReducer(
    initialAuthenticationState,
    on(authenticateUserSuccessful, (state: AuthenticationState, { account }) => {
        return {
            isLoggedIn: true,
            account: account
        }
    }),
    on(logoutUserRequested, () => initialAuthenticationState)
)

export function AuthenticationReducer(state: AuthenticationState | undefined, action: Action) {
    return reducer(state, action)
}