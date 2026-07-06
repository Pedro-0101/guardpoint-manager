import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideRouter, Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AuthService } from './auth.service';
import { AuthResponse, AuthUser } from './auth.model';
import { environment } from '../../../environments/environment';

describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;
  const baseUrl = environment.apiUrl;

  const mockUser: AuthUser = {
    id: 'user-1',
    nome: 'Admin',
    email: 'admin@test.com',
    cargo: 'admin',
    empresaId: 'emp-1',
  };

  const mockResponse: AuthResponse = {
    access_token: 'access-token-123',
    refresh_token: 'refresh-token-456',
    expires_in: 3600,
    usuario: mockUser,
  };

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    TestBed.configureTestingModule({
      providers: [AuthService, provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
    sessionStorage.clear();
    vi.useRealTimers();
  });

  describe('login', () => {
    it('deve autenticar e armazenar token', async () => {
      const promise = firstValueFrom(service.login({ email: 'admin@test.com', senha: '123456' }, true));
      const req = httpMock.expectOne(`${baseUrl}/auth/login`);
      expect(req.request.method).toBe('POST');
      req.flush(mockResponse);
      const resp = await promise;
      expect(resp.access_token).toBe('access-token-123');
      expect(service.isAuthenticated()).toBe(true);
      expect(service.userRole()).toBe('admin');
    });

    it('deve armazenar em sessionStorage quando rememberMe é false', async () => {
      service.login({ email: 'admin@test.com', senha: '123456' }, false).subscribe();
      const req = httpMock.expectOne(`${baseUrl}/auth/login`);
      req.flush(mockResponse);
      expect(sessionStorage.getItem('access_token')).toBe('access-token-123');
    });

    it('deve armazenar em localStorage quando rememberMe é true', async () => {
      service.login({ email: 'admin@test.com', senha: '123456' }, true).subscribe();
      const req = httpMock.expectOne(`${baseUrl}/auth/login`);
      req.flush(mockResponse);
      expect(localStorage.getItem('access_token')).toBe('access-token-123');
    });
  });

  describe('isAuthenticated', () => {
    it('deve retornar false sem token', () => {
      expect(service.isAuthenticated()).toBe(false);
    });
  });

  describe('getToken', () => {
    it('deve retornar token do sessionStorage ou localStorage', () => {
      sessionStorage.setItem('access_token', 'session-token');
      expect(service.getToken()).toBe('session-token');

      sessionStorage.clear();
      localStorage.setItem('access_token', 'local-token');
      expect(service.getToken()).toBe('local-token');
    });
  });

  describe('refreshToken', () => {
    it('deve atualizar o usuário autenticado após renovar o token', async () => {
      localStorage.setItem('refresh_token', 'refresh-token-456');

      const promise = firstValueFrom(service.refreshToken());
      const req = httpMock.expectOne(`${baseUrl}/auth/refresh`);
      req.flush(mockResponse);
      await promise;

      expect(service.isAuthenticated()).toBe(true);
      expect(service.userRole()).toBe('admin');
    });
  });

  describe('ensureAuthenticated', () => {
    it('retorna true sem chamada HTTP quando já autenticado', async () => {
      service.login({ email: 'admin@test.com', senha: '123456' }, true).subscribe();
      httpMock.expectOne(`${baseUrl}/auth/login`).flush(mockResponse);

      const result = await firstValueFrom(service.ensureAuthenticated());
      expect(result).toBe(true);
    });

    it('retorna false sem chamada HTTP quando não há refresh token', async () => {
      const result = await firstValueFrom(service.ensureAuthenticated());
      expect(result).toBe(false);
    });

    it('tenta renovar e retorna true quando há refresh token válido', async () => {
      localStorage.setItem('refresh_token', 'refresh-token-456');

      const promise = firstValueFrom(service.ensureAuthenticated());
      const req = httpMock.expectOne(`${baseUrl}/auth/refresh`);
      req.flush(mockResponse);

      expect(await promise).toBe(true);
    });

    it('retorna false quando a renovação falha', async () => {
      const router = TestBed.inject(Router);
      vi.spyOn(router, 'navigate').mockResolvedValue(true);
      localStorage.setItem('refresh_token', 'refresh-token-456');

      const promise = firstValueFrom(service.ensureAuthenticated());
      const req = httpMock.expectOne(`${baseUrl}/auth/refresh`);
      req.flush({ message: 'invalid' }, { status: 401, statusText: 'Unauthorized' });

      expect(await promise).toBe(false);
      httpMock.expectOne(`${baseUrl}/auth/logout`).flush({});
    });
  });

  describe('logout', () => {
    it('não deve incluir "expired" quando o motivo é o padrão (usuário)', () => {
      const router = TestBed.inject(Router);
      const navigateSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);

      service.logout();
      httpMock.expectOne(`${baseUrl}/auth/logout`).flush({});

      expect(navigateSpy).toHaveBeenCalledWith(['/login'], {});
    });

    it('deve incluir "expired=true" quando o motivo é sessão expirada', () => {
      const router = TestBed.inject(Router);
      const navigateSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);

      service.logout('expired');
      httpMock.expectOne(`${baseUrl}/auth/logout`).flush({});

      expect(navigateSpy).toHaveBeenCalledWith(['/login'], { queryParams: { expired: 'true' } });
    });
  });

  describe('renovação proativa em background', () => {
    it('renova o token antes de expirar, sem esperar por um 401', () => {
      vi.useFakeTimers();

      service.login({ email: 'admin@test.com', senha: '123456' }, true).subscribe();
      httpMock.expectOne(`${baseUrl}/auth/login`).flush(mockResponse);

      vi.advanceTimersByTime(3600 * 0.8 * 1000);

      const refreshReq = httpMock.expectOne(`${baseUrl}/auth/refresh`);
      expect(refreshReq.request.body).toEqual({ refresh_token: 'refresh-token-456' });
      refreshReq.flush(mockResponse);
    });

    it('não agenda renovação quando expires_in é ausente ou zero', () => {
      vi.useFakeTimers();

      service.login({ email: 'admin@test.com', senha: '123456' }, true).subscribe();
      httpMock.expectOne(`${baseUrl}/auth/login`).flush({ ...mockResponse, expires_in: 0 });

      vi.advanceTimersByTime(24 * 60 * 60 * 1000);
      httpMock.expectNone(`${baseUrl}/auth/refresh`);
    });

    it('cancela o timer de renovação após logout', () => {
      vi.useFakeTimers();
      const router = TestBed.inject(Router);
      vi.spyOn(router, 'navigate').mockResolvedValue(true);

      service.login({ email: 'admin@test.com', senha: '123456' }, true).subscribe();
      httpMock.expectOne(`${baseUrl}/auth/login`).flush(mockResponse);

      service.logout();
      httpMock.expectOne(`${baseUrl}/auth/logout`).flush({});

      vi.advanceTimersByTime(3600 * 1000);
      httpMock.expectNone(`${baseUrl}/auth/refresh`);
    });
  });
});

