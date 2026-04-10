import { Copy, KeyRound, Plus, RefreshCw, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { MOCK_API_KEYS, MOCK_WEBHOOKS } from './mockData';
import { SectionShell } from './SectionShell';

export const ApiWebhooksSection = () => {
  return (
    <SectionShell
      title="API & Webhooks"
      description="Credenciais programáticas para integrações externas."
      actions={
        <Button size="sm" onClick={() => toast.success('Nova chave gerada')}>
          <Plus className="mr-2 h-4 w-4" /> Nova chave
        </Button>
      }
    >
      <div className="space-y-3">
        <h4 className="flex items-center gap-2 text-sm font-semibold">
          <KeyRound className="h-4 w-4" /> API Keys
        </h4>
        <div className="overflow-hidden rounded-lg border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead className="hidden md:table-cell">Chave</TableHead>
                <TableHead className="hidden sm:table-cell">Criada</TableHead>
                <TableHead>Última utilização</TableHead>
                <TableHead className="w-24" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {MOCK_API_KEYS.map((k) => (
                <TableRow key={k.id}>
                  <TableCell className="text-sm font-medium">
                    {k.name}
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <code className="rounded bg-muted px-2 py-1 text-xs">
                      {k.maskedKey}
                    </code>
                  </TableCell>
                  <TableCell className="hidden text-xs text-muted-foreground sm:table-cell">
                    {k.createdAt}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {k.lastUsed}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        aria-label="Copiar"
                        onClick={() => toast.success('Chave copiada')}
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        aria-label="Regenerar"
                        onClick={() => toast.success('Chave regenerada')}
                      >
                        <RefreshCw className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive"
                        aria-label="Excluir"
                        onClick={() => toast.error('Chave removida')}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      <div className="space-y-3">
        <h4 className="text-sm font-semibold">Webhooks configurados</h4>
        <div className="space-y-2">
          {MOCK_WEBHOOKS.map((w) => (
            <div
              key={w.id}
              className="flex items-center justify-between gap-3 rounded-lg border border-border p-3"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
                    {w.event}
                  </code>
                  {w.active ? (
                    <Badge
                      variant="outline"
                      className="border-emerald-200 bg-emerald-100 text-[10px] text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/15 dark:text-emerald-300"
                    >
                      ativo
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-[10px]">
                      pausado
                    </Badge>
                  )}
                </div>
                <p className="mt-0.5 truncate text-xs text-muted-foreground">
                  {w.url}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => toast.info('Editar webhook')}
              >
                Editar
              </Button>
            </div>
          ))}
        </div>
      </div>
    </SectionShell>
  );
};
