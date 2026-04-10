# Design — Monitor de Produtividade Médica no Portal RH

**Data:** 2026-04-09
**Status:** Aprovado para implementação
**Autor:** Felipe + Claude (brainstorming session)

## Contexto e motivação

O portal RH em `https://rh.renovejasaude.com.br/admin` hoje cobre apenas o fluxo de
**triagem de candidatos** (onboarding de médicos): tem duas abas — `Dashboard` e
`Candidatos` — e nenhuma visão operacional sobre o que os médicos já aprovados fazem
no dia a dia.

Toda a atividade clínica (revisão de receitas, aprovação de exames, consultas por
vídeo, assinatura em lote) gera dados granulares no backend .NET (`public.requests`
e `public.document_access_log`), mas esses dados **não são visíveis em lugar nenhum
do portal de gestão**. O RH não consegue responder perguntas como:

- Quem está mais produtivo hoje?
- Qual o tempo mediano entre um pedido chegar e ser assinado?
- Tem médico parado enquanto a fila cresce?
- Quanto tempo um pedido urgente fica aguardando?
- Quanto cada médico "gera" em valor (faturamento potencial ao contratante)?
- Tem médico assinando 1-por-1 em vez de usar o batch sign?

Feedback do Felipe (sessão 2026-04-09):
> "faça uma análise profunda do projeto e veja como posso monitorar a produtividade
> do médico, tempo por atendimento, os preenchimentos em lote, custo que ele gera
> ociosidade, tempo até atender as coisas e tudo mais algo completo que fosse vivo
> e pudesse ser acessado aqui https://rh.renovejasaude.com.br/admin"
>
> "tudo em uma só entrega"
>
> "no caso liste todos os produtos e eu coloco lá o valor no site"
>
> "ao vivo com polling"
>
> "manda bala em tudo pode implementar chefe"

## Escopo acordado

| Decisão | Valor |
|---------|-------|
| Recorte da entrega | **Completa** — leitura + precificação + SLA + fila ao vivo + relatórios, tudo junto |
| Modelo de custo | **Tabela de preços por tipo de produto** — admin cadastra valor por `PrescriptionKind`/`RequestType`/consulta-por-minuto no portal, sistema calcula receita gerada por médico |
| Contrato por médico (horas/mês) | **Incluso** — opcional por médico, permite calcular ociosidade × valor hora |
| Tempo real | **Polling adaptativo** — 10s com aba visível e ativa, 60s idle, pausa total em background tab |
| Custo operacional | ~R$ 0/mês marginal (detalhado em "Custo de infra") |
| LGPD / PII | Dashboard **nunca** expõe nome/CPF/sintomas de paciente — só dados agregados do médico |

## Diagnóstico do banco (o que já existe sem tocar em nada)

### Fonte 1 — `public.requests`

Já grava (ver `RenoveJa.Infrastructure/Data/Models/PersistenceModels.cs:171`):

| Campo | Uso no dashboard |
|---|---|
| `created_at` | Âncora da timeline de cada pedido |
| `doctor_id` + `doctor_name` | Atribuição atual |
| `request_type` | prescription / exam / consultation |
| `status` | Estado canônico (ver `RequestStatus.cs`) |
| `prescription_kind` | simple / antimicrobial / controlled_special |
| `priority` | Urgent / High / Normal — ordem da fila |
| `required_specialty` | Para SLA por especialidade |
| `signed_at` | Timestamp de assinatura |
| `consultation_started_at` | Timer da consulta (quando ambos conectaram) |
| `doctor_call_connected_at` / `patient_call_connected_at` | Tempo de conexão individual |
| `contracted_minutes` | Duração contratada da consulta |
| `rejection_source` | Doctor vs. AI — permite medir reopens |
| `ai_rejected_at` / `reopened_at` / `reopened_by` | Reabertura de rejeição IA |
| `updated_at` | Última mudança de estado |

### Fonte 2 — `public.document_access_log`

Já grava eventos granulares (ver `BatchSignatureService.cs`):

| `action` | Quem grava | O que mede |
|---|---|---|
| `reviewed` | `BatchSignatureService.MarkAsReviewedAsync` | Médico abriu e revisou o pedido |
| `approved_for_signing` | `BatchSignatureService.ApproveForSigningAsync` | Médico aprovou para lote |
| `batch_signed` | `BatchSignatureService.SignBatchAsync` | Pedido saiu de um lote assinado |
| `download` | `DocumentVerifyController` | Terceiros baixaram o PDF |

