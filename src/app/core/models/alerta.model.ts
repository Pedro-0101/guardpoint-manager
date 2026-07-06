export interface Alerta {
  id: string;
  turnoId: string;
  tipo: 'atraso' | 'ausencia' | 'coacao' | 'sabotagem';
  gravidade: 'baixa' | 'media' | 'alta' | 'critica';
  status: 'aberto' | 'reconhecido' | 'encerrado';
  mensagem: string;
  reconhecidoPor: string | null;
  encerradoPor: string | null;
  createdAt: string;
  updatedAt: string;
}
