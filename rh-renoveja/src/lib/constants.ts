import type { ProfessionalCategory } from '../types';

export const UF_LIST: { value: string; label: string }[] = [
  { value: 'AC', label: 'Acre' },
  { value: 'AL', label: 'Alagoas' },
  { value: 'AP', label: 'Amapá' },
  { value: 'AM', label: 'Amazonas' },
  { value: 'BA', label: 'Bahia' },
  { value: 'CE', label: 'Ceará' },
  { value: 'DF', label: 'Distrito Federal' },
  { value: 'ES', label: 'Espírito Santo' },
  { value: 'GO', label: 'Goiás' },
  { value: 'MA', label: 'Maranhão' },
  { value: 'MT', label: 'Mato Grosso' },
  { value: 'MS', label: 'Mato Grosso do Sul' },
  { value: 'MG', label: 'Minas Gerais' },
  { value: 'PA', label: 'Pará' },
  { value: 'PB', label: 'Paraíba' },
  { value: 'PR', label: 'Paraná' },
  { value: 'PE', label: 'Pernambuco' },
  { value: 'PI', label: 'Piauí' },
  { value: 'RJ', label: 'Rio de Janeiro' },
  { value: 'RN', label: 'Rio Grande do Norte' },
  { value: 'RS', label: 'Rio Grande do Sul' },
  { value: 'RO', label: 'Rondônia' },
  { value: 'RR', label: 'Roraima' },
  { value: 'SC', label: 'Santa Catarina' },
  { value: 'SP', label: 'São Paulo' },
  { value: 'SE', label: 'Sergipe' },
  { value: 'TO', label: 'Tocantins' },
];

// Lista baseada nas 55 especialidades reconhecidas pelo CFM (Resolução
// CFM 2.330/2023) + algumas áreas de atuação de alta demanda em
// telemedicina (Medicina Paliativa, Medicina de Emergência, Dor).
// Mantida em ordem alfabética para facilitar busca visual no dropdown.
export const MEDICAL_SPECIALTIES: { value: string; label: string }[] = [
  { value: 'acupuntura', label: 'Acupuntura' },
  { value: 'alergia_imunologia', label: 'Alergia e Imunologia' },
  { value: 'anestesiologia', label: 'Anestesiologia' },
  { value: 'angiologia', label: 'Angiologia' },
  { value: 'cancerologia', label: 'Cancerologia (Oncologia Clínica)' },
  { value: 'cancerologia_pediatrica', label: 'Cancerologia Pediátrica' },
  { value: 'cardiologia', label: 'Cardiologia' },
  { value: 'cirurgia_cardiovascular', label: 'Cirurgia Cardiovascular' },
  { value: 'cirurgia_cabeca_pescoco', label: 'Cirurgia de Cabeça e Pescoço' },
  { value: 'cirurgia_mao', label: 'Cirurgia da Mão' },
  { value: 'cirurgia_aparelho_digestivo', label: 'Cirurgia do Aparelho Digestivo' },
  { value: 'cirurgia_geral', label: 'Cirurgia Geral' },
  { value: 'cirurgia_oncologica', label: 'Cirurgia Oncológica' },
  { value: 'cirurgia_pediatrica', label: 'Cirurgia Pediátrica' },
  { value: 'cirurgia_plastica', label: 'Cirurgia Plástica' },
  { value: 'cirurgia_toracica', label: 'Cirurgia Torácica' },
  { value: 'cirurgia_vascular', label: 'Cirurgia Vascular' },
  { value: 'clinica_medica', label: 'Clínica Médica' },
  { value: 'coloproctologia', label: 'Coloproctologia' },
  { value: 'dermatologia', label: 'Dermatologia' },
  { value: 'endocrinologia', label: 'Endocrinologia e Metabologia' },
  { value: 'endoscopia', label: 'Endoscopia' },
  { value: 'gastroenterologia', label: 'Gastroenterologia' },
  { value: 'genetica_medica', label: 'Genética Médica' },
  { value: 'geriatria', label: 'Geriatria' },
  { value: 'ginecologia_obstetricia', label: 'Ginecologia e Obstetrícia' },
  { value: 'hematologia', label: 'Hematologia e Hemoterapia' },
  { value: 'homeopatia', label: 'Homeopatia' },
  { value: 'infectologia', label: 'Infectologia' },
  { value: 'mastologia', label: 'Mastologia' },
  { value: 'medicina_dor', label: 'Medicina da Dor' },
  { value: 'medicina_esportiva', label: 'Medicina Esportiva' },
  { value: 'medicina_emergencia', label: 'Medicina de Emergência' },
  { value: 'medicina_familia', label: 'Medicina de Família e Comunidade' },
  { value: 'medicina_trafego', label: 'Medicina de Tráfego' },
  { value: 'medicina_trabalho', label: 'Medicina do Trabalho' },
  { value: 'medicina_fisica_reabilitacao', label: 'Medicina Física e Reabilitação' },
  { value: 'medicina_intensiva', label: 'Medicina Intensiva' },
  { value: 'medicina_legal', label: 'Medicina Legal e Perícia Médica' },
  { value: 'medicina_nuclear', label: 'Medicina Nuclear' },
  { value: 'medicina_paliativa', label: 'Medicina Paliativa' },
  { value: 'medicina_preventiva', label: 'Medicina Preventiva e Social' },
  { value: 'nefrologia', label: 'Nefrologia' },
  { value: 'neurocirurgia', label: 'Neurocirurgia' },
  { value: 'neurologia', label: 'Neurologia' },
  { value: 'nutrologia', label: 'Nutrologia' },
  { value: 'oftalmologia', label: 'Oftalmologia' },
  // Oncologia Clínica foi removida daqui — "Cancerologia (Oncologia Clínica)" já é a
  // denominação canônica do CFM (Resolução 2.330/2023). Mantínhamos as duas como
  // entradas distintas por legado, mas era só duplicação que gerava confusão no
  // dropdown e fragmentava as estatísticas por especialidade no admin.
  { value: 'ortopedia_traumatologia', label: 'Ortopedia e Traumatologia' },
  { value: 'otorrinolaringologia', label: 'Otorrinolaringologia' },
  { value: 'patologia', label: 'Patologia' },
  { value: 'patologia_clinica', label: 'Patologia Clínica / Medicina Laboratorial' },
  { value: 'pediatria', label: 'Pediatria' },
  { value: 'pneumologia', label: 'Pneumologia' },
  { value: 'psiquiatria', label: 'Psiquiatria' },
  { value: 'radiologia', label: 'Radiologia e Diagnóstico por Imagem' },
  { value: 'radioterapia', label: 'Radioterapia' },
  { value: 'reumatologia', label: 'Reumatologia' },
  { value: 'urologia', label: 'Urologia' },
  { value: 'outra', label: 'Outra (especificar abaixo)' },
];

