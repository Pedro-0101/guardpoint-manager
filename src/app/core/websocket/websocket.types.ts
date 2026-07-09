export interface WsEvent {
  type: 'gps_update' | 'status_change' | 'new_alert';
  payload: unknown;
}

export interface GpsUpdatePayload {
  turnoId: string;
  latitude: number;
  longitude: number;
  timestamp: string;
  flagGeofence?: 'ok' | 'desvio_rota' | null;
}

export interface StatusChangePayload {
  turnoId: string;
  status: 'agendado' | 'em_andamento' | 'pausado' | 'finalizado' | 'critico';
  timestamp?: string;
}

export interface NewAlertPayload {
  alertaId: string;
  tipo: string;
  turnoId: string;
  nivel: number;
}
