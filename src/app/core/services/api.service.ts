import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, timeout } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl;
  private readonly defaultTimeout = 30000;

  get<T>(path: string, params?: Record<string, string | number | boolean>): Observable<T> {
    const httpParams = this.buildParams(params);
    return this.http
      .get<T>(`${this.baseUrl}${path}`, { params: httpParams })
      .pipe(
        timeout(this.defaultTimeout),
        catchError((err) => this.handleError(err))
      );
  }

  post<T>(path: string, body: unknown): Observable<T> {
    return this.http
      .post<T>(`${this.baseUrl}${path}`, body)
      .pipe(
        timeout(this.defaultTimeout),
        catchError((err) => this.handleError(err))
      );
  }

  put<T>(path: string, body: unknown): Observable<T> {
    return this.http
      .put<T>(`${this.baseUrl}${path}`, body)
      .pipe(
        timeout(this.defaultTimeout),
        catchError((err) => this.handleError(err))
      );
  }

  patch<T>(path: string, body: unknown): Observable<T> {
    return this.http
      .patch<T>(`${this.baseUrl}${path}`, body)
      .pipe(
        timeout(this.defaultTimeout),
        catchError((err) => this.handleError(err))
      );
  }

  delete<T>(path: string): Observable<T> {
    return this.http
      .delete<T>(`${this.baseUrl}${path}`)
      .pipe(
        timeout(this.defaultTimeout),
        catchError((err) => this.handleError(err))
      );
  }

  private buildParams(params?: Record<string, string | number | boolean>): HttpParams {
    if (!params) return new HttpParams();
    let httpParams = new HttpParams();
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null) {
        httpParams = httpParams.set(key, String(value));
      }
    }
    return httpParams;
  }

  private handleError(error: HttpErrorResponse): Observable<never> {
    let message = 'Ocorreu um erro inesperado. Tente novamente.';

    if (error.error instanceof ErrorEvent) {
      message = `Erro de rede: ${error.error.message}`;
    } else if (error.status === 0) {
      message = 'Servidor indisponível. Verifique sua conexão.';
    } else if (error.error?.message) {
      message = error.error.message;
    } else if (error.error?.error) {
      message = error.error.error;
    } else if (error.message) {
      message = error.message;
    }

    return throwError(() => new Error(message));
  }
}