Colunas relevantes: `user_id`, `request_id`, `action`, `actor_type`, `created_at`, `metadata`.

### Fonte 3 — `public.doctor_profiles`

| Campo | Uso |
|---|---|
| `total_consultations` | Contador acumulado |
| `rating` | Avaliação média |
| `last_assigned_at` | Última atribuição (balanceador de carga) |
| `approval_status` | Pool de médicos ativos |

### Fonte 4 — `public.encounters`

Já registra consultas concluídas com tempo de duração — reforça métricas de consulta.

### Lacuna

Nenhum dado de **preço por tipo de atendimento** nem **contrato de horas por médico**.
São as duas únicas tabelas novas do projeto.

## Arquitetura

### Camadas

```
Portal RH (Vite/React)
  ├── Páginas novas (lazy-loaded)
  │   ├── /admin/produtividade
  │   ├── /admin/produtividade/:doctorId
  │   ├── /admin/fila
  │   ├── /admin/relatorios
  │   └── /admin/precificacao
  └── Polling adaptativo via SWR + Page Visibility
        │
        ▼  HTTPS (rate-limited, cache-control)
Backend .NET 8 (Clean Arch)
  ├── AdminProductivityController   [novo]
  ├── AdminPricingController        [novo]
  ├── AdminContractsController      [novo]
  ├── Services/Productivity/*       [novo]
  └── Repositories (Dapper)
        │
        ▼
Postgres (AWS RDS)
  ├── requests                      [existente]
  ├── document_access_log           [existente]
  ├── doctor_profiles               [existente]
  ├── encounters                    [existente]
  ├── product_prices                [novo]
  └── doctor_contracts              [novo]
```

### Navegação no portal RH

```
Portal RH — https://rh.renovejasaude.com.br/admin
├── Dashboard               (existente)
├── Candidatos              (existente)
├── ─── NOVO ────────────
├── Produtividade           (LayoutDashboard + Activity ícone)
│   └── /:doctorId          (drill-down individual)
├── Fila ao vivo            (Radio ícone — pulse animado quando urgente)
├── Relatórios              (FileBarChart ícone)
└── Precificação            (DollarSign ícone)
```

## Dados — Migrations

### Migration 1: `product_prices`

```sql
CREATE TABLE IF NOT EXISTS public.product_prices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    -- chave lógica: tipo de atendimento precificado
    -- valores: 'prescription_simple', 'prescription_antimicrobial',
    -- 'prescription_controlled', 'exam_request', 'consultation_minute',
    -- 'consultation_flat' (fallback quando contracted_minutes = null)
    product_key TEXT NOT NULL UNIQUE,
    label TEXT NOT NULL,
    unit TEXT NOT NULL CHECK (unit IN ('unit', 'minute')),
    price_cents BIGINT NOT NULL CHECK (price_cents >= 0),
    currency CHAR(3) NOT NULL DEFAULT 'BRL',
    active BOOLEAN NOT NULL DEFAULT true,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_by UUID
);

-- Seeds iniciais (admin edita depois no portal)
INSERT INTO public.product_prices (product_key, label, unit, price_cents) VALUES
('prescription_simple',         'Receita simples',                 'unit',   0),
('prescription_antimicrobial',  'Receita de antimicrobiano',       'unit',   0),
('prescription_controlled',     'Receita controlada (azul/especial)','unit', 0),
('exam_request',                'Solicitação de exame',            'unit',   0),
('consultation_minute',         'Consulta por minuto',             'minute', 0),
('consultation_flat',           'Consulta fixa (sem tempo contratado)','unit',0)
ON CONFLICT (product_key) DO NOTHING;
```

### Migration 2: `doctor_contracts`

