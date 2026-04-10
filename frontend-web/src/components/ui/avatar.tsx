import * as React from 'react';
import { cn } from '@/lib/utils';

type AvatarContextValue = {
  imageStatus: 'idle' | 'loaded' | 'error';
  setImageStatus: (status: 'idle' | 'loaded' | 'error') => void;
};

const AvatarContext = React.createContext<AvatarContextValue | null>(null);

const useAvatarContext = () => {
  const ctx = React.useContext(AvatarContext);
  if (!ctx) {
    throw new Error('Avatar subcomponents must be used within <Avatar>');
  }
  return ctx;
};

const Avatar = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, children, ...props }, ref) => {
  const [imageStatus, setImageStatus] = React.useState<
    'idle' | 'loaded' | 'error'
  >('idle');
  const value = React.useMemo(
    () => ({ imageStatus, setImageStatus }),
    [imageStatus]
  );

  return (
    <AvatarContext.Provider value={value}>
      <div
        ref={ref}
        className={cn(
          'relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full bg-muted',
          className
        )}
        {...props}
      >
        {children}
      </div>
    </AvatarContext.Provider>
  );
});
Avatar.displayName = 'Avatar';

export type AvatarImageProps = React.ImgHTMLAttributes<HTMLImageElement>;

const AvatarImage = React.forwardRef<HTMLImageElement, AvatarImageProps>(
  ({ className, onLoad, onError, alt = '', ...props }, ref) => {
    const { imageStatus, setImageStatus } = useAvatarContext();

    if (imageStatus === 'error') return null;

    return (
      <img
        ref={ref}
        alt={alt}
        className={cn('aspect-square h-full w-full object-cover', className)}
        onLoad={(e) => {
          setImageStatus('loaded');
          onLoad?.(e);
        }}
        onError={(e) => {
          setImageStatus('error');
          onError?.(e);
        }}
        {...props}
      />
    );
  }
);
AvatarImage.displayName = 'AvatarImage';

const AvatarFallback = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, children, ...props }, ref) => {
  const { imageStatus } = useAvatarContext();

  if (imageStatus === 'loaded') return null;

  return (
    <div
      ref={ref}
      className={cn(
        'flex h-full w-full items-center justify-center rounded-full bg-muted text-sm font-medium text-muted-foreground',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
});
AvatarFallback.displayName = 'AvatarFallback';

export { Avatar, AvatarImage, AvatarFallback };
