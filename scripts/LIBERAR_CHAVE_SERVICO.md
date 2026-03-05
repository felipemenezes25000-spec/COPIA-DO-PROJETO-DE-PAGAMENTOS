# Liberar criação de chaves de conta de serviço

A política `iam.disableServiceAccountKeyCreation` está bloqueando. Como **administrador** que criou a conta, use uma das opções abaixo.

---

## Opção 1: Cloud Shell (mais rápido – gcloud já vem instalado)

1. Abra: https://console.cloud.google.com/iam-admin/orgpolicies/iam-disableServiceAccountKeyCreation?project=renove-ja

2. Clique em **"Ativar o Cloud Shell"** (ícone de terminal no topo).

3. Quando o terminal abrir, cole e execute:

```bash
cat > /tmp/key-creation.yaml << 'EOF'
name: projects/renove-ja/policies/iam.disableServiceAccountKeyCreation
spec:
  rules:
  - enforce: false
EOF

gcloud org-policies set-policy /tmp/key-creation.yaml
```

4. Aguarde 2–5 minutos para propagar.

5. Gere a chave no Firebase: https://console.firebase.google.com/project/renove-ja/settings/serviceaccounts/adminsdk

---

## Opção 2: Pelo Console (manual)

1. Abra: https://console.cloud.google.com/iam-admin/orgpolicies/iam-disableServiceAccountKeyCreation?project=renove-ja

2. Clique em **"Gerenciar política"**.

3. Se aparecer **"Substituir política do pai"** ou **"Override parent policy"**, clique e selecione **"Desativar"** (Allow / Não aplicar).

4. Se aparecer **"Você precisa de acesso adicional"**, vá para a seção **Permissões** abaixo.

5. Salve e aguarde 2–5 minutos.

6. Gere a chave: https://console.firebase.google.com/project/renove-ja/settings/serviceaccounts/adminsdk

---

## Opção 3: gcloud local

Se tiver o Google Cloud SDK instalado:

```powershell
.\scripts\liberar-chave-servico.ps1
```

Ou manualmente:

```powershell
# Instale: https://cloud.google.com/sdk/docs/install
gcloud auth login
gcloud config set project renove-ja

# Criar e aplicar override
@"
name: projects/renove-ja/policies/iam.disableServiceAccountKeyCreation
spec:
  rules:
  - enforce: false
"@ | Out-File -FilePath key-creation.yaml -Encoding utf8

gcloud org-policies set-policy key-creation.yaml
Remove-Item key-creation.yaml
```

---

## Se aparecer "Você precisa de acesso adicional"

Você precisa do papel **Administrador da política da organização** (`roles/orgpolicy.policyAdmin`):

1. Abra: https://console.cloud.google.com/iam-admin/iam?project=renove-ja

2. Encontre seu usuário (ex.: contato@renovejasaude.com.br).

3. Clique em **Editar** (ícone de lápis).

4. Clique em **"Adicionar outro papel"**.

5. Procure e selecione **"Administrador da política da organização"**.

6. Salve.

7. Volte e tente novamente a Opção 1 ou 2.

---

## Projeto em uma organização

Se o projeto `renove-ja` estiver em uma **organização** Google Cloud (ex.: Workspace), a política pode estar definida no nível da organização. Nesse caso:

1. Acesse as políticas no nível da **organização** (não do projeto).
2. Ou peça ao administrador da organização para adicionar uma exceção para o projeto `renove-ja`.
