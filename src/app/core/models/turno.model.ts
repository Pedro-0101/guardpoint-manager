import { Posto } from './posto.model';
import { Usuario } from './usuario.model';
import { Checkin } from './checkin.model';

export interface Turno {
  id: string | null;
  empresaId: string;
  usuarioId: string;
  postoId: string;
  postoNome: string;
  usuarioNome: string;
  status: 'agendado' | 'em_andamento' | 'pausado' | 'finalizado' | 'critico';
  inicioPrevisto: string;
  fimPrevisto: string;
  inicioReal: string | null;
  fimReal: string | null;
  intervaloMin: number;
  createdAt: string;
}

export interface TurnoDetalhe extends Turno {
  posto: Posto | null;
  usuario: Usuario | null;
  checkins: Checkin[];
}

export interface TurnoComPosicao extends Turno {
  posto: Posto | null;
  usuario: Usuario | null;
  ultimoCheckin: Checkin | null;
}

export interface TurnoFilter {
  status?: string;
  data_inicio?: string;
  data_fim?: string;
  usuario_id?: string;
  posto_id?: string;
  sort_by?: 'inicio_previsto' | 'created_at' | 'status';
  sort_order?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

export interface TurnoListResponse {
  data: Turno[];
  total: number;
}
