import { Alerta } from '../../core/models/alerta.model';

export interface DashboardKpis {
  turnosAtivos: number;
  alertasAbertos: number;
  checkinsUltimaHora: number;
  desviosRota: number;
}

export interface TurnoPorPosto {
  postoNome: string;
  quantidade: number;
}

export interface PostoSemCobertura {
  postoId: string;
  postoNome: string;
}

export interface FeedEvento {
  tipo: 'inicio_turno' | 'fim_turno' | 'checkin' | 'alerta_aberto'
    | 'alerta_reconhecido' | 'sabotagem';
  usuarioNome: string;
  postoNome: string;
  turnoId: string;
  timestamp: string;
}

export interface DashboardLinha {
  turnoId: string;
  vigiaId: string;
  vigiaNome: string;
  postoId: string;
  postoNome: string;
  postoLatitude: number;
  postoLongitude: number;
  postoRaioM: number;
  turnoStatus: string;
  inicioPrevisto: string;
  fimPrevisto: string;
  inicioReal: string | null;
  intervaloMin: number;
  ultimoCheckin: string | null;
  proximoCheckin: string | null;
  atrasado: boolean;
}

export interface DashboardSummary {
  kpis: DashboardKpis;
  alertasRecentes: Alerta[];
  turnosPorPosto: TurnoPorPosto[];
}

export interface DashboardTableResponse {
  linhas: DashboardLinha[];
  summary: DashboardSummary;
  total: number;
  limit: number;
  offset: number;
}

export interface DashboardSummaryDto {
  turnos_ativos: number;
  alertas_abertos: number;
  checkins_ultima_hora: number;
  desvios_rota: number;
  alertas_recentes: AlertaRecenteDto[];
  turnos_por_posto: TurnoPorPostoDto[];
}

export interface DashboardTableResponseDto {
  linhas: DashboardLinhaDto[];
  summary?: DashboardSummaryDto;
  total: number;
  limit: number;
  offset: number;
}

export interface DashboardLinhaDto {
  turno_id: string;
  vigia_id: string;
  vigia_nome: string;
  posto_id: string;
  posto_nome: string;
  posto_latitude: number;
  posto_longitude: number;
  posto_raio_m: number;
  turno_status: string;
  inicio_previsto: string;
  fim_previsto: string;
  inicio_real: string | null;
  intervalo_min: number;
  ultimo_checkin: string | null;
  proximo_checkin: string | null;
  atrasado: boolean;
}

export interface AlertaRecenteDto {
  id: string;
  tipo: string;
  turno_id: string;
  posto_id?: string;
  mensagem: string;
  created_at: string;
}

export interface TurnoPorPostoDto {
  posto_id: string;
  posto_nome: string;
  quantidade: number;
}
