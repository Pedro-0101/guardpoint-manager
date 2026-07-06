import { TestBed } from '@angular/core/testing';
import { NotificationService } from './notification.service';

describe('NotificationService', () => {
  let service: NotificationService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [NotificationService],
    });
    service = TestBed.inject(NotificationService);
  });

  it('deve ser criado', () => {
    expect(service).toBeTruthy();
  });

  it('deve chamar success sem erro', () => {
    expect(() => service.success('Teste')).not.toThrow();
  });

  it('deve chamar error sem erro', () => {
    expect(() => service.error('Teste')).not.toThrow();
  });

  it('deve chamar warning sem erro', () => {
    expect(() => service.warning('Teste')).not.toThrow();
  });

  it('deve chamar info sem erro', () => {
    expect(() => service.info('Teste')).not.toThrow();
  });
});
