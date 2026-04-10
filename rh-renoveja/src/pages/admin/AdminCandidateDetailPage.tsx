import { useState, useEffect, type FormEvent } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, User, Briefcase, GraduationCap,
  Sparkles, StickyNote, FileText, AlertTriangle, RotateCw, ArrowLeft,
} from 'lucide-react';
import AIAnalysisCard from '../../components/admin/AIAnalysisCard';
import CandidateHeader, { type StatusOption } from '../../components/admin/candidate-detail/CandidateHeader';
import CandidateTabs, { type TabItem } from '../../components/admin/candidate-detail/CandidateTabs';
import CandidateDetailSkeleton from '../../components/admin/candidate-detail/CandidateDetailSkeleton';
import TabVisaoGeral from '../../components/admin/candidate-detail/TabVisaoGeral';
import TabPessoal from '../../components/admin/candidate-detail/TabPessoal';
import TabProfissional from '../../components/admin/candidate-detail/TabProfissional';
import TabAcademico from '../../components/admin/candidate-detail/TabAcademico';
import TabDocumentos from '../../components/admin/candidate-detail/TabDocumentos';
import TabNotas from '../../components/admin/candidate-detail/TabNotas';
import CandidateIdentitySidebar from '../../components/admin/candidate-detail/CandidateIdentitySidebar';
import DecisionPanel from '../../components/admin/candidate-detail/DecisionPanel';
import { fetchCandidateById, updateCandidateStatus, addCandidateNote } from '../../lib/admin-api';
import { useAdminAuth } from '../../contexts/AdminAuthContext';
import type { AdminCandidate, CandidateStatus } from '../../types/admin';
import { useToast } from '../../components/ui/Toast';

const STATUS_FLOW: StatusOption[] = [
  { value: 'pendente', label: 'Pendente', color: 'bg-amber-500' },
  { value: 'em_analise', label: 'Em análise', color: 'bg-sky-500' },
  { value: 'entrevista', label: 'Entrevista', color: 'bg-purple-500' },
  { value: 'aprovado', label: 'Aprovado', color: 'bg-emerald-500' },
  { value: 'rejeitado', label: 'Rejeitado', color: 'bg-red-500' },
];

