import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiService } from './api.service';

describe('ApiService', () => {
  let service: ApiService;
  let httpMock: HttpTestingController;
  const baseUrl = environment.apiUrl;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [ApiService, provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(ApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  describe('GET', () => {
    it('deve chamar a URL correta sem params', async () => {
      const promise = firstValueFrom(service.get<{ data: string }>('/test'));
      const req = httpMock.expectOne(`${baseUrl}/test`);
      expect(req.request.method).toBe('GET');
      req.flush({ data: 'ok' });
      const resp = await promise;
      expect(resp).toEqual({ data: 'ok' });
    });

    it('deve converter params para query string', () => {
      service.get<unknown>('/test', { foo: 'bar', page: 1 }).subscribe();
      const req = httpMock.expectOne(
        (r) => r.url === `${baseUrl}/test` && r.params.get('foo') === 'bar' && r.params.get('page') === '1',
      );
      req.flush({});
    });

    it('deve propagar erro do servidor', async () => {
      const promise = firstValueFrom(service.get<unknown>('/test'));
      httpMock.expectOne(`${baseUrl}/test`).error(new ProgressEvent('Network error'));
      await expect(promise).rejects.toThrow('Servidor indisponível');
    });
  });

  describe('POST', () => {
    it('deve chamar POST com body', async () => {
      const body = { name: 'test' };
      const promise = firstValueFrom(service.post<{ id: string }>('/resource', body));
      const req = httpMock.expectOne(`${baseUrl}/resource`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(body);
      req.flush({ id: '1' });
      expect(await promise).toEqual({ id: '1' });
    });
  });

  describe('DELETE', () => {
    it('deve chamar DELETE', () => {
      service.delete<void>('/resource/1').subscribe();
      const req = httpMock.expectOne(`${baseUrl}/resource/1`);
      expect(req.request.method).toBe('DELETE');
      req.flush(null);
    });
  });
});