```sql
CREATE TABLE IF NOT EXISTS public.doctor_contracts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    doctor_profile_id UUID NOT NULL REFERENCES public.doctor_profiles(id) ON DELETE CASCADE,
    hours_per_month INTEGER NOT NULL CHECK (hours_per_month >= 0),
    hourly_rate_cents BIGINT NOT NULL DEFAULT 0 CHECK (hourly_rate_cents >= 0),
    currency CHAR(3) NOT NULL DEFAULT 'BRL',
    -- janela semanal de disponibilidade declarada (JSONB para flexibilidade)
    -- exemplo: {"mon":[{"start":"08:00","end":"12:00"}], ...}
    availability_window JSONB,
    starts_at DATE NOT NULL,
    ends_at DATE,
    active BOOLEAN NOT NULL DEFAULT true,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by UUID,
    updated_by UUID
);

CREATE INDEX IF NOT EXISTS idx_doctor_contracts_profile_active
    ON public.doctor_contracts(doctor_profile_id)
    WHERE active = true;
```

### Migration 3: Índices de performance nas tabelas existentes

```sql
-- Acelera queries agregadas por médico × status × data
CREATE INDEX IF NOT EXISTS idx_requests_doctor_status_created
    ON public.requests(doctor_id, status, created_at DESC)
    WHERE doctor_id IS NOT NULL;

-- Timeline de ações do médico (reviewed, approved, batch_signed)
CREATE INDEX IF NOT EXISTS idx_doc_access_log_user_action_created
    ON public.document_access_log(user_id, action, created_at DESC)
    WHERE user_id IS NOT NULL;

-- Fila global (doctor_id IS NULL)
CREATE INDEX IF NOT EXISTS idx_requests_queue_pending
    ON public.requests(status, priority, created_at)
    WHERE status IN ('submitted','searching_doctor','in_review') AND doctor_id IS NULL;

-- SLA: consultas em andamento
CREATE INDEX IF NOT EXISTS idx_requests_consultation_started
    ON public.requests(consultation_started_at)
    WHERE consultation_started_at IS NOT NULL;
```

## Endpoints — Backend .NET

Todos sob `[Authorize(Roles = "admin")]` + `[EnableRateLimiting("admin")]`.
Todos os `GET` setam `Cache-Control: private, max-age=10, stale-while-revalidate=20`.

### `AdminProductivityController` — `/api/admin/productivity`

| Método | Rota | Descrição | Payload resposta |
|---|---|---|---|
| GET | `/overview?from&to` | KPIs agregados do período: total pedidos, taxa conclusão, tempo mediano assinatura, receita gerada, ociosidade total | `OverviewDto` (~3 KB) |
| GET | `/doctors?from&to&sort=revenue\|volume\|p50&limit=50` | Ranking de médicos com métricas por linha | `DoctorProductivityRow[]` (~15 KB) |
| GET | `/doctors/{id}?from&to` | Drill-down individual: timeline, funil, heatmap 7×24, revenue breakdown | `DoctorDetailDto` (~20 KB) |
| GET | `/funnel?from&to` | Funil: criados → atribuídos → revisados → aprovados → assinados → entregues | `FunnelDto` (~2 KB) |
| GET | `/sla?from&to` | SLA por prioridade: p50/p95 TTFR, % dentro do target | `SlaDto` (~3 KB) |
| GET | `/queue/live` | **Endpoint de polling**: fila pendente + médicos online + alertas SLA | `LiveQueueDto` (~5 KB) |
| GET | `/reports/export?from&to&format=csv\|pdf` | Download de relatório completo (sem cache) | binary |

### `AdminPricingController` — `/api/admin/pricing`

| Método | Rota | Descrição |
|---|---|---|
| GET | `/products` | Lista atual de preços |
| PUT | `/products/{productKey}` | Atualiza preço existente (upsert por chave) |
| POST | `/products` | Cria novo produto customizado |
| DELETE | `/products/{productKey}` | Soft-delete (`active = false`) |

### `AdminContractsController` — `/api/admin/contracts`

| Método | Rota | Descrição |
|---|---|---|
| GET | `/doctors/{doctorProfileId}` | Contrato ativo do médico (ou 404) |
| PUT | `/doctors/{doctorProfileId}` | Cria/atualiza contrato (upsert) |
| DELETE | `/doctors/{doctorProfileId}` | Desativa contrato |
| GET | `?active=true` | Lista todos os contratos (com nome do médico) |

## DTOs principais

