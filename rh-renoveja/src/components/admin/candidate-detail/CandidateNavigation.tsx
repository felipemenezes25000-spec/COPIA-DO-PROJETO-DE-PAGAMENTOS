import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useEffect } from 'react';

interface CandidateNavigationProps {
  prevId: string | null;
  nextId: string | null;
  position: number | null;
  total: number;
}

/**
 * Compact prev/next navigation shown next to the candidate's name in
 * the sticky header. Hidden entirely when there's no cached order
 * (deep links, cleared cache).
 *
 * Keyboard shortcut: ArrowLeft / ArrowRight navigate when the user is
 * NOT focused inside a text field. The shortcut registration is local
 * to this component so it unmounts cleanly when the user leaves the
 * detail page.
 */
export default function CandidateNavigation({
  prevId,
  nextId,
  position,
  total,
}: CandidateNavigationProps) {
  const navigate = useNavigate();

  // Keyboard shortcuts — only trigger if the user is not typing into
  // an input/textarea/contenteditable, to avoid stealing focus from
  // the note form or the rejection reason textarea.
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      const tag = target.tagName;
      if (
        tag === 'INPUT' ||
        tag === 'TEXTAREA' ||
        tag === 'SELECT' ||
        target.isContentEditable
      ) {
        return;
      }
      if (e.key === 'ArrowLeft' && prevId) {
        e.preventDefault();
        navigate(`/admin/candidatos/${prevId}`);
      } else if (e.key === 'ArrowRight' && nextId) {
        e.preventDefault();
        navigate(`/admin/candidatos/${nextId}`);
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [navigate, prevId, nextId]);

  // Nothing cached → hide the control entirely.
  if (position === null || total === 0) return null;

  return (
    <div
      role="group"
      aria-label="Navegar entre candidatos"
      className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white/80 backdrop-blur-sm px-1.5 py-1"
    >
      <button
        type="button"
        disabled={!prevId}
        onClick={() => prevId && navigate(`/admin/candidatos/${prevId}`)}
        aria-label="Candidato anterior (atalho: ←)"
        title="Candidato anterior (atalho: ←)"
        className="inline-flex items-center justify-center w-7 h-7 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-400"
      >
        <ChevronLeft size={15} aria-hidden="true" />
      </button>
      <span className="text-[11px] font-bold text-slate-600 tabular-nums px-1 select-none">
        {position}
        <span className="text-slate-300 mx-0.5">/</span>
        <span className="text-slate-400">{total}</span>
      </span>
      <button
        type="button"
        disabled={!nextId}
        onClick={() => nextId && navigate(`/admin/candidatos/${nextId}`)}
        aria-label="Próximo candidato (atalho: →)"
        title="Próximo candidato (atalho: →)"
        className="inline-flex items-center justify-center w-7 h-7 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-400"
      >
        <ChevronRight size={15} aria-hidden="true" />
      </button>
    </div>
  );
}