export default function AdminCandidateDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { token } = useAdminAuth();
  const { toast } = useToast();
  const [candidate, setCandidate] = useState<AdminCandidate | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [statusLoading, setStatusLoading] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<CandidateStatus | null>(null);
  const [noteText, setNoteText] = useState('');
  const [noteLoading, setNoteLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('visao');
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setLoading(true);
    setLoadError(null);
    // Reset the active tab when navigating between candidates via the
    // prev/next arrows — otherwise the user lands on the previous
    // candidate's "Acadêmico" tab expecting "Visão geral".
    setActiveTab('visao');
    fetchCandidateById(id, token)
      .then((c) => {
        if (!cancelled) setCandidate(c);
      })
      .catch((err) => {
        if (cancelled) return;
        console.error('fetchCandidateById failed', err);
        setLoadError(
          err instanceof Error ? err.message : 'Erro ao carregar candidato',
        );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id, token, reloadKey]);

  async function handleStatusChange(newStatus: CandidateStatus, reason?: string) {
    if (!candidate || statusLoading) return;
    setStatusLoading(true);
    setPendingStatus(newStatus);
    try {
      const updated = await updateCandidateStatus(candidate.id, newStatus, token, reason);
      setCandidate(updated);
      toast('success', `Status alterado para "${STATUS_FLOW.find((s) => s.value === newStatus)?.label}"`);
    } catch {
      toast('error', 'Erro ao alterar status');
    } finally {
      setStatusLoading(false);
      setPendingStatus(null);
    }
  }

  async function handleAddNote(e: FormEvent) {
    e.preventDefault();
    if (!candidate || !noteText.trim() || noteLoading) return;
    setNoteLoading(true);
    try {
      const note = await addCandidateNote(candidate.id, noteText.trim(), token);
      setCandidate({ ...candidate, notas: [note, ...candidate.notas] });
      setNoteText('');
      toast('success', 'Nota adicionada');
    } catch {
      toast('error', 'Erro ao adicionar nota');
    } finally {
      setNoteLoading(false);
    }
  }

  if (loading) {
    return <CandidateDetailSkeleton />;
  }

  if (!candidate) {
    return (
      <div
        className="max-w-md mx-auto mt-16 bg-white border border-slate-200 rounded-2xl p-8 text-center shadow-card"
        role="alert"
      >
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-red-50 text-red-500 mb-3">
          <AlertTriangle size={22} aria-hidden="true" />
        </div>
        <h2 className="text-base font-semibold text-slate-800 mb-1">
          Não foi possível carregar
        </h2>
        <p className="text-sm text-slate-500 mb-5">
          {loadError ?? 'Candidato não encontrado.'}
        </p>
        <div className="flex items-center justify-center gap-2">
          <button
            type="button"
            onClick={() => navigate('/admin/candidatos')}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
          >
            <ArrowLeft size={14} aria-hidden="true" />
            Voltar
          </button>
          <button
            type="button"
            onClick={() => setReloadKey((k) => k + 1)}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg bg-primary-600 text-white hover:bg-primary-700 transition-colors"
          >
            <RotateCw size={14} aria-hidden="true" />
            Tentar novamente
          </button>
        </div>
        <Link
          to="/admin/candidatos"
          className="sr-only"
          aria-hidden="true"
          tabIndex={-1}
        >
          Voltar
        </Link>
      </div>
    );
  }

  // Build tabs with a dynamic notes badge so the user notices when there
  // are unread notes to review. We badge the raw count (not "unread") —
  // we don't have a read-state model, and the count is still useful.
  const TABS: TabItem[] = [
    { id: 'visao', label: 'Visão geral', icon: LayoutDashboard },
    { id: 'pessoal', label: 'Pessoal', icon: User },
    { id: 'profissional', label: 'Profissional', icon: Briefcase },
    { id: 'academico', label: 'Acadêmico', icon: GraduationCap },
    { id: 'ia', label: 'Análise IA', icon: Sparkles },
    { id: 'notas', label: 'Notas', icon: StickyNote, badge: candidate.notas.length },
    { id: 'documentos', label: 'Documentos', icon: FileText },
  ];

  return (
    <div>
      <CandidateHeader
        candidate={candidate}
        statusOptions={STATUS_FLOW}
        statusLoading={statusLoading}
        pendingStatus={pendingStatus}
        onStatusChange={handleStatusChange}
      />

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="max-w-[1440px] mx-auto pt-5 pb-10 grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6"
      >
        {/* Left column — candidate identity + decision + (on lg) sticky */}
        <div className="space-y-4 lg:sticky lg:top-[170px] lg:self-start">
          <CandidateIdentitySidebar candidate={candidate} />
          <DecisionPanel
            candidate={candidate}
            statusLoading={statusLoading}
            pendingStatus={pendingStatus}
            onStatusChange={handleStatusChange}
          />
        </div>

        {/* Right column — tabs */}
        <div className="min-w-0">
          <CandidateTabs tabs={TABS} active={activeTab} onChange={setActiveTab} />
          <div className="pt-5">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.18 }}
                role="tabpanel"
                id={`panel-${activeTab}`}
                aria-labelledby={`tab-${activeTab}`}
              >
                {activeTab === 'visao' && <TabVisaoGeral candidate={candidate} />}
                {activeTab === 'pessoal' && <TabPessoal candidate={candidate} />}
                {activeTab === 'profissional' && <TabProfissional candidate={candidate} />}
                {activeTab === 'academico' && <TabAcademico candidate={candidate} />}
                {activeTab === 'ia' && (
                  <AIAnalysisCard candidate={candidate} token={token} />
                )}
                {activeTab === 'notas' && (
                  <TabNotas
                    candidate={candidate}
                    noteText={noteText}
                    setNoteText={setNoteText}
                    noteLoading={noteLoading}
                    onSubmit={handleAddNote}
                  />
                )}
                {activeTab === 'documentos' && <TabDocumentos candidate={candidate} />}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
