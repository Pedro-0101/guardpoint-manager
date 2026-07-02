import {
  Component,
  inject,
  signal,
  OnInit,
  OnDestroy,
  AfterViewInit,
  ElementRef,
  viewChild,
} from '@angular/core';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Subject } from 'rxjs';
import { takeUntil, catchError } from 'rxjs/operators';
import * as L from 'leaflet';

import { TurnosService } from '../turnos/turnos.service';
import { WebSocketService } from '../../core/websocket/websocket.service';
import { GpsUpdatePayload, StatusChangePayload } from '../../core/websocket/websocket.types';
import { TurnoComPosicao } from '../../core/models/turno.model';
import { Checkin } from '../../core/models/checkin.model';
import { LoadingSpinner } from '../../shared/components/loading-spinner/loading-spinner';
import { EmptyState } from '../../shared/components/empty-state/empty-state';

type PinColor = 'verde' | 'amarelo' | 'vermelho' | 'cinza';

const STALE_MINUTES = 30;

const PIN_COLORS: Record<PinColor, string> = {
  verde: '#2e7d32',
  amarelo: '#f57f17',
  vermelho: '#c62828',
  cinza: '#78909c',
};

@Component({
  selector: 'gp-mapa',
  imports: [
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    LoadingSpinner,
    EmptyState,
  ],
  templateUrl: './mapa.component.html',
  styleUrl: './mapa.component.scss',
})
export class MapaComponent implements OnInit, OnDestroy, AfterViewInit {
  private readonly turnosService = inject(TurnosService);
  private readonly ws = inject(WebSocketService);
  private readonly router = inject(Router);
  private readonly destroy$ = new Subject<void>();

  readonly mapContainer =
    viewChild<ElementRef<HTMLDivElement>>('mapContainer');

  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly turnos = signal<TurnoComPosicao[]>([]);

  private map: L.Map | null = null;
  private pinsLayer: L.LayerGroup | null = null;
  private markerMap = new Map<string, L.Marker>();

  get turnosComPosicao(): TurnoComPosicao[] {
    return this.turnos().filter((t) => t.ultimoCheckin !== null);
  }

  ngOnInit(): void {
    this.carregarDados();

    this.ws
      .onEvent<GpsUpdatePayload>('gps_update')
      .pipe(takeUntil(this.destroy$))
      .subscribe((payload) => this.handleGpsUpdate(payload));

    this.ws
      .onEvent<StatusChangePayload>('status_change')
      .pipe(takeUntil(this.destroy$))
      .subscribe((payload) => this.handleMapaStatusChange(payload));
  }

  ngAfterViewInit(): void {
    this.iniciarMapa();
    setTimeout(() => this.atualizarMapa(), 100);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    if (this.map) {
      this.map.remove();
      this.map = null;
    }
  }

  recarregar(): void {
    this.carregarDados();
  }

  verDetalhe(turno: TurnoComPosicao): void {
    this.router.navigate(['/turnos', turno.id]);
  }

  private handleGpsUpdate(payload: GpsUpdatePayload): void {
    const current = this.turnos();
    const index = current.findIndex((t) => t.id === payload.turnoId);
    if (index === -1) return;

    const turno = current[index];
    const prevCheckin = turno.ultimoCheckin;

    const updatedCheckin: Checkin = {
      id: '',
      turnoId: payload.turnoId,
      latitude: payload.latitude,
      longitude: payload.longitude,
      timestampCriacao: payload.timestamp,
      timestampRecebimento: payload.timestamp,
      tipoSenha: 'padrao',
      flagGeofence:
        payload.flagGeofence ?? prevCheckin?.flagGeofence ?? 'ok',
      origemRede: 'online',
    };

    const updatedTurno = { ...turno, ultimoCheckin: updatedCheckin };
    const updated = [...current];
    updated[index] = updatedTurno;
    this.turnos.set(updated);

    this.atualizarMarkerIndividual(updatedTurno);
  }

  private handleMapaStatusChange(payload: StatusChangePayload): void {
    const current = this.turnos();
    const index = current.findIndex((t) => t.id === payload.turnoId);
    if (index === -1) return;

    if (payload.status === 'finalizado') {
      this.removerMarker(payload.turnoId);
      const updated = [...current];
      updated.splice(index, 1);
      this.turnos.set(updated);
      return;
    }

    const updated = [...current];
    updated[index] = { ...updated[index], status: payload.status };
    this.turnos.set(updated);

    this.atualizarMarkerIndividual(updated[index]);
  }

  private atualizarMarkerIndividual(turno: TurnoComPosicao): void {
    if (!this.pinsLayer || !this.map) return;
    const checkin = turno.ultimoCheckin;
    if (!checkin) return;

    const lat = checkin.latitude;
    const lng = checkin.longitude;
    if (lat === undefined || lng === undefined) return;

    const agora = Date.now();
    const color = this.determinarCor(turno, checkin, agora);
    const icon = this.criarPinIcon(color, turno);
    const popupHtml = this.criarPopupHtml(turno, checkin, agora, color);

    let marker = this.markerMap.get(turno.id);

    if (marker) {
      marker.setLatLng([lat, lng]);
      marker.setIcon(icon);
      marker.unbindPopup();
      marker.bindPopup(popupHtml, { maxWidth: 280, className: 'mapa-popup' });
    } else {
      marker = L.marker([lat, lng], { icon }).addTo(this.pinsLayer);
      marker.bindPopup(popupHtml, { maxWidth: 280, className: 'mapa-popup' });
      this.markerMap.set(turno.id, marker);
    }
  }

  private removerMarker(turnoId: string): void {
    const marker = this.markerMap.get(turnoId);
    if (marker) {
      this.pinsLayer?.removeLayer(marker);
      this.markerMap.delete(turnoId);
    }
  }

