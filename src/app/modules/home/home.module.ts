import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StoreModule } from '@ngrx/store';
import { EffectsModule } from '@ngrx/effects';
import { SharedModule } from 'src/app/shared/shared.module';
import { AuthenticationReducer } from 'src/app/core/authentication/store/reducer/authentication.reducer';
import { AuthenticationEffects } from 'src/app/core/authentication/store/effects/authentication.effects';

@NgModule({
    declarations: [],
    imports: [ 
        CommonModule, 
        SharedModule,
        StoreModule.forFeature('Authentication', AuthenticationReducer),
        EffectsModule.forFeature([AuthenticationEffects]),

    ],
    exports: [],
    providers: [],
})
export class HomeModule {}