// Inclui as especialidades reconhecidas pelo CFP + principais abordagens
// clínicas que o candidato costuma querer declarar como identidade prática
// (TCC, Psicanálise, ACT, Gestalt, Sistêmica, DBT, EMDR).
export const PSYCHOLOGY_SPECIALTIES: { value: string; label: string }[] = [
  { value: 'psicologia_clinica', label: 'Psicologia Clínica' },
  { value: 'psicologia_hospitalar', label: 'Psicologia Hospitalar' },
  { value: 'psicologia_organizacional', label: 'Psicologia Organizacional e do Trabalho' },
  { value: 'psicologia_escolar', label: 'Psicologia Escolar e Educacional' },
  { value: 'psicologia_social', label: 'Psicologia Social' },
  { value: 'psicologia_juridica', label: 'Psicologia Jurídica' },
  { value: 'psicologia_esporte', label: 'Psicologia do Esporte' },
  { value: 'psicologia_transito', label: 'Psicologia do Trânsito' },
  { value: 'neuropsicologia', label: 'Neuropsicologia' },
  { value: 'psicologia_saude', label: 'Psicologia da Saúde' },
  { value: 'psicopedagogia', label: 'Psicopedagogia' },
  { value: 'psicologia_infantil', label: 'Psicologia Infantil' },
  { value: 'psicologia_adolescente', label: 'Psicologia do Adolescente' },
  { value: 'psicogerontologia', label: 'Psicogerontologia' },
  { value: 'psico_oncologia', label: 'Psico-oncologia' },
  // "Neuropsicologia Clínica" era duplicação visual de "Neuropsicologia" (mesmo CRP,
  // mesma prática) — consolidado num único item para não fragmentar estatísticas
  // nem confundir o candidato na hora de escolher.
  { value: 'terapia_cognitivo_comportamental', label: 'Terapia Cognitivo-Comportamental (TCC)' },
  { value: 'terapia_aceitacao_compromisso', label: 'Terapia de Aceitação e Compromisso (ACT)' },
  { value: 'dbt', label: 'Terapia Comportamental Dialética (DBT)' },
  { value: 'emdr', label: 'EMDR' },
  { value: 'gestalt_terapia', label: 'Gestalt-terapia' },
  { value: 'terapia_sistemica', label: 'Terapia Sistêmica' },
  { value: 'terapia_esquemas', label: 'Terapia do Esquema' },
  { value: 'psicanalise', label: 'Psicanálise' },
  { value: 'terapia_familiar', label: 'Terapia Familiar e de Casal' },
  { value: 'avaliacao_psicologica', label: 'Avaliação Psicológica' },
  { value: 'dependencia_quimica', label: 'Dependência Química e Comportamental' },
  { value: 'luto', label: 'Atendimento a Luto e Perdas' },
  { value: 'sexualidade', label: 'Sexualidade Humana' },
  { value: 'outra', label: 'Outra (especificar abaixo)' },
];

