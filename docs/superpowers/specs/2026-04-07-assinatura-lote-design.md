# Assinatura em Lote — Design Spec

**Data:** 2026-04-07
**Autor:** Claude (Opus 4.6) · contribuição conceitual de Carolina Akiko (WhatsApp 22:48, 07/04/2026)
**Escopo:** Backend .NET + Mobile (Expo Router, doctor tabs)
**Status:** Aprovado pelo usuário para implementação

---

## 1. Problema

Hoje o médico precisa digitar a senha do certificado PFX (ICP-Brasil A1) a **cada requisição** de receita/exame que assina. Para um médico que assina 20–40 documentos por dia, isso é:

- **Lento** (troca de contexto cognitivo por item)
- **Inseguro** (senha digitada muitas vezes → maior superfície de shoulder-surf)
- **Desmotivador** (trabalho repetitivo sem feedback de produtividade)

Além disso, a tela atual de Pedidos no mobile (`app/(doctor)/requests.tsx`) mistura todos os status em uma lista plana com filtros por **tipo** (Receitas/Exames/Consultas), mas não por **estado do fluxo**, o que dificulta triagem e torna a separação "o que preciso decidir" vs "o que só preciso assinar" invisível.

## 2. Solução (proposta aprovada)

### 2.1 Reorganização por pastas de estado (ideia de Carolina Akiko)

Substituir os filtros por tipo por **abas de estado**:

| Aba | Status da MedicalRequest | Significado |
|---|---|---|
| **A visualizar** (`pending`) | `Submitted`, `InReview`, `Pending` | Pedidos que o médico precisa decidir |
| **Aprovados** (`ready-to-sign`) | `Paid` (aprovados, não assinados) | Fila de assinatura em lote |
| **Rejeitados** (`rejected`) | `Rejected` | Histórico de rejeições |
| **Assinados** (`signed`) | `Signed`, `Delivered` | Histórico + painel de produtividade |

O tipo de pedido (Receita/Exame/Consulta) vira **sub-filtro interno** (chips secundários dentro de cada aba), não mais navegação primária.

### 2.2 "Modo Foco" (fluxo sequencial guiado)

Dentro da aba "A visualizar", um CTA azul gigante pulsante "**Modo foco** — Revise N pedidos em sequência" abre uma tela cheia (`app/(doctor)/review-queue.tsx`) que mostra **um pedido por vez** com:

- Barra de progresso persistente ("4 de 12 · 3 aprovados · 1 rejeitado")
- Card do paciente com histórico clicável
- Detalhes da solicitação (medicamentos/exames)
- Análise da IA com risco (baixo/médio/alto)
- Botões fixos no rodapé: **Rejeitar** (vermelho, 80px) · **Pular** (cinza, 70px) · **Aprovar e próximo** (verde gradient, flex)
- Gestos opcionais (swipe → aprovar, swipe ← rejeitar) via Reanimated + Gesture Handler
- Toast de "Desfazer" (5s) após cada ação — **não bloqueante**, preserva momentum

### 2.3 Assinatura em lote

Na aba "Aprovados", um **banner gigante** com botão "**Assinar N documentos**" abre um **bottom sheet modal** com:

1. Lista dos documentos que serão assinados
2. Identificação do certificado ativo (nome, validade, AC)
3. **Um único campo de senha** do PFX
4. Checkbox de consentimento legal (MP 2.200-2/2001)
5. Botão "Assinar todos os N"

Após confirmar:

- **Tela de progresso** com anel circular animado ("Assinando 5 de 9...") e lista individual de status
- **Tela de sucesso** com métricas (total, tempo gasto, tempo economizado vs manual, taxa de sucesso)

### 2.4 Aba "Assinados" — painel de produtividade

Banner roxo/azul gradiente no topo com:
- Total do dia em destaque ("23 documentos")
- Comparação com média semanal
- Mini stats (tempo total, economia vs manual, número de lotes)

Abaixo: histórico agrupado por dia, cada item com tag de lote (`lote #3`) para rastreabilidade.

## 3. Backend

### 3.1 Bug atual (linha 99 de BatchSignatureService.cs)

```csharp
if (req.Status.ToString().ToLowerInvariant() != "approved") continue;
```

O enum real é `RequestStatus.Paid` após aprovação. Esse `if` filtra para `"approved"` (legacy), fazendo `GetApprovedRequestIdsAsync` retornar **zero itens**. **Fix:** aceitar `"paid"` ou `"approved"`.

### 3.2 TODO crítico (linhas 136–145)

O loop de `SignBatchAsync` apenas registra `"batch_signed"` no access log, sem assinar PDF de verdade. **Fix:** injetar `ISignatureService` no construtor e delegar:

```csharp
foreach (var requestId in requestIds) {
    try {
        // ... validação approved_for_signing (já existe) ...
        var signResult = await signatureService.SignAsync(
            new SignRequestDto {
                RequestId = requestId,
                PfxPassword = pfxPassword,
            },
            doctorUserId, ct);
        if (signResult.Success) { signedCount++; results.Add(new(requestId, true, null)); }
        else { failedCount++; results.Add(new(requestId, false, signResult.ErrorMessage)); }
    } catch (Exception ex) { /* log + add failure */ }
}
```

**Justificativa:** `SignatureService.SignAsync` já contém toda a lógica testada (gera PDF, valida cert, assina com BouncyCastle+iText7, persiste `MedicalRequest.Sign()`, audita, notifica paciente). Reimplementar seria duplicação perigosa.

### 3.3 Endpoint de conveniência

