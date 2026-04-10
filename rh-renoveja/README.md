# Portal RH — RenoveJá+

Portal de recrutamento de profissionais de saúde para a plataforma de telemedicina **RenoveJá+**.

**URL de produção:** `rh.renovejasaude.com.br`

## Stack

- **Framework:** Vite + React 18 + TypeScript
- **Estilo:** Tailwind CSS 3
- **Formulário:** React Hook Form + Zod
- **Animações:** Framer Motion
- **Ícones:** Lucide React
- **HTTP:** Axios
- **Fontes:** DM Serif Display (títulos) + Outfit (corpo)

## Funcionalidades

- Landing page com hero, benefícios, como funciona e FAQ
- Formulário de cadastro em 6 etapas com validação completa
- Upload de documentos (currículo + diploma em PDF)
- Busca automática de endereço via CEP (ViaCEP)
- Persistência de progresso no sessionStorage
- Modo mock (funciona sem backend)
- Política de Privacidade e Termos de Consentimento (LGPD)
- Acessibilidade (labels, focus-visible, aria, teclado)
- Responsivo (mobile-first)

## Setup

```bash
cd rh-renoveja
npm install
npm run dev
```

## Variáveis de ambiente

```bash
cp .env.example .env
```

| Variável | Descrição | Obrigatória |
|----------|-----------|-------------|
| `VITE_API_URL` | URL da API backend | Não (modo mock se vazio) |

## Scripts

| Comando | Descrição |
|---------|-----------|
| `npm run dev` | Servidor de desenvolvimento |
| `npm run build` | Build de produção (dist/) |
| `npm run preview` | Preview do build |
| `npm run lint` | ESLint |
| `npm run format` | Prettier |

## Deploy (S3 + CloudFront)

```bash
npm run build
aws s3 sync dist/ s3://renoveja-rh-frontend --delete
aws cloudfront create-invalidation --distribution-id $CF_DIST_ID --paths "/*"
```

## Estrutura

```
src/
├── components/
│   ├── layout/     Header, Footer, Container
│   ├── ui/         Button, Input, Select, FileUpload, Checkbox, etc.
│   └── sections/   Hero, Benefits, HowItWorks, FAQ
├── pages/          HomePage, CadastroPage, SuccessPage, PrivacidadePage, TermosPage
├── hooks/          useFormPersist, useCepLookup
├── lib/            api, masks, validators, constants
└── types/          TypeScript types
```

## Compliance

- LGPD (Lei 13.709/2018): consentimento explícito, Art. 20 (decisão automatizada)
- Dados armazenados em AWS sa-east-1 (São Paulo), criptografia AES-256
- Retenção: 24 meses para banco de talentos
- DPO: dpo@renovejasaude.com.br
