import AsyncStorage from '@react-native-async-storage/async-storage';
import { isOnboardingDone, markOnboardingDone } from '../onboarding';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

describe('onboarding', () => {
  beforeEach(() => (AsyncStorage as any).clear?.());

  it('isOnboardingDone retorna false quando chave não está setada', async () => {
    expect(await isOnboardingDone()).toBe(false);
  });

  it('isOnboardingDone retorna true quando chave é "true"', async () => {
    await AsyncStorage.setItem('@renoveja:onboarding_done_v1', 'true');
    expect(await isOnboardingDone()).toBe(true);
  });

  it('isOnboardingDone retorna false quando chave é outro valor', async () => {
    await AsyncStorage.setItem('@renoveja:onboarding_done_v1', 'false');
    expect(await isOnboardingDone()).toBe(false);
  });

  it('markOnboardingDone persiste "true"', async () => {
    await markOnboardingDone();
    expect(await AsyncStorage.getItem('@renoveja:onboarding_done_v1')).toBe('true');
  });

  it('isOnboardingDone retorna true em caso de erro de leitura', async () => {
    jest.spyOn(AsyncStorage, 'getItem').mockRejectedValueOnce(new Error('read error'));
    expect(await isOnboardingDone()).toBe(true);
  });
});
