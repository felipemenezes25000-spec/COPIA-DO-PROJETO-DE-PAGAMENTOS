# ============================================================
# Atualiza seu IP no Security Group do RDS
# Rode sempre que seu IP mudar ou de outra maquina
# ============================================================

$env:AWS_PAGER = ''
$SG_ID = "sg-0c1576a6727ad37f5"
$REGION = "sa-east-1"

Write-Host "=== Atualizando acesso pgAdmin ===" -ForegroundColor Cyan

# 1. Descobrir IP atual
$myIp = (Invoke-WebRequest -Uri "https://api.ipify.org" -UseBasicParsing).Content
Write-Host "Seu IP atual: $myIp" -ForegroundColor Yellow

# 2. Remover regras antigas de pgAdmin (CIDRs /32)
Write-Host "Removendo IPs antigos..." -ForegroundColor Gray
$rules = aws ec2 describe-security-group-rules --filter "Name=group-id,Values=$SG_ID" --region $REGION --output json | ConvertFrom-Json
foreach ($rule in $rules.SecurityGroupRules) {
    if ($rule.IpProtocol -eq "tcp" -and $rule.FromPort -eq 5432 -and $rule.CidrIpv4 -and $rule.CidrIpv4.EndsWith("/32")) {
        Write-Host "  Removendo $($rule.CidrIpv4)..." -ForegroundColor Gray
        aws ec2 revoke-security-group-ingress --group-id $SG_ID --security-group-rule-ids $rule.SecurityGroupRuleId --region $REGION 2>$null | Out-Null
    }
}

# 3. Adicionar IP atual
Write-Host "Adicionando $myIp..." -ForegroundColor Green
aws ec2 authorize-security-group-ingress --group-id $SG_ID --protocol tcp --port 5432 --cidr "$myIp/32" --region $REGION 2>$null | Out-Null

Write-Host ""
Write-Host "=== Pronto! ===" -ForegroundColor Green
Write-Host "pgAdmin: renoveja-postgres.c54og6486w6w.sa-east-1.rds.amazonaws.com:5432"
Write-Host "Database: renoveja | User: postgres"
