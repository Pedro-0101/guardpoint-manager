export interface Checkin {
  id: string;
  turnoId: string;
  latitude: number;
  longitude: number;
  precisao: number;
  tipo: 'inicio' | 'periodico' | 'fim' | 'manual';
  timestamp: string;
  createdAt: string;
}