// Alinhado às áreas de atuação reconhecidas pelo CFN (Resolução CFN 600/2018)
// + abordagens de alta demanda em telenutrição (low-carb, bariátrica, TA).
export const NUTRITION_SPECIALTIES: { value: string; label: string }[] = [
  { value: 'nutricao_clinica', label: 'Nutrição Clínica' },
  { value: 'nutricao_esportiva', label: 'Nutrição Esportiva' },
  { value: 'nutricao_funcional', label: 'Nutrição Funcional' },
  { value: 'nutricao_materno_infantil', label: 'Nutrição Materno-Infantil' },
  { value: 'nutricao_pediatrica', label: 'Nutrição Pediátrica' },
  { value: 'nutricao_oncologica', label: 'Nutrição Oncológica' },
  { value: 'nutricao_comportamental', label: 'Nutrição Comportamental' },
  { value: 'transtornos_alimentares', label: 'Transtornos Alimentares' },
  { value: 'nutricao_gerontologica', label: 'Nutrição Gerontológica' },
  { value: 'nutricao_renal', label: 'Nutrição Renal' },
  { value: 'nutricao_hospitalar', label: 'Nutrição Hospitalar' },
  { value: 'nutricao_saude_coletiva', label: 'Nutrição em Saúde Coletiva / Pública' },
  { value: 'nutricao_cardiologica', label: 'Nutrição Cardiológica' },
  { value: 'nutricao_diabetes', label: 'Nutrição em Diabetes e Endocrinopatias' },
  { value: 'nutricao_bariatrica', label: 'Nutrição em Cirurgia Bariátrica' },
  { value: 'nutricao_gestacional', label: 'Nutrição Gestacional e Lactação' },
  { value: 'nutricao_low_carb', label: 'Nutrição Low-Carb / Cetogênica' },
  { value: 'fitoterapia', label: 'Fitoterapia' },
  { value: 'nutricao_vegetariana', label: 'Nutrição Vegetariana e Vegana' },
  { value: 'nutricao_enteral_parenteral', label: 'Nutrição Enteral e Parenteral' },
  { value: 'nutricao_estetica', label: 'Nutrição Estética' },
  { value: 'marketing_nutricao', label: 'Marketing em Nutrição' },
  { value: 'outra', label: 'Outra (especificar abaixo)' },
];

