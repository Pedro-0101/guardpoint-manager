import { TestBed } from '@angular/core/testing';
import { TenantService } from './tenant.service';
import { AuthService } from '../auth/auth.service';
import { signal } from '@angular/core';

describe('TenantService', () => {
  let service: TenantService;

  beforeEach(() => {
    const authSpy = {
      empresaId: signal('emp-test'),
    };

    TestBed.configureTestingModule({
      providers: [TenantService, { provide: AuthService, useValue: authSpy }],
    });

    service = TestBed.inject(TenantService);
  });

  it('deve expor empresaId do AuthService', () => {
    expect(service.empresaId()).toBe('emp-test');
  });
});
