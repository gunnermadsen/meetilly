import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';

import { AppRouterModule } from './app.router.module';
import { AppComponent } from './app.component';
import { CoreModule } from '@/core/core.module';
import { HomeModule } from '@/modules/home/home.module';
import { RegisterComponent } from '@/modules/home/components/register/register.component';
import { LoginComponent } from '@/modules/home/components/login/login.component';
import { SharedModule } from '@/shared/shared.module';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

import { SocketIoModule, SocketIoConfig } from 'ngx-socket-io';
import { StoreModule } from '@ngrx/store';
import { MeetingMap } from './reducers';
import { MeetingSettingsReducer } from './modules/main/store/reducers/meeting-settings.reducer';

const config: SocketIoConfig = {
  url: 'http://localhost:3434',
  options: {
    transports: [ 'websocket' ],
    reconnection: true,
    timeout: 30000,
    reconnectionDelay: 1500,
    upgrade: true,
    autoConnect: true
  }
}

@NgModule({
  declarations: [
    AppComponent,
    LoginComponent,
    RegisterComponent
  ],
  imports: [
    BrowserModule,
    AppRouterModule,
    BrowserAnimationsModule,
    CoreModule,
    HomeModule,
    SocketIoModule.forRoot(config),
    SharedModule,

    StoreModule.forFeature('Meetings', MeetingMap),

  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
