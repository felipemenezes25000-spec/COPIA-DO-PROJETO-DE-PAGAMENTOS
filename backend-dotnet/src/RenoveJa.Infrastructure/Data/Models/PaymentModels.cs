using System.Text.Json.Serialization;
using RenoveJa.Domain.Entities;

namespace RenoveJa.Infrastructure.Data.Models;

/// <summary>Modelo de persistência para pagamento (tabela payments).</summary>
public class PaymentModel
{
    public Guid Id { get; set; }
    [JsonPropertyName("request_id")] public Guid RequestId { get; set; }
    [JsonPropertyName("user_id")] public Guid UserId { get; set; }
    public decimal Amount { get; set; }
    public string Status { get; set; } = string.Empty;
    [JsonPropertyName("payment_method")] public string? PaymentMethod { get; set; }
    [JsonPropertyName("external_id")] public string? ExternalId { get; set; }
    [JsonPropertyName("pix_qr_code")] public string? PixQrCode { get; set; }
    [JsonPropertyName("pix_qr_code_base64")] public string? PixQrCodeBase64 { get; set; }
    [JsonPropertyName("pix_copy_paste")] public string? PixCopyPaste { get; set; }
    [JsonPropertyName("paid_at")] public DateTime? PaidAt { get; set; }
    [JsonPropertyName("created_at")] public DateTime CreatedAt { get; set; }
    [JsonPropertyName("updated_at")] public DateTime UpdatedAt { get; set; }
}

/// <summary>Modelo de persistência para tentativa de pagamento (tabela payment_attempts).</summary>
public class PaymentAttemptModel
{
    public Guid Id { get; set; }
    [JsonPropertyName("payment_id")] public Guid? PaymentId { get; set; }
    [JsonPropertyName("request_id")] public Guid RequestId { get; set; }
    [JsonPropertyName("user_id")] public Guid UserId { get; set; }
    [JsonPropertyName("correlation_id")] public string? CorrelationId { get; set; }
    [JsonPropertyName("payment_method")] public string? PaymentMethod { get; set; }
    public decimal Amount { get; set; }
    [JsonPropertyName("mercado_pago_payment_id")] public string? MercadoPagoPaymentId { get; set; }
    [JsonPropertyName("mercado_pago_preference_id")] public string? MercadoPagoPreferenceId { get; set; }
    [JsonPropertyName("request_url")] public string? RequestUrl { get; set; }
    [JsonPropertyName("request_payload")] public string? RequestPayload { get; set; }
    [JsonPropertyName("response_payload")] public string? ResponsePayload { get; set; }
    [JsonPropertyName("response_status_code")] public int? ResponseStatusCode { get; set; }
    [JsonPropertyName("response_status_detail")] public string? ResponseStatusDetail { get; set; }
    [JsonPropertyName("response_headers")] public string? ResponseHeaders { get; set; }
    [JsonPropertyName("error_message")] public string? ErrorMessage { get; set; }
    [JsonPropertyName("is_success")] public bool IsSuccess { get; set; }
    [JsonPropertyName("created_at")] public DateTime CreatedAt { get; set; }
    [JsonPropertyName("updated_at")] public DateTime UpdatedAt { get; set; }

    public static PaymentAttemptModel FromDomain(PaymentAttempt attempt) => new()
    {
        Id = attempt.Id,
        PaymentId = attempt.PaymentId,
        RequestId = attempt.RequestId,
        UserId = attempt.UserId,
        CorrelationId = attempt.CorrelationId,
        PaymentMethod = attempt.PaymentMethod,
        Amount = attempt.Amount,
        MercadoPagoPaymentId = attempt.MercadoPagoPaymentId,
        MercadoPagoPreferenceId = attempt.MercadoPagoPreferenceId,
        RequestUrl = attempt.RequestUrl,
        RequestPayload = attempt.RequestPayload,
        ResponsePayload = attempt.ResponsePayload,
        ResponseStatusCode = attempt.ResponseStatusCode,
        ResponseStatusDetail = attempt.ResponseStatusDetail,
        ResponseHeaders = attempt.ResponseHeaders,
        ErrorMessage = attempt.ErrorMessage,
        IsSuccess = attempt.IsSuccess,
        CreatedAt = attempt.CreatedAt,
        UpdatedAt = attempt.UpdatedAt
    };
}

