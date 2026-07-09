export interface ConfigEscalonamento {
  id: string;
  empresaId: string;
  atrasoMinutos: number;
  descricao?: string;
  usuarioIds: string[];
  sistema: boolean;
  createdAt: string;
}

export interface CreateEscalonamentoPayload {
  atrasoMinutos: number;
  descricao?: string;
  usuarioIds: string[];
}

export interface UpdateEscalonamentoPayload {
  atrasoMinutos: number;
  descricao?: string;
  usuarioIds: string[];
}

export interface UpdateEscalonamentoUsuariosPayload {
  usuarioIds: string[];
}
