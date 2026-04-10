using System.Reflection;
using FluentAssertions;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Moq;
using RenoveJa.Api.Services;
using RenoveJa.Domain.Entities;
using RenoveJa.Domain.Enums;
using RenoveJa.Domain.Interfaces;
using Xunit;

namespace RenoveJa.UnitTests;

/// <summary>
/// Phase E — Smoke + behavior tests para <see cref="QueueSlaExpirationWorker"/>.
///
/// O loop público <c>ExecuteAsync</c> tem delays e ciclo infinito que o tornam
/// impraticável de exercitar diretamente em um teste unitário. Em vez disso,
/// invocamos <c>ScanOnceAsync</c> via reflexão (ele é privado mas determinístico)
/// e validamos que o repositório foi consultado uma vez por scan.
/// </summary>
public class QueueSlaExpirationWorkerTests
{
    private static MedicalRequest MakeQueuedRequest(DateTime createdAt)
    {
        var snapshot = new MedicalRequestSnapshot
        {
            Id = Guid.NewGuid(),
            PatientId = Guid.NewGuid(),
            PatientName = "Paciente",
            RequestType = "consultation",
            Status = "SearchingDoctor",
            CreatedAt = createdAt,
            UpdatedAt = createdAt,
            Priority = "normal",
        };
        return MedicalRequest.Reconstitute(snapshot);
    }

    private static (QueueSlaExpirationWorker worker, Mock<IRequestRepository> repoMock, Mock<ILogger<QueueSlaExpirationWorker>> loggerMock)
        CreateWorker(List<MedicalRequest> queued)
    {
        var repoMock = new Mock<IRequestRepository>();
        // Worker now uses cursor pagination via GetByStatusPagedAsync. Return the full list
        // on offset=0 and an empty list afterwards so the worker stops cleanly.
        repoMock
            .Setup(r => r.GetByStatusPagedAsync(RequestStatus.SearchingDoctor, It.IsAny<int>(), 0, It.IsAny<CancellationToken>()))
            .ReturnsAsync(queued);
        repoMock
            .Setup(r => r.GetByStatusPagedAsync(RequestStatus.SearchingDoctor, It.IsAny<int>(), It.Is<int>(o => o > 0), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<MedicalRequest>());

        var services = new ServiceCollection();
        services.AddSingleton(repoMock.Object);
        var sp = services.BuildServiceProvider();
        var scopeFactory = sp.GetRequiredService<IServiceScopeFactory>();

        var loggerMock = new Mock<ILogger<QueueSlaExpirationWorker>>();
        var configuration = new ConfigurationBuilder().AddInMemoryCollection().Build();

        var worker = new QueueSlaExpirationWorker(scopeFactory, loggerMock.Object, configuration);
        return (worker, repoMock, loggerMock);
    }

    [Fact]
    public void Constructor_ShouldInstantiate_WithMockedDependencies()
    {
        var (worker, _, _) = CreateWorker(new List<MedicalRequest>());
        worker.Should().NotBeNull();
    }

    [Fact]
    public async Task ScanOnce_ShouldLogWarningOnlyForRequestsPastSla()
    {
        var now = DateTime.UtcNow;
        // 30 min de idade — passou do warningAge default de 10 min
        var pastSla = MakeQueuedRequest(now.AddMinutes(-30));
        // 1 min de idade — dentro do SLA
        var withinSla = MakeQueuedRequest(now.AddMinutes(-1));

        var (worker, repoMock, loggerMock) = CreateWorker(new List<MedicalRequest> { pastSla, withinSla });

        // ScanOnceAsync(TimeSpan warningAge, CancellationToken cancellationToken)
        var scanMethod = typeof(QueueSlaExpirationWorker).GetMethod(
            "ScanOnceAsync",
            BindingFlags.Instance | BindingFlags.NonPublic);
        scanMethod.Should().NotBeNull("ScanOnceAsync deve existir como método privado de instância");

        var task = (Task)scanMethod!.Invoke(worker, new object[] { TimeSpan.FromMinutes(10), CancellationToken.None })!;
        await task;

        repoMock.Verify(
            r => r.GetByStatusPagedAsync(RequestStatus.SearchingDoctor, It.IsAny<int>(), 0, It.IsAny<CancellationToken>()),
            Times.Once);

        // Verifica que o logger recebeu pelo menos um warning mencionando o id do request fora do SLA.
        var pastSlaIdSubstring = pastSla.Id.ToString();
        loggerMock.Verify(
            l => l.Log(
                LogLevel.Warning,
                It.IsAny<EventId>(),
                It.Is<It.IsAnyType>((v, _) => v.ToString()!.Contains(pastSlaIdSubstring)),
                It.IsAny<Exception?>(),
                It.IsAny<Func<It.IsAnyType, Exception?, string>>()),
            Times.AtLeastOnce);

        // E não deve emitir warning mencionando o request dentro do SLA.
        var withinSlaIdSubstring = withinSla.Id.ToString();
        loggerMock.Verify(
            l => l.Log(
                LogLevel.Warning,
                It.IsAny<EventId>(),
                It.Is<It.IsAnyType>((v, _) => v.ToString()!.Contains(withinSlaIdSubstring)),
                It.IsAny<Exception?>(),
                It.IsAny<Func<It.IsAnyType, Exception?, string>>()),
            Times.Never);
    }
}
