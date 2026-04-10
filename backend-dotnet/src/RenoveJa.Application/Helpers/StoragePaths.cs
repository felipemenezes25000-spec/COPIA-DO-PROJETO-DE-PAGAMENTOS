namespace RenoveJa.Application.Helpers;

/// <summary>
/// Centraliza caminhos de storage (S3/Supabase) para documentos médicos.
/// </summary>
public static class StoragePaths
{
    /// <summary>Caminho para transcrição da consulta.</summary>
    public static string Transcricao(Guid patientId, Guid requestId)
        => $"pacientes/{patientId}/consultas/{requestId}/transcricao.txt";

    /// <summary>Caminho para notas SOAP da consulta.</summary>
    public static string SoapNotes(Guid patientId, Guid requestId)
        => $"pacientes/{patientId}/consultas/{requestId}/soap-notes.json";

    /// <summary>Caminho para receita assinada.</summary>
    public static string ReceitaAssinada(Guid patientId, Guid requestId)
        => $"pedidos/{patientId}/receita/assinado/receita-{requestId}.pdf";

    /// <summary>Caminho para exame assinado.</summary>
    public static string ExameAssinado(Guid patientId, Guid requestId)
        => $"pedidos/{patientId}/exame/assinado/exame-{requestId}.pdf";

    /// <summary>Caminho para documento de receita (pós-consulta).</summary>
    public static string DocumentoReceita(Guid patientId, Guid documentId)
        => $"pacientes/{patientId}/documentos/receita-{documentId}.pdf";

    /// <summary>Caminho para documento de exame (pós-consulta).</summary>
    public static string DocumentoExame(Guid patientId, Guid documentId)
        => $"pacientes/{patientId}/documentos/exame-{documentId}.pdf";

    /// <summary>Caminho para documento de atestado (pós-consulta).</summary>
    public static string DocumentoAtestado(Guid patientId, Guid documentId)
        => $"pacientes/{patientId}/documentos/atestado-{documentId}.pdf";

    /// <summary>Caminho para documento de encaminhamento (pós-consulta).</summary>
    public static string DocumentoEncaminhamento(Guid patientId, Guid documentId)
        => $"pacientes/{patientId}/documentos/encaminhamento-{documentId}.pdf";

    /// <summary>Caminho para certificado digital PFX do médico.</summary>
    public static string CertificadoDigital(Guid doctorProfileId)
        => $"certificados/{doctorProfileId}/certificado.pfx";

    /// <summary>Caminho para gravação de vídeo da consulta.</summary>
    public static string Gravacao(Guid patientId, Guid requestId, string recordingId)
        => $"pacientes/{patientId}/consultas/{requestId}/gravacao-{recordingId}.mp4";

    /// <summary>Caminho para avatar do usuário.</summary>
    public static string Avatar(Guid userId, string fileName)
        => $"avatars/{userId}/{fileName}";

    /// <summary>Caminho para anexo de pedido (receita/exame).</summary>
    public static string PedidoAnexo(Guid userId, string tipo, string ext)
        => $"pedidos/{userId}/{tipo}/{Guid.NewGuid()}{ext}";

    /// <summary>Caminho para chunk de gravação de consulta.</summary>
    public static string GravacaoChunk(Guid patientId, Guid requestId, string chunkId)
        => $"pacientes/{patientId}/consultas/{requestId}/chunks/{chunkId}.webm";
}
