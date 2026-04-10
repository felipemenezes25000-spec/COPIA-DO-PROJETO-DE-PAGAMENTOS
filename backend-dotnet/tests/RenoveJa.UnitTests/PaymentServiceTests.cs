// PaymentServiceTests.cs
// Cobre: CreatePaymentAsync (validações), ConfirmPaymentAsync,
//        GetPaymentByRequestIdAsync, ValidateWebhookSignature, IsPaymentProcessedByExternalIdAsync

using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using FluentAssertions;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Moq;
using RenoveJa.Application.Configuration;
using RenoveJa.Application.DTOs.Notifications;
using RenoveJa.Application.DTOs.Payments;
using RenoveJa.Application.Interfaces;
using RenoveJa.Application.Services.Payments;
using RenoveJa.Domain.Entities;
using RenoveJa.Domain.Enums;
using RenoveJa.Domain.Interfaces;
using Xunit;

namespace RenoveJa.UnitTests;

public class PaymentServiceTests
{
    // ─── Mocks ────────────────────────────────────────────────────────────

    private readonly Mock<IPaymentRepository>         _payRepo         = new();
    private readonly Mock<IRequestRepository>         _reqRepo         = new();
    private readonly Mock<INotificationRepository>    _notifRepo       = new();
    private readonly Mock<IPushNotificationSender>    _pushSender      = new();
    private readonly Mock<IPushNotificationDispatcher> _pushDispatcher = new();
    private readonly Mock<IMercadoPagoService>        _mp              = new();
    private readonly Mock<IUserRepository>            _userRepo        = new();
    private readonly Mock<IPaymentAttemptRepository>  _attemptRepo     = new();
    private readonly Mock<ISavedCardRepository>       _cardRepo        = new();
    private readonly Mock<IRequestEventsPublisher>    _events          = new();
    private readonly Mock<ILogger<PaymentService>>    _logger          = new();

    private PaymentService CreateSut(string webhookSecret = "test-secret-min-32-chars-xxxxxxxxx")
    {
        var config = Options.Create(new MercadoPagoConfig
        {
            AccessToken = "test-token",
            WebhookSecret = webhookSecret,
            NotificationUrl = "https://api.renovejasaude.com.br/api/payments/webhook",
            RedirectBaseUrl = "https://app.renovejasaude.com.br",
        });
        return new PaymentService(
            _payRepo.Object, _reqRepo.Object, _notifRepo.Object,
            _pushSender.Object, _pushDispatcher.Object, _mp.Object,
            _userRepo.Object, _attemptRepo.Object, _cardRepo.Object,
            config, _events.Object, _logger.Object);
    }

    private static MedicalRequest PendingRequest(Guid patientId, decimal price = 49.9m)
    {
        var r = MedicalRequest.CreatePrescription(patientId, "Patient", PrescriptionType.Simple, new List<string> { "Med" });
        r.Approve(price);
        return r;
    }

    // ─── CreatePaymentAsync — validações ─────────────────────────────────

    [Fact]
    public async Task CreatePaymentAsync_WhenRequestNotFound_Throws()
    {
        _reqRepo.Setup(x => x.GetByIdAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()))
                .ReturnsAsync((MedicalRequest?)null);

        var sut = CreateSut();
        var dto = new CreatePaymentRequestDto(Guid.NewGuid());

