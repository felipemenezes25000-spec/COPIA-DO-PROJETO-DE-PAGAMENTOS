/**
 * PrescriptionImageGallery — Galeria de imagens com zoom.
 * Alinhado ao mobile PrescriptionImageGallery.
 */
import { useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Image, Expand } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

interface PrescriptionImageGalleryProps {
  images: string[];
  label: string;
  iconBgColor?: string;
  className?: string;
}

export function PrescriptionImageGallery({
  images,
  label,
  iconBgColor = 'bg-primary/10',
  className,
}: PrescriptionImageGalleryProps) {
  const [selectedUrl, setSelectedUrl] = useState<string | null>(null);

  if (!images?.length) return null;

  return (
    <>
      <Card className={className}>
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <div
              className={cn(
                'flex h-8 w-8 items-center justify-center rounded-lg',
                iconBgColor
              )}
            >
              <Image className="h-4 w-4 text-primary" aria-hidden />
            </div>
            <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
              {label}
            </span>
            <span className="ml-auto text-xs text-muted-foreground">
              Clique para ampliar
            </span>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex gap-3 overflow-x-auto pb-2">
            {images.map((url, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setSelectedUrl(url)}
                className="relative shrink-0 overflow-hidden rounded-xl border border-border/50 transition-colors hover:border-primary/30 focus:outline-none focus:ring-2 focus:ring-primary/30"
                aria-label={`Ver imagem ${i + 1} de ${images.length}`}
              >
                <img
                  src={url}
                  alt={`${label} ${i + 1}`}
                  className="h-48 w-40 object-cover"
                />
                <div className="absolute bottom-2 right-2 rounded-lg bg-black/50 p-1.5">
                  <Expand className="h-3.5 w-3.5 text-white" />
                </div>
                {images.length > 1 && (
                  <div className="absolute left-2 top-2 rounded-md bg-black/50 px-2 py-0.5 text-xs font-medium text-white">
                    {i + 1}/{images.length}
                  </div>
                )}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!selectedUrl} onOpenChange={() => setSelectedUrl(null)}>
        <DialogContent
          className="max-h-[90vh] w-fit max-w-full overflow-hidden p-0"
          aria-describedby={undefined}
        >
          <DialogHeader className="sr-only">
            <DialogTitle>Visualização ampliada</DialogTitle>
          </DialogHeader>
          {selectedUrl && (
            <img
              src={selectedUrl}
              alt="Imagem ampliada"
              className="max-h-[85vh] w-auto object-contain"
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
