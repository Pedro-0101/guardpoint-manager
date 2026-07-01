import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Subject, timer } from 'rxjs';
import { switchMap, takeUntil, finalize } from 'rxjs/operators';
import { ApiService } from '../../core/services/api.service';
import { DashboardSummary } from './dashboard.types';

const POLLING_INTERVAL_MS = 30000;

@Injectable()
export class DashboardService {
  private readonly api = inject(ApiService);

  private readonly destroy$ = new Subject<void>();
  private readonly summarySubject = new BehaviorSubject<DashboardSummary | null>(null);
  private readonly loadingSubject = new BehaviorSubject(true);
  private readonly errorSubject = new BehaviorSubject<string | null>(null);

  readonly summary$ = this.summarySubject.asObservable();
  readonly loading$ = this.loadingSubject.asObservable();
  readonly error$ = this.errorSubject.asObservable();

  startPolling(): void {
    this.loadingSubject.next(true);

    timer(0, POLLING_INTERVAL_MS)
      .pipe(
        takeUntil(this.destroy$),
        switchMap(() =>
          this.api.get<DashboardSummary>('/dashboard/summary').pipe(
            finalize(() => {
              if (this.loadingSubject.value) {
                this.loadingSubject.next(false);
              }
            })
          )
        )
      )
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
  }

  stopPolling(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  refresh(): void {
    this.loadingSubject.next(true);
    this.api.get<DashboardSummary>('/dashboard/summary').subscribe({
      next: (data) => {
        this.summarySubject.next(data);
        this.loadingSubject.next(false);
        this.errorSubject.next(null);
      },
      error: (err: Error) => {
        this.loadingSubject.next(false);
        this.errorSubject.next(err.message);
      },
    });
  }
}
