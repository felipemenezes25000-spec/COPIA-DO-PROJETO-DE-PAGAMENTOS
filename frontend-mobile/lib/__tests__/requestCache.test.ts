import { cacheRequest, getCachedRequest } from '../requestCache';

const mockRequest = (id: string) =>
  ({ id, status: 'submitted', requestType: 'prescription' } as any);

describe('requestCache', () => {
  it('getCachedRequest retorna undefined para id não cacheado', () => {
    expect(getCachedRequest('inexistente')).toBeUndefined();
  });

  it('cacheRequest e getCachedRequest roundtrip', () => {
    const r = mockRequest('req-1');
    cacheRequest(r);
    expect(getCachedRequest('req-1')).toEqual(r);
  });

  it('sobrescreve quando mesmo id é cacheado de novo', () => {
    cacheRequest(mockRequest('req-2'));
    const updated = mockRequest('req-2');
    (updated as any).status = 'in_review';
    cacheRequest(updated);
    expect(getCachedRequest('req-2')?.status).toBe('in_review');
  });
});
