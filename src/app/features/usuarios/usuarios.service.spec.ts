import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { UsuariosService } from './usuarios.service';
import { Usuario } from '../../core/models/usuario.model';

describe('UsuariosService', () => {
  let service: UsuariosService;
  let httpMock: HttpTestingController;
  const baseUrl = environment.apiUrl;

  const mockUsuario: Usuario = {
    id: '1',
    nome: 'Vigia Silva',
    email: 'vigia@test.com',
    cargo: 'vigia',
    empresaId: 'emp-1',
    ativo: true,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [UsuariosService, provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(UsuariosService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('deve listar usuários', async () => {
    const promise = firstValueFrom(service.listar());
    httpMock.expectOne(`${baseUrl}/usuarios`).flush([mockUsuario]);
    expect(await promise).toEqual([mockUsuario]);
  });

  it('deve obter usuário por id', async () => {
    const promise = firstValueFrom(service.obter('1'));
    httpMock.expectOne(`${baseUrl}/usuarios/1`).flush(mockUsuario);
    expect(await promise).toEqual(mockUsuario);
  });

  it('deve inativar usuário', () => {
    service.inativar('1').subscribe();
    const req = httpMock.expectOne(`${baseUrl}/usuarios/1`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
  });
});
