import { DoctorStatus } from "@/types/doctor";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const statusConfig: Record<DoctorStatus, { label: string; className: string }> = {
  pending: { label: "Pendente", className: "bg-warning/15 text-warning border-warning/30" },
  approved: { label: "Aprovado", className: "bg-success/15 text-success border-success/30" },
  rejected: { label: "Recusado", className: "bg-destructive/15 text-destructive border-destructive/30" },
};

export const StatusBadge = ({ status }: { status: DoctorStatus }) => {
  const config = statusConfig[status];
  if (!config) return null;
  return (
    <Badge variant="outline" className={cn("font-medium", config.className)}>
      {config.label}
    </Badge>
  );
};
