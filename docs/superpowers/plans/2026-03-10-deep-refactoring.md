# Deep Refactoring Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Modularize the RenoveJa+ monorepo — split monolithic API clients, large components, hooks, provider stack, backend controller, and create shared types package. Zero breaking changes.

**Architecture:** Facade pattern (barrel re-exports) for API clients. Component decomposition by responsibility. Sub-hook extraction. npm workspaces for shared types. ASP.NET route-sharing for controller split.

**Tech Stack:** TypeScript, React/React Native, Expo 54, .NET 8, npm workspaces

**Spec:** `docs/superpowers/specs/2026-03-10-refactoring-deep-design.md`

---

## Chunk 1: Mobile API Client Modularization

### Task 1: Extract payment functions from api.ts into api-payments.ts

**Files:**
- Create: `frontend-mobile/lib/api-payments.ts`
- Modify: `frontend-mobile/lib/api.ts`

- [ ] **Step 1: Create api-payments.ts with payment functions**

Move these functions (lines 521–580 of api.ts) into `api-payments.ts`:
- `createPayment`
- `fetchPaymentByRequest`
- `fetchPayment`
- `fetchPixCode`
- `confirmPayment`
- `confirmPaymentByRequest`
- `syncPaymentStatus`
- `getCheckoutProUrl`
- `fetchSavedCards`
- `payWithSavedCard`

The file must import `apiClient` from `./api-client` and export all functions.

- [ ] **Step 2: Create api-doctors.ts with doctor functions**

Create: `frontend-mobile/lib/api-doctors.ts`

Move these functions (lines 598–654 of api.ts):
- `fetchDoctors`
- `fetchDoctorById`
- `fetchDoctorQueue`
- `updateDoctorAvailability`
- `getMyDoctorProfile`
- `updateDoctorProfile`
- `validateCrm`
- `fetchDoctorStats` (line 750)
- `fetchSpecialties` (line 676)

- [ ] **Step 3: Create api-clinical.ts with clinical/FHIR functions**

Create: `frontend-mobile/lib/api-clinical.ts`

Move these functions (lines 776–896 of api.ts):
- `fetchMyPatientSummary`
- `fetchMyEncounters`
- `fetchMyDocuments`
- `getDoctorPatientSummary`
- `getDoctorPatientEncounters`
- `getDoctorPatientDocuments`
- `getPatientRequests`
- `getPatientProfileForDoctor`
- `getPatientClinicalSummary`
- `addDoctorPatientNote`

- [ ] **Step 4: Create api-auth-extended.ts**

Create: `frontend-mobile/lib/api-auth-extended.ts`

Move these functions (lines 30–61 of api.ts):
- `changePassword`
- `updateAvatar`
- `ensureFileUriForUpload` (private helper used by updateAvatar)

- [ ] **Step 5: Create api-consultation.ts with consultation/transcription functions**

Create: `frontend-mobile/lib/api-consultation.ts`

Move these functions (lines 423–503 of api.ts):
- `transcribeTextChunk`
- `transcribeAudioChunk`
- `getTranscriptDownloadUrl`
- `transcribeTestAudio`
- `updateConduct`
- `parseAiSuggestedExams`

- [ ] **Step 6: Create api-requests.ts with request CRUD functions**

Create: `frontend-mobile/lib/api-requests.ts`

Move remaining request functions (lines 83–420 of api.ts):
- `createPrescriptionRequest`, `createExamRequest`, `createConsultationRequest`
- `getAssistantNextAction`, `evaluateAssistantCompleteness`
- `fetchRequests`, `fetchRequestById`
- `updateRequestStatus`, `approveRequest`, `rejectRequest`
- `assignToQueue`, `acceptConsultation`, `startConsultation`
- `reportCallConnected`, `finishConsultation`, `saveConsultationSummary`
- `signRequest`, `reanalyzePrescription`, `reanalyzeExam`, `reanalyzeAsDoctor`
- `generatePdf`, `getPreviewPdf`, `getPreviewExamPdf`
- `validatePrescription`, `markRequestDelivered`
- `updatePrescriptionContent`, `updateExamContent`
- `autoFinishConsultation`, `getTimeBankBalance`

- [ ] **Step 7: Convert api.ts into facade with re-exports and aliases**

