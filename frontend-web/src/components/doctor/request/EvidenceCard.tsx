import { BookOpen } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface EvidenceItem {
  title?: string;
  source?: string;
  provider?: string;
  clinicalRelevance?: string;
  url?: string;
}

interface Props {
  evidenceJson: string | null | undefined;
}

function parse(json: string | null | undefined): EvidenceItem[] {
  if (!json?.trim()) return [];
  try {
    const parsed = JSON.parse(json);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function EvidenceCard({ evidenceJson }: Props) {
  const items = parse(evidenceJson);
  if (!items.length) return null;
  return (
    <Card className="shadow-sm border-primary/20">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <BookOpen className="h-4 w-4 text-primary" aria-hidden />
          Artigos Científicos (apoio ao CID)
        </CardTitle>
        <p className="text-xs text-muted-foreground">Fontes: PubMed, Europe PMC, Semantic Scholar.</p>
      </CardHeader>
      <CardContent className="pt-0 space-y-3">
        {items.map((item, i) => (
          <div key={i} className="p-3 rounded-lg bg-muted/50 border border-border/50">
            <p className="text-xs font-medium text-primary">{item.provider ?? 'Fonte'}</p>
            <p className="text-sm font-medium">{item.title ?? item.source ?? '—'}</p>
            {item.clinicalRelevance && (
              <p className="text-xs text-muted-foreground mt-1">{item.clinicalRelevance}</p>
            )}
            {item.url && (
              <a
                href={item.url}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-primary hover:underline mt-2 inline-flex items-center gap-1"
              >
                Abrir artigo
              </a>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
