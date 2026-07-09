import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { ApiService } from '../../core/services/api.service';
import {
  Substituicao,
  SubstituicaoDto,
  CreateSubstituicaoPayload,
  UpdateSubstituicaoPayload,
} from '../../core/models/substituicao.model';

@Injectable({ providedIn: 'root' })
export class SubstituicoesService {
  private readonly api = inject(ApiService);

  listar(params?: {
    usuario_id?: string;
    posto_id?: string;
    data?: string;
    ativos?: string;
    limit?: number;
    offset?: number;
  }): Observable<Substituicao[]> {
    return this.api
      .get<
        | SubstituicaoDto[]
        | { data: SubstituicaoDto[]; total: number }
        | { substituicoes: SubstituicaoDto[] }
      >('/substituicoes', params as Record<string, string | number | boolean>)
      .pipe(
        map((res) => {
          if (Array.isArray(res)) {
            return res.map(mapSubstituicaoFromDto);
          }
          if ('data' in res && Array.isArray(res.data)) {
            return res.data.map(mapSubstituicaoFromDto);
          }
          if ('substituicoes' in res && Array.isArray(res.substituicoes)) {
            return res.substituicoes.map(mapSubstituicaoFromDto);
          }
          throw new Error('Formato de resposta inesperado da API.');
        })
      );
  }

  obter(id: string): Observable<Substituicao> {
    return this.api
      .get<SubstituicaoDto>(`/substituicoes/${id}`)
      .pipe(map((dto) => mapSubstituicaoFromDto(dto)));
  }

  criar(data: CreateSubstituicaoPayload): Observable<Substituicao> {
    return this.api
      .post<SubstituicaoDto>('/substituicoes', data)
      .pipe(map((dto) => mapSubstituicaoFromDto(dto)));
  }

  atualizar(
    id: string,
    data: UpdateSubstituicaoPayload
  ): Observable<Substituicao> {
    return this.api
      .put<SubstituicaoDto>(`/substituicoes/${id}`, data)
      .pipe(map((dto) => mapSubstituicaoFromDto(dto)));
  }

  excluir(id: string): Observable<void> {
    return this.api.delete<void>(`/substituicoes/${id}`);
  }
}

function mapSubstituicaoFromDto(dto: SubstituicaoDto): Substituicao {
  return {
    id: dto.id,
    usuarioId: dto.usuario_id,
    usuarioNome: dto.usuario_nome,
    postoId: dto.posto_id,
    postoNome: dto.posto_nome,
    // O backend pode enviar timestamp ISO completo; a UI trabalha com YYYY-MM-DD.
    dataInicio: (dto.data_inicio ?? '').slice(0, 10),
    dataFim: (dto.data_fim ?? '').slice(0, 10),
    // Idem para horas: HH:MM:SS -> HH:MM.
    horaInicio: (dto.hora_inicio ?? '').slice(0, 5),
    horaFim: (dto.hora_fim ?? '').slice(0, 5),
    motivo: dto.motivo ?? '',
    toleranciaMin: dto.tolerancia_min,
    ativo: dto.ativo,
    empresaId: dto.empresa_id,
    createdAt: dto.created_at,
    updatedAt: dto.updated_at,
  };
}
