import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MainComponent } from './components/main/main.component';
import { MainRoutingModule } from './main.routing.module';
import { SharedModule } from 'src/app/shared/shared.module';

@NgModule({
    declarations: [
        MainComponent
    ],
    imports: [ CommonModule, MainRoutingModule, SharedModule ],
    exports: [],
    providers: [],
})
export class MainModule {}