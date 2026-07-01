import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  persistent: boolean;
  timestamp: number;
}

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private readonly notificationsSubject = new BehaviorSubject<Notification[]>([]);
  readonly notifications$ = this.notificationsSubject.asObservable();

  success(message: string, persistent = false): void {
    this.push('success', message, persistent);
  }

  error(message: string, persistent = true): void {
    this.push('error', message, persistent);
  }

  warning(message: string, persistent = false): void {
    this.push('warning', message, persistent);
  }

  info(message: string, persistent = false): void {
    this.push('info', message, persistent);
  }

  remove(id: string): void {
    const current = this.notificationsSubject.value;
    this.notificationsSubject.next(current.filter((n) => n.id !== id));
  }

  private push(type: Notification['type'], message: string, persistent: boolean): void {
    const notification: Notification = {
      id: crypto.randomUUID(),
      type,
      message,
      persistent,
      timestamp: Date.now(),
    };
    const current = this.notificationsSubject.value;
    this.notificationsSubject.next([...current, notification]);

    if (!persistent) {
      setTimeout(() => this.remove(notification.id), 5000);
    }
  }
}
