/**
 * DoctorAiRejectedList — Lista de pedidos rejeitados pela IA.
 *
 * Integrada ao DoctorLayout para herdar sidebar, dark mode, command palette
 * e animações de página. Antes era uma página órfã sem layout, com visual
 * inconsistente com o resto do portal.
 */
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { DoctorLayout } from '@/components/doctor/DoctorLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { fetchAiRejectedRequests } from '@/services/doctor-api-requests';
import type { MedicalRequest } from '@/services/doctorApi';
import {
  getTypeIcon,
  getTypeLabel,
  formatDateSafe,
} from '@/lib/doctor-helpers';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import {
  Loader2,
  AlertTriangle,
  ArrowRight,
  RefreshCw,
  ShieldAlert,
} from 'lucide-react';

export default function DoctorAiRejectedList() {
  const navigate = useNavigate();
  const [items, setItems] = useState<MedicalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);

  useEffect(() => {
    document.title = 'Rejeitados pela IA — RenoveJá+';
    return () => {
      document.title = 'RenoveJá+';
    };
  }, []);

  const loadItems = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchAiRejectedRequests();
      setItems(data);
      setFetchError(false);
    } catch {
      setItems([]);
      setFetchError(true);
      toast.error('Erro ao carregar pedidos rejeitados pela IA.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  return (
    <DoctorLayout>
      <div className="w-full max-w-3xl space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
              <ShieldAlert className="h-6 w-6 text-amber-600" />
              Rejeitados pela IA
            </h1>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {items.length > 0
                ? `${items.length} ${items.length === 1 ? 'pedido rejeitado' : 'pedidos rejeitados'} pela análise automática`
                : 'Pedidos rejeitados pela análise automática da IA clínica'}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={loadItems}
            disabled={loading}
            className="shrink-0 gap-2 self-start sm:self-auto"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            Atualizar
          </Button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : fetchError ? (
          <Card className="border-destructive/30 shadow-sm">
            <CardContent className="py-16 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-destructive/10">
                <AlertTriangle className="h-8 w-8 text-destructive" />
              </div>
              <p className="font-medium text-destructive">
                Erro ao carregar lista
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Verifique sua conexão e tente novamente
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-4"
                onClick={loadItems}
              >
                Tentar novamente
              </Button>
            </CardContent>
          </Card>
        ) : items.length === 0 ? (
          <Card className="shadow-sm">
            <CardContent className="py-16 text-center">
              <ShieldAlert className="mx-auto mb-3 h-12 w-12 text-muted-foreground/50" />
              <p className="font-medium text-muted-foreground">
                Nenhum pedido rejeitado
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                A IA clínica não rejeitou nenhum pedido no momento
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {items.map((item, i) => {
              const TypeIcon = getTypeIcon(item.type);
              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <Card
                    onClick={() => navigate(`/pedidos/${item.id}`)}
                    className="cursor-pointer border-l-[3px] border-l-amber-500 shadow-sm transition-all hover:shadow-md"
                  >
                    <CardContent className="p-4">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
                        {/* Icon + Info */}
                        <div className="flex min-w-0 flex-1 items-center gap-3 sm:gap-4">
                          <div className="shrink-0 rounded-xl bg-amber-500/10 p-2.5">
                            <TypeIcon className="h-5 w-5 text-amber-600" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="truncate text-sm font-medium">
                                {item.patientName || 'Paciente'}
                              </p>
                              <Badge
                                variant="outline"
                                className="whitespace-nowrap text-[10px]"
                              >
                                {getTypeLabel(item.type)}
                              </Badge>
                              <Badge
                                variant="outline"
                                className="whitespace-nowrap border-amber-500/40 bg-amber-500/10 text-[10px] text-amber-700"
                              >
                                Rejeitado pela IA
                              </Badge>
                            </div>
                            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                              {item.aiRejectedAt && (
                                <span>{formatDateSafe(item.aiRejectedAt)}</span>
                              )}
                            </div>
                            {item.aiRejectionReason && (
                              <p className="mt-1.5 text-xs text-foreground/80">
                                <span className="font-medium text-foreground">
                                  Motivo IA:
                                </span>{' '}
                                {item.aiRejectionReason}
                              </p>
                            )}
                          </div>
                        </div>
                        {/* Action */}
                        <div className="shrink-0 pl-[52px] sm:pl-0">
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-1.5 whitespace-nowrap"
                          >
                            Revisar
                            <ArrowRight className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </DoctorLayout>
  );
}
