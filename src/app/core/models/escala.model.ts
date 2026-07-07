export interface Escala {
  id: string;
  postoId: string;
  postoNome: string;
  usuarioId: string;
  usuarioNome: string;
  diaSemanaInicio: number;
  diaSemanaFim: number;
  horaInicio: string;
  horaFim: string;
  toleranciaMin: number;
  ativo: boolean;
  empresaId: string;
  createdAt: string;
  updatedAt: string;
}

export interface EscalaDto {
  id: string;
  posto_id: string;
  posto_nome: string;
  usuario_id: string;
  usuario_nome: string;
  dia_semana_inicio: number;
  dia_semana_fim: number;
  hora_inicio: string;
  hora_fim: string;
  tolerancia_min: number;
  ativo: boolean;
  empresa_id: string;
  created_at: string;
  updated_at: string;
}

export interface DiaEscalaEntry {
  dia_semana_inicio: number;
  dia_semana_fim: number;
  hora_inicio: string;
  hora_fim: string;
}

export interface CreateEscalaPayload {
  dia_semana_fim: number;
  dia_semana_inicio: number;
  hora_fim: string;
  hora_inicio: string;
  posto_id: string;
  tolerancia_min?: number;
  usuario_id: string;
}

export interface CreateEscalaLotePayload {
  dias: DiaEscalaEntry[];
  posto_id: string;
  tolerancia_min?: number;
  usuario_id: string;
}

export interface UpdateEscalaPayload {
  ativo?: boolean;
  dia_semana_fim?: number;
  dia_semana_inicio?: number;
  hora_fim?: string;
  hora_inicio?: string;
  posto_id?: string;
  tolerancia_min?: number;
  usuario_id?: string;
}
