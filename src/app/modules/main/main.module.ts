import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MainComponent } from './components/main/main.component';
import { MainRouterModule } from './main.router.module';
import { SharedModule } from '@/shared/shared.module';
import { StoreModule } from '@ngrx/store';

import { EffectsModule } from '@ngrx/effects';
import { MeetingEffects } from './store/effects/meeting.effects';
import { MeetingToolComponent } from './components/meeting-tool/meeting-tool.component';
import { MeetingMap } from '@/reducers';


@NgModule({
    declarations: [
        MainComponent,
        MeetingToolComponent
    ],
    imports: [
        CommonModule,
        MainRouterModule,
        SharedModule,
        StoreModule.forFeature('Meetings', MeetingMap),
        EffectsModule.forFeature([MeetingEffects]),
    ],
    exports: [],
    providers: [],
})
export class MainModule {}