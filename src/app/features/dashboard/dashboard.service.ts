import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Subject, merge } from 'rxjs';
import { debounceTime, takeUntil, finalize } from 'rxjs/operators';
import { ApiService } from '../../core/services/api.service';
import { WebSocketService } from '../../core/websocket/websocket.service';
import { DashboardSummary } from './dashboard.types';

@Injectable()
export class DashboardService {
  private readonly api = inject(ApiService);
  private readonly ws = inject(WebSocketService);

  private readonly destroy$ = new Subject<void>();
  private readonly summarySubject = new BehaviorSubject<DashboardSummary | null>(null);
  private readonly loadingSubject = new BehaviorSubject(true);
  private readonly errorSubject = new BehaviorSubject<string | null>(null);

  readonly summary$ = this.summarySubject.asObservable();
  readonly loading$ = this.loadingSubject.asObservable();
  readonly error$ = this.errorSubject.asObservable();

  startPolling(): void {
    this.loadingSubject.next(true);

    this.api
      .get<DashboardSummary>('/dashboard/summary')
      .pipe(finalize(() => this.loadingSubject.next(false)))
      .subscribe({
        next: (data) => {
          this.summarySubject.next(data);
          this.loadingSubject.next(false);
          this.errorSubject.next(null);
        },
        error: (err: Error) => {
          this.loadingSubject.next(false);
          if (!this.summarySubject.value) {
            this.errorSubject.next(err.message);
          }
        },
      });

    merge(
      this.ws.onEvent('new_alert'),
      this.ws.onEvent('status_change'),
    )
      .pipe(debounceTime(3000), takeUntil(this.destroy$))
      .subscribe(() => this.fetchSummary());
  }

  stopPolling(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  refresh(): void {
    this.loadingSubject.next(true);
    this.errorSubject.next(null);
    this.fetchSummary();
  }

  private fetchSummary(): void {
    this.api
      .get<DashboardSummary>('/dashboard/summary')
      .pipe(finalize(() => this.loadingSubject.next(false)))
      .subscribe({
        next: (data) => {
          this.summarySubject.next(data);
          this.errorSubject.next(null);
        },
        error: (err: Error) => {
          if (!this.summarySubject.value) {
            this.errorSubject.next(err.message);
          }
        },
      });
  }
}
