using FluentAssertions;
using RenoveJa.Domain.Entities;
using RenoveJa.Domain.Enums;
using RenoveJa.Domain.Exceptions;
using Xunit;

namespace RenoveJa.UnitTests.Domain;

public class MedicalRequestRejectionTests
{
    private static MedicalRequest NewPrescription() =>
        MedicalRequest.CreatePrescription(
            patientId: Guid.NewGuid(),
            patientName: "Paciente Teste",
            prescriptionType: PrescriptionType.Simple,
            medications: new List<string> { "Losartana 50mg" });

    [Fact]
    public void Reject_manual_sets_RejectionSource_Doctor()
    {
        var request = NewPrescription();

        request.Reject("Receita ilegível");

        request.Status.Should().Be(RequestStatus.Rejected);
        request.RejectionReason.Should().Be("Receita ilegível");
        request.RejectionSource.Should().Be(RejectionSource.Doctor);
        request.AiRejectionReason.Should().BeNull();
        request.AiRejectedAt.Should().BeNull();
    }

    [Fact]
    public void RejectByAi_sets_all_ai_fields_and_mirrors_reason()
    {
        var request = NewPrescription();
        const string reason = "Tipo da receita divergente do selecionado";

        request.RejectByAi(reason);

        request.Status.Should().Be(RequestStatus.Rejected);
        request.RejectionSource.Should().Be(RejectionSource.Ai);
        request.AiRejectionReason.Should().Be(reason);
        request.RejectionReason.Should().Be(reason);
        request.AiRejectedAt.Should().NotBeNull();
    }

    [Fact]
    public void RejectByAi_throws_if_reason_blank()
    {
        var request = NewPrescription();

        Action act = () => request.RejectByAi("   ");

        act.Should().Throw<DomainException>();
    }

    [Fact]
    public void ReopenFromAiRejection_transitions_back_to_InReview_and_assigns_doctor()
    {
        var request = NewPrescription();
        request.RejectByAi("Tipo divergente");
        var doctorId = Guid.NewGuid();

        request.ReopenFromAiRejection(doctorId, "Dra. Ana");

        request.Status.Should().Be(RequestStatus.InReview);
        request.DoctorId.Should().Be(doctorId);
        request.DoctorName.Should().Be("Dra. Ana");
        request.ReopenedBy.Should().Be(doctorId);
        request.ReopenedAt.Should().NotBeNull();
        request.AiRejectionReason.Should().Be("Tipo divergente"); // preserved
        request.RejectionReason.Should().BeNull(); // cleared
        request.RejectionSource.Should().Be(RejectionSource.Ai); // preserved for audit
    }

    [Fact]
    public void ReopenFromAiRejection_fails_if_not_ai_rejected()
    {
        var request = NewPrescription();
        request.Reject("Motivo manual do médico");

        Action act = () => request.ReopenFromAiRejection(Guid.NewGuid(), "Dr. X");

        act.Should().Throw<DomainException>()
            .WithMessage("*only AI-rejected*");
    }

    [Fact]
    public void ReopenFromAiRejection_fails_if_not_rejected()
    {
        var request = NewPrescription();

        Action act = () => request.ReopenFromAiRejection(Guid.NewGuid(), "Dr. X");

        act.Should().Throw<DomainException>();
    }
}
