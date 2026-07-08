import { TestBed } from '@angular/core/testing';
import { AvatarService } from './avatar.service';

describe('AvatarService', () => {
  let service: AvatarService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [AvatarService],
    });
    service = TestBed.inject(AvatarService);
  });

  it('deve retornar fallback para nome vazio', () => {
    const result = service.getAvatar('');
    expect(result.initials).toBe('?');
    expect(result.backgroundColor).toBe('#6B7280');
  });

  it('deve retornar fallback para nome null/undefined', () => {
    const result = service.getAvatar(null as unknown as string);
    expect(result.initials).toBe('?');
  });

  it('deve gerar iniciais com primeiro e ultimo nome', () => {
    const result = service.getAvatar('João Silva');
    expect(result.initials).toBe('JS');
  });

  it('deve gerar iniciais com três nomes', () => {
    const result = service.getAvatar('Maria Clara Santos');
    expect(result.initials).toBe('MS');
  });

  it('deve gerar iniciais com nome único longo', () => {
    const result = service.getAvatar('João');
    expect(result.initials.length).toBe(2);
    expect(result.initials[0]).toBe('J');
  });

  it('deve gerar iniciais com nome único de uma letra', () => {
    const result = service.getAvatar('A');
    expect(result.initials).toBe('A');
  });

  it('deve produzir a mesma cor para o mesmo nome', () => {
    const a = service.getAvatar('João Silva');
    const b = service.getAvatar('João Silva');
    expect(a.backgroundColor).toBe(b.backgroundColor);
  });

  it('deve usar cor da paleta', () => {
    const result = service.getAvatar('Teste');
    expect(result.backgroundColor).toMatch(/^#[0-9A-Fa-f]{6}$/);
  });

  it('deve ignorar espaços extras', () => {
    const result = service.getAvatar('  João   Silva  ');
    expect(result.initials).toBe('JS');
  });
});
