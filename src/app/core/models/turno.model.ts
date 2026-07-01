export interface Turno {
  id: string;
  usuarioId: string;
  usuarioNome: string;
  postoId: string;
  postoNome: string;
  escalaId: string;
  status: 'em_andamento' | 'pausado' | 'finalizado' | 'cancelado';
  inicio: string;
  fim: string | null;
  createdAt: string;
  updatedAt: string;
}
