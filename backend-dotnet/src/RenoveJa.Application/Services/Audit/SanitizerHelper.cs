using System.Collections;
using System.Text.Json;

namespace RenoveJa.Application.Services.Audit;

public static class SanitizerHelper
{
    // Substring-matched keys — used with Contains(). Must be long/specific enough to avoid
    // false positives on benign field names.
    private static readonly HashSet<string> SensitiveKeySubstrings = new(StringComparer.OrdinalIgnoreCase)
    {
        "password", "senha", "passwd", "pwd", "secret",
        "apikey", "api_key", "accesskey", "access_key", "privatekey", "private_key",
        "authorization", "bearer",
        // short standalone-only words like "token", "auth", "rg", "cpf" are handled below
        // via exact-word matching to prevent matching "target", "author", "organ", "urgency", etc.
    };

    // Exact or word-boundary matches — used to avoid matching substrings in unrelated names.
    private static readonly HashSet<string> SensitiveKeyExact = new(StringComparer.OrdinalIgnoreCase)
    {
        "token", "auth", "cpf", "rg", "documento",
        "pfxpassword", "pfx_password",
        "refreshtoken", "refresh_token", "accesstoken", "access_token", "idtoken", "id_token"
    };

    private static readonly char[] KeySeparators = ['_', '-', '.', ':'];

    private const string Redacted = "***REDACTED***";
    private const int MaxDepth = 8;

    public static Dictionary<string, object?> Sanitize(Dictionary<string, object?>? original)
    {
        if (original == null || original.Count == 0) return new Dictionary<string, object?>();

        var sanitized = new Dictionary<string, object?>(original.Count);

        foreach (var kvp in original)
        {
            if (IsSensitiveKey(kvp.Key))
            {
                sanitized[kvp.Key] = Redacted;
            }
            else
            {
                sanitized[kvp.Key] = SanitizeValue(kvp.Value, depth: 1);
            }
        }
        return sanitized;
    }

    private static bool IsSensitiveKey(string key)
    {
        if (string.IsNullOrEmpty(key)) return false;

        // Substring match — only for long/specific tokens that can't collide with benign fields.
        foreach (var k in SensitiveKeySubstrings)
        {
            if (key.Contains(k, StringComparison.OrdinalIgnoreCase)) return true;
        }

        // Exact or word-boundary match for short/common tokens.
        // BUG FIX: previously "auth" matched "author", "rg" matched "urgency"/"target"/"args",
        // "cpf" is fine but the broader rules over-redacted benign audit fields.
        if (SensitiveKeyExact.Contains(key)) return true;

        foreach (var segment in key.Split(KeySeparators, StringSplitOptions.RemoveEmptyEntries))
        {
            if (SensitiveKeyExact.Contains(segment)) return true;
        }

        return false;
    }

    private static object? SanitizeValue(object? value, int depth)
    {
        if (value == null || depth > MaxDepth) return value;

        // String — may be a JSON blob
        if (value is string s)
        {
            return SanitizeStringValue(s, depth);
        }

        // Dictionary<string, object?> (most common nested case)
        if (value is IDictionary<string, object?> sdict)
        {
            var result = new Dictionary<string, object?>(sdict.Count);
            foreach (var kvp in sdict)
            {
                result[kvp.Key] = IsSensitiveKey(kvp.Key) ? Redacted : SanitizeValue(kvp.Value, depth + 1);
            }
            return result;
        }

        // Generic IDictionary
        if (value is IDictionary nonGenericDict)
        {
            var result = new Dictionary<string, object?>();
            foreach (DictionaryEntry entry in nonGenericDict)
            {
                var keyStr = entry.Key?.ToString() ?? string.Empty;
                result[keyStr] = IsSensitiveKey(keyStr) ? Redacted : SanitizeValue(entry.Value, depth + 1);
            }
            return result;
        }

        // IEnumerable (but not string, already handled)
        if (value is IEnumerable enumerable)
        {
            var list = new List<object?>();
            foreach (var item in enumerable)
            {
                list.Add(SanitizeValue(item, depth + 1));
            }
            return list;
        }

        return value;
    }

    private static object? SanitizeStringValue(string s, int depth)
    {
        var trimmed = s.TrimStart();
        if (trimmed.Length == 0) return s;
        var first = trimmed[0];
        if (first != '{' && first != '[') return s;

        // Try to parse as JSON, redact, re-serialize. Fall back to original on any failure.
        try
        {
            using var doc = JsonDocument.Parse(s);
            var converted = JsonElementToObject(doc.RootElement);
            var sanitized = SanitizeValue(converted, depth + 1);
            return JsonSerializer.Serialize(sanitized);
        }
        catch
        {
            return s;
        }
    }

    private static object? JsonElementToObject(JsonElement el)
    {
        switch (el.ValueKind)
        {
            case JsonValueKind.Object:
                var obj = new Dictionary<string, object?>();
                foreach (var prop in el.EnumerateObject())
                {
                    obj[prop.Name] = JsonElementToObject(prop.Value);
                }
                return obj;
            case JsonValueKind.Array:
                var arr = new List<object?>();
                foreach (var item in el.EnumerateArray())
                {
                    arr.Add(JsonElementToObject(item));
                }
                return arr;
            case JsonValueKind.String:
                return el.GetString();
            case JsonValueKind.Number:
                if (el.TryGetInt64(out var l)) return l;
                if (el.TryGetDouble(out var d)) return d;
                return el.GetRawText();
            case JsonValueKind.True: return true;
            case JsonValueKind.False: return false;
            case JsonValueKind.Null:
            case JsonValueKind.Undefined:
            default:
                return null;
        }
    }
}
