import { Component, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { AlertTriangle, RefreshCcw, LayoutDashboard } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

interface FallbackProps {
  error: Error | null;
  onReset: () => void;
}

// eslint-disable-next-line react-refresh/only-export-components
function AdminErrorFallback({ error, onReset }: FallbackProps) {
  // Ref callback focuses the primary action once mounted (a11y)
  const setRetryRef = (node: HTMLButtonElement | null) => {
    if (node) {
      requestAnimationFrame(() => node.focus());
    }
  };

  return (
    <div
      role="alert"
      aria-live="assertive"
      className="min-h-screen w-full bg-slate-50 flex items-center justify-center px-4 py-12"
    >
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        className="w-full max-w-lg bg-white rounded-2xl shadow-sm border border-slate-200 p-8"
      >
        <div className="flex flex-col items-center text-center">
          <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mb-4">
            <AlertTriangle className="w-8 h-8 text-amber-600" aria-hidden="true" />
          </div>
          <h1 className="text-2xl font-semibold text-slate-900 mb-2">
            Algo deu errado
          </h1>
          <p className="text-slate-600 mb-6">
            O painel encontrou um erro inesperado. Tente recarregar.
          </p>

          {error?.message && (
            <details className="w-full mb-6 text-left bg-slate-50 border border-slate-200 rounded-lg">
              <summary className="cursor-pointer select-none px-4 py-2 text-sm font-medium text-slate-700 hover:text-slate-900">
                Detalhes técnicos
              </summary>
              <pre className="px-4 pb-3 pt-1 text-xs text-slate-600 whitespace-pre-wrap break-words">
                {error.message}
              </pre>
            </details>
          )}

          <div className="flex flex-col sm:flex-row gap-3 w-full">
            <button
              ref={setRetryRef}
              type="button"
              onClick={onReset}
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-primary-600 text-white font-medium hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 transition-colors"
            >
              <RefreshCcw className="w-4 h-4" aria-hidden="true" />
              Tentar novamente
            </button>
            <Link
              to="/admin"
              onClick={onReset}
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-white border border-slate-300 text-slate-700 font-medium hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 transition-colors"
            >
              <LayoutDashboard className="w-4 h-4" aria-hidden="true" />
              Voltar ao dashboard
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export default class AdminErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: unknown) {
    console.error('[AdminErrorBoundary] caught:', error, info);
  }

  reset = () => this.setState({ hasError: false, error: null });

  render() {
    if (this.state.hasError) {
      return <AdminErrorFallback error={this.state.error} onReset={this.reset} />;
    }
    return this.props.children;
  }
}
