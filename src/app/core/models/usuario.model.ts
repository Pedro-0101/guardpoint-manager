export interface Usuario {
  id: string;
  nome: string;
  email: string;
  cargo: 'admin' | 'supervisor' | 'vigia';
  empresaId: string;
  ativo: boolean;
  createdAt: string;
  updatedAt: string;
}
