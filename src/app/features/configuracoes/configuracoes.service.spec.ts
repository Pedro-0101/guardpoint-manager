import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ConfiguracoesService } from './configuracoes.service';

describe('ConfiguracoesService', () => {
  let service: ConfiguracoesService;
  let httpMock: HttpTestingController;
  const baseUrl = environment.apiUrl;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [ConfiguracoesService, provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(ConfiguracoesService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('deve listar níveis de escalonamento com mapeamento', async () => {
    const mockDto = {
      id: 'n-1',
      empresa_id: 'e-1',
      nivel: 1,
      atraso_minutos: 10,
      cargo_alvo: 'supervisor',
      whatsapp_para: '+5511999999999',
      created_at: '2026-01-01T00:00:00Z',
    };

    const promise = firstValueFrom(service.listarNiveisEscalonamento());
    httpMock.expectOne(`${baseUrl}/config/escalonamento`).flush([mockDto]);

    const niveis = await promise;
    expect(niveis).toHaveLength(1);
    expect(niveis[0].id).toBe('n-1');
    expect(niveis[0].atrasoMinutos).toBe(10);
  });

  it('deve obter empresa com mapeamento', async () => {
    const mockDto = {
      id: 'e-1',
      nome: 'Empresa Teste',
      cnpj: '12345678000199',
      ativa: true,
      alerta_sonoro: true,
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    };

    const promise = firstValueFrom(service.obterEmpresa());
    httpMock.expectOne(`${baseUrl}/empresa`).flush(mockDto);

    const empresa = await promise;
    expect(empresa.alertaSonoro).toBe(true);
    expect(empresa.nome).toBe('Empresa Teste');
  });
});