// Lista CFO — 25 especialidades reconhecidas (Resolução CFO 253/2023).
export const DENTISTRY_SPECIALTIES: { value: string; label: string }[] = [
  { value: 'acupuntura', label: 'Acupuntura' },
  { value: 'cirurgia_bucomaxilofacial', label: 'Cirurgia e Traumatologia Bucomaxilofacial' },
  { value: 'dentistica', label: 'Dentística Restauradora' },
  { value: 'disfuncao_temporomandibular', label: 'Disfunção Temporomandibular e Dor Orofacial' },
  { value: 'endodontia', label: 'Endodontia' },
  { value: 'estomatologia', label: 'Estomatologia' },
  { value: 'harmonizacao_orofacial', label: 'Harmonização Orofacial' },
  { value: 'homeopatia', label: 'Homeopatia' },
  { value: 'implantodontia', label: 'Implantodontia' },
  { value: 'odontogeriatria', label: 'Odontogeriatria' },
  { value: 'odontologia_estetica', label: 'Odontologia Estética' },
  { value: 'odontologia_hospitalar', label: 'Odontologia Hospitalar' },
  { value: 'odontologia_legal', label: 'Odontologia Legal' },
  { value: 'odontologia_intensiva', label: 'Odontologia para Pacientes em UTI' },
  { value: 'odontologia_especiais', label: 'Odontologia para Pacientes com Necessidades Especiais' },
  { value: 'odontologia_esporte', label: 'Odontologia do Esporte' },
  { value: 'odontologia_trabalho', label: 'Odontologia do Trabalho' },
  { value: 'odontopediatria', label: 'Odontopediatria' },
  { value: 'ortodontia', label: 'Ortodontia' },
  { value: 'ortopedia_funcional', label: 'Ortopedia Funcional dos Maxilares' },
  { value: 'patologia_oral', label: 'Patologia Oral e Maxilofacial' },
  { value: 'periodontia', label: 'Periodontia' },
  { value: 'protese_bucomaxilofacial', label: 'Prótese Bucomaxilofacial' },
  { value: 'protese_dentaria', label: 'Prótese Dentária' },
  { value: 'radiologia_odontologica', label: 'Radiologia Odontológica e Imaginologia' },
  { value: 'saude_coletiva', label: 'Saúde Coletiva e da Família' },
  { value: 'outra', label: 'Outra (especificar abaixo)' },
];

// Enfermagem — alinhada à Resolução COFEN 581/2018 (especialidades
// reconhecidas) + áreas de alta demanda em teleconsulta/pós-consulta.
export const NURSING_SPECIALTIES: { value: string; label: string }[] = [
  { value: 'enfermagem_saude_familia', label: 'Enfermagem em Saúde da Família' },
  { value: 'enfermagem_pos_consulta', label: 'Enfermagem em Pós-Consulta / Follow-up' },
  { value: 'enfermagem_urgencia_emergencia', label: 'Enfermagem em Urgência e Emergência' },
  { value: 'enfermagem_uti', label: 'Enfermagem em Terapia Intensiva (UTI)' },
  { value: 'enfermagem_uti_pediatrica', label: 'Enfermagem em UTI Pediátrica e Neonatal' },
  { value: 'enfermagem_obstetrica', label: 'Enfermagem Obstétrica' },
  { value: 'enfermagem_neonatal', label: 'Enfermagem Neonatal' },
  { value: 'enfermagem_pediatrica', label: 'Enfermagem Pediátrica' },
  { value: 'enfermagem_gerontologica', label: 'Enfermagem Gerontológica' },
  { value: 'enfermagem_oncologica', label: 'Enfermagem Oncológica' },
  { value: 'enfermagem_cardiologica', label: 'Enfermagem Cardiológica' },
  { value: 'enfermagem_nefrologica', label: 'Enfermagem Nefrológica' },
  { value: 'enfermagem_diabetes', label: 'Enfermagem em Diabetes' },
  { value: 'enfermagem_feridas', label: 'Enfermagem em Cuidado de Feridas e Estomaterapia' },
  { value: 'enfermagem_psiquiatrica', label: 'Enfermagem Psiquiátrica e Saúde Mental' },
  { value: 'enfermagem_dermatologica', label: 'Enfermagem Dermatológica' },
  { value: 'enfermagem_home_care', label: 'Enfermagem em Home Care / Atenção Domiciliar' },
  { value: 'enfermagem_trabalho', label: 'Enfermagem do Trabalho' },
  { value: 'enfermagem_centro_cirurgico', label: 'Enfermagem em Centro Cirúrgico' },
  { value: 'enfermagem_auditoria', label: 'Auditoria em Enfermagem' },
  { value: 'enfermagem_educacao', label: 'Educação em Enfermagem' },
  { value: 'enfermagem_gestao', label: 'Gestão e Administração em Enfermagem' },
  { value: 'enfermagem_infectologia', label: 'Enfermagem em Controle de Infecção' },
  { value: 'outra', label: 'Outra (especificar abaixo)' },
];

