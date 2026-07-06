import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { RelatoriosService } from './relatorios.service';

describe('RelatoriosService', () => {
  let service: RelatoriosService;
  let httpMock: HttpTestingController;
  const baseUrl = environment.apiUrl;

  const mockDto = {
    id: 't-1',
    empresa_id: 'e-1',
    usuario_id: 'u-1',
    posto_id: 'p-1',
    posto_nome: 'Posto A',
    usuario_nome: 'Vigia',
    status: 'finalizado',
    inicio_previsto: '2026-01-01T08:00:00Z',
    fim_previsto: '2026-01-01T18:00:00Z',
    inicio_real: '2026-01-01T08:05:00Z',
    fim_real: '2026-01-01T17:55:00Z',
    intervalo_min: 60,
    created_at: '2026-01-01T00:00:00Z',
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [RelatoriosService, provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(RelatoriosService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  describe('listarHistorico', () => {
    it('deve tratar resposta como array puro', async () => {
      const promise = firstValueFrom(service.listarHistorico({}, { limit: 10, offset: 0 }));
      const req = httpMock.expectOne(
        (r) => r.url === `${baseUrl}/turnos/historico` && r.params.get('limit') === '10',
      );
      req.flush([mockDto]);

      const pagina = await promise;
      expect(pagina.turnos.length).toBe(1);
      expect(pagina.total).toBe(1);
      expect(pagina.turnos[0].postoNome).toBe('Posto A');
    });

    it('deve tratar resposta como objeto { data, total }', async () => {
      const promise = firstValueFrom(service.listarHistorico({}, { limit: 10, offset: 0 }));
      httpMock
        .expectOne((r) => r.url === `${baseUrl}/turnos/historico`)
        .flush({ data: [mockDto], total: 42 });

      const pagina = await promise;
      expect(pagina.turnos.length).toBe(1);
      expect(pagina.total).toBe(42);
    });

    it('deve enviar filtros como query params', async () => {
      const promise = firstValueFrom(
        service.listarHistorico(
          { dataInicio: '2026-01-01', dataFim: '2026-01-31', postoId: 'p-1', usuarioId: 'u-1', status: 'finalizado' },
          { limit: 25, offset: 50 },
        ),
      );

      const req = httpMock.expectOne(
        (r) =>
          r.url === `${baseUrl}/turnos/historico` &&
          r.params.get('data_inicio') === '2026-01-01' &&
          r.params.get('posto_id') === 'p-1',
      );
      req.flush([mockDto]);

      await promise;
    });

    it('deve mapear campos snake_case para camelCase', async () => {
      const promise = firstValueFrom(service.listarHistorico({}, { limit: 10, offset: 0 }));
      httpMock.expectOne(`${baseUrl}/turnos/historico?limit=10&offset=0`).flush([mockDto]);

      const pagina = await promise;
      const turno = pagina.turnos[0];
      expect(turno.empresaId).toBe('e-1');
      expect(turno.inicioPrevisto).toBe('2026-01-01T08:00:00Z');
      expect(turno.intervaloMin).toBe(60);
    });

    it('deve usar vigia_nome como fallback para usuarioNome', async () => {
      const dtoWithVigiaNome = { ...mockDto, usuario_nome: undefined, vigia_nome: 'VigiaB' };
      const promise = firstValueFrom(service.listarHistorico({}, { limit: 10, offset: 0 }));
      httpMock.expectOne(`${baseUrl}/turnos/historico?limit=10&offset=0`).flush([dtoWithVigiaNome]);

      const pagina = await promise;
      expect(pagina.turnos[0].usuarioNome).toBe('VigiaB');
    });
  });
});
