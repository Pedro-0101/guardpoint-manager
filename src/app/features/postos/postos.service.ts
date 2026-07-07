import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { ApiService } from '../../core/services/api.service';
import { Posto } from '../../core/models/posto.model';

interface PostoDto {
  id: string;
  nome: string;
  latitude: number;
  longitude: number;
  raio_m: number;
  ativo: boolean;
  empresa_id: string;
  created_at: string;
  updated_at: string;
}

export interface CreatePostoPayload {
  nome: string;
  latitude: number;
  longitude: number;
  raioM?: number;
}

export type UpdatePostoPayload = Partial<{
  nome: string;
  latitude: number;
  longitude: number;
  raioM: number;
  ativo: boolean;
}>;

function mapPostoFromDto(dto: PostoDto): Posto {
  return {
    id: dto.id,
    nome: dto.nome,
    latitude: dto.latitude,
    longitude: dto.longitude,
    raioM: dto.raio_m,
    ativo: dto.ativo,
    empresaId: dto.empresa_id,
    createdAt: dto.created_at,
    updatedAt: dto.updated_at,
  };
}

@Injectable({ providedIn: 'root' })
export class PostosService {
  private readonly api = inject(ApiService);

  listar(params?: { ativos?: string }): Observable<Posto[]> {
    return this.api
      .get<PostoDto[]>('/postos', params as Record<string, string | number | boolean>)
      .pipe(map((dtos) => dtos.map(mapPostoFromDto)));
  }

  obter(id: string): Observable<Posto> {
    return this.api.get<PostoDto>(`/postos/${id}`).pipe(map(mapPostoFromDto));
  }

  criar(data: CreatePostoPayload): Observable<Posto> {
    const body: Record<string, unknown> = {
      nome: data.nome,
      latitude: data.latitude,
      longitude: data.longitude,
    };
    if (data.raioM !== undefined) {
      body['raio_m'] = data.raioM;
    }
    return this.api.post<PostoDto>('/postos', body).pipe(map(mapPostoFromDto));
  }

  atualizar(id: string, data: UpdatePostoPayload): Observable<Posto> {
    const body: Record<string, unknown> = {};
    if (data.nome !== undefined) body['nome'] = data.nome;
    if (data.latitude !== undefined) body['latitude'] = data.latitude;
    if (data.longitude !== undefined) body['longitude'] = data.longitude;
    if (data.raioM !== undefined) body['raio_m'] = data.raioM;
    if (data.ativo !== undefined) body['ativo'] = data.ativo;
    return this.api.put<PostoDto>(`/postos/${id}`, body).pipe(map(mapPostoFromDto));
  }

  inativar(id: string): Observable<void> {
    return this.api.delete<void>(`/postos/${id}`);
  }
}
