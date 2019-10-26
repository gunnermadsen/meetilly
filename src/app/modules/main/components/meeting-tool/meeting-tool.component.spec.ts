import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { MeetingToolComponent } from './meeting-tool.component';

describe('MeetingToolComponent', () => {
  let component: MeetingToolComponent;
  let fixture: ComponentFixture<MeetingToolComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ MeetingToolComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(MeetingToolComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
