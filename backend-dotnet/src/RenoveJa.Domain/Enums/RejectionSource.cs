namespace RenoveJa.Domain.Enums;

/// <summary>
/// Identifies who rejected a medical request. Used to split the doctor's
/// "rejected by AI" queue from rejections made manually by doctors.
/// </summary>
public enum RejectionSource
{
    Doctor = 0,
    Ai = 1
}
