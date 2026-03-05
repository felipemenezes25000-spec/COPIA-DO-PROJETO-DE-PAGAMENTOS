# Auditoria Supabase — Março 2025

Verificação via MCP Supabase: schema, RLS, migrations e inconsistências.

---

## 1. doctor_patient_notes — OK

A tabela `doctor_patient_notes` (v2) **já está aplicada** no Supabase:

- Colunas: `id`, `doctor_id`, `patient_id`, `note_type`, `content`, `request_id`, `created_at`, `updated_at`
- RLS habilitado
- Políticas: `dpn_select`, `dpn_insert`, `dpn_update`, `dpn_delete` (todas corretas: `doctor_id = auth.uid()`)
- FKs: `users`, `requests`

Nenhuma ação necessária para esta migration.

---

## 2. Migrations duplicadas no histórico

O histórico de migrations no Supabase contém nomes repetidos (versões diferentes):

| Nome                    | Versões                                      |
|-------------------------|-----------------------------------------------|
| create_audit_logs_table | 20260203132200, 20260203133330                |
| create_prescriptions_and_logs | 20260219004100, 20260220224335, 20260225022313 |
| create_saved_cards_table | 20260222040504, 20260222040615                |
| storage_prescriptions_bucket | 20260220121934, 20260220224340, 20260225022318 |
| make_prescriptions_bucket_public | 20260221052043, 20260228180529                |

**Impacto:** Apenas histórico; o schema atual está correto. Pode indicar múltiplas fontes de migrations (Dashboard vs CLI).

---

## 3. RLS redundantes (mesma tabela, mesmo comando)

Políticas duplicadas ou equivalentes para o mesmo `cmd`:

| Tabela        | Comando | Políticas duplicadas                                                                 |
|----------------|---------|--------------------------------------------------------------------------------------|
| chat_messages  | SELECT  | `Participants can view chat`, `chat_messages_select`                               |
| notifications | SELECT  | `User can view own notifications`, `notifications_select_own`                      |
| payments       | SELECT  | `User can view own payments`, `payments_select_own`                                  |
| push_tokens    | SELECT  | `User can view own push tokens`, `push_tokens_select_own`                           |
| users          | SELECT  | `Users can view own profile`, `users_select_own`                                    |
| video_rooms    | SELECT  | `Participants can access video room`, `video_rooms_select`                         |

**Impacto:** RLS com múltiplas políticas PERMISSIVE faz OR entre elas. Duplicatas não causam erro, apenas redundância. Pode ser removidas para simplificar.

---

## 4. Atenção: doctor_profiles

**Política:** `doctor_profiles_select_all` com `qual: true`

- Permite SELECT para qualquer usuário autenticado em qualquer perfil de médico.
- Pode ser intencional (listagem pública de médicos).
- Se não for, representa um risco de exposição de dados.

---

## 5. Tabelas sem RLS (rls_enabled)

| Tabela                | RLS   | Observação                                      |
|-----------------------|-------|--------------------------------------------------|
| ai_suggestions        | false | Acesso via backend; service_role ignora RLS     |
| outbox_events         | false | Tabela interna (outbox pattern)                 |
| user_push_preferences | false | Pode ser intencional; verificar se precisa RLS   |

---

## 6. Resumo do schema

- **Tabelas:** 40+ tabelas em `public`
- **doctor_patient_notes:** v2 aplicada, schema e RLS corretos
- **FKs:** `doctor_patient_notes` referenciando `users` e `requests` corretamente

---

## 7. Recomendações

1. **doctor_patient_notes:** Nenhuma ação necessária.
2. **Migrations duplicadas:** Padronizar fonte (ex.: migrations do repo) e evitar rodar via Dashboard.
3. **RLS redundantes:** Remover políticas duplicadas (manter apenas uma por comando).
4. **doctor_profiles_select_all:** Confirmar se `qual: true` é desejado e documentar.
5. **user_push_preferences:** Avaliar se RLS deve ser habilitado para dados por usuário.

---

## 8. Correções aplicadas (20260306)

**Migration:** `20260306000000_cleanup_rls_redundancias.sql`

- **RLS removidas (duplicatas):** `Participants can view chat`, `User can view own notifications`, `User can view own payments`, `User can view own push tokens`, `Users can view own profile`, `Participants can access video room`
- **Storage removidas:** `prescription_images_select_authenticated`, `prescription_images_insert_authenticated` (mantidas as policies `_own` por ownership)
- **user_push_preferences:** RLS habilitado + policies `user_push_preferences_select_own`, `_insert_own`, `_update_own`
