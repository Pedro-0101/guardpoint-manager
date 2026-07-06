import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { featureEscalasGuard } from './feature.guard';
import { environment } from '../../../environments/environment';

describe('featureEscalasGuard', () => {
  const originalFeature = environment.featureEscalas;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideRouter([{ path: 'dashboard', component: {} as never }])],
    });
  });

  afterEach(() => {
    environment.featureEscalas = originalFeature;
  });

  it('deve permitir acesso quando feature está habilitada', async () => {
    environment.featureEscalas = true;
    const result = await TestBed.runInInjectionContext(() =>
      featureEscalasGuard({} as never, {} as never),
    );
    expect(result).toBe(true);
  });

  it('deve redirecionar para /dashboard quando feature está desabilitada', async () => {
    environment.featureEscalas = false;
    const result = await TestBed.runInInjectionContext(() =>
      featureEscalasGuard({} as never, {} as never),
    );
    expect(result.toString()).toBe('/dashboard');
  });
});
