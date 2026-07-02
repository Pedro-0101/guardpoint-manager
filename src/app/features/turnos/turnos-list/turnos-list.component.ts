import { Component, inject, signal, OnInit, OnDestroy } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { Router } from '@angular/router';
import { Subject, combineLatest } from 'rxjs';
import { takeUntil, debounceTime, distinctUntilChanged, startWith, map } from 'rxjs/operators';
import { TurnosService } from '../turnos.service';
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
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatInputModule,
    MatFormFieldModule,
    MatSelectModule,
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

  readonly displayedColumns: string[] = [
    'usuarioNome',
    'postoNome',
    'status',
    'inicio',
    'acoes',
  ];

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
