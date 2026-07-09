import { Component, computed, inject, signal } from '@angular/core';
import { ZardDialogRef } from '@/shared/components/dialog/dialog-ref';
import { Z_MODAL_DATA } from '@/shared/components/dialog/dialog.service';
import { ZardButtonComponent } from '@/shared/components/button/button.component';
import { SenhaVigia } from '../../core/models/senha.model';
import { ConfigEscalonamento } from '../../core/models/config.model';

export interface VigiaSenhasExportData {
  usuarioNome: string;
  senhas: SenhaVigia[];
  escalonamentos: ConfigEscalonamento[];
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('pt-BR');
}

function escalonamentoLabel(esc: ConfigEscalonamento): string {
  return esc.descricao || (esc.sistema ? 'Sistema' : `Nível ${esc.atrasoMinutos}min`);
}

@Component({
  selector: 'gp-vigia-senhas-export-dialog',
  imports: [ZardButtonComponent],
  template: `
    <div class="space-y-4">
      <div class="max-h-[400px] overflow-y-auto rounded-lg border bg-muted/30 p-4">
        <pre class="text-sm font-mono whitespace-pre-wrap">{{ textoExportado() }}</pre>
      </div>

      <div class="flex items-center gap-2">
        <button z-button zSize="sm" zType="outline" (click)="copiar()">
          {{ copiado() ? 'Copiado!' : 'Copiar para área de transferência' }}
        </button>
        <button z-button zSize="sm" zType="outline" (click)="imprimir()">
          Imprimir
        </button>
      </div>
    </div>
  `,
})
export class VigiaSenhasExportDialog {
  private readonly data = inject<VigiaSenhasExportData>(Z_MODAL_DATA);
  private readonly dialogRef = inject(ZardDialogRef<VigiaSenhasExportDialog>);

  readonly copiado = signal(false);

  private readonly escalonamentoMap = computed(() => {
    const map = new Map<string, ConfigEscalonamento>();
    for (const e of this.data.escalonamentos) {
      map.set(e.id, e);
    }
    return map;
  });

  readonly textoExportado = computed(() => {
    const { usuarioNome, senhas } = this.data;
    const now = formatDate(new Date());
    const lines: string[] = [];

    const ok = senhas.find((s) => s.tipo === 'ok') ?? null;
    const emergencia = senhas.find((s) => s.tipo === 'emergencia') ?? null;
    const customizadas = senhas.filter((s) => s.tipo === 'customizada');

    const ordenadas: SenhaVigia[] = [];
    if (ok) ordenadas.push(ok);
    if (emergencia) ordenadas.push(emergencia);
    ordenadas.push(...customizadas);

    lines.push('RELATÓRIO DE SENHAS DO VIGIA');
    lines.push('='.repeat(45));
    lines.push(`Vigia: ${usuarioNome}`);
    lines.push(`Data: ${now}`);
    lines.push('');

    let idx = 0;
    for (const senha of ordenadas) {
      idx++;
      lines.push('─'.repeat(45));

      const tipo =
        senha.tipo === 'ok'
          ? 'SENHA OK'
          : senha.tipo === 'emergencia'
            ? 'SENHA DE EMERGÊNCIA'
            : 'SENHA CUSTOMIZADA';

      lines.push(`${idx}. ${tipo}`);
      lines.push(`   Código: ${senha.codigo}`);

      if (senha.escalonamentoId) {
        const esc = this.escalonamentoMap().get(senha.escalonamentoId);
        if (esc) {
          lines.push(`   Escalonamento: ${escalonamentoLabel(esc)} (${esc.atrasoMinutos} min)`);
        } else {
          lines.push(`   Escalonamento: ID ${senha.escalonamentoId}`);
        }
      } else {
        lines.push(`   Escalonamento: Nenhum`);
      }
    }

    lines.push('');
    lines.push(`Total: ${senhas.length} senha${senhas.length !== 1 ? 's' : ''}`);
    lines.push('─'.repeat(45));

    return lines.join('\n');
  });

  copiar(): void {
    navigator.clipboard.writeText(this.textoExportado()).then(() => {
      this.copiado.set(true);
      setTimeout(() => this.copiado.set(false), 2000);
    });
  }

  imprimir(): void {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Senhas do Vigia — ${this.data.usuarioNome}</title>
<style>body{font-family:monospace;white-space:pre-wrap;padding:2rem;font-size:14px;line-height:1.6}</style>
</head>
<body><pre>${this.textoExportado()}</pre></body>
</html>`);
      printWindow.document.close();
      printWindow.focus();
      printWindow.print();
    }
  }

  fechar(): void {
    this.dialogRef.close();
  }
}
