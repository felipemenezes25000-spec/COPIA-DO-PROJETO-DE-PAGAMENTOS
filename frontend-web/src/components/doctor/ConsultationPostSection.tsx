/**
 * ConsultationPostSection — Seção pós-consulta: anamnese, sugestões IA, evidências, transcrição.
 * Aparece quando type === 'consultation' e status inclui consultation_finished.
 */
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Lightbulb,
  BookOpen,
  Mic,
  Copy,
  FileText,
  FlaskConical,
  ExternalLink,
  Info,
} from 'lucide-react';
import { toast } from 'sonner';
import { normalizeStatus } from '@/lib/doctor-helpers';
import type { MedicalRequest } from '@/services/doctorApi';

function parseAnamnesis(json: string | null | undefined): Record<string, unknown> | null {
  if (!json?.trim()) return null;
  try {
    const parsed = JSON.parse(json);
    return typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}

function parseSuggestions(json: string | null | undefined): string[] {
  if (!json?.trim()) return [];
  try {
    const parsed = JSON.parse(json);
    return Array.isArray(parsed) ? parsed.filter((s): s is string => typeof s === 'string') : [];
  } catch {
    return [];
  }
}



function renderAnamnesisField(obj: Record<string, unknown>): React.ReactNode[] {
  const keys = Object.keys(obj).filter((k) => !['medicamentos_sugeridos', 'exames_sugeridos'].includes(k));
  return keys.map((key) => {
    const v = obj[key];
    if (v == null || (typeof v === 'string' && !v.trim())) return null;
    const label = key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
    const val = Array.isArray(v) ? v.join(', ') : String(v);
    return (
      <div key={key} className="space-y-1">
        <p className="text-xs font-semibold text-primary uppercase tracking-wide">{label}</p>
        <p className="text-sm text-muted-foreground">{val}</p>
      </div>
    );
  });
}

export interface ConsultationPostSectionProps {
  request: MedicalRequest;
  requestId: string;
}

export function ConsultationPostSection({ request, requestId }: ConsultationPostSectionProps) {
  const navigate = useNavigate();
  const isConsultation = request.type === 'consultation';
  const isFinished = normalizeStatus(request.status) === 'consultation_finished';

  if (!isConsultation || !isFinished) return null;

  const anamnesis = parseAnamnesis(request.consultationAnamnesis);
  const suggestions = parseSuggestions(request.consultationAiSuggestions);
  const transcript = request.consultationTranscript?.trim() ?? '';

  const hasContent = anamnesis || suggestions.length > 0 || transcript;
  if (!hasContent) return null;

  const handleCopyTranscript = async () => {
    if (!transcript) return;
    await navigator.clipboard.writeText(transcript);
    toast.success('Transcrição copiada');
  };

  const examsArr = (anamnesis?.exames_sugeridos as unknown[]) ?? [];
  const hasExams = examsArr.length > 0;

  return (
    <div className="space-y-4">
      {anamnesis && Object.keys(anamnesis).length > 0 && (
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Anamnese estruturada</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 space-y-4">
            {renderAnamnesisField(anamnesis)}
          </CardContent>
        </Card>
      )}

      {suggestions.length > 0 && (
        <Card className="shadow-sm border-primary/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Lightbulb className="h-4 w-4 text-primary" aria-hidden />
              Sugestões clínicas da IA
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <ul className="space-y-2">
              {suggestions.map((item, i) => {
                const isRedFlag = item.startsWith('🚨');
                return (
                  <li
                    key={i}
                    className={`flex items-start gap-2 text-sm ${
                      isRedFlag ? 'text-destructive' : 'text-muted-foreground'
                    }`}
                  >
                    <Lightbulb className="h-4 w-4 shrink-0 mt-0.5" />
                    <span>{item.replace('🚨 ', '')}</span>
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>
      )}

                {item.url && (
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 mt-2 text-sm text-primary hover:underline"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    Abrir artigo
                  </a>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {transcript && (
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Mic className="h-4 w-4 text-primary" aria-hidden />
                Transcrição da consulta
              </CardTitle>
              <Button variant="outline" size="sm" onClick={handleCopyTranscript} className="gap-1.5">
                <Copy className="h-3.5 w-3.5" />
                Copiar
              </Button>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Info className="h-3.5 w-3.5" />
              Transcrição automática — pode conter imprecisões.
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{transcript}</p>
          </CardContent>
        </Card>
      )}

      <div className="flex flex-col sm:flex-row gap-2">
        <Button
          className="gap-2"
          onClick={() => {
            const meds = (anamnesis?.medicamentos_sugeridos as unknown[]) ?? [];
            const prefillMeds = meds.length > 0 ? JSON.stringify(meds) : undefined;
            navigate(`/pedidos/${requestId}/editor`, {
              state: prefillMeds ? { prefillMeds } : undefined,
            });
          }}
        >
          <FileText className="h-4 w-4" />
          Criar Receita Baseada na Consulta
        </Button>
        {hasExams && (
          <Button variant="outline" className="gap-2" disabled>
            <FlaskConical className="h-4 w-4" />
            Criar Pedido de Exame Baseado na Consulta (em breve)
          </Button>
        )}
      </div>
    </div>
  );
}

