import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import {
  provideHttpClientTesting,
  HttpTestingController,
} from '@angular/common/http/testing';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { SubstituicoesService } from './substituicoes.service';
import {
  Substituicao,
  SubstituicaoDto,
} from '../../core/models/substituicao.model';

describe('SubstituicoesService', () => {
  let service: SubstituicoesService;
  let httpMock: HttpTestingController;
  const baseUrl = environment.apiUrl;

  const mockSubstituicaoDto: SubstituicaoDto = {
    id: '1',
    usuario_id: 'u-1',
    usuario_nome: 'Vigia A',
    posto_id: 'p-1',
    posto_nome: 'Posto A',
    data_inicio: '2026-07-10',
    data_fim: '2026-07-15',
    hora_inicio: '08:00',
    hora_fim: '18:00',
    motivo: 'Cobertura de férias',
    tolerancia_min: 15,
    ativo: true,
    empresa_id: 'e-1',
    created_at: '2026-07-01T00:00:00Z',
    updated_at: '2026-07-01T00:00:00Z',
  };

  const mockSubstituicao: Substituicao = {
    id: '1',
    usuarioId: 'u-1',
    usuarioNome: 'Vigia A',
    postoId: 'p-1',
    postoNome: 'Posto A',
    dataInicio: '2026-07-10',
    dataFim: '2026-07-15',
    horaInicio: '08:00',
    horaFim: '18:00',
    motivo: 'Cobertura de férias',
    toleranciaMin: 15,
    ativo: true,
    empresaId: 'e-1',
    createdAt: '2026-07-01T00:00:00Z',
    updatedAt: '2026-07-01T00:00:00Z',
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        SubstituicoesService,
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    service = TestBed.inject(SubstituicoesService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('deve listar substituicoes com envelope { data, total }', async () => {
    const promise = firstValueFrom(service.listar());
    httpMock
      .expectOne(`${baseUrl}/substituicoes`)
      .flush({ data: [mockSubstituicaoDto], total: 1 });
    expect(await promise).toEqual([mockSubstituicao]);
  });

  it('deve listar substituicoes com resposta em array puro', async () => {
    const promise = firstValueFrom(service.listar());
    httpMock.expectOne(`${baseUrl}/substituicoes`).flush([mockSubstituicaoDto]);
    expect(await promise).toEqual([mockSubstituicao]);
  });

  it('deve normalizar datas ISO e horas HH:MM:SS', async () => {
    const promise = firstValueFrom(service.obter('1'));
    httpMock.expectOne(`${baseUrl}/substituicoes/1`).flush({
      ...mockSubstituicaoDto,
      data_inicio: '2026-07-10T00:00:00Z',
      data_fim: '2026-07-15T00:00:00Z',
      hora_inicio: '08:00:00',
      hora_fim: '18:00:00',
    });
    const result = await promise;
    expect(result.dataInicio).toBe('2026-07-10');
    expect(result.dataFim).toBe('2026-07-15');
    expect(result.horaInicio).toBe('08:00');
    expect(result.horaFim).toBe('18:00');
  });

  it('deve criar substituicao com body snake_case', async () => {
    const payload = {
      data_inicio: '2026-07-10',
      data_fim: '2026-07-15',
      hora_inicio: '08:00',
      hora_fim: '18:00',
      posto_id: 'p-1',
      usuario_id: 'u-1',
      motivo: 'Cobertura de férias',
      tolerancia_min: 15,
    };
    const promise = firstValueFrom(service.criar(payload));
    const req = httpMock.expectOne(`${baseUrl}/substituicoes`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(payload);
    req.flush(mockSubstituicaoDto);
    expect((await promise).id).toBe('1');
  });

  it('deve atualizar substituicao', async () => {
    const promise = firstValueFrom(
      service.atualizar('1', { ativo: false, motivo: 'Ajuste' })
    );
    const req = httpMock.expectOne(`${baseUrl}/substituicoes/1`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ ativo: false, motivo: 'Ajuste' });
    req.flush({ ...mockSubstituicaoDto, ativo: false, motivo: 'Ajuste' });
    const result = await promise;
    expect(result.ativo).toBe(false);
    expect(result.motivo).toBe('Ajuste');
  });

  it('deve excluir substituicao', () => {
    service.excluir('1').subscribe();
    const req = httpMock.expectOne(`${baseUrl}/substituicoes/1`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
  });
});
