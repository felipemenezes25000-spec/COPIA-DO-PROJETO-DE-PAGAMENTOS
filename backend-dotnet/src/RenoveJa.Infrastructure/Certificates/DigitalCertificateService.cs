using System.Security.Cryptography;
using System.Security.Cryptography.X509Certificates;
using System.Text;
using iText.Kernel.Pdf;
using iText.Signatures;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using iText.Bouncycastle.Crypto;
using iText.Bouncycastle.X509;
using Org.BouncyCastle.Crypto;
using Org.BouncyCastle.Crypto.Parameters;
using Org.BouncyCastle.Pkcs;
using Org.BouncyCastle.X509;
using RenoveJa.Application.Configuration;
using RenoveJa.Application.Interfaces;
using RenoveJa.Domain.Entities;
using RenoveJa.Domain.Interfaces;
using X509Certificate = Org.BouncyCastle.X509.X509Certificate;

namespace RenoveJa.Infrastructure.Certificates;

/// <summary>
/// Implementação do serviço de certificados digitais ICP-Brasil.
/// Usa X509Certificate2 para validação e iText7 para assinatura de PDFs.
/// </summary>
public class DigitalCertificateService : IDigitalCertificateService
{
    private readonly ICertificateRepository _certificateRepository;
    private readonly IDoctorRepository _doctorRepository;
    private readonly IStorageService _storageService;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly ILogger<DigitalCertificateService> _logger;
    private readonly byte[] _encryptionKey;

    public DigitalCertificateService(
        ICertificateRepository certificateRepository,
        IDoctorRepository doctorRepository,
        IStorageService storageService,
        IHttpClientFactory httpClientFactory,
        IOptions<CertificateEncryptionConfig> encryptionConfig,
        ILogger<DigitalCertificateService> logger)
    {
        _certificateRepository = certificateRepository;
        _doctorRepository = doctorRepository;
        _storageService = storageService;
        _httpClientFactory = httpClientFactory;
        _logger = logger;
        _encryptionKey = Convert.FromBase64String(encryptionConfig.Value.Key);

        if (_encryptionKey.Length != 32)
            throw new InvalidOperationException("CertificateEncryption:Key must be a 32-byte (256-bit) base64-encoded key.");
    }

    public Task<CertificateValidationResult> ValidatePfxAsync(
        byte[] pfxBytes,
        string password,
        CancellationToken cancellationToken = default)
    {
        try
        {
            // Carrega o certificado PFX
            using var certificate = new X509Certificate2(pfxBytes, password, X509KeyStorageFlags.Exportable);
            
            // Verifica se tem chave privada
            if (!certificate.HasPrivateKey)
            {
                return Task.FromResult(new CertificateValidationResult(
                    false,
                    "Certificado não possui chave privada. O arquivo PFX deve conter a chave privada para assinatura.",
                    null, null, null, null, null, null, null, false, false));
            }

            var now = DateTime.UtcNow;
            var isExpired = certificate.NotAfter < now;
            var isNotYetValid = certificate.NotBefore > now;

            // Extrai informações do certificado
            var subjectName = certificate.Subject;
            var issuerName = certificate.Issuer;
            var serialNumber = certificate.SerialNumber;
            var notBefore = certificate.NotBefore.ToUniversalTime();
            var notAfter = certificate.NotAfter.ToUniversalTime();

            // Tenta extrair CPF e CRM do subject
            var cpf = ExtractCpfFromSubject(subjectName);
            var crmNumber = ExtractCrmFromSubject(subjectName);

            // Verifica se é ICP-Brasil
            var isIcpBrasil = IsIcpBrasilCertificate(certificate);

            // Validações
            var errors = new List<string>();

            if (isExpired)
                errors.Add("Certificado expirado.");

            if (isNotYetValid)
                errors.Add("Certificado ainda não é válido.");

            if (!isIcpBrasil)
                errors.Add("Certificado não é ICP-Brasil. Apenas certificados ICP-Brasil são aceitos.");

            // Verifica se a chave pode ser usada para assinatura
            var keyUsage = certificate.Extensions.OfType<X509KeyUsageExtension>().FirstOrDefault();
            if (keyUsage != null && !keyUsage.KeyUsages.HasFlag(X509KeyUsageFlags.DigitalSignature))
            {
                errors.Add("Certificado não permite uso para assinatura digital.");
            }

            // Validação de cadeia / revogação best-effort.
            // Para certificados ICP-Brasil, a raiz não está nativamente nos trust stores do SO, então
            // nós logamos o resultado mas não bloqueamos a validação aqui (o validar.iti.gov.br fará a
            // verificação canônica no momento da assinatura). Ainda assim tentamos CRL online para
            // detectar certificados explicitamente revogados.
            try
            {
                using var chain = new X509Chain
                {
                    ChainPolicy =
                    {
                        RevocationMode = X509RevocationMode.Online,
                        RevocationFlag = X509RevocationFlag.ExcludeRoot,
                        UrlRetrievalTimeout = TimeSpan.FromSeconds(10),
                        VerificationFlags = X509VerificationFlags.AllowUnknownCertificateAuthority
                    }
                };
                chain.Build(certificate);
                foreach (var status in chain.ChainStatus)
                {
                    if (status.Status.HasFlag(X509ChainStatusFlags.Revoked))
                        errors.Add("Certificado revogado pela autoridade emissora.");
                }
            }
            catch (Exception chainEx)
            {
                _logger.LogDebug(chainEx, "Falha ao validar cadeia/CRL do certificado (não bloqueante).");
            }

            return Task.FromResult(new CertificateValidationResult(
                errors.Count == 0,
                errors.Count > 0 ? string.Join(" ", errors) : null,
                subjectName,
                issuerName,
                serialNumber,
                notBefore,
                notAfter,
                cpf,
                crmNumber,
                isExpired,
                isIcpBrasil));
        }
        catch (CryptographicException ex)
        {
            _logger.LogWarning(ex, "Erro ao validar certificado PFX");
            return Task.FromResult(new CertificateValidationResult(
                false,
                "Senha incorreta ou arquivo PFX inválido.",
                null, null, null, null, null, null, null, false, false));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Erro inesperado ao validar certificado");
            return Task.FromResult(new CertificateValidationResult(
                false,
                $"Erro ao validar certificado: {ex.Message}",
                null, null, null, null, null, null, null, false, false));
        }
    }