describe('AuthService - restauração de sessão no cold-start', () => {
  const baseUrl = environment.apiUrl;

  const mockUser: AuthUser = {
    id: 'user-1',
    nome: 'Admin',
    email: 'admin@test.com',
    cargo: 'admin',
    empresaId: 'emp-1',
  };

  const mockResponse: AuthResponse = {
    access_token: 'new-access-token',
    refresh_token: 'new-refresh-token',
    expires_in: 3600,
    usuario: mockUser,
  };

  function makeExpiredToken(): string {
    const payload = {
      sub: 'user-1',
      email: 'admin@test.com',
      nome: 'Admin',
      role: 'admin',
      empresa_id: 'emp-1',
      exp: Math.floor(Date.now() / 1000) - 100,
      iat: Math.floor(Date.now() / 1000) - 5000,
    };
    return `header.${btoa(JSON.stringify(payload))}.signature`;
  }

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    TestBed.configureTestingModule({
      providers: [AuthService, provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
  });

  afterEach(() => {
    TestBed.inject(HttpTestingController).verify();
    localStorage.clear();
    sessionStorage.clear();
  });

  it('renova silenciosamente quando o access token expirou mas o refresh token ainda é válido', async () => {
    localStorage.setItem('access_token', makeExpiredToken());
    localStorage.setItem('refresh_token', 'refresh-token-456');
    localStorage.setItem('remember_me', 'true');

    const restoredService = TestBed.inject(AuthService);
    const httpMock = TestBed.inject(HttpTestingController);

    expect(restoredService.isAuthenticated()).toBe(false);

    const promise = firstValueFrom(restoredService.ensureAuthenticated());
    const req = httpMock.expectOne(`${baseUrl}/auth/refresh`);
    req.flush(mockResponse);

    expect(await promise).toBe(true);
    expect(restoredService.isAuthenticated()).toBe(true);
    expect(localStorage.getItem('access_token')).toBe('new-access-token');
  });

  it('não autentica quando não há refresh token disponível', async () => {
    localStorage.setItem('access_token', makeExpiredToken());

    const restoredService = TestBed.inject(AuthService);

    expect(restoredService.isAuthenticated()).toBe(false);
    expect(await firstValueFrom(restoredService.ensureAuthenticated())).toBe(false);
  });
});
