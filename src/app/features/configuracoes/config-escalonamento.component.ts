import { Component, inject, signal, OnInit, OnDestroy } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  FormArray,
  FormControl,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { NgIcon } from '@ng-icons/core';
import { Subject, takeUntil } from 'rxjs';
import { ConfiguracoesService } from './configuracoes.service';
import { ConfigNavComponent } from './config-nav.component';
import { ZardButtonComponent } from '@/shared/components/button/button.component';
import { ZardInputDirective } from '@/shared/components/input';
import { LoadingSpinner } from '../../shared/components/loading-spinner/loading-spinner';
import { EmptyState } from '../../shared/components/empty-state/empty-state';
import { NotificationService } from '../../core/services/notification.service';
import { NivelEscalonamento } from '../../core/models/config.model';

interface NivelGroup {
  nivel: FormControl<number>;
  atrasoMinutos: FormControl<number>;
  whatsappPara: FormControl<string>;
  cargoAlvo: FormControl<string>;
}

@Component({
  selector: 'gp-config-escalonamento',
  imports: [
    ReactiveFormsModule,
    ZardInputDirective,
    NgIcon,
    ZardButtonComponent,
    ConfigNavComponent,
    LoadingSpinner,
    EmptyState,
  ],
  templateUrl: './config-escalonamento.component.html',
  styleUrl: './config-escalonamento.component.scss',
})
export class ConfigEscalonamentoComponent implements OnInit, OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly configuracoesService = inject(ConfiguracoesService);
  private readonly notification = inject(NotificationService);
  private readonly destroy$ = new Subject<void>();

  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);

  form = this.fb.group({
    niveis: this.fb.array<FormGroup<NivelGroup>>([]),
  });

  get niveisArray(): FormArray<FormGroup<NivelGroup>> {
    return this.form.controls.niveis;
  }

  ngOnInit(): void {
    this.carregar();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  carregar(): void {
    this.loading.set(true);
    this.error.set(null);

    this.configuracoesService
      .listarNiveisEscalonamento()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (niveis) => {
          this.niveisArray.clear();
          niveis
            .sort((a, b) => a.nivel - b.nivel)
            .forEach((n) => this.niveisArray.push(this.criarNivelGroup(n)));
          this.loading.set(false);
        },
        error: (err) => {
          this.error.set(err.message ?? 'Erro ao carregar níveis de escalonamento.');
          this.loading.set(false);
        },
      });
  }

  adicionarNivel(): void {
    this.niveisArray.push(this.criarNivelGroup());
  }

  removerNivel(index: number): void {
    this.niveisArray.removeAt(index);
  }

  /** Sinaliza na UI se o nível informado se repete em outra linha (regra de UX, não do backend). */
  nivelDuplicado(index: number): boolean {
    const valor = this.niveisArray.at(index).controls.nivel.value;
    return this.niveisArray.controls.filter((g) => g.controls.nivel.value === valor).length > 1;
  }

  salvar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.saving.set(true);
    const niveis = this.niveisArray.getRawValue();

    this.configuracoesService.salvarNiveisEscalonamento(niveis).subscribe({
      next: (niveisSalvos) => {
        this.niveisArray.clear();
        niveisSalvos
          .sort((a, b) => a.nivel - b.nivel)
          .forEach((n) => this.niveisArray.push(this.criarNivelGroup(n)));
        this.saving.set(false);
        this.notification.success('Níveis de escalonamento salvos com sucesso.');
      },
      error: (err) => {
        this.saving.set(false);
        this.notification.error(err.message ?? 'Erro ao salvar níveis de escalonamento.');
      },
    });
  }

  private criarNivelGroup(n?: NivelEscalonamento): FormGroup<NivelGroup> {
    return this.fb.nonNullable.group({
      nivel: [
        n?.nivel ?? this.proximoNivel(),
        [Validators.required, Validators.min(1), Validators.max(5)],
      ],
      atrasoMinutos: [
        n?.atrasoMinutos ?? 15,
        [Validators.required, Validators.min(1), Validators.max(1440)],
      ],
      whatsappPara: [
        n?.whatsappPara ?? '',
        [Validators.required, Validators.maxLength(20), Validators.pattern(/^\+?\d{10,15}$/)],
      ],
      cargoAlvo: [n?.cargoAlvo ?? '', [Validators.maxLength(50)]],
    });
  }

  private proximoNivel(): number {
    const usados = new Set(this.niveisArray.controls.map((g) => g.controls.nivel.value));
    for (let n = 1; n <= 5; n++) {
      if (!usados.has(n)) return n;
    }
    return 1;
  }
}
