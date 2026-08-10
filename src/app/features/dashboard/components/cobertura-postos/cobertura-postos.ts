import {
  Component,
  input,
  viewChild,
  ElementRef,
  OnChanges,
  SimpleChanges,
} from '@angular/core';
import { NgIcon } from '@ng-icons/core';
import { Chart, ChartConfiguration, registerables } from 'chart.js';
import { PostoSemCobertura } from '../../dashboard.types';

Chart.register(...registerables);

@Component({
  selector: 'gp-cobertura-postos',
  imports: [NgIcon],
  templateUrl: './cobertura-postos.html',
  styleUrl: './cobertura-postos.scss',
})
export class CoberturaPostos implements OnChanges {
  postosCobertos = input(0);
  postosTotal = input(0);
  postosSemCobertura = input<PostoSemCobertura[]>([]);

  private readonly canvasRef = viewChild<ElementRef<HTMLCanvasElement>>('donutCanvas');
  private chart: Chart | null = null;

  get percentual(): number {
    const total = this.postosTotal();
    if (total === 0) return 0;
    return Math.round((this.postosCobertos() / total) * 100);
  }

  get label(): string {
    return `${this.postosCobertos()}/${this.postosTotal()}`;
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['postosCobertos'] || changes['postosTotal']) {
      this.renderChart();
    }
  }

  private renderChart(): void {
    const canvas = this.canvasRef()?.nativeElement;
    if (!canvas) return;

    if (this.chart) {
      this.chart.destroy();
    }

    const cobertos = this.postosCobertos();
    const total = this.postosTotal();
    const descobertos = Math.max(total - cobertos, 0);

    const config: ChartConfiguration<'doughnut'> = {
      type: 'doughnut',
      data: {
        datasets: [
          {
            data: [cobertos, descobertos],
            backgroundColor: [
              'oklch(0.52 0.15 145)',
              'oklch(0.92 0.004 286.32)',
            ],
            borderColor: [
              'oklch(0.52 0.15 145)',
              'oklch(0.92 0.004 286.32)',
            ],
            borderWidth: 0,
            borderRadius: cobertos === total && total > 0 ? 0 : 4,
          },
        ],
      },
      options: {
        cutout: '75%',
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          tooltip: {
            callbacks: {
              label: (ctx) => {
                const value = ctx.raw as number;
                const datasetIndex = ctx.datasetIndex;
                if (datasetIndex === 0) {
                  return `${value} coberto${value !== 1 ? 's' : ''}`;
                }
                return `${value} descoberto${value !== 1 ? 's' : ''}`;
              },
            },
          },
          legend: { display: false },
        },
      },
    };

    this.chart = new Chart(canvas, config);
  }
}
