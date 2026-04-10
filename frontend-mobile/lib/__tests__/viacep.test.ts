import { fetchAddressByCep } from '../viacep';

describe('viacep', () => {
  beforeEach(() => {
    global.fetch = jest.fn();
  });

  it('lança se CEP não tem 8 dígitos', async () => {
    await expect(fetchAddressByCep('123')).rejects.toThrow('CEP deve ter 8 dígitos.');
    await expect(fetchAddressByCep('')).rejects.toThrow('CEP deve ter 8 dígitos.');
    await expect(fetchAddressByCep('1234')).rejects.toThrow('CEP deve ter 8 dígitos.');
  });

  it('aceita CEP com máscara e remove não-dígitos', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        logradouro: 'Rua Teste',
        bairro: 'Centro',
        localidade: 'São Paulo',
        uf: 'SP',
      }),
    });
    const out = await fetchAddressByCep('01310-100');
    expect(out).toEqual({
      street: 'Rua Teste',
      neighborhood: 'Centro',
      city: 'São Paulo',
      state: 'SP',
    });
    expect(global.fetch).toHaveBeenCalledWith(
      'https://viacep.com.br/ws/01310100/json/',
      expect.any(Object)
    );
  });

  it('lança se res.ok é false', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: false });
    await expect(fetchAddressByCep('01310100')).rejects.toThrow(
      'Não foi possível consultar o CEP'
    );
  });

  it('lança se API retorna erro (CEP não encontrado)', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ erro: true }),
    });
    await expect(fetchAddressByCep('01310100')).rejects.toThrow('CEP não encontrado.');
  });

  it('retorna campos vazios como string vazia quando API não envia', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({}),
    });
    const out = await fetchAddressByCep('01310100');
    expect(out.street).toBe('');
    expect(out.neighborhood).toBe('');
    expect(out.city).toBe('');
    expect(out.state).toBe('');
  });
});
