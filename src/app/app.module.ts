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

export const config: SocketIoConfig = {
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
    SharedModule,
    HomeModule,
    SocketIoModule.forRoot(config)

  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
