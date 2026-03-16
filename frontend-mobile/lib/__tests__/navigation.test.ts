import { nav } from '../navigation';

describe('navigation', () => {
  it('nav.push chama router.push com a rota', () => {
    const router = { push: jest.fn(), replace: jest.fn(), back: jest.fn() };
    nav.push(router as any, '/(auth)/login');
    expect(router.push).toHaveBeenCalledWith('/(auth)/login');
  });

  it('nav.replace chama router.replace com a rota', () => {
    const router = { push: jest.fn(), replace: jest.fn(), back: jest.fn() };
    nav.replace(router as any, '/(patient)/home');
    expect(router.replace).toHaveBeenCalledWith('/(patient)/home');
  });
});
