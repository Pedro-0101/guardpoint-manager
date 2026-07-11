import {
  Component,
  inject,
  signal,
  effect,
  OnInit,
  OnDestroy,
  ElementRef,
  viewChild,
} from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideUserCheck } from '@ng-icons/lucide';
import { Subject, BehaviorSubject, combineLatest } from 'rxjs';
import { takeUntil, debounceTime, distinctUntilChanged, startWith, map, take } from 'rxjs/operators';
import * as L from 'leaflet';

import { PostosService } from './postos.service';
import { PostosFormComponent } from './postos-form.component';
import { PostosVinculoSupervisorComponent } from './postos-vinculo-supervisor.component';
import { ZardDialogService } from '@/shared/components/dialog';
import { ZardTableImports } from '@/shared/components/table';
import { ZardButtonComponent } from '@/shared/components/button/button.component';
import { ZardInputDirective } from '@/shared/components/input';
import { ZardTooltipImports } from '@/shared/components/tooltip';
import { ZardCardComponent } from '@/shared/components/card/card.component';
import { ZardSegmentedComponent } from '@/shared/components/segmented/segmented.component';
import { ZardSkeletonComponent } from '../../shared/components/skeleton/skeleton.component';
import { StatusBadge } from '../../shared/components/status-badge/status-badge';
import { EmptyState } from '../../shared/components/empty-state/empty-state';
import { PageLayoutComponent } from '../../shared/components/page-layout/page-layout';
import { NotificationService } from '../../core/services/notification.service';
import { Posto } from '../../core/models/posto.model';

@Component({
  selector: 'gp-postos-list',
  imports: [
    AsyncPipe,
    ReactiveFormsModule,
    ZardTableImports,
    ZardButtonComponent,
    ZardInputDirective,
    ZardCardComponent,
    ZardSegmentedComponent,
    NgIcon,
    ZardSkeletonComponent,
    StatusBadge,
    EmptyState,
    PageLayoutComponent,
    ...ZardTooltipImports,
  ],
  templateUrl: './postos-list.component.html',
  styleUrl: './postos-list.component.scss',
  viewProviders: [provideIcons({ lucideUserCheck })],
})
export class PostosListComponent implements OnInit, OnDestroy {
  readonly tabOptions = [
    { value: 'lista', label: 'Lista' },
    { value: 'mapa', label: 'Mapa' },
  ];

  readonly selectedTab = signal<string>('lista');
  private readonly postosService = inject(PostosService);
  private readonly dialog = inject(ZardDialogService);
  private readonly notification = inject(NotificationService);
  private readonly destroy$ = new Subject<void>();

  readonly searchControl = new FormControl('', { nonNullable: true });

  private readonly postosSubject = new BehaviorSubject<Posto[]>([]);
  readonly postos$ = this.postosSubject.asObservable();

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  readonly selectedPosto = signal<Posto | null>(null);

  readonly acoes = {
    vincularSupervisores: () => this.abrirVinculoSupervisor(),
  };

  readonly mapContainer = viewChild<ElementRef<HTMLDivElement>>('mapContainer');

  private map: L.Map | null = null;
  private markersLayer: L.LayerGroup | null = null;

  constructor() {
    effect(() => {
      if (this.selectedTab() === 'mapa') {
        requestAnimationFrame(() => this.atualizarMapa());
      }
    });
  }

  selecionarPosto(posto: Posto): void {
    this.selectedPosto.set(posto);
  }

  limparSelecao(): void {
    this.selectedPosto.set(null);
  }

  readonly filteredPostos$ = combineLatest([
    this.postos$,
    this.searchControl.valueChanges.pipe(
      debounceTime(300),
      startWith(''),
      distinctUntilChanged()
    ),
  ]).pipe(
    map(([postos, term]) => {
      if (!term.trim()) return postos;
      const lower = term.toLowerCase().trim();
      return postos.filter(
        (p) =>
          p.nome.toLowerCase().includes(lower)
      );
    })
  );

  ngOnInit(): void {
    this.carregarPostos();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    if (this.map) {
      this.map.remove();
      this.map = null;
    }
  }

