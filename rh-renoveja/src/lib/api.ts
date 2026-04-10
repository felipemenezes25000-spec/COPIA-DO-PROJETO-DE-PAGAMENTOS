import axios from 'axios';
import type { CandidateFormData, ApiResponse } from '../types';
import { saveCandidate } from './candidate-store';

const API_URL = import.meta.env.VITE_API_URL;

const api = API_URL ? axios.create({ baseURL: API_URL, timeout: 30000 }) : null;

// Backend response from POST /api/doctors/from-hr (HrDoctorOnboardingResponseDto)
interface HrOnboardingResponse {
  userId: string;
  email: string;
  profileComplete: boolean;
  protocolo: string | null;
  message: string;
}

export async function submitCandidate(data: CandidateFormData): Promise<ApiResponse> {
  // Mock mode — persist to localStorage so admin panel can see it
  if (!api) {
    await new Promise(resolve => setTimeout(resolve, 2000));
    const { id, protocolo } = saveCandidate(data);
    return { id, protocolo, message: 'Cadastro recebido com sucesso' };
  }

  // Single-phase onboarding: POST /api/doctors/from-hr (JSON) creates the
  // User + DoctorProfile and returns { userId, protocolo: "RJ-2026-000042", ... }.
  // Nenhum documento é anexado no cadastro — o fluxo de documentos foi
  // removido do portal do RH.
  const payload = {
    nome: data.nome,
    cpf: data.cpf.replace(/\D/g, ''),
    email: data.email,
    telefone: data.telefone.replace(/\D/g, ''),
    nascimento: data.nascimento,
    genero: data.genero,
    cep: data.cep.replace(/\D/g, ''),
    estado: data.estado,
    cidade: data.cidade,
    bairro: data.bairro,
    logradouro: data.logradouro,
    numero: data.numero,
    complemento: data.complemento,

    categoria: data.categoria,
    conselho: data.conselho,
    ufRegistro: data.ufRegistro,
    especialidade: data.especialidade,
    outraEspecialidade: data.outraEspecialidade,
    anosExperiencia: data.anosExperiencia,
    expTelemedicina: data.expTelemedicina,
    sobre: data.sobre,
    possuiCertificadoA1: data.possuiCertificadoA1,

    graduacao: data.graduacao,
    universidade: data.universidade,
    anoConclusao: data.anoConclusao,
    posGraduacao: data.posGraduacao,
    residencia: data.residencia,

    consentimentoLGPD: data.consentimentoLGPD,
    consentimentoIA: data.consentimentoIA,

    // Step 0 — acesso. Exatamente um dos dois caminhos é enviado:
    // - senha + confirmarSenha (backend valida policy + equality)
    // - googleIdToken (backend valida JWT e exige email bater com o do form)
    // O backend rejeita se ambos forem enviados juntos ou nenhum.
    senha: data.googleIdToken ? undefined : data.senha,
    confirmarSenha: data.googleIdToken ? undefined : data.confirmarSenha,
    googleIdToken: data.googleIdToken || undefined,
  };

  const { data: onboarding } = await api.post<HrOnboardingResponse>(
    '/api/doctors/from-hr',
    payload,
    { headers: { 'Content-Type': 'application/json' } }
  );

  // Map backend response → form-facing ApiResponse. Use the real protocolo
  // gerado pelo banco (SEQUENCE rh_protocol_seq, formato "RJ-YYYY-NNNNNN").
  // Fallback para um derivado do userId apenas se o backend não retornar
  // protocolo (cenário improvável pós-migration, preservado por robustez).
  return {
    id: onboarding.userId,
    protocolo:
      onboarding.protocolo ??
      onboarding.userId.replace(/-/g, '').slice(0, 8).toUpperCase(),
    message: onboarding.message ?? 'Cadastro recebido com sucesso',
  };
}
