import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-main',
  templateUrl: './main.component.html',
  styleUrls: ['./main.component.scss']
})
export class MainComponent implements OnInit {

  constructor(private router: Router) { }

  public chatrooms: Array<string> = Array.from({ length: 12 }, (_, index) => `Meeting #${index + 1}`)

  ngOnInit() {
  }

  public routeToPath(path: string): void {
    this.router.navigate([path])
  }

}
