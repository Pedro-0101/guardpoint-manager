export interface SenhaVigia {
  id: string;
  tipo: 'ok' | 'emergencia' | 'customizada';
  codigo: string;
  descricao?: string;
  nivelEscalonamentoId?: string | null;
  usuarioId: string;
  empresaId: string;
  createdAt: string;
  updatedAt: string;
}
