import { TestBed } from '@angular/core/testing';
import { provideRouter, UrlTree } from '@angular/router';
import { AuthService } from './auth.service';
import { authGuard } from './auth.guard';

describe('authGuard', () => {
  let authServiceMock: { isAuthenticated: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    authServiceMock = { isAuthenticated: vi.fn() };

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
    authServiceMock.isAuthenticated.mockReturnValue(true);

    const result = await TestBed.runInInjectionContext(() =>
      authGuard({} as never, { url: '/dashboard' } as never),
    );

    expect(result).toBe(true);
  });

  it('deve redirecionar para /login quando não autenticado', async () => {
    authServiceMock.isAuthenticated.mockReturnValue(false);

    const result = await TestBed.runInInjectionContext(() =>
      authGuard({} as never, { url: '/dashboard' } as never),
    );

    expect(result).not.toBe(true);
    expect(result instanceof UrlTree).toBe(true);
    expect((result as UrlTree).toString()).toBe('/login?returnUrl=%2Fdashboard');
  });
});
