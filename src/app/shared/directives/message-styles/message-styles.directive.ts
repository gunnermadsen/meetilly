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

  @Input()
  private contentType: string

  constructor(private element: ElementRef, private renderer: Renderer2) { }

  ngOnChanges(changes: SimpleChanges) {
    this.setMessageStyles()
  }

  private setMessageStyles(): void {
    switch (this.contentType) {
      case 'message':
        const backgroundStyle = this.userType === this.oppositeUserType ? 'rgba(16, 160, 16, 0.55)' : 'rgba(71, 139, 213, 0.988)' // greeen : blue (respectively)
        this.renderer.setStyle(this.element.nativeElement, 'background-color', backgroundStyle)
        this.renderer.addClass(this.element.nativeElement, 'text-message')
        break
      case 'file':
        const borderStyle = this.userType === this.oppositeUserType
          ? '1px solid rgba(16, 160, 16, 0.55)'   // Green
          : '1px solid rgba(71, 139, 213, 0.988)' // Blue
        this.renderer.setStyle(this.element.nativeElement, 'border', borderStyle)
        this.renderer.addClass(this.element.nativeElement, 'file-message')
        break
    }
    
    const value = this.userType === this.oppositeUserType ? 'flex-start' : 'flex-end'
    this.renderer.setStyle(this.element.nativeElement, 'align-self', value)  
  }

}
