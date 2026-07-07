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
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Subject } from 'rxjs';
import { debounceTime, takeUntil } from 'rxjs/operators';
import * as L from 'leaflet';
import { PostosService } from './postos.service';
import { NotificationService } from '../../core/services/notification.service';
import { ZardInputDirective } from '@/shared/components/input';
import {
  ZardFormFieldComponent,
  ZardFormLabelComponent,
  ZardFormControlComponent,
  ZardFormMessageComponent,
} from '@/shared/components/form';
import { ZardDialogRef } from '@/shared/components/dialog/dialog-ref';
import { Z_MODAL_DATA } from '@/shared/components/dialog/dialog.service';
import { Posto } from '../../core/models/posto.model';
import { parseCoordenadas } from '../../shared/utils/coordenadas.util';

/**
 * Formulário de criação e edição de Postos.
 *
 * ## Padrão de formulário
 *
 * Este componente segue o padrão de formulário reativo do GuardPoint, alinhado ao
 * `UsuariosFormComponent`. O template utiliza os componentes de form do Zard UI:
 *
 * - `<z-form-field>` — agrupa label, controle e mensagem com espaçamento consistente.
 * - `<z-form-label [zRequired]="true">` — exibe o rótulo com indicador de obrigatoriedade.
 * - `<z-form-control>` — wrapper semântico ao redor do `<input z-input class="w-full" />`.
 * - `<z-form-message [zError]="true">` — mensagem de erro (exibida apenas quando o campo
 *   está inválido **e** foi tocado).
 * - `<z-form-message>` (sem `[zError]`) — texto descritivo exibido como ajuda enquanto o
 *   campo está válido ou intocado, explicando a finalidade do campo ao usuário.
 *
 * O `<form>` raiz usa `class="space-y-6"` para espaçamento vertical uniforme entre os
 * campos. Campos lado a lado (ex.: latitude/longitude) utilizam `grid grid-cols-2 gap-4`.
 * Todos os inputs possuem `class="w-full"` para ocupar a largura total do container.
 *
 * O mapa Leaflet (`#mapContainer`) é injetado via `viewChild` e gerenciado manualmente
 * no ciclo de vida (`AfterViewInit` / `OnDestroy`), ficando fora do fluxo dos componentes
 * Zard por ser um elemento de terceiros.
 */
const CENTRO_BRASIL: L.LatLngExpression = [-14.235, -51.9253];

