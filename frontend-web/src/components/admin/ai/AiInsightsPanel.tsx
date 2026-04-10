/**
 * AiInsightsPanel — painel de insights de IA para Admin e RH.
 *
 * Busca dados reais via `aiInsightsApi` com TanStack Query. Usa um
 * QueryClient singleton local, o que permite que o componente funcione
 * isoladamente (sem depender de um QueryClientProvider externo).
 */
import { motion } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  QueryClient,
  QueryClientProvider,
  useQuery,
} from '@tanstack/react-query';
import {
  Sparkles,
  Lightbulb,
  AlertTriangle,
  Activity,
  TrendingUp,
  RefreshCw,
  ArrowRight,
  type LucideIcon,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import {
  getAdminInsights,
  getRhInsights,
  type AiInsight,
  type AiInsightType,
  type AiInsightImpacto,
} from '@/services/aiInsightsApi';

// ---------- QueryClient singleton local ----------
let sharedClient: QueryClient | null = null;
function getSharedClient(): QueryClient {
  if (!sharedClient) {
    sharedClient = new QueryClient({
      defaultOptions: {
        queries: {
          staleTime: 5 * 60 * 1000,
          gcTime: 10 * 60 * 1000,
          refetchOnWindowFocus: false,
          retry: 1,
        },
      },
    });
  }
  return sharedClient;
}

// ---------- Props ----------
export interface AiInsightsPanelProps {
  scope: 'admin' | 'rh';
  maxItems?: number;
  compact?: boolean;
  className?: string;
}

// ---------- Visual mapping ----------
interface TypeStyle {
  icon: LucideIcon;
  iconColor: string;
  iconBg: string;
  label: string;
}

const TYPE_STYLES: Record<AiInsightType, TypeStyle> = {
  oportunidade: {
    icon: Lightbulb,
    iconColor: 'text-emerald-500',
    iconBg: 'bg-emerald-500/10',
    label: 'Oportunidade',
  },
  alerta: {
    icon: AlertTriangle,
    iconColor: 'text-amber-500',
    iconBg: 'bg-amber-500/10',
    label: 'Alerta',
  },
  anomalia: {
    icon: Activity,
    iconColor: 'text-red-500',
    iconBg: 'bg-red-500/10',
    label: 'Anomalia',
  },
  tendencia: {
    icon: TrendingUp,
    iconColor: 'text-sky-500',
    iconBg: 'bg-sky-500/10',
    label: 'Tendência',
  },
  recomendacao: {
    icon: Sparkles,
    iconColor: 'text-purple-500',
    iconBg: 'bg-purple-500/10',
    label: 'Recomendação',
  },
};

const IMPACTO_STYLES: Record<AiInsightImpacto, string> = {
  alto: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20',
  medio:
    'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
  baixo: 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20',
};

// ---------- Card ----------
interface AiInsightCardProps {
  insight: AiInsight;
  index: number;
  compact: boolean;
}

function AiInsightCard({ insight, index, compact }: AiInsightCardProps) {
  const style = TYPE_STYLES[insight.type];
  const Icon = style.icon;
  const confidencePct = Math.round(insight.confianca * 100);

  let timeAgo = '';
  try {
    timeAgo = formatDistanceToNow(new Date(insight.timestamp), {
      addSuffix: true,
      locale: ptBR,
    });
  } catch {
    timeAgo = '';
  }

  return (
    <motion.article
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, duration: 0.3, ease: 'easeOut' }}
      className={cn(
        'group rounded-lg border border-border/60 bg-background/60 transition-colors hover:border-primary/40',
        compact ? 'p-2.5' : 'p-3.5'
      )}
    >
      <div className="flex items-start gap-3">
        <div
          className={cn(
            'flex shrink-0 items-center justify-center rounded-md',
            style.iconBg,
            compact ? 'h-7 w-7' : 'h-9 w-9'
          )}
        >
          <Icon
            className={cn(style.iconColor, compact ? 'h-3.5 w-3.5' : 'h-4 w-4')}
            aria-hidden
          />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <h4
              className={cn(
                'font-semibold leading-tight text-foreground',
                compact ? 'text-xs' : 'text-sm'
              )}
            >
              {insight.titulo}
            </h4>
            <Badge
              variant="outline"
              className={cn(
                'h-4 px-1.5 py-0 text-[9px] uppercase tracking-wide',
                IMPACTO_STYLES[insight.impacto]
              )}
            >
              {insight.impacto}
            </Badge>
          </div>

          {!compact && (
            <p className="mt-1 text-[12px] leading-snug text-muted-foreground">
              {insight.descricao}
            </p>
          )}

          <div
            className={cn(
              'flex items-center gap-2',
              compact ? 'mt-1.5' : 'mt-2.5'
            )}
          >
            <div className="min-w-0 flex-1">
              <div className="mb-0.5 flex items-center justify-between">
                <span className="text-[9px] uppercase tracking-wide text-muted-foreground">
                  Confiança
                </span>
                <span className="text-[10px] font-semibold tabular-nums text-foreground">
                  {confidencePct}%
                </span>
              </div>
              <Progress value={confidencePct} className="h-1" />
            </div>
          </div>

          {(insight.acaoSugerida || timeAgo) && (
            <div
              className={cn(
                'flex flex-wrap items-center justify-between gap-2',
                compact ? 'mt-1.5' : 'mt-2.5'
              )}
            >
              {insight.acaoSugerida && !compact && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 px-2 text-[11px] text-primary hover:bg-primary/10 hover:text-primary"
                >
                  {insight.acaoSugerida.length > 42
                    ? `${insight.acaoSugerida.slice(0, 42)}…`
                    : insight.acaoSugerida}
                  <ArrowRight className="ml-1 h-3 w-3" aria-hidden />
                </Button>
              )}
              {timeAgo && (
                <span className="ml-auto text-[10px] text-muted-foreground">
                  {timeAgo}
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </motion.article>
  );
}

// ---------- Inner ----------
interface InnerProps extends Required<Pick<AiInsightsPanelProps, 'scope'>> {
  maxItems: number;
  compact: boolean;
  className?: string;
}

function AiInsightsPanelInner({
  scope,
  maxItems,
  compact,
  className,
}: InnerProps) {
  const query = useQuery<AiInsight[]>({
    queryKey: ['ai-insights', scope],
    queryFn: () => (scope === 'admin' ? getAdminInsights() : getRhInsights()),
  });

  const insights = (query.data ?? []).slice(0, maxItems);

  return (
    <Card
      className={cn(
        'overflow-hidden border-primary/20 bg-gradient-to-br from-primary/5 via-background to-background shadow-sm',
        className
      )}
    >
      <CardHeader className={compact ? 'pb-2' : 'pb-3'}>
        <div className="flex items-center justify-between gap-2">
          <CardTitle
            className={cn(
              'flex items-center gap-2 font-semibold',
              compact ? 'text-xs' : 'text-sm'
            )}
          >
            <motion.span
              animate={{ scale: [1, 1.15, 1], opacity: [0.9, 1, 0.9] }}
              transition={{
                duration: 2.4,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
              className="inline-flex"
              aria-hidden
            >
              <Sparkles className="h-4 w-4 text-primary" />
            </motion.span>
            Insights de IA
            {query.isSuccess && (
              <Badge variant="secondary" className="h-5 text-[10px]">
                {insights.length} insight{insights.length === 1 ? '' : 's'}
              </Badge>
            )}
          </CardTitle>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 w-7 p-0"
            onClick={() => query.refetch()}
            disabled={query.isFetching}
            aria-label="Atualizar insights"
          >
            <RefreshCw
              className={cn('h-3.5 w-3.5', query.isFetching && 'animate-spin')}
              aria-hidden
            />
          </Button>
        </div>
      </CardHeader>
      <CardContent className={cn('space-y-2.5', compact && 'space-y-2')}>
        {query.isLoading && (
          <>
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="rounded-lg border border-border/60 bg-background/60 p-3"
              >
                <div className="flex items-start gap-3">
                  <Skeleton className="h-9 w-9 rounded-md" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-3 w-2/3" />
                    <Skeleton className="h-2 w-full" />
                    <Skeleton className="h-2 w-4/5" />
                  </div>
                </div>
              </div>
            ))}
          </>
        )}

        {query.isError && (
          <div className="flex flex-col items-start gap-2 rounded-lg border border-red-500/20 bg-red-500/5 p-3 text-xs">
            <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
              <AlertTriangle className="h-4 w-4" aria-hidden />
              <span className="font-semibold">
                Não foi possível carregar os insights
              </span>
            </div>
            <p className="text-muted-foreground">
              Verifique sua conexão e tente novamente em instantes.
            </p>
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-[11px]"
              onClick={() => query.refetch()}
            >
              <RefreshCw className="mr-1 h-3 w-3" aria-hidden />
              Tentar de novo
            </Button>
          </div>
        )}

        {query.isSuccess && insights.length === 0 && (
          <p className="py-4 text-center text-xs text-muted-foreground">
            Nenhum insight disponível no momento.
          </p>
        )}

        {query.isSuccess &&
          insights.map((insight, i) => (
            <AiInsightCard
              key={insight.id}
              insight={insight}
              index={i}
              compact={compact}
            />
          ))}
      </CardContent>
    </Card>
  );
}

// ---------- Public ----------
export const AiInsightsPanel = ({
  scope,
  maxItems = 5,
  compact = false,
  className,
}: AiInsightsPanelProps) => {
  return (
    <QueryClientProvider client={getSharedClient()}>
      <AiInsightsPanelInner
        scope={scope}
        maxItems={maxItems}
        compact={compact}
        className={className}
      />
    </QueryClientProvider>
  );
};

export default AiInsightsPanel;
