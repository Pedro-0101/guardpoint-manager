import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { Subject, of } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { AlertasListComponent } from './alertas-list.component';
import { AlertasService } from '../alertas.service';
import { WebSocketService } from '../../../core/websocket/websocket.service';
import { NotificationService } from '../../../core/services/notification.service';
import { ConfiguracoesService } from '../../configuracoes/configuracoes.service';

describe('AlertasListComponent', () => {
  let fixture: ComponentFixture<AlertasListComponent>;
  let httpMock: HttpTestingController;

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

  beforeEach(async () => {
    const wsSpy = { onEvent: () => new Subject().asObservable() };
    const notificationSpy = { error: vi.fn(), success: vi.fn(), warning: vi.fn() };
    const configSpy = {
      obterEmpresa: () => of({ id: 'e-1', nome: 'Empresa', cnpj: '', ativa: true, alertaSonoro: false, createdAt: '', updatedAt: '' }),
    };

    await TestBed.configureTestingModule({
      imports: [AlertasListComponent],
      providers: [
        AlertasService,
        { provide: WebSocketService, useValue: wsSpy },
        { provide: NotificationService, useValue: notificationSpy },
        { provide: ConfiguracoesService, useValue: configSpy },
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        provideNoopAnimations(),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AlertasListComponent);
    httpMock = TestBed.inject(HttpTestingController);

    const initReq = httpMock.expectOne(`${baseUrl}/alertas?limit=100`);
    initReq.flush({ data: [], total: 0 });
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('deve criar o componente e carregar alertas', () => {
    fixture.detectChanges();

    const req = httpMock.expectOne(`${baseUrl}/alertas?limit=100`);
    req.flush({ data: [mockAlertaDto], total: 1 });

    const statsReq = httpMock.expectOne(`${baseUrl}/alertas/estatisticas`);
    statsReq.flush({ total_abertos: 0, total_reconhecidos: 0, total_encerrados: 0, por_tipo: [], por_hora: [] });

    fixture.detectChanges();
    expect(fixture.componentInstance).toBeTruthy();
  });
});
