export interface Escala {
  id: string;
  nome: string;
  postoId: string;
  postoNome: string;
  vigiaId: string;
  vigiaNome: string;
  diasSemana: number[];
  horaInicio: string;
  horaFim: string;
  ativo: boolean;
  empresaId: string;
  createdAt: string;
  updatedAt: string;
}
