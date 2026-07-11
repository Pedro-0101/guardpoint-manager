import { Component, inject, signal, OnInit } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { forkJoin, Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { PostosService } from './postos.service';
import { UsuariosService } from '../usuarios/usuarios.service';
import { NotificationService } from '../../core/services/notification.service';
import { ZardComboboxComponent, type ZardComboboxOption } from '@/shared/components/combobox';
import { ZardCardComponent } from '@/shared/components/card/card.component';
import {
  ZardFormFieldComponent,
  ZardFormLabelComponent,
  ZardFormControlComponent,
  ZardFormMessageComponent,
} from '@/shared/components/form';
import { ZardDialogRef } from '@/shared/components/dialog/dialog-ref';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideUserCheck, lucideShield } from '@ng-icons/lucide';
import { Posto } from '../../core/models/posto.model';

interface PostoVinculo {
  id: string;
  nome: string;
  latitude: number;
  longitude: number;
  raioM: number;
  vinculado: boolean;
  vinculadoOriginal: boolean;
}

@Component({
  selector: 'gp-postos-vinculo-supervisor',
  imports: [
    ReactiveFormsModule,
    ZardComboboxComponent,
    ZardCardComponent,
    ZardFormFieldComponent,
    ZardFormLabelComponent,
    ZardFormControlComponent,
    ZardFormMessageComponent,
    NgIcon,
  ],
  templateUrl: './postos-vinculo-supervisor.component.html',
  viewProviders: [provideIcons({ lucideUserCheck, lucideShield })],
})
export class PostosVinculoSupervisorComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly postosService = inject(PostosService);
  private readonly usuariosService = inject(UsuariosService);
  private readonly dialogRef = inject(ZardDialogRef<PostosVinculoSupervisorComponent>);
  private readonly notification = inject(NotificationService);

  readonly loading = signal(false);
  readonly carregandoPostos = signal(false);
  readonly supervisorSelecionado = signal<ZardComboboxOption | null>(null);
  readonly supervisores = signal<ZardComboboxOption[]>([]);
  readonly postos = signal<PostoVinculo[]>([]);
  readonly vinculosModificados = signal(false);

  readonly supervisoresCarregados = signal(false);

  form = this.fb.nonNullable.group({
    supervisorId: ['', Validators.required],
  });

  ngOnInit(): void {
    this.carregarSupervisores();
  }

  private carregarSupervisores(): void {
    this.usuariosService.listar().subscribe({
      next: (users) => {
        const supervisores = users.filter(
          (u) => u.ativo && u.cargo === 'supervisor'
        );
        this.supervisores.set(
          supervisores.map((u) => ({
            value: u.id,
            label: `${u.nome} (Supervisor)`,
          }))
        );
        this.supervisoresCarregados.set(true);
      },
      error: () => {
        this.notification.error('Erro ao carregar usuários.');
        this.supervisoresCarregados.set(true);
      },
    });
  }

  onSupervisorChange(option: ZardComboboxOption): void {
    this.supervisorSelecionado.set(option);
    this.carregarVinculos(option.value);
  }

  private carregarVinculos(supervisorId: string): void {
    this.carregandoPostos.set(true);

    forkJoin({
      postos: this.postosService.listar({ ativos: 'true' }).pipe(
        catchError(() => {
          this.notification.error('Erro ao carregar postos.');
          return of([] as Posto[]);
        })
      ),
      vinculados: this.postosService.listarPostosPorSupervisor(supervisorId).pipe(
        catchError(() => {
          this.notification.error('Erro ao carregar vínculos do supervisor.');
          return of([] as string[]);
        })
      ),
    }).subscribe({
      next: ({ postos, vinculados }) => {
        const vinculadosSet = new Set(vinculados);
        this.postos.set(
          postos.map((p) => ({
            id: p.id,
            nome: p.nome,
            latitude: p.latitude,
            longitude: p.longitude,
            raioM: p.raioM,
            vinculado: vinculadosSet.has(p.id),
            vinculadoOriginal: vinculadosSet.has(p.id),
          }))
        );
        this.vinculosModificados.set(false);
        this.carregandoPostos.set(false);
      },
      error: () => {
        this.carregandoPostos.set(false);
      },
    });
  }

  toggleVinculo(posto: PostoVinculo): void {
    posto.vinculado = !posto.vinculado;
    this.verificarModificacoes();
  }

  private verificarModificacoes(): void {
    const modified = this.postos().some((p) => p.vinculado !== p.vinculadoOriginal);
    this.vinculosModificados.set(modified);
  }

  submit(): void {
    if (this.loading()) return;

    const supervisor = this.supervisorSelecionado();
    if (!supervisor) return;

    this.loading.set(true);
    const operacoes: Observable<unknown>[] = [];

    for (const posto of this.postos()) {
      if (posto.vinculado && !posto.vinculadoOriginal) {
        operacoes.push(this.postosService.adicionarSupervisor(posto.id, supervisor.value));
      } else if (!posto.vinculado && posto.vinculadoOriginal) {
        operacoes.push(this.postosService.removerSupervisor(posto.id, supervisor.value));
      }
    }

    if (operacoes.length === 0) {
      this.loading.set(false);
      this.dialogRef.close(true);
      return;
    }

    forkJoin(operacoes).subscribe({
      next: () => {
        this.loading.set(false);
        this.notification.success('Vínculos atualizados com sucesso.');
        this.dialogRef.close(true);
      },
      error: (err) => {
        this.loading.set(false);
        this.notification.error(err.message ?? 'Erro ao salvar vínculos.');
      },
    });
  }
}
