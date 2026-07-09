import { Component, inject, signal, OnInit, OnDestroy } from '@angular/core';
import { NgIcon } from '@ng-icons/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { ConfiguracoesService } from './configuracoes.service';
import { UsuariosService } from '../usuarios/usuarios.service';
import { ConfigEscalonamentoFormComponent } from './config-escalonamento-form.component';
import { ZardDialogService } from '@/shared/components/dialog';
import { ZardCardComponent } from '@/shared/components/card/card.component';
import { ZardButtonComponent } from '@/shared/components/button/button.component';
import { ZardSkeletonComponent } from '../../shared/components/skeleton/skeleton.component';
import { PageLayoutComponent } from '../../shared/components/page-layout/page-layout';
import { NotificationService } from '../../core/services/notification.service';
import { ConfigEscalonamento } from '../../core/models/config.model';

@Component({
  selector: 'gp-config-escalonamento',
  imports: [
    NgIcon,
    ZardCardComponent,
    ZardButtonComponent,
    ZardSkeletonComponent,
    PageLayoutComponent,
  ],
  templateUrl: './config-escalonamento.component.html',
})
export class ConfigEscalonamentoComponent implements OnInit, OnDestroy {
  private readonly configuracoesService = inject(ConfiguracoesService);
  private readonly usuariosService = inject(UsuariosService);
  private readonly dialog = inject(ZardDialogService);
  private readonly notification = inject(NotificationService);
  private readonly destroy$ = new Subject<void>();

  readonly config = signal<ConfigEscalonamento | null>(null);
  readonly usuariosMap = signal<Record<string, string>>({});
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  ngOnInit(): void {
    this.carregarDados();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  carregarDados(): void {
    this.loading.set(true);
    this.error.set(null);

    this.configuracoesService
      .obterEscalonamento()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (config) => {
          this.config.set(config);
          this.carregarNomesUsuarios(config.usuarioIds);
          this.loading.set(false);
        },
        error: (err) => {
          this.error.set(err.message ?? 'Erro ao carregar configuração de escalonamento.');
          this.loading.set(false);
        },
      });
  }

  private carregarNomesUsuarios(ids: string[]): void {
    if (ids.length === 0) return;
    this.usuariosService.listar().pipe(takeUntil(this.destroy$)).subscribe({
      next: (usuarios) => {
        const map: Record<string, string> = {};
        for (const u of usuarios) {
          map[u.id] = u.nome;
        }
        this.usuariosMap.set(map);
      },
    });
  }

  abrirFormulario(): void {
    const current = this.config();
    const dialogRef = this.dialog.create({
      zTitle: 'Configurar escalonamento',
      zContent: ConfigEscalonamentoFormComponent,
      zWidth: '520px',
      zData: current ?? null,
      zOkText: 'Salvar',
      zOnOk: (instance) => {
        instance.submit();
        return false;
      },
    });

    dialogRef.afterClosed.pipe(takeUntil(this.destroy$)).subscribe((result) => {
      if (result) {
        this.carregarDados();
      }
    });
  }
}