Replace api.ts body with:
```typescript
// Re-export all domain modules
export * from './api-requests';
export * from './api-consultation';
export * from './api-payments';
export * from './api-doctors';
export * from './api-clinical';
export * from './api-auth-extended';

// Keep existing re-exports
export * from './api-notifications';
export * from './api-video';
export * from './api-integrations';
export * from './api-care-plans';
export * from './api-contracts';
export * from './api-daily';

// Keep aliases (lines 900–942) inline
```

Keep the alias functions (`getRequests`, `getRequestById`, `getPaymentByRequest`, etc.) and `sortRequestsByNewestFirst` in api.ts since they reference functions from multiple modules.

- [ ] **Step 8: Run mobile quality checks**

```bash
cd frontend-mobile
npm run typecheck
npm run lint
npm run test -- --watchAll=false
```

Expected: All pass (zero breaking changes via re-exports).

- [ ] **Step 9: Commit**

```bash
cd frontend-mobile
git add lib/api.ts lib/api-payments.ts lib/api-doctors.ts lib/api-clinical.ts lib/api-auth-extended.ts lib/api-consultation.ts lib/api-requests.ts
git commit -m "refactor(mobile): split api.ts into domain modules with facade re-exports"
```

---

## Chunk 2: Web API Client Modularization

### Task 2: Split doctorApi.ts into domain modules

**Files:**
- Create: `frontend-web/src/services/doctor-api-auth.ts`
- Create: `frontend-web/src/services/doctor-api-requests.ts`
- Create: `frontend-web/src/services/doctor-api-consultation.ts`
- Create: `frontend-web/src/services/doctor-api-doctors.ts`
- Create: `frontend-web/src/services/doctor-api-clinical.ts`
- Create: `frontend-web/src/services/doctor-api-misc.ts`
- Modify: `frontend-web/src/services/doctorApi.ts`

- [ ] **Step 1: Create doctor-api-auth.ts**

Move from doctorApi.ts (lines 188–340):
- `getToken`, `getStoredUser`, `storeAuth`, `clearAuth` (auth helpers)
- `authFetch` (base HTTP client — shared by all modules)
- `loginDoctor`, `registerDoctorFull`, `logoutDoctor`
- `getMe`, `getDoctorProfile`, `updateDoctorProfile`
- `updateAvatar`, `changePassword`, `forgotPassword`

NOTE: `authFetch` is the base client used by ALL modules. Export it from this file; other modules import it.

- [ ] **Step 2: Create doctor-api-requests.ts**

Move from doctorApi.ts (lines 342–458):
- `getRequests`, `getRequestById`, `getDoctorStats`
- `approveRequest`, `rejectRequest`, `signRequest`
- `acceptConsultation`, `startConsultation`, `reportCallConnected`
- `reanalyzePrescription`, `reanalyzeExam`, `reanalyzeAsDoctor`

Import `authFetch` from `./doctor-api-auth`.

- [ ] **Step 3: Create doctor-api-consultation.ts**

Move from doctorApi.ts (lines 404–480, 482–536, 638–683):
- `finishConsultation`, `saveConsultationSummary`, `autoFinishConsultation`
- `getRecordings`, `getTranscriptDownloadUrl`, `getTimeBank`
- `updateConduct`, `updatePrescriptionContent`, `updateExamContent`
- `getPreviewPdf`, `getPreviewExamPdf`, `validatePrescription`
- `transcribeText`, `getAssistantNextAction`
- `getExamSuggestions`, `generateExamSuggestions`, `enrichTriage`

- [ ] **Step 4: Create doctor-api-doctors.ts**

Move from doctorApi.ts (lines 568–610, 612–636):
- `getNotifications`, `markNotificationRead`, `markAllNotificationsRead`
- `getActiveCertificate`, `uploadCertificate`
- `createVideoRoom`, `getJoinToken`, `getVideoRoom`

- [ ] **Step 5: Create doctor-api-clinical.ts**

Move from doctorApi.ts (lines 537–566):
- `getPatientProfile`, `getPatientRequests`
- `getPatientClinicalSummary`, `addDoctorNote`

- [ ] **Step 6: Create doctor-api-misc.ts**

Move from doctorApi.ts (lines 685–734):
- `fetchSpecialties`, `searchCid`
- `fetchAddressByCep`
- `getPrescriptionImage`, `getExamImage`

