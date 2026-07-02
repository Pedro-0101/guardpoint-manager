import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../core/services/api.service';
import { Usuario } from '../../core/models/usuario.model';

@Injectable({ providedIn: 'root' })
export class UsuariosService {
  private readonly api = inject(ApiService);

  listar(): Observable<Usuario[]> {
    return this.api.get<Usuario[]>('/usuarios');
  }

  obter(id: string): Observable<Usuario> {
    return this.api.get<Usuario>(`/usuarios/${id}`);
  }

  criar(data: Omit<Usuario, 'id' | 'empresaId' | 'createdAt' | 'updatedAt'>): Observable<Usuario> {
    return this.api.post<Usuario>('/usuarios', data);
  }

  atualizar(id: string, data: Partial<Usuario>): Observable<Usuario> {
    return this.api.put<Usuario>(`/usuarios/${id}`, data);
  }

  inativar(id: string): Observable<void> {
    return this.api.delete<void>(`/usuarios/${id}`);
  }
}
