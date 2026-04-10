/**
 * Sobre o RenoveJá+ — Página institucional.
 */
import { DoctorLayout } from '@/components/doctor/DoctorLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { COMPANY } from '@/lib/company';
import { ArrowLeft, Stethoscope } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function DoctorAbout() {
  return (
    <DoctorLayout>
      <div className="max-w-2xl space-y-6">
        <Link to="/configuracoes">
          <Button variant="ghost" size="sm" className="-ml-2 gap-2">
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Button>
        </Link>
        <Card className="shadow-sm">
          <CardContent className="space-y-4 pt-6">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                <Stethoscope className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-bold">RenoveJá+</h1>
                <p className="text-sm text-muted-foreground">{COMPANY.name}</p>
              </div>
            </div>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Plataforma de telemedicina que conecta pacientes e médicos para
              renovação de receitas, solicitação de exames e consultas online.
              Serviços em conformidade com a Resolução CFM nº 2.314/2022.
            </p>
            <div className="space-y-1 text-sm text-muted-foreground">
              <p>
                <strong>CNPJ:</strong> {COMPANY.cnpj}
              </p>
              <p>
                <strong>Endereço:</strong> {COMPANY.address}
              </p>
              <p>
                <strong>Contato:</strong> {COMPANY.fullContact}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </DoctorLayout>
  );
}
