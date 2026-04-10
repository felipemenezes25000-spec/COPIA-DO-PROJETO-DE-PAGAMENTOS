using System.Globalization;
using System.Security.Cryptography;

namespace RenoveJa.Application.DTOs.Auth;

/// <summary>
/// DTO de onboarding de médico vindo do módulo RH Renoveja.
/// Usa nomes em PT-BR para bater 1:1 com o formulário do RH
/// (rh-renoveja/src/types/index.ts → CandidateFormData).
/// Campos opcionais refletem o formulário multi-step do RH.
/// </summary>
public record HrDoctorOnboardingRequestDto(
    // Step 1 — pessoal
    string Nome,
    string Cpf,
    string Email,
    string Telefone,
    string? Nascimento = null,
    string? Genero = null,
    string? Cep = null,
    string? Estado = null,
    string? Cidade = null,
    string? Bairro = null,
    string? Logradouro = null,
    string? Numero = null,
    string? Complemento = null,

    // Step 2 — profissional
    string? Categoria = null,
    string? Conselho = null,
    string? UfRegistro = null,
    string? Especialidade = null,
    string? OutraEspecialidade = null,
    string? AnosExperiencia = null,
    string? ExpTelemedicina = null,
    string? Sobre = null,
    // Certificado digital A1 (ICP-Brasil .pfx) — obrigatório para assinar
    // prescrições no app. No cadastro só perguntamos se já possui ("sim"|"nao");
    // o upload do .pfx é feito depois no menu de configurações do app do médico.
    // Persistido no Bio (mesma estratégia de ExpTelemedicina) para não
    // exigir migration de schema neste momento.
    string? PossuiCertificadoA1 = null,

    // Step 3 — acadêmico
    string? Graduacao = null,
    string? Universidade = null,
    int? AnoConclusao = null,
    string? PosGraduacao = null,
    string? Residencia = null,

    // Step 5 — consentimento (auditoria futura)
    bool? ConsentimentoLGPD = null,
    bool? ConsentimentoIA = null,

    // Step 0 — acesso (novo 2026-04-07)
    // O médico define email+senha OU usa Google OAuth já no cadastro.
    // A regra "senha XOR googleIdToken" é aplicada no validator; o AuthService
    // valida o token Google server-side e exige que o e-mail do payload bata
    // com o campo Email acima (evita impersonation).
    string? Senha = null,
    string? ConfirmarSenha = null,
    string? GoogleIdToken = null
);

/// <summary>
/// Mapeia o payload do RH (PT-BR) para o DTO canônico de registro de médico (EN).
/// Responsável por: conversão de nomes, tipos (string→DateTime), normalização
/// de enums (gênero) e consolidação de campos extras do RH em <c>Bio</c>/<c>Courses</c>
/// — que hoje são os únicos "baldes" livres no <see cref="RegisterDoctorRequestDto"/>.
/// </summary>
public static class HrDoctorOnboardingMapper
{
    public static RegisterDoctorRequestDto ToRegisterDoctorRequest(
        HrDoctorOnboardingRequestDto src,
        string effectivePassword)
    {
        var bio = BuildBio(src);
        var courses = BuildCourses(src);
        var specialty = !string.IsNullOrWhiteSpace(src.OutraEspecialidade)
            ? $"{src.Especialidade} ({src.OutraEspecialidade})"
            : (src.Especialidade ?? string.Empty);

        return new RegisterDoctorRequestDto(
            Name: src.Nome,
            Email: src.Email,
            Password: effectivePassword,
            ConfirmPassword: effectivePassword,
            Phone: src.Telefone,
            Cpf: src.Cpf,
            Crm: src.Conselho ?? string.Empty,
            CrmState: src.UfRegistro ?? string.Empty,
            Specialty: specialty,
            BirthDate: ParseBirthDate(src.Nascimento),
            Gender: MapGender(src.Genero),
            GraduationYear: src.AnoConclusao,
            Bio: bio,
            Street: src.Logradouro,
            Number: src.Numero,
            Neighborhood: src.Bairro,
            Complement: src.Complemento,
            City: src.Cidade,
            State: src.Estado,
            PostalCode: src.Cep,
            University: src.Universidade,
            Courses: courses
        );
    }

