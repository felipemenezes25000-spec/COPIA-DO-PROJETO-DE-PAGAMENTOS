# Plano — Roteamento inteligente + Compliance clínica (abril/2026)

**Branch:** `feat/routing-and-clinical-compliance`
**Escopo executado nesta sessão:** Phase A + B + C + D + E (plano completo)

---

## Contexto

Até esta sessão, o roteamento de solicitações (receitas, exames, consultas) para médicos
usava o algoritmo mais simples possível:

```csharp
var doctors = await doctorRepository.GetAvailableAsync(null, cancellationToken);
var selectedDoctor = doctors.First();
```

Problemas identificados:

1. **Sem matching por especialidade** — um caso cardiológico podia cair em um
   dermatologista disponível, com risco assistencial real.
2. **Sem balanceamento de carga** — o primeiro médico da lista recebia tudo
   (efeito "médico estrela" sobrecarregado).
3. **Sem classificação de sensibilidade de notas clínicas** — qualquer médico
   com acesso ao prontuário via TODAS as notas de outros médicos, incluindo
   psicoterapia e saúde mental. **Viola CFP 001/2009, Lei 10.216/2001 e
   LGPD Art. 11.**

## Fases do plano completo

| Fase | Título | Status |
|------|--------|--------|
| A | Routing Strategy + Specialty + Load balancing | ✅ Feito |
| B | Request Priority (urgência clínica) | ✅ Feito |
| C | Note Sensitivity (CFM/CFP compliance) | ✅ Feito |
| D | PatientClinicalHistoryService (extrair do controller) | ✅ Feito |
| E | Queue SLA expiration worker | ✅ Feito |

---

## Phase A — Routing Strategy (concluída)

### Decisões-chave

1. **Padrão Strategy**: introduzimos `IRequestRoutingStrategy` e a implementação
   `CompositeRoutingStrategy`. Fases futuras (priority, SLA) podem decorar ou
   substituir a estratégia sem tocar em `RequestService`.

2. **Filtro de especialidade estrito (NÃO faz fallback cross-specialty)**:
   se a solicitação tem `RequiredSpecialty = "Psiquiatria"` e nenhum psiquiatra
   está disponível, o request permanece na fila — nunca é roteado para outra
   especialidade. Motivação regulatória: CFM exige habilitação específica para
   psiquiatria, pediatria, etc.

3. **Balanceamento de carga via SQL**:
   ```sql
   ORDER BY dp.total_consultations ASC,
            dp.last_assigned_at    ASC NULLS FIRST
   ```
   - Critério primário: quem atendeu menos entra primeiro.
   - Desempate: quem foi atribuído há mais tempo (ou nunca) entra primeiro.
   - Novos médicos (`NULL last_assigned_at`) sempre têm prioridade máxima.

4. **Raw SQL via `PostgresClient.CreateConnectionPublic()` + Dapper**:
   o `PostgresClient` é PostgREST-style e não consegue fazer `JOIN` nem
   `ORDER BY ... NULLS FIRST`. Usamos o escape hatch já existente (`UserRepository`
   usa o mesmo para `DeleteCascadeAsync`).

### Arquivos alterados

- `src/RenoveJa.Application/Services/Routing/IRequestRoutingStrategy.cs` (novo)
  — contrato `RoutingContext` / `RoutingDecision` / `IRequestRoutingStrategy`.
- `src/RenoveJa.Application/Services/Routing/CompositeRoutingStrategy.cs` (novo)
  — implementação única por enquanto; delega ao repositório.
- `src/RenoveJa.Domain/Interfaces/IDoctorRepository.cs`
  — adicionado `record DoctorAssignmentCandidate` e métodos
  `SelectLeastLoadedAvailableAsync`, `UpdateLastAssignedAtAsync`.
- `src/RenoveJa.Infrastructure/Repositories/DoctorRepository.cs`
  — implementação com raw SQL via Dapper; adicionada importação do `Dapper`.