```csharp
public record OverviewDto(
    DateTime FromUtc,
    DateTime ToUtc,
    int TotalRequests,
    int CompletedRequests,
    decimal CompletionRate,       // 0..1
    int RejectedByDoctor,
    int RejectedByAi,
    int ReopenedFromAi,
    double P50MinutesToSign,
    double P95MinutesToSign,
    long RevenueCents,            // soma dos product_prices × quantidade
    long IdleCostCents,           // ociosidade × hourly_rate (quando houver contrato)
    int ActiveDoctors,            // médicos com pelo menos 1 ação no período
    int DoctorsOnline             // polling-only: médicos com ação nos últimos 5 min
);

public record DoctorProductivityRow(
    Guid DoctorProfileId,
    Guid UserId,
    string Name,
    string Specialty,
    int RequestsHandled,
    int Reviewed,
    int Signed,
    int BatchSigned,
    double P50MinutesToSign,
    double P95MinutesToSign,
    long RevenueCents,
    long IdleCostCents,
    decimal UtilizationRate,      // 0..1 (null se não há contrato)
    decimal BatchSignRate,        // % dos signs que foram em lote
    DateTime? LastActivityAt
);

public record DoctorDetailDto(
    DoctorProductivityRow Summary,
    FunnelDto Funnel,
    HeatmapCell[] Heatmap,        // 7×24 = 168 células
    TimelineItem[] RecentTimeline, // últimos 50 pedidos dele
    RevenueBreakdown[] RevenueByProduct
);

public record HeatmapCell(int DayOfWeek /*0=sun*/, int Hour /*0..23*/, int Count);

public record TimelineItem(
    Guid RequestId,
    string RequestType,
    string Status,
    DateTime CreatedAt,
    DateTime? ReviewedAt,
    DateTime? ApprovedForSigningAt,
    DateTime? SignedAt,
    DateTime? DeliveredAt,
    double? MinutesCreatedToSigned,
    long ProductRevenueCents
);

public record FunnelDto(
    int Created, int Assigned, int Reviewed,
    int Approved, int Signed, int Delivered,
    int Rejected, int Cancelled
);

public record SlaDto(
    SlaByPriority Urgent,
    SlaByPriority High,
    SlaByPriority Normal);

public record SlaByPriority(
    int TargetMinutes,
    double P50Minutes,
    double P95Minutes,
    decimal WithinTargetRate,
    int Breached);

public record LiveQueueDto(
    DateTime ServerTimeUtc,
    int TotalPending,
    int UnassignedCount,
    int UrgentCount,
    int BreachingSlaCount,
    QueueItem[] Urgent,         // até 20
    QueueItem[] OldestUnassigned, // até 10
    DoctorActivitySignal[] Online); // ~30

public record QueueItem(
    Guid Id,
    string ShortCode,
    string RequestType,
    string Priority,
    string Status,
    string? RequiredSpecialty,
    DateTime CreatedAt,
    int MinutesWaiting,
    bool SlaBreached,
    Guid? DoctorId,
    string? DoctorName);

public record DoctorActivitySignal(
    Guid DoctorProfileId,
    string Name,
    string Specialty,
    DateTime LastActivityAt,
    string LastAction,
    int ActionsLast5Min);
```

## Métricas — fórmulas de cálculo

### Tempo até assinatura (TTSign)
```sql
-- p50 e p95 em minutos
SELECT
  percentile_cont(0.5) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM (signed_at - created_at))/60) AS p50_minutes,
  percentile_cont(0.95) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM (signed_at - created_at))/60) AS p95_minutes
FROM public.requests
WHERE signed_at IS NOT NULL
  AND created_at BETWEEN @from AND @to
  AND doctor_id = @doctorId;  -- por médico, ou remove pro agregado
```

### Tempo até primeira revisão (TTFR)
```sql
-- primeiro reviewed do access_log
SELECT r.id, r.created_at,
  MIN(dal.created_at) FILTER (WHERE dal.action = 'reviewed') AS first_reviewed_at
FROM public.requests r
LEFT JOIN public.document_access_log dal ON dal.request_id = r.id
WHERE r.created_at BETWEEN @from AND @to
GROUP BY r.id, r.created_at;
```

