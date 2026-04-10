import { useState } from 'react';
import { Laptop, Plus, ShieldCheck, X } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { MOCK_AUDIT, MOCK_SESSIONS } from './mockData';
import type { PasswordPolicy } from './types';
import { SectionShell } from './SectionShell';

interface SegurancaSectionProps {
  onDirty: () => void;
}

export const SegurancaSection = ({ onDirty }: SegurancaSectionProps) => {
  const [twoFA, setTwoFA] = useState(true);
  const [policy, setPolicy] = useState<PasswordPolicy>({
    minChars: 12,
    requireUppercase: true,
    requireNumbers: true,
    requireSymbols: false,
    expiresDays: 90,
  });
  const [ips, setIps] = useState<string[]>(['189.32.14.0/24', '200.155.88.14']);
  const [newIp, setNewIp] = useState('');

  const updatePolicy = <K extends keyof PasswordPolicy>(
    key: K,
    value: PasswordPolicy[K]
  ) => {
    setPolicy((prev) => ({ ...prev, [key]: value }));
    onDirty();
  };

  const addIp = () => {
    if (!newIp.trim()) return;
    setIps((prev) => [...prev, newIp.trim()]);
    setNewIp('');
    onDirty();
  };

  const removeIp = (ip: string) => {
    setIps((prev) => prev.filter((i) => i !== ip));
    onDirty();
  };

  return (
    <SectionShell
      title="Segurança"
      description="Proteção da conta, sessões ativas e política de acesso."
    >
      <div className="flex items-center justify-between gap-4 rounded-lg border border-border p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <h4 className="text-sm font-semibold">
              Autenticação em dois fatores (2FA)
            </h4>
            <p className="text-xs text-muted-foreground">
              Exige código OTP em cada novo login.
            </p>
          </div>
        </div>
        <Switch
          checked={twoFA}
          onCheckedChange={(v) => {
            setTwoFA(v);
            onDirty();
          }}
        />
      </div>

      <div className="space-y-3">
        <h4 className="text-sm font-semibold">Sessões ativas</h4>
        <div className="space-y-2">
          {MOCK_SESSIONS.map((s) => (
            <div
              key={s.id}
              className="flex items-center justify-between gap-3 rounded-lg border border-border p-3"
            >
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                  <Laptop className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-medium">{s.device}</p>
                    {s.current && (
                      <Badge
                        variant="outline"
                        className="border-primary/30 bg-primary/10 text-[10px] text-primary"
                      >
                        atual
                      </Badge>
                    )}
                  </div>
                  <p className="truncate text-xs text-muted-foreground">
                    {s.ip} · {s.location}
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                disabled={s.current}
                onClick={() => toast.success('Sessão encerrada')}
              >
                Encerrar
              </Button>
            </div>
          ))}
        </div>
      </div>

      <Separator />

      <div className="space-y-3">
        <h4 className="text-sm font-semibold">Política de senha</h4>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="pwd-min">Mínimo de caracteres</Label>
            <Input
              id="pwd-min"
              type="number"
              min={6}
              max={64}
              value={policy.minChars}
              onChange={(e) => updatePolicy('minChars', Number(e.target.value))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="pwd-exp">Expira a cada (dias)</Label>
            <Input
              id="pwd-exp"
              type="number"
              min={0}
              value={policy.expiresDays}
              onChange={(e) =>
                updatePolicy('expiresDays', Number(e.target.value))
              }
            />
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-3 text-sm">
            <Switch
              checked={policy.requireUppercase}
              onCheckedChange={(v) => updatePolicy('requireUppercase', v)}
            />
            <span>Exigir letras maiúsculas</span>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <Switch
              checked={policy.requireNumbers}
              onCheckedChange={(v) => updatePolicy('requireNumbers', v)}
            />
            <span>Exigir números</span>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <Switch
              checked={policy.requireSymbols}
              onCheckedChange={(v) => updatePolicy('requireSymbols', v)}
            />
            <span>Exigir caracteres especiais</span>
          </div>
        </div>
      </div>

      <Separator />

      <div className="space-y-3">
        <div>
          <h4 className="text-sm font-semibold">Allowlist de IPs</h4>
          <p className="text-xs text-muted-foreground">
            Somente estes IPs/CIDR poderão autenticar no painel.
          </p>
        </div>
        <div className="flex gap-2">
          <Input
            value={newIp}
            onChange={(e) => setNewIp(e.target.value)}
            placeholder="192.168.0.0/24"
          />
          <Button onClick={addIp} size="sm">
            <Plus className="mr-1 h-4 w-4" /> Adicionar
          </Button>
        </div>
        <div className="flex flex-wrap gap-2">
          {ips.map((ip) => (
            <Badge key={ip} variant="outline" className="gap-1 pr-1">
              {ip}
              <button
                type="button"
                onClick={() => removeIp(ip)}
                className="flex h-4 w-4 items-center justify-center rounded hover:bg-muted"
                aria-label={`Remover ${ip}`}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
          {ips.length === 0 && (
            <p className="text-xs text-muted-foreground">
              Nenhum IP restrito — acesso liberado globalmente.
            </p>
          )}
        </div>
      </div>

      <Separator />

      <div className="space-y-3">
        <h4 className="text-sm font-semibold">Log de auditoria (últimas 10)</h4>
        <div className="overflow-hidden rounded-lg border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Quando</TableHead>
                <TableHead>Autor</TableHead>
                <TableHead>Ação</TableHead>
                <TableHead className="hidden md:table-cell">Alvo</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {MOCK_AUDIT.map((a) => (
                <TableRow key={a.id}>
                  <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                    {a.timestamp}
                  </TableCell>
                  <TableCell className="text-sm">{a.actor}</TableCell>
                  <TableCell className="text-sm">{a.action}</TableCell>
                  <TableCell className="hidden text-xs text-muted-foreground md:table-cell">
                    {a.target}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </SectionShell>
  );
};
