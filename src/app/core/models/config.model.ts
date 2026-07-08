export interface NivelEscalonamento {
  id: string;
  empresaId: string;
  nivel: number;
  atrasoMinutos: number;
  descricao?: string;
  sistema: boolean;
  usuarioIds: string[] | null;
  createdAt: string;
}
