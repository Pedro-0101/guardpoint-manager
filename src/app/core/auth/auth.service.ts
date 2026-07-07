import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, Subject, of, tap, map, catchError, throwError, finalize } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthResponse, AuthUser, JwtPayload, LoginRequest, RegisterRequest, LogoutReason } from './auth.model';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);

  private readonly userSignal = signal<AuthUser | null>(null);
  private isRefreshing = false;
  private readonly refreshTokenSubject = new Subject<string | null>();
  private refreshTimerId: ReturnType<typeof setTimeout> | null = null;

  readonly user = this.userSignal.asReadonly();
  readonly isAuthenticated = computed(() => !!this.userSignal());
  readonly userRole = computed(() => this.userSignal()?.cargo ?? null);
  readonly userName = computed(() => this.userSignal()?.nome ?? '');
  readonly empresaId = computed(() => this.userSignal()?.empresaId ?? '');

  private readonly TOKEN_KEY = 'access_token';
  private readonly REFRESH_KEY = 'refresh_token';
  private readonly REMEMBER_KEY = 'remember_me';
  private readonly PROACTIVE_REFRESH_RATIO = 0.8;
  private readonly PROACTIVE_REFRESH_MIN_DELAY_SECONDS = 5;

  constructor() {
    this.restoreSession();
  }

  private restoreSession(): void {
    const token = this.getToken();
    if (token && !this.isTokenExpired(token)) {
      const payload = this.parsePayload(token);
      if (payload) {
        this.userSignal.set(this.mapPayloadToUser(payload));
        const remainingSeconds = payload.exp - Math.floor(Date.now() / 1000);
        this.scheduleProactiveRefresh(remainingSeconds);
      }
    }
  }

  login(credentials: LoginRequest, rememberMe: boolean): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${environment.apiUrl}/auth/login`, credentials).pipe(
      tap((response) => this.handleAuthResponse(response, rememberMe)),
      catchError((err) => throwError(() => err)),
    );
  }

  register(data: RegisterRequest): Observable<AuthUser> {
    return this.http.post<AuthUser>(`${environment.apiUrl}/auth/register`, data);
  }

  logout(reason: LogoutReason = 'user'): void {
    this.clearProactiveRefresh();
    this.clearTokens();
    this.userSignal.set(null);
    const queryParams = reason === 'expired' ? { expired: 'true' } : undefined;
    this.router.navigate(['/login'], queryParams ? { queryParams } : {});
    this.http.post(`${environment.apiUrl}/auth/logout`, {}).subscribe();
  }

  ensureAuthenticated(): Observable<boolean> {
    if (this.isAuthenticated()) {
      return of(true);
    }
    if (!this.getRefreshToken()) {
      return of(false);
    }
    return this.refreshToken().pipe(
      map(() => true),
      catchError(() => of(false)),
    );
  }

  refreshToken(): Observable<AuthResponse> {
    if (this.isRefreshing) {
      return new Observable((observer) => {
        const sub = this.refreshTokenSubject.subscribe((newToken) => {
          if (newToken) {
            observer.next({
              access_token: newToken,
              refresh_token: this.getRefreshToken() ?? '',
              expires_in: 0,
              usuario: this.userSignal()!,
            });
          } else {
            observer.error(new Error('Token refresh failed'));
          }
          observer.complete();
        });
        return () => sub.unsubscribe();
      });
    }

    this.isRefreshing = true;
    const refreshTokenValue = this.getRefreshToken();

    if (!refreshTokenValue) {
      this.refreshTokenSubject.next(null);
      this.isRefreshing = false;
      this.logout('expired');
      return throwError(() => new Error('No refresh token available'));
    }

    return this.http
      .post<AuthResponse>(`${environment.apiUrl}/auth/refresh`, {
        refresh_token: refreshTokenValue,
      })
      .pipe(
        tap((response) => {
          this.handleTokens(response, this.isRememberMe());
          this.setUserFromResponse(response);
          this.refreshTokenSubject.next(response.access_token);
        }),
        catchError((err) => {
          this.refreshTokenSubject.next(null);
          this.logout('expired');
          return throwError(() => err);
        }),
        finalize(() => {
          this.isRefreshing = false;
        }),
      );
  }

  getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY) ?? sessionStorage.getItem(this.TOKEN_KEY);
  }

  getRefreshToken(): string | null {
    return localStorage.getItem(this.REFRESH_KEY) ?? sessionStorage.getItem(this.REFRESH_KEY);
  }

  private handleAuthResponse(response: AuthResponse, rememberMe: boolean): void {
    this.handleTokens(response, rememberMe);
    this.setUserFromResponse(response);
  }

  private setUserFromResponse(response: AuthResponse): void {
    const raw = response.usuario as unknown as Record<string, unknown>;
    const user: AuthUser = {
      id: raw['id'] as string,
      nome: raw['nome'] as string,
      email: raw['email'] as string,
      cargo: (raw['role'] ?? raw['cargo']) as AuthUser['cargo'],
      empresaId: (raw['empresa_id'] ?? raw['empresaId']) as string,
    };
    this.userSignal.set(user);
  }

  private handleTokens(response: AuthResponse, rememberMe: boolean): void {
    const storage = rememberMe ? localStorage : sessionStorage;
    storage.setItem(this.TOKEN_KEY, response.access_token);
    storage.setItem(this.REFRESH_KEY, response.refresh_token);
    if (rememberMe) {
      localStorage.setItem(this.REMEMBER_KEY, 'true');
    } else {
      localStorage.removeItem(this.REMEMBER_KEY);
    }
    this.scheduleProactiveRefresh(response.expires_in);
  }

  private isRememberMe(): boolean {
    return localStorage.getItem(this.REMEMBER_KEY) === 'true';
  }

  private clearTokens(): void {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.REFRESH_KEY);
    localStorage.removeItem(this.REMEMBER_KEY);
    sessionStorage.removeItem(this.TOKEN_KEY);
    sessionStorage.removeItem(this.REFRESH_KEY);
  }

  private scheduleProactiveRefresh(expiresInSeconds: number): void {
    this.clearProactiveRefresh();
    if (!expiresInSeconds || expiresInSeconds <= 0) {
      return;
    }
    const delaySeconds = Math.max(
      expiresInSeconds * this.PROACTIVE_REFRESH_RATIO,
      this.PROACTIVE_REFRESH_MIN_DELAY_SECONDS,
    );
    this.refreshTimerId = setTimeout(() => {
      this.refreshToken().subscribe({ error: () => {} });
    }, delaySeconds * 1000);
  }

  private clearProactiveRefresh(): void {
    if (this.refreshTimerId !== null) {
      clearTimeout(this.refreshTimerId);
      this.refreshTimerId = null;
    }
  }

  private parsePayload(token: string): JwtPayload | null {
    try {
      return JSON.parse(atob(token.split('.')[1]));
    } catch {
      return null;
    }
  }

  private isTokenExpired(token: string): boolean {
    const payload = this.parsePayload(token);
    if (!payload) {
      return true;
    }
    return payload.exp * 1000 < Date.now();
  }

  private mapPayloadToUser(payload: JwtPayload): AuthUser {
    return {
      id: payload.sub,
      nome: payload.nome,
      email: payload.email,
      cargo: payload.role as AuthUser['cargo'],
      empresaId: payload.empresa_id,
    };
  }
}