    public async Task<(Guid CertificateId, CertificateValidationResult Validation)> UploadAndValidateAsync(
        Guid doctorProfileId,
        byte[] pfxBytes,
        string password,
        string fileName,
        CancellationToken cancellationToken = default)
    {
        // Valida primeiro
        var validation = await ValidatePfxAsync(pfxBytes, password, cancellationToken);
        
        if (!validation.IsValid)
        {
            return (Guid.Empty, validation);
        }

        // Verifica se o médico existe
        var doctor = await _doctorRepository.GetByIdAsync(doctorProfileId, cancellationToken);
        if (doctor == null)
        {
            return (Guid.Empty, new CertificateValidationResult(
                false,
                "Médico não encontrado.",
                null, null, null, null, null, null, null, false, false));
        }

        // Criptografa o PFX antes de armazenar
        var encryptedPfx = EncryptPfx(pfxBytes, password);

        // Faz upload do PFX criptografado para o storage (estrutura: usuarios/{id}/certificados/{guid}.pfx.enc)
        var storagePath = RenoveJa.Application.Helpers.StoragePaths.CertificadoDigital(doctorProfileId);
        var uploadResult = await _storageService.UploadAsync(
            storagePath,
            encryptedPfx,
            "application/octet-stream",
            cancellationToken);

        if (!uploadResult.Success)
        {
            return (Guid.Empty, new CertificateValidationResult(
                false,
                "Erro ao armazenar certificado.",
                null, null, null, null, null, null, null, false, false));
        }

        // Cria a entidade de certificado
        var certificate = DoctorCertificate.Create(
            doctorProfileId,
            validation.SubjectName!,
            validation.IssuerName!,
            validation.SerialNumber!,
            validation.NotBefore!.Value,
            validation.NotAfter!.Value,
            storagePath,
            fileName,
            validation.Cpf,
            validation.CrmNumber);

        certificate.MarkAsValidatedAtRegistration(validation.IsIcpBrasil ? "ICP-Brasil validado" : "Validado");

        // Salva no repositório
        certificate = await _certificateRepository.CreateAsync(certificate, cancellationToken);

        // Atualiza o médico com a referência ao certificado ativo
        doctor.SetActiveCertificate(certificate.Id);
        await _doctorRepository.UpdateAsync(doctor, cancellationToken);

        _logger.LogInformation("Certificado {CertificateId} registrado para médico {DoctorId}", 
            certificate.Id, doctorProfileId);

        return (certificate.Id, validation);
    }

