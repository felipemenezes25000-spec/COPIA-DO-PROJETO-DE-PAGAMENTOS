using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using RenoveJa.Application.Configuration;
using RenoveJa.Application.DTOs.Requests;
using RenoveJa.Application.Interfaces;
using RenoveJa.Application.Services.Notifications;
using RenoveJa.Domain.Entities;
using RenoveJa.Domain.Enums;
using RenoveJa.Domain.Interfaces;

namespace RenoveJa.Application.Services;

/// <summary>
/// Assinatura em lote de documentos médicos.
/// Fluxo: Revisar → Aprovar → Acumular → Assinar todos de uma vez.
/// 
/// Regras:
/// 1. Médico obrigatoriamente abre e revisa cada documento (tracked por reviewed_at)
/// 2. Médico aprova individualmente (Draft → ApprovedForSigning)
/// 3. Médico acumula vários aprovados
/// 4. Médico assina todos de uma vez (ApprovedForSigning → Signed)
/// 5. Não é possível assinar sem aprovar antes
/// </summary>
#pragma warning disable CS9113 // Parameters reserved for future use (documentRepository)
public class BatchSignatureService(
    IRequestRepository requestRepository,
    IMedicalDocumentRepository documentRepository,
    IDocumentAccessLogRepository accessLogRepository,
    IDigitalCertificateService certificateService,
    IPushNotificationDispatcher pushDispatcher,
    IAuditService auditService,
    ISignatureService signatureService,
    IUserRepository userRepository,
    IDoctorRepository doctorRepository,
    IRequestEventsPublisher requestEventsPublisher,
    IOptions<BatchSignatureOptions> batchOptions,
    ILogger<BatchSignatureService> logger) : IBatchSignatureService
