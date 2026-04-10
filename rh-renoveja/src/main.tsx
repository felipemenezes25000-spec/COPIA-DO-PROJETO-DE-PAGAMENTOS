import { StrictMode, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { ToastProvider } from './components/ui/Toast';
import { initCandidateStore } from './lib/candidate-store';
import App from './App';
import './index.css';

// Seed mock candidates on first load
initCandidateStore();

// Google OAuth só é habilitado quando o client_id está configurado via env.
// Sem client_id, o botão "Continuar com Google" no cadastro fica escondido
// e o fluxo continua funcionando com email+senha. Isso evita crash em dev
// quando ninguém configurou o Google Cloud Console.
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;

function WithGoogle({ children }: { children: ReactNode }) {
  if (!GOOGLE_CLIENT_ID) return <>{children}</>;
  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>{children}</GoogleOAuthProvider>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <WithGoogle>
        <ToastProvider>
          <App />
        </ToastProvider>
      </WithGoogle>
    </BrowserRouter>
  </StrictMode>,
);
