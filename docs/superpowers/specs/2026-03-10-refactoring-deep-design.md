# Design: Refatoracao Profunda — RenoveJa+

**Data:** 2026-03-10
**Status:** Aprovado
**Abordagem:** Modularizacao por dominio + shared types + hook splits + provider stack + backend controller split

---

## Contexto

O monorepo RenoveJa+ cresceu organicamente e acumulou monolitos em areas criticas:
- API clients de 33KB e 22KB nos frontends
- Componentes React de 1000+ linhas
- Hooks de 300+ linhas
- 11 niveis de Context providers no mobile
- RequestsController com 1212 linhas e 40 endpoints no backend
- Tipos duplicados entre web e mobile

Esta refatoracao resolve todos esses pontos sem quebrar nenhuma API ou import existente.

---

## 1. API Clients — Modularizacao por Dominio

### 1.1 Mobile (`lib/api.ts` — 951 LOC)

**Arquivos novos:**

| Arquivo | Funcoes | LOC |
|---------|---------|-----|
| `api-requests.ts` | CRUD requests, approve, reject, sign | ~320 |
| `api-consultation.ts` | fluxo consulta, transcricao, conduct | ~200 |
| `api-payments.ts` | pagamentos, cartoes, Mercado Pago | ~90 |
| `api-doctors.ts` | perfil medico, fila, CRM | ~65 |
| `api-clinical.ts` | prontuario, encounters, notas | ~95 |
| `api-auth-extended.ts` | senha, avatar | ~45 |
| `api.ts` (facade) | re-exports | ~80 |

**Mecanismo:** `api.ts` vira barrel file com `export * from './api-*'`. Imports existentes nao quebram.

### 1.2 Web (`services/doctorApi.ts` — 733 LOC)

| Arquivo | Funcoes | LOC |
|---------|---------|-----|
| `doctor-api-requests.ts` | request CRUD, status | ~150 |
| `doctor-api-consultation.ts` | fluxo consulta, transcricao | ~120 |
| `doctor-api-doctors.ts` | perfil, disponibilidade | ~60 |
| `doctor-api-clinical.ts` | prontuario, summaries | ~90 |
| `doctor-api-auth.ts` | login, register, logout | ~80 |
| `doctor-api-misc.ts` | especialidades, CID, endereco | ~70 |
| `doctorApi.ts` (facade) | types + re-exports | ~130 |

---

## 2. Componentes Grandes — Decomposicao

### 2.1 Mobile

**DoctorAIPanel.tsx (1090 LOC) → 4 arquivos:**
- `DoctorAIPanel.tsx` — orquestrador (~400 LOC)
- `AISuggestionView.tsx` — sugestoes IA (~250 LOC)
- `AIIndicators.tsx` — badges risco/urgencia (~150 LOC)
- `AIMetadataPanel.tsx` — dados detalhados (~200 LOC)

**VideoCallScreenInner.tsx (942 LOC) → 5 arquivos:**
- `VideoCallScreenInner.tsx` — orquestrador (~300 LOC)
- `VideoControls.tsx` — mute, camera, speaker (~200 LOC)
- `TranscriptionDisplay.tsx` — texto real-time (~200 LOC)
- `ConsultationTimer.tsx` — timer/billing (~100 LOC)
- `ConductFormInline.tsx` — form conduta (~140 LOC)

**AssistantBanner dedup:**
- Merge `AssistantBanner.tsx` + `DraggableAssistantBanner.tsx` → 1 componente com prop `draggable`
- Extrair `useDraggablePanel.ts` hook (~80 LOC)

### 2.2 Web

**DoctorVideoCall.tsx (682 LOC) → 4 arquivos:**
- `DoctorVideoCall.tsx` — orquestrador (~300 LOC)
- `VideoControls.tsx` — controles (~150 LOC)
- `TranscriptionPanel.tsx` — painel transcricao (~130 LOC)
- `ConsultationStats.tsx` — timer/stats (~100 LOC)

---

## 3. Hooks — Sub-hooks

### Mobile

**useDailyCall.ts (334 LOC) → 3:**
- `useDailyCall.ts` — orquestrador (~130 LOC)
- `useParticipantTracks.ts` — tracks audio/video (~100 LOC)
- `useCallState.ts` — maquina de estados (~100 LOC)

**useAudioRecorder.ts (319 LOC) → 3:**
- `useAudioRecorder.ts` — orquestrador (~120 LOC)
- `useWebAudioSetup.ts` — Web Audio API (~100 LOC)
- `useSampleBuffer.ts` — coleta amostras (~100 LOC)

**useDoctorRequest.ts (311 LOC) → 3:**
- `useDoctorRequest.ts` — orquestrador (~110 LOC)
- `useRequestApproval.ts` — approve/reject (~100 LOC)
- `useRequestSignature.ts` — assinatura (~100 LOC)

---

## 4. Provider Stack (Mobile)

**De 11 → ~8 niveis:**

1. **Merge** `ToastProvider` + `NotificationProvider` → `FeedbackProvider`
2. **Mover** `TriageAssistantProvider` para dentro das rotas `(doctor)/` (nao usado por pacientes)
3. **Memoizar** valores de todos os providers com `useMemo()`

