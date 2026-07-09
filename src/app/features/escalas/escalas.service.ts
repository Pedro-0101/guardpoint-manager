import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { ApiService } from '../../core/services/api.service';
import {
  Escala,
  EscalaDto,
  CreateEscalaPayload,
  CreateEscalaLotePayload,
  CreateEscalaLoteResponse,
  UpdateEscalaPayload,
} from '../../core/models/escala.model';

@Injectable({ providedIn: 'root' })
export class EscalasService {
  private readonly api = inject(ApiService);

  listar(params?: {
    usuario_id?: string;
    posto_id?: string;
    ativos?: string;
    limit?: number;
    offset?: number;
  }): Observable<Escala[]> {
    return this.api
      .get<EscalaDto[] | { data: EscalaDto[]; total: number } | { escalas: EscalaDto[] }>(
        '/escalas',
        params as Record<string, string | number | boolean>
      )
      .pipe(
        map((res) => {
          if (Array.isArray(res)) {
            return res.map(mapEscalaFromDto);
          }
          if ('data' in res && Array.isArray(res.data)) {
            return res.data.map(mapEscalaFromDto);
          }
          if ('escalas' in res && Array.isArray(res.escalas)) {
            return res.escalas.map(mapEscalaFromDto);
          }
          throw new Error('Formato de resposta inesperado da API.');
        })
      );
  }

  obter(id: string): Observable<Escala> {
    return this.api
      .get<EscalaDto>(`/escalas/${id}`)
      .pipe(map((dto) => mapEscalaFromDto(dto)));
  }

  criar(data: CreateEscalaPayload): Observable<Escala> {
    return this.api
      .post<EscalaDto>('/escalas', data)
      .pipe(map((dto) => mapEscalaFromDto(dto)));
  }

  criarLote(data: CreateEscalaLotePayload): Observable<CreateEscalaLoteResponse> {
    return this.api.post<CreateEscalaLoteResponse>('/escalas/lote', data);
  }

  substituirLote(data: CreateEscalaLotePayload): Observable<CreateEscalaLoteResponse> {
    return this.api.put<CreateEscalaLoteResponse>('/escalas/lote', data);
  }

  atualizar(
    id: string,
    data: UpdateEscalaPayload
  ): Observable<Escala> {
    return this.api
      .put<EscalaDto>(`/escalas/${id}`, data)
      .pipe(map((dto) => mapEscalaFromDto(dto)));
  }

  excluir(id: string): Observable<void> {
    return this.api.delete<void>(`/escalas/${id}`);
  }
}

function mapEscalaFromDto(dto: EscalaDto): Escala {
  return {
    id: dto.id,
    postoId: dto.posto_id,
    postoNome: dto.posto_nome,
    usuarioId: dto.usuario_id,
    usuarioNome: dto.usuario_nome,
    diaSemanaInicio: dto.dia_semana_inicio,
    diaSemanaFim: dto.dia_semana_fim,
    horaInicio: dto.hora_inicio,
    horaFim: dto.hora_fim,
    toleranciaMin: dto.tolerancia_min,
    ativo: dto.ativo,
    empresaId: dto.empresa_id,
    createdAt: dto.created_at,
    updatedAt: dto.updated_at,
  };
}