  private carregarDados(): void {
    this.loading.set(true);
    this.error.set(null);

    this.turnosService
      .listarMapa()
      .pipe(
        takeUntil(this.destroy$),
        catchError((err) => {
          this.error.set(
            err.message ?? 'Erro ao carregar dados do mapa.',
          );
          this.loading.set(false);
          return [];
        }),
      )
      .subscribe((dados) => {
        this.turnos.set(dados);
        this.loading.set(false);
        setTimeout(() => this.atualizarMapa(), 100);
      });
  }

  private iniciarMapa(): void {
    const container = this.mapContainer();
    if (!container) return;

    this.map = L.map(container.nativeElement, {
      center: [-14.235, -51.9253],
      zoom: 4,
      zoomControl: true,
      attributionControl: true,
      scrollWheelZoom: true,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(this.map);

    this.pinsLayer = L.layerGroup().addTo(this.map);
  }

  private atualizarMapa(): void {
    if (!this.map || !this.pinsLayer) return;
    this.pinsLayer.clearLayers();
    this.markerMap.clear();

    const agora = Date.now();
    const coords: [number, number][] = [];

    for (const turno of this.turnosComPosicao) {
      const checkin = turno.ultimoCheckin!;
      const lat = checkin.latitude;
      const lng = checkin.longitude;
      if (lat === undefined || lng === undefined) continue;

      coords.push([lat, lng]);

      const color = this.determinarCor(turno, checkin, agora);
      const icon = this.criarPinIcon(color, turno);

      const marker = L.marker([lat, lng], { icon }).addTo(this.pinsLayer);
      this.markerMap.set(turno.id, marker);

      const popupHtml = this.criarPopupHtml(turno, checkin, agora, color);
      marker.bindPopup(popupHtml, { maxWidth: 280, className: 'mapa-popup' });
    }

    if (coords.length > 0) {
      const bounds = L.latLngBounds(coords);
      if (coords.length === 1) {
        this.map.setView(bounds.getCenter(), 15);
      } else {
        this.map.fitBounds(bounds, { padding: [40, 40] });
      }
    }
  }

  private determinarCor(
    turno: TurnoComPosicao,
    checkin: Checkin,
    agora: number,
  ): PinColor {
    if (turno.status === 'critico') return 'vermelho';

    const minutosDesdeUltimoCheckin =
      (agora - new Date(checkin.timestampCriacao).getTime()) / 60000;

    if (
      turno.fimPrevisto &&
      agora > new Date(turno.fimPrevisto).getTime()
    ) {
      return 'vermelho';
    }

    if (minutosDesdeUltimoCheckin > STALE_MINUTES) {
      return 'cinza';
    }

    if (checkin.flagGeofence === 'desvio_rota') {
      return 'amarelo';
    }

    return 'verde';
  }

  private criarPinIcon(
    color: PinColor,
    turno: TurnoComPosicao,
  ): L.DivIcon {
    const hex = PIN_COLORS[color];
    return L.divIcon({
      className: 'mapa-pin-wrapper',
      html: `
        <div class="mapa-pin" style="--pin-color: ${hex}">
          <div class="mapa-pin__dot"></div>
        </div>
        <div class="mapa-pin__label">${this.escaparHtml(turno.usuarioNome)}</div>
      `,
      iconSize: [150, 40],
      iconAnchor: [12, 20],
      popupAnchor: [0, -20],
    });
  }

  private criarPopupHtml(
    turno: TurnoComPosicao,
    checkin: Checkin,
    agora: number,
    color: PinColor,
  ): string {
    const minutosAtras =
      Math.round(
        (agora - new Date(checkin.timestampCriacao).getTime()) / 60000,
      );
    const tempoRelativo =
      minutosAtras < 1
        ? 'Agora mesmo'
        : minutosAtras === 1
          ? 'Há 1 minuto'
          : `Há ${minutosAtras} minutos`;

    const corLabel: Record<PinColor, string> = {
      verde: 'Normal',
      amarelo: 'Desvio de rota',
      vermelho: 'Crítico / Atrasado',
      cinza: 'Offline',
    };

    return `
      <div class="mapa-popup-content">
        <div class="mapa-popup-content__header">
          <span class="mapa-popup-content__dot" style="--dot-color: ${PIN_COLORS[color]}"></span>
          <strong>${this.escaparHtml(turno.usuarioNome)}</strong>
        </div>
        <div class="mapa-popup-content__info">
          <span class="mapa-popup-content__label">Posto:</span>
          <span>${this.escaparHtml(turno.postoNome)}</span>
        </div>
        <div class="mapa-popup-content__info">
          <span class="mapa-popup-content__label">Status:</span>
          <span>${corLabel[color]}</span>
        </div>
        <div class="mapa-popup-content__info">
          <span class="mapa-popup-content__label">Último check-in:</span>
          <span>${tempoRelativo}</span>
        </div>
        <div class="mapa-popup-content__info">
          <span class="mapa-popup-content__label">Coordenadas:</span>
          <span>${checkin.latitude.toFixed(5)}, ${checkin.longitude.toFixed(5)}</span>
        </div>
        <button class="mapa-popup-content__action" data-turno-id="${turno.id}">
          Ver detalhes do turno
        </button>
      </div>
    `;
  }

  private escaparHtml(texto: string): string {
    return texto
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  onPopupClick(event: Event): void {
    const target = event.target as HTMLElement;
    const button = target.closest('.mapa-popup-content__action');
    if (!button) return;

    const turnoId = button.getAttribute('data-turno-id');
    if (turnoId) {
      this.router.navigate(['/turnos', turnoId]);
    }
  }
}