- `src/RenoveJa.Domain/Entities/DoctorProfile.cs`
  — novo campo `LastAssignedAt` (nullable), método `MarkAssigned`, parâmetro
  `lastAssignedAt` em `Reconstitute`.
- `src/RenoveJa.Domain/Entities/MedicalRequest.cs` + `MedicalRequestSnapshot.cs`
  — novo campo `RequiredSpecialty` + método `SetRequiredSpecialty` (imutável
  após atribuição do médico).
- `src/RenoveJa.Infrastructure/Data/Models/PersistenceModels.cs`
  — colunas `last_assigned_at` em `DoctorProfileModel` e `required_specialty`
  em `RequestModel`.
- `src/RenoveJa.Infrastructure/Data/Postgres/MigrationRunner.cs`
  — novo grupo `request_routing` (adiciona 2 colunas + 2 índices).
- `src/RenoveJa.Application/Services/Requests/RequestService.cs`
  — `AssignToQueueAsync` reescrito para usar `IRequestRoutingStrategy` e
  chamar `UpdateLastAssignedAtAsync` após atribuição.
- `src/RenoveJa.Api/Extensions/ServiceCollectionExtensions.cs`
  — registro `AddScoped<IRequestRoutingStrategy, CompositeRoutingStrategy>()`.
- `tests/RenoveJa.UnitTests/CompositeRoutingStrategyTests.cs` (novo)
  — 4 testes unitários cobrindo happy path + null candidate + filtro por
  especialidade + sem especialidade.

### Como testar

1. `dotnet build backend-dotnet` — deve estar limpo.
2. `dotnet test backend-dotnet` — 378 testes passando, 1 ignorado.
3. Em runtime: criar um request com `RequiredSpecialty` definido e verificar
   nos logs `[Info] Roteamento selecionou doctorProfileId=...` que o médico
   escolhido tem a especialidade correta.
4. Para testar balanceamento: criar 3 médicos aprovados e disponíveis, criar
   5 requests em sequência, verificar que vão alternando entre os médicos.

---

## Phase C — Note Sensitivity (concluída)

### Motivação regulatória

- **CFP Resolução 001/2009** (Art. 9): documentos escritos por psicólogos
  (prontuário psicoterapêutico) têm sigilo ampliado — só podem ser compartilhados
  com autorização explícita do paciente.
- **Lei 10.216/2001** (Art. 2, VII): direito à confidencialidade reforçada em
  transtornos mentais.
- **CFM Resolução 1.638/2002**: prontuário único, mas admite níveis de acesso
  distintos para informações clínicas sensíveis.
- **LGPD Art. 11**: dados de saúde são dados pessoais sensíveis, sujeitos a
  minimização de acesso.

### Decisões-chave

1. **Classificação no momento da escrita** (`NoteSensitivity` enum):
   - `General` (0) — padrão retrocompatível, visível para qualquer médico do prontuário.
   - `SpecialtyOnly` (1) — visível só para médicos da mesma especialidade do autor.
   - `AuthorOnly` (2) — visível só para o autor; outros veem `SummaryForTeam`.
   - `PatientSummary` (3) — marcador para o campo de resumo seguro (não usado como nível principal).

2. **Campo `SummaryForTeam`** (compartilhável quando a nota é `AuthorOnly`):
   permite ao psiquiatra registrar uma linha segura para a equipe (ex.:
   "em acompanhamento psiquiátrico, estável, sem risco imediato") sem expor
   o conteúdo clínico detalhado da nota.

3. **Filtro aplicado no SQL** (defense in depth): a query `GetVisibleNotesAsync`
   tem o `WHERE` com as 3 regras de visibilidade. Mesmo que um call site esqueça
   de filtrar, o banco nunca devolve conteúdo sensível para quem não pode ver.
   Um `CASE` no `SELECT` substitui o `content` pelo `summary_for_team` quando
   o visualizador não é o autor de uma nota `author_only`.

