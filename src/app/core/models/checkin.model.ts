export interface Checkin {
  id: string;
  turnoId: string;
  latitude: number;
  longitude: number;
  timestampCriacao: string;
  timestampRecebimento: string;
  tipoSenha: 'padrao' | 'coacao' | 'finalizacao' | 'sabotagem';
  flagGeofence: 'ok' | 'desvio_rota';
  origemRede: 'online' | 'offline_sincronizado';
}
