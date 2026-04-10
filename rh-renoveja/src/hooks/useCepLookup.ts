import { useState, useCallback } from 'react';

interface CepResult {
  cep: string;
  logradouro: string;
  complemento: string;
  bairro: string;
  localidade: string;
  uf: string;
  erro?: boolean;
}

interface UseCepLookupReturn {
  loading: boolean;
  error: string | null;
  lookup: (cep: string) => Promise<CepResult | null>;
}

export function useCepLookup(): UseCepLookupReturn {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const lookup = useCallback(async (cep: string): Promise<CepResult | null> => {
    const digits = cep.replace(/\D/g, '');
    if (digits.length !== 8) {
      setError('CEP deve ter 8 dígitos');
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
      if (!response.ok) throw new Error('Erro na consulta');

      const data: CepResult = await response.json();
      if (data.erro) {
        setError('CEP não encontrado');
        return null;
      }

      return data;
    } catch {
      setError('Erro ao buscar CEP. Tente novamente.');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return { loading, error, lookup };
}