/// <summary>Modelo de persistência para cartão salvo (tabela saved_cards).</summary>
public class SavedCardModel
{
    public Guid Id { get; set; }
    [JsonPropertyName("user_id")] public Guid UserId { get; set; }
    [JsonPropertyName("mp_customer_id")] public string? MpCustomerId { get; set; }
    [JsonPropertyName("mp_card_id")] public string? MpCardId { get; set; }
    [JsonPropertyName("last_four")] public string? LastFour { get; set; }
    public string? Brand { get; set; }
    [JsonPropertyName("created_at")] public DateTime CreatedAt { get; set; }
}

/// <summary>Modelo de persistência para evento de webhook (tabela webhook_events).</summary>
public class WebhookEventModel
{
    public Guid Id { get; set; }
    [JsonPropertyName("correlation_id")] public string? CorrelationId { get; set; }
    [JsonPropertyName("mercado_pago_payment_id")] public string? MercadoPagoPaymentId { get; set; }
    [JsonPropertyName("mercado_pago_request_id")] public string? MercadoPagoRequestId { get; set; }
    [JsonPropertyName("webhook_type")] public string? WebhookType { get; set; }
    [JsonPropertyName("webhook_action")] public string? WebhookAction { get; set; }
    [JsonPropertyName("raw_payload")] public string? RawPayload { get; set; }
    [JsonPropertyName("processed_payload")] public string? ProcessedPayload { get; set; }
    [JsonPropertyName("query_string")] public string? QueryString { get; set; }
    [JsonPropertyName("request_headers")] public string? RequestHeaders { get; set; }
    [JsonPropertyName("content_type")] public string? ContentType { get; set; }
    [JsonPropertyName("content_length")] public int? ContentLength { get; set; }
    [JsonPropertyName("source_ip")] public string? SourceIp { get; set; }
    [JsonPropertyName("is_duplicate")] public bool IsDuplicate { get; set; }
    [JsonPropertyName("is_processed")] public bool IsProcessed { get; set; }
    [JsonPropertyName("processing_error")] public string? ProcessingError { get; set; }
    [JsonPropertyName("payment_status")] public string? PaymentStatus { get; set; }
    [JsonPropertyName("payment_status_detail")] public string? PaymentStatusDetail { get; set; }
    [JsonPropertyName("processed_at")] public DateTime? ProcessedAt { get; set; }
    [JsonPropertyName("created_at")] public DateTime CreatedAt { get; set; }
    [JsonPropertyName("updated_at")] public DateTime UpdatedAt { get; set; }

    public static WebhookEventModel FromDomain(WebhookEvent e) => new()
    {
        Id = e.Id,
        CorrelationId = e.CorrelationId,
        MercadoPagoPaymentId = e.MercadoPagoPaymentId,
        MercadoPagoRequestId = e.MercadoPagoRequestId,
        WebhookType = e.WebhookType,
        WebhookAction = e.WebhookAction,
        RawPayload = e.RawPayload,
        ProcessedPayload = e.ProcessedPayload,
        QueryString = e.QueryString,
        RequestHeaders = e.RequestHeaders,
        ContentType = e.ContentType,
        ContentLength = e.ContentLength,
        SourceIp = e.SourceIp,
        IsDuplicate = e.IsDuplicate,
        IsProcessed = e.IsProcessed,
        ProcessingError = e.ProcessingError,
        PaymentStatus = e.PaymentStatus,
        PaymentStatusDetail = e.PaymentStatusDetail,
        ProcessedAt = e.ProcessedAt,
        CreatedAt = e.CreatedAt,
        UpdatedAt = e.UpdatedAt
    };
}
