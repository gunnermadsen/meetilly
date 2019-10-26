import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MainComponent } from './components/main/main.component';
import { MainRouterModule } from './main.router.module';
import { SharedModule } from '@/shared/shared.module';
import { StoreModule } from '@ngrx/store';
import { MeetingReducer } from './store/reducers/meeting.reducer';
import { EffectsModule } from '@ngrx/effects';
import { MeetingEffects } from './store/effects/meeting.effects';
import { MeetingComponent } from '../meeting/components/meeting/meeting.component';
import { MeetingToolComponent } from './components/meeting-tool/meeting-tool.component';

@NgModule({
    declarations: [
        MainComponent,
        // MeetingComponent,
        MeetingToolComponent
    ],
    imports: [
        CommonModule, 
        MainRouterModule, 
        SharedModule,
        StoreModule.forFeature('Meetings', MeetingReducer),
        EffectsModule.forFeature([MeetingEffects]),
    ],
    exports: [],
    providers: [],
})
export class MainModule {}