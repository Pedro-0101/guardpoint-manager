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

  it('deve emitir notificação de sucesso', () => {
    const received: unknown[] = [];
    service.notifications$.subscribe((n) => received.push(n));

    service.success('Operação concluída');

    const last = received[received.length - 1] as { type: string; message: string }[];
    expect(last[0].type).toBe('success');
    expect(last[0].message).toBe('Operação concluída');
  });

  it('deve emitir notificação de erro persistente', () => {
    const received: unknown[] = [];
    service.notifications$.subscribe((n) => received.push(n));

    service.error('Falha');

    const last = received[received.length - 1] as { type: string; persistent: boolean }[];
    expect(last[0].type).toBe('error');
    expect(last[0].persistent).toBe(true);
  });

  it('deve remover notificação por id', () => {
    const received: unknown[] = [];
    service.notifications$.subscribe((n) => received.push(n));

    service.success('Primeira');

    const first = received[received.length - 1] as { id: string }[];
    const id = first[0].id;
    service.remove(id);

    const afterRemove = received[received.length - 1] as unknown[];
    expect(afterRemove.length).toBe(0);
  });

  it('deve gerar ids únicos', () => {
    service.success('A');
    service.success('B');

    let all: { id: string }[] = [];
    service.notifications$.subscribe((n) => all = n as { id: string }[]);

    expect(all[0].id).not.toBe(all[1].id);
  });
});