    /// <summary>
    /// Gera uma senha temporária criptograficamente aleatória que satisfaz
    /// a policy do <c>RegisterDoctorRequestValidator</c>: 8+ chars com pelo menos
    /// 1 maiúscula, 1 minúscula, 1 dígito e 1 especial. O médico criado via RH
    /// deve trocar a senha via fluxo "esqueci senha".
    /// </summary>
    public static string GenerateTempPassword()
    {
        const string upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
        const string lower = "abcdefghijkmnopqrstuvwxyz";
        const string digits = "23456789";
        const string special = "!@#$%&*?-_";
        const string all = upper + lower + digits + special;

        Span<char> pw = stackalloc char[16];
        pw[0] = upper[RandomNumberGenerator.GetInt32(upper.Length)];
        pw[1] = lower[RandomNumberGenerator.GetInt32(lower.Length)];
        pw[2] = digits[RandomNumberGenerator.GetInt32(digits.Length)];
        pw[3] = special[RandomNumberGenerator.GetInt32(special.Length)];
        for (int i = 4; i < pw.Length; i++)
            pw[i] = all[RandomNumberGenerator.GetInt32(all.Length)];

        // Fisher-Yates shuffle para não expor o padrão dos 4 primeiros chars.
        for (int i = pw.Length - 1; i > 0; i--)
        {
            int j = RandomNumberGenerator.GetInt32(i + 1);
            (pw[i], pw[j]) = (pw[j], pw[i]);
        }
        return new string(pw);
    }

    private static DateTime? ParseBirthDate(string? raw)
    {
        if (string.IsNullOrWhiteSpace(raw))
            return null;

        // Aceita ISO (yyyy-MM-dd) ou dd/MM/yyyy — os dois formatos aparecem no RH.
        if (DateTime.TryParse(raw, CultureInfo.InvariantCulture,
                DateTimeStyles.AssumeUniversal | DateTimeStyles.AdjustToUniversal, out var iso))
            return iso;

        if (DateTime.TryParseExact(raw, "dd/MM/yyyy", new CultureInfo("pt-BR"),
                DateTimeStyles.AssumeLocal, out var br))
            return br;

        return null;
    }

    private static string? MapGender(string? genero) => genero switch
    {
        "masculino" => "M",
        "feminino" => "F",
        "nao_binario" => "Outro",
        "prefiro_nao_informar" => "Não informado",
        _ => null,
    };

    private static string? BuildBio(HrDoctorOnboardingRequestDto s)
    {
        var parts = new List<string>();
        if (!string.IsNullOrWhiteSpace(s.Sobre)) parts.Add(s.Sobre!);

        var exp = new List<string>();
        // Categoria profissional (medico | enfermeiro | dentista | psicologo | nutricionista).
        // Persistida no Bio porque RegisterDoctorRequestDto não tem campo Category hoje.
        // Sem esse prefixo TODOS os candidatos apareciam como "medico/CRM" no portal RH,
        // mesmo quem se cadastrou como dentista/enfermeiro (bug 2026-04-08).
        if (!string.IsNullOrWhiteSpace(s.Categoria))
            exp.Add($"Categoria: {s.Categoria}");
        if (!string.IsNullOrWhiteSpace(s.AnosExperiencia))
            exp.Add($"Experiência: {MapExperienceYears(s.AnosExperiencia!)}");
        if (!string.IsNullOrWhiteSpace(s.ExpTelemedicina))
            exp.Add($"Telemedicina: {(s.ExpTelemedicina == "sim" ? "sim" : "não")}");
        if (!string.IsNullOrWhiteSpace(s.PossuiCertificadoA1))
            exp.Add($"Certificado A1: {(s.PossuiCertificadoA1 == "sim" ? "sim" : "não")}");
        if (exp.Count > 0)
            parts.Add(string.Join(" · ", exp));

        return parts.Count == 0 ? null : string.Join("\n\n", parts);
    }

    private static string? BuildCourses(HrDoctorOnboardingRequestDto s)
    {
        var parts = new List<string>();
        if (!string.IsNullOrWhiteSpace(s.PosGraduacao))
            parts.Add($"Pós-graduação: {s.PosGraduacao}");
        if (!string.IsNullOrWhiteSpace(s.Residencia))
            parts.Add($"Residência: {s.Residencia}");
        return parts.Count == 0 ? null : string.Join("\n", parts);
    }

    private static string MapExperienceYears(string value) => value switch
    {
        "menos_1" => "menos de 1 ano",
        "1_3" => "1 a 3 anos",
        "3_5" => "3 a 5 anos",
        "5_10" => "5 a 10 anos",
        "mais_10" => "mais de 10 anos",
        _ => value,
    };

}

/// <summary>
/// Resposta do endpoint de onboarding via RH. Não devolve a senha temporária —
/// o médico deve completar o acesso pelo fluxo "esqueci senha".
/// </summary>
/// <param name="UserId">ID do usuário criado (para o frontend poder chamar o upload de documentos).</param>
/// <param name="Email">E-mail do médico (ecoado da requisição).</param>
/// <param name="ProfileComplete">Sempre <c>false</c> no onboarding — o médico ainda precisa preencher endereço profissional.</param>
/// <param name="Protocolo">Protocolo humano-legível do cadastro (ex.: "RJ-2026-000042"). Gerado pelo banco via SEQUENCE.</param>
/// <param name="Message">Mensagem amigável para exibição na tela de confirmação.</param>
public record HrDoctorOnboardingResponseDto(
    Guid UserId,
    string Email,
    bool ProfileComplete,
    string? Protocolo,
    string Message
);
