# Atualizar URLs para HTTPS no SSM
$env:AWS_PAGER = ''
aws ssm put-parameter --name "/renoveja/prod/Api__BaseUrl" --value "https://api.renovejasaude.com.br" --type String --overwrite --region sa-east-1 | Out-Null
aws ssm put-parameter --name "/renoveja/prod/Verification__BaseUrl" --value "https://api.renovejasaude.com.br/api/verify" --type String --overwrite --region sa-east-1 | Out-Null
aws ssm put-parameter --name "/renoveja/prod/MercadoPago__NotificationUrl" --value "https://api.renovejasaude.com.br/api/payments/webhook" --type String --overwrite --region sa-east-1 | Out-Null
Write-Host "SSM atualizado com HTTPS URLs" -ForegroundColor Green
