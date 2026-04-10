/**
 * AssistantBanner — Componente web do assistente "Dra. Renova".
 * Exibe sugestões proativas baseadas no status do pedido atual.
 * Alinhado ao mobile: AssistantBanner + ConductSection + ObservationCard.
 */
import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { getAssistantNextAction } from '@/services/doctor-api-consultation';
import { getMutedKeys, muteKey } from '@/lib/triagePersistence';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Sparkles,
  X,
  ChevronRight,
  Lightbulb,
  AlertTriangle,
  Stethoscope,
  FileText,
} from 'lucide-react';

interface AssistantSuggestion {
  id: string;
  type: 'info' | 'warning' | 'action' | 'observation';
  title: string;
  message: string;
  actionLabel?: string;
  actionRoute?: string;
}

interface AssistantBannerProps {
  requestId?: string;
  requestStatus?: string;
  requestType?: string;
  onNavigate?: (route: string) => void;
}

function getIcon(type: string) {
  switch (type) {
    case 'warning':
      return AlertTriangle;
    case 'action':
      return Stethoscope;
    case 'observation':
      return FileText;
    default:
      return Lightbulb;
  }
}

function getBannerStyle(type: string) {
  switch (type) {
    case 'warning':
      return 'border-amber-200 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-950/30';
    case 'action':
      return 'border-blue-200 bg-blue-50/50 dark:border-blue-800 dark:bg-blue-950/30';
    default:
      return 'border-primary/20 bg-primary/[0.03] dark:border-primary/30';
  }
}

type AssistantResponse =
  | {
      action?: string;
      title?: string;
      message?: string;
      description?: string;
      observation?: string;
      warning?: string;
      actionLabel?: string;
      actionRoute?: string;
      suggestions?: unknown[];
    }
  | null
  | undefined;

function asString(v: unknown): string | undefined {
  return typeof v === 'string' ? v : undefined;
}

function extractSuggestions(
  data: AssistantResponse,
  requestId?: string
): AssistantSuggestion[] {
  const items: AssistantSuggestion[] = [];
  if (!data || typeof data !== 'object') return items;

  if ('action' in data && typeof data.action === 'string' && data.action) {
    items.push({
      id: `action-${data.action}`,
      type: 'action',
      title: asString(data.title) || 'Próximo passo',
      message: asString(data.message) || asString(data.description) || '',
      actionLabel: asString(data.actionLabel),
      actionRoute: asString(data.actionRoute),
    });
  }
  if (
    'observation' in data &&
    typeof data.observation === 'string' &&
    data.observation
  ) {
    items.push({
      id: `obs-${requestId}`,
      type: 'observation',
      title: 'Observação',
      message: data.observation,
    });
  }
  if ('warning' in data && typeof data.warning === 'string' && data.warning) {
    items.push({
      id: `warn-${requestId}`,
      type: 'warning',
      title: 'Atenção',
      message: data.warning,
    });
  }
  return items;
}

export function AssistantBanner({
  requestId,
  requestStatus,
  requestType,
  onNavigate,
}: AssistantBannerProps) {
  const [suggestions, setSuggestions] = useState<AssistantSuggestion[]>([]);
  const [mutedKeys, setMutedKeys] = useState<string[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!requestId && !requestStatus) return;
    let cancelled = false;
    getAssistantNextAction(requestId, requestStatus, requestType)
      .then((data) => {
        if (!cancelled)
          setSuggestions(
            extractSuggestions(data as AssistantResponse, requestId)
          );
      })
      .catch(() => {
        /* Silencioso — assistente é opcional */
      });
    getMutedKeys()
      .then((keys) => {
        if (!cancelled) setMutedKeys(keys);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [requestId, requestStatus, requestType]);

  const handleDismiss = async (id: string) => {
    setDismissed((prev) => new Set(prev).add(id));
    try {
      await muteKey(id);
    } catch {
      /* ignore */
    }
  };

  const visible = suggestions.filter(
    (s) => !dismissed.has(s.id) && !mutedKeys.includes(s.id)
  );

  if (visible.length === 0) return null;

  return (
    <AnimatePresence>
      {visible.map((suggestion) => {
        const Icon = getIcon(suggestion.type);
        return (
          <motion.div
            key={suggestion.id}
            initial={{ opacity: 0, height: 0, marginBottom: 0 }}
            animate={{ opacity: 1, height: 'auto', marginBottom: 12 }}
            exit={{ opacity: 0, height: 0, marginBottom: 0 }}
            transition={{ duration: 0.2 }}
          >
            <Card
              className={`border shadow-sm ${getBannerStyle(suggestion.type)}`}
            >
              <CardContent className="flex items-start gap-3 p-3">
                <div className="mt-0.5 shrink-0 rounded-lg bg-primary/10 p-1.5">
                  <Sparkles className="h-4 w-4 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="mb-0.5 flex items-center gap-2">
                    <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Dra. Renova · {suggestion.title}
                    </span>
                  </div>
                  <p className="text-sm leading-relaxed text-foreground">
                    {suggestion.message}
                  </p>
                  {suggestion.actionLabel && suggestion.actionRoute && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="mt-1.5 h-7 gap-1 px-2 text-xs text-primary"
                      onClick={() => onNavigate?.(suggestion.actionRoute!)}
                    >
                      {suggestion.actionLabel}
                      <ChevronRight className="h-3 w-3" />
                    </Button>
                  )}
                </div>
                <button
                  onClick={() => handleDismiss(suggestion.id)}
                  className="shrink-0 rounded-lg p-1 transition-colors hover:bg-muted"
                  aria-label="Dispensar"
                >
                  <X className="h-3.5 w-3.5 text-muted-foreground" />
                </button>
              </CardContent>
            </Card>
          </motion.div>
        );
      })}
    </AnimatePresence>
  );
}
