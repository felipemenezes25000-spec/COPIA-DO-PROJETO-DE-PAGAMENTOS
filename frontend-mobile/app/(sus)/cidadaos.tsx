import React, { useState, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, TextInput, Alert, Modal, ScrollView, KeyboardAvoidingView, Platform as RNPlatform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '../../lib/ui/useAppTheme';
import type { DesignColors } from '../../lib/designSystem';
import { validateCns, validateCpf } from '../../lib/validation/sus-validators';
import type { CidadaoDto } from '../../types/sus';

const SUS_GREEN = '#16A34A';

// Mock data for demo
const MOCK_CIDADAOS: CidadaoDto[] = [
  { id: '1', nomeCompleto: 'Maria da Silva', cpf: '123.456.789-00', cns: '898001234567890', dataNascimento: '1985-03-15', sexo: 'F', telefone: '(11) 99999-0001', email: null, nomeMae: 'Ana Silva', nomePai: null, logradouro: 'Rua das Flores', numero: '123', complemento: null, bairro: 'Centro', cidade: 'Jundiaí', estado: 'SP', cep: '13201-000', microarea: '001', codigoFamilia: 'FAM001', unidadeSaudeId: 'ubs-1', unidadeSaudeNome: 'UBS Central', ativo: true, createdAt: '2026-01-15' },
  { id: '2', nomeCompleto: 'João Santos', cpf: '987.654.321-00', cns: '898001234567891', dataNascimento: '1970-08-22', sexo: 'M', telefone: '(11) 99999-0002', email: null, nomeMae: 'Teresa Santos', nomePai: null, logradouro: 'Av. Brasil', numero: '456', complemento: 'Apto 12', bairro: 'Hortolândia', cidade: 'Jundiaí', estado: 'SP', cep: '13202-000', microarea: '002', codigoFamilia: 'FAM002', unidadeSaudeId: 'ubs-2', unidadeSaudeNome: 'UBS Hortolândia', ativo: true, createdAt: '2026-01-20' },
  { id: '3', nomeCompleto: 'Ana Costa', cpf: '456.789.123-00', cns: '898001234567892', dataNascimento: '1992-11-03', sexo: 'F', telefone: '(11) 99999-0003', email: null, nomeMae: 'Rosa Costa', nomePai: null, logradouro: 'Rua São Paulo', numero: '789', complemento: null, bairro: 'Retiro', cidade: 'Jundiaí', estado: 'SP', cep: '13203-000', microarea: '003', codigoFamilia: 'FAM003', unidadeSaudeId: 'ubs-3', unidadeSaudeNome: 'UBS Retiro', ativo: true, createdAt: '2026-02-01' },
  { id: '4', nomeCompleto: 'Pedro Lima', cpf: '321.654.987-00', cns: '898001234567893', dataNascimento: '1958-05-18', sexo: 'M', telefone: '(11) 99999-0004', email: null, nomeMae: 'Joana Lima', nomePai: null, logradouro: 'Rua XV de Novembro', numero: '321', complemento: null, bairro: 'Tulipas', cidade: 'Jundiaí', estado: 'SP', cep: '13204-000', microarea: '004', codigoFamilia: 'FAM004', unidadeSaudeId: 'ubs-1', unidadeSaudeNome: 'UBS Central', ativo: true, createdAt: '2026-02-10' },
  { id: '5', nomeCompleto: 'Francisca Oliveira', cpf: '654.321.789-00', cns: '898001234567894', dataNascimento: '1968-01-28', sexo: 'F', telefone: '(11) 99999-0005', email: null, nomeMae: 'Luiza Oliveira', nomePai: null, logradouro: 'Rua Jundiaí', numero: '654', complemento: null, bairro: 'Rio Branco', cidade: 'Jundiaí', estado: 'SP', cep: '13205-000', microarea: '005', codigoFamilia: 'FAM005', unidadeSaudeId: 'ubs-5', unidadeSaudeNome: 'UBS Rio Branco', ativo: true, createdAt: '2026-02-15' },
];

export default function CidadaosScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useAppTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);

  // ── New citizen form state ──
  const [formNome, setFormNome] = useState('');
  const [formCpf, setFormCpf] = useState('');
  const [formCns, setFormCns] = useState('');
  const [formErrors, setFormErrors] = useState<string[]>([]);
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);

  const checkDuplicate = useCallback((cpf: string, cns: string) => {
    const cleanCpf = cpf.replace(/[\s.\-]/g, '');
    const cleanCns = cns.replace(/[\s.\-]/g, '');
    const dup = MOCK_CIDADAOS.find(c =>
      (cleanCpf.length === 11 && c.cpf?.replace(/[\s.\-]/g, '') === cleanCpf) ||
      (cleanCns.length === 15 && c.cns?.replace(/[\s.\-]/g, '') === cleanCns)
    );
    if (dup) {
      setDuplicateWarning(`Cidadão já cadastrado: ${dup.nomeCompleto} (${dup.cpf})`);
    } else {
      setDuplicateWarning(null);
    }
  }, []);

  const handleSaveCidadao = useCallback(() => {
    const errors: string[] = [];
    if (!formNome.trim()) errors.push('Nome é obrigatório');
    if (formCpf.trim() && !validateCpf(formCpf)) errors.push('CPF inválido');
    if (formCns.trim() && !validateCns(formCns)) errors.push('CNS inválido (15 dígitos, início 1/2/7/8/9)');
    if (!formCpf.trim() && !formCns.trim()) errors.push('CPF ou CNS é obrigatório');

    setFormErrors(errors);
    if (errors.length > 0) return;

    if (duplicateWarning) {
      Alert.alert('Duplicidade', duplicateWarning + '\n\nDeseja continuar mesmo assim?', [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Continuar', onPress: () => { Alert.alert('Cadastro', 'Cidadão salvo com sucesso!'); setShowForm(false); } },
      ]);
      return;
    }

    Alert.alert('Cadastro', 'Cidadão salvo com sucesso!');
    setShowForm(false);
    setFormNome(''); setFormCpf(''); setFormCns('');
    setFormErrors([]); setDuplicateWarning(null);
  }, [formNome, formCpf, formCns, duplicateWarning]);

  const filtered = useMemo(() => {
    if (!search.trim()) return MOCK_CIDADAOS;
    const s = search.toLowerCase();
    return MOCK_CIDADAOS.filter(c =>
      c.nomeCompleto.toLowerCase().includes(s) ||
      c.cpf?.includes(s) ||
      c.cns?.includes(s)
    );
  }, [search]);

  const calcAge = useCallback((dt: string | null) => {
    if (!dt) return '';
    const birth = new Date(dt);
    const age = Math.floor((Date.now() - birth.getTime()) / 31557600000);
    return `${age} anos`;
  }, []);

  const renderCidadao = useCallback(({ item }: { item: CidadaoDto }) => (
    <Pressable style={styles.card} onPress={() => Alert.alert('Cidadão', `Detalhes de ${item.nomeCompleto}`)}>
      <View style={styles.cardHeader}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{item.nomeCompleto.charAt(0)}</Text>
        </View>
        <View style={styles.cardInfo}>
          <Text style={styles.cardName}>{item.nomeCompleto}</Text>
          <Text style={styles.cardSub}>CPF: {item.cpf} • {calcAge(item.dataNascimento)}</Text>
          <Text style={styles.cardSub}>CNS: {item.cns}</Text>
        </View>
      </View>
      <View style={styles.cardFooter}>
        <View style={styles.tag}>
          <Ionicons name="location-outline" size={12} color={colors.textSecondary} />
          <Text style={styles.tagText}>{item.unidadeSaudeNome}</Text>
        </View>
        <View style={styles.tag}>
          <Ionicons name="map-outline" size={12} color={colors.textSecondary} />
          <Text style={styles.tagText}>Microárea {item.microarea}</Text>
        </View>
      </View>
    </Pressable>
  ), [styles, colors, calcAge]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Cadastro de Cidadãos</Text>
        <Pressable style={styles.addBtn} onPress={() => setShowForm(true)}>
          <Ionicons name="add" size={22} color="#fff" />
          <Text style={styles.addBtnText}>Novo</Text>
        </Pressable>
      </View>

      {/* Search */}
      <View style={styles.searchBox}>
        <Ionicons name="search" size={18} color={colors.textMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar por nome, CPF ou CNS..."
          placeholderTextColor={colors.textMuted}
          value={search}
          onChangeText={setSearch}
        />
        {search.length > 0 && (
          <Pressable onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={18} color={colors.textMuted} />
          </Pressable>
        )}
      </View>

      <Text style={styles.resultCount}>{filtered.length} cidadão(s) encontrado(s)</Text>

      {/* List */}
      <FlatList
        data={filtered}
        keyExtractor={item => item.id}
        getItemLayout={(_: unknown, i: number) => ({ length: 72, offset: 72 * i, index: i })}
        renderItem={renderCidadao}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
      />

      {/* Registration Modal */}
      <Modal visible={showForm} animationType="slide" presentationStyle="pageSheet">
        <KeyboardAvoidingView behavior={RNPlatform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1, backgroundColor: colors.background }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: colors.borderLight }}>
            <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text }}>Novo Cidadão</Text>
            <Pressable onPress={() => { setShowForm(false); setFormErrors([]); setDuplicateWarning(null); }}>
              <Ionicons name="close" size={24} color={colors.text} />
            </Pressable>
          </View>
          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }}>
            {formErrors.length > 0 && (
              <View style={{ backgroundColor: '#FEF2F2', borderRadius: 10, padding: 12, marginBottom: 14, borderWidth: 1, borderColor: '#FECACA' }}>
                {formErrors.map((e, i) => (
                  <Text key={i} style={{ fontSize: 13, color: '#991B1B', marginBottom: 2 }}>{e}</Text>
                ))}
              </View>
            )}
            {duplicateWarning && (
              <View style={{ backgroundColor: '#FEF3C7', borderRadius: 10, padding: 12, marginBottom: 14, borderWidth: 1, borderColor: '#FDE68A' }}>
                <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
                  <Ionicons name="warning" size={16} color="#D97706" />
                  <Text style={{ fontSize: 13, color: '#92400E', fontWeight: '600' }}>Possível duplicidade</Text>
                </View>
                <Text style={{ fontSize: 12, color: '#92400E', marginTop: 4 }}>{duplicateWarning}</Text>
              </View>
            )}
            <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text, marginBottom: 6 }}>Nome Completo *</Text>
            <TextInput
              style={{ backgroundColor: colors.surface, borderRadius: 10, padding: 12, fontSize: 15, color: colors.text, borderWidth: 1, borderColor: colors.borderLight, marginBottom: 14 }}
              value={formNome}
              onChangeText={setFormNome}
              placeholder="Nome completo do cidadão"
              placeholderTextColor={colors.textMuted}
            />
            <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text, marginBottom: 6 }}>CPF</Text>
            <TextInput
              style={{ backgroundColor: colors.surface, borderRadius: 10, padding: 12, fontSize: 15, color: colors.text, borderWidth: 1, borderColor: colors.borderLight, marginBottom: 14 }}
              value={formCpf}
              onChangeText={(t) => { setFormCpf(t); checkDuplicate(t, formCns); }}
              placeholder="000.000.000-00"
              placeholderTextColor={colors.textMuted}
              keyboardType="numeric"
            />
            <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text, marginBottom: 6 }}>CNS (Cartão Nacional de Saúde)</Text>
            <TextInput
              style={{ backgroundColor: colors.surface, borderRadius: 10, padding: 12, fontSize: 15, color: colors.text, borderWidth: 1, borderColor: colors.borderLight, marginBottom: 14 }}
              value={formCns}
              onChangeText={(t) => { setFormCns(t); checkDuplicate(formCpf, t); }}
              placeholder="000 0000 0000 0000"
              placeholderTextColor={colors.textMuted}
              keyboardType="numeric"
            />
            <Pressable
              style={{ backgroundColor: SUS_GREEN, paddingVertical: 14, borderRadius: 12, alignItems: 'center', marginTop: 10 }}
              onPress={handleSaveCidadao}
            >
              <Text style={{ color: '#fff', fontWeight: '700', fontSize: 16 }}>Salvar Cidadão</Text>
            </Pressable>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const makeStyles = (colors: DesignColors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },
  title: { fontSize: 22, fontWeight: '700', color: colors.text },
  addBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: SUS_GREEN, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, gap: 4 },
  addBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, marginHorizontal: 16, marginTop: 8, borderWidth: 1, borderColor: colors.borderLight, gap: 8 },
  searchInput: { flex: 1, fontSize: 15, color: colors.text },
  resultCount: { fontSize: 12, color: colors.textMuted, paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4 },
  list: { paddingHorizontal: 16, paddingBottom: 100 },
  card: { backgroundColor: colors.surface, borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: colors.borderLight },
  cardHeader: { flexDirection: 'row', gap: 12 },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: SUS_GREEN + '15', alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 18, fontWeight: '700', color: SUS_GREEN },
  cardInfo: { flex: 1 },
  cardName: { fontSize: 16, fontWeight: '700', color: colors.text },
  cardSub: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  cardFooter: { flexDirection: 'row', gap: 8, marginTop: 10, flexWrap: 'wrap' },
  tag: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.surfaceSecondary, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  tagText: { fontSize: 11, color: colors.textSecondary, fontWeight: '500' },
});
