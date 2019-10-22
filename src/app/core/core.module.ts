import { NgModule, Optional, SkipSelf, ModuleWithProviders } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { HttpClientModule, HTTP_INTERCEPTORS, HttpClientXsrfModule } from '@angular/common/http';
import { StoreModule } from '@ngrx/store';
import { EffectsModule } from '@ngrx/effects';

import { ToastrModule } from 'ngx-toastr';

import { StoreDevtoolsModule } from '@ngrx/store-devtools';
import { environment } from 'src/environments/environment';
import { reducers, metaReducers } from '../reducers';
import { URLInterceptorService } from './interceptors/jwt.interceptor.service';
import { HttpErrorInterceptor } from './interceptors/http-error.interceptor.service';

@NgModule({
    declarations: [],
    imports: [ 
        CommonModule,
        StoreModule.forRoot(reducers, { metaReducers }),
        !environment.production ? StoreDevtoolsModule.instrument() : [],
        EffectsModule.forRoot([]),
        HttpClientXsrfModule.withOptions({
            cookieName: 'XSRF-TOKEN',
            headerName: 'x-xsrf-token'
        }),
    ],
    exports: [
    ],
    providers: [
        {
            provide: HTTP_INTERCEPTORS,
            useClass: URLInterceptorService,
            multi: true
        },
        {
            provide: HTTP_INTERCEPTORS,
            useClass: HttpErrorInterceptor,
            multi: true
        }
    ],
})
export class CoreModule {
    constructor(@Optional() @SkipSelf() parentModule: CoreModule) {
        // if the module is declared
        if (parentModule) {
            throw new Error(`${parentModule} has already been loaded. Import Core modules in the AppModule only.`);
        }
    }

    public static forRoot(): ModuleWithProviders {
        return {
            ngModule: CoreModule,
            providers: []
        }
    }
    public static forChild(): ModuleWithProviders {
        return {
            ngModule: CoreModule,
            providers: []

        }
    }
}