import { useCallback, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Save, Undo2 } from 'lucide-react';
import { toast } from 'sonner';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { AiInsightsPanel } from '@/components/admin/ai/AiInsightsPanel';
import { Button } from '@/components/ui/button';
import { AparenciaSection } from '@/components/admin/configuracoes/AparenciaSection';
import { ApiWebhooksSection } from '@/components/admin/configuracoes/ApiWebhooksSection';
import { BackupSection } from '@/components/admin/configuracoes/BackupSection';
import { ConfigSidebar } from '@/components/admin/configuracoes/ConfigSidebar';
import { IntegracoesSection } from '@/components/admin/configuracoes/IntegracoesSection';
import { NotificacoesSection } from '@/components/admin/configuracoes/NotificacoesSection';
import { OrganizacaoSection } from '@/components/admin/configuracoes/OrganizacaoSection';
import { PerfilSection } from '@/components/admin/configuracoes/PerfilSection';
import { SegurancaSection } from '@/components/admin/configuracoes/SegurancaSection';
import { SobreSection } from '@/components/admin/configuracoes/SobreSection';
import { UsuariosSection } from '@/components/admin/configuracoes/UsuariosSection';
import type { SectionId } from '@/components/admin/configuracoes/types';

const AdminConfiguracoes = () => {
  const [active, setActive] = useState<SectionId>('perfil');
  const [dirty, setDirty] = useState(false);

  const markDirty = useCallback(() => {
    setDirty(true);
  }, []);

  const handleSave = useCallback(() => {
    setDirty(false);
    toast.success('Configurações salvas com sucesso');
  }, []);

  const handleDiscard = useCallback(() => {
    setDirty(false);
    toast.info('Alterações descartadas');
  }, []);

  const renderSection = useMemo(() => {
    switch (active) {
      case 'perfil':
        return <PerfilSection key="perfil" onDirty={markDirty} />;
      case 'organizacao':
        return <OrganizacaoSection key="organizacao" onDirty={markDirty} />;
      case 'usuarios':
        return <UsuariosSection key="usuarios" />;
      case 'notificacoes':
        return <NotificacoesSection key="notificacoes" onDirty={markDirty} />;
      case 'integracoes':
        return <IntegracoesSection key="integracoes" />;
      case 'seguranca':
        return <SegurancaSection key="seguranca" onDirty={markDirty} />;
      case 'aparencia':
        return <AparenciaSection key="aparencia" onDirty={markDirty} />;
      case 'api':
        return <ApiWebhooksSection key="api" />;
      case 'backup':
        return <BackupSection key="backup" />;
      case 'sobre':
        return <SobreSection key="sobre" />;
      default:
        return null;
    }
  }, [active, markDirty]);

  return (
    <AdminLayout>
      <div className="space-y-6 pb-24">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Configurações</h1>
            <p className="text-sm text-muted-foreground">
              Gerencie sua conta, organização, integrações e segurança do
              painel.
            </p>
          </div>
        </div>

        <AiInsightsPanel scope="admin" maxItems={2} compact />

        <div className="flex flex-col gap-6 lg:flex-row">
          <ConfigSidebar active={active} onChange={setActive} />

          <div className="min-w-0 flex-1">
            <AnimatePresence mode="wait">
              <motion.div
                key={active}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                {renderSection}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        <AnimatePresence>
          {dirty && (
            <motion.div
              initial={{ y: 80, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 80, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 320, damping: 30 }}
              className="fixed inset-x-4 bottom-4 z-40 lg:left-auto lg:right-6 lg:w-[420px]"
            >
              <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-background/95 p-3 shadow-lg backdrop-blur">
                <div className="flex min-w-0 items-center gap-2">
                  <div className="h-2 w-2 animate-pulse rounded-full bg-amber-500" />
                  <p className="truncate text-sm font-medium">
                    Você tem alterações não salvas
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Button variant="ghost" size="sm" onClick={handleDiscard}>
                    <Undo2 className="mr-1 h-4 w-4" /> Descartar
                  </Button>
                  <Button size="sm" onClick={handleSave}>
                    <Save className="mr-1 h-4 w-4" /> Salvar
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </AdminLayout>
  );
};

export default AdminConfiguracoes;
