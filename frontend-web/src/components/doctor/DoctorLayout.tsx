import { type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { DoctorSidebar } from './DoctorSidebar';
import { Breadcrumbs } from './Breadcrumbs';

interface DoctorLayoutProps {
  children: ReactNode;
  /** Hide sidebar and bottom nav (e.g. video call page) */
  fullscreen?: boolean;
}

export function DoctorLayout({ children, fullscreen }: DoctorLayoutProps) {
  const { pathname } = useLocation();

  if (fullscreen) {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-screen bg-background">
      <DoctorSidebar />

      <main id="main-content" className="min-w-0 flex-1 overflow-auto">
        {/*
          Responsive padding:
          - Mobile: pt-14 (below hamburger button), pb-[4.5rem] (above bottom nav ~56px + safe area),
            px-4 horizontal
          - Tablet/Desktop (md+): no top/bottom compensation needed, sidebar is sticky alongside
        */}
        <div
          key={pathname}
          className="page-enter mx-auto max-w-[1400px] px-4 py-4 pt-14 sm:px-5 md:px-6 md:py-6 md:pt-0 lg:px-8 lg:py-8"
          style={{
            paddingBottom:
              'max(calc(3.5rem + env(safe-area-inset-bottom, 0px) + 1rem), 5rem)',
          }}
        >
          <Breadcrumbs />
          {children}
        </div>
      </main>

      {/*
        Desktop: remove mobile bottom padding via a style override.
        We use a CSS media query approach inline via Tailwind's md: prefix on the wrapper,
        but since the safe-area calc is in inline style, we add a hidden spacer reset.
      */}
      <style>{`
        @media (min-width: 768px) {
          #main-content > .page-enter {
            padding-bottom: 2rem !important;
          }
        }
      `}</style>
    </div>
  );
}
