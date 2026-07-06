export interface Escala {
  id: string;
  nome: string;
  postoId: string;
  postoNome: string;
  usuarioId: string;
  usuarioNome: string;
  diasSemana: number[];
  horaInicio: string;
  horaFim: string;
  dataInicio: string;
  dataFim: string;
  toleranciaMin: number;
  ativo: boolean;
  empresaId: string;
  createdAt: string;
  updatedAt: string;
}

export interface EscalaDto {
  id: string;
  nome: string;
  posto_id: string;
  posto_nome: string;
  usuario_id: string;
  usuario_nome: string;
  dias_semana: number[];
  hora_inicio: string;
  hora_fim: string;
  data_inicio: string;
  data_fim: string;
  tolerancia_min: number;
  ativo: boolean;
  empresa_id: string;
  created_at: string;
  updated_at: string;
}

export interface CreateEscalaPayload {
  data_fim: string;
  data_inicio: string;
  dias_semana: number[];
  hora_fim: string;
  hora_inicio: string;
  nome?: string;
  posto_id: string;
  tolerancia_min?: number;
  usuario_id: string;
}

export interface UpdateEscalaPayload {
  ativo?: boolean;
  data_fim?: string;
  data_inicio?: string;
  dias_semana?: number[];
  hora_fim?: string;
  hora_inicio?: string;
  nome?: string;
  posto_id?: string;
  tolerancia_min?: number;
  usuario_id?: string;
}
