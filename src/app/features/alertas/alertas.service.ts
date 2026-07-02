import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { ApiService } from '../../core/services/api.service';
import { WebSocketService } from '../../core/websocket/websocket.service';
import { NewAlertPayload } from '../../core/websocket/websocket.types';
import { Alerta } from '../../core/models/alerta.model';

@Injectable({ providedIn: 'root' })
export class AlertasService {
  private readonly api = inject(ApiService);
  private readonly ws = inject(WebSocketService);

  private readonly alertasSubject = new BehaviorSubject<Alerta[]>([]);
  readonly alertas$ = this.alertasSubject.asObservable();

  constructor() {
    this.ws
      .onEvent<NewAlertPayload>('new_alert')
      .subscribe((payload) => this.handleNewAlert(payload));
  }

  listarRecentes(limite = 10): Observable<Alerta[]> {
    return this.api.get<Alerta[]>('/alertas/recentes', { limite });
  }

  private handleNewAlert(payload: NewAlertPayload): void {
    const current = this.alertasSubject.value;
    const alerta: Alerta = {
      id: payload.alertaId,
      turnoId: payload.turnoId,
      tipo: payload.tipo as Alerta['tipo'],
      gravidade: 'baixa',
      status: 'aberto',
      mensagem: '',
      reconhecidoPor: null,
      encerradoPor: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.alertasSubject.next([alerta, ...current]);
  }
}
