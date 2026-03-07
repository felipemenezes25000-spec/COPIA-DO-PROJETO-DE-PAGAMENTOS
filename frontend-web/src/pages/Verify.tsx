import { useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { verifyReceita, type VerifySuccess } from '@/api/verify';

type VerifyState = 'idle' | 'loading' | 'success' | 'error';

const GUARDRAIL_ALERT =
  'Importante: Decisão e responsabilidade é do profissional. Conteúdo exibido para verificação.';

/** CSS global para dark mode e responsividade (não é possível com inline styles). */
const GLOBAL_STYLE = `
  :root {
    --bg: #f8fafc; --card-bg: #fff; --text: #1e293b; --text-secondary: #64748b;
    --border: #e2e8f0; --primary: #2563eb; --success: #16a34a; --error: #dc2626;
    --warning-bg: #fef3c7; --warning-text: #92400e; --input-border: #ccc;
    --shadow: 0 2px 12px rgba(0,0,0,0.08);
  }
  @media (prefers-color-scheme: dark) {
    :root {
      --bg: #0f172a; --card-bg: #1e293b; --text: #f1f5f9; --text-secondary: #94a3b8;
      --border: #334155; --primary: #60a5fa; --success: #4ade80; --error: #f87171;
      --warning-bg: #422006; --warning-text: #fbbf24; --input-border: #475569;
      --shadow: 0 2px 12px rgba(0,0,0,0.3);
    }
  }
  body { background: var(--bg); color: var(--text); margin: 0; font-family: system-ui, -apple-system, sans-serif; }
  @media (max-width: 480px) {
    .verify-card { padding: 20px !important; margin: 12px !important; }
    .verify-title { font-size: 18px !important; }
    .verify-input { font-size: 16px !important; padding: 12px !important; }
  }
`;

/** Formata ISO string da API para exibição em pt-BR (apenas dados retornados pela API). */
function formatIsoDate(iso: string | null | undefined): string {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch {
    return iso;
  }
}

function formatIsoDateTime(iso: string | null | undefined): string {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

export default function Verify() {
  const { id } = useParams<{ id: string }>();

  const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const isValidId = id && UUID_REGEX.test(id.trim());

  const [code, setCode] = useState('');
  const [state, setState] = useState<VerifyState>('idle');
  const [result, setResult] = useState<VerifySuccess | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!isValidId || code.length !== 6) return;
      setState('loading');
      setErrorMessage('');
      setResult(null);
      const res = await verifyReceita({ id: id.trim(), code: code.trim() });

      if (res.status === 'error') {
        setErrorMessage(res.message);
        setState('error');
        return;
      }
      if (res.status === 'invalid') {
        setErrorMessage(res.message);
        setState('error');
        return;
      }
      setResult(res.data);
      setState('success');
    },
    [id, code]
  );

  if (!isValidId) {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <h1 style={styles.title}>Verificar receita</h1>
          <p style={styles.error}>ID inválido na URL. O formato esperado é um UUID (ex: 550e8400-e29b-41d4-a716-446655440000).</p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <style dangerouslySetInnerHTML={{ __html: GLOBAL_STYLE }} />
      <div style={styles.card} className="verify-card">
        <h1 style={styles.title}>Verificação de Receita</h1>
        <p style={styles.subtitle}>
          Use o código presente na receita para validar e obter a 2ª via (quando disponível).
        </p>

        {state === 'idle' && (
          <form onSubmit={handleSubmit} style={styles.form}>
            <label htmlFor="verify-code" style={styles.label}>Código de verificação</label>
            <input
              id="verify-code"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              placeholder="000000"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              style={styles.input}
              aria-label="Código de 6 dígitos"
            />
            <button type="submit" disabled={code.length !== 6} style={styles.button}>
              Validar
            </button>
          </form>
        )}

        {state === 'loading' && (
          <p style={styles.loading}>Verificando…</p>
        )}

        {state === 'success' && result && (
          <div style={styles.success}>
            <p style={styles.validBadge}>✓ Receita válida</p>
            <div style={styles.metaGrid}>
              {result.issuedAt && (
                <div style={styles.metaRow}>
                  <span style={styles.metaLabel}>Emitida em</span>
                  <span style={styles.metaValue}>{formatIsoDate(result.issuedAt)}</span>
                </div>
              )}
              {result.signedAt != null && result.signedAt !== '' && (
                <div style={styles.metaRow}>
                  <span style={styles.metaLabel}>Assinada em</span>
                  <span style={styles.metaValue}>{formatIsoDateTime(result.signedAt)}</span>
                </div>
              )}
              {result.patientName != null && result.patientName !== '' && (
                <div style={styles.metaRow}>
                  <span style={styles.metaLabel}>Paciente</span>
                  <span style={styles.metaValue}>{result.patientName}</span>
                </div>
              )}
              {(result.doctorName != null && result.doctorName !== '') && (
                <div style={styles.metaRow}>
                  <span style={styles.metaLabel}>Médico</span>
                  <span style={styles.metaValue}>{result.doctorName}</span>
                </div>
              )}
              {result.doctorCrm != null && result.doctorCrm !== '' && (
                <div style={styles.metaRow}>
                  <span style={styles.metaLabel}>CRM</span>
                  <span style={styles.metaValue}>{result.doctorCrm}</span>
                </div>
              )}
            </div>
            <p style={styles.successNote}>Verificação concluída com sucesso.</p>
            <button
              type="button"
              onClick={() => {
                if (result.downloadUrl) {
                  window.open(result.downloadUrl, '_blank', 'noopener,noreferrer');
                } else {
                  alert('Download não disponível. O PDF pode ainda estar sendo processado.');
                }
              }}
              style={{
                ...styles.downloadButton,
                opacity: result.downloadUrl ? 1 : 0.5,
                cursor: result.downloadUrl ? 'pointer' : 'not-allowed',
              }}
            >
              Baixar PDF (2ª via)
            </button>
            <button
              type="button"
              onClick={() => { setState('idle'); setCode(''); setResult(null); }}
              style={styles.buttonSecondary}
            >
              Verificar outro código
            </button>
          </div>
        )}

        {state === 'error' && (
          <div style={styles.errorBox}>
            <p style={styles.error}>{errorMessage}</p>
            <button
              type="button"
              onClick={() => { setState('idle'); setCode(''); setErrorMessage(''); }}
              style={styles.buttonSecondary}
            >
              Tentar novamente
            </button>
          </div>
        )}

        <div style={styles.guardrail} role="alert">
          {GUARDRAIL_ALERT}
        </div>

        <footer style={styles.footer}>
          <a href="/cookies" style={styles.footerLink}>Política de Cookies</a>
        </footer>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    padding: 24,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'var(--bg)',
  },
  card: {
    maxWidth: 420,
    width: '100%',
    background: 'var(--card-bg)',
    borderRadius: 12,
    boxShadow: 'var(--shadow)',
    padding: 32,
  },
  title: {
    marginTop: 0,
    marginRight: 0,
    marginBottom: 8,
    marginLeft: 0,
    fontSize: 22,
    fontWeight: 700,
    color: 'var(--text)',
  },
  subtitle: {
    marginTop: 0,
    marginRight: 0,
    marginBottom: 24,
    marginLeft: 0,
    color: 'var(--text-secondary)',
    fontSize: 14,
  },
  label: {
    display: 'block',
    marginBottom: 6,
    fontSize: 14,
    fontWeight: 600,
    color: 'var(--text)',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
  },
  input: {
    padding: 14,
    fontSize: 18,
    letterSpacing: 4,
    textAlign: 'center',
    border: '1px solid var(--input-border)',
    borderRadius: 8,
    background: 'var(--card-bg)',
    color: 'var(--text)',
  },
  button: {
    padding: 14,
    fontSize: 16,
    fontWeight: 600,
    background: 'var(--primary)',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    cursor: 'pointer',
  },
  buttonSecondary: {
    padding: 10,
    fontSize: 14,
    background: 'var(--border)',
    color: 'var(--text)',
    border: 'none',
    borderRadius: 8,
    cursor: 'pointer',
    marginTop: 8,
  },
  loading: {
    color: 'var(--text-secondary)',
    margin: 0,
  },
  success: {
    marginBottom: 24,
  },
  validBadge: {
    color: 'var(--success)',
    fontWeight: 600,
    marginBottom: 16,
  },
  downloadButton: {
    display: 'inline-block',
    marginTop: 16,
    padding: '12px 24px',
    background: 'var(--primary)',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    fontWeight: 600,
    cursor: 'pointer',
    fontSize: 14,
  },
  downloadButtonWrap: {
    display: 'block',
    marginTop: 16,
  },
  errorBox: {
    marginBottom: 24,
  },
  error: {
    color: 'var(--error)',
    margin: 0,
  },
  metaGrid: {
    marginBottom: 16,
  },
  metaRow: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '8px 0',
    borderBottom: '1px solid var(--border)',
  },
  metaLabel: {
    color: 'var(--text-secondary)',
    fontSize: 14,
  },
  metaValue: {
    fontWeight: 600,
    color: 'var(--text)',
    fontSize: 14,
  },
  successNote: {
    color: 'var(--text-secondary)',
    fontSize: 12,
    marginBottom: 16,
  },
  guardrail: {
    marginTop: 24,
    padding: 12,
    background: 'var(--warning-bg)',
    borderRadius: 8,
    fontSize: 12,
    color: 'var(--warning-text)',
  },
  footer: {
    marginTop: 24,
    paddingTop: 16,
    borderTop: '1px solid var(--border)',
    fontSize: 12,
    color: 'var(--text-secondary)',
  },
  footerLink: {
    color: 'var(--primary)',
    textDecoration: 'none',
  },
};
