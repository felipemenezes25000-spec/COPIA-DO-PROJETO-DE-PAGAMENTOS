/**
 * Widgets de IA para o AdminDashboard (implementações locais).
 * Substituem os antigos @/components/admin/ai/* com um visual coeso.
 */
import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Sparkles,
  X,
  TrendingUp,
  AlertTriangle,
  Lightbulb,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AreaLineChart } from './charts';

// ---------- Suggestion banner ----------
interface SuggestionProps {
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  dismissible?: boolean;
}

export function AiSuggestionBanner({
  message,
  actionLabel,
  onAction,
  dismissible = true,
}: SuggestionProps) {
  const [open, setOpen] = useState(true);
  if (!open) return null;
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="relative overflow-hidden rounded-xl border border-primary/30 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-4"
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,hsl(var(--primary)/0.12),transparent_60%)]" />
      <div className="relative flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/15">
          <Sparkles className="h-5 w-5 text-primary" aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium leading-snug">{message}</p>
        </div>
        {actionLabel && (
          <Button size="sm" variant="default" onClick={onAction}>
            {actionLabel}
          </Button>
        )}
        {dismissible && (
          <button
            type="button"
            aria-label="Fechar sugestão"
            className="shrink-0 rounded-md p-1.5 transition-colors hover:bg-primary/10"
            onClick={() => setOpen(false)}
          >
            <X className="h-4 w-4 text-muted-foreground" aria-hidden />
          </button>
        )}
      </div>
    </motion.div>
  );
}

// ---------- Forecast chart (histórico + previsão) ----------
interface ForecastProps {
  historical: number[];
  forecast: number[];
  confidence: number;
  label?: string;
  height?: number;
}

export function AiForecastChart({
  historical,
  forecast,
  confidence,
  label,
  height = 240,
}: ForecastProps) {
  const all = [...historical, ...forecast];
  if (!all.length) return null;
  const width = 800;
  const min = Math.min(...all) * 0.92;
  const max = Math.max(...all) * 1.08;
  const range = max - min || 1;
  const total = all.length;
  const step = width / Math.max(1, total - 1);
  const toPoint = (v: number, i: number): [number, number] => [
    i * step,
    height - ((v - min) / range) * height,
  ];
  const histPoints = historical.map((v, i) => toPoint(v, i));
  const foreStart = historical.length - 1;
  const forePoints = forecast.map((v, i) => toPoint(v, foreStart + 1 + i));
  const connected = histPoints.length
    ? [histPoints[histPoints.length - 1], ...forePoints]
    : forePoints;
  const histPath = histPoints
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0]},${p[1]}`)
    .join(' ');
  const forePath = connected
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0]},${p[1]}`)
    .join(' ');
  return (
    <div className="w-full">
      <div className="mb-2 flex items-center justify-between">
        {label && (
          <p className="text-xs font-medium text-muted-foreground">{label}</p>
        )}
        <Badge variant="secondary" className="gap-1">
          <Sparkles className="h-3 w-3" aria-hidden /> Confiança{' '}
          {Math.round(confidence * 100)}%
        </Badge>
      </div>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-auto w-full"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="forecastGrad" x1="0" x2="0" y1="0" y2="1">
            <stop
              offset="0%"
              stopColor="hsl(var(--primary))"
              stopOpacity={0.3}
            />
            <stop
              offset="100%"
              stopColor="hsl(var(--primary))"
              stopOpacity={0}
            />
          </linearGradient>
        </defs>
        {[0.25, 0.5, 0.75].map((t) => (
          <line
            key={t}
            x1={0}
            x2={width}
            y1={height * t}
            y2={height * t}
            stroke="hsl(var(--border))"
            strokeDasharray="4 6"
            strokeWidth={1}
          />
        ))}
        <motion.path
          d={`${histPath} L${histPoints[histPoints.length - 1]?.[0] ?? 0},${height} L0,${height} Z`}
          fill="url(#forecastGrad)"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.7 }}
        />
        <motion.path
          d={histPath}
          fill="none"
          stroke="hsl(var(--primary))"
          strokeWidth={2.5}
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1.2, ease: 'easeOut' }}
        />
        <motion.path
          d={forePath}
          fill="none"
          stroke="hsl(var(--primary))"
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeDasharray="6 6"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1.2, delay: 0.6, ease: 'easeOut' }}
        />
        {histPoints.length > 0 && (
          <line
            x1={histPoints[histPoints.length - 1][0]}
            x2={histPoints[histPoints.length - 1][0]}
            y1={0}
            y2={height}
            stroke="hsl(var(--muted-foreground))"
            strokeDasharray="2 4"
            strokeWidth={1}
          />
        )}
      </svg>
      <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-0.5 w-3 bg-primary" /> Histórico
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-0.5 w-3 border-t-2 border-dashed border-primary" />{' '}
          Previsão
        </span>
      </div>
    </div>
  );
}

// helper export (reusa AreaLineChart — mantém bundle enxuto)
export { AreaLineChart };

// ---------- Insights Panel ----------
interface Insight {
  id: string;
  icon: 'trend' | 'alert' | 'idea';
  title: string;
  description: string;
}

const MOCK_INSIGHTS: Insight[] = [
  {
    id: '1',
    icon: 'trend',
    title: 'Crescimento sustentado em SP',
    description:
      'Consultas em São Paulo cresceram 14% no último mês — o estado representa 42% do volume.',
  },
  {
    id: '2',
    icon: 'alert',
    title: 'Risco de gargalo em Cardiologia',
    description:
      'Tempo médio de consulta subiu 32% em cardiologia nos últimos 7 dias.',
  },
  {
    id: '3',
    icon: 'idea',
    title: 'Oportunidade de fidelização 60+',
    description:
      'Pacientes 60+ com NPS em queda — considere ativar fluxo de suporte proativo.',
  },
];

interface InsightsPanelProps {
  scope?: 'admin' | 'doctor';
}

export function AiInsightsPanel({ scope = 'admin' }: InsightsPanelProps) {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Sparkles className="h-4 w-4 text-primary" aria-hidden />
          Insights da IA
          <Badge variant="secondary" className="ml-auto text-[10px]">
            {scope}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <AnimatePresence>
          {MOCK_INSIGHTS.map((insight, i) => {
            const Icon =
              insight.icon === 'trend'
                ? TrendingUp
                : insight.icon === 'alert'
                  ? AlertTriangle
                  : Lightbulb;
            const tone =
              insight.icon === 'trend'
                ? 'bg-success/10 text-success'
                : insight.icon === 'alert'
                  ? 'bg-destructive/10 text-destructive'
                  : 'bg-primary/10 text-primary';
            return (
              <motion.div
                key={insight.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.08 }}
                className="flex gap-3 rounded-lg border border-border bg-card/60 p-3 transition-colors hover:bg-card"
              >
                <div
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${tone}`}
                >
                  <Icon className="h-4 w-4" aria-hidden />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold leading-tight">
                    {insight.title}
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                    {insight.description}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}

// ---------- Sparkline reexport ----------
export { AiMiniSparkline } from './charts';