Adicionar `POST /api/batch-signature/{id}/review-and-approve` que internamente chama `MarkAsReviewedAsync` + `ApproveForSigningAsync` em uma chamada só. Mobile usa esse endpoint quando médico aprova no Modo Foco.

### 3.4 Hard cap

Configurável via `appsettings.json` (seção `BatchSignature:MaxItemsPerBatch`, default `50`). Rejeitado com `400 Bad Request` se exceder.

### 3.5 Falha parcial

Estratégia **"continua e reporta"**: se item 7 de 10 falhar, os outros 9 são assinados normalmente. O item 7 retorna em `BatchSignatureResult.Items` com `Success=false` e mensagem. Mobile exibe na tela de relatório e mantém o item na aba "Aprovados" para nova tentativa.

### 3.6 Testes

Criar `backend-dotnet/tests/RenoveJa.UnitTests/Application/Services/BatchSignatureServiceTests.cs` cobrindo:

- **Sucesso total** (3 itens aprovados → 3 assinados)
- **Falha parcial** (mock do `ISignatureService` retorna falha para 1 de 3)
- **Item não aprovado** (request sem log `approved_for_signing` → retorna failure sem assinar)
- **Hard cap excedido** (lote > 50)
- **Senha vazia** → falha antes de assinar qualquer item (fail-fast)

## 4. Mobile

### 4.1 Arquivos novos

| Arquivo | Responsabilidade |
|---|---|
| `frontend-mobile/lib/api-batch-signature.ts` | Cliente HTTP para os endpoints de lote |
| `frontend-mobile/lib/hooks/useBatchSignature.ts` | React Query hooks (queries + mutations) |
| `frontend-mobile/app/(doctor)/review-queue.tsx` | Tela "Modo Foco" (sequencial) |
| `frontend-mobile/components/doctor/batch/BatchSignModal.tsx` | Bottom sheet de assinatura |
| `frontend-mobile/components/doctor/batch/BatchSigningProgress.tsx` | Tela de progresso |
| `frontend-mobile/components/doctor/batch/BatchSignSuccess.tsx` | Relatório pós-assinatura |
| `frontend-mobile/components/doctor/batch/ProductivityBanner.tsx` | Card gradiente da aba "Assinados" |
| `frontend-mobile/components/doctor/batch/StatusTabs.tsx` | Tabs horizontais A visualizar/Aprovados/Rejeitados/Assinados |

### 4.2 Arquivos modificados

| Arquivo | Mudança |
|---|---|
| `frontend-mobile/app/(doctor)/requests.tsx` | Substituir filtros por tipo → abas de estado; adicionar CTA "Modo Foco" na aba "A visualizar"; banner "Assinar N" na aba "Aprovados"; painel de produtividade na aba "Assinados" |
| `frontend-mobile/app/_layout.tsx` | Registrar rota `review-queue` no stack |

### 4.3 Design system

- **Cores do doctor**: primary `#0EA5E9` (sky-500) já usado em `doctorDS`
- **Sucesso**: `#10B981` (emerald-500)
- **Perigo**: `#EF4444`
- **Produtividade**: gradient `#6D28D9 → #2563EB` (roxo → azul)
- Usar `useAppTheme({ role: 'doctor' })` em todos os componentes novos
- Ícones: `@expo/vector-icons` Ionicons (já é o padrão)
- Animações: `react-native-reanimated` v3 (já instalado)
- Gestos: `react-native-gesture-handler` (já instalado)

### 4.4 Atalhos / acessibilidade

- `VoiceOver`/`TalkBack`: todos os botões têm `accessibilityLabel` e `accessibilityState`
- Swipe no Modo Foco é **complemento** dos botões, não substituto
- Haptics: `haptics.light()` em navegação, `haptics.success()` em aprovação, `haptics.warning()` em rejeição

## 5. Compliance ICP-Brasil

- Cada item tem **três eventos auditáveis** distintos (`reviewed`, `approved_for_signing`, `batch_signed`) no `DocumentAccessLog`, preservando intenção individual antes da assinatura
- A senha do PFX é **transmitida via HTTPS**, desbloqueia o certificado em memória (dentro de `DigitalCertificateService.SignPdfAsync`), assina, e a chave privada é descartada ao final de cada item
- Consentimento explícito no modal ("Confirmo que revisei todos os N documentos e autorizo a assinatura digital...")
- `batchId` (GUID) é propagado em `AuditService.LogModificationAsync` para amarrar os itens do mesmo ato
- Aderente a **MP 2.200-2/2001** + **Resolução CFM 2.314/2022** + práticas de Adobe Sign / DocuSign / Clicksign

## 6. Verificação de qualidade

Antes de considerar feito:

- ✅ `dotnet build` sem erros em `backend-dotnet/`
- ✅ `dotnet test` passando (incluindo novos testes de `BatchSignatureServiceTests`)
- ✅ `npm run typecheck` sem erros em `frontend-mobile/`
- ✅ `npm run lint` com zero warnings em `frontend-mobile/`
- ✅ `npm test` passando (Jest)

## 7. Fora de escopo (YAGNI)

- **Rollback transacional** — falha parcial é aceita
- **Assinatura offline** — requer conexão
- **Retry automático** — o médico re-tenta manualmente no próximo lote
- **Assinatura paralela** (Promise.all no backend) — vai serial por simplicidade e rastreabilidade
- **Export CSV** da aba Assinados — adicionar quando alguém pedir
- **Web portal** (`frontend-web`) — este spec cobre apenas mobile; web continua com fluxo individual por enquanto

---

## Anexo: mockup visual

HTML de alta fidelidade com 8 telas em sequência:
**`C:\Users\Felipe\Downloads\renoveja-assinatura-lote-mockup.html`**
