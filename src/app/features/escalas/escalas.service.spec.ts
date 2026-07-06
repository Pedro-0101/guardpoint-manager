import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { EscalasService } from './escalas.service';
import { Escala } from '../../core/models/escala.model';

describe('EscalasService', () => {
  let service: EscalasService;
  let httpMock: HttpTestingController;
  const baseUrl = environment.apiUrl;

  const mockEscala: Escala = {
    id: '1',
    nome: 'Escala A',
    postoId: 'p-1',
    postoNome: 'Posto A',
    vigiaId: 'u-1',
    vigiaNome: 'Vigia',
    diasSemana: [1, 2, 3, 4, 5],
    horaInicio: '08:00',
    horaFim: '18:00',
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
    httpMock.expectOne(`${baseUrl}/escalas`).flush([mockEscala]);
    expect(await promise).toEqual([mockEscala]);
  });

  it('deve obter escala por id', async () => {
    const promise = firstValueFrom(service.obter('1'));
    httpMock.expectOne(`${baseUrl}/escalas/1`).flush(mockEscala);
    const result = await promise;
    expect(result.id).toBe('1');
  });

  it('deve excluir escala', () => {
    service.excluir('1').subscribe();
    const req = httpMock.expectOne(`${baseUrl}/escalas/1`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
  });
});
