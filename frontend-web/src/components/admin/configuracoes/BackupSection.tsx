import { CalendarClock, CheckCircle2, Download, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { SectionShell } from './SectionShell';

export const BackupSection = () => {
  return (
    <SectionShell
      title="Backup & Dados"
      description="Exporte, agende e importe dados do painel."
    >
      <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-500/30 dark:bg-emerald-500/10">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-200">
              Último backup concluído há 2 horas
            </p>
            <p className="mt-0.5 text-xs text-emerald-700/80 dark:text-emerald-300/80">
              14.382 registros · 212 MB ·
              s3://renoveja-backups/daily/2026-04-08.tar.gz
            </p>
            <Progress value={100} className="mt-2 h-1.5" />
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <button
          type="button"
          onClick={() => toast.success('Exportação iniciada')}
          className="group rounded-xl border border-border bg-card p-5 text-left transition-all hover:border-primary/40 hover:shadow-sm"
        >
          <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Download className="h-5 w-5" />
          </div>
          <h4 className="text-sm font-semibold">Exportar todos os dados</h4>
          <p className="mt-1 text-xs text-muted-foreground">
            Gera um arquivo .tar.gz com todos os registros do painel.
          </p>
        </button>

        <button
          type="button"
          onClick={() => toast.info('Agendamento salvo')}
          className="group rounded-xl border border-border bg-card p-5 text-left transition-all hover:border-primary/40 hover:shadow-sm"
        >
          <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <CalendarClock className="h-5 w-5" />
          </div>
          <h4 className="text-sm font-semibold">Agendar backup</h4>
          <p className="mt-1 text-xs text-muted-foreground">
            Backup automático diário às 03:00 com rotação de 30 dias.
          </p>
        </button>

        <button
          type="button"
          onClick={() => toast.info('Seletor de arquivo em breve')}
          className="group rounded-xl border border-border bg-card p-5 text-left transition-all hover:border-primary/40 hover:shadow-sm"
        >
          <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Upload className="h-5 w-5" />
          </div>
          <h4 className="text-sm font-semibold">Importar dados</h4>
          <p className="mt-1 text-xs text-muted-foreground">
            Restaura de um arquivo .tar.gz ou snapshot do S3.
          </p>
        </button>
      </div>

      <div className="rounded-lg border border-border bg-muted/30 p-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold">Retenção</p>
            <p className="text-xs text-muted-foreground">
              30 dias de backups diários + 12 backups mensais.
            </p>
          </div>
          <Button variant="outline" size="sm">
            Ajustar
          </Button>
        </div>
      </div>
    </SectionShell>
  );
};
