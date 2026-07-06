import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { firstValueFrom } from 'rxjs';
import { Subject } from 'rxjs';
import { environment } from '../../../environments/environment';
import { TurnosService } from './turnos.service';
import { WebSocketService } from '../../core/websocket/websocket.service';

describe('TurnosService', () => {
  let service: TurnosService;
  let httpMock: HttpTestingController;
  let wsEventSubject: Subject<unknown>;

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

  beforeEach(() => {
    wsEventSubject = new Subject();
    const wsSpy = {
      onEvent: () => wsEventSubject.asObservable(),
    };

    TestBed.configureTestingModule({
      providers: [
        TurnosService,
        { provide: WebSocketService, useValue: wsSpy },
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });

    service = TestBed.inject(TurnosService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('deve listar turnos ativos e popular o BehaviorSubject', async () => {
    const promise = firstValueFrom(service.listar());
    httpMock.expectOne(`${baseUrl}/turnos/ativos`).flush([mockTurnoDto]);

    const turnos = await promise;
    expect(turnos.length).toBe(1);
    expect(turnos[0].id).toBe('t-1');
    expect(turnos[0].postoNome).toBe('Posto A');
  });

  it('deve atualizar status via WebSocket', async () => {
    const promise = firstValueFrom(service.listar());
    httpMock.expectOne(`${baseUrl}/turnos/ativos`).flush([mockTurnoDto]);
    await promise;

    wsEventSubject.next({
      type: 'status_change',
      payload: { turnoId: 't-1', status: 'pausado' },
    });

    const turnos = await firstValueFrom(service.turnosAtivos$);
    expect(turnos[0].status).toBe('pausado');
  });
});
