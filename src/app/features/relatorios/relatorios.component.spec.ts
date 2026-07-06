import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { of } from 'rxjs';
import { environment } from '../../../environments/environment';
import { RelatoriosComponent } from './relatorios.component';
import { RelatoriosService } from './relatorios.service';
import { AlertasService } from '../alertas/alertas.service';
import { Posto } from '../../core/models/posto.model';
import { Usuario } from '../../core/models/usuario.model';
import { Alerta } from '../../core/models/alerta.model';

describe('RelatoriosComponent', () => {
  let fixture: ComponentFixture<RelatoriosComponent>;
  let httpMock: HttpTestingController;

  const baseUrl = environment.apiUrl;

  const mockPosto: Posto = {
    id: 'p-1',
    nome: 'Posto A',
    latitude: -23.5,
    longitude: -46.6,
    raioM: 100,
    ativo: true,
    empresaId: 'e-1',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  };

  const mockUsuario: Usuario = {
    id: 'u-1',
    nome: 'Vigia Silva',
    email: 'vigia@test.com',
    cargo: 'vigia',
    empresaId: 'e-1',
    ativo: true,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  };

  const mockTurnoDto = {
    id: 't-1',
    empresa_id: 'e-1',
    usuario_id: 'u-1',
    posto_id: 'p-1',
    posto_nome: 'Posto A',
    usuario_nome: 'Vigia Silva',
    status: 'finalizado',
    inicio_previsto: '2026-01-15T08:00:00Z',
    fim_previsto: '2026-01-15T18:00:00Z',
    inicio_real: '2026-01-15T08:05:00Z',
    fim_real: '2026-01-15T17:55:00Z',
    intervalo_min: 60,
    created_at: '2026-01-15T00:00:00Z',
  };

  const mockAlerta: Alerta = {
    id: 'a-1',
    turnoId: 't-1',
    tipo: 'atraso',
    gravidade: 'baixa',
    status: 'aberto',
    mensagem: 'Teste',
    reconhecidoPor: null,
    encerradoPor: null,
    createdAt: '2026-01-01T08:00:00Z',
    updatedAt: '2026-01-01T08:00:00Z',
  };

  beforeEach(async () => {
    const alertasSpy = {
      alertas$: of([mockAlerta]),
      listar: () => of([mockAlerta]),
      reconhecer: () => of({ status: 'reconhecido' }),
      encerrar: () => of({ status: 'encerrado' }),
      listarEstatisticas: () => of({ porTipo: [], porGravidade: [], porStatus: [], porDia: [] }),
      alertasAbertosCount: () => 0,
    };

    await TestBed.configureTestingModule({
      imports: [RelatoriosComponent],
      providers: [
        RelatoriosService,
        { provide: AlertasService, useValue: alertasSpy },
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        provideNoopAnimations(),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(RelatoriosComponent);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('deve criar o componente e carregar dados iniciais', () => {
    fixture.detectChanges();

    const postosReq = httpMock.expectOne(`${baseUrl}/postos`);
    postosReq.flush([mockPosto]);

    const usuariosReq = httpMock.expectOne(`${baseUrl}/usuarios`);
    usuariosReq.flush([mockUsuario]);

    const historicoReq = httpMock.expectOne(
      (r) => r.url === `${baseUrl}/turnos/historico`,
    );
    historicoReq.flush([mockTurnoDto]);

    fixture.detectChanges();

    expect(fixture.componentInstance.postos()).toEqual([mockPosto]);
    expect(fixture.componentInstance.usuarios()).toEqual([mockUsuario]);
    expect(fixture.componentInstance.dataSource()).toHaveLength(1);
    expect(fixture.componentInstance.total()).toBe(1);
  });

  it('deve limpar filtros', () => {
    fixture.detectChanges();

    const postosReq = httpMock.expectOne(`${baseUrl}/postos`);
    postosReq.flush([mockPosto]);
    const usuariosReq = httpMock.expectOne(`${baseUrl}/usuarios`);
    usuariosReq.flush([mockUsuario]);
    const historicoReq = httpMock.expectOne(`${baseUrl}/turnos/historico?limit=10&offset=0`);
    historicoReq.flush([mockTurnoDto]);

    fixture.componentInstance.dataInicioControl.setValue('2026-01-01');
    fixture.componentInstance.postoControl.setValue('p-1');

    fixture.componentInstance.limparFiltros();

    const req = httpMock.expectOne(`${baseUrl}/turnos/historico?limit=10&offset=0`);
    req.flush([mockTurnoDto]);

    expect(fixture.componentInstance.dataInicioControl.value).toBe('');
    expect(fixture.componentInstance.postoControl.value).toBe('');
    expect(fixture.componentInstance.pageIndex()).toBe(0);
  });

  it('deve formatar data corretamente', () => {
    fixture.detectChanges();

    const postosReq = httpMock.expectOne(`${baseUrl}/postos`);
    postosReq.flush([mockPosto]);
    const usuariosReq = httpMock.expectOne(`${baseUrl}/usuarios`);
    usuariosReq.flush([mockUsuario]);
    const historicoReq = httpMock.expectOne(`${baseUrl}/turnos/historico?limit=10&offset=0`);
    historicoReq.flush([mockTurnoDto]);

    const formatted = fixture.componentInstance.formatarData('2026-01-15T08:00:00Z');
    expect(formatted).toContain('15');
    expect(formatted).toContain('01');
    expect(formatted).toContain('2026');
  });
});
