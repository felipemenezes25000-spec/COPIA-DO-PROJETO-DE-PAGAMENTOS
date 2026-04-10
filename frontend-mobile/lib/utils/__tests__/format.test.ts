import {
  formatBRL,
  formatDateBR,
  formatTimeBR,
  formatDateTimeBR,
  getGreeting,
  timeAgoShort,
  getDateGroupForSection,
  formatRelativeTime,
} from '../format';

describe('formatBRL', () => {
  it('formata valor em Real', () => {
    expect(formatBRL(1)).toMatch(/R\$\s*1[,.]00/);
    expect(formatBRL(1234.56)).toMatch(/R\$\s*1[.,]234[,.]56/);
  });
});

describe('formatDateBR', () => {
  it('formata data ISO (formato longo: dia e mês por extenso)', () => {
    const out = formatDateBR('2025-03-15T12:00:00.000Z');
    expect(out).toMatch(/15/);
    expect(out).toMatch(/2025/);
  });

  it('formato curto com options.short', () => {
    const out = formatDateBR('2025-03-15', { short: true });
    expect(out).toMatch(/\d{2}\/\d{2}\/\d{2}/);
  });

  it('retorna — para data inválida', () => {
    expect(formatDateBR('invalid')).toBe('—');
    expect(formatDateBR(new Date('invalid'))).toBe('—');
  });
});

describe('formatTimeBR', () => {
  it('formata hora', () => {
    const out = formatTimeBR('2025-03-15T14:30:00.000Z');
    expect(out).toMatch(/\d{2}:\d{2}/);
  });

  it('retorna — para data inválida', () => {
    expect(formatTimeBR('invalid')).toBe('—');
  });
});

describe('formatDateTimeBR', () => {
  it('formata data e hora', () => {
    const out = formatDateTimeBR('2025-03-15T14:30:00.000Z');
    expect(out).toMatch(/\d{2}\/\d{2}\/\d{4}\s+\d{2}:\d{2}/);
  });

  it('retorna — para data inválida', () => {
    expect(formatDateTimeBR('invalid')).toBe('—');
  });
});

describe('getGreeting', () => {
  it('retorna uma das saudações', () => {
    const g = getGreeting();
    expect(['Bom dia', 'Boa tarde', 'Boa noite']).toContain(g);
  });
});

describe('timeAgoShort', () => {
  it('retorna Agora para datas recentes', () => {
    expect(timeAgoShort(new Date())).toBe('Agora');
  });

  it('retorna — para data inválida', () => {
    expect(timeAgoShort('invalid')).toBe('—');
  });

  it('retorna X min para menos de 1h', () => {
    const d = new Date(Date.now() - 5 * 60 * 1000);
    expect(timeAgoShort(d)).toBe('5 min');
  });

  it('retorna Xh para menos de 24h', () => {
    const d = new Date(Date.now() - 2 * 3600 * 1000);
    expect(timeAgoShort(d)).toBe('2h');
  });

  it('retorna Ontem para entre 24h e 48h', () => {
    const d = new Date(Date.now() - 25 * 3600 * 1000);
    expect(timeAgoShort(d)).toBe('Ontem');
  });
});

describe('getDateGroupForSection', () => {
  it('retorna Hoje para hoje', () => {
    expect(getDateGroupForSection(new Date())).toBe('Hoje');
  });

  it('retorna Ontem para ontem', () => {
    const d = new Date(Date.now() - 86400000);
    expect(getDateGroupForSection(d)).toBe('Ontem');
  });

  it('retorna Esta semana para menos de 7 dias', () => {
    const d = new Date(Date.now() - 3 * 86400000);
    expect(getDateGroupForSection(d)).toBe('Esta semana');
  });

  it('retorna — para data inválida', () => {
    expect(getDateGroupForSection('invalid')).toBe('—');
  });
});

describe('formatRelativeTime', () => {
  it('retorna Agora para agora', () => {
    expect(formatRelativeTime(new Date())).toBe('Agora');
  });

  it('retorna Há X min para menos de 60 min', () => {
    const d = new Date(Date.now() - 30 * 60 * 1000);
    expect(formatRelativeTime(d)).toBe('Há 30 min');
  });

  it('retorna Há X h para menos de 24h', () => {
    const d = new Date(Date.now() - 2 * 3600 * 1000);
    expect(formatRelativeTime(d)).toBe('Há 2 h');
  });

  it('retorna Há X dias para menos de 7 dias', () => {
    const d = new Date(Date.now() - 3 * 86400000);
    expect(formatRelativeTime(d)).toBe('Há 3 dias');
  });

  it('retorna — para data inválida', () => {
    expect(formatRelativeTime('invalid')).toBe('—');
  });
});
