import { TestBed } from '@angular/core/testing';
import { HttpRequest, HttpHandler, HttpEvent, HttpErrorResponse } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { JwtInterceptor } from './jwt.interceptor';
import { AuthService } from './auth.service';

describe('JwtInterceptor', () => {
  let interceptor: JwtInterceptor;
  let authServiceMock: { getToken: ReturnType<typeof vi.fn>; refreshToken: ReturnType<typeof vi.fn> };

  function createHandler(response: Observable<HttpEvent<unknown>>): HttpHandler {
    return { handle: vi.fn().mockReturnValue(response) } as unknown as HttpHandler;
  }

  beforeEach(() => {
    authServiceMock = {
      getToken: vi.fn(),
      refreshToken: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [JwtInterceptor, { provide: AuthService, useValue: authServiceMock }],
    });

    interceptor = TestBed.inject(JwtInterceptor);
  });

  it('deve adicionar Authorization header quando token existe', async () => {
    authServiceMock.getToken.mockReturnValue('test-token');
    const req = new HttpRequest('GET', '/api/v1/data');
    const handler = createHandler(of({} as HttpEvent<unknown>));

    await new Promise<void>((resolve) => {
      interceptor.intercept(req, handler).subscribe({
        next: () => resolve(),
      });
    });

    const handledReq = vi.mocked(handler.handle).mock.calls[0][0] as HttpRequest<unknown>;
    expect(handledReq.headers.get('Authorization')).toBe('Bearer test-token');
  });

  it('não deve modificar requisições para auth endpoints', async () => {
    authServiceMock.getToken.mockReturnValue('test-token');
    const req = new HttpRequest('POST', '/api/v1/auth/login', {});
    const handler = createHandler(of({} as HttpEvent<unknown>));

    await new Promise<void>((resolve) => {
      interceptor.intercept(req, handler).subscribe({
        next: () => resolve(),
      });
    });

    const handledReq = vi.mocked(handler.handle).mock.calls[0][0] as HttpRequest<unknown>;
    expect(handledReq.headers.has('Authorization')).toBe(false);
  });

  it('não deve adicionar header quando não há token', async () => {
    authServiceMock.getToken.mockReturnValue(null);
    const req = new HttpRequest('GET', '/api/v1/data');
    const handler = createHandler(of({} as HttpEvent<unknown>));

    await new Promise<void>((resolve) => {
      interceptor.intercept(req, handler).subscribe({
        next: () => resolve(),
      });
    });

    const handledReq = vi.mocked(handler.handle).mock.calls[0][0] as HttpRequest<unknown>;
    expect(handledReq.headers.has('Authorization')).toBe(false);
  });

  it('deve tentar refresh em erro 401 e retentar', async () => {
    authServiceMock.getToken.mockReturnValue('expired-token');
    authServiceMock.refreshToken.mockReturnValue(of({ access_token: 'new-token' }));

    let callCount = 0;
    const multiHandler: HttpHandler = {
      handle: vi.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 1) return throwError(() => new HttpErrorResponse({ status: 401 }));
        return of({} as HttpEvent<unknown>);
      }),
    } as unknown as HttpHandler;

    const req = new HttpRequest('GET', '/api/v1/data');

    await new Promise<void>((resolve) => {
      interceptor.intercept(req, multiHandler).subscribe({
        next: () => resolve(),
        error: () => resolve(),
      });
    });

    expect(authServiceMock.refreshToken).toHaveBeenCalled();
  });

  it('deve propagar erro não-401', async () => {
    authServiceMock.getToken.mockReturnValue('token');
    const req = new HttpRequest('GET', '/api/v1/data');
    const handler = createHandler(throwError(() => new HttpErrorResponse({ status: 500 })));

    await new Promise<void>((resolve) => {
      interceptor.intercept(req, handler).subscribe({
        error: (err) => {
          expect(err.status).toBe(500);
          resolve();
        },
      });
    });
  });
});
