export interface NivelEscalonamento {
  nivel: number;
  cargo: string;
  email: string;
  telefone: string;
  intervaloMinutos: number;
}

export interface ConfigEscalonamento {
  id: string;
  empresaId: string;
  niveis: NivelEscalonamento[];
  createdAt: string;
  updatedAt: string;
}