### Receita por médico no período
```sql
-- soma de product_prices × ações do médico
WITH actions AS (
  SELECT
    r.doctor_id,
    CASE
      WHEN r.request_type = 'prescription' AND r.prescription_kind = 'simple'            THEN 'prescription_simple'
      WHEN r.request_type = 'prescription' AND r.prescription_kind = 'antimicrobial'     THEN 'prescription_antimicrobial'
      WHEN r.request_type = 'prescription' AND r.prescription_kind = 'controlled_special' THEN 'prescription_controlled'
      WHEN r.request_type = 'exam'                                                        THEN 'exam_request'
      WHEN r.request_type = 'consultation' AND r.contracted_minutes IS NOT NULL          THEN 'consultation_minute'
      WHEN r.request_type = 'consultation'                                                THEN 'consultation_flat'
    END AS product_key,
    CASE
      WHEN r.request_type = 'consultation' AND r.contracted_minutes IS NOT NULL THEN r.contracted_minutes
      ELSE 1
    END AS qty
  FROM public.requests r
  WHERE r.signed_at IS NOT NULL
    AND r.signed_at BETWEEN @from AND @to
)
SELECT a.doctor_id, SUM(a.qty * pp.price_cents) AS revenue_cents
FROM actions a
JOIN public.product_prices pp ON pp.product_key = a.product_key AND pp.active
GROUP BY a.doctor_id;
```

### Ociosidade (custo) — quando há contrato
```
horas_esperadas   = doctor_contracts.hours_per_month × (dias_período / 30)
horas_trabalhadas = (soma distintas janelas de 5min com ação no access_log) / 12
horas_ociosas     = max(0, horas_esperadas - horas_trabalhadas)
idle_cost_cents   = horas_ociosas × doctor_contracts.hourly_rate_cents
utilization       = horas_trabalhadas / horas_esperadas
```

Implementação: agrupa timestamps do `document_access_log` em *buckets* de 5 minutos por
médico; cada bucket único conta como "ativo". Essa heurística evita contar "idle entre
duas ações próximas" como trabalho ocioso.

### Heatmap 7×24
```sql
SELECT
  EXTRACT(DOW  FROM dal.created_at AT TIME ZONE 'America/Sao_Paulo')::INT AS dow,
  EXTRACT(HOUR FROM dal.created_at AT TIME ZONE 'America/Sao_Paulo')::INT AS hour,
  COUNT(*) AS n
FROM public.document_access_log dal
WHERE dal.user_id = @doctorUserId
  AND dal.action IN ('reviewed','approved_for_signing','batch_signed')
  AND dal.created_at BETWEEN @from AND @to
GROUP BY 1, 2;
```

### SLA por prioridade (target hard-coded na fase 1)

| Prioridade | Target TTFR (minutos) |
|---|---|
| Urgent | 10 |
| High | 30 |
| Normal | 120 |

> Na fase 2 esses targets viram configuráveis via nova tabela `sla_targets` — fora do
> escopo da primeira entrega.

## Frontend — Páginas e componentes

### Rotas (App.tsx)

```tsx
const AdminProductivityPage       = lazy(() => import('./pages/admin/AdminProductivityPage'));
const AdminDoctorProductivityPage = lazy(() => import('./pages/admin/AdminDoctorProductivityPage'));
const AdminLiveQueuePage          = lazy(() => import('./pages/admin/AdminLiveQueuePage'));
const AdminReportsPage            = lazy(() => import('./pages/admin/AdminReportsPage'));
const AdminPricingPage            = lazy(() => import('./pages/admin/AdminPricingPage'));

// dentro do <Route element={<AdminLayout />}>:
<Route path="/admin/produtividade" element={<Suspense><AdminProductivityPage /></Suspense>} />
<Route path="/admin/produtividade/:doctorId" element={<Suspense><AdminDoctorProductivityPage /></Suspense>} />
<Route path="/admin/fila" element={<Suspense><AdminLiveQueuePage /></Suspense>} />
<Route path="/admin/relatorios" element={<Suspense><AdminReportsPage /></Suspense>} />
<Route path="/admin/precificacao" element={<Suspense><AdminPricingPage /></Suspense>} />
```

### AdminLayout — 4 itens de nav novos

