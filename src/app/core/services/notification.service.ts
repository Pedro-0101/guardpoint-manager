import { Injectable } from '@angular/core';
import { toast } from 'ngx-sonner';

@Injectable({ providedIn: 'root' })
export class NotificationService {
  success(message: string): void {
    toast.success(message);
  }

  error(message: string): void {
    toast.error(message);
  }

  warning(message: string): void {
    toast(message);
  }

  info(message: string): void {
    toast(message, { description: message });
  }
}
