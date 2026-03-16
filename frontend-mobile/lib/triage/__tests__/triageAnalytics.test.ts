import { trackTriageEvent } from '../triageAnalytics';

describe('triageAnalytics', () => {
  it('trackTriageEvent não lança', () => {
    expect(() => trackTriageEvent('test')).not.toThrow();
    expect(() => trackTriageEvent('open_banner', { source: 'home' })).not.toThrow();
  });
});
