import { COMPANY } from '../company';

describe('company', () => {
  it('expõe nome e CNPJ', () => {
    expect(COMPANY.name).toBe('RenoveJá Saúde');
    expect(COMPANY.cnpj).toBe('14.376.070/0001-53');
  });

  it('expõe endereço e contato', () => {
    expect(COMPANY.address).toBeTruthy();
    expect(COMPANY.phone).toBe('(11) 98631-8000');
    expect(COMPANY.website).toBe('www.renovejasaude.com.br');
    expect(COMPANY.fullContact).toContain('98631-8000');
    expect(COMPANY.whatsapp).toContain('wa.me');
  });
});
