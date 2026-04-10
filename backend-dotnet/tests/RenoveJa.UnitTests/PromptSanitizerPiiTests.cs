using FluentAssertions;
using RenoveJa.Infrastructure.AiReading;
using Xunit;

namespace RenoveJa.UnitTests;

/// <summary>
/// Testes de redaction de PII (LGPD) no PromptSanitizer.
/// Valida que CPF, CNPJ, CRM, RG, telefone e e-mail são mascarados
/// antes do envio ao LLM.
/// </summary>
public class PromptSanitizerPiiTests
{
    [Theory]
    [InlineData("Paciente CPF 123.456.789-09 consultou hoje.")]
    [InlineData("CPF: 12345678909 solicitou receita.")]
    [InlineData("cpf 123456789-09 consta no prontuário.")]
    public void SanitizeForPrompt_WhenCpfPresent_ShouldRedact(string input)
    {
        var result = PromptSanitizer.SanitizeForPrompt(input);

        result.Should().Contain("[CPF_REDACTED]");
        result.Should().NotMatchRegex(@"\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b");
    }

    [Theory]
    [InlineData("CNPJ 12.345.678/0001-90 da clínica.")]
    [InlineData("cnpj: 12345678000190")]
    public void SanitizeForPrompt_WhenCnpjPresent_ShouldRedact(string input)
    {
        var result = PromptSanitizer.SanitizeForPrompt(input);

        result.Should().Contain("[CNPJ_REDACTED]");
    }

    [Theory]
    [InlineData("Prescritor CRM/SP 12345.")]
    [InlineData("Médico com CRM-RJ-987654.")]
    [InlineData("crm sp 54321 assinou o documento.")]
    public void SanitizeForPrompt_WhenCrmPresent_ShouldRedact(string input)
    {
        var result = PromptSanitizer.SanitizeForPrompt(input);

        result.Should().Contain("[CRM_REDACTED]");
    }

    [Theory]
    [InlineData("RG 12.345.678-9 do paciente.")]
    [InlineData("documento rg: 1.234.567-X")]
    public void SanitizeForPrompt_WhenRgPresent_ShouldRedact(string input)
    {
        var result = PromptSanitizer.SanitizeForPrompt(input);

        result.Should().Contain("[RG_REDACTED]");
    }

    [Theory]
    [InlineData("Contato: (11) 91234-5678")]
    [InlineData("Telefone +55 21 98765-4321")]
    [InlineData("fone 1134567890")]
    public void SanitizeForPrompt_WhenPhonePresent_ShouldRedact(string input)
    {
        var result = PromptSanitizer.SanitizeForPrompt(input);

        result.Should().Contain("[PHONE_REDACTED]");
    }

    [Theory]
    [InlineData("Enviar resultado para paciente@email.com.br")]
    [InlineData("Dr. João joao.silva+receita@hospital.org")]
    public void SanitizeForPrompt_WhenEmailPresent_ShouldRedact(string input)
    {
        var result = PromptSanitizer.SanitizeForPrompt(input);

        result.Should().Contain("[EMAIL_REDACTED]");
    }

    [Fact]
    public void SanitizeForPrompt_CpfDoesNotCollideWithRg_BothRedacted()
    {
        // CPF applied before RG — ensure neither bleeds into the other's placeholder
        const string input = "CPF 123.456.789-09 e RG 12.345.678-9 do mesmo paciente.";

        var result = PromptSanitizer.SanitizeForPrompt(input);

        result.Should().Contain("[CPF_REDACTED]");
        result.Should().Contain("[RG_REDACTED]");
        result.Should().NotMatchRegex(@"\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b");
        result.Should().NotMatchRegex(@"\b\d{1,2}\.?\d{3}\.?\d{3}-?[\dxX]\b");
    }
}
