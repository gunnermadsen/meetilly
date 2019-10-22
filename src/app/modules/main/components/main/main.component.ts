import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-main',
  templateUrl: './main.component.html',
  styleUrls: ['./main.component.scss']
})
export class MainComponent implements OnInit {

  constructor() { }

  public chatrooms: Array<string> = Array.from({ length: 12 }, (_, index) => `Meeting #${index + 1}`)

  ngOnInit() {
  }

}