        await sut.Invoking(s => s.CreatePaymentAsync(dto, Guid.NewGuid(), CancellationToken.None))
                 .Should().ThrowAsync<KeyNotFoundException>();
    }

    [Fact]
    public async Task CreatePaymentAsync_WhenPatientMismatch_ThrowsUnauthorized()
    {
        var patientId = Guid.NewGuid();
        var request   = PendingRequest(patientId);

        _reqRepo.Setup(x => x.GetByIdAsync(request.Id, It.IsAny<CancellationToken>()))
                .ReturnsAsync(request);

        var sut = CreateSut();
        var dto = new CreatePaymentRequestDto(request.Id);

        // Outro userId
        await sut.Invoking(s => s.CreatePaymentAsync(dto, Guid.NewGuid(), CancellationToken.None))
                 .Should().ThrowAsync<UnauthorizedAccessException>();
    }

    [Fact]
    public async Task CreatePaymentAsync_WhenStatusNotApprovedPendingPayment_Throws()
    {
        var patientId = Guid.NewGuid();
        var request   = MedicalRequest.CreatePrescription(patientId, "P", PrescriptionType.Simple, new List<string> { "M" });
        // Status = Submitted, não ApprovedPendingPayment

        _reqRepo.Setup(x => x.GetByIdAsync(request.Id, It.IsAny<CancellationToken>()))
                .ReturnsAsync(request);

        var sut = CreateSut();
        var dto = new CreatePaymentRequestDto(request.Id);

        await sut.Invoking(s => s.CreatePaymentAsync(dto, patientId, CancellationToken.None))
                 .Should().ThrowAsync<InvalidOperationException>();
    }

    [Fact]
    public async Task CreatePaymentAsync_WhenAlreadyApprovedPaymentExists_ThrowsWithMessage()
    {
        var patientId = Guid.NewGuid();
        var request   = PendingRequest(patientId);

        _reqRepo.Setup(x => x.GetByIdAsync(request.Id, It.IsAny<CancellationToken>()))
                .ReturnsAsync(request);

        var approvedPayment = Payment.CreatePixPayment(request.Id, patientId, 49.9m);
        approvedPayment.Approve();
        _payRepo.Setup(x => x.GetByRequestIdAsync(request.Id, It.IsAny<CancellationToken>()))
                .ReturnsAsync(approvedPayment);
        _reqRepo.Setup(x => x.UpdateAsync(It.IsAny<MedicalRequest>(), It.IsAny<CancellationToken>()))
                .ReturnsAsync(request);

        var sut = CreateSut();
        var dto = new CreatePaymentRequestDto(request.Id);

        var ex = await Assert.ThrowsAsync<InvalidOperationException>(
            () => sut.CreatePaymentAsync(dto, patientId, CancellationToken.None));

        ex.Message.Should().Contain("pagamento aprovado");
    }

    // ─── GetPaymentByRequestIdAsync ───────────────────────────────────────

    [Fact]
    public async Task GetPaymentByRequestId_WhenRequestNotFound_Throws()
    {
        _reqRepo.Setup(x => x.GetByIdAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()))
                .ReturnsAsync((MedicalRequest?)null);

        var sut = CreateSut();

        await sut.Invoking(s => s.GetPaymentByRequestIdAsync(Guid.NewGuid(), Guid.NewGuid(), CancellationToken.None))
                 .Should().ThrowAsync<KeyNotFoundException>();
    }

    [Fact]
    public async Task GetPaymentByRequestId_WhenPatientMismatch_ThrowsUnauthorized()
    {
        var request = PendingRequest(Guid.NewGuid());
        _reqRepo.Setup(x => x.GetByIdAsync(request.Id, It.IsAny<CancellationToken>()))
                .ReturnsAsync(request);

        var sut = CreateSut();

        await sut.Invoking(s => s.GetPaymentByRequestIdAsync(request.Id, Guid.NewGuid(), CancellationToken.None))
                 .Should().ThrowAsync<UnauthorizedAccessException>();
    }

    [Fact]
    public async Task GetPaymentByRequestId_WhenNoPendingPayment_ReturnsNull()
    {
        var patientId = Guid.NewGuid();
        var request   = PendingRequest(patientId);

        _reqRepo.Setup(x => x.GetByIdAsync(request.Id, It.IsAny<CancellationToken>()))
                .ReturnsAsync(request);
        _payRepo.Setup(x => x.GetByRequestIdAsync(request.Id, It.IsAny<CancellationToken>()))
                .ReturnsAsync((Payment?)null);

        var sut    = CreateSut();
        var result = await sut.GetPaymentByRequestIdAsync(request.Id, patientId, CancellationToken.None);

        result.Should().BeNull();
    }

    // ─── ConfirmPaymentAsync ──────────────────────────────────────────────

    [Fact]
    public async Task ConfirmPaymentAsync_WhenPaymentNotFound_Throws()
    {
        _payRepo.Setup(x => x.GetByIdAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()))
                .ReturnsAsync((Payment?)null);

        var sut = CreateSut();

        await sut.Invoking(s => s.ConfirmPaymentAsync(Guid.NewGuid(), CancellationToken.None))
                 .Should().ThrowAsync<KeyNotFoundException>();
    }

    [Fact]
    public async Task ConfirmPaymentAsync_ApprovesPaymentAndMarksRequestPaid()
    {
        var patientId = Guid.NewGuid();
        var request   = PendingRequest(patientId);

        var payment = Payment.CreatePixPayment(request.Id, patientId, 49.9m);

        _payRepo.Setup(x => x.GetByIdAsync(payment.Id, It.IsAny<CancellationToken>()))
                .ReturnsAsync(payment);
        _payRepo.Setup(x => x.UpdateAsync(It.IsAny<Payment>(), It.IsAny<CancellationToken>()))
                .ReturnsAsync(payment);
        _reqRepo.Setup(x => x.GetByIdAsync(request.Id, It.IsAny<CancellationToken>()))
                .ReturnsAsync(request);
        _reqRepo.Setup(x => x.UpdateAsync(It.IsAny<MedicalRequest>(), It.IsAny<CancellationToken>()))
                .ReturnsAsync(request);
        _notifRepo.Setup(x => x.CreateAsync(It.IsAny<Notification>(), It.IsAny<CancellationToken>()))
                  .ReturnsAsync((Notification n, CancellationToken _) => n);
        _pushSender.Setup(x => x.SendAsync(It.IsAny<Guid>(), It.IsAny<string>(), It.IsAny<string>(),
                          It.IsAny<Dictionary<string, object?>>(), It.IsAny<CancellationToken>()))
                   .Returns(Task.CompletedTask);
        _pushDispatcher.Setup(x => x.SendAsync(It.IsAny<PushNotificationRequest>(), It.IsAny<CancellationToken>()))
                       .Returns(Task.CompletedTask);
        _events.Setup(x => x.NotifyRequestUpdatedAsync(It.IsAny<Guid>(), It.IsAny<Guid>(),
                      It.IsAny<Guid?>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CancellationToken>()))
               .Returns(Task.CompletedTask);

        var sut    = CreateSut();
        var result = await sut.ConfirmPaymentAsync(payment.Id, CancellationToken.None);

        result.Should().NotBeNull();
        result.Status.Should().Be("approved");

        _reqRepo.Verify(x => x.UpdateAsync(
            It.Is<MedicalRequest>(r => r.Status == RequestStatus.Paid),
            It.IsAny<CancellationToken>()), Times.Once);
    }

    // ─── ValidateWebhookSignature ─────────────────────────────────────────

    [Fact]
    public void ValidateWebhookSignature_WithNullSignature_ReturnsFalse()
    {
        var sut = CreateSut();
        sut.ValidateWebhookSignature(null, "req-id", "123").Should().BeFalse();
    }

    [Fact]
    public void ValidateWebhookSignature_WithEmptySignature_ReturnsFalse()
    {
        var sut = CreateSut();
        sut.ValidateWebhookSignature("", "req-id", "123").Should().BeFalse();
    }

    [Fact]
    public void ValidateWebhookSignature_WithMalformedSignature_ReturnsFalse()
    {
        var sut = CreateSut();
        sut.ValidateWebhookSignature("not-a-valid-sig", "req-id", "123").Should().BeFalse();
    }

    [Fact]
    public void ValidateWebhookSignature_WithEmptyWebhookSecret_ReturnsFalse()
    {
        var sut = CreateSut(webhookSecret: "");
        sut.ValidateWebhookSignature("ts=123,v1=abc", "req-id", "123").Should().BeFalse();
    }

    [Fact]
    public void ValidateWebhookSignature_WithCorrectHmac_ReturnsTrue()
    {
        // Gerar HMAC real para validar
        const string secret  = "test-secret-min-32-chars-xxxxxxxxx";
        const string ts      = "1234567890";
        const string dataId  = "98765";
        const string reqId   = "abc-request-id";

        // Manifesto: id:{dataId};request-id:{reqId};ts:{ts};
        var manifest = $"id:{dataId};request-id:{reqId};ts:{ts};";
        using var hmac = new System.Security.Cryptography.HMACSHA256(
            System.Text.Encoding.UTF8.GetBytes(secret));
        var hash     = hmac.ComputeHash(System.Text.Encoding.UTF8.GetBytes(manifest));
        var v1       = BitConverter.ToString(hash).Replace("-", "").ToLowerInvariant();
        var xSig     = $"ts={ts},v1={v1}";

        var sut = CreateSut(webhookSecret: secret);

        sut.ValidateWebhookSignature(xSig, reqId, dataId).Should().BeTrue();
    }

    // ─── IsPaymentProcessedByExternalIdAsync ─────────────────────────────

    [Fact]
    public async Task IsPaymentProcessed_WithEmptyExternalId_ReturnsFalse()
    {
        var sut = CreateSut();
        var result = await sut.IsPaymentProcessedByExternalIdAsync("", CancellationToken.None);
        result.Should().BeFalse();
    }

    [Fact]
    public async Task IsPaymentProcessed_WhenPaymentNotFound_ReturnsFalse()
    {
        _payRepo.Setup(x => x.GetByExternalIdAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
                .ReturnsAsync((Payment?)null);

        var sut    = CreateSut();
        var result = await sut.IsPaymentProcessedByExternalIdAsync("mp-123", CancellationToken.None);
        result.Should().BeFalse();
    }

    [Fact]
    public async Task IsPaymentProcessed_WhenPaymentIsPending_ReturnsFalse()
    {
        var payment = Payment.CreatePixPayment(Guid.NewGuid(), Guid.NewGuid(), 49.9m);
        // Pendente — não aprovado

        _payRepo.Setup(x => x.GetByExternalIdAsync("mp-123", It.IsAny<CancellationToken>()))
                .ReturnsAsync(payment);

        var sut    = CreateSut();
        var result = await sut.IsPaymentProcessedByExternalIdAsync("mp-123", CancellationToken.None);
        result.Should().BeFalse();
    }

    [Fact]
    public async Task IsPaymentProcessed_WhenPaymentIsApproved_ReturnsTrue()
    {
        var payment = Payment.CreatePixPayment(Guid.NewGuid(), Guid.NewGuid(), 49.9m);
        payment.Approve();

        _payRepo.Setup(x => x.GetByExternalIdAsync("mp-123", It.IsAny<CancellationToken>()))
                .ReturnsAsync(payment);

        var sut    = CreateSut();
        var result = await sut.IsPaymentProcessedByExternalIdAsync("mp-123", CancellationToken.None);
        result.Should().BeTrue();
    }
}