4. **Auditoria obrigatória de acesso** (`note_access_audit`): tabela registra
   quem leu qual nota, quando e com qual especialidade — trilha exigida pela
   CFP/LGPD. Método `LogAccessAsync` disponível no repositório (integração
   com leituras sensíveis pode ser feita em sessão futura se desejado).

5. **Imutabilidade da sensibilidade**: uma vez criada, a nota mantém sua
   classificação. Correções viram adendos (padrão FHIR).

### Arquivos alterados

- `src/RenoveJa.Domain/Enums/NoteSensitivity.cs` (novo) — enum com os 4 níveis.
- `src/RenoveJa.Domain/Interfaces/IDoctorPatientNotesRepository.cs`
  — substituído `GetNotesAsync` por `GetVisibleNotesAsync(viewerDoctorId, viewerSpecialty, patientId)`.
  — `AddNoteAsync` agora recebe `sensitivity`, `authorSpecialty`, `summaryForTeam`.
  — adicionado `LogAccessAsync`.
  — `DoctorPatientNoteEntity` extendida com `Sensitivity`, `AuthorSpecialty`, `SummaryForTeam`.
- `src/RenoveJa.Infrastructure/Repositories/DoctorPatientNotesRepository.cs`
  — reescrito com raw SQL via Dapper; `WHERE` aplica a regra de visibilidade;
  `CASE` mascara conteúdo de `author_only` para não-autores.
- `src/RenoveJa.Infrastructure/Data/Postgres/MigrationRunner.cs`
  — novo grupo `note_sensitivity`:
    - adiciona colunas `sensitivity`, `author_specialty`, `summary_for_team` em
      `doctor_patient_notes` (default `'general'` preserva comportamento);
    - constraint `CHECK` para valores válidos;
    - índice composto `(patient_id, sensitivity)`;
    - tabela `note_access_audit` + índices.
- `src/RenoveJa.Application/DTOs/Requests/RequestDtos.cs`
  — `DoctorNoteDto` e `CreateDoctorNoteDto` estendidos com campos novos.
  — `CreateDoctorNoteDto.Sensitivity` é opcional (default `"general"` para
    retrocompatibilidade com clientes mobile/web antigos).
- `src/RenoveJa.Api/Controllers/ClinicalRecordsController.cs`
  — injeção adicional de `IDoctorRepository` (para descobrir `viewerSpecialty`).
  — helpers `ParseSensitivityOrDefault`, `SerializeSensitivity`, `MapNoteToDto`.
  — chamadas de `GetNotesAsync` substituídas por `GetVisibleNotesAsync`.
  — `AddDoctorPatientNote` valida `Sensitivity`, resolve `AuthorSpecialty`,
    aceita `SummaryForTeam` e persiste com o novo contrato.
  — auditoria agora registra `sensitivity` + `author_specialty` em
    `LogModificationAsync`.

### Como testar

1. Build + test limpos (já verificados: 378/378).
2. Migração local: ao iniciar a API, `MigrationRunner` aplica automaticamente
   `note_sensitivity` (colunas com default `'general'` = dados existentes
   continuam visíveis como sempre).
3. Criar uma nota com `sensitivity = "author_only"` + `summaryForTeam` pelo
   endpoint `POST /api/requests/by-patient/{patientId}/doctor-notes`.
4. Autenticar como OUTRO médico e chamar
   `GET /api/requests/by-patient/{patientId}/summary` — verificar que
   `doctorNotes[].content` retornado é o `summary_for_team`, `isMaskedForViewer = true`
   e `sensitivity = "author_only"`.
5. Autenticar como o autor — verificar que `content` é o texto original e
   `isMaskedForViewer = false`.
6. Criar nota com `sensitivity = "specialty_only"` como Cardiologista; logar
   como Dermatologista; confirmar que a nota não aparece na lista.

