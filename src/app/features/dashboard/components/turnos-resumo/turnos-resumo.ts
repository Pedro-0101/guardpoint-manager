import {
  Component,
  ElementRef,
  input,
  OnChanges,
  SimpleChanges,
  viewChild,
} from '@angular/core';
import {
  Chart,
  ChartConfiguration,
  registerables,
} from 'chart.js';
import { TurnoPorPosto } from '../../dashboard.types';

Chart.register(...registerables);

@Component({
  selector: 'gp-turnos-resumo',
  imports: [],
  templateUrl: './turnos-resumo.html',
  styleUrl: './turnos-resumo.scss',
})
export class TurnosResumo implements OnChanges {
  data = input.required<TurnoPorPosto[]>();

  private readonly canvasRef = viewChild<ElementRef<HTMLCanvasElement>>('chartCanvas');
  private chart: Chart | null = null;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['data']) {
      this.renderChart();
    }
  }

  private renderChart(): void {
    const canvas = this.canvasRef()?.nativeElement;
    if (!canvas) return;

    if (this.chart) {
      this.chart.destroy();
    }

    const turnos = this.data();
    if (!turnos || turnos.length === 0) {
      this.chart = null;
      return;
    }

    const labels = turnos.map((t) => t.postoNome);
    const values = turnos.map((t) => t.quantidade);

    const config: ChartConfiguration<'bar'> = {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: 'Turnos ativos',
            data: values,
            backgroundColor: labels.map(
              (_, i) =>
                i % 2 === 0
                  ? 'rgba(26, 35, 126, 0.75)'
                  : 'rgba(26, 35, 126, 0.50)'
            ),
            borderColor: 'rgba(26, 35, 126, 1)',
            borderWidth: 1,
            borderRadius: 4,
            barPercentage: 0.6,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          tooltip: {
            displayColors: false,
            callbacks: {
              label: (ctx) => {
                const v = ctx.raw as number;
                return `${v} turno${v !== 1 ? 's' : ''}`;
              },
            },
          },
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              precision: 0,
              color: '#757575',
            },
            grid: {
              color: '#f0f0f0',
            },
          },
          x: {
            ticks: {
              color: '#757575',
              maxRotation: 45,
              minRotation: 0,
            },
            grid: {
              display: false,
            },
          },
        },
      },
    };

    this.chart = new Chart(canvas, config);
  }
}
