export interface Substituicao {
  id: string;
  usuarioId: string;
  usuarioNome: string;
  postoId: string;
  postoNome: string;
  dataInicio: string;
  dataFim: string;
  horaInicio: string;
  horaFim: string;
  motivo: string;
  toleranciaMin: number;
  ativo: boolean;
  empresaId: string;
  createdAt: string;
  updatedAt: string;
}

export interface SubstituicaoDto {
  id: string;
  usuario_id: string;
  usuario_nome: string;
  posto_id: string;
  posto_nome: string;
  data_inicio: string;
  data_fim: string;
  hora_inicio: string;
  hora_fim: string;
  motivo: string;
  tolerancia_min: number;
  ativo: boolean;
  empresa_id: string;
  created_at: string;
  updated_at: string;
}

export interface CreateSubstituicaoPayload {
  data_inicio: string;
  data_fim: string;
  hora_inicio: string;
  hora_fim: string;
  posto_id: string;
  usuario_id: string;
  motivo?: string;
  tolerancia_min?: number;
}

export interface UpdateSubstituicaoPayload {
  ativo?: boolean;
  data_inicio?: string;
  data_fim?: string;
  hora_inicio?: string;
  hora_fim?: string;
  motivo?: string;
  posto_id?: string;
  tolerancia_min?: number;
  usuario_id?: string;
}
