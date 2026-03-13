# RequestService Refactoring Plan

> **Objetivo:** Decompor o God Service RequestService (~2.900 linhas, 27 dependências) em serviços focados, mantendo compatibilidade via facade.

**Referência:** `backend-dotnet/src/RenoveJa.Application/Services/Requests/RequestService.cs`

---

## Situação Atual

| Métrica | Valor |
|---------|-------|
| Linhas | ~2.900 |
| Dependências injetadas | 27 |
| Métodos públicos | ~35 |
| Responsabilidades | Receita, exame, consulta, aprovação, assinatura, vídeo, PDF, notificações |

---

## Estratégia: Extração por Domínio

Manter `RequestService` como **facade** que delega para serviços especializados. Controllers continuam injetando apenas `IRequestService`.

```
IRequestService (facade)
    ├── IPrescriptionWorkflowService   (criar, atualizar, validar, PDF, reanalisar)
    ├── IExamWorkflowService           (criar, atualizar, PDF, reanalisar)
    ├── IConsultationWorkflowService   (aceitar, iniciar, finalizar, transcrição, conduta)
    ├── IRequestApprovalService        (já existe — aprovar, rejeitar, atribuir)
    ├── IRequestSigningService         (assinar, documento assinado)
    ├── IRequestQueryService           (GetById, GetUserRequests, GetPatientRequests, Paged)
    └── IRequestDeliveryService        (MarkDelivered, Cancel)
```

---

## Fase 1: Extrair PrescriptionWorkflowService

### Responsabilidades

- `CreatePrescriptionAsync`
- `UpdatePrescriptionContentAsync`
- `ValidatePrescriptionAsync`
- `GetPrescriptionPdfPreviewAsync`
- `ReanalyzePrescriptionAsync`
- `ReanalyzeAsDoctorAsync`
- Helpers: `ParsePrescriptionType`, `ParsePrescriptionKind`, `EnforcePrescriptionCooldownAsync`, `BuildControlledDuplicateWarningAsync`

### Dependências estimadas

- IRequestRepository, IProductPriceRepository, IUserRepository, IDoctorRepository
- IAiReadingService, IAiPrescriptionGeneratorService, IPrescriptionPdfService
- IDigitalCertificateService, IStorageService, IRequestEventsPublisher
- INotificationRepository, IPushNotificationSender, IAuditService
- ILogger

### Tarefas

- [ ] Criar `IPrescriptionWorkflowService` e `PrescriptionWorkflowService`
- [ ] Mover métodos e helpers para o novo serviço
- [ ] RequestService.CreatePrescriptionAsync → delega para PrescriptionWorkflowService
- [ ] Registrar no DI
- [ ] Testes unitários para PrescriptionWorkflowService

---

## Fase 2: Extrair ExamWorkflowService

### Responsabilidades

- `CreateExamAsync`
- `UpdateExamContentAsync`
- `GetExamPdfPreviewAsync`
- `ReanalyzeExamAsync`
- Helper: `EnforceExamCooldownAsync`

### Tarefas

- [ ] Criar `IExamWorkflowService` e `ExamWorkflowService`
- [ ] Mover métodos
- [ ] RequestService delega
- [ ] Registrar no DI
- [ ] Testes

---

## Fase 3: Extrair ConsultationWorkflowService

### Responsabilidades

- `AcceptConsultationAsync`
- `StartConsultationAsync`
- `ReportCallConnectedAsync`
- `FinishConsultationAsync`
- `GetTranscriptDownloadUrlAsync`
- `UpdateConductAsync`
- `AutoFinishConsultationAsync`
- Helpers: `BuildTranscriptTxtContent`, `GetConsultationAnamnesisIfAnyAsync`, `GenerateAndSetConductSuggestionAsync`

### Dependências

- IVideoRoomRepository, IConsultationAnamnesisRepository, IConsultationSessionStore
- IConsultationTimeBankRepository, IConsultationEncounterService
- IAiConductSuggestionService, IStorageService

### Tarefas

- [ ] Criar `IConsultationWorkflowService` e `ConsultationWorkflowService`
- [ ] Mover métodos
- [ ] RequestService delega
- [ ] Registrar no DI
- [ ] Testes

---

## Fase 4: Extrair RequestSigningService

### Responsabilidades

- `SignAsync`
- `GetSignedDocumentAsync`
- `GetSignedDocumentByTokenAsync`
- Helper: `DownloadSignedDocumentAsync`

### Tarefas

- [ ] Criar `IRequestSigningService` e `RequestSigningService`
- [ ] Mover métodos
- [ ] RequestService delega
- [ ] Registrar no DI
- [ ] Testes

---

## Fase 5: Extrair RequestQueryService e RequestDeliveryService

### RequestQueryService

- `GetRequestByIdAsync`
- `GetUserRequestsAsync`
- `GetUserRequestsPagedAsync`
- `GetPatientRequestsAsync`
- `GetPatientProfileForDoctorAsync`
- `GetRequestImageAsync`
- `GetDoctorStatsAsync`
- `GetTimeBankBalanceAsync`
- Helper: `MapRequestToDto`, `ToProxyImageUrls`

### RequestDeliveryService

- `MarkDeliveredAsync`
- `CancelAsync`

### Tarefas

- [ ] Criar ambos os serviços
- [ ] Mover métodos
- [ ] RequestService delega
- [ ] Registrar no DI
- [ ] Testes

---

## Ordem de Execução Recomendada

1. **Fase 5** (Query + Delivery) — menor risco, métodos mais isolados
2. **Fase 4** (Signing) — domínio claro
3. **Fase 2** (Exam) — menor que Prescription
4. **Fase 1** (Prescription) — maior impacto
5. **Fase 3** (Consultation) — mais complexo, muitas integrações

---

## Critérios de Conclusão

- [ ] RequestService reduzido a < 500 linhas (apenas orquestração)
- [ ] Nenhuma quebra de contrato IRequestService
- [ ] Todos os testes existentes passando
- [ ] Novos testes para cada serviço extraído
