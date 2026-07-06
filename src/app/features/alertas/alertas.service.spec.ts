import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { Subject, firstValueFrom, of } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { AlertasService } from './alertas.service';
import { WebSocketService } from '../../core/websocket/websocket.service';
import { NotificationService } from '../../core/services/notification.service';
import { ConfiguracoesService } from '../configuracoes/configuracoes.service';

describe('AlertasService', () => {
  let service: AlertasService;
  let httpMock: HttpTestingController;
  let wsEventSubject: Subject<unknown>;
  let notificationMock: { error: ReturnType<typeof vi.fn>; success: ReturnType<typeof vi.fn>; warning: ReturnType<typeof vi.fn> };

  const baseUrl = environment.apiUrl;

  const mockAlertaDto = {
    id: 'a-1',
    empresa_id: 'e-1',
    turno_id: 't-1',
    tipo: 'atraso_n1',
    nivel: 1,
    status: 'aberto',
    mensagem: 'Atraso detectado',
    resolvido_em: null,
    created_at: '2026-01-01T08:00:00Z',
  };

  beforeEach(() => {
    wsEventSubject = new Subject();
    notificationMock = { error: vi.fn(), success: vi.fn(), warning: vi.fn() };

    const wsSpy = {
      onEvent: (type: string) =>
        wsEventSubject.pipe(
          filter((e: unknown) => (e as { type: string }).type === type),
          map((e: unknown) => (e as { payload: unknown }).payload),
        ),
    };

    const configSpy = {
      obterEmpresa: () => of({ id: 'e-1', nome: 'Empresa', cnpj: '', ativa: true, alertaSonoro: false, createdAt: '', updatedAt: '' }),
    };

    TestBed.configureTestingModule({
      providers: [
        AlertasService,
        { provide: WebSocketService, useValue: wsSpy },
        { provide: NotificationService, useValue: notificationMock },
        { provide: ConfiguracoesService, useValue: configSpy },
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });

    service = TestBed.inject(AlertasService);
    httpMock = TestBed.inject(HttpTestingController);

    const req = httpMock.expectOne(`${baseUrl}/alertas?limit=100`);
    req.flush({ data: [], total: 0 });
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('deve listar alertas e mapear tipos', async () => {
    const promise = firstValueFrom(service.listar());
    httpMock.expectOne(`${baseUrl}/alertas?limit=100`).flush({ data: [mockAlertaDto], total: 1 });

    const alertas = await promise;
    expect(alertas.length).toBe(1);
    expect(alertas[0].tipo).toBe('atraso');
    expect(alertas[0].gravidade).toBe('baixa');
    expect(alertas[0].id).toBe('a-1');
  });

  it('deve normalizar tipo coacao', async () => {
    const coacaoDto = { ...mockAlertaDto, tipo: 'coacao', nivel: 2 };
    const promise = firstValueFrom(service.listar());
    httpMock.expectOne(`${baseUrl}/alertas?limit=100`).flush({ data: [coacaoDto], total: 1 });

    const alertas = await promise;
    expect(alertas[0].tipo).toBe('coacao');
    expect(alertas[0].gravidade).toBe('critica');
  });

  it('deve normalizar no_show como ausencia com gravidade alta', async () => {
    const noShowDto = { ...mockAlertaDto, tipo: 'no_show', nivel: 1 };
    const promise = firstValueFrom(service.listar());
    httpMock.expectOne(`${baseUrl}/alertas?limit=100`).flush({ data: [noShowDto], total: 1 });

    const alertas = await promise;
    expect(alertas[0].tipo).toBe('ausencia');
    expect(alertas[0].gravidade).toBe('alta');
  });

  it('deve emitir alerta de coação via WebSocket', () => {
    wsEventSubject.next({
      type: 'new_alert',
      payload: { alertaId: 'a-new', tipo: 'coacao', turnoId: 't-x', nivel: 1 },
    } as never);

    expect(notificationMock.error).toHaveBeenCalled();
  });
});
