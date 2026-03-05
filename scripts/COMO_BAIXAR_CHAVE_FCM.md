# Como baixar a chave FCM v1 (manual)

O navegador do Cursor pode não fazer o download. Use o **Chrome ou Edge** no seu computador.

## Passo 1: Abrir o Firebase

Abra no seu navegador (Chrome/Edge):

**https://console.firebase.google.com/project/renove-ja/settings/serviceaccounts/adminsdk**

## Passo 2: Gerar a chave

1. Na aba **"Contas de serviço"** (já deve estar selecionada)
2. Clique em **"Gerar nova chave privada"**
3. No popup, clique em **"Gerar chave"**
4. O arquivo JSON será baixado (ex: `renove-ja-firebase-adminsdk-xxxxx.json`)

## Passo 3: Se o download não iniciar

- Desative bloqueadores de pop-up para o site do Firebase
- Verifique se o navegador está permitindo downloads
- Confira a pasta **Downloads** do Windows

## Passo 4: Enviar para o EAS

Depois de salvar o JSON:

```powershell
cd c:\Users\anabe\Downloads\renovejatac
.\scripts\fazer-fcm-v1.ps1 "C:\Users\anabe\Downloads\NOME_DO_ARQUIVO.json"
```

Substitua `NOME_DO_ARQUIVO.json` pelo nome real do arquivo baixado.
