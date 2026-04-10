using FluentAssertions;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using RenoveJa.Application.DTOs.Requests;
using RenoveJa.Application.Interfaces;
using RenoveJa.Application.Services.Requests;
using RenoveJa.Domain.Entities;
using RenoveJa.Domain.Enums;
using RenoveJa.Domain.Interfaces;
using Xunit;

namespace RenoveJa.UnitTests;

public class RequestClaimServiceTests
{
    private readonly Mock<IRequestRepository> _repo = new();
    private readonly Mock<IUserRepository> _users = new();
    private readonly Mock<IRequestEventsPublisher> _events = new();
    private readonly RequestClaimService _sut;

    public RequestClaimServiceTests()
    {
        _sut = new RequestClaimService(
            _repo.Object,
            _users.Object,
            _events.Object,
            NullLogger<RequestClaimService>.Instance);
    }

    private static User MakeDoctorUser(string name = "Dr. Ana Silva")
        => User.Reconstitute(
            Guid.NewGuid(),
            name,
            "doctor@example.com",
            "hashedpwd",
            "Doctor",
            "11999887766",
            "12345678901",
            new DateTime(1985, 5, 10),
            null,
            DateTime.UtcNow,
            DateTime.UtcNow);

    private static MedicalRequest MakePrescriptionRequest()
        => MedicalRequest.CreatePrescription(
            Guid.NewGuid(),
            "Paciente Teste",
            PrescriptionType.Simple,
            new List<string> { "Dipirona 500mg" });

    [Fact]
    public async Task ClaimAsync_ShouldReturnSuccess_WhenRepoReturnsTrue()
    {
        var requestId = Guid.NewGuid();
        var doctor = MakeDoctorUser("Dr. Ana Silva");
        var doctorId = doctor.Id;
        var request = MakePrescriptionRequest();

        _users.Setup(u => u.GetByIdAsync(doctorId, It.IsAny<CancellationToken>()))
              .ReturnsAsync(doctor);
        _repo.Setup(r => r.TryClaimAsync(requestId, doctorId, "Dr. Ana Silva", It.IsAny<CancellationToken>()))
             .ReturnsAsync(true);
        _repo.Setup(r => r.GetByIdAsync(requestId, It.IsAny<CancellationToken>()))
             .ReturnsAsync(request);

        var result = await _sut.ClaimAsync(requestId, doctorId);

        result.Outcome.Should().Be(ClaimOutcome.Success);
        result.Request.Should().NotBeNull();
        _events.Verify(e => e.NotifyRequestClaimedAsync(
            requestId, "Dr. Ana Silva", It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task ClaimAsync_ShouldReturnConflict_WhenRepoReturnsFalse()
    {
        var requestId = Guid.NewGuid();
        var doctor = MakeDoctorUser("Dr. Ana Silva");
        var doctorId = doctor.Id;

        var existing = MakePrescriptionRequest();
        existing.AssignDoctor(Guid.NewGuid(), "Dr. Carlos Ferreira");

        _users.Setup(u => u.GetByIdAsync(doctorId, It.IsAny<CancellationToken>()))
              .ReturnsAsync(doctor);
        _repo.Setup(r => r.TryClaimAsync(requestId, doctorId, "Dr. Ana Silva", It.IsAny<CancellationToken>()))
             .ReturnsAsync(false);
        _repo.Setup(r => r.GetByIdAsync(requestId, It.IsAny<CancellationToken>()))
             .ReturnsAsync(existing);

        var result = await _sut.ClaimAsync(requestId, doctorId);

        result.Outcome.Should().Be(ClaimOutcome.Conflict);
        result.CurrentHolderName.Should().Be("Dr. Carlos Ferreira");
        _events.Verify(e => e.NotifyRequestClaimedAsync(
            It.IsAny<Guid>(), It.IsAny<string>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task ClaimAsync_ShouldReturnNotFound_WhenRequestMissing()
    {
        var requestId = Guid.NewGuid();
        var doctor = MakeDoctorUser("Dr. Ana Silva");
        var doctorId = doctor.Id;

        _users.Setup(u => u.GetByIdAsync(doctorId, It.IsAny<CancellationToken>()))
              .ReturnsAsync(doctor);
        _repo.Setup(r => r.TryClaimAsync(requestId, doctorId, "Dr. Ana Silva", It.IsAny<CancellationToken>()))
             .ReturnsAsync(false);
        _repo.Setup(r => r.GetByIdAsync(requestId, It.IsAny<CancellationToken>()))
             .ReturnsAsync((MedicalRequest?)null);

        var result = await _sut.ClaimAsync(requestId, doctorId);

        result.Outcome.Should().Be(ClaimOutcome.NotFound);
        _events.Verify(e => e.NotifyRequestClaimedAsync(
            It.IsAny<Guid>(), It.IsAny<string>(), It.IsAny<CancellationToken>()), Times.Never);
    }
}
