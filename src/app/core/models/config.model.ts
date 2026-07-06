export interface NivelEscalonamento {
  id: string;
  empresaId: string;
  nivel: number;
  atrasoMinutos: number;
  cargoAlvo: string | null;
  whatsappPara: string;
  createdAt: string;
}
