import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { PostosService } from './postos.service';
import { Posto } from '../../core/models/posto.model';

describe('PostosService', () => {
  let service: PostosService;
  let httpMock: HttpTestingController;
  const baseUrl = environment.apiUrl;

  // A API responde em snake_case; o service mapeia para o modelo camelCase.
  const mockPostoDto = {
    id: '1',
    nome: 'Posto A',
    latitude: -23.5,
    longitude: -46.6,
    raio_m: 100,
    ativo: true,
    empresa_id: 'emp-1',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  };

  const mockPosto: Posto = {
    id: '1',
    nome: 'Posto A',
    latitude: -23.5,
    longitude: -46.6,
    raioM: 100,
    ativo: true,
    empresaId: 'emp-1',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [PostosService, provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(PostosService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('deve listar postos', async () => {
    const promise = firstValueFrom(service.listar());
    httpMock.expectOne(`${baseUrl}/postos`).flush([mockPostoDto]);
    expect(await promise).toEqual([mockPosto]);
  });

  it('deve obter posto por id', async () => {
    const promise = firstValueFrom(service.obter('1'));
    httpMock.expectOne(`${baseUrl}/postos/1`).flush(mockPostoDto);
    expect(await promise).toEqual(mockPosto);
  });

  it('deve criar posto', async () => {
    const data = { nome: 'Novo Posto', latitude: 0, longitude: 0, raioM: 50, ativo: true };
    const promise = firstValueFrom(service.criar(data));
    const req = httpMock.expectOne(`${baseUrl}/postos`);
    expect(req.request.method).toBe('POST');
    req.flush({ ...mockPostoDto, id: '2', nome: 'Novo Posto' });
    const result = await promise;
    expect(result.id).toBe('2');
  });

  it('deve inativar posto', () => {
    service.inativar('1').subscribe();
    const req = httpMock.expectOne(`${baseUrl}/postos/1`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
  });
});
