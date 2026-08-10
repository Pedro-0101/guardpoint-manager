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
import { Subject, forkJoin } from 'rxjs';
import { takeUntil, catchError } from 'rxjs/operators';
import * as L from 'leaflet';

import { TurnosService } from '../../../turnos/turnos.service';
import { PostosService } from '../../../postos/postos.service';
import { WebSocketService } from '../../../../core/websocket/websocket.service';
import {
  GpsUpdatePayload,
  StatusChangePayload,
} from '../../../../core/websocket/websocket.types';
import { TurnoComPosicao } from '../../../../core/models/turno.model';
import { Checkin } from '../../../../core/models/checkin.model';
import { Posto } from '../../../../core/models/posto.model';
import { EmptyState } from '../../../../shared/components/empty-state/empty-state';
import { ZardSkeletonComponent } from '../../../../shared/components/skeleton/skeleton.component';

type PinColor = 'verde' | 'amarelo' | 'vermelho' | 'cinza' | 'posto';

const STALE_MINUTES = 30;

const PIN_COLORS: Record<PinColor, string> = {
  verde: '#2e7d32',
  amarelo: '#f57f17',
  vermelho: '#c62828',
  cinza: '#78909c',
  posto: '#3b82f6',
};

@Component({
  selector: 'gp-dashboard-mapa',
  imports: [EmptyState, ZardSkeletonComponent],
  templateUrl: './dashboard-mapa.html',
  styleUrl: './dashboard-mapa.scss',
})
export class DashboardMapaComponent implements OnInit, OnDestroy, AfterViewInit {
  private readonly turnosService = inject(TurnosService);
  private readonly postosService = inject(PostosService);
  private readonly ws = inject(WebSocketService);
  private readonly router = inject(Router);
  private readonly destroy$ = new Subject<void>();

  readonly mapContainer = viewChild<ElementRef<HTMLDivElement>>('mapContainer');

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly turnos = signal<TurnoComPosicao[]>([]);
  readonly postos = signal<Posto[]>([]);

  private map: L.Map | null = null;
  private pinsLayer: L.LayerGroup | null = null;
  private postosLayer: L.LayerGroup | null = null;
  private markerMap = new Map<string, L.Marker>();
  private postosCircleMap = new Map<string, L.Circle>();

  get turnosComPosicao(): TurnoComPosicao[] {
    return this.turnos().filter((t) => this.obterPosicao(t) !== null);
  }

  get temDados(): boolean {
    return this.postos().length > 0 || this.turnosComPosicao.length > 0;
  }

  private obterPosicao(turno: TurnoComPosicao): { lat: number; lng: number } | null {
    if (turno.ultimoCheckin) {
      const { latitude, longitude } = turno.ultimoCheckin;
      if (latitude !== undefined && longitude !== undefined) {
        return { lat: latitude, lng: longitude };
      }
    }
    if (turno.posto?.latitude !== undefined && turno.posto?.longitude !== undefined) {
      return { lat: turno.posto.latitude, lng: turno.posto.longitude };
    }
    return null;
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
      .subscribe((payload) => this.handleStatusChange(payload));
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
    if (!turno.id) return;
    this.router.navigate(['/turnos', turno.id]);
  }

  private handleGpsUpdate(payload: GpsUpdatePayload): void {
    const current = this.turnos();
    const index = current.findIndex((t) => t.id === payload.turnoId);
    if (index === -1) return;

    const turno = current[index];
    if (!turno.id) return;
    const prevCheckin = turno.ultimoCheckin;

    const updatedCheckin: Checkin = {
      id: '',
      turnoId: payload.turnoId,
      latitude: payload.latitude,
      longitude: payload.longitude,
      timestampCriacao: payload.timestamp,
      timestampRecebimento: payload.timestamp,
      tipoSenha: 'padrao',
      flagGeofence: payload.flagGeofence ?? prevCheckin?.flagGeofence ?? 'ok',
      origemRede: 'online',
    };

    const updatedTurno = { ...turno, ultimoCheckin: updatedCheckin };
    const updated = [...current];
    updated[index] = updatedTurno;
    this.turnos.set(updated);
    this.atualizarMarkerIndividual(updatedTurno);
  }