- [ ] **Step 7: Convert doctorApi.ts into facade**

Keep types + constants (lines 9–175) in doctorApi.ts (they're imported everywhere).
Replace function body with:
```typescript
// Types stay here (exported as before)
// ...

// Re-export all domain modules
export * from './doctor-api-auth';
export * from './doctor-api-requests';
export * from './doctor-api-consultation';
export * from './doctor-api-doctors';
export * from './doctor-api-clinical';
export * from './doctor-api-misc';
```

- [ ] **Step 8: Run web quality checks**

```bash
cd frontend-web
npm run lint
npm run test:run
npm run build
```

- [ ] **Step 9: Commit**

```bash
git add frontend-web/src/services/
git commit -m "refactor(web): split doctorApi.ts into domain modules with facade re-exports"
```

---

## Chunk 3: Mobile Component Decomposition

### Task 3: Split DoctorAIPanel.tsx

**Files:**
- Create: `frontend-mobile/components/video/ai-panel/AISuggestionView.tsx`
- Create: `frontend-mobile/components/video/ai-panel/AIIndicators.tsx`
- Create: `frontend-mobile/components/video/ai-panel/AIMetadataPanel.tsx`
- Create: `frontend-mobile/components/video/ai-panel/types.ts`
- Modify: `frontend-mobile/components/video/DoctorAIPanel.tsx`

- [ ] **Step 1: Create types.ts with shared type definitions**

Extract types from DoctorAIPanel.tsx lines 20–98:
- `MedSugerido`, `ExameSugerido`, `DiagDiferencial`, and other local types
- `DoctorAIPanelProps` interface

- [ ] **Step 2: Create AISuggestionView.tsx**

Extract the AI suggestion rendering logic (medication list, exam list, diagnosis differentials). This is the section that displays AI-suggested medications, exams, and diagnoses.

- [ ] **Step 3: Create AIIndicators.tsx**

Extract risk/urgency badge rendering — the colored indicators showing urgency levels and risk assessments from the AI analysis.

- [ ] **Step 4: Create AIMetadataPanel.tsx**

Extract the detailed AI metadata display — expanded view showing raw AI analysis data, confidence scores, and source information.

- [ ] **Step 5: Refactor DoctorAIPanel.tsx to use sub-components**

Replace inline rendering with imports from `./ai-panel/` sub-components. Main file becomes orchestrator importing and composing the extracted components.

- [ ] **Step 6: Run mobile checks**

```bash
cd frontend-mobile && npm run typecheck && npm run lint
```

- [ ] **Step 7: Commit**

```bash
git add frontend-mobile/components/video/
git commit -m "refactor(mobile): decompose DoctorAIPanel into focused sub-components"
```

### Task 4: Split VideoCallScreenInner.tsx

**Files:**
- Create: `frontend-mobile/hooks/useVideoCallEvents.ts`
- Create: `frontend-mobile/hooks/useConsultationTimer.ts`
- Create: `frontend-mobile/components/video/VideoControls.tsx`
- Create: `frontend-mobile/components/video/TranscriptionDisplay.tsx`
- Modify: `frontend-mobile/components/video/VideoCallScreenInner.tsx`

- [ ] **Step 1: Extract useVideoCallEvents hook**

Extract SignalR event listeners (lines ~200–350 of VideoCallScreenInner.tsx) — TranscriptUpdate, AnamnesisUpdate, SuggestionUpdate handlers into a dedicated hook.

- [ ] **Step 2: Extract useConsultationTimer hook**

Extract timer/countdown logic (lines ~350–400) — consultation duration tracking and billing timer into a focused hook.

- [ ] **Step 3: Create VideoControls.tsx**

Extract call control buttons (mute, camera toggle, flip camera, speaker, end call) into a standalone component. Accept callbacks as props.

- [ ] **Step 4: Create TranscriptionDisplay.tsx**

Extract the real-time transcription text display section into a standalone component. Accept transcript data as props.

- [ ] **Step 5: Refactor VideoCallScreenInner.tsx**

Replace extracted sections with imports. Main file orchestrates sub-components and hooks.

- [ ] **Step 6: Run checks and commit**

```bash
cd frontend-mobile && npm run typecheck && npm run lint
git add frontend-mobile/components/video/ frontend-mobile/hooks/
git commit -m "refactor(mobile): decompose VideoCallScreenInner into sub-components and hooks"
```

### Task 5: Deduplicate AssistantBanner

**Files:**
- Create: `frontend-mobile/hooks/useDraggablePanel.ts`
- Modify: `frontend-mobile/components/triage/DraggableAssistantBanner.tsx`
- Modify: `frontend-mobile/components/triage/AssistantBanner.tsx`

- [ ] **Step 1: Create useDraggablePanel.ts hook**

Extract from DraggableAssistantBanner.tsx:
- Position initialization + storage persistence (lines 79–119)
- Screen dimension clamping (lines 121–135)
- Pan gesture handlers (lines 199–237)
- Animated style computation (lines 248–261)

Hook signature:
```typescript
export function useDraggablePanel(options: {
  storageKey: string;
  fabSize: number;
  bannerWidth: number;
  isExpanded: boolean;
}) => {
  position: SharedValue<{x: number, y: number}>;
  fabGesture: GestureType;
  expandedGesture: GestureType;
  animatedStyle: AnimatedStyleProp;
}
```

- [ ] **Step 2: Refactor DraggableAssistantBanner to use hook**

Replace inline gesture/position logic with `useDraggablePanel()`. DraggableAssistantBanner becomes a thin wrapper: hook + AssistantBanner sub-component.

- [ ] **Step 3: Run checks and commit**

```bash
cd frontend-mobile && npm run typecheck && npm run lint
git add frontend-mobile/hooks/useDraggablePanel.ts frontend-mobile/components/triage/
git commit -m "refactor(mobile): extract useDraggablePanel hook, deduplicate AssistantBanner"
```

---

## Chunk 4: Web Component Decomposition

### Task 6: Split DoctorVideoCall.tsx

**Files:**
- Create: `frontend-web/src/components/doctor/video/VideoControls.tsx`
- Create: `frontend-web/src/components/doctor/video/TranscriptionPanel.tsx`
- Create: `frontend-web/src/components/doctor/video/ConsultationStats.tsx`
- Modify: `frontend-web/src/pages/doctor/DoctorVideoCall.tsx`

- [ ] **Step 1: Create VideoControls.tsx**

Extract call control buttons (mute, camera, end call, etc.) from DoctorVideoCall.tsx into a focused component with callback props.

- [ ] **Step 2: Create TranscriptionPanel.tsx**

Extract transcription display section — real-time text panel showing conversation transcript.

- [ ] **Step 3: Create ConsultationStats.tsx**

Extract timer, billing stats, and consultation metadata display.

- [ ] **Step 4: Refactor DoctorVideoCall.tsx**

Replace inline sections with imported sub-components. Main file becomes orchestrator.

- [ ] **Step 5: Run checks and commit**

```bash
cd frontend-web && npm run lint && npm run test:run && npm run build
git add frontend-web/src/components/doctor/video/ frontend-web/src/pages/doctor/DoctorVideoCall.tsx
git commit -m "refactor(web): decompose DoctorVideoCall into sub-components"
```

---

## Chunk 5: Mobile Hook Splitting

### Task 7: Split useDailyCall.ts

**Files:**
- Create: `frontend-mobile/hooks/useQualityMonitor.ts`
- Create: `frontend-mobile/hooks/useDailyJoin.ts`
- Modify: `frontend-mobile/hooks/useDailyCall.ts`

- [ ] **Step 1: Create useQualityMonitor.ts**

Extract quality monitoring logic (lines 94–115 of useDailyCall.ts):
- `startQualityMonitor` / `stopQualityMonitor`
- Connection quality state tracking
- Interval-based quality polling

- [ ] **Step 2: Create useDailyJoin.ts**

Extract join/event handling logic (lines 119–241):
- Daily.co event listeners (joined, participant-joined, participant-left, error)
- Join room logic with token
- Participant state management

- [ ] **Step 3: Refactor useDailyCall.ts as orchestrator**

Import and compose `useQualityMonitor` and `useDailyJoin`. Keep control functions (toggleMute, toggleCamera, flipCamera) and cleanup in main hook.

- [ ] **Step 4: Commit**

```bash
cd frontend-mobile && npm run typecheck && npm run lint
git add frontend-mobile/hooks/
git commit -m "refactor(mobile): split useDailyCall into sub-hooks"
```

### Task 8: Split useAudioRecorder.ts

**Files:**
- Create: `frontend-mobile/hooks/useAudioChunking.ts`
- Modify: `frontend-mobile/hooks/useAudioRecorder.ts`

- [ ] **Step 1: Create useAudioChunking.ts**

Extract chunking logic (lines 81–168 of useAudioRecorder.ts):
- `sendChunk` — transcription API call + file cleanup
- `cycleChunk` — stop prev recording, start new, send async

- [ ] **Step 2: Refactor useAudioRecorder.ts as orchestrator**

Import `useAudioChunking`. Keep start/stop and cleanup in main hook.

- [ ] **Step 3: Commit**

```bash
git add frontend-mobile/hooks/
git commit -m "refactor(mobile): extract useAudioChunking from useAudioRecorder"
```

### Task 9: Split useDoctorRequest.ts

**Files:**
- Create: `frontend-mobile/hooks/useRequestActions.ts`
- Create: `frontend-mobile/lib/requestCache.ts`
- Modify: `frontend-mobile/hooks/useDoctorRequest.ts`

- [ ] **Step 1: Create requestCache.ts**

Extract request cache logic (lines 18–27 of useDoctorRequest.ts):
- `_requestCache` map
- `cacheRequest()` function
- `getCachedRequest()` function

- [ ] **Step 2: Create useRequestActions.ts**

Extract action handlers (lines 134–264):
- `handleApprove` / `executeApprove`
- `handleReject`
- `handleSign` (complex validation)
- `handleAcceptConsultation`

Hook receives requestId, request data, and callbacks. Returns action handlers.

- [ ] **Step 3: Refactor useDoctorRequest.ts**

Import `useRequestActions` and `requestCache`. Keep data loading, conduct saving, and computed properties.

- [ ] **Step 4: Commit**

```bash
git add frontend-mobile/hooks/ frontend-mobile/lib/requestCache.ts
git commit -m "refactor(mobile): extract useRequestActions and requestCache"
```

---

## Chunk 6: Provider Stack Optimization

### Task 10: Merge NotificationProvider + ToastProvider into FeedbackProvider

**Files:**
- Create: `frontend-mobile/contexts/FeedbackContext.tsx`
- Modify: `frontend-mobile/app/_layout.tsx`
- Modify: consumers of `useNotifications()` and `useToast()`

- [ ] **Step 1: Create FeedbackContext.tsx**

Combine `NotificationContext.tsx` (144 LOC) and ToastProvider logic into a single provider that exposes:
```typescript
interface FeedbackContextValue {
  // From NotificationContext
  notifications: NotificationResponseDto[];
  unreadCount: number;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  refreshNotifications: () => void;
  // From ToastProvider
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}
```

Memoize the value with `useMemo()`.

- [ ] **Step 2: Create backward-compatible hooks**

Export `useNotifications()` and `useToast()` from FeedbackContext.tsx that consume the same context but expose the subset of values matching the original APIs. This ensures zero breaking changes.

- [ ] **Step 3: Move TriageAssistantProvider to (doctor)/ routes**

In `frontend-mobile/app/(doctor)/_layout.tsx`, wrap the doctor routes with `TriageAssistantProvider`. Remove it from root `_layout.tsx`.

- [ ] **Step 4: Memoize remaining provider values**

Review all remaining providers in `_layout.tsx` and ensure their context values are wrapped with `useMemo()`:
- `AuthProvider` — check for memoization
- `RequestsEventsProvider` — check for memoization
- `ModalVisibilityProvider` — check for memoization

- [ ] **Step 5: Update _layout.tsx with new stack**

Replace `NotificationProvider` + `ToastProvider` with `FeedbackProvider`. Remove `TriageAssistantProvider` from root layout.

- [ ] **Step 6: Run checks and commit**

```bash
cd frontend-mobile && npm run typecheck && npm run lint && npm run test -- --watchAll=false
git add frontend-mobile/contexts/ frontend-mobile/app/
git commit -m "refactor(mobile): merge feedback providers, lazy-load TriageAssistant"
```

---

## Chunk 7: Shared Types Package

### Task 11: Create @renoveja/shared-types package

**Files:**
- Create: `package.json` (root — npm workspaces)
- Create: `packages/shared-types/package.json`
- Create: `packages/shared-types/tsconfig.json`
- Create: `packages/shared-types/src/index.ts`
- Create: `packages/shared-types/src/requests.ts`
- Create: `packages/shared-types/src/doctor.ts`
- Create: `packages/shared-types/src/notifications.ts`
- Create: `packages/shared-types/src/clinical.ts`
- Create: `packages/shared-types/src/payments.ts`
- Create: `packages/shared-types/src/common.ts`
- Modify: `frontend-mobile/types/database.ts`
- Modify: `frontend-web/src/types/doctor.ts`
- Modify: `frontend-mobile/package.json`
- Modify: `frontend-web/package.json`

- [ ] **Step 1: Create root package.json with workspaces**

```json
{
  "name": "ola-jamal",
  "private": true,
  "workspaces": [
    "packages/*",
    "frontend-web",
    "frontend-mobile"
  ]
}
```

- [ ] **Step 2: Create packages/shared-types/package.json**

```json
{
  "name": "@renoveja/shared-types",
  "version": "1.0.0",
  "private": true,
  "main": "src/index.ts",
  "types": "src/index.ts"
}
```

- [ ] **Step 3: Create tsconfig.json for shared-types**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "declaration": true,
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src"]
}
```

- [ ] **Step 4: Create shared type files**

Extract from `frontend-mobile/types/database.ts`:

**common.ts:**
- `UserRole` type
- `RequestType`, `PrescriptionType`, `PrescriptionKind` types
- `RequestStatus` type
- `PaymentStatus` type
- `NotificationType` type
- `VideoRoomStatus` type
- `PagedResponse<T>` generic

**requests.ts:**
- `RequestResponseDto` interface (the big one — 55+ fields)

**doctor.ts:**
- `DoctorProfileDto` interface
- `DoctorListResponseDto` interface
- `CrmValidationResponseDto` interface

**notifications.ts:**
- `NotificationResponseDto` interface

**clinical.ts:**
- `PatientSummaryDto`, `EncounterSummaryDto`, `MedicalDocumentSummaryDto`
- `PatientProfileForDoctorDto`
- `EncounterTypeName`, `DocumentTypeName` types

**payments.ts:**
- `PaymentResponseDto` interface

**index.ts:**
- Re-export everything

- [ ] **Step 5: Add dependency to frontend-mobile**

In `frontend-mobile/package.json`:
```json
"dependencies": {
  "@renoveja/shared-types": "workspace:*"
}
```

Update `frontend-mobile/types/database.ts`:
```typescript
// Re-export shared types
export * from '@renoveja/shared-types';

