import { props, createAction } from '@ngrx/store';

export const authenticateUserRequested = createAction('[Authentication] User Authentication Requested', props<{ account: any }>())
export const authenticateUserSuccessful = createAction('[Authentication] User Authentication Successful', props<{ account: any }>())
export const authenticateUserUnsuccessful = createAction('[Authentication] User Authentication Unsuccessful', props<{ error: any }>())
export const checkAuthenticationStatus = createAction('[Authentication] Check User Authentication Status')

export const registrationSuccessful = createAction('[Registration] User Registration Succeeded', props<{ payload: any }>())
export const registerUserRequested = createAction('[Registration] User Registration Requested', props<{ user: any }>())
export const registrationUnsuccessful = createAction('[Registration] User Registration Unsuccessful', props<{ error: any }>())

export const logoutUserRequested = createAction('[Logout User] Logout User Requested')

export const verifyLink = createAction('[Verification] Link Verification Requested', props<{ link: string }>())