### Riscos e pendências conhecidas

- **Auditoria de leitura ainda não está acionada no controller** —
  `LogAccessAsync` existe no repositório mas o controller não invoca após
  a leitura. Pode ser ligado na próxima iteração (Phase D fará sentido aqui).
- **Frontend precisa expor o seletor de sensibilidade** — hoje o web/mobile
  envia apenas `noteType` + `content`; precisa de `sensitivity` + opcional
  `summaryForTeam` na tela de criação de nota clínica.
- **Notas existentes ficam `general`** — por default das migrations. Se houver
  notas antigas de psiquiatria/psicologia que DEVIAM ser `author_only`, será
  preciso um script de remediação one-off (não incluído nesta entrega).

---

## Phase B — Request Priority (concluída)

### Decisões-chave

1. **Enum `RequestPriority`** (`Low=0 / Normal=1 / High=2 / Urgent=3`) na camada
   Domain. Default `Normal` preserva comportamento existente.
2. **Imutável após atribuição do médico**: `MedicalRequest.SetPriority` bloqueia
   mudança quando `DoctorId` já está preenchido — mesma trilha de auditoria de
   `SetRequiredSpecialty`.
3. **Coluna `priority TEXT NOT NULL DEFAULT 'normal'`** em `requests` com
   `CHECK (priority IN ('low','normal','high','urgent'))` e índice composto
   `(priority, created_at)` — pronto para `ORDER BY priority DESC, created_at ASC`.
4. **Persistência retrocompatível**: `MedicalRequestSnapshot.Priority` é
   `string?`; o `Reconstitute` faz `TryParse` ignoreCase e cai em `Normal`
   quando o campo é nulo (dados antigos).

### Arquivos alterados

- `src/RenoveJa.Domain/Enums/RequestPriority.cs` (novo) — enum com 4 níveis + doc.
- `src/RenoveJa.Domain/Entities/MedicalRequest.cs`
  — propriedade `Priority` + método `SetPriority` (imutável após médico atribuído).
  — `Reconstitute(snapshot)` lê priority do snapshot.
- `src/RenoveJa.Domain/Entities/MedicalRequestSnapshot.cs` — campo `Priority`.
- `src/RenoveJa.Infrastructure/Data/Models/PersistenceModels.cs`
  — `[JsonPropertyName("priority")] string? Priority` em `RequestModel`.
- `src/RenoveJa.Infrastructure/Data/Postgres/MigrationRunner.cs`
  — grupo `request_priority` (coluna + CHECK + índice).
- `src/RenoveJa.Infrastructure/Repositories/RequestRepository.cs`
  — `MapToDomain`/`MapToModel` mapeiam priority.

### Como aplicar em runtime

Triagem (manual ou IA) pode chamar `request.SetPriority(RequestPriority.Urgent)`
antes do enqueue. Um worker de fila futuro (ou a evolução do
`CompositeRoutingStrategy`) pode trocar o `GetAvailableForQueueAsync` por um
`ORDER BY priority DESC, created_at ASC` usando o índice recém-criado.

---

## Phase D — PatientClinicalHistoryService (concluída)

### Motivação

`ClinicalRecordsController.GetPatientClinicalSummary` tinha ~145 linhas
misturando: (1) agregação de `consultations/prescriptions/exams` a partir de
`IRequestService.GetPatientRequestsAsync`, (2) parsing do JSON de anamnese
(alergias, CID, queixa principal), (3) chamadas à IA (`IClinicalSummaryService`),
(4) fetch de notas clínicas, (5) montagem final do payload. Teste unitário era
inviável e regressões na anamnese tocavam código do controller.

### Decisões-chave

1. **Extração só da agregação pura** (não da orquestração inteira). O novo
   `IPatientClinicalHistoryService.BuildAsync` retorna `PatientClinicalHistoryResult`
   — record com `IsEmpty`, `PatientName`, `BirthDate`, `Gender`, `Allergies`,
   `Consultations`, `Prescriptions`, `Exams`. Tem um conversor
   `ToSummaryInput()` para alimentar `IClinicalSummaryService`.

