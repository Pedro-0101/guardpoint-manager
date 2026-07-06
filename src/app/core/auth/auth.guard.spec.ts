import { TestBed } from '@angular/core/testing';
import { provideRouter, UrlTree } from '@angular/router';
import { Observable, firstValueFrom, of } from 'rxjs';
import { AuthService } from './auth.service';
import { authGuard } from './auth.guard';

describe('authGuard', () => {
  let authServiceMock: {
    ensureAuthenticated: ReturnType<typeof vi.fn>;
    getRefreshToken: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    authServiceMock = { ensureAuthenticated: vi.fn(), getRefreshToken: vi.fn() };

    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: authServiceMock },
        provideRouter([
          { path: 'login', component: {} as never },
          { path: 'dashboard', component: {} as never },
        ]),
      ],
    });
  });

  it('deve permitir acesso quando autenticado', async () => {
    authServiceMock.getRefreshToken.mockReturnValue(null);
    authServiceMock.ensureAuthenticated.mockReturnValue(of(true));

    const result = await firstValueFrom(
      TestBed.runInInjectionContext(() =>
        authGuard({} as never, { url: '/dashboard' } as never),
      ) as Observable<boolean | UrlTree>,
    );

    expect(result).toBe(true);
  });

  it('deve redirecionar para /login com returnUrl quando nunca houve sessão', async () => {
    authServiceMock.getRefreshToken.mockReturnValue(null);
    authServiceMock.ensureAuthenticated.mockReturnValue(of(false));

    const result = await firstValueFrom(
      TestBed.runInInjectionContext(() =>
        authGuard({} as never, { url: '/dashboard' } as never),
      ) as Observable<boolean | UrlTree>,
    );

    expect(result).not.toBe(true);
    expect(result instanceof UrlTree).toBe(true);
    expect((result as UrlTree).toString()).toBe('/login?returnUrl=%2Fdashboard');
  });

  it('deve apenas bloquear a navegação quando a renovação da sessão falhou', async () => {
    authServiceMock.getRefreshToken.mockReturnValue('some-refresh-token');
    authServiceMock.ensureAuthenticated.mockReturnValue(of(false));

    const result = await firstValueFrom(
      TestBed.runInInjectionContext(() =>
        authGuard({} as never, { url: '/dashboard' } as never),
      ) as Observable<boolean | UrlTree>,
    );

    expect(result).toBe(false);
  });
});
