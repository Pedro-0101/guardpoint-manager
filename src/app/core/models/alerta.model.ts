export interface Alerta {
  id: string;
  turnoId: string;
  tipo: 'atraso' | 'ausencia' | 'coacao' | 'bateria_baixa' | 'fora_raio' | 'sessao_expirada';
  gravidade: 'baixa' | 'media' | 'alta' | 'critica';
  status: 'aberto' | 'reconhecido' | 'encerrado';
  mensagem: string;
  reconhecidoPor: string | null;
  encerradoPor: string | null;
  createdAt: string;
  updatedAt: string;
}
