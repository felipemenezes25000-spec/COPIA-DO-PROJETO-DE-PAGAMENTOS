import { BookOpen, ExternalLink, LifeBuoy, Rocket } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { SectionShell } from './SectionShell';

const INFO = [
  { label: 'Versão', value: '2.8.1' },
  { label: 'Build', value: '#a7f9c3b' },
  { label: 'Ambiente', value: 'Produção' },
  { label: 'Região', value: 'AWS sa-east-1' },
  { label: 'Node', value: '20.11.1' },
  { label: '.NET', value: '8.0.4' },
];

export const SobreSection = () => {
  return (
    <SectionShell
      title="Sobre o RenoveJá+"
      description="Informações da versão instalada e suporte."
    >
      <div className="flex items-center gap-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Rocket className="h-6 w-6" />
        </div>
        <div>
          <h3 className="text-lg font-semibold">RenoveJá+ Admin</h3>
          <p className="text-sm text-muted-foreground">
            Plataforma gratuita de renovação de receitas para o SUS.
          </p>
        </div>
      </div>

      <Separator />

      <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
        {INFO.map((item) => (
          <div key={item.label} className="rounded-lg border border-border p-3">
            <p className="text-xs text-muted-foreground">{item.label}</p>
            <p className="mt-0.5 text-sm font-semibold">{item.value}</p>
          </div>
        ))}
      </div>

      <Separator />

      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm">
          <BookOpen className="mr-2 h-4 w-4" /> Changelog{' '}
          <ExternalLink className="ml-1 h-3 w-3 opacity-60" />
        </Button>
        <Button variant="outline" size="sm">
          <LifeBuoy className="mr-2 h-4 w-4" /> Suporte{' '}
          <ExternalLink className="ml-1 h-3 w-3 opacity-60" />
        </Button>
      </div>

      <p className="text-[11px] text-muted-foreground">
        © 2026 RenoveJá+. Projeto público de saúde. Licença MIT.
      </p>
    </SectionShell>
  );
};