```tsx
const navItems = [
  { to: '/admin', icon: LayoutDashboard, label: 'Dashboard', end: true },
  { to: '/admin/candidatos', icon: Users, label: 'Candidatos', end: false },
  { to: '/admin/produtividade', icon: Activity, label: 'Produtividade', end: false },
  { to: '/admin/fila', icon: Radio, label: 'Fila ao vivo', end: false },
  { to: '/admin/relatorios', icon: FileBarChart, label: 'Relatórios', end: false },
  { to: '/admin/precificacao', icon: DollarSign, label: 'Precificação', end: false },
];
```

### Componentes novos em `src/components/admin/productivity/`

| Arquivo | Responsabilidade |
|---|---|
| `KpiGrid.tsx` | Grade de 4–6 `KPICard` com variação vs. período anterior |
| `Heatmap.tsx` | Matriz 7×24 com intensidade por cor (opacidade) |
| `Timeline.tsx` | Timeline horizontal de um pedido (marcos created/reviewed/signed) |
| `FunnelChart.tsx` | Funil de conversão com % entre etapas |
| `SlaGauge.tsx` | Medidor semicircular (% dentro do target) |
| `DoctorRankingTable.tsx` | Tabela virtualizada, ordenável, com sparkline |
| `Sparkline.tsx` | Mini-tendência 7 dias (SVG puro, sem libs) |
| `LiveQueueCard.tsx` | Card pulsante pra pedido urgente |
| `DoctorActivityDot.tsx` | Indicador verde/âmbar/vermelho de atividade |
| `RevenueBreakdown.tsx` | Pizza + lista do faturamento por produto |
| `PricingEditor.tsx` | CRUD inline de preços |
| `ContractEditor.tsx` | Formulário de contrato por médico |
| `PeriodPicker.tsx` | Hoje / 7d / 30d / 90d / custom |

### Hook `useAdaptivePolling`

```tsx
// src/hooks/useAdaptivePolling.ts
import { useEffect, useState } from 'react';

/**
 * Retorna `intervalMs` atual, que varia com:
 * - visibilidade da aba (hidden → pausa total = null)
 * - ociosidade do usuário (>2min sem mouse/key → usa idleInterval)
 */
export function useAdaptivePolling(
  activeInterval = 10_000,
  idleInterval = 60_000,
  idleAfterMs = 120_000,
): number | null {
  const [interval, setInterval] = useState<number | null>(activeInterval);

  useEffect(() => {
    let idleTimer: number | undefined;
    let lastActivity = Date.now();

    const recompute = () => {
      if (document.visibilityState === 'hidden') return setInterval(null);
      const idle = Date.now() - lastActivity > idleAfterMs;
      setInterval(idle ? idleInterval : activeInterval);
    };

    const markActive = () => {
      lastActivity = Date.now();
      recompute();
    };

    const onVisibility = () => recompute();

    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('mousemove', markActive, { passive: true });
    window.addEventListener('keydown',   markActive);
    idleTimer = window.setInterval(recompute, 5_000);
    recompute();

    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('mousemove', markActive);
      window.removeEventListener('keydown',   markActive);
      if (idleTimer) window.clearInterval(idleTimer);
    };
  }, [activeInterval, idleInterval, idleAfterMs]);

  return interval;
}
```

Usado com SWR:
```tsx
const interval = useAdaptivePolling();
const { data } = useSWR('/api/admin/productivity/queue/live',
  fetcher,
  { refreshInterval: interval ?? 0, dedupingInterval: 5_000 });
```

### Performance (react-best-practices)

- **bundle-dynamic-imports**: todas as 5 páginas novas são `lazy()` + `Suspense`.
- **bundle-barrel-imports**: imports diretos de `lucide-react/dist/esm/icons/activity` em vez do barrel.
- **client-swr-dedup**: SWR em todos os fetches.
- **rerender-memo**: charts envolvidos em `React.memo` com igualdade rasa.
- **rerender-derived-state-no-effect**: cálculos de variação (%) derivados durante render.
- **rendering-content-visibility**: `content-visibility: auto` na tabela de ranking.
- **rendering-hoist-jsx**: skeletons e empty states hoisteados.
- **rendering-conditional-render**: ternário em vez de `&&` pra evitar falsos zeros.
- **rerender-transitions**: filtros de período usam `startTransition`.

## Segurança e LGPD