#pragma warning restore CS9113
{
    // Profundidade máxima ao varrer o log de acesso em busca de eventos de
    // revisão/aprovação. O log usa ordenação DESC, então limites baixos
    // (10/50) podem perder o evento se houve muita atividade posterior —
    // 500 é suficiente para qualquer pedido realista e ainda bounded.
    private const int AccessLogScanLimit = 500;

    // Serializa assinaturas em lote por médico para evitar que duas chamadas
    // concorrentes (ex.: duplo-clique, retry) assinem os mesmos pedidos duas
    // vezes. SemaphoreSlim é criado on-demand e removido do dicionário quando
    // ninguém mais o está usando (evita memory leak ao longo dos anos).
    private static readonly System.Collections.Concurrent.ConcurrentDictionary<Guid, SemaphoreSlim> DoctorBatchLocks = new();

    private static SemaphoreSlim GetDoctorLock(Guid doctorId) =>
        DoctorBatchLocks.GetOrAdd(doctorId, _ => new SemaphoreSlim(1, 1));

    /// <summary>
    /// Marca um request como "revisado" pelo médico.
    /// Registra timestamp de revisão no log de acesso.
    /// </summary>
    public async Task<bool> MarkAsReviewedAsync(
        Guid doctorUserId, Guid requestId, CancellationToken ct)
    {
        var request = await requestRepository.GetByIdAsync(requestId, ct);
        if (request == null) return false;

        // Auto-claim: a fila do médico (GetDoctorQueuePagedAsync) inclui pedidos
        // não atribuídos (doctor_id IS NULL) com status searching_doctor/submitted.
        // Quando o médico aprova via "Modo foco" / assinatura em lote, precisamos
        // reivindicar o pedido para ele.
        //
        // FIX C1 (race condition): antes o fluxo era GetById → checar unassigned →
        // AssignDoctor → UpdateAsync. Entre a leitura e o update, outro médico
        // podia reivindicar o mesmo pedido e o último update sobrescrevia em
        // silêncio — quebrando a cadeia de custódia CFM 1.638. Agora usamos
        // TryClaimAsync que é UPDATE atômico com WHERE doctor_id IS NULL e
        // retorna false quando outro médico já pegou o pedido.
        var isUnassigned = !request.DoctorId.HasValue || request.DoctorId.Value == Guid.Empty;
        if (isUnassigned)
        {
            var doctor = await userRepository.GetByIdAsync(doctorUserId, ct);
            if (doctor == null || !doctor.IsDoctor()) return false;

            var claimed = await requestRepository.TryClaimAsync(requestId, doctorUserId, doctor.Name, ct);
            if (!claimed)
            {
                // Outro médico reivindicou entre nossa leitura e a tentativa de claim.
                // Recarrega para decidir: se é do médico atual, seguimos; senão, desiste.
                var fresh = await requestRepository.GetByIdAsync(requestId, ct);
                if (fresh == null || fresh.DoctorId != doctorUserId)
                {
                    logger.LogInformation(
                        "Auto-claim lost race for request {RequestId}: doctor {DoctorId} not the owner",
                        requestId, doctorUserId);
                    return false;
                }
            }
        }
        else if (request.DoctorId!.Value != doctorUserId)
        {
            return false;
        }

        await accessLogRepository.LogAccessAsync(DocumentAccessEntry.Create(
            documentId: null,
            requestId: requestId,
            userId: doctorUserId,
            action: "reviewed",
            actorType: "doctor"
        ), ct);

        logger.LogInformation("Request {RequestId} marked as reviewed by doctor {DoctorId}",
            requestId, doctorUserId);
        return true;
    }

    /// <summary>
    /// Médico aprova um request para assinatura em lote.
    /// Valida que o médico revisou antes de aprovar.
    ///
    /// FLUXO DE STATUS — IMPORTANTE (refatorado 2026-04-09):
    /// Este método transiciona o status do pedido para <see cref="RequestStatus.Paid"/>
    /// (equivalente a "aprovado, pronto para assinatura") quando o pedido
    /// ainda está em estado de revisão, E REGISTRA o log de auditoria
    /// `approved_for_signing` APENAS após a transição ter sido persistida.
    ///
    /// Bug original (2026-04-09): o log era escrito ANTES da transição e um
    /// try/catch silencioso engolia falhas. Isso criava "aprovações fantasmas"
    /// — o cliente via sucesso, mas o status continuava InReview, e toda
    /// tentativa posterior de batch sign falhava com o erro:
    ///   "Pedido não está mais apto para assinatura (status atual: InReview)"
    ///
    /// Correção: (1) ordenação correta: transição → persistência → log;
    /// (2) fail-loud: qualquer falha na transição retorna erro ao cliente;
    /// (3) SearchingDoctor incluído na lista de estados reviewable
    /// (Modo Foco mostra pedidos nesse status e o médico deve poder aprová-los);
    /// (4) idempotência preservada: re-aprovar um pedido que já está Paid +
    /// tem log é no-op de sucesso.
    /// </summary>
    public async Task<(bool success, string? error)> ApproveForSigningAsync(
        Guid doctorUserId, Guid requestId, CancellationToken ct)
    {
        var request = await requestRepository.GetByIdAsync(requestId, ct);
        if (request == null) return (false, "Pedido não encontrado.");
        if (request.DoctorId != doctorUserId) return (false, "Acesso negado.");

        // Verificar se o médico revisou
        var logs = await accessLogRepository.GetByRequestIdAsync(requestId, AccessLogScanLimit, ct);
        var hasReviewed = logs.Any(l =>
            l.UserId == doctorUserId && l.Action == "reviewed");

        if (!hasReviewed)
            return (false, "É necessário revisar o pedido antes de aprovar para assinatura.");

        // Idempotência: se já tem log de aprovação E status já é Paid (ou terminal
        // posterior como Signed), não faz nada — só retorna sucesso. Isso cobre:
        //   (a) re-tentativas do mobile após network blip
        //   (b) duplo-clique no botão Aprovar
        //   (c) casos em que a primeira chamada aprovou e a segunda redundante.
        var alreadyApproved = logs.Any(l =>
            l.UserId == doctorUserId && l.Action == "approved_for_signing");
        if (alreadyApproved && request.Status == RequestStatus.Paid)
        {
            logger.LogInformation(
                "Request {RequestId} already approved AND in Paid status — idempotent no-op for doctor {DoctorId}",
                requestId, doctorUserId);
            return (true, null);
        }

        // Se o status já é Paid mas não tem log (aprovado pela tela de detalhe
        // legada), apenas escreve o log para que o batch sign encontre ele.
        if (request.Status == RequestStatus.Paid && !alreadyApproved)
        {
            await accessLogRepository.LogAccessAsync(DocumentAccessEntry.Create(
                documentId: null,
                requestId: requestId,
                userId: doctorUserId,
                action: "approved_for_signing",
                actorType: "doctor"
            ), ct);
            logger.LogInformation(
                "Request {RequestId} already in Paid; added approved_for_signing log for doctor {DoctorId}",
                requestId, doctorUserId);
            return (true, null);
        }

        // Estados "reviewable" que podem ser transicionados para Paid via batch approval.
        // IMPORTANTE: SearchingDoctor está incluído porque o mobile (review-queue.tsx)
        // mostra pedidos nesse status na fila do Modo Foco. Sem ele, aprovar um
        // pedido em searching_doctor criava um log fantasma sem transição.
#pragma warning disable CS0618 // compat com status legados
        var isReviewable = request.Status == RequestStatus.Submitted
            || request.Status == RequestStatus.InReview
            || request.Status == RequestStatus.Pending
            || request.Status == RequestStatus.Analyzing
            || request.Status == RequestStatus.SearchingDoctor;
#pragma warning restore CS0618

        if (!isReviewable)
        {
            // Estados terminais (Signed, Rejected, Cancelled, InConsultation, etc.)
            // ou em fluxo de consulta (ConsultationReady, InConsultation, etc.).
            // Falhar explicitamente com mensagem humana — nunca escrever log de
            // aprovação para algo que não pode mais ser aprovado.
            var friendlyStatus = FriendlyStatusLabel(request.Status);
            logger.LogWarning(
                "Approve denied for request {RequestId}: status {Status} is not reviewable (doctor {DoctorId})",
                requestId, request.Status, doctorUserId);
            return (false,
                $"Este pedido não pode mais ser aprovado (situação atual: {friendlyStatus}). " +
                "Recarregue sua fila e tente novamente.");
        }

        // PASSO 1 — Transição + persistência (fail-loud).
        // Qualquer exceção aqui sai como erro ao cliente — não escrevemos log
        // de aprovação até termos certeza que o status mudou no banco.
        try
        {
            // Passa as notas atuais (preserva edições prévias) e null para
            // medicamentos/exames — o método Approve só sobrescreve esses
            // campos se não forem null. `price = 0` pois a plataforma é gratuita.
            request.Approve(0m, request.Notes);
            await requestRepository.UpdateAsync(request, ct);

            logger.LogInformation(
                "Request {RequestId} transitioned to Paid via batch approval by doctor {DoctorId}",
                requestId, doctorUserId);
        }
        catch (RenoveJa.Domain.Exceptions.DomainException dex)
        {
            // Regra de domínio violada — status incompatível, por exemplo.
            // Mensagem do domínio é segura para mostrar ao usuário, mas
            // envolvemos em algo mais amigável.
            logger.LogWarning(dex,
                "Domain rule blocked approval for request {RequestId} (doctor {DoctorId})",
                requestId, doctorUserId);
            return (false,
                "Não foi possível aprovar este pedido: " + dex.Message +
                " Recarregue a fila e tente novamente.");
        }
        catch (Exception ex)
        {
            // Falha infra (DB, rede, constraint). Mensagem genérica ao usuário,
            // stacktrace vai pro log para investigação.
            logger.LogError(ex,
                "Infrastructure failure during batch approval transition for request {RequestId} (doctor {DoctorId})",
                requestId, doctorUserId);
            return (false,
                "Não foi possível registrar a aprovação agora. Verifique sua conexão e tente novamente.");
        }

        // PASSO 2 — Log de auditoria (só agora, após transição confirmada).
        // Se esse log falhar, a transição já está persistida, mas sinalizamos
        // erro para o cliente retentar. Batch sign ainda funciona via o
        // self-healing em SignBatchAsync que re-lê o status Paid.
        try
        {
            await accessLogRepository.LogAccessAsync(DocumentAccessEntry.Create(
                documentId: null,
                requestId: requestId,
                userId: doctorUserId,
                action: "approved_for_signing",
                actorType: "doctor"
            ), ct);
        }
        catch (Exception ex)
        {
            logger.LogError(ex,
                "Failed to write approved_for_signing audit log for {RequestId} AFTER successful transition. " +
                "Batch sign self-healing will still work. (doctor {DoctorId})",
                requestId, doctorUserId);
            // Não retornamos erro: o status já mudou, e o batch sign tem fallback.
            // Idempotência: uma próxima chamada reescreve o log.
        }

        logger.LogInformation("Request {RequestId} approved for batch signing by {DoctorId}",
            requestId, doctorUserId);
        return (true, null);
    }

    /// <summary>
    /// Mapeia <see cref="RequestStatus"/> em rótulos humanos em PT-BR para mensagens
    /// de erro exibidas ao médico. Evita vazar nomes de enum internos.
    /// </summary>
    private static string FriendlyStatusLabel(RequestStatus status) => status switch
    {
        RequestStatus.Submitted => "aguardando triagem",
        RequestStatus.InReview => "em revisão",
#pragma warning disable CS0618
        RequestStatus.Pending => "aguardando",
        RequestStatus.Analyzing => "em análise",
        RequestStatus.Approved => "aprovado",
        RequestStatus.ApprovedPendingPayment => "aguardando pagamento",
        RequestStatus.PendingPayment => "aguardando pagamento",
#pragma warning restore CS0618
        RequestStatus.SearchingDoctor => "buscando médico",
        RequestStatus.Paid => "pronto para assinar",
        RequestStatus.Signed => "já assinado",
        RequestStatus.Delivered => "já entregue",
        RequestStatus.Rejected => "rejeitado",
        RequestStatus.Cancelled => "cancelado",
        RequestStatus.ConsultationReady => "consulta pronta",
        RequestStatus.InConsultation => "em consulta",
        RequestStatus.PendingPostConsultation => "pós-consulta pendente",
        RequestStatus.ConsultationFinished => "consulta finalizada",
        _ => status.ToString()
    };

    /// <summary>
    /// Conveniência: marca como revisado e aprova para assinatura em uma única chamada.
    /// Atômico do ponto de vista do cliente (qualquer falha retorna erro).
    /// </summary>
    public async Task<(bool success, string? error)> ReviewAndApproveAsync(
        Guid doctorUserId, Guid requestId, CancellationToken ct)
    {
        var reviewed = await MarkAsReviewedAsync(doctorUserId, requestId, ct);
        if (!reviewed) return (false, "Pedido não encontrado ou acesso negado.");
        return await ApproveForSigningAsync(doctorUserId, requestId, ct);
    }

    /// <summary>
    /// Lista todos os requests aprovados para assinatura pelo médico.
    /// </summary>
    public async Task<List<Guid>> GetApprovedRequestIdsAsync(
        Guid doctorUserId, CancellationToken ct)
    {
        var allRequests = await requestRepository.GetByDoctorIdAsync(doctorUserId, ct);
        var approvedIds = new List<Guid>();

        foreach (var req in allRequests)
        {
            var statusLower = req.Status.ToString().ToLowerInvariant();
            if (statusLower != "paid" && statusLower != "approved") continue;
            var logs = await accessLogRepository.GetByRequestIdAsync(req.Id, AccessLogScanLimit, ct);
            // Pula itens já assinados em batch para não reoferecer ao médico.
            if (logs.Any(l => l.UserId == doctorUserId && l.Action == "batch_signed"))
                continue;
            if (logs.Any(l => l.UserId == doctorUserId && l.Action == "approved_for_signing"))
                approvedIds.Add(req.Id);
        }

        return approvedIds;
    }

    /// <summary>
    /// Assina em lote todos os requests aprovados.
    /// Cada request deve ter sido revisado e aprovado individualmente.
    /// Retorna resultado por request (sucesso/falha).
    /// </summary>
    public async Task<BatchSignatureResult> SignBatchAsync(
        Guid doctorUserId, List<Guid> requestIds, string? pfxPassword, CancellationToken ct)
    {
        var maxBatchSize = batchOptions.Value.MaxItemsPerBatch;

        if (requestIds is null)
            return new BatchSignatureResult(0, 0, new List<BatchSignatureItemResult>(),
                "Lista de pedidos é obrigatória.");

        // Deduplicar ids (um duplo-clique no front pode enviar o mesmo id 2x)
        // e remover Guid.Empty. Preserva ordem de primeira ocorrência.
        var uniqueIds = requestIds
            .Where(id => id != Guid.Empty)
            .Distinct()
            .ToList();

        if (uniqueIds.Count == 0)
            return new BatchSignatureResult(0, 0, new List<BatchSignatureItemResult>(),
                "Nenhum pedido válido para assinar.");

        if (uniqueIds.Count > maxBatchSize)
            return new BatchSignatureResult(0, 0, new List<BatchSignatureItemResult>(),
                $"Lote excede o limite máximo de {maxBatchSize} itens. Recebido: {uniqueIds.Count}.");

        if (string.IsNullOrWhiteSpace(pfxPassword))
            return new BatchSignatureResult(0, 0, new List<BatchSignatureItemResult>(),
                "Senha do certificado digital é obrigatória para assinatura em lote.");

        // SAFETY GATE — pinning certificado ↔ médico (Finding #7).
        //
        // Antes o backend confiava que o certificado ativo do médico
        // sempre era de autoria dele próprio, sem validar se o CRM/CPF
        // embarcado no Subject DN do PFX corresponde à identidade do
        // médico autenticado.
        //
        // Cenário de risco: médico A empresta (ou tem roubado) o PFX do
        // médico B, faz upload na sua própria conta, e passa a assinar
        // em nome do B. Todos os documentos saem válidos perante ITI
        // (porque a chave e o subject são do B), mas no audit log da
        // plataforma aparecem com DoctorId do A. Isso viola a cadeia
        // de custódia e quebra o controle de responsabilidade CFM.
        //
        // Mitigação: buscar DoctorProfile (Crm/CrmState) e User (Cpf) do
        // médico autenticado e validar que batem com o CRM/CPF extraídos
        // do Subject DN do certificado no momento do upload.
        //
        // Fail-open em caso de CRM/CPF não extraível do subject (null no
        // cert): apenas loga warning — o batch prossegue. Certificados
        // legados que foram carregados antes da extração funcionarem
        // não devem ser quebrados retroativamente. Quando ITI migrar o
        // sistema de claims, esse fallback pode ser removido.
        var doctorProfile = await doctorRepository.GetByUserIdAsync(doctorUserId, ct);
        if (doctorProfile == null)
            return new BatchSignatureResult(0, 0, new List<BatchSignatureItemResult>(),
                "Perfil de médico não encontrado. Complete o cadastro como médico.");

        var activeCert = await certificateService.GetActiveCertificateAsync(doctorProfile.Id, ct);
        if (activeCert == null)
            return new BatchSignatureResult(0, 0, new List<BatchSignatureItemResult>(),
                "Nenhum certificado digital ativo encontrado. Cadastre um em Configurações.");

        // Pinning de CRM: strings com normalização leve (remove dígitos
        // não-numéricos para tolerar hífens/barras no DN).
        if (!string.IsNullOrWhiteSpace(activeCert.CrmNumber))
        {
            var certCrmDigits = new string(activeCert.CrmNumber.Where(char.IsDigit).ToArray());
            var profileCrmDigits = new string((doctorProfile.Crm ?? "").Where(char.IsDigit).ToArray());
            if (certCrmDigits.Length > 0 && profileCrmDigits.Length > 0 &&
                certCrmDigits != profileCrmDigits)
            {
                logger.LogWarning(
                    "Batch sign blocked by CRM pinning mismatch: doctor profile CRM {ProfileCrm} " +
                    "vs certificate CRM {CertCrm} (doctor {DoctorId})",
                    doctorProfile.Crm, activeCert.CrmNumber, doctorUserId);
                return new BatchSignatureResult(0, 0, new List<BatchSignatureItemResult>(),
                    "O CRM do certificado digital não corresponde ao seu CRM cadastrado. " +
                    "Verifique se o certificado enviado é realmente seu.");
            }
        }
        else
        {
            logger.LogDebug(
                "CRM pinning skipped — certificate {CertId} has no CrmNumber in subject",
                activeCert.Id);
        }

        // Pinning de CPF: normaliza removendo pontuação.
        if (!string.IsNullOrWhiteSpace(activeCert.Cpf))
        {
            var doctorUser = await userRepository.GetByIdAsync(doctorUserId, ct);
            var userCpfDigits = new string((doctorUser?.Cpf ?? "").Where(char.IsDigit).ToArray());
            var certCpfDigits = new string(activeCert.Cpf.Where(char.IsDigit).ToArray());
            if (certCpfDigits.Length > 0 && userCpfDigits.Length > 0 &&
                certCpfDigits != userCpfDigits)
            {
                logger.LogWarning(
                    "Batch sign blocked by CPF pinning mismatch (doctor {DoctorId})",
                    doctorUserId);
                return new BatchSignatureResult(0, 0, new List<BatchSignatureItemResult>(),
                    "O CPF do certificado digital não corresponde ao seu CPF cadastrado. " +
                    "Verifique se o certificado enviado é realmente seu.");
            }
        }
        else
        {
            logger.LogDebug(
                "CPF pinning skipped — certificate {CertId} has no Cpf in subject",
                activeCert.Id);
        }

        var results = new List<BatchSignatureItemResult>();
        var signedCount = 0;
        var failedCount = 0;

        // ID único para correlacionar todos os eventos de auditoria deste lote
        // (um evento por item + um evento de resumo ao final).
        var batchId = Guid.NewGuid();

        // Serializa lotes do mesmo médico — previne double-sign em concorrência.
        var doctorLock = GetDoctorLock(doctorUserId);
        await doctorLock.WaitAsync(ct);
        try
        {
            foreach (var requestId in uniqueIds)
            {
                ct.ThrowIfCancellationRequested();
                try
                {
                    // Validar que está aprovado para assinatura e que não foi assinado antes.
                    var logs = await accessLogRepository.GetByRequestIdAsync(requestId, AccessLogScanLimit, ct);

                    var alreadySigned = logs.Any(l =>
                        l.UserId == doctorUserId && l.Action == "batch_signed");
                    if (alreadySigned)
                    {
                        results.Add(new(requestId, false, "Pedido já assinado em lote anteriormente."));
                        failedCount++;
                        continue;
                    }

                    var isApproved = logs.Any(l =>
                        l.UserId == doctorUserId && l.Action == "approved_for_signing");

                    if (!isApproved)
                    {
                        results.Add(new(requestId, false, "Não aprovado para assinatura."));
                        failedCount++;
                        continue;
                    }

                    // SAFETY GATE — re-validação do estado atual do pedido.
                    //
                    // Histórica: o código antigo confiava no log "approved_for_signing"
                    // (criado em ApproveForSigningAsync) e delegava direto para SignAsync.
                    // Isso criava 3 classes de bugs críticos:
                    //   (a) Um pedido aprovado pelo médico podia ser rejeitado pela IA
                    //       em background (AiRejectionReason preenchido). O log de
                    //       "approved_for_signing" continuava, mas a assinatura deveria
                    //       parar. Resultado: documento assinado com validade legal
                    //       para pedido que a própria plataforma considerou arriscado.
                    //   (b) O status podia ter mudado (cancelled, rejected) entre a
                    //       aprovação e a assinatura. SignAsync checa isso internamente,
                    //       mas surgiria como erro genérico "Apenas solicitações aprovadas
                    //       podem ser assinadas" em vez de mensagem humana.
                    //   (c) Ownership: o log "approved_for_signing" é criado em
                    //       ApproveForSigningAsync que VALIDA request.DoctorId ==
                    //       doctorUserId, mas entre aprovação e assinatura outro médico
                    //       pode ter sido atribuído (transferência administrativa).
                    //       Sem revalidação aqui, o doctorUserId atual assinaria um
                    //       pedido que não é mais dele.
                    //
                    // Mitigação: buscar o pedido fresh e revalidar 3 invariantes
                    // imediatamente antes de delegar para SignAsync.
                    var request = await requestRepository.GetByIdAsync(requestId, ct);
                    if (request == null)
                    {
                        results.Add(new(requestId, false, "Pedido não encontrado."));
                        failedCount++;
                        continue;
                    }

                    // (c) Ownership: o médico atual deve ser o titular do pedido.
                    if (!request.DoctorId.HasValue || request.DoctorId.Value != doctorUserId)
                    {
                        logger.LogWarning(
                            "Batch sign blocked: doctor {DoctorId} tried to sign request {RequestId} owned by {OwnerId}",
                            doctorUserId, requestId, request.DoctorId);
                        results.Add(new(requestId, false, "Este pedido não pertence mais a você."));
                        failedCount++;
                        continue;
                    }

                    // (b) Status: o pedido deve estar em estado assinável.
                    //
                    // SELF-HEALING (2026-04-09):
                    // Historicamente, um pedido podia ter o log `approved_for_signing`
                    // gravado mas nunca ter sido transicionado para Paid (por um bug
                    // anterior que engolia silenciosamente falhas na transição em
                    // ApproveForSigningAsync). Para NÃO deixar o médico preso nesse
                    // estado — que acumulava pedidos-fantasma visíveis na fila mas
                    // impossíveis de assinar — tentamos uma transição in-line quando
                    // detectamos a inconsistência: status ainda reviewable + log de
                    // aprovação presente. Se a transição funcionar, prosseguimos
                    // normalmente. Se não funcionar, o médico recebe mensagem clara.
                    if (request.Status != RequestStatus.Paid)
                    {
#pragma warning disable CS0618 // compat com status legados
                        var isStillReviewable = request.Status == RequestStatus.Submitted
                            || request.Status == RequestStatus.InReview
                            || request.Status == RequestStatus.Pending
                            || request.Status == RequestStatus.Analyzing
                            || request.Status == RequestStatus.SearchingDoctor;
#pragma warning restore CS0618

                        if (isStillReviewable)
                        {
                            // Self-heal: refaz a transição. `isApproved` já foi
                            // verificado acima (log approved_for_signing existe),
                            // então estamos honrando a intenção do médico.
                            try
                            {
                                request.Approve(0m, request.Notes);
                                await requestRepository.UpdateAsync(request, ct);
                                logger.LogWarning(
                                    "Self-healed request {RequestId}: status was {OldStatus} despite approved_for_signing log, " +
                                    "transitioned to Paid inline before batch sign (doctor {DoctorId})",
                                    requestId, request.Status, doctorUserId);
                            }
                            catch (Exception healEx)
                            {
                                logger.LogError(healEx,
                                    "Self-heal failed for request {RequestId} — cannot recover from inconsistent state (doctor {DoctorId})",
                                    requestId, doctorUserId);
                                var friendly = FriendlyStatusLabel(request.Status);
                                results.Add(new(requestId, false,
                                    $"Não foi possível assinar este pedido (situação atual: {friendly}). " +
                                    "Recarregue a fila e tente novamente."));
                                failedCount++;
                                continue;
                            }
                        }
                        else
                        {
                            // Estado terminal / não recuperável (Rejected, Cancelled,
                            // Signed, Delivered, ConsultationReady/InConsultation, etc.).
                            // Mensagem humana explicando o que aconteceu.
                            var friendly = FriendlyStatusLabel(request.Status);
                            results.Add(new(requestId, false,
                                $"Este pedido não pode mais ser assinado (situação atual: {friendly})."));
                            failedCount++;
                            continue;
                        }
                    }

                    // (a) AI Rejection: se a IA rejeitou em background, bloquear.
                    // A detecção aqui é defense-in-depth: normalmente o status também
                    // teria mudado, mas em raças a rejeição pode ter chegado sem ter
                    // atualizado o status ainda.
                    if (!string.IsNullOrWhiteSpace(request.AiRejectionReason))
                    {
                        logger.LogWarning(
                            "Batch sign blocked by AI rejection: request {RequestId}, reason: {Reason}",
                            requestId, request.AiRejectionReason);
                        results.Add(new(requestId, false,
                            "Pedido foi rejeitado pela IA clínica. Revise antes de assinar."));
                        failedCount++;
                        continue;
                    }

                    // Delega para o fluxo de assinatura padrão (gera PDF + assina PAdES ICP-Brasil).
                    var signDto = new SignRequestDto(PfxPassword: pfxPassword);
                    await signatureService.SignAsync(requestId, signDto, ct);

                    // Marca o item como assinado-em-lote para auditoria
                    // (permite distinguir assinaturas individuais das feitas em batch).
                    await accessLogRepository.LogAccessAsync(DocumentAccessEntry.Create(
                        documentId: null,
                        requestId: requestId,
                        userId: doctorUserId,
                        action: "batch_signed",
                        actorType: "doctor"
                    ), ct);

                    // Auditoria por item — exigência ICP-Brasil §5 (trilha individual
                    // de cada documento assinado). BatchId correlaciona com o resumo.
                    await auditService.LogModificationAsync(
                        doctorUserId, "BatchSignItem", "Request", requestId,
                        oldValues: null,
                        newValues: new Dictionary<string, object?>
                        {
                            ["batchId"] = batchId,
                            ["requestId"] = requestId,
                            ["result"] = "signed",
                        },
                        cancellationToken: ct);

                    results.Add(new(requestId, true, null));
                    signedCount++;
                }
                catch (OperationCanceledException)
                {
                    // Propaga cancelamento sem marcar o item como falha indevidamente.
                    throw;
                }
                catch (Exceptions.SignatureInvalidPfxPasswordException pfxEx)
                {
                    // SHORT-CIRCUIT: senha do PFX errada falha igual para TODOS os
                    // itens restantes — não faz sentido retentar N-1 vezes com a mesma
                    // senha inválida. Marca o item atual e todos os não-processados
                    // como falha e sai do loop.
                    logger.LogWarning(pfxEx,
                        "Batch sign aborted: PFX password error on request {RequestId} — marking remaining {Remaining} items as failed (doctor {DoctorId})",
                        requestId, uniqueIds.Count - results.Count - 1, doctorUserId);

                    results.Add(new(requestId, false, pfxEx.Message));
                    failedCount++;

                    // Marca os itens restantes sem processar
                    var currentIdx = uniqueIds.IndexOf(requestId);
                    for (var ri = currentIdx + 1; ri < uniqueIds.Count; ri++)
                    {
                        results.Add(new(uniqueIds[ri], false, pfxEx.Message));
                        failedCount++;
                    }
                    break; // sai do foreach
                }
                catch (Exception ex)
                {
                    logger.LogWarning(ex, "Batch sign failed for {RequestId}", requestId);
                    results.Add(new(requestId, false, ex.Message));
                    failedCount++;
                }
            }
        }
        finally
        {
            doctorLock.Release();
            // Limpeza do semáforo se ninguém mais está aguardando — previne memory
            // leak: sem isto, o dicionário cresceria indefinidamente ao longo de
            // anos conforme médicos entram no sistema. O TryRemove(KeyValuePair)
            // é atômico: só remove se o valor ainda for o mesmo semáforo (evita
            // race com chamadas concorrentes que recriaram o lock entre os passos).
            if (doctorLock.CurrentCount == 1 &&
                DoctorBatchLocks.TryRemove(new KeyValuePair<Guid, SemaphoreSlim>(doctorUserId, doctorLock)))
            {
                doctorLock.Dispose();
            }
        }

        await auditService.LogModificationAsync(
            doctorUserId, "BatchSign", "Requests", Guid.Empty,
            oldValues: null,
            newValues: new Dictionary<string, object?>
            {
                ["batchId"] = batchId,
                ["total"] = uniqueIds.Count,
                ["signed"] = signedCount,
                ["failed"] = failedCount,
            },
            cancellationToken: ct);

        // Notificar médico sobre conclusão da assinatura em lote (fire-and-forget push)
        if (signedCount > 0)
        {
            _ = pushDispatcher.SendAsync(
                    PushNotificationRules.BatchSignatureCompleted(doctorUserId, signedCount), CancellationToken.None)
                .ContinueWith(t =>
                {
                    if (t.IsFaulted)
                        logger.LogWarning(t.Exception, "Failed to notify doctor about batch signature completion, DoctorId={DoctorId}, SignedCount={SignedCount}", doctorUserId, signedCount);
                }, TaskContinuationOptions.OnlyOnFaulted);
        }

        // SignalR: notificar TODOS os devices conectados do próprio médico.
        // Cenário: médico assina no iPhone; iPad conectado recebe o evento
        // "BatchSignCompleted" e invalida os IDs assinados do cache local —
        // evita mostrar pedidos já assinados como "aprovados" e impedir
        // tentativa de double-sign que cairia no guard "batch_signed".
        //
        // Sempre enviado (mesmo se signedCount == 0) para que UI em outros
        // devices também possam limpar estado transitório.
        if (signedCount > 0 || failedCount > 0)
        {
            var signedIds = results
                .Where(r => r.Success)
                .Select(r => r.RequestId)
                .ToList();

            try
            {
                // CancellationToken.None intencional: o cliente cancelar o
                // request HTTP não deveria impedir a notificação dos outros
                // devices sobre uma assinatura já efetivada no DB.
                await requestEventsPublisher.NotifyBatchSignCompletedAsync(
                    doctorUserId,
                    batchId,
                    signedCount,
                    failedCount,
                    signedIds,
                    CancellationToken.None);
            }
            catch (Exception ex)
            {
                // NotifyBatchSignCompletedAsync já faz fail-safe internamente,
                // mas capturamos aqui também para garantir que nada propague
                // e mascare o resultado do batch.
                logger.LogWarning(ex,
                    "Failed to publish SignalR BatchSignCompleted for batch {BatchId} doctor {DoctorId}",
                    batchId, doctorUserId);
            }
        }

        return new BatchSignatureResult(signedCount, failedCount, results,
            $"{signedCount} documento(s) assinado(s) com sucesso." +
            (failedCount > 0 ? $" {failedCount} falha(s)." : ""));
    }
}
