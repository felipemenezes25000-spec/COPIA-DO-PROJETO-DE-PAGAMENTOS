import { memo } from 'react';
import type { AIRecommendation } from '../../../types/admin';
import { scoreColor, recLabel, recTextColor } from './ai-style';

interface AIScoreCellProps {
  score: number;
  rec: AIRecommendation;
}

/**
 * Compact score visual rendered inside every row of the candidates
 * table. Wrapped in React.memo because a full-page sort/filter re-render
 * would otherwise rebuild N of these unnecessarily — they only depend
 * on (score, rec), both primitives.
 */
function AIScoreCellImpl({ score, rec }: AIScoreCellProps) {
  const tone = scoreColor(score);
  const toneParts = tone.split(' ');
  const ringBg = toneParts.slice(2).join(' ');
  const gradient = toneParts.slice(0, 2).join(' ');

  return (
    <div
      className="flex items-center gap-2.5"
      aria-label={`Score ${score} de 100, recomendação ${recLabel(rec)}`}
    >
      <div
        className={`relative flex items-center justify-center w-10 h-10 rounded-lg ring-1 ${ringBg}`}
      >
        <span className="text-[13px] font-bold tabular-nums">{score}</span>
      </div>
      <div className="flex flex-col min-w-0">
        <span className={`text-xs font-semibold ${recTextColor(rec)}`}>
          {recLabel(rec)}
        </span>
        <div className="w-16 h-1 bg-slate-100 rounded-full overflow-hidden mt-0.5">
          <div
            className={`h-full bg-gradient-to-r ${gradient}`}
            style={{ width: `${Math.max(4, score)}%` }}
          />
        </div>
      </div>
    </div>
  );
}

const AIScoreCell = memo(AIScoreCellImpl);
export default AIScoreCell;
