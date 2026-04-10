import { useState } from 'react';
import { Check, Monitor, Moon, Sun } from 'lucide-react';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import type { AppearanceSettings } from './types';
import { SectionShell } from './SectionShell';

interface AparenciaSectionProps {
  onDirty: () => void;
}

const THEMES: {
  value: AppearanceSettings['theme'];
  label: string;
  icon: typeof Sun;
}[] = [
  { value: 'light', label: 'Claro', icon: Sun },
  { value: 'dark', label: 'Escuro', icon: Moon },
  { value: 'system', label: 'Sistema', icon: Monitor },
];

const COLORS = [
  { value: 'blue', className: 'bg-blue-500' },
  { value: 'emerald', className: 'bg-emerald-500' },
  { value: 'violet', className: 'bg-violet-500' },
  { value: 'amber', className: 'bg-amber-500' },
  { value: 'rose', className: 'bg-rose-500' },
];

export const AparenciaSection = ({ onDirty }: AparenciaSectionProps) => {
  const [settings, setSettings] = useState<AppearanceSettings>({
    theme: 'system',
    primaryColor: 'blue',
    density: 'comfortable',
    language: 'pt-BR',
    timezone: 'America/Sao_Paulo',
  });

  const update = <K extends keyof AppearanceSettings>(
    key: K,
    value: AppearanceSettings[K]
  ) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
    onDirty();
  };

  return (
    <SectionShell
      title="Aparência"
      description="Personalize a interface do painel."
    >
      <div className="space-y-3">
        <Label>Tema</Label>
        <div className="grid grid-cols-3 gap-3">
          {THEMES.map(({ value, label, icon: Icon }) => {
            const active = settings.theme === value;
            return (
              <button
                key={value}
                type="button"
                onClick={() => update('theme', value)}
                className={cn(
                  'relative flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition-all',
                  active
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-muted-foreground/40'
                )}
              >
                <Icon className="h-5 w-5" />
                <span className="text-xs font-medium">{label}</span>
                {active && (
                  <div className="absolute right-2 top-2 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-primary-foreground">
                    <Check className="h-2.5 w-2.5" />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-3">
        <Label>Cor primária</Label>
        <div className="flex gap-3">
          {COLORS.map((c) => {
            const active = settings.primaryColor === c.value;
            return (
              <button
                key={c.value}
                type="button"
                onClick={() => update('primaryColor', c.value)}
                aria-label={c.value}
                className={cn(
                  'flex h-10 w-10 items-center justify-center rounded-full ring-offset-2 ring-offset-background transition-all',
                  c.className,
                  active && 'ring-2 ring-primary'
                )}
              >
                {active && <Check className="h-4 w-4 text-white" />}
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-3">
        <Label>Densidade</Label>
        <div className="grid grid-cols-2 gap-3">
          {(['compact', 'comfortable'] as const).map((d) => {
            const active = settings.density === d;
            return (
              <button
                key={d}
                type="button"
                onClick={() => update('density', d)}
                className={cn(
                  'rounded-xl border-2 p-3 text-sm font-medium transition-colors',
                  active
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-muted-foreground/40'
                )}
              >
                {d === 'compact' ? 'Compacta' : 'Confortável'}
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Idioma</Label>
          <Select
            value={settings.language}
            onValueChange={(v) =>
              update('language', v as AppearanceSettings['language'])
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pt-BR">Português (Brasil)</SelectItem>
              <SelectItem value="en">English</SelectItem>
              <SelectItem value="es">Español</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Fuso horário</Label>
          <Select
            value={settings.timezone}
            onValueChange={(v) => update('timezone', v)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="America/Sao_Paulo">
                América/São Paulo (UTC−3)
              </SelectItem>
              <SelectItem value="America/Manaus">
                América/Manaus (UTC−4)
              </SelectItem>
              <SelectItem value="America/Noronha">
                América/Noronha (UTC−2)
              </SelectItem>
              <SelectItem value="UTC">UTC</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </SectionShell>
  );
};
