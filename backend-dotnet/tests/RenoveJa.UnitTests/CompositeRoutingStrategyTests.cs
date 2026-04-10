using FluentAssertions;
using Microsoft.Extensions.Logging;
using Moq;
using RenoveJa.Application.Services.Routing;
using RenoveJa.Domain.Interfaces;
using Xunit;

namespace RenoveJa.UnitTests;

/// <summary>
/// Testes da estratégia de roteamento composta. Garante que:
///   1. Filtro por especialidade é passado para o repositório (strict, sem fallback)
///   2. Retorna RoutingDecision quando há candidato
///   3. Retorna null quando o repositório não encontra candidato (solicitação fica na fila)
/// </summary>
public class CompositeRoutingStrategyTests
{
    private readonly Mock<IDoctorRepository> _doctorRepoMock = new();
    private readonly Mock<ILogger<CompositeRoutingStrategy>> _loggerMock = new();
    private readonly CompositeRoutingStrategy _sut;

    public CompositeRoutingStrategyTests()
    {
        _sut = new CompositeRoutingStrategy(_doctorRepoMock.Object, _loggerMock.Object);
    }

    [Fact]
    public async Task SelectDoctorAsync_WhenCandidateExists_ShouldReturnRoutingDecision()
    {
        var doctorProfileId = Guid.NewGuid();
        var doctorUserId = Guid.NewGuid();
        var candidate = new DoctorAssignmentCandidate(
            doctorProfileId, doctorUserId, "Dr. Ana", "Clínica Geral");

        _doctorRepoMock.Setup(r => r.SelectLeastLoadedAvailableAsync(
                It.IsAny<string?>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(candidate);

        var context = new RoutingContext(Guid.NewGuid(), Guid.NewGuid(), "prescription", null);

        var decision = await _sut.SelectDoctorAsync(context);

        decision.Should().NotBeNull();
        decision!.DoctorProfileId.Should().Be(doctorProfileId);
        decision.DoctorUserId.Should().Be(doctorUserId);
        decision.DoctorName.Should().Be("Dr. Ana");
        decision.Specialty.Should().Be("Clínica Geral");
    }

    [Fact]
    public async Task SelectDoctorAsync_WhenNoCandidate_ShouldReturnNull()
    {
        _doctorRepoMock.Setup(r => r.SelectLeastLoadedAvailableAsync(
                It.IsAny<string?>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((DoctorAssignmentCandidate?)null);

        var context = new RoutingContext(Guid.NewGuid(), Guid.NewGuid(), "consultation", "Psiquiatria");

        var decision = await _sut.SelectDoctorAsync(context);

        decision.Should().BeNull();
    }

    [Fact]
    public async Task SelectDoctorAsync_WithRequiredSpecialty_ShouldPassSpecialtyToRepository()
    {
        _doctorRepoMock.Setup(r => r.SelectLeastLoadedAvailableAsync(
                It.IsAny<string?>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((DoctorAssignmentCandidate?)null);

        var context = new RoutingContext(Guid.NewGuid(), Guid.NewGuid(), "consultation", "Pediatria");

        await _sut.SelectDoctorAsync(context);

        _doctorRepoMock.Verify(r => r.SelectLeastLoadedAvailableAsync(
            "Pediatria", It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task SelectDoctorAsync_WithoutRequiredSpecialty_ShouldPassNullToRepository()
    {
        _doctorRepoMock.Setup(r => r.SelectLeastLoadedAvailableAsync(
                It.IsAny<string?>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((DoctorAssignmentCandidate?)null);

        var context = new RoutingContext(Guid.NewGuid(), Guid.NewGuid(), "prescription", null);

        await _sut.SelectDoctorAsync(context);

        _doctorRepoMock.Verify(r => r.SelectLeastLoadedAvailableAsync(
            null, It.IsAny<CancellationToken>()), Times.Once);
    }
}
