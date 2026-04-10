/**
 * Converte erros técnicos do backend em mensagens amigáveis em PT-BR.
 * Nunca exibe stacktrace nem mensagem crua do backend ao usuário.
 */

export type HumanizeErrorContext = 'request' | 'consultation' | 'generic' | 'batch-sign';

const REQUEST_PATTERNS: { pattern: RegExp | string; message: string }[] = [
  { pattern: /cannot approve|não.*aprovar|invalid.*approve/i, message: 'Não é possível aprovar este pedido no momento.' },
  { pattern: /cannot reject|não.*rejeitar/i, message: 'Não é possível rejeitar este pedido no momento.' },
  { pattern: /cannot sign|não.*assinar|invalid.*sign/i, message: 'Não é possível assinar este documento no momento.' },
  { pattern: /request.*not found|pedido.*não encontrado/i, message: 'Pedido não encontrado.' },
];

/**
 * Padrões específicos do fluxo de assinatura em lote (mensagens por item
 * vindas de `BatchSignatureItemResult.errorMessage`). Mantenha em sincronia
 * com os casos de erro em `BatchSignatureService.cs` no backend.
 */
const BATCH_SIGN_PATTERNS: { pattern: RegExp | string; message: string }[] = [
  // Legado: versão anterior do backend vazava "status atual: InReview" cru.
  // Mantido aqui como rede de segurança mesmo após o self-healing do backend.
  {
    pattern: /não está mais apto.*status atual:\s*InReview/i,
    message: 'Este pedido ainda não foi registrado como aprovado. Recarregue sua fila e tente de novo.',
  },
  {
    pattern: /não está mais apto.*status atual:\s*(Rejected|Cancelled)/i,
    message: 'Este pedido foi cancelado ou rejeitado e não pode mais ser assinado.',
  },
  {
    pattern: /não está mais apto.*status atual:\s*Signed/i,
    message: 'Este pedido já foi assinado anteriormente.',
  },
  {
    pattern: /não está mais apto.*status atual:/i,
    message: 'Este pedido saiu da situação assinável. Recarregue a fila.',
  },
  // Novo backend (self-healed, mensagem humana):
  {
    pattern: /situação atual:\s*(em revisão|aguardando triagem|aguardando|em análise|buscando médico)/i,
    message: 'Este pedido ainda não foi registrado como aprovado. Recarregue sua fila e tente de novo.',
  },
  {
    pattern: /situação atual:\s*(rejeitado|cancelado)/i,
    message: 'Este pedido foi cancelado ou rejeitado e não pode mais ser assinado.',
  },
  {
    pattern: /situação atual:\s*já assinado/i,
    message: 'Este pedido já foi assinado anteriormente.',
  },
  {
    pattern: /pedido j[áa] assinado em lote/i,
    message: 'Este pedido já foi assinado anteriormente.',
  },
  {
    pattern: /não aprovado para assinatura/i,
    message: 'Você ainda não aprovou este pedido. Revise-o primeiro no Modo Foco.',
  },
  {
    pattern: /rejeitado pela ia|ia clínica/i,
    message: 'A IA clínica reportou um risco neste pedido. Revise com atenção antes de assinar.',
  },
  {
    pattern: /não pertence mais a você/i,
    message: 'Este pedido foi transferido para outro médico.',
  },
  {
    pattern: /senha.*certificado|pfx.*password|certificado digital.*inválid/i,
    message: 'Senha do certificado digital incorreta. Verifique e tente novamente.',
  },
  {
    pattern: /crm.*certificado|cpf.*certificado/i,
    message: 'O CRM/CPF do certificado não corresponde ao seu cadastro. Verifique se é o certificado correto.',
  },
  {
    pattern: /certificado.*não encontrado|nenhum certificado/i,
    message: 'Certificado digital não encontrado. Cadastre um em Configurações.',
  },
  {
    pattern: /perfil de médico não encontrado/i,
    message: 'Complete seu cadastro como médico em Configurações.',
  },
  {
    pattern: /medicamento.*informado|receita.*ao menos um medicamento/i,
    message: 'A receita precisa ter ao menos um medicamento. Volte ao pedido e edite antes de assinar.',
  },
  {
    pattern: /cpf do paciente é obrigatório/i,
    message: 'O paciente precisa cadastrar o CPF antes de você poder emitir este exame.',
  },
  {
    pattern: /falha ao gerar pdf|não foi possível gerar.*pdf/i,
    message: 'Falha ao gerar o PDF do documento. Revise os dados do pedido e tente novamente.',
  },
  {
    pattern: /pedido não encontrado/i,
    message: 'Este pedido não existe mais ou foi removido.',
  },
  // Catch-all para erros de assinatura genéricos vindos do SignAsync.
  // "Apenas solicitações aprovadas podem ser assinadas" e variações
  // que antes caíam no fallback genérico.
  {
    pattern: /apenas solicitações aprovadas|não.*pode.*ser assinad/i,
    message: 'Este pedido não está em condição de ser assinado. Recarregue a fila e tente novamente.',
  },
  {
    pattern: /erro interno ao processar|erro ao processar.*certificad/i,
    message: 'Erro ao processar o certificado. Tente novamente ou envie um novo certificado em Configurações.',
  },
];

