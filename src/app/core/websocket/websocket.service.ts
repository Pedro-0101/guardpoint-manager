import { Injectable, inject, OnDestroy } from '@angular/core';
import { webSocket } from 'rxjs/webSocket';
import { Subject, Subscription, Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { AuthService } from '../auth/auth.service';
import { NotificationService } from '../services/notification.service';
import { WsEvent } from './websocket.types';

const MAX_RECONNECT_DELAY = 16000;
const BASE_DELAY = 1000;

function snakeToCamelKeys(obj: unknown): unknown {
  if (obj === null || obj === undefined) return obj;
  if (Array.isArray(obj)) return obj.map(snakeToCamelKeys);
  if (typeof obj !== 'object') return obj;

  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    const camelKey = key.replace(/_([a-z])/g, (_match, char: string) =>
      char.toUpperCase(),
    );
    result[camelKey] = snakeToCamelKeys(value);
  }
  return result;
}

@Injectable({ providedIn: 'root' })
export class WebSocketService implements OnDestroy {
  private readonly auth = inject(AuthService);
  private readonly notification = inject(NotificationService);

  private readonly eventSubject = new Subject<WsEvent>();
  private wsSubscription: Subscription | null = null;
  private reconnectAttempts = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private wasConnected = false;
  private manualDisconnect = false;

  constructor() {
    const token = this.auth.getToken();
    if (token) {
      this.connect(token);
    }
  }

  ngOnDestroy(): void {
    this.manualDisconnect = true;
    this.cancelReconnect();
    this.disconnect();
  }

  connect(token: string): void {
    this.disconnect();

    const ws$ = webSocket<WsEvent>({
      url: `${environment.wsUrl}?token=${token}`,
      openObserver: {
        next: () => {
          this.reconnectAttempts = 0;
          if (this.wasConnected) {
            this.notification.success('Reconectado ao servidor.');
          }
          this.wasConnected = true;
        },
      },
      closeObserver: {
        next: () => this.handleClose(),
      },
      deserializer: (e) =>
        snakeToCamelKeys(JSON.parse(e.data)) as WsEvent,
    });

    this.wsSubscription = ws$.subscribe({
      next: (event) => this.eventSubject.next(event),
      error: () => this.handleClose(),
      complete: () => this.handleClose(),
    });
  }

  onEvent<T>(type: string): Observable<T> {
    return this.eventSubject.pipe(
      filter((e) => e.type === type),
      map((e) => e.payload as T),
    );
  }

  private handleClose(): void {
    if (this.manualDisconnect) return;
    this.wasConnected = true;
    this.notification.warning('Conexão perdida. Reconectando...');
    this.scheduleReconnect();
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);

    const delay = Math.min(
      BASE_DELAY * Math.pow(2, this.reconnectAttempts),
      MAX_RECONNECT_DELAY,
    );
    this.reconnectAttempts++;

    this.reconnectTimer = setTimeout(() => {
      const token = this.auth.getToken();
      if (token) {
        this.connect(token);
      }
    }, delay);
  }

  private cancelReconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  private disconnect(): void {
    if (this.wsSubscription) {
      this.wsSubscription.unsubscribe();
      this.wsSubscription = null;
    }
  }
}
