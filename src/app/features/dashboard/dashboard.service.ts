import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Subject, merge } from 'rxjs';
import { debounceTime, takeUntil, finalize, map } from 'rxjs/operators';
import { ApiService } from '../../core/services/api.service';
import { WebSocketService } from '../../core/websocket/websocket.service';
import { DashboardSummary, DashboardSummaryDto } from './dashboard.types';
import { Alerta } from '../../core/models/alerta.model';

function normalizarTipo(raw: string): Alerta['tipo'] {
  if (raw.startsWith('atraso')) return 'atraso';
  if (raw === 'no_show') return 'ausencia';
  if (raw === 'sabotagem') return 'sabotagem';
  if (raw === 'senha_emergencia' || raw === 'senha_customizada' || raw === 'coacao') return 'coacao';
  return 'atraso';
}

function gravidadePorTipo(raw: string, nivel: number): Alerta['gravidade'] {
  if (raw === 'coacao' || raw === 'sabotagem' || raw === 'senha_emergencia' || raw === 'senha_customizada') return 'critica';
  if (raw === 'no_show') return 'alta';
  const nivelMap: Record<number, Alerta['gravidade']> = {
    1: 'baixa',
    2: 'media',
    3: 'alta',
    4: 'critica',
  };
  return nivelMap[nivel] ?? 'baixa';
}

function nivelDeTipo(raw: string): number {
  const match = raw.match(/_n(\d+)$/);
  return match ? Number(match[1]) : 1;
}

function mapAlertaRecente(dto: DashboardSummaryDto['alertas_recentes'][number]): Alerta {
  const tipo = normalizarTipo(dto.tipo);
  const nivel = nivelDeTipo(dto.tipo);
  return {
    id: dto.id,
    turnoId: dto.turno_id ?? '',
    tipo,
    gravidade: gravidadePorTipo(dto.tipo, nivel),
    status: 'aberto',
    mensagem: dto.mensagem ?? '',
    reconhecidoPor: null,
    encerradoPor: null,
    createdAt: dto.created_at,
    updatedAt: dto.created_at,
  };
}

function mapDashboardDto(dto: DashboardSummaryDto): DashboardSummary {
  return {
    kpis: {
      turnosAtivos: dto.turnos_ativos,
      alertasAbertos: dto.alertas_abertos,
      checkinsUltimaHora: dto.checkins_ultima_hora,
      desviosRota: dto.desvios_rota,
    },
    alertasRecentes: (dto.alertas_recentes ?? []).map(mapAlertaRecente),
    turnosPorPosto: (dto.turnos_por_posto ?? []).map((t) => ({
      postoNome: t.posto_nome,
      quantidade: t.quantidade,
    })),
  };
}

@Injectable()
export class DashboardService {
  private readonly api = inject(ApiService);
  private readonly ws = inject(WebSocketService);

  private readonly destroy$ = new Subject<void>();
  private readonly summarySubject = new BehaviorSubject<DashboardSummary | null>(null);
  private readonly loadingSubject = new BehaviorSubject(true);
  private readonly errorSubject = new BehaviorSubject<string | null>(null);

  readonly summary$ = this.summarySubject.asObservable();
  readonly loading$ = this.loadingSubject.asObservable();
  readonly error$ = this.errorSubject.asObservable();

  startPolling(): void {
    this.loadingSubject.next(true);

    this.api
      .get<DashboardSummaryDto>('/dashboard/summary')
      .pipe(
        map((dto) => mapDashboardDto(dto)),
        finalize(() => this.loadingSubject.next(false)),
      )
      .subscribe({
        next: (data) => {
          this.summarySubject.next(data);
          this.loadingSubject.next(false);
          this.errorSubject.next(null);
        },
        error: (err: Error) => {
          this.loadingSubject.next(false);
          if (!this.summarySubject.value) {
            this.errorSubject.next(err.message);
          }
        },
      });

    merge(
      this.ws.onEvent('new_alert'),
      this.ws.onEvent('status_change'),
    )
      .pipe(debounceTime(3000), takeUntil(this.destroy$))
      .subscribe(() => this.fetchSummary());
  }

  stopPolling(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  refresh(): void {
    this.loadingSubject.next(true);
    this.errorSubject.next(null);
    this.fetchSummary();
  }

  private fetchSummary(): void {
    this.api
      .get<DashboardSummaryDto>('/dashboard/summary')
      .pipe(
        map((dto) => mapDashboardDto(dto)),
        finalize(() => this.loadingSubject.next(false)),
      )
      .subscribe({
        next: (data) => {
          this.summarySubject.next(data);
          this.errorSubject.next(null);
        },
        error: (err: Error) => {
          if (!this.summarySubject.value) {
            this.errorSubject.next(err.message);
          }
        },
      });
  }
}