1. **Todos os endpoints novos exigem `role=admin`** (mesmo guard do `AdminDoctorsController` existente).
2. **Rate limit separado** — política `admin` já existe; aplicar também no polling `/queue/live`.
3. **Nenhum PII de paciente** aparece em lugar nenhum do dashboard. Ex: a `QueueItem` mostra `short_code`, tipo, especialidade, tempo aguardando — **nunca** nome/CPF/sintomas.
4. **Validação zod** nos responses do frontend (padrão do `admin-api.ts` atual).
5. **Audit**: toda alteração em `product_prices`/`doctor_contracts` grava `AuditEvent` com `AuditAction.Update`.
6. **Denylist de médicos de teste** (já existe em `admin-api.ts:492`) aplica também nas queries do novo controller.

## Testes

### Backend
- Unit tests dos métodos de agregação (mock de repositórios).
- Integration test Postgres com dataset fictício cobrindo:
  - Pedido criado → signed (fluxo feliz).
  - Pedido rejeitado pela IA → reaberto pelo médico → signed.
  - Consulta com `doctor_call_connected_at` < `patient_call_connected_at`.
  - Batch sign com 10 pedidos (verifica `batch_signed` action).
  - Heatmap de médico sem atividade (tabela vazia, não 500).
  - Receita sem contrato (utilização = null, não NaN).

### Frontend
- Testing-library pros 5 páginas: mock SWR, verifica que KPIs renderizam, período muda fetch, `PeriodPicker` dispara novo request.
- Hook `useAdaptivePolling`: verifica que `visibilitychange → hidden` retorna `null`.

## Rollout

1. **Fase A — banco**: aplica as 3 migrations via `MigrationRunner` (boot do backend).
2. **Fase B — backend**: merge e deploy dos 3 controllers novos. Não quebra nada porque só adiciona.
3. **Fase C — frontend**: merge e deploy do portal RH com as 4 abas. Feature flag `VITE_ENABLE_PRODUCTIVITY=true` por ambiente (preview/prod).
4. **Fase D — seed de preços**: admin abre `/admin/precificacao` e cadastra os valores.
5. **Fase E — seed de contratos** (opcional): admin cadastra contratos dos médicos que tiverem.

Rollback: desativa a feature flag — as rotas voltam a 404, backend segue intacto.

## Custo de infra

Cenário realista: 3 admins × 8h × 20 dias úteis/mês.

| Item | Volume | Custo marginal |
|---|---|---|
| AWS RDS queries | ~260k/mês (com cache HTTP 10s derrubando replays) | R$ 0 |
| Backend compute | +1 controller leve | R$ 0 |
| Vercel bandwidth | ~8 GB/mês | R$ 0 (dentro do Pro) |
| Storage novo | ~30 KB totais | R$ 0 |
| Logs CloudWatch | ~3 MB/mês | R$ 0 |

**Total marginal: R$ 0–20/mês.**

Pro custo zerar no pico, o design inclui:
- Polling adaptativo (10s visível, 60s idle, pausa total em background).
- Cache HTTP 10s com `stale-while-revalidate`.
- Índices compostos em todas as queries agregadas.
- Rate limit 60 req/min no `/queue/live`.
- Payload capado em 50 KB por endpoint.

## Fora de escopo (fase 2+)

- SLA targets configuráveis por especialidade (hoje hard-coded).
- Notificações push/email pro gestor quando SLA estourar.
- Previsão de fila com ML (forecast).
- Export Excel (só CSV + PDF na fase 1).
- Multi-tenancy (um portal RH por município).
- Tela do próprio médico ver seu score (voltada pro app mobile).

## Referências

- `backend-dotnet/src/RenoveJa.Domain/Entities/MedicalRequest.cs:1` — entidade raiz.
- `backend-dotnet/src/RenoveJa.Infrastructure/Data/Postgres/MigrationRunner.cs:503` — tabela `document_access_log`.
- `backend-dotnet/src/RenoveJa.Application/Services/BatchSignatureService.cs:83` — grava `reviewed`/`approved_for_signing`/`batch_signed`.
- `rh-renoveja/src/components/admin/AdminLayout.tsx:7` — `navItems` a estender.
- `rh-renoveja/src/lib/admin-api.ts:1094` — padrão atual de API client (zod + dedup).
- `rh-renoveja/src/components/admin/dashboard/KPICard.tsx` — componente reaproveitado.
