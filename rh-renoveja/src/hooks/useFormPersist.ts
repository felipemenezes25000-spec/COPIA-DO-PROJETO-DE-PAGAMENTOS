import { useEffect, useCallback } from 'react';

const STORAGE_KEY = 'rh-renoveja-form';

interface UseFormPersistOptions {
  currentStep: number;
  /**
   * Callback opcional para restaurar o `currentStep` salvo. Se não passar,
   * o hook só restaura os DADOS e deixa o usuário no step 0 — mas aí ele
   * vê o formulário com campos de steps futuros já preenchidos sem saber
   * como chegou ali, e precisa clicar "Próximo" várias vezes para voltar
   * ao ponto onde estava. Passar este callback restaura o step também.
   */
  onRestoreStep?: (step: number) => void;
}

export function useFormPersist<T extends Record<string, unknown>>(
  getValues: () => T,
  reset: (values: T) => void,
  options: UseFormPersistOptions
) {
  const { onRestoreStep } = options;

  // On mount: restore saved data.
  // Intentional one-shot effect: we only want to read sessionStorage and call
  // `reset` ONCE on first mount. Re-running on every change to `reset`/`getValues`
  // would clobber user input mid-typing, so the empty deps array is deliberate.
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as { data?: T; step?: number };
        if (parsed.data) {
          reset(parsed.data);
        }
        // Restaura também o step — sem isso, o candidato que atualizava
        // a página no meio do cadastro voltava ao step 0 com dados de
        // steps futuros já preenchidos (confuso e contraintuitivo).
        if (
          onRestoreStep &&
          typeof parsed.step === 'number' &&
          parsed.step > 0
        ) {
          onRestoreStep(parsed.step);
        }
      }
    } catch {
      // Ignore parse errors
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Save on step change
  const persist = useCallback(() => {
    try {
      const values = getValues();
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify({
        step: options.currentStep,
        data: values,
        savedAt: new Date().toISOString(),
      }));
    } catch {
      // Storage full or unavailable
    }
  }, [getValues, options.currentStep]);

  useEffect(() => {
    persist();
  }, [options.currentStep, persist]);

  const clear = useCallback(() => {
    sessionStorage.removeItem(STORAGE_KEY);
  }, []);

  const getSavedStep = useCallback((): number => {
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved).step || 0;
      }
    } catch { /* ignore */ }
    return 0;
  }, []);

  return { persist, clear, getSavedStep };
}