// Fisioterapia — baseado nas especialidades reconhecidas pelo COFFITO
// (Resolução COFFITO 377/2010 e atualizações: Res. 429/2013, 475/2016, etc.)
// + áreas de atuação prática comuns em teleatendimento pós COFFITO 516/2020
// (que regulamentou teleconsulta e teleconsultoria em fisioterapia).
export const PHYSIOTHERAPY_SPECIALTIES: { value: string; label: string }[] = [
  { value: 'fisioterapia_acupuntura', label: 'Acupuntura' },
  { value: 'fisioterapia_aquatica', label: 'Fisioterapia Aquática (Hidroterapia)' },
  { value: 'fisioterapia_cardiovascular', label: 'Fisioterapia Cardiovascular' },
  { value: 'fisioterapia_dermatofuncional', label: 'Fisioterapia Dermatofuncional' },
  { value: 'fisioterapia_dtm', label: 'Fisioterapia em Disfunções Temporomandibulares (DTM)' },
  { value: 'fisioterapia_esportiva', label: 'Fisioterapia Esportiva' },
  { value: 'fisioterapia_gerontologia', label: 'Fisioterapia Gerontológica' },
  { value: 'fisioterapia_neurofuncional', label: 'Fisioterapia Neurofuncional (Neurológica)' },
  { value: 'fisioterapia_obstetricia', label: 'Fisioterapia em Obstetrícia / Uroginecologia' },
  { value: 'fisioterapia_oncologia', label: 'Fisioterapia em Oncologia' },
  { value: 'fisioterapia_ortopedica', label: 'Fisioterapia Traumato-Ortopédica' },
  { value: 'fisioterapia_osteopatia', label: 'Osteopatia' },
  { value: 'fisioterapia_pediatrica', label: 'Fisioterapia Pediátrica e Neonatal' },
  { value: 'fisioterapia_pilates', label: 'Pilates Clínico / RPG' },
  { value: 'fisioterapia_quiropraxia', label: 'Quiropraxia' },
  { value: 'fisioterapia_respiratoria', label: 'Fisioterapia Respiratória (Pneumofuncional)' },
  { value: 'fisioterapia_saude_coletiva', label: 'Fisioterapia em Saúde Coletiva' },
  { value: 'fisioterapia_saude_mulher', label: 'Fisioterapia em Saúde da Mulher' },
  { value: 'fisioterapia_terapia_manual', label: 'Terapia Manual' },
  { value: 'fisioterapia_trabalho', label: 'Fisioterapia do Trabalho' },
  { value: 'fisioterapia_uti', label: 'Fisioterapia em Terapia Intensiva (UTI)' },
  { value: 'fisioterapia_vestibular', label: 'Reabilitação Vestibular' },
  { value: 'outra', label: 'Outra (especificar abaixo)' },
];

// Fonoaudiologia — baseado nas especialidades reconhecidas pelo CFFa
// (Resoluções CFFa 320/2006, 580/2020 — teleconsulta/teleaudiologia, 635/2021).
export const SPEECH_THERAPY_SPECIALTIES: { value: string; label: string }[] = [
  { value: 'fonoaudiologia_audiologia', label: 'Audiologia' },
  { value: 'fonoaudiologia_disfagia', label: 'Disfagia' },
  { value: 'fonoaudiologia_educacional', label: 'Fonoaudiologia Educacional' },
  { value: 'fonoaudiologia_estetica', label: 'Fonoaudiologia Estética (Facial e Orofacial)' },
  { value: 'fonoaudiologia_fluencia', label: 'Fluência (Gagueira)' },
  { value: 'fonoaudiologia_gerontologia', label: 'Gerontologia' },
  { value: 'fonoaudiologia_hospitalar', label: 'Fonoaudiologia Hospitalar' },
  { value: 'fonoaudiologia_implante_coclear', label: 'Implante Coclear' },
  { value: 'fonoaudiologia_linguagem', label: 'Linguagem' },
  { value: 'fonoaudiologia_motricidade_orofacial', label: 'Motricidade Orofacial' },
  { value: 'fonoaudiologia_neonatal', label: 'Fonoaudiologia Neonatal' },
  { value: 'fonoaudiologia_neurofuncional', label: 'Neurofuncional (Afasia, AVC, Demências)' },
  { value: 'fonoaudiologia_pericia', label: 'Perícia Fonoaudiológica' },
  { value: 'fonoaudiologia_saude_coletiva', label: 'Saúde Coletiva' },
  { value: 'fonoaudiologia_trabalho', label: 'Fonoaudiologia do Trabalho' },
  { value: 'fonoaudiologia_voz', label: 'Voz' },
  { value: 'outra', label: 'Outra (especificar abaixo)' },
];

