import { useState } from 'react';
import { Camera, KeyRound } from 'lucide-react';
import { toast } from 'sonner';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { SectionShell } from './SectionShell';

interface PerfilSectionProps {
  onDirty: () => void;
}

export const PerfilSection = ({ onDirty }: PerfilSectionProps) => {
  const [passwordOpen, setPasswordOpen] = useState(false);

  const handleChange = () => onDirty();

  return (
    <SectionShell
      title="Perfil do administrador"
      description="Suas informações pessoais e credenciais de acesso."
    >
      <div className="flex flex-col items-start gap-6 sm:flex-row sm:items-center">
        <div className="relative">
          <Avatar className="h-24 w-24 ring-2 ring-primary/20">
            <AvatarFallback className="bg-primary/10 text-2xl text-primary">
              AR
            </AvatarFallback>
          </Avatar>
          <button
            type="button"
            onClick={() => toast.info('Upload de avatar em breve')}
            className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md transition-transform hover:scale-105"
            aria-label="Alterar avatar"
          >
            <Camera className="h-4 w-4" />
          </button>
        </div>
        <div className="space-y-1">
          <h3 className="text-lg font-semibold">Ana Paula Ribeiro</h3>
          <p className="text-sm text-muted-foreground">
            Super Administradora · Secretaria de Saúde
          </p>
          <p className="text-xs text-muted-foreground">
            Último acesso há 2 minutos
          </p>
        </div>
      </div>

      <Separator />

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="perfil-nome">Nome completo</Label>
          <Input
            id="perfil-nome"
            defaultValue="Ana Paula Ribeiro"
            onChange={handleChange}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="perfil-email">E-mail</Label>
          <Input
            id="perfil-email"
            type="email"
            defaultValue="ana.ribeiro@saude.gov.br"
            onChange={handleChange}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="perfil-telefone">Telefone</Label>
          <Input
            id="perfil-telefone"
            defaultValue="(34) 99999-0000"
            onChange={handleChange}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="perfil-cargo">Cargo</Label>
          <Input
            id="perfil-cargo"
            defaultValue="Coordenadora de TI — Saúde"
            onChange={handleChange}
          />
        </div>
      </div>

      <Separator />

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h4 className="text-sm font-semibold">Senha de acesso</h4>
          <p className="text-xs text-muted-foreground">
            Última alteração há 47 dias.
          </p>
        </div>
        <Dialog open={passwordOpen} onOpenChange={setPasswordOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm">
              <KeyRound className="mr-2 h-4 w-4" /> Alterar senha
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Alterar senha</DialogTitle>
              <DialogDescription>
                Escolha uma senha forte com pelo menos 12 caracteres.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="pwd-atual">Senha atual</Label>
                <Input id="pwd-atual" type="password" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pwd-nova">Nova senha</Label>
                <Input id="pwd-nova" type="password" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pwd-conf">Confirmar nova senha</Label>
                <Input id="pwd-conf" type="password" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setPasswordOpen(false)}>
                Cancelar
              </Button>
              <Button
                onClick={() => {
                  setPasswordOpen(false);
                  toast.success('Senha alterada com sucesso');
                }}
              >
                Salvar nova senha
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </SectionShell>
  );
};
