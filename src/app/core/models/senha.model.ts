export interface SenhaVigia {
  id: string;
  tipo: 'ok' | 'emergencia' | 'customizada';
  codigo: string;
  escalonamentoId: string | null;
  usuarioId: string;
  empresaId: string;
  createdAt: string;
  updatedAt: string;
}
