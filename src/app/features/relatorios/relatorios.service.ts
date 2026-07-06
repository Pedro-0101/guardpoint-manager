import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { ApiService } from '../../core/services/api.service';
import { Turno } from '../../core/models/turno.model';

export interface HistoricoFiltros {
  dataInicio?: string;
  dataFim?: string;
  usuarioId?: string;
  postoId?: string;
  status?: string;
}

export interface HistoricoPagina {
  turnos: Turno[];
  total: number;
}

interface TurnoDto {
  id: string;
  empresa_id: string;
  usuario_id: string;
  posto_id: string;
  posto_nome?: string;
  usuario_nome?: string;
  vigia_nome?: string;
  status: string;
  inicio_previsto: string;
  fim_previsto: string;
  inicio_real: string | null;
  fim_real: string | null;
  intervalo_min: number;
  created_at: string;
  posto?: { nome?: string };
  usuario?: { nome?: string };
}

interface HistoricoResponse {
  data: TurnoDto[];
  total: number;
}

@Injectable({ providedIn: 'root' })
export class RelatoriosService {
  private readonly api = inject(ApiService);

  listarHistorico(filtros: HistoricoFiltros, pagina: { limit: number; offset: number }): Observable<HistoricoPagina> {
    const params: Record<string, string | number | boolean> = {
      limit: pagina.limit,
      offset: pagina.offset,
    };

    if (filtros.dataInicio) params['data_inicio'] = filtros.dataInicio;
    if (filtros.dataFim) params['data_fim'] = filtros.dataFim;
    if (filtros.usuarioId) params['usuario_id'] = filtros.usuarioId;
    if (filtros.postoId) params['posto_id'] = filtros.postoId;
    if (filtros.status) params['status'] = filtros.status;

    return this.api.get<TurnoDto[] | HistoricoResponse>('/turnos/historico', params).pipe(
      map((resp) => {
        if (Array.isArray(resp)) {
          return {
            turnos: resp.map((dto) => this.mapTurnoFromDto(dto)),
            total: resp.length,
          };
        }
        const data = resp?.data ?? [];
        return {
          turnos: data.map((dto) => this.mapTurnoFromDto(dto)),
          total: resp.total ?? data.length,
        };
      }),
    );
  }

  private mapTurnoFromDto(dto: TurnoDto): Turno {
    return {
      id: dto.id,
      empresaId: dto.empresa_id,
      usuarioId: dto.usuario_id,
      postoId: dto.posto_id,
      postoNome: dto.posto_nome ?? dto.posto?.nome ?? '',
      usuarioNome: dto.usuario_nome ?? dto.vigia_nome ?? dto.usuario?.nome ?? '',
      status: dto.status as Turno['status'],
      inicioPrevisto: dto.inicio_previsto,
      fimPrevisto: dto.fim_previsto,
      inicioReal: dto.inicio_real,
      fimReal: dto.fim_real,
      intervaloMin: dto.intervalo_min,
      createdAt: dto.created_at,
    };
  }
}
