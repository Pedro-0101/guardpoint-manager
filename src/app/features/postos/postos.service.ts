import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../core/services/api.service';
import { Posto } from '../../core/models/posto.model';

@Injectable({ providedIn: 'root' })
export class PostosService {
  private readonly api = inject(ApiService);

  listar(): Observable<Posto[]> {
    return this.api.get<Posto[]>('/postos');
  }

  obter(id: string): Observable<Posto> {
    return this.api.get<Posto>(`/postos/${id}`);
  }

  criar(data: Omit<Posto, 'id' | 'empresaId' | 'createdAt' | 'updatedAt'>): Observable<Posto> {
    return this.api.post<Posto>('/postos', data);
  }

  atualizar(id: string, data: Partial<Posto>): Observable<Posto> {
    return this.api.put<Posto>(`/postos/${id}`, data);
  }

  inativar(id: string): Observable<void> {
    return this.api.delete<void>(`/postos/${id}`);
  }
}
