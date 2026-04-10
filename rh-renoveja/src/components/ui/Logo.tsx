/**
 * RenoveJá — logo oficial.
 *
 * Arte fornecida pela marca (2026-04-07): documento azul-claro com "+" e
 * linhas de texto + seta circular de refresh em azul-primary sobrepondo o
 * canto inferior-direito do documento, com "RenoveJá" em azul-marinho
 * uniforme (#1E3A8A) em fonte bold.
 *
 * Não dividimos "Renove" / "Já" em cores diferentes — a arte oficial usa
 * uma única cor para a palavra inteira.
 */

interface LogoIconProps {
  size?: number;
  className?: string;
}

// Azul-marinho da wordmark oficial. Mantemos como constante para o favicon
// e o wordmark stay em sync.
const BRAND_NAVY = '#1E3A8A';
const BRAND_BLUE = '#2563EB';
const BRAND_SKY = '#BFDBFE';
const BRAND_SKY_SOFT = '#DBEAFE';

export function LogoIcon({ size = 40, className = '' }: LogoIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 72 72"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      {/* Documento (folha azul-clara com cantos arredondados) */}
      <rect x="12" y="8" width="36" height="48" rx="4" fill={BRAND_SKY_SOFT} stroke={BRAND_SKY} strokeWidth="1.5" />

      {/* Sinal "+" no topo do documento */}
      <path
        d="M22 20h6M25 17v6"
        stroke={BRAND_BLUE}
        strokeWidth="2.6"
        strokeLinecap="round"
      />
      {/* Traço "-" ao lado do "+" */}
      <path d="M33 20h6" stroke={BRAND_BLUE} strokeWidth="2.6" strokeLinecap="round" />

      {/* Linhas de texto do documento */}
      <path d="M18 30h22" stroke={BRAND_BLUE} strokeWidth="2.2" strokeLinecap="round" opacity="0.85" />
      <path d="M18 36h18" stroke={BRAND_BLUE} strokeWidth="2.2" strokeLinecap="round" opacity="0.7" />
      <path d="M18 42h14" stroke={BRAND_BLUE} strokeWidth="2.2" strokeLinecap="round" opacity="0.55" />

      {/* Seta circular de refresh sobrepondo o canto inferior-direito.
          Desenhada como arco de ~300° deixando um gap no topo-direito onde
          entra a ponta da flecha. */}
      <path
        d="M50 32
           a14 14 0 1 1 -9.9 4.1"
        stroke={BRAND_BLUE}
        strokeWidth="4.5"
        strokeLinecap="round"
        fill="none"
      />
      {/* Ponta da flecha (triângulo) no topo do arco */}
      <path
        d="M47 27 L54 32 L49 37 Z"
        fill={BRAND_BLUE}
      />
    </svg>
  );
}

interface LogoProps {
  size?: number;
  variant?: 'dark' | 'light';
  className?: string;
}

export function Logo({ size = 40, variant = 'dark', className = '' }: LogoProps) {
  // A arte oficial usa azul-marinho. Para header escuro (variant 'light'),
  // invertemos para branco para manter contraste.
  const textStyle =
    variant === 'dark'
      ? { color: BRAND_NAVY }
      : { color: '#FFFFFF' };

  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <LogoIcon size={size} />
      <span
        className="text-xl font-display font-bold tracking-tight"
        style={textStyle}
      >
        RenoveJá
      </span>
    </div>
  );
}