@Component({
  selector: 'gp-postos-form',
  imports: [
    ReactiveFormsModule,
    ZardInputDirective,
    ZardFormFieldComponent,
    ZardFormLabelComponent,
    ZardFormControlComponent,
    ZardFormMessageComponent,
  ],
  templateUrl: './postos-form.component.html',
  styleUrl: './postos-form.component.scss',
})
export class PostosFormComponent implements OnInit, AfterViewInit, OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly postosService = inject(PostosService);
  private readonly dialogRef = inject(ZardDialogRef<PostosFormComponent>);
  private readonly notification = inject(NotificationService);
  readonly data = inject<Posto | null>(Z_MODAL_DATA, { optional: true }) ?? null;

  readonly mapContainer = viewChild<ElementRef<HTMLDivElement>>('mapContainer');

  readonly loading = signal(false);
  readonly isEdit = signal(false);

  private readonly destroy$ = new Subject<void>();
  private map: L.Map | null = null;
  private marker: L.Marker | null = null;
  private circulo: L.Circle | null = null;
  private manterVistaAtual = false;

  form = this.fb.nonNullable.group({
    nome: ['', [Validators.required, Validators.minLength(3)]],
    latitude: [0, [Validators.required, Validators.min(-90), Validators.max(90)]],
    longitude: [0, [Validators.required, Validators.min(-180), Validators.max(180)]],
    raioM: [100, [Validators.required, Validators.min(10), Validators.max(5000)]],
    ativo: [true],
  });

  ngOnInit(): void {
    if (this.data) {
      this.isEdit.set(true);
      this.form.patchValue({
        nome: this.data.nome,
        latitude: this.data.latitude,
        longitude: this.data.longitude,
        raioM: this.data.raioM,
        ativo: this.data.ativo,
      });
    }

    this.form.valueChanges
      .pipe(debounceTime(150), takeUntil(this.destroy$))
      .subscribe(() => this.atualizarCamadas());
  }

  ngAfterViewInit(): void {
    this.iniciarMapa();
    // O container está dentro de um MatDialog em animação; o Leaflet precisa
    // recalcular o tamanho depois que o dialog assume as dimensões finais.
    setTimeout(() => {
      this.map?.invalidateSize();
      this.atualizarCamadas();
    }, 150);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    if (this.map) {
      this.map.remove();
      this.map = null;
    }
  }

  submit(): void {
    if (this.loading()) return;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    const data = this.form.getRawValue();

    const request$ = this.isEdit()
      ? this.postosService.atualizar(this.data!.id, data)
      : this.postosService.criar(data);

    request$.subscribe({
      next: () => {
        this.loading.set(false);
        this.notification.success(
          this.isEdit() ? 'Posto atualizado com sucesso.' : 'Posto criado com sucesso.'
        );
        this.dialogRef.close(true);
      },
      error: (err) => {
        this.loading.set(false);
        this.notification.error(
          err.message ?? 'Erro ao salvar posto.'
        );
      },
    });
  }

  onColarCoordenadas(event: ClipboardEvent): void {
    const texto = event.clipboardData?.getData('text') ?? '';
    const coords = parseCoordenadas(texto);
    if (!coords) return;

    event.preventDefault();
    this.aplicarCoordenadas(coords.latitude, coords.longitude, { centralizar: true });
  }

  private iniciarMapa(): void {
    const container = this.mapContainer();
    if (!container) return;

    this.map = L.map(container.nativeElement, {
      center: CENTRO_BRASIL,
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

    this.map.on('click', (e: L.LeafletMouseEvent) => {
      this.aplicarCoordenadas(e.latlng.lat, e.latlng.lng, { centralizar: false });
    });
  }

  private aplicarCoordenadas(
    lat: number,
    lng: number,
    opts: { centralizar: boolean },
  ): void {
    this.manterVistaAtual = !opts.centralizar;
    this.form.patchValue({
      latitude: Number(lat.toFixed(6)),
      longitude: Number(lng.toFixed(6)),
    });
    this.form.controls.latitude.markAsDirty();
    this.form.controls.longitude.markAsDirty();
  }

  private atualizarCamadas(): void {
    if (!this.map) return;

    const { latitude, longitude, raioM } = this.form.getRawValue();
    const coordsValidas =
      this.form.controls.latitude.valid && this.form.controls.longitude.valid;
    // 0,0 é o valor default do formulário, não uma posição escolhida.
    const temPosicao = coordsValidas && !(latitude === 0 && longitude === 0);

    if (!temPosicao) {
      this.removerCamadas();
      return;
    }

    const pos: L.LatLngExpression = [latitude, longitude];
    const raio = Number.isFinite(raioM) && raioM > 0 ? raioM : 0;

    if (!this.marker) {
      this.marker = L.marker(pos, {
        icon: this.criarPinIcon(),
        draggable: true,
      }).addTo(this.map);
      this.marker.on('dragend', () => {
        const novaPos = this.marker!.getLatLng();
        this.aplicarCoordenadas(novaPos.lat, novaPos.lng, { centralizar: false });
      });
    } else {
      this.marker.setLatLng(pos);
    }

    if (!this.circulo) {
      this.circulo = L.circle(pos, {
        radius: raio,
        color: '#1a237e',
        weight: 2,
        fillColor: '#534bae',
        fillOpacity: 0.15,
      }).addTo(this.map);
    } else {
      this.circulo.setLatLng(pos);
      this.circulo.setRadius(raio);
    }

    if (this.manterVistaAtual) {
      this.manterVistaAtual = false;
    } else if (raio > 0) {
      this.map.fitBounds(this.circulo.getBounds(), { padding: [24, 24], maxZoom: 17 });
    } else {
      this.map.setView(pos, Math.max(this.map.getZoom(), 15));
    }
  }

  private removerCamadas(): void {
    if (this.marker) {
      this.marker.remove();
      this.marker = null;
    }
    if (this.circulo) {
      this.circulo.remove();
      this.circulo = null;
    }
  }

  private criarPinIcon(): L.DivIcon {
    return L.divIcon({
      className: 'posto-form-pin-wrapper',
      html:
        '<div style="width:16px;height:16px;border-radius:50%;background:#1a237e;' +
        'border:3px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,0.4);cursor:grab;"></div>',
      iconSize: [22, 22],
      iconAnchor: [11, 11],
    });
  }
}
