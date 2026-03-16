import { Pill } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { Medication } from '@/services/doctorApi';

interface Props {
  medications: (Medication | string)[];
}

export function MedicationsCard({ medications }: Props) {
  if (!medications.length) return null;
  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Pill className="h-4 w-4 text-primary" aria-hidden />
          Medicamentos
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-3">
          {medications.map((med, i) => {
            const item =
              typeof med === 'object' && med && 'name' in med
                ? (med as { name?: string; dosage?: string; frequency?: string; duration?: string; notes?: string })
                : { name: String(med), dosage: '—', frequency: '—', duration: '—' };
            return (
              <div key={i} className="p-3 rounded-lg bg-muted/50 border border-border/50">
                <p className="font-medium text-sm">{item.name || '—'}</p>
                <div className="grid grid-cols-3 gap-2 mt-1.5 text-xs text-muted-foreground">
                  <span>Dose: {item.dosage ?? '—'}</span>
                  <span>Freq: {item.frequency ?? '—'}</span>
                  <span>Duração: {item.duration ?? '—'}</span>
                </div>
                {item.notes && <p className="text-xs text-muted-foreground mt-1">{item.notes}</p>}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