**Stack resultante:**
```
QueryClient → ColorScheme → Gesture → Auth → Push →
FeedbackProvider → ModalVisibility → RequestsEvents
(TriageAssistant lazy em (doctor)/ routes)
```

---

## 5. Shared Types (`@renoveja/shared-types`)

**Localizacao:** `packages/shared-types/`

```
src/
  index.ts         — re-exports
  requests.ts      — RequestResponseDto / MedicalRequest
  doctor.ts        — DoctorProfile, DoctorListResponse
  notifications.ts — NotificationItem
  clinical.ts      — PatientSummary, Encounter, Observation
  payments.ts      — PaymentResponse, SavedCard
  common.ts        — PagedResponse<T>, enums
```

**Setup:** npm workspaces no root `package.json`.

**Nao compartilhar:** tipos de auth, Daily.co SDK, design system.

**Consumo:** `types/database.ts` (mobile) e `types/doctor.ts` (web) viram re-exports + tipos exclusivos.

---

## 6. Backend — RequestsController Split

**De 1 controller (1212 LOC, 40 endpoints) → 5:**

| Controller | Endpoints | LOC |
|-----------|-----------|-----|
| `RequestsController.cs` | CRUD (create, list, get, stats) | ~200 |
| `RequestApprovalController.cs` | approve, reject, status, conduct, cancel, deliver | ~180 |
| `ConsultationWorkflowController.cs` | accept, start, connected, finish, summary, auto-finish, time-bank | ~200 |
| `PrescriptionExamController.cs` | validate, sign, reanalyze, PDF, content update | ~220 |
| `ClinicalRecordsController.cs` | patient data, summary, notes, documents, images, recordings | ~250 |

**Todas com `[Route("api/requests")]`** — API publica nao muda.

**RequestService permanece intacto** como facade — split do service e fase futura.

---

## 7. Design System Cleanup

- Confirmar que `theme.ts`, `themeDoctor.ts`, `lib/ui/tokens.ts` nao sao importados
- Se nao importados: remover
- Se importados: redirecionar para `designSystem.ts`
- `constants/theme.ts`: manter como proxy se usado, senao remover

---

## 8. Verificacao

Para cada modulo apos mudancas:

```bash
# Mobile
cd frontend-mobile && npm run lint && npm run typecheck && npm run test -- --watchAll=false

# Web
cd frontend-web && npm run lint && npm run test:run && npm run build

# Backend
cd backend-dotnet && dotnet build && dotnet test
```

Checklist adicional:
- [ ] Re-exports funcionam (imports antigos resolvem)
- [ ] Bundle size nao aumentou
- [ ] E2E web (Playwright) passa
- [ ] Nenhuma rota de API mudou

---

## 9. Ordem de Execucao

| Fase | Escopo | Risco | Dias |
|------|--------|-------|------|
| 1 | API clients mobile (split + facade) | Baixo | 2-3 |
| 2 | API clients web (split + facade) | Baixo | 1-2 |
| 3 | Componentes grandes mobile | Medio | 3-4 |
| 4 | Componentes grandes web | Medio | 1-2 |
| 5 | Hooks mobile (3 → 9 sub-hooks) | Medio | 2-3 |
| 6 | Provider stack mobile | Medio | 1-2 |
| 7 | Shared types (npm workspaces) | Medio-Alto | 2-3 |
| 8 | Backend controller split | Medio | 2-3 |
| 9 | Design system cleanup | Baixo | 0.5 |

**Total estimado:** ~18-23 dias de desenvolvimento

---

## Arquivos Criticos

### Mobile
- `frontend-mobile/lib/api.ts` (951 LOC → facade)
- `frontend-mobile/lib/api-client.ts` (445 LOC — base, nao muda)
- `frontend-mobile/types/database.ts` (11.6KB → re-exports shared)
- `frontend-mobile/components/doctor-request/DoctorAIPanel.tsx` (1090 LOC → split)
- `frontend-mobile/components/video/VideoCallScreenInner.tsx` (942 LOC → split)
- `frontend-mobile/components/triage/AssistantBanner.tsx` + `DraggableAssistantBanner.tsx` (merge)
- `frontend-mobile/hooks/useDailyCall.ts` (334 LOC → 3 hooks)
- `frontend-mobile/hooks/useAudioRecorder.ts` (319 LOC → 3 hooks)
- `frontend-mobile/hooks/useDoctorRequest.ts` (311 LOC → 3 hooks)
- `frontend-mobile/app/_layout.tsx` (provider stack)
- `frontend-mobile/lib/designSystem.ts` (source of truth)
- `frontend-mobile/lib/theme.ts` (verificar/remover)

### Web
- `frontend-web/src/services/doctorApi.ts` (733 LOC → facade)
- `frontend-web/src/types/doctor.ts` (→ re-exports shared)
- `frontend-web/src/pages/doctor/DoctorVideoCall.tsx` (682 LOC → split)

### Backend
- `backend-dotnet/src/RenoveJa.Api/Controllers/RequestsController.cs` (1212 LOC → 5 controllers)
- `backend-dotnet/src/RenoveJa.Api/Program.cs` (DI — pode precisar ajuste minimo)

### Novo
- `packages/shared-types/` (pacote novo)
- Root `package.json` (novo, para workspaces)