2. **`BuildFallbackSummary(history)` no mesmo service**: o texto determinístico
   que roda quando IA está offline também foi para a camada Application — mais
   fácil de cobrir com teste unitário.

3. **Controller continua dono das decisões clínicas sensíveis**: chamadas
   à IA (`GenerateStructuredAsync`/`GenerateAsync`), fetch de notas com filtro
   de sensibilidade (Phase C), auditoria de leitura. Extrair isso junto exigiria
   mover `IDoctorRepository` + `viewerSpecialty` para Application — fora do
   escopo desta fase.

### Arquivos alterados

- `src/RenoveJa.Application/Services/Clinical/IPatientClinicalHistoryService.cs` (novo).
- `src/RenoveJa.Application/Services/Clinical/PatientClinicalHistoryService.cs` (novo).
- `src/RenoveJa.Api/Controllers/ClinicalRecordsController.cs`
  — `GetPatientClinicalSummary` encolheu de ~145 para ~30 linhas úteis.
  — helpers privados `BuildFallbackSummary`/`ExtractCid` removidos (agora no service).
- `src/RenoveJa.Api/Extensions/ServiceCollectionExtensions.cs`
  — registro `AddScoped<IPatientClinicalHistoryService, PatientClinicalHistoryService>()`.

---

## Phase E — Queue SLA expiration worker (concluída)

### Decisões-chave

1. **Apenas observabilidade nesta iteração**. O worker
   `QueueSlaExpirationWorker` varre requests em `SearchingDoctor` e emite
   `LogWarning` estruturado com `requestId`, `patientId`, `ageMinutes`,
   `requiredSpecialty`, `priority`. Nenhuma ação destrutiva (re-roteamento
   forçado, expansão de filtro) — a intenção é dar sinal antes de automatizar.

2. **Parâmetros configuráveis** via `appsettings.json`:
   - `QueueSla:ScanInterval` — default `00:02:00` (a cada 2 min).
   - `QueueSla:WarningAge` — default `00:10:00` (alerta quando age > 10 min).
   Aceita `TimeSpan` ("HH:MM:SS") ou inteiro (segundos).

3. **Padrão idêntico ao `AnamnesisBackgroundService`**: `BackgroundService`
   com `IServiceScopeFactory` para cada scan criar seu próprio scope (o
   `IRequestRepository` é scoped). Delay inicial de 30 s evita competir com
   migrations/warmup.

4. **Reutiliza Phase A**: usa `IRequestRoutingStrategy` de forma indireta —
   quando uma próxima iteração quiser ligar re-roteamento, basta chamar
   `routingStrategy.SelectDoctorAsync(...)` dentro do loop para tentar atribuir
   médicos a requests estagnados.

### Arquivos alterados

- `src/RenoveJa.Api/Services/QueueSlaExpirationWorker.cs` (novo).
- `src/RenoveJa.Api/Extensions/ServiceCollectionExtensions.cs`
  — `services.AddHostedService<QueueSlaExpirationWorker>();` após
  `AnamnesisBackgroundService`.

### Como verificar em runtime

1. Criar um request de consulta: entra em `searching_doctor`.
2. Se nenhum médico estiver disponível, ele permanece na fila.
3. Após ~10 min, nos logs da API:
   `[Warning] QueueSLA breach: requestId=... ageMinutes=10.3 ...`
4. Para acelerar o teste: setar `QueueSla:WarningAge=00:00:30` e
   `QueueSla:ScanInterval=00:00:10`.

### Pendências conhecidas

- Não faz re-roteamento automático (por design nesta iteração).
- Não persiste métrica em banco — consome só logs. Integrar com
  Grafana/CloudWatch via parser de log JSON quando necessário.