// Terapia Ocupacional — baseado nas especialidades reconhecidas pelo COFFITO
// (Resoluções COFFITO 406/2011, 418/2012, 458/2015 e teleatendimento pela
// Res. 516/2020, mesma normativa que liberou a telefisioterapia).
export const OCCUPATIONAL_THERAPY_SPECIALTIES: { value: string; label: string }[] = [
  { value: 'to_acupuntura', label: 'Acupuntura' },
  { value: 'to_atencao_primaria', label: 'Terapia Ocupacional na Atenção Primária' },
  { value: 'to_autismo', label: 'Terapia Ocupacional em TEA (Autismo)' },
  { value: 'to_contextos_sociais', label: 'Terapia Ocupacional Social / Contextos Sociais' },
  { value: 'to_criancas_adolescentes', label: 'Atenção à Criança e ao Adolescente' },
  { value: 'to_cuidados_paliativos', label: 'Cuidados Paliativos' },
  { value: 'to_deficiencia', label: 'Atenção à Pessoa com Deficiência' },
  { value: 'to_disfuncao_fisica', label: 'Disfunção Física (Reabilitação)' },
  { value: 'to_gerontologia', label: 'Gerontologia' },
  { value: 'to_integracao_sensorial', label: 'Integração Sensorial' },
  { value: 'to_neurofuncional', label: 'Terapia Ocupacional Neurofuncional' },
  { value: 'to_oncologia', label: 'Oncologia' },
  { value: 'to_reabilitacao_cognitiva', label: 'Reabilitação Cognitiva' },
  { value: 'to_reabilitacao_fisica', label: 'Reabilitação Física' },
  { value: 'to_reabilitacao_psicossocial', label: 'Reabilitação Psicossocial' },
  { value: 'to_saude_familia', label: 'Saúde da Família' },
  { value: 'to_saude_mental', label: 'Saúde Mental' },
  { value: 'to_saude_mulher', label: 'Saúde da Mulher' },
  { value: 'outra', label: 'Outra (especificar abaixo)' },
];

// Farmácia — baseado nas especialidades reconhecidas pelo CFF
// (Resolução CFF 572/2013 e atualizações: Res. 616/2015, 753/2024).
// Teleorientação e teleinterconsulta farmacêutica regulamentadas pela
// Resolução CFF 727/2022.
export const PHARMACY_SPECIALTIES: { value: string; label: string }[] = [
  { value: 'farmacia_acompanhamento', label: 'Acompanhamento Farmacoterapêutico' },
  { value: 'farmacia_analises_clinicas', label: 'Análises Clínicas / Laboratório' },
  { value: 'farmacia_clinica', label: 'Farmácia Clínica' },
  { value: 'farmacia_comunitaria', label: 'Farmácia Comunitária (Oficina)' },
  { value: 'farmacia_cuidados_paliativos', label: 'Cuidados Paliativos em Farmácia' },
  { value: 'farmacia_esportiva', label: 'Farmácia Esportiva' },
  { value: 'farmacia_estetica', label: 'Farmácia Estética' },
  { value: 'farmacia_homeopatia', label: 'Farmácia Homeopática' },
  { value: 'farmacia_hospitalar', label: 'Farmácia Hospitalar' },
  { value: 'farmacia_industrial', label: 'Farmácia Industrial' },
  { value: 'farmacia_magistral', label: 'Farmácia Magistral / Farmacotécnica' },
  { value: 'farmacia_nutricao_parenteral', label: 'Nutrição Parenteral e Enteral' },
  { value: 'farmacia_oncologia', label: 'Farmácia Oncológica' },
  { value: 'farmacia_publica', label: 'Farmácia em Saúde Pública' },
  { value: 'farmacia_saude_familia', label: 'Farmácia em Saúde da Família' },
  { value: 'farmacia_toxicologia', label: 'Toxicologia' },
  { value: 'farmacia_uti', label: 'Farmácia em Terapia Intensiva (UTI)' },
  { value: 'outra', label: 'Outra (especificar abaixo)' },
];

