// React 19 removeu o namespace global JSX — componentes antigos usam
// `JSX.Element`. Reexpomos o alias para manter compatibilidade.
import type * as React from 'react';

declare global {
  namespace JSX {
    type Element = React.ReactElement;
    type ElementClass = React.JSX.ElementClass;
    type ElementAttributesProperty = React.JSX.ElementAttributesProperty;
    type ElementChildrenAttribute = React.JSX.ElementChildrenAttribute;
    type LibraryManagedAttributes<C, P> = React.JSX.LibraryManagedAttributes<
      C,
      P
    >;
    type IntrinsicAttributes = React.JSX.IntrinsicAttributes;
    type IntrinsicClassAttributes<T> = React.JSX.IntrinsicClassAttributes<T>;
    type IntrinsicElements = React.JSX.IntrinsicElements;
  }
}

export {};
