using FluentAssertions;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Moq;
using RenoveJa.Application.Configuration;
using RenoveJa.Application.Interfaces;
using RenoveJa.Domain.Enums;
using RenoveJa.Infrastructure.Pdf;
using iText.Kernel.Pdf;
using iText.Kernel.Pdf.Canvas.Parser;
using Xunit;

namespace RenoveJa.UnitTests;

public class PrescriptionPdfServiceTests
{
    private static PrescriptionPdfService CreateService()
    {
        var storageMock = new Mock<IStorageService>();
        var certMock = new Mock<IDigitalCertificateService>();
        var loggerMock = new Mock<ILogger<PrescriptionPdfService>>();
        var config = Options.Create(new VerificationConfig { BaseUrl = "https://test.com/verificar" });
        return new PrescriptionPdfService(
            storageMock.Object,
            certMock.Object,
            loggerMock.Object,
            config);
    }

    private static string ExtractTextFromPdf(byte[] pdfBytes)
    {
        using var reader = new PdfReader(new MemoryStream(pdfBytes));
        using var doc = new PdfDocument(reader);
        var sb = new System.Text.StringBuilder();
        for (int i = 1; i <= doc.GetNumberOfPages(); i++)
        {
            var page = doc.GetPage(i);
            sb.Append(PdfTextExtractor.GetTextFromPage(page));
        }
        return sb.ToString();
    }

    [Fact]
    public async Task GenerateAsync_Antimicrobial_ContainsValidity10Days()
    {
        var service = CreateService();
        var data = new PrescriptionPdfData(
            Guid.NewGuid(),
            "João Silva",
            "12345678901",
            "Dr. Maria",
            "123456",
            "SP",
            "Clínica Geral",
            new List<string> { "Amoxicilina 500mg" },
            "simples",
            DateTime.UtcNow,
            PrescriptionKind: PrescriptionKind.Antimicrobial,
            PatientGender: "M",
            PatientBirthDate: new DateTime(1990, 1, 1),
            DoctorAddress: "Rua X",
            DoctorPhone: "11999999999");

        var result = await service.GenerateAsync(data);

        result.Success.Should().BeTrue();
        result.PdfBytes.Should().NotBeNull();
        var text = ExtractTextFromPdf(result.PdfBytes!);
        text.Should().Contain("Validade");
        text.Should().Contain("10 dias");
    }

    [Fact]
    public async Task GenerateAsync_ControlledSpecial_ContainsEmitenteAndPacienteBlocks()
    {
        var service = CreateService();
        var data = new PrescriptionPdfData(
            Guid.NewGuid(),
            "João Silva",
            "12345678901",
            "Dr. Maria",
            "123456",
            "SP",
            "Clínica Geral",
            new List<string> { "Rivotril 2mg" },
            "controlado",
            DateTime.UtcNow,
            PrescriptionKind: PrescriptionKind.ControlledSpecial,
            PatientAddress: "Rua Y, 100",
            DoctorAddress: "Rua X",
            DoctorPhone: "11999999999");

        var result = await service.GenerateAsync(data);

        result.Success.Should().BeTrue();
        result.PdfBytes.Should().NotBeNull();
        var text = ExtractTextFromPdf(result.PdfBytes!);
        text.Should().Contain("IDENTIFICAÇÃO DO EMITENTE");
        text.Should().Contain("PACIENTE");
    }

    [Fact]
    public async Task GenerateAsync_Simple_ProducesValidPdf()
    {
        var service = CreateService();
        var data = new PrescriptionPdfData(
            Guid.NewGuid(),
            "João Silva",
            null,
            "Dr. Maria",
            "123456",
            "SP",
            "Clínica Geral",
            new List<string> { "Dipirona 500mg" },
            "simples",
            DateTime.UtcNow,
            PrescriptionKind: PrescriptionKind.Simple);

        var result = await service.GenerateAsync(data);

        result.Success.Should().BeTrue();
        result.PdfBytes.Should().NotBeNull();
        result.PdfBytes!.Length.Should().BeGreaterThan(100);
    }

    // ─── Recado institucional ao paciente — deve aparecer em TODA receita ───
    // (requisito Carolina Akiko 2026-04-07)

    [Fact]
    public async Task GenerateAsync_Simple_ContainsPatientReminder()
    {
        var service = CreateService();
        var data = new PrescriptionPdfData(
            Guid.NewGuid(), "João Silva", "12345678901",
            "Dr. Maria", "123456", "SP", "Clínica Geral",
            new List<string> { "Losartana 50mg" },
            "simples", DateTime.UtcNow,
            PrescriptionKind: PrescriptionKind.Simple);

        var result = await service.GenerateAsync(data);

        result.Success.Should().BeTrue();
        var text = ExtractTextFromPdf(result.PdfBytes!);
        text.Should().Contain("uso contínuo");
        text.Should().Contain("consulta de rotina");
    }