// Biomedicina — baseado nas habilitações reconhecidas pelo CFBM
// (Resolução CFBM 78/2002 e atualizações: 184/2010, 241/2013, 316/2019, etc).
// Teleatendimento biomédico pela Resolução CFBM 327/2020.
export const BIOMEDICINE_SPECIALTIES: { value: string; label: string }[] = [
  { value: 'biomedicina_acupuntura', label: 'Acupuntura' },
  { value: 'biomedicina_analises_ambientais', label: 'Análises Ambientais' },
  { value: 'biomedicina_analises_bromatologicas', label: 'Análises Bromatológicas' },
  { value: 'biomedicina_analises_clinicas', label: 'Análises Clínicas (Patologia Clínica)' },
  { value: 'biomedicina_banco_sangue', label: 'Banco de Sangue / Hemoterapia' },
  { value: 'biomedicina_biologia_molecular', label: 'Biologia Molecular' },
  { value: 'biomedicina_citologia', label: 'Citologia / Citopatologia' },
  { value: 'biomedicina_estetica', label: 'Biomedicina Estética' },
  { value: 'biomedicina_genetica', label: 'Genética' },
  { value: 'biomedicina_hematologia', label: 'Hematologia' },
  { value: 'biomedicina_histologia', label: 'Histologia / Histotecnologia' },
  { value: 'biomedicina_imagenologia', label: 'Imagenologia' },
  { value: 'biomedicina_imunologia', label: 'Imunologia' },
  { value: 'biomedicina_microbiologia', label: 'Microbiologia' },
  { value: 'biomedicina_parasitologia', label: 'Parasitologia' },
  { value: 'biomedicina_perfusao', label: 'Perfusão Extracorpórea' },
  { value: 'biomedicina_psicobiologia', label: 'Psicobiologia' },
  { value: 'biomedicina_reproducao', label: 'Reprodução Humana Assistida' },
  { value: 'biomedicina_saude_publica', label: 'Saúde Pública / Vigilância Sanitária' },
  { value: 'biomedicina_toxicologia', label: 'Toxicologia' },
  { value: 'biomedicina_virologia', label: 'Virologia' },
  { value: 'outra', label: 'Outra (especificar abaixo)' },
];

// Educação Física — o CONFEF não reconhece "especialidades" formais; usamos
// áreas de atuação comuns descritas nas Diretrizes Curriculares (Res. CNE/CES
// 6/2018) e regulamentadas para teleatendimento pela Resolução CONFEF 378/2022.
export const PHYSICAL_EDUCATION_SPECIALTIES: { value: string; label: string }[] = [
  { value: 'ef_atividade_adaptada', label: 'Atividade Física Adaptada / Inclusiva' },
  { value: 'ef_avaliacao_fisica', label: 'Avaliação Física' },
  { value: 'ef_corrida_endurance', label: 'Corrida e Endurance' },
  { value: 'ef_cross_funcional', label: 'Cross Training / Treinamento Funcional' },
  { value: 'ef_escolar', label: 'Educação Física Escolar' },
  { value: 'ef_esportes_aquaticos', label: 'Esportes Aquáticos / Natação' },
  { value: 'ef_gestantes', label: 'Atividade Física para Gestantes' },
  { value: 'ef_ginastica_laboral', label: 'Ginástica Laboral' },
  { value: 'ef_idosos', label: 'Atividade Física para Idosos / Gerontomotricidade' },
  { value: 'ef_lutas', label: 'Lutas e Artes Marciais' },
  { value: 'ef_musculacao', label: 'Musculação' },
  { value: 'ef_personal', label: 'Treinamento Personalizado (Personal Trainer)' },
  { value: 'ef_pilates', label: 'Pilates' },
  { value: 'ef_populacoes_especiais', label: 'Prescrição para Populações Especiais' },
  { value: 'ef_reabilitacao_cardiaca', label: 'Reabilitação Cardiovascular' },
  { value: 'ef_recreacao_lazer', label: 'Recreação e Lazer' },
  { value: 'ef_treinamento_desportivo', label: 'Treinamento Desportivo de Alto Rendimento' },
  { value: 'ef_yoga', label: 'Yoga / Práticas Integrativas' },
  { value: 'outra', label: 'Outra (especificar abaixo)' },
];

