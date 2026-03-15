# ============================================================
# Criar certificados ACM para HTTPS
# ============================================================

$ErrorActionPreference = "Stop"
$env:AWS_PAGER = ''

Write-Host "=== Criando Certificados ACM ===" -ForegroundColor Cyan
Write-Host ""

# 1. Certificado para ALB (sa-east-1) — api.renovejasaude.com.br
Write-Host "[1/2] Certificado para API (sa-east-1)" -ForegroundColor Yellow
$apiCert = aws acm request-certificate `
    --domain-name "api.renovejasaude.com.br" `
    --validation-method DNS `
    --region sa-east-1 `
    --output json | ConvertFrom-Json

$apiCertArn = $apiCert.CertificateArn
Write-Host "  ARN: $apiCertArn" -ForegroundColor Gray

Write-Host ""

# 2. Certificado para CloudFront (us-east-1 OBRIGATORIO) — renovejasaude.com.br + www
Write-Host "[2/2] Certificado para Frontend (us-east-1)" -ForegroundColor Yellow
$frontCert = aws acm request-certificate `
    --domain-name "renovejasaude.com.br" `
    --subject-alternative-names "www.renovejasaude.com.br" `
    --validation-method DNS `
    --region us-east-1 `
    --output json | ConvertFrom-Json

$frontCertArn = $frontCert.CertificateArn
Write-Host "  ARN: $frontCertArn" -ForegroundColor Gray

Write-Host ""
Write-Host "=== Certificados Criados ===" -ForegroundColor Green
Write-Host ""

# Aguardar propagação e mostrar registros DNS para validação
Start-Sleep -Seconds 5

Write-Host "=== Registros DNS para validar no Registro.br ===" -ForegroundColor Cyan
Write-Host ""

Write-Host "[API Certificate - sa-east-1]" -ForegroundColor Yellow
aws acm describe-certificate --certificate-arn $apiCertArn --region sa-east-1 --query "Certificate.DomainValidationOptions[*].{Domain: DomainName, CNAME_Name: ResourceRecord.Name, CNAME_Value: ResourceRecord.Value}" --output table

Write-Host ""
Write-Host "[Frontend Certificate - us-east-1]" -ForegroundColor Yellow
aws acm describe-certificate --certificate-arn $frontCertArn --region us-east-1 --query "Certificate.DomainValidationOptions[*].{Domain: DomainName, CNAME_Name: ResourceRecord.Name, CNAME_Value: ResourceRecord.Value}" --output table

Write-Host ""
Write-Host "=== INSTRUCOES ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Va em https://registro.br e acesse o painel do dominio renovejasaude.com.br" -ForegroundColor White
Write-Host "2. Adicione os registros CNAME mostrados acima para validar os certificados" -ForegroundColor White
Write-Host "3. Apos validacao (~5 min), adicione:" -ForegroundColor White
Write-Host "   CNAME  api    -> renoveja-alb-1239997187.sa-east-1.elb.amazonaws.com" -ForegroundColor Green
Write-Host "   CNAME  www    -> d2u0wdu42tdqh3.cloudfront.net" -ForegroundColor Green
Write-Host "   ALIAS  @      -> d2u0wdu42tdqh3.cloudfront.net  (ou redirecionar para www)" -ForegroundColor Green
Write-Host ""
Write-Host "4. Depois de validados, rode:" -ForegroundColor White
Write-Host "   # Adicionar HTTPS ao ALB:" -ForegroundColor Gray
Write-Host "   aws elbv2 create-listener --load-balancer-arn arn:aws:elasticloadbalancing:sa-east-1:064212133215:loadbalancer/app/renoveja-alb/fba7020345418a84 --protocol HTTPS --port 443 --certificates CertificateArn=$apiCertArn --default-actions Type=forward,TargetGroupArn=arn:aws:elasticloadbalancing:sa-east-1:064212133215:targetgroup/renoveja-api-tg/d2c18c77ff3a0387 --ssl-policy ELBSecurityPolicy-TLS13-1-2-2021-06 --region sa-east-1" -ForegroundColor Gray
Write-Host ""
Write-Host "Salve estes ARNs:" -ForegroundColor Yellow
Write-Host "  API cert:      $apiCertArn" -ForegroundColor White
Write-Host "  Frontend cert:  $frontCertArn" -ForegroundColor White
