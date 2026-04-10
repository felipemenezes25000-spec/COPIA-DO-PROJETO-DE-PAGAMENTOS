import { ReactNode } from 'react';
import { Separator } from '@/components/ui/separator';
import { RhSidebar } from './RhSidebar';
import { RhPageHeader } from './RhPageHeader';

export interface RhLayoutProps {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  actions?: ReactNode;
}

/**
 * RhLayout — shell interno do Portal RH.
 *
 * Vive DENTRO do AdminLayout: a AdminSidebar principal continua à esquerda,
 * e este layout adiciona um "left rail" de subnavegação específica de RH
 * na área de conteúdo do admin.
 */
export const RhLayout = ({
  children,
  title,
  subtitle,
  actions,
}: RhLayoutProps) => {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground lg:flex-row">
      <RhSidebar />
      <main className="min-w-0 flex-1 overflow-auto">
        <div className="mx-auto w-full max-w-7xl p-5 lg:p-8">
          {(title || actions) && (
            <>
              <RhPageHeader
                title={title ?? 'Portal RH'}
                subtitle={subtitle}
                actions={actions}
              />
              <Separator className="my-5" />
            </>
          )}
          {children}
        </div>
      </main>
    </div>
  );
};

export default RhLayout;
