import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { Subject } from 'rxjs';
import { environment } from '../../../environments/environment';
import { DashboardService } from './dashboard.service';
import { WebSocketService } from '../../core/websocket/websocket.service';
import { DashboardSummaryDto } from './dashboard.types';

describe('DashboardService', () => {
  let service: DashboardService;
  let httpMock: HttpTestingController;
  let wsEventSubject: Subject<unknown>;

  const baseUrl = environment.apiUrl;

  const mockSummaryDto: DashboardSummaryDto = {
    turnos_ativos: 5,
    alertas_abertos: 3,
    checkins_ultima_hora: 12,
    desvios_rota: 1,
    alertas_recentes: [],
    turnos_por_posto: [{ posto_id: '1', posto_nome: 'Posto A', quantidade: 3 }],
  };

  beforeEach(() => {
    wsEventSubject = new Subject();
    const wsSpy = { onEvent: () => wsEventSubject.asObservable() };

    TestBed.configureTestingModule({
      providers: [
        DashboardService,
        { provide: WebSocketService, useValue: wsSpy },
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });

    service = TestBed.inject(DashboardService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('deve carregar summary ao iniciar polling', () => {
    service.startPolling();

    const req = httpMock.expectOne(`${baseUrl}/dashboard/summary`);
    req.flush(mockSummaryDto);

    service.summary$.subscribe((received) => {
      expect(received).toBeTruthy();
      expect(received!.kpis.turnosAtivos).toBe(5);
      expect(received!.turnosPorPosto).toHaveLength(1);
      expect(received!.turnosPorPosto[0].postoNome).toBe('Posto A');
    });
  });

  it('deve expor Observables corretamente', () => {
    expect(service.loading$).toBeTruthy();
    expect(service.error$).toBeTruthy();
    expect(service.summary$).toBeTruthy();
  });
});
