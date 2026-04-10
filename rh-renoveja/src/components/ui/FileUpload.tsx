import { useState, useRef, useCallback, type DragEvent, type ChangeEvent } from 'react';
import { Upload, FileText, X } from 'lucide-react';

interface FileUploadProps {
  label?: string;
  accept?: string;
  maxSizeMB?: number;
  value: File | null;
  onChange: (file: File | null) => void;
  error?: string;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function FileUpload({
  label,
  accept = '.pdf',
  maxSizeMB = 10,
  value,
  onChange,
  error: externalError,
}: FileUploadProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [internalError, setInternalError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const error = externalError ?? internalError;

  const validate = useCallback(
    (file: File): boolean => {
      setInternalError(null);

      // Validate type
      if (accept) {
        const acceptedTypes = accept.split(',').map((t) => t.trim().toLowerCase());
        const fileExt = '.' + file.name.split('.').pop()?.toLowerCase();
        const matchesExt = acceptedTypes.some((t) => t === fileExt);
        const matchesMime = acceptedTypes.some((t) => file.type === t);
        if (!matchesExt && !matchesMime) {
          setInternalError(`Tipo de arquivo não permitido. Aceitos: ${accept}`);
          return false;
        }
      }

      // Validate size
      const maxBytes = maxSizeMB * 1024 * 1024;
      if (file.size > maxBytes) {
        setInternalError(`Arquivo muito grande. Tamanho máximo: ${maxSizeMB} MB`);
        return false;
      }

      return true;
    },
    [accept, maxSizeMB],
  );

  const handleFile = useCallback(
    (file: File) => {
      if (validate(file)) {
        onChange(file);
      }
    },
    [validate, onChange],
  );

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    // Reset so the same file can be re-selected
    e.target.value = '';
  };

  const handleRemove = () => {
    setInternalError(null);
    onChange(null);
  };

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <span className="font-semibold text-[13px] text-slate-700 tracking-wide">
          {label}
        </span>
      )}

      {!value ? (
        <div
          role="button"
          aria-label="Selecionar arquivo para upload"
          tabIndex={0}
          onClick={() => inputRef.current?.click()}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              inputRef.current?.click();
            }
          }}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={[
            'flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-8 cursor-pointer',
            'transition-all duration-200',
            isDragOver
              ? 'border-primary-500 bg-primary-50'
              : 'border-slate-300 bg-slate-50 hover:border-primary-400 hover:bg-primary-50/50',
            error ? 'border-error bg-red-50' : '',
          ]
            .filter(Boolean)
            .join(' ')}
        >
          <Upload
            className={[
              'h-8 w-8',
              isDragOver ? 'text-primary-500' : 'text-slate-400',
            ].join(' ')}
            aria-hidden="true"
          />
          <div className="text-center">
            <p className="text-sm font-medium text-slate-600">
              Arraste e solte o arquivo aqui
            </p>
            <p className="text-xs text-slate-400 mt-1">
              ou clique para selecionar &middot; {accept} &middot; at\u00e9 {maxSizeMB} MB
            </p>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary-50">
            <FileText className="h-5 w-5 text-primary-600" aria-hidden="true" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-700 truncate">
              {value.name}
            </p>
            <p className="text-xs text-slate-400">{formatFileSize(value.size)}</p>
          </div>
          <button
            type="button"
            onClick={handleRemove}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-error transition-colors"
            aria-label="Remover arquivo"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={handleInputChange}
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
      />

      {error && (
        <p className="text-sm text-error font-medium" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

export { FileUpload };
export type { FileUploadProps };
