import { memo } from 'react';
import { motion } from 'framer-motion';
import type { CandidateStatus } from '../../types/admin';

const statusConfig: Record<CandidateStatus, { label: string; className: string }> = {
  pendente: {
    label: 'Pendente',
    className: 'bg-amber-50 text-amber-700 border-amber-200',
  },
  em_analise: {
    label: 'Em análise',
    className: 'bg-sky-50 text-sky-700 border-sky-200',
  },
  entrevista: {
    label: 'Entrevista',
    className: 'bg-purple-50 text-purple-700 border-purple-200',
  },
  aprovado: {
    label: 'Aprovado',
    className: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
  rejeitado: {
    label: 'Rejeitado',
    className: 'bg-red-50 text-red-700 border-red-200',
  },
};

function StatusBadge({ status }: { status: CandidateStatus }) {
  const cfg = statusConfig[status];
  return (
    <motion.span
      // Re-mounts when `status` changes so the fade/scale animation replays —
      // this gives visual feedback when an admin updates a candidate's state.
      key={status}
      initial={{ opacity: 0, scale: 0.92 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
      role="status"
      aria-label={`Status do candidato: ${cfg.label}`}
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${cfg.className}`}
    >
      {cfg.label}
    </motion.span>
  );
}

export default memo(StatusBadge);
