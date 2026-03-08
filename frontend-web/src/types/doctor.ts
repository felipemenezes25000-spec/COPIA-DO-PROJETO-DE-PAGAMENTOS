export type DoctorStatus = "pending" | "approved" | "rejected";

export interface ApiDoctor {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  avatarUrl: string | null;
  crm: string;
  crmState: string;
  specialty: string;
  bio: string | null;
  rating: number;
  totalConsultations: number;
  available: boolean;
  approvalStatus: DoctorStatus;
  birthDate: string | null;
  cpf: string | null;
  street: string | null;
  number: string | null;
  neighborhood: string | null;
  complement: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  professionalAddress: string | null;
  professionalPhone: string | null;
  professionalPostalCode: string | null;
  professionalStreet: string | null;
  professionalNumber: string | null;
  professionalNeighborhood: string | null;
  professionalComplement: string | null;
  professionalCity: string | null;
  professionalState: string | null;
  university: string | null;
  courses: string | null;
  hospitalsServices: string | null;
}
