import { ApiDoctor } from '@/types/doctor';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { StatusBadge } from './StatusBadge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Mail,
  Phone,
  Stethoscope,
  MapPin,
  GraduationCap,
  Building2,
  User,
  CreditCard,
  Calendar,
} from 'lucide-react';
import { format } from 'date-fns';

interface DoctorDetailDialogProps {
  doctor: ApiDoctor | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
}

const InfoItem = ({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: string | null | undefined;
}) => {
  if (!value) return null;
  return (
    <div className="flex items-start gap-2.5 text-sm">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
      <div>
        <p className="text-xs text-muted-foreground/70">{label}</p>
        <p className="text-foreground">{value}</p>
      </div>
    </div>
  );
};

const formatCpf = (cpf: string | null) => {
  if (!cpf) return null;
  return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
};

const formatPostalCode = (code: string | null) => {
  if (!code) return null;
  return code.replace(/(\d{5})(\d{3})/, '$1-$2');
};

const AddressBlock = ({
  street,
  number,
  complement,
  neighborhood,
  city,
  state,
  postalCode,
}: {
  street?: string | null;
  number?: string | null;
  complement?: string | null;
  neighborhood?: string | null;
  city?: string | null;
  state?: string | null;
  postalCode?: string | null;
}) => {
  const line1 = [street, number].filter(Boolean).join(', ');
  const line2 = [complement, neighborhood].filter(Boolean).join(' · ');
  const line3 = [city, state].filter(Boolean).join(' - ');
  const line4 = formatPostalCode(postalCode ?? null);
  const lines = [line1, line2, line3, line4].filter(Boolean);
  if (lines.length === 0) return null;
  return (
    <div className="flex items-start gap-2.5 text-sm">
      <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
      <div>
        {lines.map((l, i) => (
          <p
            key={i}
            className={
              i === 0 ? 'text-foreground' : 'text-xs text-muted-foreground'
            }
          >
            {l}
          </p>
        ))}
      </div>
    </div>
  );
};

export const DoctorDetailDialog = ({
  doctor,
  open,
  onOpenChange,
  onApprove,
  onReject,
}: DoctorDetailDialogProps) => {
  if (!doctor) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <DialogTitle className="text-xl">{doctor.name}</DialogTitle>
            <StatusBadge status={doctor.approvalStatus} />
          </div>
          <DialogDescription>
            CRM {doctor.crm}/{doctor.crmState} · {doctor.specialty}
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="personal" className="w-full">
          <TabsList className="w-full">
            <TabsTrigger value="personal" className="flex-1">
              Pessoal
            </TabsTrigger>
            <TabsTrigger value="professional" className="flex-1">
              Profissional
            </TabsTrigger>
            <TabsTrigger value="academic" className="flex-1">
              Formação
            </TabsTrigger>
          </TabsList>

          <TabsContent value="personal" className="mt-4 space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <InfoItem icon={Mail} label="E-mail" value={doctor.email} />
              <InfoItem
                icon={Phone}
                label="Telefone"
                value={doctor.phone ?? null}
              />
              <InfoItem
                icon={CreditCard}
                label="CPF"
                value={formatCpf(doctor.cpf)}
              />
              <InfoItem
                icon={Calendar}
                label="Data de Nascimento"
                value={
                  doctor.birthDate
                    ? format(new Date(doctor.birthDate), 'dd/MM/yyyy')
                    : null
                }
              />
            </div>
            <div className="border-t border-border pt-3">
              <p className="mb-2 text-xs font-semibold text-muted-foreground">
                Endereço
              </p>
              <AddressBlock
                street={doctor.street}
                number={doctor.number}
                complement={doctor.complement}
                neighborhood={doctor.neighborhood}
                city={doctor.city}
                state={doctor.state}
                postalCode={doctor.postalCode}
              />
            </div>
          </TabsContent>

          <TabsContent value="professional" className="mt-4 space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <InfoItem
                icon={Stethoscope}
                label="Especialidade"
                value={doctor.specialty}
              />
              <InfoItem
                icon={User}
                label="CRM"
                value={`${doctor.crm}/${doctor.crmState}`}
              />
              <InfoItem
                icon={Phone}
                label="Telefone Profissional"
                value={doctor.professionalPhone}
              />
            </div>
            <div className="border-t border-border pt-3">
              <p className="mb-2 text-xs font-semibold text-muted-foreground">
                Endereço Profissional
              </p>
              <AddressBlock
                street={doctor.professionalStreet}
                number={doctor.professionalNumber}
                complement={doctor.professionalComplement}
                neighborhood={doctor.professionalNeighborhood}
                city={doctor.professionalCity}
                state={doctor.professionalState}
                postalCode={doctor.professionalPostalCode}
              />
            </div>
            {doctor.bio && (
              <div className="border-t border-border pt-3">
                <p className="mb-1 text-xs font-semibold text-muted-foreground">
                  Bio
                </p>
                <p className="text-sm text-foreground">{doctor.bio}</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="academic" className="mt-4 space-y-3">
            <InfoItem
              icon={GraduationCap}
              label="Universidade"
              value={doctor.university}
            />
            <InfoItem
              icon={GraduationCap}
              label="Cursos"
              value={doctor.courses}
            />
            <InfoItem
              icon={Building2}
              label="Hospitais / Serviços"
              value={doctor.hospitalsServices}
            />
          </TabsContent>
        </Tabs>

        {doctor.approvalStatus === 'pending' && (
          <DialogFooter className="mt-2 gap-2 sm:gap-0">
            <Button
              variant="outline"
              className="border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
              onClick={() => onReject(doctor.id)}
            >
              Recusar
            </Button>
            <Button
              className="bg-success text-success-foreground hover:bg-success/90"
              onClick={() => onApprove(doctor.id)}
            >
              Aprovar
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
};
