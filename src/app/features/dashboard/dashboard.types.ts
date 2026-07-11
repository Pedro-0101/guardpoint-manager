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

export interface DashboardSummary {
  kpis: DashboardKpis;
  alertasRecentes: Alerta[];
  turnosPorPosto: TurnoPorPosto[];
}

export interface DashboardSummaryDto {
  turnos_ativos: number;
  alertas_abertos: number;
  checkins_ultima_hora: number;
  desvios_rota: number;
  alertas_recentes: AlertaRecenteDto[];
  turnos_por_posto: TurnoPorPostoDto[];
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
