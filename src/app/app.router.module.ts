import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { LoginComponent } from './modules/home/components/login/login.component';
import { RegisterComponent } from './modules/home/components/register/register.component';
import { AuthGuardService } from './core/guards/auth.guard';
import { MeetingComponent } from './modules/meeting/components/meeting/meeting.component';
import { MeetingVerificationResolver } from './core/guards/verify-meeting.guard';

const routes: Routes = [
  {
    path: 'login',
    component: LoginComponent
  },
  {
    path: 'register',
    component: RegisterComponent
  },
  {
    path: 'main',
    canActivate: [AuthGuardService],
    loadChildren: './modules/main/main.module#MainModule'
  },
  {
    path: 'meeting',
    loadChildren: './modules/meeting/meeting.module#MeetingModule',
    canActivate: [AuthGuardService],
    resolve: {
      result: MeetingVerificationResolver
    }
  },
  {
    path: '**',
    redirectTo: '/login'
  }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRouterModule { }
