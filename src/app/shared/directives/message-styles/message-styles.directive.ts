import { Directive, Input, ElementRef, Renderer2, OnChanges, SimpleChanges } from '@angular/core';

@Directive({
  selector: '[meetingMessage]'
})
export class MessageStylesDirective implements OnChanges {
  // @Input() private messageIndex: number
  
  @Input() 
  private userType: string
  
  @Input() 
  private oppositeUserType: string

  constructor(private element: ElementRef, private renderer: Renderer2) { }

  ngOnChanges(changes: SimpleChanges) {
    this.alignMessage()
    this.setMessageColor()
  }

  public alignMessage(): void {
    const value = this.userType === this.oppositeUserType ? 'flex-start' : 'flex-end'
    this.renderer.setStyle(this.element.nativeElement, 'align-self', value)  
  }

  public setMessageColor(): void {
    const value = this.userType === this.oppositeUserType ? 'rgba(16, 160, 16, 0.55)' : 'rgba(71, 139, 213, 0.988)' // greeen : blue (respectively)
    this.renderer.setStyle(this.element.nativeElement, 'background-color', value)
  }

}
