import { useState } from 'react';
import { Check, MoreHorizontal, UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { MOCK_USERS } from './mockData';
import type { AdminRole } from './types';
import { SectionShell } from './SectionShell';

const ROLE_META: Record<AdminRole, { label: string; className: string }> = {
  super_admin: {
    label: 'Super Admin',
    className:
      'bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300 border-violet-200 dark:border-violet-500/30',
  },
  admin: {
    label: 'Admin',
    className:
      'bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300 border-blue-200 dark:border-blue-500/30',
  },
  viewer: {
    label: 'Viewer',
    className:
      'bg-slate-100 text-slate-700 dark:bg-slate-500/15 dark:text-slate-300 border-slate-200 dark:border-slate-500/30',
  },
};

type Capability =
  | 'view'
  | 'approve'
  | 'manageUsers'
  | 'manageIntegrations'
  | 'viewAudit'
  | 'manageBilling';

const PERMISSIONS: { key: Capability; label: string }[] = [
  { key: 'view', label: 'Visualizar dashboards' },
  { key: 'approve', label: 'Aprovar/rejeitar médicos' },
  { key: 'manageUsers', label: 'Gerenciar usuários' },
  { key: 'manageIntegrations', label: 'Gerenciar integrações' },
  { key: 'viewAudit', label: 'Ver log de auditoria' },
  { key: 'manageBilling', label: 'Dados institucionais' },
];

const PERMISSION_MATRIX: Record<AdminRole, Record<Capability, boolean>> = {
  super_admin: {
    view: true,
    approve: true,
    manageUsers: true,
    manageIntegrations: true,
    viewAudit: true,
    manageBilling: true,
  },
  admin: {
    view: true,
    approve: true,
    manageUsers: false,
    manageIntegrations: true,
    viewAudit: true,
    manageBilling: false,
  },
  viewer: {
    view: true,
    approve: false,
    manageUsers: false,
    manageIntegrations: false,
    viewAudit: true,
    manageBilling: false,
  },
};

const initials = (name: string): string =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase();

export const UsuariosSection = () => {
  const [inviteOpen, setInviteOpen] = useState(false);

  return (
    <SectionShell
      title="Usuários & Permissões"
      description="Gerencie quem tem acesso ao painel administrativo."
      actions={
        <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <UserPlus className="mr-2 h-4 w-4" /> Convidar usuário
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Convidar novo usuário</DialogTitle>
              <DialogDescription>
                Um e-mail com link de acesso será enviado ao novo usuário.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="inv-nome">Nome completo</Label>
                <Input id="inv-nome" placeholder="Ex.: Maria da Silva" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="inv-email">E-mail institucional</Label>
                <Input
                  id="inv-email"
                  type="email"
                  placeholder="maria@saude.gov.br"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="inv-role">Perfil</Label>
                <Select defaultValue="admin">
                  <SelectTrigger id="inv-role">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="super_admin">Super Admin</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="viewer">Viewer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setInviteOpen(false)}>
                Cancelar
              </Button>
              <Button
                onClick={() => {
                  setInviteOpen(false);
                  toast.success('Convite enviado');
                }}
              >
                Enviar convite
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      }
    >
      <div className="overflow-hidden rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Usuário</TableHead>
              <TableHead>Perfil</TableHead>
              <TableHead className="hidden md:table-cell">
                Última atividade
              </TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {MOCK_USERS.map((user) => {
              const meta = ROLE_META[user.role];
              return (
                <TableRow key={user.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9">
                        <AvatarFallback className="bg-primary/10 text-xs text-primary">
                          {initials(user.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">
                          {user.name}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {user.email}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={meta.className}>
                      {meta.label}
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden text-sm text-muted-foreground md:table-cell">
                    {user.lastActivity}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => toast.info('Editar ' + user.name)}
                        >
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => toast.info('Desativar ' + user.name)}
                        >
                          Desativar
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => toast.error('Exclusão simulada')}
                        >
                          Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <div className="space-y-3">
        <div>
          <h4 className="text-sm font-semibold">Matriz de permissões</h4>
          <p className="text-xs text-muted-foreground">
            Visualização por perfil. Edição avançada disponível na próxima
            versão.
          </p>
        </div>
        <div className="overflow-hidden rounded-lg border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Capacidade</TableHead>
                {(Object.keys(ROLE_META) as AdminRole[]).map((role) => (
                  <TableHead key={role} className="text-center">
                    {ROLE_META[role].label}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {PERMISSIONS.map((perm) => (
                <TableRow key={perm.key}>
                  <TableCell className="text-sm">{perm.label}</TableCell>
                  {(Object.keys(ROLE_META) as AdminRole[]).map((role) => (
                    <TableCell key={role} className="text-center">
                      {PERMISSION_MATRIX[role][perm.key] ? (
                        <Check className="inline h-4 w-4 text-emerald-600" />
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </SectionShell>
  );
};
