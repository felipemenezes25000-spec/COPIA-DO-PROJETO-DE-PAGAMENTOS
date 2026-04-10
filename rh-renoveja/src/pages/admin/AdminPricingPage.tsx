import { useCallback, useEffect, useState } from 'react';
import { Check, DollarSign, Pencil, Save, X, FileSignature } from 'lucide-react';
import { useAdminAuth } from '../../contexts/AdminAuthContext';
import {
  fetchProductPrices,
  updateProductPrice,
  fetchActiveContracts,
  upsertContract,
  deactivateContract,
} from '../../lib/productivity-api';
import { fetchCandidates } from '../../lib/admin-api';
import { formatCents } from '../../lib/productivity-utils';
import type {
  DoctorContractDto,
  ProductPriceDto,
} from '../../types/productivity';
import type { AdminCandidate } from '../../types/admin';

type Tab = 'products' | 'contracts';

/**
 * Página de Precificação — agrupa o CRUD de preços por tipo de atendimento
 * (para cálculo de receita) e o CRUD de contratos por médico (para cálculo
 * de ociosidade). Tabs internas pra não inflar o sidebar.
 */
export default function AdminPricingPage() {
  const { user } = useAdminAuth();
  const token = user?.token;
  const [tab, setTab] = useState<Tab>('products');

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header>
        <h1 className="text-xl font-semibold text-slate-900">Precificação</h1>
        <p className="mt-0.5 text-sm text-slate-500">
          Valores por tipo de atendimento e contratos por médico — alimentam o cálculo de
          receita e ociosidade no Monitor de Produtividade.
        </p>
      </header>

      <div role="tablist" className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white p-1 shadow-sm">
        <TabButton active={tab === 'products'} onClick={() => setTab('products')} icon={DollarSign}>
          Tabela de preços
        </TabButton>
        <TabButton active={tab === 'contracts'} onClick={() => setTab('contracts')} icon={FileSignature}>
          Contratos por médico
        </TabButton>
      </div>

      {tab === 'products' ? <ProductPricesTab token={token ?? null} /> : <ContractsTab token={token ?? null} />}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon: Icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: typeof DollarSign;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={[
        'inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-400',
        active ? 'bg-primary-500 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100',
      ].join(' ')}
    >
      <Icon size={14} />
      {children}
    </button>
  );
}

/* ─────────────────────────────────────────────────────────────── */
/* Products tab                                                     */
/* ─────────────────────────────────────────────────────────────── */

