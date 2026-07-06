import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { Subject } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { TurnosListComponent } from './turnos-list.component';
import { TurnosService } from '../turnos.service';
import { WebSocketService } from '../../../core/websocket/websocket.service';

describe('TurnosListComponent', () => {
  let fixture: ComponentFixture<TurnosListComponent>;
  let httpMock: HttpTestingController;

  const baseUrl = environment.apiUrl;

  const mockTurnoDto = {
    id: 't-1',
    empresa_id: 'e-1',
    usuario_id: 'u-1',
    posto_id: 'p-1',
    posto_nome: 'Posto A',
    status: 'em_andamento',
    inicio_previsto: '2026-01-01T08:00:00Z',
    fim_previsto: '2026-01-01T18:00:00Z',
    inicio_real: '2026-01-01T08:05:00Z',
    fim_real: null,
    intervalo_min: 60,
    created_at: '2026-01-01T00:00:00Z',
  };

  beforeEach(async () => {
    const wsSpy = { onEvent: () => new Subject().asObservable() };

    await TestBed.configureTestingModule({
      imports: [TurnosListComponent],
      providers: [
        TurnosService,
        { provide: WebSocketService, useValue: wsSpy },
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        provideNoopAnimations(),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(TurnosListComponent);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('deve criar o componente e carregar turnos', () => {
    fixture.detectChanges();

    const req = httpMock.expectOne(`${baseUrl}/turnos/ativos`);
    req.flush([mockTurnoDto]);

    fixture.detectChanges();
    expect(fixture.componentInstance).toBeTruthy();
  });
});
