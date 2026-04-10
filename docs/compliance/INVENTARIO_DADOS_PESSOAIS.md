# Inventário de dados pessoais (LGPD)

**Referência:** LGPD art. 37, ANPD. Mapeamento coleta → uso → compartilhamento → retenção.

---

## 1. Dados de identificação e cadastro

| Dado | Coleta | Uso | Compartilhamento | Retenção |
| ------ | ------ | ----- | ------------------ | ---------- |
| Nome | Cadastro (app) | Identificação, prontuário, documentos | Médico; operadores (AWS) | Conta ativa + 5 anos pós-exclusão |
| E-mail | Cadastro, login | Auth, notificações, recuperação senha | Operadores (AWS S3, ECS); não vendido | Idem |
| Telefone | Cadastro | Contato, 2FA, WhatsApp | Operadores; WhatsApp (doc) | Idem |
| CPF | Cadastro | Identificação, emissão fiscal | Operadores; médico (doc assinado); Receita | Idem |
| Data de nascimento | Cadastro | Idade, prontuário | Médico; operadores | Idem |
| Endereço | Cadastro | Documentos médicos, entrega | Médico (PDF); operadores | Idem |
| Senha (hash) | Cadastro | Autenticação | Não compartilhado; criptografado | Idem |

---

## 2. Dados sensíveis de saúde

| Dado | Coleta | Uso | Compartilhamento | Retenção |
| ------ | ------ | ----- | ------------------ | ---------- |
| Imagens receita/exame | Upload (app) | IA, avaliação médica, prontuário | OpenAI; médico; AWS S3 | 20 anos (CFM) |
| Textos (sintomas, meds) | Formulário (app) | Avaliação médica, prontuário | Médico; operadores | Idem |
| Transcrição consulta | Videoconsulta (Deepgram) | Anamnese, prontuário | Deepgram; OpenAI; médico | Idem |
| Conduta médica | Registro do médico | Prontuário, PDF | Paciente; médico; operadores | Idem |
| Anamnese estruturada | IA + médico | Prontuário | Médico; operadores | Idem |

---

## 3. Dados de pagamento

| Dado | Coleta | Uso | Compartilhamento | Retenção |
| ------ | ------ | ----- | ------------------ | ---------- |
| Valor, método, status | Checkout (Mercado Pago) | Processamento, conciliação | Mercado Pago (PSP); operadores | 5 anos (fiscal) |
| Dados de cartão | Mercado Pago (não no app) | Pagamento | Apenas Mercado Pago | Conforme MP |

---

## 4. Dados de interação

| Dado | Coleta | Uso | Compartilhamento | Retenção |
| ------ | ------ | ----- | ------------------ | ---------- |
| Mensagens Dra. Renoveja | Uso do app | Triagem, melhoria | OpenAI (opcional); operadores | 2 anos (analytics) |
| Logs de auditoria | Automático | LGPD, segurança | Apenas interno (service_role) | 5 anos |
| Logs de verificação (QR) | Verificação pública | Segurança, antifraude | Apenas interno | 2 anos |

---

## 5. Dados de médicos

| Dado | Coleta | Uso | Compartilhamento | Retenção |
| ------ | ------ | ----- | ------------------ | ---------- |
| CRM, UF, especialidade | Cadastro | Validação, documentos | Paciente (PDF); InfoSimples; operadores | Enquanto ativa |
| Certificado PFX | Upload | Assinatura digital | Criptografado; não compartilhado | Revogação + 1 ano |
| Bio, foto | Cadastro | Perfil, listagem | Paciente; operadores | Idem |

---

## 6. Resumo de operadores

| Operador | Dados | Finalidade | Localização | DPA |
| ---------- | ------- | ---------- | ------------- | ----- |
| AWS (ECS/RDS) | API, processamento | Backend | Brasil/EUA (conforme região) | Termos AWS |
| OpenAI | Imagens, textos | IA triagem, anamnese | EUA | DPA assinado ✅ |
| Deepgram | Áudio | Transcrição | EUA | Verificar deepgram.com |
| Daily.co | Vídeo/áudio tempo real | Videoconsulta | EUA | DPA assinado ✅ |
| Mercado Pago | Pagamento | PSP | Brasil | Termos MP Cl. 6 (LGPD) ✅ |
| AWS (CloudFront/S3/Amplify) | Frontend web | Hospedagem | Brasil/EUA | Termos AWS |

---

## 7. Prazos de retenção consolidados

| Categoria | Prazo | Base |
| ----------- | ------- | ------ |
| Prontuário | 20 anos | CFM, legislação |
| Pagamentos | 5 anos | Obrigação fiscal |
| Audit logs | 5 anos | LGPD, defesa |
| Dados de conta | Ativa + 5 anos | Defesa, LGPD |
| Logs de verificação | 2 anos | Segurança |
| Analytics/IA (agregado) | 2 anos | Melhoria do serviço |
