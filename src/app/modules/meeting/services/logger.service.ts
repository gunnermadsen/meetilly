import { Injectable } from '@angular/core'

@Injectable({ providedIn: 'root' })
export class LoggerService {
    public logEvent(text: string): void {
        const time = new Date()
        console.log(`[${time.toLocaleTimeString()}] ${text}`)
    }

    public logObject(text: string, object: any): void {
        const time = new Date()
        console.log(`[${time.toLocaleTimeString()}] ${text}:`, object)
    }

    public logError(text: any): void {
        const time = new Date()
        console.error(`[${time.toLocaleTimeString()}] ${text}`)
    }

    public reportError(message: Error) {
        this.logError(`Error ${message.name}: ${message.message}`)
    }
}