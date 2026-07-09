export interface SenhaVigia {
  id: string;
  tipo: 'ok' | 'emergencia' | 'customizada';
  codigo: string;
  descricao?: string;
  usuarioId: string;
  empresaId: string;
  createdAt: string;
  updatedAt: string;
}
