import { Alerta } from '../../core/models/alerta.model';

export interface DashboardKpis {
  turnosAtivos: number;
  turnosCriticos: number;
  turnosAtrasados: number;
  alertasAbertos: number;
  checkinsUltimaHora: number;
  desviosRota: number;
  noShowsHoje: number;
  postosCobertos: number;
  postosTotal: number;
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

export interface DashboardSummary {
  kpis: DashboardKpis;
  alertasRecentes: Alerta[];
  turnosPorPosto: TurnoPorPosto[];
  postosSemCobertura: PostoSemCobertura[];
  feedEventos: FeedEvento[];
}

export interface DashboardSummaryDto {
  turnos_ativos: number;
  turnos_criticos: number;
  turnos_atrasados: number;
  alertas_abertos: number;
  checkins_ultima_hora: number;
  desvios_rota: number;
  no_shows_hoje: number;
  postos_cobertos: number;
  postos_total: number;
  postos_sem_cobertura: { posto_id: string; posto_nome: string }[];
  alertas_recentes: AlertaRecenteDto[];
  turnos_por_posto: TurnoPorPostoDto[];
  feed_eventos: {
    tipo: string;
    usuario_nome: string;
    posto_nome: string;
    turno_id: string;
    timestamp: string;
  }[];
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
