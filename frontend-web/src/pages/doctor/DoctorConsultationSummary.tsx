/**
 * Resumo da Consulta — Exibido após o médico encerrar a videochamada.
 * Alinhado ao mobile: anamnese, sugestões IA, transcrição, nota clínica editável.
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { DoctorLayout } from '@/components/doctor/DoctorLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { getRequestById, saveConsultationSummary } from '@/services/doctorApi';
import { toast } from 'sonner';
import {
  Loader2,
  ArrowLeft,
  FileText,
  Lightbulb,
  Mic,
  Copy,
  CheckCircle2,
  Sparkles,
  AlertTriangle,
} from 'lucide-react';

function parseAnamnesis(
  json: string | null | undefined
): Record<string, unknown> | null {
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
    return Array.isArray(parsed)
      ? parsed.filter((s): s is string => typeof s === 'string')
      : [];
  } catch {
    return [];
  }
}

export default function DoctorConsultationSummary() {
  const { requestId } = useParams<{ requestId: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [request, setRequest] = useState<Awaited<
    ReturnType<typeof getRequestById>
  > | null>(null);
  const [clinicalNote, setClinicalNote] = useState('');
  const [expandedTranscript, setExpandedTranscript] = useState(false);
  const [copied, setCopied] = useState(false);
  const initialSaveDone = useRef(false);

  const anamnesis = parseAnamnesis(request?.consultationAnamnesis);
  const suggestions = parseSuggestions(request?.consultationAiSuggestions);
  const transcript = request?.consultationTranscript ?? '';
  const hasAnamnesis = anamnesis && Object.keys(anamnesis).length > 0;
  const hasSuggestions = suggestions.length > 0;
  const hasTranscript = transcript.length > 0;

  // Re-lança erros para que cada chamador (auto-save no useEffect vs. save
  // manual pelo botão) decida como reportar. Evita toasts duplicados quando o
  // handler do botão já tem seu próprio try/catch.
  const saveToRecord = useCallback(
    async (anamnesisJson: string | null, plan: string) => {
      if (!requestId) return;
      await saveConsultationSummary(requestId, {
        anamnesis: anamnesisJson ?? undefined,
        plan: plan.trim() || undefined,
      });
    },
    [requestId]
  );

  useEffect(() => {
    if (!requestId) return;
    let cancelled = false;
    getRequestById(requestId)
      .then((r) => {
        if (cancelled) return;
        setRequest(r);
        setClinicalNote(r.notes ?? '');
      })
      .catch(() => {
        if (cancelled) return;
        toast.error('Não foi possível carregar o resumo');
        navigate('/consultas');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [requestId, navigate]);

  useEffect(() => {
    if (!request || !requestId || initialSaveDone.current) return;
    initialSaveDone.current = true;
    if (request.consultationAnamnesis) {
      // Auto-save da anamnese ao abrir o resumo. Se falhar, mostramos um toast
      // discreto para o médico saber — antes silenciávamos e a anamnese ficava
      // perdida sem aviso, o que é safety-critical num prontuário.
      saveToRecord(request.consultationAnamnesis, '').catch(() => {
        toast.error(
          'Não foi possível salvar a anamnese automaticamente. Use "Salvar nota" para tentar novamente.',
          { duration: 6000 }
        );
      });
    }
  }, [request, requestId, saveToRecord]);

  const handleCopy = async () => {
    if (!transcript) return;
    try {
      await navigator.clipboard.writeText(transcript);
      setCopied(true);
      toast.success('Transcrição copiada');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Falha ao copiar para a área de transferência');
    }
  };

  const handleNoteChange = (v: string) => {
    setClinicalNote(v);
  };

  const handleSaveNote = async () => {
    if (!requestId) return;
    try {
      await saveToRecord(request?.consultationAnamnesis ?? null, clinicalNote);
      toast.success('Nota salva');
    } catch {
      toast.error('Erro ao salvar');
    }
  };

  if (loading) {
    return (
      <DoctorLayout>
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="mb-4 h-10 w-10 animate-spin text-primary" />
          <p className="text-muted-foreground">Carregando resumo...</p>
        </div>
      </DoctorLayout>
    );
  }

  if (!request) {
    return (
      <DoctorLayout>
        <div className="py-20 text-center">
          <AlertTriangle className="mx-auto mb-4 h-12 w-12 text-destructive" />
          <p className="mb-4 text-muted-foreground">Consulta não encontrada</p>
          <Button onClick={() => navigate('/consultas')}>Voltar</Button>
        </div>
      </DoctorLayout>
    );
  }

  return (
    <DoctorLayout>
      <div className="max-w-3xl space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(`/pedidos/${requestId}`)}
              aria-label="Voltar"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-xl font-bold">Resumo da Consulta</h1>
              <p className="text-sm text-muted-foreground">
                {request.patientName ?? 'Paciente'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1.5">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            <span className="text-xs font-semibold">IA</span>
          </div>
        </div>

        {/* Anamnese */}
        {hasAnamnesis && anamnesis && (
          <Card className="shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <FileText className="h-4 w-4" /> Anamnese estruturada
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              {Object.entries(anamnesis).map(([key, value]) => {
                if (value == null || value === '') return null;
                const label = key
                  .replace(/_/g, ' ')
                  .replace(/\b\w/g, (c) => c.toUpperCase());
                const displayValue = Array.isArray(value)
                  ? value.join(', ')
                  : String(value);
                if (!displayValue.trim()) return null;
                return (
                  <div key={key}>
                    <span className="font-medium text-foreground">
                      {label}:
                    </span>{' '}
                    <span>{displayValue}</span>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        )}

        {/* Sugestões IA */}
        {hasSuggestions && (
          <Card className="border-amber-200/50 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base text-amber-700">
                <Lightbulb className="h-4 w-4" /> Sugestões clínicas
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {suggestions.map((s, i) => {
                const isDanger = s.startsWith('🚨');
                return (
                  <div
                    key={i}
                    className={`flex gap-2 rounded-lg p-3 ${isDanger ? 'bg-destructive/10' : 'bg-amber-50'}`}
                  >
                    {isDanger ? (
                      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                    ) : (
                      <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                    )}
                    <p
                      className={`text-sm ${isDanger ? 'text-destructive' : 'text-amber-800'}`}
                    >
                      {s.replace('🚨 ', '')}
                    </p>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        )}

        {/* Nota clínica editável */}
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText className="h-4 w-4" /> Nota clínica
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              Salva automaticamente no prontuário
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            <Textarea
              value={clinicalNote}
              onChange={(e) => handleNoteChange(e.target.value)}
              placeholder="Digite ou edite a nota clínica..."
              className="min-h-[100px]"
            />
            <Button size="sm" onClick={handleSaveNote}>
              Salvar nota
            </Button>
          </CardContent>
        </Card>

        {/* Transcrição */}
        {hasTranscript && (
          <Card className="shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <Mic className="h-4 w-4" /> Transcrição
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCopy}
                className="gap-1"
              >
                {copied ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
                {copied ? 'Copiado' : 'Copiar'}
              </Button>
            </CardHeader>
            <CardContent>
              <p
                className={`whitespace-pre-wrap text-sm text-muted-foreground ${!expandedTranscript ? 'line-clamp-8' : ''}`}
              >
                {transcript}
              </p>
              {!expandedTranscript && transcript.length > 300 && (
                <Button
                  variant="link"
                  size="sm"
                  className="mt-2 h-auto p-0"
                  onClick={() => setExpandedTranscript(true)}
                >
                  Expandir...
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        {!hasAnamnesis && !hasSuggestions && !hasTranscript && (
          <Card className="shadow-sm">
            <CardContent className="py-16 text-center">
              <Sparkles className="mx-auto mb-3 h-12 w-12 text-muted-foreground/50" />
              <p className="font-medium text-muted-foreground">
                Sem dados da IA
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                A transcrição e anamnese não foram geradas. Verifique se a
                gravação foi iniciada.
              </p>
            </CardContent>
          </Card>
        )}

        <div className="flex items-start gap-2 rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
          <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <p>
            Conteúdo gerado por IA como apoio à decisão clínica. A revisão e
            validação médica são obrigatórias. Conformidade com CFM Resolução
            2.299/2021.
          </p>
        </div>

        <Button
          className="w-full gap-2"
          onClick={() => navigate(`/pos-consulta/${requestId}`)}
        >
          <FileText className="h-4 w-4" /> Emitir documentos
        </Button>
        <Button
          variant="outline"
          className="w-full gap-2"
          onClick={() => navigate(`/pedidos/${requestId}`)}
        >
          <CheckCircle2 className="h-4 w-4" /> Concluir sem emitir
        </Button>
      </div>
    </DoctorLayout>
  );
}
