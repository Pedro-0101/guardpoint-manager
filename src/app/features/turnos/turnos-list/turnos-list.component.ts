import { Component, inject, signal, OnInit, OnDestroy } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { NgIcon } from '@ng-icons/core';
import { Router } from '@angular/router';
import { Subject, combineLatest } from 'rxjs';
import { takeUntil, debounceTime, distinctUntilChanged, startWith, map } from 'rxjs/operators';
import { TurnosService } from '../turnos.service';
import { ZardTableImports } from '@/shared/components/table';
import { ZardButtonComponent } from '@/shared/components/button/button.component';
import { ZardInputDirective } from '@/shared/components/input';
import { ZardTooltipImports } from '@/shared/components/tooltip';
import { ZardCardComponent } from '@/shared/components/card/card.component';
import { ZardSelectImports } from '@/shared/components/select';
import { ZardSkeletonComponent } from '../../../shared/components/skeleton/skeleton.component';
import { StatusBadge } from '../../../shared/components/status-badge/status-badge';
import { EmptyState } from '../../../shared/components/empty-state/empty-state';
import { PageLayoutComponent } from '../../../shared/components/page-layout/page-layout';
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
    ZardCardComponent,
    ZardSelectImports,
    NgIcon,
    ZardSkeletonComponent,
    StatusBadge,
    EmptyState,
    PageLayoutComponent,
    ...ZardTooltipImports,
  ],
  templateUrl: './turnos-list.component.html',
  styleUrl: './turnos-list.component.scss',
})
export class TurnosListComponent implements OnInit, OnDestroy {
  private readonly turnosService = inject(TurnosService);
  private readonly router = inject(Router);
  private readonly destroy$ = new Subject<void>();

  readonly searchControl = new FormControl('', { nonNullable: true });
  readonly statusControl = new FormControl('', { nonNullable: true });

  readonly statusFilters = STATUS_FILTERS;

  readonly turnos$ = this.turnosService.turnosAtivos$;

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  readonly filteredTurnos$ = combineLatest([
    this.turnos$,
    this.searchControl.valueChanges.pipe(
      debounceTime(300),
      startWith(''),
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
