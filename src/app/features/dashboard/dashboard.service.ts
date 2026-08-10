import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Subject, merge } from 'rxjs';
import { debounceTime, takeUntil, finalize, map } from 'rxjs/operators';
import { ApiService } from '../../core/services/api.service';
import { WebSocketService } from '../../core/websocket/websocket.service';
import {
  DashboardTableResponse,
  DashboardTableResponseDto,
  DashboardLinha,
} from './dashboard.types';
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

function mapAlertaRecente(dto: DashboardTableResponseDto['summary']['alertas_recentes'][number]): Alerta {
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

function mapDashboardLinha(dto: DashboardTableResponseDto['linhas'][number]): DashboardLinha {
  return {
    turnoId: dto.turno_id,
    vigiaId: dto.vigia_id,
    vigiaNome: dto.vigia_nome,
    postoId: dto.posto_id,
    postoNome: dto.posto_nome,
    postoLatitude: dto.posto_latitude,
    postoLongitude: dto.posto_longitude,
    postoRaioM: dto.posto_raio_m,
    turnoStatus: dto.turno_status,
    inicioPrevisto: dto.inicio_previsto,
    fimPrevisto: dto.fim_previsto,
    inicioReal: dto.inicio_real,
    intervaloMin: dto.intervalo_min,
    ultimoCheckin: dto.ultimo_checkin,
    proximoCheckin: dto.proximo_checkin,
    atrasado: dto.atrasado,
  };
}

function mapDashboardTableDto(dto: DashboardTableResponseDto): DashboardTableResponse {
  return {
    linhas: (dto.linhas ?? []).map(mapDashboardLinha),
    summary: {
      kpis: {
        turnosAtivos: dto.summary.turnos_ativos,
        alertasAbertos: dto.summary.alertas_abertos,
        checkinsUltimaHora: dto.summary.checkins_ultima_hora,
        desviosRota: dto.summary.desvios_rota,
      },
      alertasRecentes: (dto.summary.alertas_recentes ?? []).map(mapAlertaRecente),
      turnosPorPosto: (dto.summary.turnos_por_posto ?? []).map((t) => ({
        postoNome: t.posto_nome,
        quantidade: t.quantidade,
      })),
    },
    total: dto.total,
    limit: dto.limit,
    offset: dto.offset,
  };
}

@Injectable()
export class DashboardService {
  private readonly api = inject(ApiService);
  private readonly ws = inject(WebSocketService);

  private readonly destroy$ = new Subject<void>();
  private readonly tableSubject = new BehaviorSubject<DashboardTableResponse | null>(null);
  private readonly loadingSubject = new BehaviorSubject(true);
  private readonly errorSubject = new BehaviorSubject<string | null>(null);

  readonly table$ = this.tableSubject.asObservable();
  readonly loading$ = this.loadingSubject.asObservable();
  readonly error$ = this.errorSubject.asObservable();

  private limit = 20;
  private offset = 0;

  startPolling(limit = 20, offset = 0): void {
    this.limit = limit;
    this.offset = offset;
    this.loadingSubject.next(true);
    this.fetchTable();

    merge(
      this.ws.onEvent('new_alert'),
      this.ws.onEvent('status_change'),
    )
      .pipe(debounceTime(3000), takeUntil(this.destroy$))
      .subscribe(() => this.fetchTable());
  }

  stopPolling(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  refresh(): void {
    this.loadingSubject.next(true);
    this.errorSubject.next(null);
    this.fetchTable();
  }

  changePage(page: number): void {
    this.offset = (page - 1) * this.limit;
    this.loadingSubject.next(true);
    this.fetchTable();
  }

  private fetchTable(): void {
    this.api
      .get<DashboardTableResponseDto>('/dashboard/table', {
        limit: this.limit.toString(),
        offset: this.offset.toString(),
      } as Record<string, string>)
      .pipe(
        map((dto) => mapDashboardTableDto(dto)),
        finalize(() => this.loadingSubject.next(false)),
      )
      .subscribe({
        next: (data) => {
          this.tableSubject.next(data);
          this.errorSubject.next(null);
        },
        error: (err: Error) => {
          if (!this.tableSubject.value) {
            this.errorSubject.next(err.message);
          }
        },
      });
  }
}
