import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { TouchableOpacity } from 'react-native';
import { Card } from '../components/Card';
import { Input } from '../components/Input';
import { AppButton } from '../components/ui/AppButton';
import { changePassword } from '../lib/api';
import { validate } from '../lib/validation';
import { changePasswordSchema } from '../lib/validation/schemas';
import { colors, spacing } from '../lib/theme';

export default function ChangePasswordScreen() {
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    setError('');
    const result = validate(changePasswordSchema, {
      currentPassword,
      newPassword,
      confirmPassword,
    });
    if (!result.success) {
      setError(result.firstError ?? 'Preencha todos os campos');
      return;
    }

    setLoading(true);
    try {
      await changePassword(result.data!.currentPassword, result.data!.newPassword);
      Alert.alert('Sucesso', 'Senha alterada com sucesso.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (e: any) {
      setError(e?.message || String(e) || 'Erro ao alterar senha. Verifique a senha atual.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={colors.primaryDark} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Alterar Senha</Text>
        <View style={{ width: 24 }} />
      </View>
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="always"
        showsVerticalScrollIndicator={false}
      >
        <Card style={styles.card}>
          <Text style={styles.hint}>Para sua segurança, informe a senha atual e defina uma nova senha com no mínimo 8 caracteres.</Text>
          <Input
            label="Senha atual"
            value={currentPassword}
            onChangeText={setCurrentPassword}
            secureTextEntry
            placeholder="Digite sua senha atual"
            leftIcon="lock-closed-outline"
          />
          <Input
            label="Nova senha"
            value={newPassword}
            onChangeText={setNewPassword}
            secureTextEntry
            placeholder="Digite a nova senha"
            leftIcon="key-outline"
          />
          <Input
            label="Confirmar nova senha"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
            placeholder="Repita a nova senha"
            leftIcon="key-outline"
          />
          {error ? <Text style={styles.errorText}>{error}</Text> : null}
          <AppButton title="Alterar Senha" onPress={handleSubmit} loading={loading} fullWidth />
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: colors.primaryDark },
  scroll: { padding: spacing.lg, paddingBottom: spacing.xxl },
  card: { padding: spacing.lg },
  hint: { fontSize: 14, color: colors.textSecondary, marginBottom: spacing.lg, lineHeight: 20 },
  errorText: { fontSize: 12, fontWeight: '500', color: colors.error, marginBottom: spacing.md },
});