  carregarPostos(): void {
    this.loading.set(true);
    this.error.set(null);

    this.postosService
      .listar()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (postos) => {
          this.postosSubject.next(postos);
          this.loading.set(false);
        },
        error: (err) => {
          this.error.set(err.message ?? 'Erro ao carregar postos.');
          this.loading.set(false);
        },
      });
  }

  abrirFormulario(posto?: Posto): void {
    const isEdit = !!posto;

    const dialogRef = this.dialog.create({
      zTitle: isEdit ? 'Editar posto' : 'Novo posto',
      zContent: PostosFormComponent,
      zWidth: '640px',
      zData: posto ?? null,
      zHideFooter: !isEdit,
      zOkText: isEdit ? 'Salvar' : undefined,
      zOnOk: isEdit
        ? (instance) => {
            instance.submit();
            return false;
          }
        : undefined,
    });

    dialogRef
      .afterClosed
      .pipe(takeUntil(this.destroy$))
      .subscribe((result) => {
        if (result) {
          this.carregarPostos();
        }
      });
  }

  abrirVinculoSupervisor(): void {
    const dialogRef = this.dialog.create({
      zTitle: 'Vincular supervisores aos postos',
      zContent: PostosVinculoSupervisorComponent,
      zWidth: '640px',
      zOkText: 'Salvar vínculos',
      zOnOk: (instance) => {
        instance.submit();
        return false;
      },
    });

    dialogRef
      .afterClosed.pipe(takeUntil(this.destroy$))
      .subscribe((result) => {
        if (result) {
          this.carregarPostos();
        }
      });
  }

  confirmarExclusao(posto: Posto): void {
    this.dialog.create({
      zTitle: 'Inativar posto',
      zDescription: `Tem certeza que deseja inativar o posto "${posto.nome}"?`,
      zWidth: '28rem',
      zOkText: 'Inativar',
      zCancelText: 'Cancelar',
      zOkDestructive: true,
      zOnOk: () => {
        this.postosService.inativar(posto.id).subscribe({
          next: () => {
            this.notification.success(`Posto "${posto.nome}" inativado com sucesso.`);
            this.carregarPostos();
          },
          error: (err) => {
            this.notification.error(
              err.message ?? 'Erro ao inativar posto.'
            );
          },
        });
      },
    });
  }

  private atualizarMapa(): void {
    const containerRef = this.mapContainer();
    if (!containerRef) return;

    const containerEl = containerRef.nativeElement;

    if (this.map) {
      if (this.map.getContainer() !== containerEl) {
        this.map.remove();
        this.map = null;
        this.iniciarMapa(containerRef);
      } else {
        this.map.invalidateSize();
      }
    } else {
      this.iniciarMapa(containerRef);
    }

    this.filteredPostos$
      .pipe(take(1))
      .subscribe((postos) => this.renderizarPostos(postos));
  }

  private iniciarMapa(container: ElementRef<HTMLDivElement>): void {
    this.map = L.map(container.nativeElement, {
      center: [-14.235, -51.9253],
      zoom: 4,
      zoomControl: false,
      attributionControl: true,
      scrollWheelZoom: true,
    });

    L.control.zoom({ position: 'topright' }).addTo(this.map);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(this.map);

    this.markersLayer = L.layerGroup().addTo(this.map);

    this.map.on('click', () => this.limparSelecao());
  }

  private renderizarPostos(postos: Posto[]): void {
    if (!this.map || !this.markersLayer) return;

    this.markersLayer.clearLayers();

    const coords: [number, number][] = [];

    for (const posto of postos) {
      const lat = posto.latitude;
      const lng = posto.longitude;
      if (lat === undefined || lng === undefined) continue;

      coords.push([lat, lng]);

      const color = posto.ativo ? '#2563eb' : '#94a3b8';
      const icon = this.criarPinIcon(color, posto);

      const marker = L.marker([lat, lng], { icon }).addTo(this.markersLayer);

      marker.on('click', () => {
        this.selecionarPosto(posto);
        marker.openPopup();
      });

      L.circle([lat, lng], {
        radius: posto.raioM || 100,
        color,
        fillColor: color,
        fillOpacity: 0.08,
        weight: 1.5,
        opacity: 0.4,
      }).addTo(this.markersLayer);

      const popupHtml = this.criarPopupHtml(posto, color);
      marker.bindPopup(popupHtml, { maxWidth: 280, className: 'postos-mapa-popup' });
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

  private criarPinIcon(color: string, posto: Posto): L.DivIcon {
    return L.divIcon({
      className: 'postos-mapa-pin-wrapper',
      html: `
        <div class="postos-mapa-pin" style="--pin-color: ${color}">
          <div class="postos-mapa-pin__dot"></div>
        </div>
        <div class="postos-mapa-pin__label">${this.escaparHtml(posto.nome)}</div>
      `,
      iconSize: [150, 40],
      iconAnchor: [12, 20],
      popupAnchor: [0, -20],
    });
  }

  private criarPopupHtml(posto: Posto, color: string): string {
    return `
      <div class="postos-mapa-popup-content">
        <div class="postos-mapa-popup-content__header">
          <span class="postos-mapa-popup-content__dot" style="--dot-color: ${color}"></span>
          <strong>${this.escaparHtml(posto.nome)}</strong>
        </div>
        <div class="postos-mapa-popup-content__info">
          <span class="postos-mapa-popup-content__label">Coordenadas:</span>
          <span>${posto.latitude.toFixed(5)}, ${posto.longitude.toFixed(5)}</span>
        </div>
        <div class="postos-mapa-popup-content__info">
          <span class="postos-mapa-popup-content__label">Raio:</span>
          <span>${posto.raioM}m</span>
        </div>
        <div class="postos-mapa-popup-content__info">
          <span class="postos-mapa-popup-content__label">Status:</span>
          <span>${posto.ativo ? 'Ativo' : 'Inativo'}</span>
        </div>
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
