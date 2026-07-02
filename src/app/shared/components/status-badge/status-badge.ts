import { Component, computed, input } from '@angular/core';

export type StatusType =
  | 'ativo'
  | 'agendado'
  | 'em_andamento'
  | 'pausado'
  | 'finalizado'
  | 'cancelado'
  | 'critico'
  | 'pendente'
  | 'enviado'
  | 'erro'
  | 'aberto'
  | 'reconhecido'
  | 'encerrado';

interface StatusConfig {
  color: string;
  bg: string;
  label: string;
}

const STATUS_MAP: Record<StatusType, StatusConfig> = {
  ativo: { color: '#2e7d32', bg: '#e8f5e9', label: 'Ativo' },
  agendado: { color: '#78909c', bg: '#eceff1', label: 'Agendado' },
  em_andamento: { color: '#1565c0', bg: '#e3f2fd', label: 'Em andamento' },
  pausado: { color: '#f57f17', bg: '#fff8e1', label: 'Pausado' },
  finalizado: { color: '#546e7a', bg: '#eceff1', label: 'Finalizado' },
  cancelado: { color: '#c62828', bg: '#ffebee', label: 'Cancelado' },
  critico: { color: '#b71c1c', bg: '#ffebee', label: 'Crítico' },
  pendente: { color: '#6a1b9a', bg: '#f3e5f5', label: 'Pendente' },
  enviado: { color: '#00695c', bg: '#e0f2f1', label: 'Enviado' },
  erro: { color: '#b71c1c', bg: '#ffebee', label: 'Erro' },
  aberto: { color: '#e65100', bg: '#fff3e0', label: 'Aberto' },
  reconhecido: { color: '#1565c0', bg: '#e3f2fd', label: 'Reconhecido' },
  encerrado: { color: '#2e7d32', bg: '#e8f5e9', label: 'Encerrado' },
};

@Component({
  selector: 'gp-status-badge',
  imports: [],
  templateUrl: './status-badge.html',
  styleUrl: './status-badge.scss',
})
export class StatusBadge {
  status = input.required<StatusType>();

  config = computed(() => STATUS_MAP[this.status()] ?? STATUS_MAP['pendente']);
}
