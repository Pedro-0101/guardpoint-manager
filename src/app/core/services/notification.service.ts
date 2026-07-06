import { Injectable } from '@angular/core';
import { toast, type ExternalToast } from 'ngx-sonner';

@Injectable({ providedIn: 'root' })
export class NotificationService {
  success(message: string, options?: ExternalToast): void {
    toast.success(message, options);
  }

  error(message: string, options?: ExternalToast): void {
    toast.error(message, options);
  }

  warning(message: string, options?: ExternalToast): void {
    toast.warning(message, options);
  }

  info(message: string, options?: ExternalToast): void {
    toast.info(message, options);
  }

  show(message: string, options?: ExternalToast): void {
    toast(message, options);
  }
}
