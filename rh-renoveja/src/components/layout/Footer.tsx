import { Link } from 'react-router-dom';
import { Container } from './Container';
import { Logo } from '../ui/Logo';

const institucionalLinks = [
  { label: 'Política de Privacidade', href: '/privacidade' },
  { label: 'Termos de Consentimento', href: '/termos' },
];

const contatoLinks = [
  { label: 'rh@renovejasaude.com.br', href: 'mailto:rh@renovejasaude.com.br' },
  { label: 'privacidade@renovejasaude.com.br', href: 'mailto:privacidade@renovejasaude.com.br' },
  { label: 'dpo@renovejasaude.com.br', href: 'mailto:dpo@renovejasaude.com.br' },
];

export function Footer() {
  return (
    <footer className="bg-slate-900 text-white" role="contentinfo">
      <Container className="py-12 lg:py-16">
        {/* Top: logo + description */}
        <div className="mb-10">
          <Logo size={36} variant="light" />
          <p className="mt-3 text-slate-300 text-sm max-w-sm leading-relaxed">
            Plataforma de telemedicina
          </p>
        </div>

        {/* Middle: 3 columns */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 pb-10 border-b border-slate-700/50">
          {/* Col 1 — Institucional */}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-300 mb-4 font-body">
              Institucional
            </h3>
            <ul className="space-y-3">
              {institucionalLinks.map(({ label, href }) => (
                <li key={href}>
                  <a
                    href={href}
                    className="text-slate-400 hover:text-white transition-colors text-sm"
                  >
                    {label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Col 2 — Contato */}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-300 mb-4 font-body">
              Contato
            </h3>
            <ul className="space-y-3">
              {contatoLinks.map(({ label, href }) => (
                <li key={href}>
                  <a
                    href={href}
                    className="text-slate-400 hover:text-white transition-colors text-sm break-all"
                  >
                    {label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Col 3 — Legal */}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-300 mb-4 font-body">
              Legal
            </h3>
            <ul className="space-y-3 text-sm text-slate-400">
              <li>
                <span className="text-slate-500">CNPJ</span>{' '}
                65.947.180/0001-69
              </li>
              <li className="leading-relaxed">
                Seus dados estão protegidos pela LGPD (Lei nº 13.709/2018)
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="pt-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <p className="text-sm text-slate-500">
            &copy; 2026 RenoveJá Saúde LTDA. Todos os direitos reservados.
          </p>
          <div className="flex items-center gap-4 sm:justify-end">
            <Link
              to="/admin/login"
              className="text-xs text-slate-600 hover:text-slate-400 transition-colors"
            >
              Acesso administrativo
            </Link>
            <p className="text-xs text-slate-600 max-w-md sm:text-right leading-relaxed">
              Dados armazenados em servidores AWS no Brasil (São Paulo) com
              criptografia AES-256
            </p>
          </div>
        </div>
      </Container>
    </footer>
  );
}
