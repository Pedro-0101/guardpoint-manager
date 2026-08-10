import { Component, input, output } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { NgIcon } from '@ng-icons/core';
import { DashboardLinha } from '../../dashboard.types';
import { StatusBadge, StatusType } from '../../../../shared/components/status-badge/status-badge';

@Component({
  selector: 'gp-dashboard-tabela',
  imports: [DatePipe, RouterLink, NgIcon, StatusBadge],
  templateUrl: './dashboard-tabela.html',
  styleUrl: './dashboard-tabela.scss',
})
export class DashboardTabela {
  linhas = input.required<DashboardLinha[]>();
  total = input(0);
  pagina = input(1);
  limite = input(20);

  readonly paginaChange = output<number>();

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.total() / this.limite()));
  }

  statusMap(status: string): StatusType {
    const map: Record<string, StatusType> = {
      agendado: 'agendado',
      em_andamento: 'em_andamento',
      pausado: 'pausado',
      finalizado: 'finalizado',
      critico: 'critico',
    };
    return map[status] ?? 'pendente';
  }

  mudarPagina(page: number): void {
    if (page < 1 || page > this.totalPages) return;
    this.paginaChange.emit(page);
  }
}
