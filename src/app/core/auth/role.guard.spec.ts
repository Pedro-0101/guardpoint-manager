import { TestBed } from '@angular/core/testing';
import { provideRouter, UrlTree } from '@angular/router';
import { AuthService } from './auth.service';
import { roleGuard } from './role.guard';

describe('roleGuard', () => {
  let authServiceData: { role: string | null };

  beforeEach(() => {
    authServiceData = { role: null };

    const authSpy = {
      userRole: () => authServiceData.role,
    };

    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: authSpy },
        provideRouter([{ path: 'dashboard', component: {} as never }]),
      ],
    });
  });

  it('deve permitir acesso quando role está na lista', async () => {
    authServiceData.role = 'admin';

    const guard = roleGuard(['admin', 'supervisor']);
    const result = await TestBed.runInInjectionContext(() => guard({} as never, {} as never));

    expect(result).toBe(true);
  });

  it('deve redirecionar para /dashboard quando role não está na lista', async () => {
    authServiceData.role = 'vigia';

    const guard = roleGuard(['admin']);
    const result = await TestBed.runInInjectionContext(() => guard({} as never, {} as never));

    expect(result).not.toBe(true);
    expect(result instanceof UrlTree).toBe(true);
    expect((result as UrlTree).toString()).toBe('/dashboard');
  });

  it('deve redirecionar para /dashboard quando usuário não tem role', async () => {
    authServiceData.role = null;

    const guard = roleGuard(['admin']);
    const result = await TestBed.runInInjectionContext(() => guard({} as never, {} as never));

    expect(result).not.toBe(true);
    expect(result instanceof UrlTree).toBe(true);
  });
});
