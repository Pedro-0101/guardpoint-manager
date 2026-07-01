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