    [Fact]
    public async Task GenerateAsync_Antimicrobial_ContainsPatientReminder()
    {
        var service = CreateService();
        var data = new PrescriptionPdfData(
            Guid.NewGuid(), "João Silva", "12345678901",
            "Dr. Maria", "123456", "SP", "Clínica Geral",
            new List<string> { "Amoxicilina 500mg" },
            "antimicrobiana", DateTime.UtcNow,
            PrescriptionKind: PrescriptionKind.Antimicrobial,
            PatientGender: "M",
            PatientBirthDate: new DateTime(1990, 1, 1));

        var result = await service.GenerateAsync(data);

        result.Success.Should().BeTrue();
        var text = ExtractTextFromPdf(result.PdfBytes!);
        text.Should().Contain("uso contínuo");
        text.Should().Contain("consulta de rotina");
    }

    [Fact]
    public async Task GenerateAsync_ControlledSpecial_ContainsPatientReminder()
    {
        var service = CreateService();
        var data = new PrescriptionPdfData(
            Guid.NewGuid(), "João Silva", "12345678901",
            "Dr. Maria", "123456", "SP", "Clínica Geral",
            new List<string> { "Clonazepam 2mg" },
            "controlado", DateTime.UtcNow,
            PrescriptionKind: PrescriptionKind.ControlledSpecial,
            PatientAddress: "Rua Y, 100");

        var result = await service.GenerateAsync(data);

        result.Success.Should().BeTrue();
        var text = ExtractTextFromPdf(result.PdfBytes!);
        text.Should().Contain("uso contínuo");
        text.Should().Contain("consulta de rotina");
    }

    // ─── Aviso de finalidade do exame — deve aparecer em TODO pedido de exame ───

    [Fact]
    public async Task GenerateExamRequestAsync_ContainsPurposeNotice()
    {
        var service = CreateService();
        var data = new ExamPdfData(
            Guid.NewGuid(),
            "João Silva",
            "12345678901",
            "Dr. Maria",
            "123456",
            "SP",
            "Clínica Geral",
            new List<string> { "Hemograma completo", "TSH" },
            null,
            DateTime.UtcNow);

        var result = await service.GenerateExamRequestAsync(data);

        result.Success.Should().BeTrue();
        var text = ExtractTextFromPdf(result.PdfBytes!);
        text.Should().Contain("complementação");
        text.Should().Contain("investigação diagnóstica");
    }

    // ─── Recado institucional NÃO deve poluir o PDF de exame ───

    [Fact]
    public async Task GenerateExamRequestAsync_DoesNotContainPrescriptionReminder()
    {
        var service = CreateService();
        var data = new ExamPdfData(
            Guid.NewGuid(),
            "João Silva",
            "12345678901",
            "Dr. Maria",
            "123456",
            "SP",
            "Clínica Geral",
            new List<string> { "Hemograma completo" },
            null,
            DateTime.UtcNow);

        var result = await service.GenerateExamRequestAsync(data);

        result.Success.Should().BeTrue();
        var text = ExtractTextFromPdf(result.PdfBytes!);
        text.Should().NotContain("Receita renovada");
    }

    // ─── Indicação clínica padrão ("Investigação diagnóstica") deve ser suprimida
    // para evitar redundância com o aviso institucional de finalidade do exame ───

    [Fact]
    public async Task GenerateExamRequestAsync_OmitsClinicalIndicationWhenInvestigationOnly()
    {
        var service = CreateService();
        var data = new ExamPdfData(
            Guid.NewGuid(),
            "João Silva",
            "12345678901",
            "Dr. Maria",
            "123456",
            "SP",
            "Clínica Geral",
            new List<string> { "Hemograma completo" },
            null,
            DateTime.UtcNow,
            ClinicalIndication: "Investigação diagnóstica");

        var result = await service.GenerateExamRequestAsync(data);

        result.Success.Should().BeTrue();
        var text = ExtractTextFromPdf(result.PdfBytes!);
        text.Should().NotContain("INDICAÇÃO CLÍNICA");
    }

    [Fact]
    public async Task GenerateExamRequestAsync_KeepsClinicalIndicationWhenPatientProvidedReason()
    {
        var service = CreateService();
        var data = new ExamPdfData(
            Guid.NewGuid(),
            "João Silva",
            "12345678901",
            "Dr. Maria",
            "123456",
            "SP",
            "Clínica Geral",
            new List<string> { "Hemograma completo" },
            null,
            DateTime.UtcNow,
            ClinicalIndication: "Dor abdominal há 5 dias com febre");

        var result = await service.GenerateExamRequestAsync(data);

        result.Success.Should().BeTrue();
        var text = ExtractTextFromPdf(result.PdfBytes!);
        text.Should().Contain("INDICAÇÃO CLÍNICA");
        text.Should().Contain("Dor abdominal");
    }
}