  private handleStatusChange(payload: StatusChangePayload): void {
    const current = this.turnos();
    const index = current.findIndex((t) => t.id === payload.turnoId);
    if (index === -1) return;

    const turno = current[index];
    if (!turno.id) return;

    if (payload.status === 'finalizado') {
      this.removerMarker(payload.turnoId);
      const updated = [...current];
      updated.splice(index, 1);
      this.turnos.set(updated);
      return;
    }

    const updated = [...current];
    updated[index] = { ...turno, status: payload.status };
    this.turnos.set(updated);
    this.atualizarMarkerIndividual(updated[index]);
  }

  private atualizarMarkerIndividual(turno: TurnoComPosicao): void {
    if (!this.pinsLayer || !this.map) return;
    if (!turno.id) return;
    const pos = this.obterPosicao(turno);
    if (!pos) return;

    const agora = Date.now();
    const color = this.determinarCor(turno, turno.ultimoCheckin, agora);
    const icon = this.criarPinIcon(color, turno);
    const popupHtml = this.criarPopupHtml(turno, turno.ultimoCheckin, agora, color);

    let marker = this.markerMap.get(turno.id);

    if (marker) {
      marker.setLatLng([pos.lat, pos.lng]);
      marker.setIcon(icon);
      marker.unbindPopup();
      marker.bindPopup(popupHtml, { maxWidth: 280, className: 'dashboard-mapa-popup' });
    } else {
      marker = L.marker([pos.lat, pos.lng], { icon }).addTo(this.pinsLayer);
      marker.bindPopup(popupHtml, { maxWidth: 280, className: 'dashboard-mapa-popup' });
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

    forkJoin({
      turnos: this.turnosService.listarMapa().pipe(
        catchError(() => []),
      ),
      postos: this.postosService.listar({ ativos: 'true' }).pipe(
        catchError(() => []),
      ),
    })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: ({ turnos, postos }) => {
          this.turnos.set(turnos);
          this.postos.set(postos);
          this.loading.set(false);
          setTimeout(() => this.atualizarMapa(), 100);
        },
        error: (err: Error) => {
          this.error.set(err.message ?? 'Erro ao carregar dados do mapa.');
          this.loading.set(false);
        },
      });
  }

  private iniciarMapa(): void {
    const container = this.mapContainer();
    if (!container) return;

    this.map = L.map(container.nativeElement, {
      center: [-14.235, -51.9253],
      zoom: 4,
      zoomControl: false,
      attributionControl: true,
      scrollWheelZoom: true,
    });

    L.control.zoom({ position: 'topright' }).addTo(this.map);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
    }).addTo(this.map);

    this.postosLayer = L.layerGroup().addTo(this.map);
    this.pinsLayer = L.layerGroup().addTo(this.map);
  }

  private atualizarMapa(): void {
    if (!this.map || !this.pinsLayer || !this.postosLayer) return;
    this.postosLayer.clearLayers();
    this.pinsLayer.clearLayers();
    this.markerMap.clear();
    this.postosCircleMap.clear();

    this.desenharPostos();

    const agora = Date.now();
    const coords: [number, number][] = [];

    for (const turno of this.turnosComPosicao) {
      if (!turno.id) continue;
      const pos = this.obterPosicao(turno);
      if (!pos) continue;

      coords.push([pos.lat, pos.lng]);

      const color = this.determinarCor(turno, turno.ultimoCheckin, agora);
      const icon = this.criarPinIcon(color, turno);

      const marker = L.marker([pos.lat, pos.lng], { icon }).addTo(this.pinsLayer);
      this.markerMap.set(turno.id, marker);

      const popupHtml = this.criarPopupHtml(turno, turno.ultimoCheckin, agora, color);
      marker.bindPopup(popupHtml, { maxWidth: 280, className: 'dashboard-mapa-popup' });
    }

    if (coords.length > 0) {
      const bounds = L.latLngBounds(coords);
      if (coords.length === 1) {
        this.map.setView(bounds.getCenter(), 15);
      } else {
        this.map.fitBounds(bounds, { padding: [30, 30] });
      }
    } else {
      const postosCoords = this.postos()
        .filter((p) => p.latitude !== undefined && p.longitude !== undefined)
        .map((p) => [p.latitude, p.longitude] as [number, number]);

      if (postosCoords.length === 1) {
        this.map.setView(postosCoords[0], 14);
      } else if (postosCoords.length > 1) {
        this.map.fitBounds(L.latLngBounds(postosCoords), { padding: [30, 30] });
      }
    }

    this.map.invalidateSize();
  }

  private desenharPostos(): void {
    if (!this.postosLayer) return;

    for (const posto of this.postos()) {
      if (posto.latitude === undefined || posto.longitude === undefined) continue;

      const radius = Math.max(posto.raioM || 100, 50);

      const circle = L.circle([posto.latitude, posto.longitude], {
        radius,
        color: '#3b82f6',
        fillColor: '#3b82f6',
        fillOpacity: 0.06,
        weight: 1.5,
        opacity: 0.3,
      });

      circle.bindTooltip(this.escaparHtml(posto.nome), {
        permanent: true,
        direction: 'center',
        className: 'dashboard-mapa-posto-tooltip',
        offset: [0, 0],
      });

      this.postosLayer.addLayer(circle);
      this.postosCircleMap.set(posto.id, circle);
    }
  }

  private determinarCor(
    turno: TurnoComPosicao,
    checkin: Checkin | null,
    agora: number,
  ): PinColor {
    if (turno.status === 'critico') return 'vermelho';

    if (turno.fimPrevisto && agora > new Date(turno.fimPrevisto).getTime()) {
      return 'vermelho';
    }

    if (!checkin) return 'posto';

    const minutosDesdeUltimoCheckin =
      (agora - new Date(checkin.timestampCriacao).getTime()) / 60000;

    if (minutosDesdeUltimoCheckin > STALE_MINUTES) {
      return 'cinza';
    }

    if (checkin.flagGeofence === 'desvio_rota') {
      return 'amarelo';
    }

    return 'verde';
  }

  private criarPinIcon(color: PinColor, turno: TurnoComPosicao): L.DivIcon {
    const hex = PIN_COLORS[color];
    const isPostoFallback = color === 'posto';
    const dotClass = isPostoFallback
      ? 'mapa-pin__dot mapa-pin__dot--posto'
      : 'mapa-pin__dot';
    return L.divIcon({
      className: 'mapa-pin-wrapper',
      html: `
        <div class="mapa-pin" style="--pin-color: ${hex}">
          <div class="${dotClass}"></div>
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
    checkin: Checkin | null,
    agora: number,
    color: PinColor,
  ): string {
    const corLabel: Record<PinColor, string> = {
      verde: 'Normal',
      amarelo: 'Desvio de rota',
      vermelho: 'Crítico / Atrasado',
      cinza: 'Offline',
      posto: 'Sem check-in',
    };

    let tempoHtml: string;
    let coordHtml: string;

    if (checkin) {
      const minutosAtras = Math.round(
        (agora - new Date(checkin.timestampCriacao).getTime()) / 60000,
      );
      const tempoRelativo =
        minutosAtras < 1
          ? 'Agora mesmo'
          : minutosAtras === 1
            ? 'Há 1 minuto'
            : `Há ${minutosAtras} minutos`;
      tempoHtml = `<span>${tempoRelativo}</span>`;
      coordHtml = `<span>${checkin.latitude.toFixed(5)}, ${checkin.longitude.toFixed(5)}</span>`;
    } else {
      tempoHtml =
        '<span style="color: var(--text-tertiary);">Nenhum check-in registrado</span>';
      coordHtml = `<span>${turno.posto?.latitude?.toFixed(5) ?? '?'}, ${turno.posto?.longitude?.toFixed(5) ?? '?'} (posto)</span>`;
    }

    return `
      <div class="mapa-popup-content">
        <div class="mapa-popup-content__header">
          <span class="mapa-popup-content__dot" style="--dot-color: ${PIN_COLORS[color]}"></span>
          <strong>${this.escaparHtml(turno.usuarioNome)}</strong>
        </div>
        <div class="mapa-popup-content__body">
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
            ${tempoHtml}
          </div>
          <div class="mapa-popup-content__info">
            <span class="mapa-popup-content__label">Coordenadas:</span>
            ${coordHtml}
          </div>
        </div>
        <button class="mapa-popup-content__action" data-turno-id="${turno.id}">
          Ver detalhes
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
}
