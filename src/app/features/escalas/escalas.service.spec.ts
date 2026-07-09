import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import {
  provideHttpClientTesting,
  HttpTestingController,
} from '@angular/common/http/testing';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { EscalasService } from './escalas.service';
import { Escala, EscalaDto, CreateEscalaLoteResponse } from '../../core/models/escala.model';

describe('EscalasService', () => {
  let service: EscalasService;
  let httpMock: HttpTestingController;
  const baseUrl = environment.apiUrl;

  const mockEscalaDto: EscalaDto = {
    id: '1',
    posto_id: 'p-1',
    posto_nome: 'Posto A',
    usuario_id: 'u-1',
    usuario_nome: 'Vigia A',
    dia_semana_inicio: 1,
    dia_semana_fim: 5,
    hora_inicio: '08:00',
    hora_fim: '18:00',
    tolerancia_min: 15,
    ativo: true,
    empresa_id: 'e-1',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  };

  const mockEscala: Escala = {
    id: '1',
    postoId: 'p-1',
    postoNome: 'Posto A',
    usuarioId: 'u-1',
    usuarioNome: 'Vigia A',
    diaSemanaInicio: 1,
    diaSemanaFim: 5,
    horaInicio: '08:00',
    horaFim: '18:00',
    toleranciaMin: 15,
    ativo: true,
    empresaId: 'e-1',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        EscalasService,
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    service = TestBed.inject(EscalasService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('deve listar escalas', async () => {
    const promise = firstValueFrom(service.listar());
    httpMock
      .expectOne(`${baseUrl}/escalas`)
      .flush({ data: [mockEscalaDto], total: 1 });
    expect(await promise).toEqual([mockEscala]);
  });

  it('deve obter escala por id', async () => {
    const promise = firstValueFrom(service.obter('1'));
    httpMock.expectOne(`${baseUrl}/escalas/1`).flush(mockEscalaDto);
    const result = await promise;
    expect(result.id).toBe('1');
    expect(result.usuarioId).toBe('u-1');
    expect(result.diaSemanaInicio).toBe(1);
  });

  it('deve excluir escala', () => {
    service.excluir('1').subscribe();
    const req = httpMock.expectOne(`${baseUrl}/escalas/1`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
  });

  it('deve criar escala', async () => {
    const payload = {
      posto_id: 'p-2',
      usuario_id: 'u-2',
      dia_semana_inicio: 0,
      dia_semana_fim: 6,
      hora_inicio: '08:00',
      hora_fim: '18:00',
      tolerancia_min: 10,
    };
    const promise = firstValueFrom(service.criar(payload));
    httpMock.expectOne(`${baseUrl}/escalas`).flush({
      ...mockEscalaDto,
      id: '2',
    });
    const result = await promise;
    expect(result.id).toBe('2');
    expect(result.diaSemanaFim).toBe(5);
  });

  it('deve criar escalas em lote', async () => {
    const payload = {
      posto_id: 'p-1',
      usuario_id: 'u-1',
      tolerancia_min: 15,
      dias: [
        {
          dia_semana_inicio: 1,
          dia_semana_fim: 1,
          hora_inicio: '08:00',
          hora_fim: '12:00',
        },
        {
          dia_semana_inicio: 2,
          dia_semana_fim: 2,
          hora_inicio: '14:00',
          hora_fim: '18:00',
        },
      ],
    };
    const mockResponse: CreateEscalaLoteResponse = {
      usuario_id: 'u-1',
      posto_id: 'p-1',
      tolerancia_min: 15,
      dias: payload.dias,
    };
    const promise = firstValueFrom(service.criarLote(payload));
    httpMock
      .expectOne(`${baseUrl}/escalas/lote`)
      .flush(mockResponse);
    const result = await promise;
    expect(result.usuario_id).toBe('u-1');
    expect(result.dias).toHaveLength(2);
  });
});
