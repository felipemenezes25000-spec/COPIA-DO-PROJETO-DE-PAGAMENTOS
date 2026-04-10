/**
 * Skeleton loaders para substituir spinners genéricos.
 * Cada skeleton simula a estrutura real da tela, dando sensação de velocidade.
 */
import type * as React from 'react';
import { cn } from '@/lib/utils';

/** Skeleton base primitive (shadcn-compatible). */
export function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('animate-pulse rounded-md bg-muted', className)}
      {...props}
    />
  );
}

function Bone({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-lg bg-muted', className)} />;
}

/** Skeleton para cards de estatísticas do dashboard (4 cards) */
export function SkeletonStats() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="rounded-lg border border-border/50 bg-card p-5">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <Bone className="h-3.5 w-20" />
              <Bone className="h-8 w-14" />
            </div>
            <Bone className="h-11 w-11 rounded-xl" />
          </div>
        </div>
      ))}
    </div>
  );
}

/** Skeleton para fila de atendimento / lista de pedidos */
export function SkeletonQueue({ count = 5 }: { count?: number }) {
  return (
    <div className="rounded-lg border border-border/50 bg-card">
      <div className="p-6 pb-3">
        <Bone className="h-5 w-40" />
      </div>
      <div className="space-y-2 px-6 pb-4">
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 rounded-xl p-3">
            <Bone className="h-10 w-10 shrink-0 rounded-lg" />
            <div className="flex-1 space-y-1.5">
              <Bone className="h-3.5 w-32" />
              <Bone className="h-3 w-20" />
            </div>
            <Bone className="h-5 w-16 rounded-full" />
            <Bone className="h-3 w-10" />
          </div>
        ))}
      </div>
    </div>
  );
}

/** Skeleton para uma página de detalhe (header + cards) */
export function SkeletonDetail() {
  return (
    <div className="max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Bone className="h-10 w-10 rounded-lg" />
        <div className="space-y-2">
          <Bone className="h-5 w-32" />
          <Bone className="h-3 w-48" />
        </div>
        <div className="ml-auto">
          <Bone className="h-8 w-28 rounded-xl" />
        </div>
      </div>
      {/* Content grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="space-y-3 rounded-lg border border-border/50 bg-card p-6"
            >
              <Bone className="h-4 w-24" />
              <Bone className="h-3 w-full" />
              <Bone className="h-3 w-3/4" />
            </div>
          ))}
        </div>
        <div>
          <div className="space-y-3 rounded-lg border border-border/50 bg-card p-6">
            <Bone className="h-4 w-16" />
            <Bone className="h-10 w-full rounded-lg" />
            <Bone className="h-10 w-full rounded-lg" />
          </div>
        </div>
      </div>
    </div>
  );
}

/** Skeleton para perfil */
export function SkeletonProfile() {
  return (
    <div className="max-w-3xl space-y-6">
      <Bone className="h-6 w-28" />
      <div className="flex items-center gap-6 rounded-lg border bg-card p-6">
        <Bone className="h-24 w-24 rounded-2xl" />
        <div className="space-y-2">
          <Bone className="h-5 w-40" />
          <Bone className="h-3 w-52" />
          <Bone className="h-3 w-36" />
        </div>
      </div>
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="space-y-3 rounded-lg border bg-card p-6">
          <Bone className="h-4 w-32" />
          <Bone className="h-10 w-full rounded-lg" />
          <Bone className="h-10 w-full rounded-lg" />
        </div>
      ))}
    </div>
  );
}

/** Skeleton para notificações */
export function SkeletonNotifications({ count = 6 }: { count?: number }) {
  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <Bone className="h-6 w-36" />
        <Bone className="h-8 w-40 rounded-lg" />
      </div>
      <div className="space-y-2">
        {Array.from({ length: count }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-4 rounded-lg border border-border/50 bg-card p-4"
          >
            <Bone className="h-10 w-10 shrink-0 rounded-xl" />
            <div className="flex-1 space-y-1.5">
              <Bone className="h-3.5 w-48" />
              <Bone className="h-3 w-64" />
            </div>
            <Bone className="h-3 w-10" />
          </div>
        ))}
      </div>
    </div>
  );
}

/** Full page skeleton (for lazy-loaded pages) */
export function SkeletonPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <div className="relative">
          <Bone className="h-12 w-12 rounded-2xl" />
          <div className="absolute inset-0 animate-ping rounded-2xl bg-primary/20" />
        </div>
        <Bone className="h-3 w-24" />
      </div>
    </div>
  );
}
