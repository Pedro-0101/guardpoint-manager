import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../core/services/api.service';
import { Escala } from '../../core/models/escala.model';

export type EscalaPayload = Omit<Escala, 'id' | 'empresaId' | 'createdAt' | 'updatedAt' | 'postoNome' | 'vigiaNome'>;

@Injectable({ providedIn: 'root' })
export class EscalasService {
  private readonly api = inject(ApiService);

  listar(): Observable<Escala[]> {
    return this.api.get<Escala[]>('/escalas');
  }

  obter(id: string): Observable<Escala> {
    return this.api.get<Escala>(`/escalas/${id}`);
  }

  criar(data: EscalaPayload): Observable<Escala> {
    return this.api.post<Escala>('/escalas', data);
  }

  atualizar(id: string, data: EscalaPayload): Observable<Escala> {
    return this.api.put<Escala>(`/escalas/${id}`, data);
  }

  excluir(id: string): Observable<void> {
    return this.api.delete<void>(`/escalas/${id}`);
  }
}
