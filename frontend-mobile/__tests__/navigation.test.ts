/**
 * navigation.test.ts — nav.push e nav.replace com router fake
 * Destino: frontend-mobile/__tests__/navigation.test.ts
 */

import { nav } from '../lib/navigation';

function makeRouter() {
  return {
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
  };
}

describe('nav.push', () => {
  it('chama router.push com a rota fornecida', () => {
    const router = makeRouter();
    nav.push(router, '/(patient)/home');
    expect(router.push).toHaveBeenCalledWith('/(patient)/home');
  });

  it('chama router.push com rota dinâmica', () => {
    const router = makeRouter();
    nav.push(router, '/request-detail/req-123');
    expect(router.push).toHaveBeenCalledWith('/request-detail/req-123');
  });

  it('chama router.push com rota de vídeo', () => {
    const router = makeRouter();
    nav.push(router, '/video/room-abc');
    expect(router.push).toHaveBeenCalledWith('/video/room-abc');
  });

  it('não chama router.replace', () => {
    const router = makeRouter();
    nav.push(router, '/(auth)/login');
    expect(router.replace).not.toHaveBeenCalled();
  });
});

describe('nav.replace', () => {
  it('chama router.replace com a rota fornecida', () => {
    const router = makeRouter();
    nav.replace(router, '/(doctor)/dashboard');
    expect(router.replace).toHaveBeenCalledWith('/(doctor)/dashboard');
  });

  it('não chama router.push', () => {
    const router = makeRouter();
    nav.replace(router, '/onboarding');
    expect(router.push).not.toHaveBeenCalled();
  });

  it('chama router.replace com rota de auth', () => {
    const router = makeRouter();
    nav.replace(router, '/(auth)/login');
    expect(router.replace).toHaveBeenCalledWith('/(auth)/login');
  });
});
