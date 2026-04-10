import { FileText, Download, FileCheck } from 'lucide-react';
import type { AdminCandidate } from '../../../types/admin';
import { EmptyState } from './shared-ui';

interface TabDocumentosProps {
  candidate: AdminCandidate;
}

interface DocLinkProps {
  href: string;
  title: string;
  subtitle: string;
  icon: typeof FileText;
}

function DocLink({ href, title, subtitle, icon: Icon }: DocLinkProps) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex items-center gap-4 bg-white border border-slate-200 rounded-xl p-4 hover:border-primary-300 hover:shadow-sm transition-all"
      aria-label={`Baixar ${title}`}
    >
      <div className="flex items-center justify-center w-11 h-11 rounded-lg bg-primary-50 text-primary-600 shrink-0">
        <Icon size={20} aria-hidden="true" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-slate-800">{title}</p>
        <p className="text-xs text-slate-500 truncate">{subtitle}</p>
      </div>
      <Download
        size={18}
        className="text-slate-400 group-hover:text-primary-600 transition-colors shrink-0"
        aria-hidden="true"
      />
    </a>
  );
}

export default function TabDocumentos({ candidate }: TabDocumentosProps) {
  const hasCurriculo = Boolean(candidate.curriculoUrl);
  const hasDiploma = Boolean(candidate.diplomaUrl);

  if (!hasCurriculo && !hasDiploma) {
    return (
      <section className="bg-white rounded-xl border border-slate-200">
        <EmptyState
          icon={<FileText size={36} aria-hidden="true" />}
          title="Candidato não enviou documentos"
          description="Nenhum currículo ou diploma disponível até o momento."
        />
      </section>
    );
  }

  return (
    <div className="space-y-3" aria-label="Documentos do candidato">
      {hasCurriculo && candidate.curriculoUrl && (
        <DocLink
          href={candidate.curriculoUrl}
          title="Currículo"
          subtitle="Abrir em nova aba"
          icon={FileText}
        />
      )}
      {hasDiploma && candidate.diplomaUrl && (
        <DocLink
          href={candidate.diplomaUrl}
          title="Diploma"
          subtitle="Abrir em nova aba"
          icon={FileCheck}
        />
      )}
    </div>
  );
}
