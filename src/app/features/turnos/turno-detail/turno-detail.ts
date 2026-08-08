import {
  Component,
  inject,
  signal,
  OnInit,
  OnDestroy,
  ElementRef,
  viewChild,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { NgIcon } from '@ng-icons/core';
import { Subject, of } from 'rxjs';
import { takeUntil, catchError, finalize } from 'rxjs/operators';
import * as L from 'leaflet';

import { TurnosService } from '../turnos.service';
import { TurnoRevogarDialog } from '../turno-revogar-dialog/turno-revogar-dialog';
import { ZardDialogService } from '@/shared/components/dialog';
import { ZardButtonComponent } from '@/shared/components/button/button.component';
import { ZardSkeletonComponent } from '../../../shared/components/skeleton/skeleton.component';
import { StatusBadge } from '../../../shared/components/status-badge/status-badge';
import { EmptyState } from '../../../shared/components/empty-state/empty-state';
import { PageLayoutComponent } from '../../../shared/components/page-layout/page-layout';
import { AuthService } from '../../../core/auth/auth.service';
import { TurnoDetalhe } from '../../../core/models/turno.model';
import { Checkin } from '../../../core/models/checkin.model';

interface TimelineEntry {
  checkin: Checkin;
  icon: string;
  label: string;
  color: string;
}

const TIPO_CHECKIN_MAP: Record<string, { icon: string; label: string; color: string }> = {
  padrao: { icon: 'lucideClock', label: 'Check-in padrão', color: 'var(--color-info)' },
  coacao: { icon: 'lucideTriangleAlert', label: 'Check-in de coação', color: 'var(--color-destructive)' },
  finalizacao: { icon: 'lucideCircleStop', label: 'Finalização', color: 'var(--text-secondary)' },
  sabotagem: { icon: 'lucideShieldAlert', label: 'Sabotagem', color: 'var(--color-warn)' },
};

@Component({
  selector: 'gp-turno-detail',
  imports: [
    NgIcon,
    ZardButtonComponent,
    ZardSkeletonComponent,
    StatusBadge,
    EmptyState,
    PageLayoutComponent,
  ],
  templateUrl: './turno-detail.html',
  styleUrl: './turno-detail.scss',
})
export class TurnoDetailComponent implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly turnosService = inject(TurnosService);
  private readonly dialog = inject(ZardDialogService);
  private readonly authService = inject(AuthService);
  private readonly destroy$ = new Subject<void>();

  readonly mapContainer = viewChild<ElementRef<HTMLDivElement>>('mapContainer');

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  readonly turno = signal<TurnoDetalhe | null>(null);
  readonly timeline = signal<TimelineEntry[]>([]);

  private map: L.Map | null = null;
  private markersLayer: L.LayerGroup | null = null;

  get podeRevogar(): boolean {
    const role = this.authService.userRole();
    return role === 'admin' || role === 'supervisor';
  }

  get checkins(): Checkin[] {
    return this.turno()?.checkins ?? [];
  }

  ngOnInit(): void {
    this.route.paramMap.pipe(takeUntil(this.destroy$)).subscribe((params) => {
      const id = params.get('id');
      if (id) {
        this.carregarDados(id);
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    if (this.map) {
      this.map.remove();
      this.map = null;
    }
  }

  private carregarDados(id: string): void {
    this.loading.set(true);
    this.error.set(null);

    this.turnosService
      .obter(id)
      .pipe(
        takeUntil(this.destroy$),
        catchError((err) => {
          this.error.set(err.message ?? 'Erro ao carregar turno.');
          return of(null);
        }),
        finalize(() => this.loading.set(false)),
      )
      .subscribe((detalhe) => {
        if (detalhe) {
          this.turno.set(detalhe);
          this.buildTimeline(detalhe.checkins);
          setTimeout(() => this.inicializarOuAtualizarMapa(), 100);
        }
      });
  }

  private buildTimeline(checkins: Checkin[]): void {
    const sorted = [...checkins].sort(
      (a, b) =>
        new Date(a.timestampCriacao).getTime() - new Date(b.timestampCriacao).getTime(),
    );

    const entries: TimelineEntry[] = sorted.map((c) => {
      const config = TIPO_CHECKIN_MAP[c.tipoSenha] ?? {
        icon: 'lucideHelpCircle',
        label: c.tipoSenha,
        color: '#757575',
      };
      return { checkin: c, ...config };
    });

    this.timeline.set(entries);
  }

  private inicializarOuAtualizarMapa(): void {
    if (this.checkins.length === 0) return;

    if (!this.map) {
      this.initMapa();
    }

    if (!this.map || !this.markersLayer) return;

    this.map.invalidateSize();
    this.atualizarMapa();
  }

  private initMapa(): void {
    const container = this.mapContainer();
    if (!container) return;

    this.map = L.map(container.nativeElement, {
      center: [-23.5505, -46.6333],
      zoom: 13,
      zoomControl: false,
      attributionControl: false,
      scrollWheelZoom: true,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
    }).addTo(this.map);

    this.markersLayer = L.layerGroup().addTo(this.map);
  }

  private atualizarMapa(): void {
    if (!this.map || !this.markersLayer) return;

    this.markersLayer.clearLayers();

    const posto = this.turno()?.posto;
    const checkins = this.checkins;

    const allCoords: [number, number][] = [];

    if (posto?.latitude && posto?.longitude && posto.raioM) {
      L.circle([posto.latitude, posto.longitude], {
        radius: posto.raioM,
        color: '#1a73e8',
        fillColor: '#1a73e8',
        fillOpacity: 0.08,
        weight: 2,
        dashArray: '4 3',
      })
        .bindTooltip(`Cerca: ${posto.nome}`, { permanent: false, direction: 'top' })
        .addTo(this.markersLayer);
      allCoords.push([posto.latitude, posto.longitude]);
    }

    if (checkins.length === 0) {
      if (allCoords.length > 0) {
        this.map.fitBounds(L.latLngBounds(allCoords), { padding: [30, 30] });
      }
      return;
    }

    const coords: [number, number][] = checkins
      .filter((c) => c.latitude && c.longitude)
      .map((c) => [c.latitude, c.longitude] as [number, number]);

    allCoords.push(...coords);

    if (coords.length === 0 && allCoords.length === 0) return;

    const lastCheckin = checkins[checkins.length - 1];

    const lastIcon = L.divIcon({
      className: 'turno-detail__marker-last',
      html: '<div class="marker-pin marker-pin--last"></div>',
      iconSize: [28, 28],
      iconAnchor: [14, 14],
    });

    if (lastCheckin.latitude && lastCheckin.longitude) {
      L.marker([lastCheckin.latitude, lastCheckin.longitude], { icon: lastIcon })
        .bindPopup(
          `<strong>Última posição</strong><br>${this.formatarDataHora(lastCheckin.timestampCriacao)}`,
        )
        .addTo(this.markersLayer);
    }

    const bounds = L.latLngBounds(allCoords);
    this.map.fitBounds(bounds, { padding: [30, 30] });
  }

  abrirRevogarDialog(): void {
    const turnoValue = this.turno();
    if (!turnoValue) return;

    const dialogRef = this.dialog.create({
      zContent: TurnoRevogarDialog,
      zWidth: '480px',
      zData: { turno: turnoValue },
      zMaskClosable: false,
      zHideFooter: true,
    });

    dialogRef
      .afterClosed
      .pipe(takeUntil(this.destroy$))
      .subscribe((revogado) => {
        if (revogado) {
          this.router.navigate(['/turnos']);
        }
      });
  }

  formatarDataHora(iso: string): string {
    const date = new Date(iso);
    return date.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  }

  formatarData(iso: string): string {
    const date = new Date(iso);
    return date.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  formatarCoordenada(lat: number, lng: number): string {
    return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
  }

  voltar(): void {
    this.router.navigate(['/turnos']);
  }
}
