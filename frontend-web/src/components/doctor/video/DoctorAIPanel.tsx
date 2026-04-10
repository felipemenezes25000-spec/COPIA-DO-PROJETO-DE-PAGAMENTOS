/**
 * DoctorAIPanel — Painel lateral do médico durante a videoconsulta (web).
 * Versão simplificada: exibe anamnese bruta e sugestões clínicas.
 */
interface DoctorAIPanelProps {
  anamnesis: Record<string, unknown> | null;
  suggestions: (string | { text?: string; suggestion?: string })[];
}

export function DoctorAIPanel({ anamnesis, suggestions }: DoctorAIPanelProps) {
  const hasAna = anamnesis && Object.keys(anamnesis).length > 0;
  const normalizedSuggestions = suggestions
    .map((s) => (typeof s === 'string' ? s : s.text ?? s.suggestion ?? ''))
    .filter((s) => s.length > 0);

  return (
    <div className="flex-1 overflow-auto p-4 space-y-4 text-sm text-gray-200">
      {!hasAna && normalizedSuggestions.length === 0 && (
        <p className="text-gray-400 text-xs">
          Aguardando análise da IA...
        </p>
      )}

      {hasAna && (
        <section>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">
            Anamnese
          </h3>
          <pre className="whitespace-pre-wrap break-words bg-gray-800/50 rounded p-2 text-xs">
            {JSON.stringify(anamnesis, null, 2)}
          </pre>
        </section>
      )}

      {normalizedSuggestions.length > 0 && (
        <section>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">
            Sugestões clínicas
          </h3>
          <ul className="space-y-1.5">
            {normalizedSuggestions.map((s, i) => (
              <li key={i} className="bg-gray-800/50 rounded p-2 text-xs">
                {s}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
