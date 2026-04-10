import {
  MapPin,
  Briefcase,
  GraduationCap,
  Mail,
  Phone,
  MessageCircle,
  Shield,
  Sparkles,
  Calendar,
  Fingerprint,
} from 'lucide-react';
import Avatar from '../shared/Avatar';
import { CATEGORY_LABELS, computeAge, formatDate } from './shared';
import { scoreColor, recLabel, recTextColor } from '../candidates/ai-style';
import type { AdminCandidate } from '../../../types/admin';

interface CandidateIdentitySidebarProps {
  candidate: AdminCandidate;
}

/**
 * Left-column sidebar on the candidate detail page. Renders everything a
 * recruiter wants to see "at a glance" while reading the tab content on
 * the right: avatar + name + category + location + quick contact
 * actions + AI score summary.
 *
 * Design intent: the sidebar is the *candidate identity card*. The right
 * column (tabs) is the *candidate dossier*. This split lets a recruiter
 * hover over "Acadêmico" without losing sight of who they are looking at.
 */
export default function CandidateIdentitySidebar({ candidate }: CandidateIdentitySidebarProps) {
  const age = computeAge(candidate.nascimento);
  const categoryLabel = CATEGORY_LABELS[candidate.categoria] ?? candidate.categoria ?? '—';

  const location =
    candidate.cidade && candidate.estado
      ? `${candidate.cidade}/${candidate.estado}`
      : candidate.estado || '—';

  // Build the council string "CRM/SP 123456" only when all three parts are
  // present — better to omit than render "CRM/ 123456" with gaps.
  const councilLabel =
    candidate.conselho && candidate.ufRegistro
      ? `${candidate.conselho}/${candidate.ufRegistro}`
      : candidate.conselho || '—';

  // Whatsapp link: strip non-digits from phone. Brazilian numbers on the
  // mobile app are stored with mask "(11) 99999-9999" — we strip that to
  // produce a wa.me link with just digits.
  const phoneDigits = (candidate.telefone || '').replace(/\D/g, '');
  const waLink = phoneDigits.length >= 10 ? `https://wa.me/55${phoneDigits}` : null;

  const aiScore = candidate.aiAnalysis?.score;
  const aiRec = candidate.aiAnalysis?.recomendacao;

  // Decompose scoreColor's tailwind tuple so we can use the gradient and
  // ring tokens separately on the score tile.
  let scoreGradient = '';
  let scoreRing = '';
  let scoreText = '';
  if (typeof aiScore === 'number') {
    const parts = scoreColor(aiScore).split(' ');
    scoreGradient = parts.slice(0, 2).join(' '); // from-x to-y
    scoreText = parts[2]; // text-x
    scoreRing = parts[4]; // ring-x
  }

  return (
    <aside
      className="space-y-4 lg:sticky lg:top-[calc(var(--candidate-header-height)_+_1rem)]"
      aria-label="Identidade do candidato"
    >
      {/* Identity card */}
      <section className="bg-white rounded-2xl border border-slate-200 p-5 shadow-card overflow-hidden relative">
        {/* Decorative top gradient band */}
        <div
          aria-hidden="true"
          className="absolute inset-x-0 top-0 h-20 bg-gradient-to-br from-primary-50 via-white to-teal-50/40"
        />

        <div className="relative flex flex-col items-center text-center">
          <Avatar name={candidate.nome} size={88} elevated ring="primary" />
          <h3 className="mt-3 text-lg font-display font-bold text-slate-900 leading-tight">
            {candidate.nome}
          </h3>
          <p className="mt-0.5 text-sm text-slate-500 flex items-center gap-1">
            <Briefcase size={12} className="text-slate-400" aria-hidden="true" />
            {categoryLabel}
          </p>
          {candidate.especialidade && (
            <p className="mt-0.5 text-xs text-slate-400 max-w-full break-words px-2">
              {candidate.especialidade}
            </p>
          )}
        </div>

        {/* Identity chips */}
        <div className="relative mt-5 grid grid-cols-2 gap-2">
          <div className="flex items-center gap-1.5 px-2.5 py-2 rounded-lg bg-slate-50 border border-slate-100">
            <MapPin size={12} className="text-slate-400 shrink-0" aria-hidden="true" />
            <div className="min-w-0">
              <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
                Local
              </p>
              <p className="text-xs font-semibold text-slate-700 truncate">{location}</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-2 rounded-lg bg-slate-50 border border-slate-100">
            <Calendar size={12} className="text-slate-400 shrink-0" aria-hidden="true" />
            <div className="min-w-0">
              <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
                Idade
              </p>
              <p className="text-xs font-semibold text-slate-700 truncate">
                {age ? `${age} anos` : '—'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-2 rounded-lg bg-slate-50 border border-slate-100">
            <Shield size={12} className="text-slate-400 shrink-0" aria-hidden="true" />
            <div className="min-w-0">
              <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
                Conselho
              </p>
              <p className="text-xs font-semibold text-slate-700 truncate">{councilLabel}</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-2 rounded-lg bg-slate-50 border border-slate-100">
            <GraduationCap size={12} className="text-slate-400 shrink-0" aria-hidden="true" />
            <div className="min-w-0">
              <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
                Graduação
              </p>
              <p className="text-xs font-semibold text-slate-700 truncate">
                {candidate.anoConclusao || '—'}
              </p>
            </div>
          </div>
        </div>

        {/* Protocolo (full row below chips) */}
        <div className="relative mt-2 flex items-center gap-1.5 px-2.5 py-2 rounded-lg bg-slate-50 border border-slate-100">
          <Fingerprint size={12} className="text-slate-400 shrink-0" aria-hidden="true" />
          <div className="min-w-0 flex-1">
            <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
              Protocolo
            </p>
            <p className="text-xs font-mono font-semibold text-slate-700 truncate">
              {candidate.protocolo}
            </p>
          </div>
        </div>

        <p className="relative mt-2 text-[10px] text-slate-400 text-center">
          Cadastrado em {formatDate(candidate.createdAt)}
        </p>
      </section>

      {/* Quick contact actions */}
      <section
        className="bg-white rounded-2xl border border-slate-200 p-5 shadow-card"
        aria-labelledby="sidebar-contact-heading"
      >
        <h4
          id="sidebar-contact-heading"
          className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500 mb-3 flex items-center gap-2"
        >
          <span
            aria-hidden="true"
            className="inline-block w-1 h-3.5 rounded-full bg-gradient-to-b from-primary-400 to-primary-700"
          />
          Contato rápido
        </h4>
        <div className="space-y-2">
          {candidate.email && (
            <a
              href={`mailto:${candidate.email}`}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-slate-200 hover:border-primary-300 hover:bg-primary-50/50 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 group"
            >
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary-50 text-primary-600 group-hover:bg-primary-100 transition-colors">
                <Mail size={14} aria-hidden="true" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  E-mail
                </p>
                <p className="text-xs font-semibold text-slate-700 truncate">{candidate.email}</p>
              </div>
            </a>
          )}
          {candidate.telefone && (
            <a
              href={`tel:${phoneDigits}`}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-slate-200 hover:border-sky-300 hover:bg-sky-50/50 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 group"
            >
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-sky-50 text-sky-600 group-hover:bg-sky-100 transition-colors">
                <Phone size={14} aria-hidden="true" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Telefone
                </p>
                <p className="text-xs font-semibold text-slate-700 truncate">{candidate.telefone}</p>
              </div>
            </a>
          )}
          {waLink && (
            <a
              href={waLink}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/50 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 group"
            >
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 group-hover:bg-emerald-100 transition-colors">
                <MessageCircle size={14} aria-hidden="true" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  WhatsApp
                </p>
                <p className="text-xs font-semibold text-slate-700">Abrir conversa</p>
              </div>
            </a>
          )}
          {!candidate.email && !candidate.telefone && (
            <p className="text-xs text-slate-400 text-center py-2">
              Sem dados de contato disponíveis.
            </p>
          )}
        </div>
      </section>

      {/* AI score summary */}
      {typeof aiScore === 'number' && aiRec && (
        <section
          className="bg-white rounded-2xl border border-slate-200 p-5 shadow-card overflow-hidden relative"
          aria-labelledby="sidebar-ai-heading"
        >
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-violet-100/40 blur-2xl"
          />

          <h4
            id="sidebar-ai-heading"
            className="relative text-xs font-bold uppercase tracking-[0.14em] text-slate-500 mb-3 flex items-center gap-2"
          >
            <span
              aria-hidden="true"
              className="inline-block w-1 h-3.5 rounded-full bg-gradient-to-b from-violet-400 to-fuchsia-600"
            />
            <Sparkles size={12} className="text-violet-500" aria-hidden="true" />
            Análise da IA
          </h4>

          <div className="relative flex items-center gap-4">
            <div
              className={`flex items-center justify-center w-16 h-16 rounded-2xl ring-1 bg-gradient-to-br ${scoreGradient} text-white shadow-[0_8px_20px_-6px_rgba(139,92,246,0.35)] ${scoreRing}`}
            >
              <span className="text-xl font-display font-bold tabular-nums">{aiScore}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-bold ${recTextColor(aiRec)}`}>{recLabel(aiRec)}</p>
              <div className="mt-1.5 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                <div
                  className={`h-full rounded-full bg-gradient-to-r ${scoreGradient} transition-all duration-700`}
                  style={{ width: `${Math.max(4, aiScore)}%` }}
                />
              </div>
              <p className={`mt-1 text-[10px] font-semibold ${scoreText}`}>{aiScore}/100</p>
            </div>
          </div>
        </section>
      )}
    </aside>
  );
}
