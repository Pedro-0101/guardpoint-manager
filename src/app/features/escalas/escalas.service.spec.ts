import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { EscalasService } from './escalas.service';
import { Escala, EscalaDto } from '../../core/models/escala.model';

describe('EscalasService', () => {
  let service: EscalasService;
  let httpMock: HttpTestingController;
  const baseUrl = environment.apiUrl;

  const mockEscalaDto: EscalaDto = {
    id: '1',
    nome: 'Escala A',
    posto_id: 'p-1',
    posto_nome: 'Posto A',
    usuario_id: 'u-1',
    usuario_nome: 'Usuário A',
    dias_semana: [1, 2, 3, 4, 5],
    hora_inicio: '08:00',
    hora_fim: '18:00',
    data_inicio: '2026-01-01',
    data_fim: '2026-06-30',
    tolerancia_min: 15,
    ativo: true,
    empresa_id: 'e-1',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  };

  const mockEscala: Escala = {
    id: '1',
    nome: 'Escala A',
    postoId: 'p-1',
    postoNome: 'Posto A',
    usuarioId: 'u-1',
    usuarioNome: 'Usuário A',
    diasSemana: [1, 2, 3, 4, 5],
    horaInicio: '08:00',
    horaFim: '18:00',
    dataInicio: '2026-01-01',
    dataFim: '2026-06-30',
    toleranciaMin: 15,
    ativo: true,
    empresaId: 'e-1',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [EscalasService, provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(EscalasService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('deve listar escalas', async () => {
    const promise = firstValueFrom(service.listar());
    httpMock.expectOne(`${baseUrl}/escalas`).flush({ data: [mockEscalaDto], total: 1 });
    expect(await promise).toEqual([mockEscala]);
  });

  it('deve obter escala por id', async () => {
    const promise = firstValueFrom(service.obter('1'));
    httpMock.expectOne(`${baseUrl}/escalas/1`).flush(mockEscalaDto);
    const result = await promise;
    expect(result.id).toBe('1');
    expect(result.usuarioId).toBe('u-1');
    expect(result.dataInicio).toBe('2026-01-01');
  });

  it('deve excluir escala', () => {
    service.excluir('1').subscribe();
    const req = httpMock.expectOne(`${baseUrl}/escalas/1`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
  });

  it('deve criar escala', async () => {
    const payload = {
      nome: 'Escala B',
      posto_id: 'p-2',
      usuario_id: 'u-2',
      dias_semana: [0, 6],
      hora_inicio: '08:00',
      hora_fim: '18:00',
      data_inicio: '2026-07-01',
      data_fim: '2026-12-31',
      tolerancia_min: 10,
    };
    const promise = firstValueFrom(service.criar(payload));
    httpMock.expectOne(`${baseUrl}/escalas`).flush({
      ...mockEscalaDto,
      id: '2',
      nome: 'Escala B',
    });
    const result = await promise;
    expect(result.id).toBe('2');
    expect(result.nome).toBe('Escala B');
  });
});
