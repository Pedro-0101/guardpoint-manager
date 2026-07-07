import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges, viewChild, ElementRef } from '@angular/core';
import { DiaEscalaEntry } from '../../../core/models/escala.model';

interface TimeBlock {
  day: number;
  startSlot: number;
  endSlot: number;
}

interface DayDef {
  apiValue: number;
  label: string;
}

interface SlotDef {
  value: number;
  label: string;
}

const CELL_SIZE_PX = 30;
const HEADER_HEIGHT_PX = 36;
const DAY_LABEL_WIDTH_PX = 72;
const TOTAL_SLOTS = 48;
const SCROLL_THRESHOLD = 40;
const SCROLL_SPEED = 10;

const DAYS: DayDef[] = [
  { apiValue: 1, label: 'Seg' },
  { apiValue: 2, label: 'Ter' },
  { apiValue: 3, label: 'Qua' },
  { apiValue: 4, label: 'Qui' },
  { apiValue: 5, label: 'Sex' },
  { apiValue: 6, label: 'Sab' },
  { apiValue: 0, label: 'Dom' },
];

function slotToTime(slot: number): string {
  const h = Math.floor(slot / 2);
  const m = (slot % 2) * 30;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function timeToSlot(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 2 + (m >= 30 ? 1 : 0);
}

function nextDay(day: number): number {
  return day === 6 ? 0 : day + 1;
}

@Component({
  selector: 'gp-weekly-grid',
  imports: [],
  templateUrl: './weekly-grid.component.html',
  styleUrl: './weekly-grid.component.scss',
})
export class WeeklyGridComponent implements OnChanges {
  @Input() entries: DiaEscalaEntry[] = [];
  @Output() entriesChange = new EventEmitter<DiaEscalaEntry[]>();

  readonly days = DAYS;
  readonly hours = Array.from({ length: 24 }, (_, i) => ({
    label: `${String(i).padStart(2, '0')}:00`,
  }));
  readonly slots: SlotDef[] = Array.from({ length: TOTAL_SLOTS }, (_, i) => ({
    value: i,
    label: i % 2 === 0 ? `${String(Math.floor(i / 2)).padStart(2, '0')}:00` : '',
  }));

  readonly gridScrollEl = viewChild.required<ElementRef<HTMLElement>>('gridScroll');

  blocks: TimeBlock[] = [];
  previewBlock: TimeBlock | null = null;

  private dragging = false;
  private dragDay: number | null = null;
  private dragStartSlot: number | null = null;
  private resizing = false;
  private resizeBlock: TimeBlock | null = null;
  private resizeSide: 'left' | 'right' | null = null;
  private justResized = false;
  private scrollRafId: number | null = null;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['entries']) {
      this.loadBlocks();
    }
  }

  private loadBlocks(): void {
    this.blocks = [];
    this.previewBlock = null;

    for (const entry of this.entries) {
      if (entry.dia_semana_inicio === entry.dia_semana_fim) {
        const endSlot = entry.hora_fim === '00:00'
          ? TOTAL_SLOTS
          : timeToSlot(entry.hora_fim);
        this.blocks.push({
          day: entry.dia_semana_inicio,
          startSlot: timeToSlot(entry.hora_inicio),
          endSlot,
        });
      } else {
        this.blocks.push({
          day: entry.dia_semana_inicio,
          startSlot: timeToSlot(entry.hora_inicio),
          endSlot: TOTAL_SLOTS,
        });
        const endSlot = entry.hora_fim === '00:00'
          ? TOTAL_SLOTS
          : timeToSlot(entry.hora_fim);
        this.blocks.push({
          day: entry.dia_semana_fim,
          startSlot: 0,
          endSlot,
        });
      }
    }
  }

  onMouseDown(day: number, slot: number, event: MouseEvent): void {
    event.preventDefault();
    this.dragging = true;
    this.dragDay = day;
    this.dragStartSlot = slot;
    this.previewBlock = { day, startSlot: slot, endSlot: slot + 1 };

    window.addEventListener('mousemove', this.onWindowMouseMove);
    window.addEventListener('mouseup', this.onWindowMouseUp);
  }

  onMouseEnter(day: number, slot: number): void {
    if (!this.dragging || this.dragDay !== day || this.dragStartSlot === null) return;
    const clampedSlot = Math.min(slot, TOTAL_SLOTS - 1);
    const start = Math.min(this.dragStartSlot, clampedSlot);
    const end = Math.min(Math.max(this.dragStartSlot, clampedSlot) + 1, TOTAL_SLOTS);
    this.previewBlock = { day, startSlot: start, endSlot: end };
  }

  onGridLeave(): void {
    if (this.dragging || this.resizing) {
      this.stopAutoScroll();
    }
  }

  onResizeStart(block: TimeBlock, side: 'left' | 'right', event: MouseEvent): void {
    event.stopPropagation();
    event.preventDefault();
    this.resizing = true;
    this.resizeBlock = block;
    this.resizeSide = side;

    window.addEventListener('mousemove', this.onResizeMouseMove);
    window.addEventListener('mouseup', this.onResizeMouseUp);
  }

  private readonly onResizeMouseMove = (event: MouseEvent): void => {
    if (!this.resizing || !this.resizeBlock || !this.resizeSide) return;

    const scrollEl = this.gridScrollEl().nativeElement;
    const rect = scrollEl.getBoundingClientRect();

    const els = document.elementsFromPoint(event.clientX, event.clientY);
    const target = els.find((el) => el.hasAttribute('data-day')) as HTMLElement | undefined;
    const cellDay = target?.getAttribute('data-day') ?? null;
    const cellSlot = target?.getAttribute('data-slot') ?? null;

    if (cellDay !== null && cellSlot !== null) {
      const day = Number(cellDay);
      const slot = Number(cellSlot);

      if (day === this.resizeBlock!.day) {
        if (this.resizeSide === 'left') {
          const newStart = Math.min(slot, this.resizeBlock!.endSlot - 1);
          this.resizeBlock!.startSlot = Math.max(0, newStart);
        } else {
          const newEnd = Math.max(slot + 1, this.resizeBlock!.startSlot + 1);
          this.resizeBlock!.endSlot = Math.min(newEnd, TOTAL_SLOTS);
        }
      }
    }

    if (event.clientX < rect.left + SCROLL_THRESHOLD) {
      const factor = 1 - (event.clientX - rect.left) / SCROLL_THRESHOLD;
      this.startAutoScroll(-SCROLL_SPEED * factor, scrollEl);
    } else if (event.clientX > rect.right - SCROLL_THRESHOLD) {
      const factor = (event.clientX - (rect.right - SCROLL_THRESHOLD)) / SCROLL_THRESHOLD;
      this.startAutoScroll(SCROLL_SPEED * factor, scrollEl);
    } else {
      this.stopAutoScroll();
    }
  };

  private readonly onResizeMouseUp = (): void => {
    this.stopAutoScroll();
    window.removeEventListener('mousemove', this.onResizeMouseMove);
    window.removeEventListener('mouseup', this.onResizeMouseUp);
    this.resizing = false;
    this.resizeBlock = null;
    this.resizeSide = null;
    this.justResized = true;
    this.emitEntries();
  };

  private readonly onWindowMouseMove = (event: MouseEvent): void => {
    if (!this.dragging) return;
    const scrollEl = this.gridScrollEl().nativeElement;
    const rect = scrollEl.getBoundingClientRect();

    const els = document.elementsFromPoint(event.clientX, event.clientY);
    const target = els.find((el) => el.hasAttribute('data-day')) as HTMLElement | undefined;
    const cellDay = target?.getAttribute('data-day') ?? null;
    const cellSlot = target?.getAttribute('data-slot') ?? null;

    if (cellDay !== null && cellSlot !== null) {
      const day = Number(cellDay);
      const slot = Number(cellSlot);
      if (this.dragDay === day) {
        const clampedSlot = Math.min(slot, TOTAL_SLOTS - 1);
        const start = Math.min(this.dragStartSlot!, clampedSlot);
        const end = Math.min(Math.max(this.dragStartSlot!, clampedSlot) + 1, TOTAL_SLOTS);
        this.previewBlock = { day, startSlot: start, endSlot: end };
      }
    }

    if (event.clientX < rect.left + SCROLL_THRESHOLD) {
      const factor = 1 - (event.clientX - rect.left) / SCROLL_THRESHOLD;
      this.startAutoScroll(-SCROLL_SPEED * factor, scrollEl);
    } else if (event.clientX > rect.right - SCROLL_THRESHOLD) {
      const factor = (event.clientX - (rect.right - SCROLL_THRESHOLD)) / SCROLL_THRESHOLD;
      this.startAutoScroll(SCROLL_SPEED * factor, scrollEl);
    } else {
      this.stopAutoScroll();
    }
  };

  private readonly onWindowMouseUp = (): void => {
    this.stopAutoScroll();
    window.removeEventListener('mousemove', this.onWindowMouseMove);
    window.removeEventListener('mouseup', this.onWindowMouseUp);
    this.finalizeSelection();
  };

  private startAutoScroll(delta: number, el: HTMLElement): void {
    if (this.scrollRafId !== null) return;
    const scroll = () => {
      const maxScroll = el.scrollWidth - el.clientWidth;
      const next = el.scrollLeft + delta;
      el.scrollLeft = Math.max(0, Math.min(next, maxScroll));
      this.scrollRafId = requestAnimationFrame(scroll);
    };
    this.scrollRafId = requestAnimationFrame(scroll);
  }

  private stopAutoScroll(): void {
    if (this.scrollRafId !== null) {
      cancelAnimationFrame(this.scrollRafId);
      this.scrollRafId = null;
    }
  }

  private finalizeSelection(): void {
    if (this.previewBlock && this.previewBlock.endSlot > this.previewBlock.startSlot) {
      this.blocks = this.blocks.filter((b) =>
        b.day !== this.previewBlock!.day
        || b.endSlot <= this.previewBlock!.startSlot
        || b.startSlot >= this.previewBlock!.endSlot
      );
      this.blocks.push({ ...this.previewBlock });
      this.emitEntries();
    }
    this.dragging = false;
    this.dragDay = null;
    this.dragStartSlot = null;
    this.previewBlock = null;
  }

  removeBlock(block: TimeBlock): void {
    if (this.justResized) {
      this.justResized = false;
      return;
    }
    this.blocks = this.blocks.filter((b) => b !== block);
    this.emitEntries();
  }

  getBlocksForDay(day: number): TimeBlock[] {
    return this.blocks.filter((b) => b.day === day);
  }

  isSelected(day: number, slot: number): boolean {
    return this.blocks.some(
      (b) => b.day === day && slot >= b.startSlot && slot < b.endSlot
    );
  }

  isPreview(day: number, slot: number): boolean {
    if (!this.previewBlock) return false;
    return (
      this.previewBlock.day === day &&
      slot >= this.previewBlock.startSlot &&
      slot < this.previewBlock.endSlot
    );
  }

  blockLeft(block: TimeBlock): number {
    return DAY_LABEL_WIDTH_PX + block.startSlot * CELL_SIZE_PX;
  }

  blockWidth(block: TimeBlock): number {
    return (block.endSlot - block.startSlot) * CELL_SIZE_PX;
  }

  rowTop(apiDay: number): number {
    const index = this.days.findIndex((d) => d.apiValue === apiDay);
    return HEADER_HEIGHT_PX + index * CELL_SIZE_PX;
  }

  private emitEntries(): void {
    const result: DiaEscalaEntry[] = [];
    const consumed = new Set<number>();
    const dayOrder = new Map(this.days.map((d) => [d.apiValue, d.apiValue === 0 ? -1 : d.apiValue]));
    const indexed = this.blocks
      .map((b, i) => ({ ...b, idx: i }))
      .sort((a, b) => (dayOrder.get(a.day) ?? 0) - (dayOrder.get(b.day) ?? 0));

    for (const block of indexed) {
      if (consumed.has(block.idx)) continue;

      if (block.endSlot === TOTAL_SLOTS && block.startSlot > 0) {
        const nd = nextDay(block.day);
        const nextBlock = indexed.find(
          (b) => b.day === nd && b.startSlot === 0 && !consumed.has(b.idx)
        );

        if (nextBlock && nd > block.day) {
          consumed.add(block.idx);
          consumed.add(nextBlock.idx);
          result.push({
            dia_semana_inicio: block.day,
            dia_semana_fim: nd,
            hora_inicio: slotToTime(block.startSlot),
            hora_fim: slotToTime(nextBlock.endSlot),
          });
          continue;
        }
      }

      consumed.add(block.idx);
      result.push({
        dia_semana_inicio: block.day,
        dia_semana_fim: block.day,
        hora_inicio: slotToTime(block.startSlot),
        hora_fim: block.endSlot === TOTAL_SLOTS ? '24:00' : slotToTime(block.endSlot),
      });
    }

    this.entriesChange.emit(result);
  }

  formatBlockLabel(block: TimeBlock): string {
    const end =
      block.endSlot === TOTAL_SLOTS
        ? '24:00'
        : slotToTime(block.endSlot);
    return `${slotToTime(block.startSlot)} - ${end}`;
  }
}