// Serviço Social — o CFESS/CRESS não reconhece "especialidades" formais,
// mas define áreas de atuação nas Diretrizes Curriculares (Res. CFESS 493/2006)
// e regulamentou o teleatendimento pela Resolução CFESS 988/2020.
export const SOCIAL_WORK_SPECIALTIES: { value: string; label: string }[] = [
  { value: 'servico_social_assistencia', label: 'Serviço Social em Assistência Social (CRAS/CREAS)' },
  { value: 'servico_social_comunitario', label: 'Serviço Social Comunitário' },
  { value: 'servico_social_criancas', label: 'Serviço Social com Crianças e Adolescentes' },
  { value: 'servico_social_cuidados_paliativos', label: 'Serviço Social em Cuidados Paliativos' },
  { value: 'servico_social_empresarial', label: 'Serviço Social Empresarial / Ocupacional' },
  { value: 'servico_social_escolar', label: 'Serviço Social Escolar' },
  { value: 'servico_social_familias', label: 'Serviço Social com Famílias' },
  { value: 'servico_social_hospitalar', label: 'Serviço Social Hospitalar' },
  { value: 'servico_social_idosos', label: 'Serviço Social com Idosos' },
  { value: 'servico_social_juridico', label: 'Serviço Social Sociojurídico' },
  { value: 'servico_social_mediacao', label: 'Mediação Familiar' },
  { value: 'servico_social_oncologia', label: 'Serviço Social em Oncologia' },
  { value: 'servico_social_penitenciario', label: 'Serviço Social Penitenciário' },
  { value: 'servico_social_politicas_publicas', label: 'Políticas Públicas Sociais' },
  { value: 'servico_social_previdenciario', label: 'Serviço Social Previdenciário' },
  { value: 'servico_social_reabilitacao', label: 'Serviço Social em Reabilitação' },
  { value: 'servico_social_saude', label: 'Serviço Social em Saúde' },
  { value: 'servico_social_saude_mental', label: 'Serviço Social em Saúde Mental' },
  { value: 'outra', label: 'Outra (especificar abaixo)' },
];

export function getSpecialtiesByCategory(category: ProfessionalCategory): { value: string; label: string }[] {
  switch (category) {
    case 'medico':
      return MEDICAL_SPECIALTIES;
    case 'psicologo':
      return PSYCHOLOGY_SPECIALTIES;
    case 'nutricionista':
      return NUTRITION_SPECIALTIES;
    case 'dentista':
      return DENTISTRY_SPECIALTIES;
    case 'enfermeiro':
      return NURSING_SPECIALTIES;
    case 'fisioterapeuta':
      return PHYSIOTHERAPY_SPECIALTIES;
    case 'fonoaudiologo':
      return SPEECH_THERAPY_SPECIALTIES;
    case 'terapeuta_ocupacional':
      return OCCUPATIONAL_THERAPY_SPECIALTIES;
    case 'farmaceutico':
      return PHARMACY_SPECIALTIES;
    case 'biomedico':
      return BIOMEDICINE_SPECIALTIES;
    case 'educador_fisico':
      return PHYSICAL_EDUCATION_SPECIALTIES;
    case 'assistente_social':
      return SOCIAL_WORK_SPECIALTIES;
    default: {
      // Exhaustive check — se alguém adicionar um valor novo ao type
      // ProfessionalCategory e esquecer de adicionar aqui, o TypeScript
      // vai quebrar o build nesta linha (o `never` só aceita código morto).
      const _exhaustive: never = category;
      return _exhaustive;
    }
  }
}

export const EXPERIENCE_OPTIONS: { value: string; label: string }[] = [
  { value: 'menos_1', label: 'Menos de 1 ano' },
  { value: '1_3', label: '1 a 3 anos' },
  { value: '3_5', label: '3 a 5 anos' },
  { value: '5_10', label: '5 a 10 anos' },
  { value: 'mais_10', label: 'Mais de 10 anos' },
];

export const TELEMEDICINE_OPTIONS: { value: string; label: string }[] = [
  { value: 'sim', label: 'Sim' },
  { value: 'nao', label: 'Não' },
];

export const GENDER_OPTIONS: { value: string; label: string }[] = [
  { value: 'masculino', label: 'Masculino' },
  { value: 'feminino', label: 'Feminino' },
  { value: 'nao_binario', label: 'Não-binário' },
  { value: 'prefiro_nao_informar', label: 'Prefiro não informar' },
];

// Mapeamento categoria → sigla do conselho regional.
// Usado no label do campo "Nº do conselho" do cadastro ("Nº do CRM", "Nº do CREFITO", ...).
// CREFITO é compartilhado por fisioterapia E terapia ocupacional (COFFITO federal).
export const COUNCIL_LABEL_MAP: Record<ProfessionalCategory, string> = {
  medico: 'CRM',
  enfermeiro: 'COREN',
  dentista: 'CRO',
  psicologo: 'CRP',
  nutricionista: 'CRN',
  fisioterapeuta: 'CREFITO',
  fonoaudiologo: 'CRFa',
  terapeuta_ocupacional: 'CREFITO',
  farmaceutico: 'CRF',
  biomedico: 'CRBM',
  educador_fisico: 'CREF',
  assistente_social: 'CRESS',
};
