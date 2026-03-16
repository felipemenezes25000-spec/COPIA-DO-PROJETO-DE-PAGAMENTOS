import { Mic, Copy } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface Props {
  transcript: string;
}

export function TranscriptionCard({ transcript }: Props) {
  if (!transcript.trim()) return null;
  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Mic className="h-4 w-4 text-primary" aria-hidden />
            Transcrição da Consulta
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={async () => {
              await navigator.clipboard.writeText(transcript);
              toast.success('Transcrição copiada');
            }}
            className="gap-1.5"
          >
            <Copy className="h-3.5 w-3.5" />
            Copiar
          </Button>
        </div>
        <p className="text-xs text-muted-foreground italic">
          Transcrição automática — pode conter imprecisões.
        </p>
      </CardHeader>
      <CardContent className="pt-0">
        <p className="text-sm text-muted-foreground whitespace-pre-wrap max-h-48 overflow-y-auto">
          {transcript}
        </p>
      </CardContent>
    </Card>
  );
}
