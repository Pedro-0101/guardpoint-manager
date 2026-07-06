import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
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
});
