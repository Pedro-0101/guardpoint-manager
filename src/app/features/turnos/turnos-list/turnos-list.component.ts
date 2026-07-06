import { Component, inject, signal, OnInit, OnDestroy } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { NgIcon } from '@ng-icons/core';
import { Router } from '@angular/router';
import { Subject, combineLatest } from 'rxjs';
import { takeUntil, debounceTime, distinctUntilChanged, startWith, map } from 'rxjs/operators';
import { TurnosService } from '../turnos.service';
import { TurnoFormComponent } from '../turno-form.component';
import { ZardDialogService } from '@/shared/components/dialog';
import { ZardTableImports } from '@/shared/components/table';
import { ZardButtonComponent } from '@/shared/components/button/button.component';
import { ZardInputDirective } from '@/shared/components/input';
import { LoadingSpinner } from '../../../shared/components/loading-spinner/loading-spinner';
import { StatusBadge } from '../../../shared/components/status-badge/status-badge';
import { EmptyState } from '../../../shared/components/empty-state/empty-state';
import { Turno } from '../../../core/models/turno.model';

interface StatusFilter {
  value: string;
  label: string;
}

const STATUS_FILTERS: StatusFilter[] = [
  { value: '', label: 'Todos' },
  { value: 'agendado', label: 'Agendado' },
  { value: 'em_andamento', label: 'Em andamento' },
  { value: 'pausado', label: 'Pausado' },
  { value: 'finalizado', label: 'Finalizado' },
  { value: 'critico', label: 'Crítico' },
];

@Component({
  selector: 'gp-turnos-list',
  imports: [
    AsyncPipe,
    ReactiveFormsModule,
    ZardTableImports,
    ZardButtonComponent,
    ZardInputDirective,
    NgIcon,
    LoadingSpinner,
    StatusBadge,
    EmptyState,
  ],
  templateUrl: './turnos-list.component.html',
  styleUrl: './turnos-list.component.scss',
})
export class TurnosListComponent implements OnInit, OnDestroy {
  private readonly turnosService = inject(TurnosService);
  private readonly router = inject(Router);
  private readonly dialog = inject(ZardDialogService);
  private readonly destroy$ = new Subject<void>();

  readonly searchControl = new FormControl('', { nonNullable: true });
  readonly statusControl = new FormControl('', { nonNullable: true });

  readonly statusFilters = STATUS_FILTERS;

  readonly turnos$ = this.turnosService.turnosAtivos$;

  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  readonly filteredTurnos$ = combineLatest([
    this.turnos$,
    this.searchControl.valueChanges.pipe(
      startWith(''),
      debounceTime(300),
      distinctUntilChanged(),
    ),
    this.statusControl.valueChanges.pipe(startWith('')),
  ]).pipe(
    map(([turnos, busca, status]) => {
      let result = turnos;

      if (status) {
        result = result.filter((t) => t.status === status);
      }

      if (busca.trim()) {
        const lower = busca.toLowerCase().trim();
        result = result.filter(
          (t) =>
            t.usuarioNome.toLowerCase().includes(lower) ||
            t.postoNome.toLowerCase().includes(lower),
        );
      }

      return result;
    }),
  );

  ngOnInit(): void {
    this.carregarTurnos();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  carregarTurnos(): void {
    this.loading.set(true);
    this.error.set(null);

    this.turnosService
      .listar()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.loading.set(false);
        },
        error: (err) => {
          this.error.set(err.message ?? 'Erro ao carregar turnos.');
          this.loading.set(false);
        },
      });
  }

  verDetalhe(turno: Turno): void {
    this.router.navigate(['/turnos', turno.id]);
  }

  abrirFormulario(): void {
    const dialogRef = this.dialog.create({
      zTitle: 'Iniciar turno',
      zContent: TurnoFormComponent,
      zWidth: '520px',
      zOkText: 'Iniciar',
      zOnOk: (instance) => {
        instance.submit();
        return false;
      },
    });

    dialogRef
      .afterClosed
      .pipe(takeUntil(this.destroy$))
      .subscribe((result) => {
        if (result) {
          this.carregarTurnos();
        }
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
}
