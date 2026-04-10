import { ImagePlus } from 'lucide-react';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { SectionShell } from './SectionShell';

interface OrganizacaoSectionProps {
  onDirty: () => void;
}

const UFS = [
  'AC',
  'AL',
  'AM',
  'AP',
  'BA',
  'CE',
  'DF',
  'ES',
  'GO',
  'MA',
  'MG',
  'MS',
  'MT',
  'PA',
  'PB',
  'PE',
  'PI',
  'PR',
  'RJ',
  'RN',
  'RO',
  'RR',
  'RS',
  'SC',
  'SE',
  'SP',
  'TO',
];

export const OrganizacaoSection = ({ onDirty }: OrganizacaoSectionProps) => {
  return (
    <SectionShell
      title="Organização"
      description="Dados institucionais exibidos no painel e em documentos oficiais."
    >
      <div className="flex flex-col items-start gap-6 sm:flex-row">
        <button
          type="button"
          onClick={() => toast.info('Upload de logo em breve')}
          className="flex h-32 w-32 shrink-0 flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border bg-muted/30 text-muted-foreground transition-colors hover:border-primary/40 hover:bg-muted/60"
        >
          <ImagePlus className="h-6 w-6" />
          <span className="text-xs font-medium">Enviar logo</span>
        </button>
        <div className="grid w-full flex-1 gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="org-nome">Nome da instituição</Label>
            <Input
              id="org-nome"
              defaultValue="Secretaria Municipal de Saúde de Uberlândia"
              onChange={onDirty}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="org-cnpj">CNPJ</Label>
            <Input
              id="org-cnpj"
              defaultValue="18.431.312/0001-48"
              onChange={onDirty}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="org-contato">Contato principal</Label>
            <Input
              id="org-contato"
              defaultValue="contato@saude.uberlandia.mg.gov.br"
              onChange={onDirty}
            />
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="org-endereco">Endereço</Label>
          <Textarea
            id="org-endereco"
            defaultValue="Av. Anselmo Alves dos Santos, 600 — Santa Mônica"
            onChange={onDirty}
            rows={2}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="org-municipio">Município</Label>
          <Input
            id="org-municipio"
            defaultValue="Uberlândia"
            onChange={onDirty}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="org-uf">UF</Label>
          <Select defaultValue="MG" onValueChange={onDirty}>
            <SelectTrigger id="org-uf">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {UFS.map((uf) => (
                <SelectItem key={uf} value={uf}>
                  {uf}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </SectionShell>
  );
};
