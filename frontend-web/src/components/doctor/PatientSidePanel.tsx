/**
 * PatientSidePanel — Prontuário resumido do paciente para split-view no desktop.
 * Mostra: dados básicos, alergias, condições crônicas, resumo narrativo,
 * problemas ativos, últimas notas clínicas e atendimentos.
 */
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  getPatientProfile,
  getPatientClinicalSummary,
  getPatientRequests,
  type PatientProfile,
  type PatientClinicalSummaryResponse,
  type MedicalRequest,
  DOCTOR_NOTE_TYPES,
} from '@/services/doctorApi';
import { parseApiList, getTypeIcon, getTypeLabel } from '@/lib/doctor-helpers';
import {
  User,
  Calendar,
  Phone,
  Mail,
  AlertTriangle,
  Heart,
  FileText,
  Stethoscope,
  StickyNote,
  ChevronRight,
  ChevronLeft,
  Loader2,
} from 'lucide-react';

function getNoteTypeLabel(key: string): string {
  const found = DOCTOR_NOTE_TYPES.find((t) => t.key === key);
  return found?.label ?? key;
}

export interface PatientSidePanelProps {
  patientId: string | null | undefined;
  currentRequestId?: string;
  collapsed?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
}

export function PatientSidePanel({
  patientId,
  currentRequestId,
  collapsed = false,
  onCollapsedChange,
}: PatientSidePanelProps) {
  const navigate = useNavigate();
  const [patient, setPatient] = useState<PatientProfile | null>(null);
  const [summary, setSummary] = useState<PatientClinicalSummaryResponse | null>(
    null
  );
  const [requests, setRequests] = useState<MedicalRequest[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!patientId) return;
    const controller = new AbortController();
    setLoading(true); // eslint-disable-line react-hooks/set-state-in-effect
    Promise.all([
      getPatientProfile(patientId),
      getPatientClinicalSummary(patientId).catch(() => null),
      getPatientRequests(patientId).catch(() => []),
    ])
      .then(([p, s, r]) => {
        if (controller.signal.aborted) return;
        setPatient(p);
        setSummary(s);
        setRequests(parseApiList<MedicalRequest>(r));
      })
      .catch(() => {
        if (!controller.signal.aborted) setPatient(null);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [patientId]);

  if (!patientId) return null;

  const allergies = patient?.allergies ?? [];
  const chronicConditions = patient?.chronicConditions ?? [];
  const narrativeSummary =
    summary?.structured?.narrativeSummary ??
    summary?.summary ??
    summary?.fallback;
  const problemList = summary?.structured?.problemList ?? [];
  const doctorNotes = (summary?.doctorNotes ?? []).slice(0, 5);
  const lastRequests = [...requests]
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
    .slice(0, 5)
    .filter((r) => r.id !== currentRequestId);

  const age = patient?.birthDate
    ? (() => {
        const birth = new Date(patient.birthDate);
        const today = new Date();
        let a = today.getFullYear() - birth.getFullYear();
        if (
          today.getMonth() < birth.getMonth() ||
          (today.getMonth() === birth.getMonth() &&
            today.getDate() < birth.getDate())
        ) {
          a--;
        }
        return a;
      })()
    : null;

  if (collapsed) {
    return (
      <div className="hidden min-w-[48px] shrink-0 flex-col items-center border-l border-border bg-muted/30 py-4 xl:flex">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onCollapsedChange?.(false)}
          aria-label="Expandir prontuário"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="mt-2 rotate-180 text-[10px] text-muted-foreground [writing-mode:vertical-rl]">
          Prontuário
        </span>
      </div>
    );
  }

  return (
    <aside className="hidden shrink-0 flex-col xl:flex xl:w-[40%] xl:min-w-[320px]">
      <div className="sticky top-0 max-h-screen overflow-y-auto border-l border-border bg-muted/20">
        <div className="flex items-center justify-between border-b border-border bg-background/95 px-4 py-2">
          <span className="text-sm font-semibold">Prontuário do Paciente</span>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => onCollapsedChange?.(true)}
            aria-label="Recolher prontuário"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <div className="space-y-4 p-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              {/* Dados básicos */}
              <Card className="shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/10">
                      <User className="h-5 w-5 text-primary" />
                      {patient?.avatarUrl && (
                        <img
                          src={patient.avatarUrl}
                          alt=""
                          className="absolute inset-0 h-full w-full object-cover"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">
                        {patient?.name ?? '—'}
                      </p>
                      {patient?.email && (
                        <p className="flex items-center gap-1 truncate text-xs text-muted-foreground">
                          <Mail className="h-3 w-3 shrink-0" /> {patient.email}
                        </p>
                      )}
                      <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                        {patient?.phone && (
                          <span className="flex items-center gap-1">
                            <Phone className="h-3 w-3" /> {patient.phone}
                          </span>
                        )}
                        {age != null && (
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" /> {age} anos
                          </span>
                        )}
                        {patient?.gender && (
                          <span className="flex items-center gap-1">
                            <User className="h-3 w-3" />{' '}
                            {patient.gender === 'male'
                              ? 'M'
                              : patient.gender === 'female'
                                ? 'F'
                                : patient.gender}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Alergias e condições crônicas */}
              {(allergies.length > 0 || chronicConditions.length > 0) && (
                <div className="space-y-2">
                  {allergies.length > 0 && (
                    <div>
                      <p className="mb-1.5 flex items-center gap-1 text-xs font-semibold text-red-600">
                        <AlertTriangle className="h-3.5 w-3.5" /> Alergias
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {allergies.map((a, i) => (
                          <Badge
                            key={i}
                            variant="outline"
                            className="border-red-200 bg-red-50 text-xs text-red-700"
                          >
                            {a}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  {chronicConditions.length > 0 && (
                    <div>
                      <p className="mb-1.5 flex items-center gap-1 text-xs font-semibold text-amber-600">
                        <Heart className="h-3.5 w-3.5" /> Condições crônicas
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {chronicConditions.map((c, i) => (
                          <Badge
                            key={i}
                            variant="outline"
                            className="border-amber-200 bg-amber-50 text-xs text-amber-800"
                          >
                            {c}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Resumo narrativo */}
              {narrativeSummary && (
                <Card className="shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-sm">
                      <FileText className="h-3.5 w-3.5 text-primary" />
                      Resumo clínico
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <p className="line-clamp-6 text-xs leading-relaxed text-muted-foreground">
                      {narrativeSummary}
                    </p>
                  </CardContent>
                </Card>
              )}

              {/* Problemas ativos */}
              {problemList.length > 0 && (
                <Card className="shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-sm">
                      <Stethoscope className="h-3.5 w-3.5 text-primary" />
                      Problemas ativos
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <ul className="space-y-1">
                      {problemList.slice(0, 8).map((p, i) => (
                        <li
                          key={i}
                          className="flex items-start gap-2 text-xs text-muted-foreground"
                        >
                          <span className="mt-0.5 text-primary">•</span>
                          <span>{p}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}

              {/* Últimas 5 notas clínicas */}
              {doctorNotes.length > 0 && (
                <Card className="shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-sm">
                      <StickyNote className="h-3.5 w-3.5 text-primary" />
                      Notas clínicas
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 pt-0">
                    {doctorNotes.map((n) => (
                      <div
                        key={n.id}
                        className="rounded-lg border border-border/50 bg-muted/50 p-2"
                      >
                        <p className="text-[10px] font-semibold uppercase text-primary">
                          {getNoteTypeLabel(n.noteType)}
                        </p>
                        <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                          {n.content}
                        </p>
                        <p className="mt-1 text-[10px] text-muted-foreground">
                          {new Date(n.createdAt).toLocaleDateString('pt-BR', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </p>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              {/* Últimos 5 atendimentos */}
              {lastRequests.length > 0 && (
                <Card className="shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-sm">
                      <FileText className="h-3.5 w-3.5 text-primary" />
                      Atendimentos recentes
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="space-y-1">
                      {lastRequests.map((r) => {
                        const Icon = getTypeIcon(r.type);
                        return (
                          <button
                            key={r.id}
                            type="button"
                            onClick={() => navigate(`/pedidos/${r.id}`)}
                            className="group flex w-full items-center gap-2 rounded-lg p-2 text-left transition-colors hover:bg-muted/50"
                          >
                            <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                            <span className="flex-1 truncate text-xs">
                              {getTypeLabel(r.type)} ·{' '}
                              {new Date(r.createdAt).toLocaleDateString(
                                'pt-BR',
                                {
                                  day: '2-digit',
                                  month: 'short',
                                }
                              )}
                            </span>
                            <ChevronRight className="h-3 w-3 shrink-0 text-muted-foreground opacity-0 group-hover:opacity-100" />
                          </button>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              )}

              <Button
                variant="outline"
                size="sm"
                className="w-full gap-1"
                onClick={() => navigate(`/paciente/${patientId}`)}
              >
                Ver prontuário completo
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </>
          )}
        </div>
      </div>
    </aside>
  );
}