const CONSULTATION_PATTERNS: { pattern: RegExp | string; message: string }[] = [
  { pattern: /consultation.*not available|consulta.*indisponível/i, message: 'Esta consulta não está disponível no momento.' },
  { pattern: /already accepted|já.*aceita/i, message: 'Esta consulta já foi aceita.' },
  { pattern: /request.*not found|pedido.*não encontrado/i, message: 'Pedido não encontrado.' },
];

const FALLBACK_MESSAGE = 'Ocorreu um erro inesperado. Tente novamente mais tarde.';

function matchPatterns(rawMessage: string, patterns: { pattern: RegExp | string; message: string }[]): string | null {
  const lower = rawMessage.toLowerCase();
  for (const { pattern, message } of patterns) {
    if (typeof pattern === 'string') {
      if (lower.includes(pattern.toLowerCase())) return message;
    } else {
      if (pattern.test(rawMessage)) return message;
    }
  }
  return null;
}

export function humanizeError(error: unknown, context?: HumanizeErrorContext): string {
  if (
    error && typeof error === 'object' &&
    'userMessagePtBr' in error &&
    typeof (error as { userMessagePtBr: unknown }).userMessagePtBr === 'string' &&
    (error as { userMessagePtBr: string }).userMessagePtBr.trim()
  ) {
    return (error as { userMessagePtBr: string }).userMessagePtBr;
  }

  const rawMessage =
    (error && typeof error === 'object' && 'message' in error && typeof (error as { message: unknown }).message === 'string')
      ? (error as { message: string }).message
      : (error instanceof Error ? error.message : typeof error === 'string' ? error : '');

  if (!rawMessage.trim()) return FALLBACK_MESSAGE;

  const patterns =
    context === 'request'
      ? REQUEST_PATTERNS
      : context === 'consultation'
        ? CONSULTATION_PATTERNS
        : context === 'batch-sign'
          ? // Para batch-sign, os padrões específicos têm precedência; depois
            // caímos em REQUEST_PATTERNS como fallback para erros genéricos.
            [...BATCH_SIGN_PATTERNS, ...REQUEST_PATTERNS]
          : [...REQUEST_PATTERNS, ...CONSULTATION_PATTERNS, ...BATCH_SIGN_PATTERNS];

  const matched = matchPatterns(rawMessage, patterns);
  if (matched) return matched;

  if (rawMessage.includes('Network') || rawMessage.includes('fetch') || rawMessage.includes('Failed to fetch')) {
    return 'Não foi possível conectar. Verifique sua internet e tente novamente.';
  }
  if (rawMessage.includes('401') || rawMessage.includes('Unauthorized')) {
    return 'Sessão expirada. Faça login novamente.';
  }
  if (rawMessage.includes('500') || rawMessage.includes('Internal Server Error')) {
    return 'Erro no servidor. Tente novamente em alguns instantes.';
  }
  if (rawMessage.includes('Ocorreu um erro ao processar sua solicitação')) {
    return 'Erro no servidor. Tente novamente em alguns instantes.';
  }

  // Para batch-sign, o backend já envia mensagens em PT-BR legíveis. Em vez de
  // cair no fallback genérico "Ocorreu um erro inesperado" (que não ajuda o
  // médico), preferimos mostrar a mensagem original do backend — desde que
  // não contenha stacktrace ou jargão técnico.
  if (context === 'batch-sign' && rawMessage.length > 0 && rawMessage.length < 300 &&
      !rawMessage.includes('Exception') && !rawMessage.includes('Stack') &&
      !rawMessage.includes('   at ')) {
    return rawMessage;
  }

  return FALLBACK_MESSAGE;
}
