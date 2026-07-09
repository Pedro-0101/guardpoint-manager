export interface ConfigEscalonamento {
  id: string;
  empresaId: string;
  atrasoMinutos: number;
  descricao?: string;
  usuarioIds: string[];
  createdAt: string;
}

export interface CreateEscalonamentoPayload {
  atrasoMinutos: number;
  descricao?: string;
  usuarioIds: string[];
}
