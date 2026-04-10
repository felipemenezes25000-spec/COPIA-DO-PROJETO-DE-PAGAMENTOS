namespace RenoveJa.Infrastructure.Ledi;

/// <summary>
/// Referência de medicamentos CATMAT (Catálogo de Materiais do SUS).
/// Subset dos 80+ medicamentos mais comuns na Atenção Primária.
/// Ref: LEDI APS 7.3.7 — Tabela de medicamentos CATMAT.
/// </summary>
public static class CatmatReference
{
    public record CatmatItem(string Codigo, string Nome, string Forma, string? Concentracao);

    /// <summary>
    /// Medicamentos RENAME (Relação Nacional de Medicamentos Essenciais) mais utilizados na APS.
    /// </summary>
    public static readonly IReadOnlyList<CatmatItem> MedicamentosAps = new List<CatmatItem>
    {
        // Analgésicos / anti-inflamatórios
        new("BR0267554", "Dipirona sódica", "Comprimido", "500mg"),
        new("BR0267555", "Dipirona sódica", "Solução oral", "500mg/mL"),
        new("BR0272270", "Paracetamol", "Comprimido", "500mg"),
        new("BR0272271", "Paracetamol", "Comprimido", "750mg"),
        new("BR0272272", "Paracetamol", "Solução oral", "200mg/mL"),
        new("BR0271350", "Ibuprofeno", "Comprimido", "600mg"),
        new("BR0271351", "Ibuprofeno", "Comprimido", "400mg"),
        new("BR0271352", "Ibuprofeno", "Suspensão oral", "50mg/mL"),
        new("BR0264950", "Ácido acetilsalicílico", "Comprimido", "100mg"),
        new("BR0264951", "Ácido acetilsalicílico", "Comprimido", "500mg"),

        // Anti-hipertensivos
        new("BR0271130", "Hidroclorotiazida", "Comprimido", "25mg"),
        new("BR0268050", "Enalapril maleato", "Comprimido", "10mg"),
        new("BR0268051", "Enalapril maleato", "Comprimido", "20mg"),
        new("BR0271932", "Losartana potássica", "Comprimido", "50mg"),
        new("BR0264563", "Anlodipino besilato", "Comprimido", "5mg"),
        new("BR0264564", "Anlodipino besilato", "Comprimido", "10mg"),
        new("BR0264725", "Atenolol", "Comprimido", "50mg"),
        new("BR0272710", "Propranolol cloridrato", "Comprimido", "40mg"),

        // Antidiabéticos
        new("BR0272060", "Metformina cloridrato", "Comprimido", "850mg"),
        new("BR0272061", "Metformina cloridrato", "Comprimido", "500mg"),
        new("BR0270220", "Glibenclamida", "Comprimido", "5mg"),
        new("BR0271700", "Insulina NPH humana", "Suspensão injetável", "100UI/mL"),
        new("BR0271701", "Insulina regular humana", "Solução injetável", "100UI/mL"),

        // Antibióticos
        new("BR0264531", "Amoxicilina", "Cápsula", "500mg"),
        new("BR0264532", "Amoxicilina", "Suspensão oral", "250mg/5mL"),
        new("BR0264870", "Azitromicina", "Comprimido", "500mg"),
        new("BR0265950", "Cefalexina", "Cápsula", "500mg"),
        new("BR0265951", "Cefalexina", "Suspensão oral", "250mg/5mL"),
        new("BR0272960", "Sulfametoxazol + Trimetoprima", "Comprimido", "400mg+80mg"),
        new("BR0266530", "Ciprofloxacino", "Comprimido", "500mg"),
        new("BR0272050", "Metronidazol", "Comprimido", "250mg"),

        // Antiparasitários
        new("BR0264480", "Albendazol", "Comprimido mastigável", "400mg"),
        new("BR0271940", "Ivermectina", "Comprimido", "6mg"),

        // Antifúngicos
        new("BR0269810", "Fluconazol", "Cápsula", "150mg"),
        new("BR0272230", "Nistatina", "Suspensão oral", "100.000UI/mL"),

        // Aparelho digestivo
        new("BR0272250", "Omeprazol", "Cápsula", "20mg"),
        new("BR0272780", "Ranitidina cloridrato", "Comprimido", "150mg"),
        new("BR0272050", "Metoclopramida cloridrato", "Comprimido", "10mg"),
        new("BR0267650", "Dimeticona", "Comprimido", "40mg"),
        new("BR0265590", "Butilescopolamina", "Comprimido", "10mg"),
        new("BR0271910", "Loperamida cloridrato", "Comprimido", "2mg"),
        new("BR0273430", "Sais para reidratação oral", "Pó envelope", null),

        // Sistema nervoso
        new("BR0267600", "Diazepam", "Comprimido", "5mg"),
        new("BR0269860", "Fluoxetina cloridrato", "Cápsula", "20mg"),
        new("BR0264530", "Amitriptilina cloridrato", "Comprimido", "25mg"),
        new("BR0265540", "Carbamazepina", "Comprimido", "200mg"),
        new("BR0269310", "Fenitoína sódica", "Comprimido", "100mg"),
        new("BR0269600", "Fenobarbital", "Comprimido", "100mg"),
        new("BR0270600", "Haloperidol", "Comprimido", "5mg"),
        new("BR0266550", "Clorpromazina cloridrato", "Comprimido", "100mg"),
        new("BR0265090", "Biperideno cloridrato", "Comprimido", "2mg"),
        new("BR0271880", "Lítio carbonato", "Comprimido", "300mg"),

        // Antialérgicos
        new("BR0271905", "Loratadina", "Comprimido", "10mg"),
        new("BR0272690", "Prometazina cloridrato", "Comprimido", "25mg"),
        new("BR0267510", "Dexclorfeniramina maleato", "Comprimido", "2mg"),

        // Corticoides
        new("BR0272630", "Prednisona", "Comprimido", "5mg"),
        new("BR0272631", "Prednisona", "Comprimido", "20mg"),
        new("BR0267480", "Dexametasona", "Elixir", "0,1mg/mL"),

        // Aparelho respiratório
        new("BR0273060", "Salbutamol sulfato", "Aerossol", "100mcg/dose"),
        new("BR0265560", "Beclometasona dipropionato", "Aerossol", "250mcg/dose"),
        new("BR0265070", "Brometo de ipratrópio", "Solução inalatória", "0,25mg/mL"),

        // Vitaminas e minerais
        new("BR0273330", "Sulfato ferroso", "Comprimido", "40mg Fe"),
        new("BR0264920", "Ácido fólico", "Comprimido", "5mg"),

        // Hormônios e contracepção
        new("BR0271838", "Levonorgestrel + Etinilestradiol", "Comprimido", "0,15mg+0,03mg"),
        new("BR0272040", "Medroxiprogesterona acetato", "Suspensão injetável", "150mg/mL"),
        new("BR0271840", "Levonorgestrel", "Comprimido", "0,75mg"),
        new("BR0271850", "Levotiroxina sódica", "Comprimido", "25mcg"),
        new("BR0271851", "Levotiroxina sódica", "Comprimido", "50mcg"),
        new("BR0271852", "Levotiroxina sódica", "Comprimido", "100mcg"),

        // Cardiovascular
        new("BR0273230", "Sinvastatina", "Comprimido", "20mg"),
        new("BR0273231", "Sinvastatina", "Comprimido", "40mg"),
        new("BR0268410", "Espironolactona", "Comprimido", "25mg"),
        new("BR0269950", "Furosemida", "Comprimido", "40mg"),
        new("BR0267660", "Digoxina", "Comprimido", "0,25mg"),

        // Anticoagulantes
        new("BR0274260", "Varfarina sódica", "Comprimido", "5mg"),

        // Uso tópico
        new("BR0267600", "Dexametasona", "Creme", "0,1%"),
        new("BR0272070", "Miconazol nitrato", "Creme", "2%"),
        new("BR0272980", "Sulfadiazina de prata", "Creme", "1%"),
        new("BR0272020", "Permanganato de potássio", "Comprimido", "100mg"),
    };

    /// <summary>
    /// Busca medicamento por nome (case-insensitive, parcial).
    /// </summary>
    public static IEnumerable<CatmatItem> Search(string query)
    {
        if (string.IsNullOrWhiteSpace(query)) return Enumerable.Empty<CatmatItem>();
        var q = query.ToLowerInvariant().Trim();
        return MedicamentosAps.Where(m =>
            m.Nome.ToLowerInvariant().Contains(q) ||
            m.Codigo.Contains(q));
    }

    /// <summary>
    /// Busca por código CATMAT exato.
    /// </summary>
    public static CatmatItem? GetByCodigo(string codigo)
        => MedicamentosAps.FirstOrDefault(m => m.Codigo == codigo);
}