    public async Task<DigitalSignatureResult> SignPdfAsync(
        Guid certificateId,
        byte[] pdfBytes,
        string storagePath,
        string? pfxPassword = null,
        string? documentTypeHint = null,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var certificate = await _certificateRepository.GetByIdAsync(certificateId, cancellationToken);
            if (certificate == null)
            {
                return new DigitalSignatureResult(false, "Certificado não encontrado.", null, null, null, null);
            }

            if (!certificate.IsReadyForSigning())
            {
                return new DigitalSignatureResult(false, "Certificado não está pronto para assinatura.", null, null, null, null);
            }

            // Baixa o PFX criptografado do storage
            var encryptedPfxData = await _storageService.DownloadAsync(certificate.PfxStoragePath, cancellationToken);
            if (encryptedPfxData == null)
            {
                return new DigitalSignatureResult(false, "Arquivo do certificado não encontrado no storage.", null, null, null, null);
            }

            // Descriptografa o PFX (extrai bytes e senha armazenada)
            var (pfxBytes, storedPassword) = DecryptPfxFull(encryptedPfxData);
            var userPassword = (pfxPassword ?? "").Trim();
            if (string.IsNullOrWhiteSpace(storedPassword) && string.IsNullOrWhiteSpace(userPassword))
            {
                return new DigitalSignatureResult(false, "Senha do certificado PFX é obrigatória para assinar. Envie PfxPassword no corpo da requisição.", null, null, null, null);
            }

            // Segurança: se o médico informou senha nesta requisição, usa SOMENTE ela — não fazer fallback para a senha
            // embutida no armazenamento (senão qualquer digitação "falha" e a assinatura ainda conclui com a senha gravada).
            // Fluxos legados sem senha no body (ex.: alguns caminhos internos) ainda podem usar storedPassword.
            byte[]? signedPdfBytes = null;
            if (!string.IsNullOrWhiteSpace(userPassword))
            {
                try
                {
                    signedPdfBytes = SignPdfWithBouncyCastle(pfxBytes, userPassword, pdfBytes, certificate, documentTypeHint);
                }
                catch (Exception ex)
                {
                    // Elevado de LogDebug para LogWarning: falhas de assinatura
                    // são eventos relevantes para auditoria/troubleshooting e
                    // precisam aparecer nos logs de produção sem exigir
                    // mudança de verbosity level. Debug era efetivamente
                    // silencioso em ambiente Information default.
                    _logger.LogWarning(ex,
                        "Assinatura com senha informada falhou: cert={CertificateId} type={DocumentType}",
                        certificate.Id, documentTypeHint ?? "prescription");
                }

                if (signedPdfBytes == null)
                {
                    return new DigitalSignatureResult(false, "Senha do certificado inválida. Informe a senha do arquivo PFX (A1).", null, null, null, null);
                }
            }
            else if (!string.IsNullOrWhiteSpace(storedPassword))
            {
                try
                {
                    signedPdfBytes = SignPdfWithBouncyCastle(pfxBytes, storedPassword, pdfBytes, certificate, documentTypeHint);
                }
                catch (Exception ex)
                {
                    // Mesmo motivo do branch anterior: falhas de assinatura
                    // merecem ser visíveis em LogWarning para auditoria.
                    _logger.LogWarning(ex,
                        "Assinatura com senha armazenada falhou: cert={CertificateId} type={DocumentType}",
                        certificate.Id, documentTypeHint ?? "prescription");
                }

                if (signedPdfBytes == null)
                {
                    return new DigitalSignatureResult(false, "Senha do certificado inválida. Use a mesma senha configurada no upload do certificado.", null, null, null, null);
                }
            }
            else
            {
                return new DigitalSignatureResult(false, "Senha do certificado PFX é obrigatória para assinar.", null, null, null, null);
            }

            // Hash SHA256 do PDF assinado (prova de integridade para auditoria)
            var pdfHash = Convert.ToHexString(System.Security.Cryptography.SHA256.HashData(signedPdfBytes)).ToLowerInvariant();

            // Upload do PDF assinado (storagePath já é o path completo, ex.: pedidos/{requestId}/receita/assinado/receita-{requestId}.pdf)
            var signedPath = storagePath?.Trim() ?? $"signed/{Guid.NewGuid():N}.pdf";
            var uploadResult = await _storageService.UploadAsync(
                signedPath,
                signedPdfBytes,
                "application/pdf",
                cancellationToken);

            if (!uploadResult.Success)
            {
                return new DigitalSignatureResult(false, "Erro ao armazenar PDF assinado.", null, null, null, null);
            }

            var signedAt = DateTime.UtcNow;
            var signatureId = $"SIG-{Guid.NewGuid():N}";

            _logger.LogInformation("PDF assinado com certificado {CertificateId}: {SignatureId}", 
                certificateId, signatureId);

            // IMPORTANTE:
            // O bucket prescriptions pode ser privado. Não persista URL pública /object/public.
            // Persista o PATH estável, e sirva o arquivo via endpoint do backend (stream) usando service_role.
            return new DigitalSignatureResult(true, null, signedPath, signatureId, signedAt, pdfHash);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Erro ao assinar PDF com certificado {CertificateId}", certificateId);
            string msg;
            if (ex.Message.Contains("MAC", StringComparison.OrdinalIgnoreCase) ||
                ex.Message.Contains("password", StringComparison.OrdinalIgnoreCase))
            {
                msg = "Senha do certificado inválida. Use a mesma senha configurada no upload do certificado.";
            }
            else if (ex.Message.Contains("pre closed", StringComparison.OrdinalIgnoreCase) ||
                     ex.Message.Contains("Document has been already", StringComparison.OrdinalIgnoreCase))
            {
                msg = "Falha interna ao assinar o PDF. Tente novamente em instantes; se o problema persistir, contate o suporte.";
            }
            else
            {
                msg = $"Erro ao assinar: {ex.Message}";
            }
            return new DigitalSignatureResult(false, msg, null, null, null, null);
        }
    }

    public async Task<DigitalSignatureResult> SignPdfFromUrlAsync(
        Guid certificateId,
        string pdfUrl,
        string outputFileName,
        CancellationToken cancellationToken = default)
    {
        // SECURITY: Validar esquema e host para prevenir SSRF.
        Uri uri;
        try
        {
            uri = new Uri(pdfUrl);
        }
        catch
        {
            return new DigitalSignatureResult(false, "URL de PDF inválida.", null, null, null, null);
        }

        // Só HTTPS para evitar interceptação e bloquear schemes file://, gopher://, etc.
        if (uri.Scheme != Uri.UriSchemeHttps)
        {
            _logger.LogWarning("SignPdfFromUrlAsync blocked non-HTTPS URL: {Url}", pdfUrl);
            return new DigitalSignatureResult(false, "Apenas URLs HTTPS são aceitas.", null, null, null, null);
        }

        var host = uri.Host.ToLowerInvariant();
        // Allowlist estrita: s3 e CDN amazonaws + subdomínios renovejasaude.com.br.
        // Não permite localhost/127.0.0.1/metadata (169.254.*) para fechar SSRF clássicos.
        var isAllowed =
            host.EndsWith(".s3.amazonaws.com") ||
            host.EndsWith(".s3.sa-east-1.amazonaws.com") ||
            host.EndsWith(".cloudfront.net") ||
            host.EndsWith(".renovejasaude.com.br");

        if (!isAllowed)
        {
            _logger.LogWarning("SignPdfFromUrlAsync blocked SSRF attempt: {Url}", pdfUrl);
            return new DigitalSignatureResult(false, "URL de PDF não permitida. Apenas URLs internas são aceitas.", null, null, null, null);
        }

        // Download com limite de tamanho (50 MB) e timeout; mitiga DoS via arquivo gigante/slowloris.
        const long MaxPdfBytes = 50L * 1024 * 1024;
        byte[] pdfBytes;
        try
        {
            var httpClient = _httpClientFactory.CreateClient();
            using var cts = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
            cts.CancelAfter(TimeSpan.FromSeconds(30));

            using var response = await httpClient.GetAsync(uri, HttpCompletionOption.ResponseHeadersRead, cts.Token);
            response.EnsureSuccessStatusCode();

            if (response.Content.Headers.ContentLength is long cl && cl > MaxPdfBytes)
                return new DigitalSignatureResult(false, "PDF excede o tamanho máximo permitido (50 MB).", null, null, null, null);

            await using var stream = await response.Content.ReadAsStreamAsync(cts.Token);
            using var ms = new MemoryStream();
            var buffer = new byte[81920];
            int read;
            long total = 0;
            while ((read = await stream.ReadAsync(buffer.AsMemory(0, buffer.Length), cts.Token)) > 0)
            {
                total += read;
                if (total > MaxPdfBytes)
                    return new DigitalSignatureResult(false, "PDF excede o tamanho máximo permitido (50 MB).", null, null, null, null);
                ms.Write(buffer, 0, read);
            }
            pdfBytes = ms.ToArray();
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Falha ao baixar PDF em {Url}", pdfUrl);
            return new DigitalSignatureResult(false, "Erro ao baixar PDF da URL.", null, null, null, null);
        }

        return await SignPdfAsync(certificateId, pdfBytes, outputFileName, null, documentTypeHint: null, cancellationToken);
    }

    public async Task<bool> ValidateCertificatePasswordAsync(
        Guid certificateId,
        string password,
        CancellationToken cancellationToken = default)
    {
        var certificate = await _certificateRepository.GetByIdAsync(certificateId, cancellationToken);
        if (certificate == null || !certificate.IsReadyForSigning())
            return false;

        try
        {
            var encryptedPfx = await _storageService.DownloadAsync(certificate.PfxStoragePath, cancellationToken);
            if (encryptedPfx == null) return false;

            var (pfxBytes, _) = DecryptPfxFull(encryptedPfx);
            // Mesmo critério de ValidatePfxAsync (upload): PKCS#12 só com senha correta abre a chave privada.
            using var x509 = new X509Certificate2(pfxBytes, password, X509KeyStorageFlags.Exportable);
            return x509.HasPrivateKey;
        }
        catch (Exception ex)
        {
            _logger.LogDebug(ex, "Senha do certificado {CertificateId} inválida", certificateId);
            return false;
        }
    }

    public async Task<bool> HasValidCertificateAsync(
        Guid doctorProfileId,
        CancellationToken cancellationToken = default)
    {
        var certificate = await _certificateRepository.GetActiveByDoctorIdAsync(doctorProfileId, cancellationToken);
        return certificate?.IsReadyForSigning() ?? false;
    }

    public async Task<Application.Interfaces.CertificateInfo?> GetActiveCertificateAsync(
        Guid doctorProfileId,
        CancellationToken cancellationToken = default)
    {
        var certificate = await _certificateRepository.GetActiveByDoctorIdAsync(doctorProfileId, cancellationToken);

        if (certificate == null)
            return null;

        var daysUntilExpiry = (int)(certificate.NotAfter - DateTime.UtcNow).TotalDays;

        return new Application.Interfaces.CertificateInfo(
            certificate.Id,
            certificate.SubjectName,
            certificate.IssuerName,
            certificate.NotBefore,
            certificate.NotAfter,
            certificate.IsValid && !certificate.IsExpired,
            certificate.IsExpired,
            daysUntilExpiry,
            // CRM e CPF foram extraídos do Subject DN no upload do PFX
            // (ver ExtractCrmFromSubject / ExtractCpfFromSubject). Expostos
            // para que a camada Application possa validar pinning certificado
            // ↔ médico antes de assinar (Finding #7).
            CrmNumber: certificate.CrmNumber,
            Cpf: certificate.Cpf);
    }

    public async Task<bool> RevokeCertificateAsync(
        Guid certificateId,
        string reason,
        CancellationToken cancellationToken = default)
    {
        var certificate = await _certificateRepository.GetByIdAsync(certificateId, cancellationToken);
        if (certificate == null)
            return false;

        certificate.Revoke(reason);
        await _certificateRepository.UpdateAsync(certificate, cancellationToken);
        
        _logger.LogWarning("Certificado {CertificateId} revogado: {Reason}", certificateId, reason);
        
        return true;
    }

    #region PDF Signing with iText7 + BouncyCastle Adapter

    /// <summary>
    /// Assina um PDF usando o PFX via iText7 BouncyCastle adapter.
    /// Padrão mais alto: PAdES (ISO/ETSI) com PKCS#7/CMS, SHA256, cadeia completa, timestamp TSA e revogação (OCSP + CRL) quando disponível.
    /// Inclui DocMDP (P=2) para evitar "Assinatura Indeterminada" no validar.iti.gov.br.
    /// Inclui OIDs ITI nos atributos assinados (prescrição ou exame, CRM, UF) via ItiHealthOidsSignatureContainer.
    /// Aceito pelo validar.iti.gov.br (ICP-Brasil) e por validadores Adobe quando a cadeia for válida.
    /// </summary>
    /// <param name="documentTypeHint">"exam" para solicitação de exame; "prescription" ou null para receita.</param>
    private byte[] SignPdfWithBouncyCastle(byte[] pfxBytes, string pfxPassword, byte[] pdfBytes, DoctorCertificate certificate, string? documentTypeHint = null)
    {
        // Load PKCS12 store with password (PFX is password-protected)
        using var pfxStream = new MemoryStream(pfxBytes);
        var store = new Pkcs12StoreBuilder().Build();
        store.Load(pfxStream, (pfxPassword ?? "").ToCharArray());

        // Find the key alias
        string? keyAlias = null;
        foreach (var alias in store.Aliases)
        {
            if (store.IsKeyEntry(alias))
            {
                keyAlias = alias;
                break;
            }
        }

        if (keyAlias == null)
            throw new InvalidOperationException("Nenhuma chave privada encontrada no certificado PFX.");

        var pk = store.GetKey(keyAlias);
        var chainEntries = store.GetCertificateChain(keyAlias);

        // Sign the PDF
        using var inputStream = new MemoryStream(pdfBytes);
        using var outputStream = new MemoryStream();

        using var reader = new PdfReader(inputStream);
        // Usa append mode para permitir novas assinaturas e evitar erros de "document pre-closed"
        var stampingProps = new StampingProperties().UseAppendMode();
        var signer = new PdfSigner(reader, outputStream, stampingProps);

        // Configure signature metadata via PdfSigner (iText 8.x API)
        var doctorName = certificate.ExtractDoctorName() ?? "Médico";
        signer.SetReason($"Receita digital assinada conforme ICP-Brasil (MP 2.200-2/2001) - CRM {certificate.CrmNumber ?? "N/A"}");
        signer.SetLocation("RenoveJá Saúde - Sistema de Receitas Digitais");
        signer.SetContact(doctorName);

        signer.SetFieldName($"sig_{Guid.NewGuid():N}");

        // DocMDP (ISO 32000-1): evita "Assinatura Indeterminada" no validar.iti.gov.br.
        // P=2: permite preenchimento de formulários, templates e inclusão de novas assinaturas.
        signer.SetCertificationLevel(PdfSigner.CERTIFIED_FORM_FILLING);

        // Cadeia BouncyCastle e iText (para container e clientes)
        var bcChain = chainEntries.Select(c => c.Certificate).ToArray();
        var certArray = bcChain.Select(c => new X509CertificateBC(c)).ToArray();
        var (crmForOid, ufForOid) = ParseCrmForItiOids(certificate.CrmNumber);

        var tsaClient = CreateTsaClient();
        var crlClient = new CrlClientOnline(certArray);
        var ocspClient = new OcspClientBouncyCastle();

        var container = new ItiHealthOidsSignatureContainer(
            (Org.BouncyCastle.Crypto.AsymmetricKeyParameter)pk.Key,
            bcChain,
            crmForOid,
            ufForOid,
            documentTypeHint,
            ocspClient,
            crlClient,
            tsaClient);

        // Espaço estimado bem generoso para acomodar assinatura (PKCS#7 + cadeia + OCSP/CRL + TSA).
        // Valores muito baixos podem causar IOException "Not enough space".
        const int EstimatedSize = 4194304; // 4 MB
        try
        {
            signer.SignExternalContainer(container, EstimatedSize);
            _logger.LogInformation(
                "PDF assinado com PAdES (PKCS#7/CMS), SHA256, OIDs ITI, cadeia de {ChainLength} certificado(s)",
                bcChain.Length);
            return outputStream.ToArray();
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Container OIDs ITI falhou. Fallback para SignDetached (sem OIDs).");
            try
            {
                return SignPdfDetachedFallback(pdfBytes, store, keyAlias, certificate, useAppendMode: true, certifyDocument: true, documentTypeHint: documentTypeHint);
            }
            catch (Exception fallbackEx) when (IsPreClosedOrAlreadySignedError(fallbackEx))
            {
                // Alguns PDFs/libraries podem falhar com append mode + certificação (DocMDP).
                // Segunda tentativa: modo conservador para priorizar sucesso da assinatura.
                _logger.LogWarning(
                    fallbackEx,
                    "Fallback com append/certificação falhou. Tentando assinatura conservadora sem certificação/append.");
                return SignPdfDetachedFallback(pdfBytes, store, keyAlias, certificate, useAppendMode: false, certifyDocument: false, documentTypeHint: documentTypeHint);
            }
        }
    }

    /// <summary>
    /// Fallback: assina com SignDetached (sem OIDs ITI) quando o container falha.
    /// Atenção: documentos assinados via fallback não são reconhecidos pelo validar.iti.gov.br.
    /// </summary>
    private byte[] SignPdfDetachedFallback(
        byte[] pdfBytes,
        Pkcs12Store store,
        string keyAlias,
        DoctorCertificate certificate,
        bool useAppendMode = true,
        bool certifyDocument = true,
        string? documentTypeHint = null)
    {
        var pk = store.GetKey(keyAlias);
        var chainEntries = store.GetCertificateChain(keyAlias);
        var certArray = chainEntries.Select(c => new X509CertificateBC(c.Certificate)).ToArray();
        var privateKeyWrapped = new PrivateKeyBC(pk.Key);
        var pks = new PrivateKeySignature(privateKeyWrapped, DigestAlgorithms.SHA256);
        var tsaClient = CreateTsaClient();

        using var inputStream = new MemoryStream(pdfBytes);
        using var outputStream = new MemoryStream();
        using var reader = new PdfReader(inputStream);
        var stampingProps = useAppendMode
            ? new StampingProperties().UseAppendMode()
            : new StampingProperties();
        var signer = new PdfSigner(reader, outputStream, stampingProps);

        signer.SetReason($"Receita digital assinada conforme ICP-Brasil (MP 2.200-2/2001) - CRM {certificate.CrmNumber ?? "N/A"}");
        signer.SetLocation("RenoveJá Saúde - Sistema de Receitas Digitais");
        signer.SetContact(certificate.ExtractDoctorName() ?? "Médico");
        signer.SetFieldName($"sig_{Guid.NewGuid():N}");
        if (certifyDocument)
            signer.SetCertificationLevel(PdfSigner.CERTIFIED_FORM_FILLING);

        // Espaço estimado generoso para assinatura detached com possíveis atributos extras.
        const int EstimatedSize = 4194304; // 4 MB
        try
        {
            var crlList = new List<ICrlClient> { new CrlClientOnline(certArray) };
            var ocspClient = new OcspClientBouncyCastle();
            signer.SignDetached(pks, certArray, crlList, ocspClient, tsaClient, EstimatedSize, PdfSigner.CryptoStandard.CMS);
            return outputStream.ToArray();
        }
        catch (Exception ex)
        {
            // Se o problema for realmente falta de espaço reservado, não tentamos reutilizar o mesmo signer,
            // pois o documento já terá sido "pre-closed" e o erro deve subir para tratamento de nível superior.
            if (IsNotEnoughSpaceError(ex))
            {
                throw;
            }

            _logger.LogWarning(ex, "OCSP/CRL indisponível. Assinando sem revogação.");

            // Recria reader/signer para evitar "Document has been already pre closed" ao tentar assinar novamente.
            using var inputStreamNoRevocation = new MemoryStream(pdfBytes);
            using var outputStreamNoRevocation = new MemoryStream();
            using var readerNoRevocation = new PdfReader(inputStreamNoRevocation);
            var stampingPropsNoRevocation = useAppendMode
                ? new StampingProperties().UseAppendMode()
                : new StampingProperties();
            var signerNoRevocation = new PdfSigner(readerNoRevocation, outputStreamNoRevocation, stampingPropsNoRevocation);

            signerNoRevocation.SetReason($"Receita digital assinada conforme ICP-Brasil (MP 2.200-2/2001) - CRM {certificate.CrmNumber ?? "N/A"}");
            signerNoRevocation.SetLocation("RenoveJá Saúde - Sistema de Receitas Digitais");
            signerNoRevocation.SetContact(certificate.ExtractDoctorName() ?? "Médico");
            signerNoRevocation.SetFieldName($"sig_{Guid.NewGuid():N}");
            if (certifyDocument)
                signerNoRevocation.SetCertificationLevel(PdfSigner.CERTIFIED_FORM_FILLING);

            signerNoRevocation.SignDetached(pks, certArray, null, null, tsaClient, EstimatedSize, PdfSigner.CryptoStandard.CMS);
            return outputStreamNoRevocation.ToArray();
        }
    }

    private static bool IsPreClosedOrAlreadySignedError(Exception ex)
    {
        var message = ex.ToString();
        return message.Contains("pre closed", StringComparison.OrdinalIgnoreCase)
            || message.Contains("Document has been already", StringComparison.OrdinalIgnoreCase)
            || message.Contains("already signed", StringComparison.OrdinalIgnoreCase)
            || message.Contains("certification", StringComparison.OrdinalIgnoreCase);
    }

    private static bool IsNotEnoughSpaceError(Exception ex)
    {
        var message = ex.ToString();
        return message.Contains("Not enough space", StringComparison.OrdinalIgnoreCase)
            || message.Contains("no space left", StringComparison.OrdinalIgnoreCase);
    }

    private static ITSAClient? CreateTsaClient()
    {
        var urls = new[] { "http://timestamp.digicert.com", "http://tsa.starfieldtech.com", "http://timestamp.globalsign.com/tsa/r6advanced1" };
        foreach (var url in urls)
        {
            try { return new TSAClientBouncyCastle(url); }
            catch (Exception) { /* best effort: tenta próximo TSA */ }
        }
        return null;
    }

    #endregion

    #region Private Helpers

    private static string? ExtractCpfFromSubject(string subject)
    {
        var patterns = new[]
        {
            @"CPF[:\s]*(\d{11})",
            @"(\d{3}\.\d{3}\.\d{3}-\d{2})",
            @"OID\.2\.16\.76\.1\.3\.1=(\d+)"
        };

        foreach (var pattern in patterns)
        {
            var match = System.Text.RegularExpressions.Regex.Match(subject, pattern, 
                System.Text.RegularExpressions.RegexOptions.IgnoreCase);
            if (match.Success)
            {
                var cpf = match.Groups[1].Value.Replace(".", "").Replace("-", "");
                return cpf.Length == 11 ? cpf : null;
            }
        }

        return null;
    }

    /// <summary>
    /// Extrai CRM (número) e UF do CrmNumber para os OIDs ITI.
    /// Formato esperado: "1234/SP" ou "1234-SP".
    /// </summary>
    private static (string CrmNumber, string Uf) ParseCrmForItiOids(string? crmNumber)
    {
        if (string.IsNullOrWhiteSpace(crmNumber))
            return ("", "");

        var parts = crmNumber.Split('/', '-');
        return parts.Length >= 2
            ? (parts[0].Trim(), parts[1].Trim())
            : (crmNumber.Trim(), "");
    }

    private static string? ExtractCrmFromSubject(string subject)
    {
        var patterns = new[]
        {
            @"CRM[:\s]*(\d+)[/\-]?([A-Z]{2})",
            @"OU=CRM[\-]?(\d+)[\-]?([A-Z]{2})"
        };

        foreach (var pattern in patterns)
        {
            var match = System.Text.RegularExpressions.Regex.Match(subject, pattern, 
                System.Text.RegularExpressions.RegexOptions.IgnoreCase);
            if (match.Success)
            {
                return $"{match.Groups[1].Value}/{match.Groups[2].Value}";
            }
        }

        return null;
    }

    private static bool IsIcpBrasilCertificate(X509Certificate2 certificate)
    {
        var issuer = certificate.Issuer.ToUpperInvariant();
        var icpBrasilIndicators = new[]
        {
            "ICP-BRASIL",
            "ICP BRASIL",
            "ICPBRASIL",
            "AC RAIZ BRASIL",
            "AUTORIDADE CERTIFICADORA RAIZ BRASILEIRA",
            "CERTISIGN",
            "SERASA",
            "VALID",
            "SOLUTI",
            "PRIME",
            "CAIXA"
        };

        return icpBrasilIndicators.Any(ind => issuer.Contains(ind));
    }

    /// <summary>
    /// Criptografa o PFX original (bytes + password embarcada) com AES-256-GCM (AEAD).
    /// Layout: [1 byte version=2] [12 bytes nonce] [4 bytes password length] [ciphertext] [16 bytes tag]
    /// A versão anterior (1) usava AES-CBC sem autenticação — vulnerável a padding-oracle e
    /// adulteração do comprimento de senha (que causava out-of-bounds em DecryptPfxFull). GCM fornece
    /// integridade e confidencialidade em um único passo.
    /// </summary>
    private byte[] EncryptPfx(byte[] pfxBytes, string password)
    {
        var passwordBytes = Encoding.UTF8.GetBytes(password ?? string.Empty);

        // Build plaintext payload: [4-byte password-len][password][pfx]
        var plaintext = new byte[4 + passwordBytes.Length + pfxBytes.Length];
        BitConverter.GetBytes(passwordBytes.Length).CopyTo(plaintext, 0);
        passwordBytes.CopyTo(plaintext, 4);
        pfxBytes.CopyTo(plaintext, 4 + passwordBytes.Length);

        var nonce = RandomNumberGenerator.GetBytes(12);
        var ciphertext = new byte[plaintext.Length];
        var tag = new byte[16];

        using (var aes = new AesGcm(_encryptionKey, tag.Length))
        {
            aes.Encrypt(nonce, plaintext, ciphertext, tag);
        }

        // Apaga o plaintext com a senha em claro
        CryptographicOperations.ZeroMemory(plaintext);

        var result = new byte[1 + nonce.Length + ciphertext.Length + tag.Length];
        result[0] = 0x02; // version marker: 2 = AES-GCM
        Buffer.BlockCopy(nonce, 0, result, 1, nonce.Length);
        Buffer.BlockCopy(ciphertext, 0, result, 1 + nonce.Length, ciphertext.Length);
        Buffer.BlockCopy(tag, 0, result, 1 + nonce.Length + ciphertext.Length, tag.Length);
        return result;
    }

    // TODO(security): Separar armazenamento de senha do PFX — atualmente a senha é embarcada
    // no payload criptografado junto com os bytes do certificado. Se a chave AES vazar,
    // o atacante tem acesso tanto ao PFX quanto à senha. Migrar para:
    // 1. Armazenar senha em AWS Secrets Manager (separado do PFX)
    // 2. Usar KMS envelope encryption em vez de AES direto
    // 3. Considerar VIDaaS VALID (A3 nuvem) para eliminar PFX local

    /// <summary>
    /// Descriptografa para obter o PFX original e a senha armazenada.
    /// Suporta formato atual (v2 AES-GCM autenticado) e formato legado (v1 AES-CBC sem auth) para
    /// não quebrar certificados já persistidos. Valida limites antes de acessar offsets.
    /// </summary>
    private (byte[] PfxBytes, string? StoredPassword) DecryptPfxFull(byte[] encryptedData)
    {
        if (encryptedData == null || encryptedData.Length == 0)
            throw new CryptographicException("Payload de certificado vazio.");

        byte[] payload;

        // V2: AES-GCM. Marker byte = 0x02.
        // V1: AES-CBC legado, começa com 16 bytes de IV (byte 0 pode ser qualquer valor). Para
        // desambiguar, só tratamos como V2 quando o primeiro byte é exatamente 0x02 E o tamanho
        // é consistente (1 + 12 + ct + 16).
        if (encryptedData[0] == 0x02 && encryptedData.Length >= 1 + 12 + 16 + 4)
        {
            const int nonceLen = 12;
            const int tagLen = 16;
            var ctLen = encryptedData.Length - 1 - nonceLen - tagLen;
            if (ctLen <= 0)
                throw new CryptographicException("Payload AES-GCM corrompido.");

            var nonce = new byte[nonceLen];
            var ciphertext = new byte[ctLen];
            var tag = new byte[tagLen];
            Buffer.BlockCopy(encryptedData, 1, nonce, 0, nonceLen);
            Buffer.BlockCopy(encryptedData, 1 + nonceLen, ciphertext, 0, ctLen);
            Buffer.BlockCopy(encryptedData, 1 + nonceLen + ctLen, tag, 0, tagLen);

            payload = new byte[ctLen];
            using var aes = new AesGcm(_encryptionKey, tagLen);
            aes.Decrypt(nonce, ciphertext, tag, payload); // lança CryptographicException se tag inválido
        }
        else
        {
            // Formato legado V1 — AES-CBC. Mantido apenas para certificados já gravados.
            if (encryptedData.Length <= 16)
                throw new CryptographicException("Payload legado muito curto.");

            using var aes = Aes.Create();
            aes.Key = _encryptionKey;
            var iv = new byte[16];
            Buffer.BlockCopy(encryptedData, 0, iv, 0, 16);
            aes.IV = iv;

            using var decryptor = aes.CreateDecryptor();
            payload = decryptor.TransformFinalBlock(encryptedData, 16, encryptedData.Length - 16);
        }

        // Validação robusta dos offsets do payload plaintext — impede out-of-bounds em caso de
        // adulteração do formato legado (V2 já é protegido pelo tag GCM).
        if (payload.Length < 4)
            throw new CryptographicException("Payload decifrado inválido (cabeçalho truncado).");

        var passwordLen = BitConverter.ToInt32(payload, 0);
        if (passwordLen < 0 || passwordLen > payload.Length - 4)
            throw new CryptographicException("Comprimento de senha inválido no payload decifrado.");

        var storedPassword = passwordLen > 0
            ? Encoding.UTF8.GetString(payload, 4, passwordLen)
            : null;

        var pfxStart = 4 + passwordLen;
        var pfxLen = payload.Length - pfxStart;
        if (pfxLen < 0)
            throw new CryptographicException("Offset do PFX inválido no payload decifrado.");

        var pfxBytes = new byte[pfxLen];
        Buffer.BlockCopy(payload, pfxStart, pfxBytes, 0, pfxLen);

        // Zera o payload plaintext (contém senha em claro)
        CryptographicOperations.ZeroMemory(payload);
        return (pfxBytes, storedPassword);
    }

    #endregion
}
