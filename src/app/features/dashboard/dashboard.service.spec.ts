import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { Subject } from 'rxjs';
import { environment } from '../../../environments/environment';
import { DashboardService } from './dashboard.service';
import { WebSocketService } from '../../core/websocket/websocket.service';
import { DashboardSummary } from './dashboard.types';

describe('DashboardService', () => {
  let service: DashboardService;
  let httpMock: HttpTestingController;
  let wsEventSubject: Subject<unknown>;

  const baseUrl = environment.apiUrl;

  const mockSummary: DashboardSummary = {
    kpis: {
      turnosAtivos: 5,
      alertasAbertos: 3,
      checkinsUltimaHora: 12,
      desviosRota: 1,
    },
    alertasRecentes: [],
    turnosPorPosto: [{ postoNome: 'Posto A', quantidade: 3 }],
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
    req.flush(mockSummary);

    const received = (service as unknown as { summarySubject: { getValue: () => DashboardSummary | null } })
      .summarySubject?.getValue();

    expect(received).toBeTruthy();
    expect(received!.kpis.turnosAtivos).toBe(5);

    const kpi = mockSummary.turnosPorPosto;
    expect(kpi).toHaveLength(1);
  });

  it('deve expor Observables corretamente', () => {
    expect(service.loading$).toBeTruthy();
    expect(service.error$).toBeTruthy();
    expect(service.summary$).toBeTruthy();
  });
});