// Mobile-exclusive types (keep here)
export interface UserDto { /* ... */ }
export interface AuthResponseDto { /* ... */ }
export interface CertificateInfoDto { /* ... */ }
export interface UploadCertificateResponseDto { /* ... */ }
export interface PushTokenDto { /* ... */ }

// Legacy aliases
export type User = UserDto;
// ...
```

- [ ] **Step 6: Add dependency to frontend-web**

In `frontend-web/package.json`:
```json
"dependencies": {
  "@renoveja/shared-types": "workspace:*"
}
```

Update `frontend-web/src/types/doctor.ts` to re-export shared types + keep web-exclusive types.

- [ ] **Step 7: Configure Metro resolver (mobile)**

In `frontend-mobile/metro.config.js`, add `watchFolders` for the shared package:
```javascript
const path = require('path');
config.watchFolders = [
  path.resolve(__dirname, '../packages/shared-types'),
];
```

- [ ] **Step 8: Configure Vite resolver (web)**

In `frontend-web/vite.config.ts`, verify TypeScript paths resolve. npm workspaces + `moduleResolution: "bundler"` should handle this automatically.

- [ ] **Step 9: Install and verify**

```bash
# From root
npm install
cd frontend-mobile && npm run typecheck
cd ../frontend-web && npm run lint && npm run build
```

- [ ] **Step 10: Commit**

```bash
git add package.json packages/ frontend-mobile/types/ frontend-mobile/package.json frontend-mobile/metro.config.js frontend-web/src/types/ frontend-web/package.json
git commit -m "feat: create @renoveja/shared-types package with npm workspaces"
```

---

## Chunk 8: Backend Controller Split

### Task 12: Extract RequestApprovalController

**Files:**
- Create: `backend-dotnet/src/RenoveJa.Api/Controllers/RequestApprovalController.cs`
- Modify: `backend-dotnet/src/RenoveJa.Api/Controllers/RequestsController.cs`

- [ ] **Step 1: Create RequestApprovalController.cs**

Move these endpoints from RequestsController.cs:
- `UpdateStatus()` (lines 652–661) — `PUT /{id}/status`
- `Approve()` (lines 668–680) — `POST /{id}/approve`
- `Reject()` (lines 685–696) — `POST /{id}/reject`
- `AssignQueue()` (lines 701–709) — `POST /{id}/assign-queue`
- `UpdateConduct()` (lines 1153–1165) — `PUT /{id}/conduct`
- `MarkDelivered()` (lines 1061–1067) — `POST /{id}/mark-delivered`
- `Cancel()` (lines 1072–1078) — `POST /{id}/cancel`

Use `[Route("api/requests")]` — same route prefix.

Inject only needed dependencies: `IRequestService`, `ILogger<RequestApprovalController>`.

Extract shared helper: `GetUserId()` into a base class or extension method (used by all controllers).

- [ ] **Step 2: Build and test**

```bash
cd backend-dotnet && dotnet build && dotnet test
```

- [ ] **Step 3: Commit**

```bash
git add backend-dotnet/src/RenoveJa.Api/Controllers/
git commit -m "refactor(backend): extract RequestApprovalController from RequestsController"
```

### Task 13: Extract ConsultationWorkflowController

**Files:**
- Create: `backend-dotnet/src/RenoveJa.Api/Controllers/ConsultationWorkflowController.cs`
- Modify: `backend-dotnet/src/RenoveJa.Api/Controllers/RequestsController.cs`

- [ ] **Step 1: Create ConsultationWorkflowController.cs**

Move:
- `AcceptConsultation()` (lines 714–725)
- `StartConsultation()` (lines 730–744)
- `ReportCallConnected()` (lines 749–758)
- `FinishConsultation()` (lines 763–773)
- `SaveConsultationSummary()` (lines 778–802)
- `AutoFinishConsultation()` (lines 1118–1139)
- `GetTimeBankBalance()` (lines 1145–1151)

Route: `[Route("api/requests")]`.

Inject: `IRequestService`, `IConsultationEncounterService`, `IOptions<DailyConfig>`, `ILogger`.

- [ ] **Step 2: Build and test**

```bash
cd backend-dotnet && dotnet build && dotnet test
```

- [ ] **Step 3: Commit**

```bash
git add backend-dotnet/src/RenoveJa.Api/Controllers/
git commit -m "refactor(backend): extract ConsultationWorkflowController"
```

### Task 14: Extract PrescriptionExamController

**Files:**
- Create: `backend-dotnet/src/RenoveJa.Api/Controllers/PrescriptionExamController.cs`
- Modify: `backend-dotnet/src/RenoveJa.Api/Controllers/RequestsController.cs`

- [ ] **Step 1: Create PrescriptionExamController.cs**

Move:
- `ValidatePrescription()` (lines 808–820)
- `Sign()` (lines 825–836)
- `ReanalyzePrescription()` (lines 842–851)
- `ReanalyzeExam()` (lines 856–865)
- `ReanalyzeAsDoctor()` (lines 870–881)
- `GeneratePdf()` (lines 886–923)
- `PreviewPdf()` (lines 928–938)
- `PreviewExamPdf()` (lines 943–953)
- `UpdatePrescriptionContent()` (lines 1083–1095)
- `UpdateExamContent()` (lines 1100–1112)

Inject: `IRequestService`, `IPrescriptionPdfService`, `IStorageService`, `ILogger`.

- [ ] **Step 2: Build and test, commit**

```bash
cd backend-dotnet && dotnet build && dotnet test
git add backend-dotnet/src/RenoveJa.Api/Controllers/
git commit -m "refactor(backend): extract PrescriptionExamController"
```

### Task 15: Extract ClinicalRecordsController

**Files:**
- Create: `backend-dotnet/src/RenoveJa.Api/Controllers/ClinicalRecordsController.cs`
- Modify: `backend-dotnet/src/RenoveJa.Api/Controllers/RequestsController.cs`

- [ ] **Step 1: Create ClinicalRecordsController.cs**

Move:
- `GetPatientRequests()` (lines 290–299)
- `GetPatientProfile()` (lines 305–317)
- `GetPatientClinicalSummary()` (lines 322–460)
- `AddDoctorPatientNote()` (lines 468–506)
- `CreateDocumentToken()` (lines 959–973)
- `GetDocument()` (lines 980–1014)
- `GetPrescriptionImage()` (lines 1020–1035)
- `GetExamImage()` (lines 1041–1056)
- `GetRecordings()` (lines 609–630)
- `GetTranscriptDownloadUrl()` (lines 636–647)

Inject: `IRequestService`, `IClinicalSummaryService`, `IDoctorPatientNotesRepository`, `IAuditEventService`, `IDocumentTokenService`, `IRequestRepository`, `ILogger`.

- [ ] **Step 2: Build and test, commit**

```bash
cd backend-dotnet && dotnet build && dotnet test
git add backend-dotnet/src/RenoveJa.Api/Controllers/
git commit -m "refactor(backend): extract ClinicalRecordsController"
```

### Task 16: Verify remaining RequestsController is lean

- [ ] **Step 1: Verify RequestsController now only has CRUD**

After all extractions, RequestsController.cs should contain only:
- `CreatePrescription()` (POST /prescription)
- `CreateExam()` (POST /exam)
- `CreateConsultation()` (POST /consultation)
- `GetRequests()` (GET /)
- `GetRequest()` (GET /{id})
- `GetStats()` (GET /stats)

Target: ~200 LOC.

- [ ] **Step 2: Full backend validation**

```bash
cd backend-dotnet && dotnet build && dotnet test
```

- [ ] **Step 3: Final commit**

```bash
git add backend-dotnet/
git commit -m "refactor(backend): RequestsController now ~200 LOC, CRUD only"
```

---

## Chunk 9: Design System Cleanup

### Task 17: Remove deprecated theme files

**Files:**
- Verify: `frontend-mobile/lib/theme.ts` (deprecated per header comment)
- Verify: `frontend-mobile/lib/themeDoctor.ts`
- Verify: `frontend-mobile/lib/ui/tokens.ts`
- Verify: `frontend-mobile/constants/theme.ts`

- [ ] **Step 1: Search for imports of deprecated files**

```bash
cd frontend-mobile
grep -r "from.*['\"].*lib/theme['\"]" --include="*.ts" --include="*.tsx" -l
grep -r "from.*['\"].*themeDoctor['\"]" --include="*.ts" --include="*.tsx" -l
grep -r "from.*['\"].*ui/tokens['\"]" --include="*.ts" --include="*.tsx" -l
grep -r "from.*['\"].*constants/theme['\"]" --include="*.ts" --include="*.tsx" -l
```

- [ ] **Step 2: For each file with imports, redirect to designSystem**

Replace `import { X } from '../lib/theme'` with `import { X } from '../lib/designSystem'` (or the appropriate relative path).

- [ ] **Step 3: If no remaining imports, delete deprecated files**

Remove files that are no longer imported. If `constants/theme.ts` is imported by many files, keep it as a thin re-export proxy.

- [ ] **Step 4: Run checks and commit**

```bash
cd frontend-mobile && npm run typecheck && npm run lint && npm run test -- --watchAll=false
git add frontend-mobile/
git commit -m "refactor(mobile): remove deprecated theme files, consolidate to designSystem.ts"
```

---

## Final Verification

### Task 18: End-to-end validation

- [ ] **Step 1: Full mobile validation**

```bash
cd frontend-mobile
npm run lint
npm run typecheck
npm run test -- --watchAll=false
```

- [ ] **Step 2: Full web validation**

```bash
cd frontend-web
npm run lint
npm run test:run
npm run build
```

- [ ] **Step 3: Full backend validation**

```bash
cd backend-dotnet
dotnet build
dotnet test
```

- [ ] **Step 4: Verify no API route changes (backend)**

Check Swagger/OpenAPI output to confirm all routes are identical to before the refactoring.

- [ ] **Step 5: Final summary commit**

```bash
git add -A
git status  # Verify no unexpected changes
```

If all clean, the refactoring is complete.