function ProductPricesTab({ token }: { token: string | null }) {
  const [products, setProducts] = useState<ProductPriceDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await fetchProductPrices(false, token);
      setProducts(list);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao carregar produtos.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleSave(p: ProductPriceDto) {
    const raw = editing[p.productKey];
    if (raw == null) return;
    const parsed = parseBrlInput(raw);
    if (parsed == null) {
      setError(`Valor inválido para ${p.label}.`);
      return;
    }
    setSaving(p.productKey);
    setError(null);
    try {
      const updated = await updateProductPrice(
        p.productKey,
        {
          label: p.label,
          unit: p.unit,
          priceCents: parsed,
          notes: p.notes,
        },
        token,
      );
      setProducts((prev) => prev.map((x) => (x.productKey === updated.productKey ? updated : x)));
      setEditing((e) => {
        const { [p.productKey]: _removed, ...rest } = e;
        return rest;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao salvar.');
    } finally {
      setSaving(null);
    }
  }

  return (
    <section className="space-y-4">
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-900">Como funciona</h2>
        <p className="mt-1 text-xs text-slate-600">
          Cada tipo de atendimento que um médico produz (receita simples, receita
          controlada, exame, consulta por minuto…) pode ter um valor associado aqui.
          Esses valores alimentam a coluna <em>Receita gerada</em> no Monitor de
          Produtividade. Consultas com <code>contracted_minutes</code> são cobradas como
          <code> consultation_minute × minutos</code>.
        </p>
      </div>

      {error ? (
        <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            <tr>
              <th className="px-4 py-2 text-left">Produto</th>
              <th className="px-4 py-2 text-left">Unidade</th>
              <th className="px-4 py-2 text-right">Valor (R$)</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-sm">
            {loading ? (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-slate-500">
                  Carregando…
                </td>
              </tr>
            ) : products.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-slate-500">
                  Nenhum produto cadastrado.
                </td>
              </tr>
            ) : (
              products.map((p) => {
                const isEditing = editing[p.productKey] != null;
                const isSaving = saving === p.productKey;
                return (
                  <tr key={p.productKey}>
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-900">{p.label}</div>
                      <div className="text-[11px] font-mono text-slate-400">{p.productKey}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {p.unit === 'minute' ? 'por minuto' : 'por unidade'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {isEditing ? (
                        <input
                          type="text"
                          inputMode="decimal"
                          value={editing[p.productKey]}
                          onChange={(e) =>
                            setEditing((prev) => ({ ...prev, [p.productKey]: e.target.value }))
                          }
                          placeholder="0,00"
                          autoFocus
                          className="w-24 rounded-md border border-slate-300 px-2 py-1 text-right tabular-nums focus:border-primary-400 focus:outline-none focus:ring-1 focus:ring-primary-400"
                        />
                      ) : (
                        <span className="font-semibold tabular-nums text-slate-900">
                          {formatCents(p.priceCents)}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {isEditing ? (
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            disabled={isSaving}
                            onClick={() => handleSave(p)}
                            className="rounded-md bg-emerald-500 p-1.5 text-white shadow-sm hover:bg-emerald-600 disabled:opacity-50"
                            aria-label="Salvar"
                          >
                            {isSaving ? (
                              <span className="block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                            ) : (
                              <Save size={14} />
                            )}
                          </button>
                          <button
                            type="button"
                            disabled={isSaving}
                            onClick={() =>
                              setEditing((e) => {
                                const { [p.productKey]: _removed, ...rest } = e;
                                return rest;
                              })
                            }
                            className="rounded-md bg-slate-100 p-1.5 text-slate-700 hover:bg-slate-200 disabled:opacity-50"
                            aria-label="Cancelar"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() =>
                            setEditing((prev) => ({
                              ...prev,
                              [p.productKey]: centsToBrlInput(p.priceCents),
                            }))
                          }
                          className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100"
                          aria-label="Editar"
                        >
                          <Pencil size={14} />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────────────────────── */
/* Contracts tab                                                    */
/* ─────────────────────────────────────────────────────────────── */

function ContractsTab({ token }: { token: string | null }) {
  const [contracts, setContracts] = useState<DoctorContractDto[]>([]);
  const [candidates, setCandidates] = useState<AdminCandidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    doctorProfileId: '',
    hoursPerMonth: '',
    hourlyRateBrl: '',
    startsAt: new Date().toISOString().slice(0, 10),
    endsAt: '',
    notes: '',
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [list, cands] = await Promise.all([
        fetchActiveContracts(token),
        fetchCandidates({ status: 'aprovado' }, token),
      ]);
      setContracts(list);
      setCandidates(cands);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao carregar dados.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const hpm = Number(form.hoursPerMonth);
    const rateCents = parseBrlInput(form.hourlyRateBrl);
    if (!form.doctorProfileId) return setError('Selecione um médico.');
    if (!Number.isFinite(hpm) || hpm <= 0) return setError('Horas/mês inválidas.');
    if (rateCents == null || rateCents <= 0) return setError('Valor/hora inválido.');

    setSaving(true);
    try {
      await upsertContract(
        form.doctorProfileId,
        {
          hoursPerMonth: hpm,
          hourlyRateCents: rateCents,
          startsAt: new Date(form.startsAt).toISOString(),
          endsAt: form.endsAt ? new Date(form.endsAt).toISOString() : null,
          notes: form.notes || null,
        },
        token,
      );
      setForm({
        doctorProfileId: '',
        hoursPerMonth: '',
        hourlyRateBrl: '',
        startsAt: new Date().toISOString().slice(0, 10),
        endsAt: '',
        notes: '',
      });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao salvar contrato.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDeactivate(doctorProfileId: string) {
    if (!confirm('Desativar este contrato? O médico deixará de ter custo/utilização calculados.')) return;
    try {
      await deactivateContract(doctorProfileId, token);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao desativar.');
    }
  }

  const availableDoctors = candidates.filter(
    (c) => !contracts.some((ct) => ct.doctorProfileId === c.id),
  );

  return (
    <section className="space-y-4">
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-900">Como funciona</h2>
        <p className="mt-1 text-xs text-slate-600">
          Cadastre <strong>horas contratadas/mês</strong> + <strong>valor/hora</strong> de um
          médico para que o Monitor de Produtividade calcule <em>ociosidade</em> e
          <em> utilização</em>. Sem contrato, o médico aparece no dashboard mas sem esses campos.
        </p>
      </div>

      {error ? (
        <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <form
        onSubmit={handleSubmit}
        className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
      >
        <h3 className="mb-3 text-sm font-semibold text-slate-900">Novo contrato / atualizar</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-xs font-medium text-slate-700">
            Médico
            <select
              value={form.doctorProfileId}
              onChange={(e) => setForm({ ...form, doctorProfileId: e.target.value })}
              className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm focus:border-primary-400 focus:outline-none focus:ring-1 focus:ring-primary-400"
            >
              <option value="">— selecionar —</option>
              {availableDoctors.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome} ({c.especialidade})
                </option>
              ))}
            </select>
          </label>

          <label className="text-xs font-medium text-slate-700">
            Horas/mês
            <input
              type="number"
              min={0}
              value={form.hoursPerMonth}
              onChange={(e) => setForm({ ...form, hoursPerMonth: e.target.value })}
              placeholder="ex. 160"
              className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm tabular-nums focus:border-primary-400 focus:outline-none focus:ring-1 focus:ring-primary-400"
            />
          </label>

          <label className="text-xs font-medium text-slate-700">
            Valor/hora (R$)
            <input
              type="text"
              inputMode="decimal"
              value={form.hourlyRateBrl}
              onChange={(e) => setForm({ ...form, hourlyRateBrl: e.target.value })}
              placeholder="ex. 120,00"
              className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm tabular-nums focus:border-primary-400 focus:outline-none focus:ring-1 focus:ring-primary-400"
            />
          </label>

          <label className="text-xs font-medium text-slate-700">
            Início
            <input
              type="date"
              value={form.startsAt}
              onChange={(e) => setForm({ ...form, startsAt: e.target.value })}
              className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm focus:border-primary-400 focus:outline-none focus:ring-1 focus:ring-primary-400"
            />
          </label>

          <label className="text-xs font-medium text-slate-700">
            Fim (opcional)
            <input
              type="date"
              value={form.endsAt}
              onChange={(e) => setForm({ ...form, endsAt: e.target.value })}
              className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm focus:border-primary-400 focus:outline-none focus:ring-1 focus:ring-primary-400"
            />
          </label>

          <label className="text-xs font-medium text-slate-700 sm:col-span-2">
            Notas
            <input
              type="text"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="ex. contrato PJ 12 meses"
              className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm focus:border-primary-400 focus:outline-none focus:ring-1 focus:ring-primary-400"
            />
          </label>
        </div>

        <div className="mt-3 flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-md bg-primary-500 px-3 py-1.5 text-sm font-semibold text-white shadow-sm hover:bg-primary-600 disabled:opacity-50"
          >
            {saving ? 'Salvando…' : (
              <>
                <Check size={14} />
                Salvar contrato
              </>
            )}
          </button>
        </div>
      </form>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <h3 className="border-b border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-900">
          Contratos ativos ({loading ? '…' : contracts.length})
        </h3>
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            <tr>
              <th className="px-4 py-2 text-left">Médico</th>
              <th className="px-4 py-2 text-right">Horas/mês</th>
              <th className="px-4 py-2 text-right">Valor/hora</th>
              <th className="px-4 py-2 text-left">Vigência</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {contracts.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-slate-500">
                  Nenhum contrato ativo.
                </td>
              </tr>
            ) : (
              contracts.map((c) => (
                <tr key={c.id}>
                  <td className="px-4 py-2 font-medium text-slate-900">{c.doctorName ?? '—'}</td>
                  <td className="px-4 py-2 text-right tabular-nums text-slate-700">{c.hoursPerMonth}h</td>
                  <td className="px-4 py-2 text-right tabular-nums text-slate-700">
                    {formatCents(c.hourlyRateCents)}
                  </td>
                  <td className="px-4 py-2 text-xs text-slate-500">
                    {new Date(c.startsAt).toLocaleDateString('pt-BR')}
                    {c.endsAt ? ` → ${new Date(c.endsAt).toLocaleDateString('pt-BR')}` : ' → indef.'}
                  </td>
                  <td className="px-4 py-2 text-right">
                    <button
                      type="button"
                      onClick={() => handleDeactivate(c.doctorProfileId)}
                      className="text-xs font-medium text-red-600 hover:text-red-800"
                    >
                      Desativar
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────────────────────── */
/* Helpers: parse BRL input ↔ centavos                              */
/* ─────────────────────────────────────────────────────────────── */

/**
 * Converte entrada do usuário ("1234,56" / "1234.56" / "1.234,56") para centavos.
 * Retorna null se inválido. Aceita formato brasileiro e americano.
 */
function parseBrlInput(raw: string): number | null {
  if (!raw.trim()) return null;
  // Remove milhar pontuado (ex: "1.234,56" → "1234,56") e normaliza vírgula
  const normalized = raw
    .replace(/\./g, (match, offset, str) => {
      // mantém o ponto só se for decimal (segue de 1-2 dígitos e fim)
      const after = str.slice(offset + 1);
      return /^\d{1,2}$/.test(after) ? '.' : '';
    })
    .replace(',', '.');
  const n = Number(normalized);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n * 100);
}

function centsToBrlInput(cents: number): string {
  return (cents / 100).toFixed(2).replace('.', ',');
}
