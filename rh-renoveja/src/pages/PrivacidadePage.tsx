import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';

import { Header } from '../components/layout/Header';
import { Footer } from '../components/layout/Footer';
import { Container } from '../components/layout/Container';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';

function PrivacidadePage() {
  const navigate = useNavigate();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.2 }}
    >
      <Header />

      <main className="min-h-screen bg-slate-50 py-8 md:py-12">
        <Container className="max-w-4xl mx-auto">
          <div className="bg-white rounded-2xl p-8 md:p-12 shadow-sm">
            {/* Header */}
            <div className="mb-8">
              <h1
                className="text-3xl md:text-4xl font-bold text-slate-900 mb-3"
                style={{ fontFamily: "'Poppins', sans-serif" }}
              >
                Política de Privacidade
              </h1>
              <Badge variant="gray">Última atualização: Abril de 2026</Badge>
            </div>

            {/* Content */}
            <div className="prose prose-slate max-w-none space-y-8 text-slate-700 leading-relaxed">
              {/* Section 1 */}
              <section>
                <h2 className="text-xl font-bold text-slate-900" style={{ fontFamily: "'Poppins', sans-serif" }}>
                  1. CONTROLADOR DOS DADOS
                </h2>
                <p>
                  <strong>RENOVEJÁ SAÚDE LTDA</strong>, pessoa jurídica de direito privado, inscrita no CNPJ sob o nº
                  65.947.180/0001-69, com sede na cidade de São Paulo/SP, doravante denominada simplesmente
                  "RenoveJá+" ou "Controlador", é a responsável pelo tratamento dos dados pessoais descritos
                  nesta Política de Privacidade, nos termos da Lei nº 13.709/2018 (Lei Geral de Proteção de
                  Dados Pessoais — LGPD).
                </p>
              </section>

              {/* Section 2 */}
              <section>
                <h2 className="text-xl font-bold text-slate-900" style={{ fontFamily: "'Poppins', sans-serif" }}>
                  2. DADOS PESSOAIS COLETADOS
                </h2>

                <h3 className="text-lg font-semibold text-slate-800 mt-4">
                  2.1 Dados de identificação
                </h3>
                <p>
                  Nome completo, CPF, data de nascimento, gênero (opcional), endereço completo (CEP, estado,
                  cidade, bairro, logradouro, número e complemento), e-mail e telefone.
                </p>

                <h3 className="text-lg font-semibold text-slate-800 mt-4">
                  2.2 Dados profissionais
                </h3>
                <p>
                  Categoria profissional (médico, psicólogo ou nutricionista), número do registro no conselho
                  de classe (CRM, CRP ou CRN), UF do registro, especialidade, anos de experiência profissional,
                  experiência com telemedicina, bem como breve descrição sobre a trajetória profissional.
                </p>

                <h3 className="text-lg font-semibold text-slate-800 mt-4">
                  2.3 Dados acadêmicos
                </h3>
                <p>
                  Curso de graduação, universidade, ano de conclusão, pós-graduação(ões) e residência médica
                  (quando aplicável).
                </p>

                <h3 className="text-lg font-semibold text-slate-800 mt-4">
                  2.4 Documentos
                </h3>
                <p>
                  Currículo profissional (PDF) e diploma de graduação (PDF), enviados voluntariamente pelo
                  candidato durante o processo de cadastro.
                </p>

                <h3 className="text-lg font-semibold text-slate-800 mt-4">
                  2.5 Dados de consentimento e auditoria
                </h3>
                <p>
                  Registro do consentimento para tratamento de dados (LGPD), consentimento para análise por
                  inteligência artificial, data/hora do consentimento e endereço IP no momento do envio.
                </p>
              </section>

              {/* Section 3 */}
              <section>
                <h2 className="text-xl font-bold text-slate-900" style={{ fontFamily: "'Poppins', sans-serif" }}>
                  3. FINALIDADE DO TRATAMENTO
                </h2>
                <p>Os dados pessoais coletados serão utilizados para as seguintes finalidades:</p>
                <ol className="list-[lower-alpha] pl-6 space-y-2">
                  <li>
                    <strong>Processo seletivo:</strong> avaliação e triagem de candidatos para atuação como
                    profissionais de saúde na plataforma RenoveJá+, incluindo verificação de qualificações,
                    experiência e disponibilidade.
                  </li>
                  <li>
                    <strong>Verificação de registro profissional:</strong> confirmação da validade e regularidade
                    do registro junto ao respectivo conselho de classe (CRM, CRP ou CRN).
                  </li>
                  <li>
                    <strong>Comunicação:</strong> contato com o candidato sobre o andamento do processo seletivo,
                    solicitação de informações complementares e envio de notificações relacionadas à plataforma.
                  </li>
                  <li>
                    <strong>Análise automatizada:</strong> utilização de inteligência artificial para agilizar a
                    triagem de currículos e documentos, sempre seguida de revisão por equipe humana de
                    recrutamento.
                  </li>
                  <li>
                    <strong>Cumprimento de obrigações legais e regulatórias:</strong> atendimento a exigências
                    legais, regulatórias ou determinações de autoridades competentes.
                  </li>
                </ol>
              </section>

              {/* Section 4 */}
              <section>
                <h2 className="text-xl font-bold text-slate-900" style={{ fontFamily: "'Poppins', sans-serif" }}>
                  4. BASE LEGAL
                </h2>
                <p>
                  O tratamento dos dados pessoais fundamenta-se nas seguintes bases legais previstas na LGPD:
                </p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>
                    <strong>Consentimento do titular (Art. 7º, I):</strong> obtido de forma livre, informada e
                    inequívoca por meio do formulário de cadastro, com checkboxes específicos para aceite da
                    Política de Privacidade e autorização para análise por IA.
                  </li>
                  <li>
                    <strong>Execução de procedimentos preliminares relacionados a contrato (Art. 7º, V):</strong>{' '}
                    tratamento necessário para a avaliação da candidatura e eventual celebração de contrato de
                    prestação de serviços.
                  </li>
                  <li>
                    <strong>Exercício regular de direitos em processo (Art. 7º, VI):</strong> para defesa em
                    processos judiciais, administrativos ou arbitrais, quando aplicável.
                  </li>
                  <li>
                    <strong>Legítimo interesse do Controlador (Art. 7º, IX):</strong> para melhoria contínua do
                    processo seletivo e da plataforma, desde que respeitados os direitos e liberdades
                    fundamentais do titular.
                  </li>
                </ul>
              </section>

              {/* Section 5 */}
              <section>
                <h2 className="text-xl font-bold text-slate-900" style={{ fontFamily: "'Poppins', sans-serif" }}>
                  5. ANÁLISE POR INTELIGÊNCIA ARTIFICIAL
                </h2>

                <h3 className="text-lg font-semibold text-slate-800 mt-4">
                  5.1 Processo de análise
                </h3>
                <p>
                  Os dados e documentos fornecidos pelo candidato poderão ser submetidos a sistemas de
                  inteligência artificial (IA) com o objetivo de agilizar a triagem inicial. A IA poderá
                  analisar o currículo, diploma e demais informações para gerar uma pontuação ou classificação
                  preliminar.
                </p>

                <h3 className="text-lg font-semibold text-slate-800 mt-4">
                  5.2 Supervisão humana
                </h3>
                <p>
                  Em conformidade com o Art. 20 da LGPD, a decisão final sobre a aprovação ou reprovação do
                  candidato será <strong>sempre realizada por um ser humano</strong>. A análise por IA é
                  utilizada exclusivamente como ferramenta auxiliar, não substituindo o julgamento humano.
                </p>

                <h3 className="text-lg font-semibold text-slate-800 mt-4">
                  5.3 Direito à revisão
                </h3>
                <p>
                  O titular tem o direito de solicitar a revisão de decisões tomadas unicamente com base em
                  tratamento automatizado de dados pessoais que afetem seus interesses, incluindo decisões
                  destinadas a definir o seu perfil pessoal, profissional, de consumo e de crédito ou os
                  aspectos de sua personalidade (Art. 20, LGPD).
                </p>
              </section>

              {/* Section 6 */}
              <section>
                <h2 className="text-xl font-bold text-slate-900" style={{ fontFamily: "'Poppins', sans-serif" }}>
                  6. COMPARTILHAMENTO DE DADOS
                </h2>
                <p>
                  Os dados pessoais poderão ser compartilhados com os seguintes destinatários, sempre
                  respeitando as finalidades descritas nesta Política:
                </p>
                <ol className="list-[lower-alpha] pl-6 space-y-2">
                  <li>
                    <strong>Prestadores de serviços de tecnologia:</strong> empresas contratadas para
                    hospedagem em nuvem (Amazon Web Services — AWS), processamento de dados e serviços de
                    inteligência artificial (OpenAI, Google), que atuam como operadores de dados e estão
                    sujeitos a contratos de confidencialidade e proteção de dados.
                  </li>
                  <li>
                    <strong>Conselhos profissionais:</strong> para verificação de registro e situação
                    cadastral junto ao CRM, CRP ou CRN, quando necessário.
                  </li>
                  <li>
                    <strong>Autoridades competentes:</strong> quando exigido por lei, regulamento ou
                    determinação judicial.
                  </li>
                </ol>
              </section>

              {/* Section 7 */}
              <section>
                <h2 className="text-xl font-bold text-slate-900" style={{ fontFamily: "'Poppins', sans-serif" }}>
                  7. ARMAZENAMENTO E SEGURANÇA
                </h2>

                <h3 className="text-lg font-semibold text-slate-800 mt-4">
                  7.1 Infraestrutura
                </h3>
                <p>
                  Os dados são armazenados em servidores da Amazon Web Services (AWS), localizados na região
                  da América do Sul (São Paulo — sa-east-1), com criptografia em trânsito (TLS 1.2+) e em
                  repouso (AES-256).
                </p>

                <h3 className="text-lg font-semibold text-slate-800 mt-4">
                  7.2 Medidas técnicas
                </h3>
                <p>
                  Adotamos medidas técnicas e organizacionais adequadas para proteger os dados pessoais contra
                  acessos não autorizados, destruição, perda, alteração ou qualquer forma de tratamento
                  inadequado, incluindo: controle de acesso baseado em funções (RBAC), firewall de aplicação
                  web (WAF), monitoramento contínuo, backup automatizado e auditoria de acessos.
                </p>

                <h3 className="text-lg font-semibold text-slate-800 mt-4">
                  7.3 Documentos
                </h3>
                <p>
                  Os arquivos de currículo e diploma são armazenados em buckets privados do Amazon S3, com
                  acesso restrito e criptografia em repouso, sendo acessíveis apenas por pessoal autorizado
                  da equipe de recrutamento.
                </p>
              </section>

              {/* Section 8 */}
              <section>
                <h2 className="text-xl font-bold text-slate-900" style={{ fontFamily: "'Poppins', sans-serif" }}>
                  8. PRAZO DE RETENÇÃO
                </h2>

                <h3 className="text-lg font-semibold text-slate-800 mt-4">
                  8.1 Candidatos aprovados
                </h3>
                <p>
                  Os dados serão mantidos durante todo o período de vínculo contratual com a plataforma e por
                  até 5 (cinco) anos após o encerramento do contrato, para cumprimento de obrigações legais e
                  regulatórias.
                </p>

                <h3 className="text-lg font-semibold text-slate-800 mt-4">
                  8.2 Candidatos não aprovados
                </h3>
                <p>
                  Os dados serão mantidos por até 12 (doze) meses após a conclusão do processo seletivo, para
                  possibilitar eventual reaproveitamento em futuras oportunidades, salvo solicitação de
                  eliminação pelo titular.
                </p>

                <h3 className="text-lg font-semibold text-slate-800 mt-4">
                  8.3 Eliminação
                </h3>
                <p>
                  Após o término do prazo de retenção, os dados pessoais serão eliminados de forma segura,
                  incluindo a exclusão de documentos armazenados, ressalvadas as hipóteses de conservação
                  previstas no Art. 16 da LGPD.
                </p>
              </section>

              {/* Section 9 */}
              <section>
                <h2 className="text-xl font-bold text-slate-900" style={{ fontFamily: "'Poppins', sans-serif" }}>
                  9. DIREITOS DO TITULAR
                </h2>
                <p>
                  Em conformidade com os Arts. 17 e 18 da LGPD, o titular dos dados pessoais tem direito a:
                </p>
                <ol className="list-[lower-alpha] pl-6 space-y-2">
                  <li>
                    <strong>Confirmação da existência de tratamento:</strong> saber se seus dados pessoais
                    são ou foram objeto de tratamento.
                  </li>
                  <li>
                    <strong>Acesso aos dados:</strong> obter cópia dos dados pessoais tratados pelo
                    Controlador.
                  </li>
                  <li>
                    <strong>Correção:</strong> solicitar a correção de dados incompletos, inexatos ou
                    desatualizados.
                  </li>
                  <li>
                    <strong>Anonimização, bloqueio ou eliminação:</strong> solicitar a anonimização, bloqueio
                    ou eliminação de dados desnecessários, excessivos ou tratados em desconformidade com a
                    LGPD.
                  </li>
                  <li>
                    <strong>Portabilidade:</strong> solicitar a portabilidade dos dados a outro fornecedor de
                    serviço ou produto, mediante requisição expressa.
                  </li>
                  <li>
                    <strong>Eliminação dos dados tratados com consentimento:</strong> solicitar a eliminação
                    dos dados pessoais tratados com base no consentimento, exceto nas hipóteses de conservação
                    previstas em lei.
                  </li>
                  <li>
                    <strong>Informação sobre compartilhamento:</strong> obter informações sobre as entidades
                    públicas e privadas com as quais o Controlador realizou uso compartilhado de dados.
                  </li>
                  <li>
                    <strong>Revogação do consentimento:</strong> revogar o consentimento a qualquer momento,
                    mediante manifestação expressa, nos termos do Art. 8º, §5º, da LGPD.
                  </li>
                </ol>
                <p className="mt-4">
                  Para exercer qualquer desses direitos, entre em contato pelo e-mail{' '}
                  <a href="mailto:dpo@renoveja.com.br" className="text-primary-600 hover:underline font-semibold">
                    dpo@renoveja.com.br
                  </a>.
                </p>
              </section>

              {/* Section 10 */}
              <section>
                <h2 className="text-xl font-bold text-slate-900" style={{ fontFamily: "'Poppins', sans-serif" }}>
                  10. ENCARREGADO DE DADOS (DPO)
                </h2>
                <p>
                  O Encarregado pelo tratamento de dados pessoais (Data Protection Officer — DPO) da RenoveJá
                  Saúde LTDA pode ser contatado pelo e-mail{' '}
                  <a href="mailto:dpo@renoveja.com.br" className="text-primary-600 hover:underline font-semibold">
                    dpo@renoveja.com.br
                  </a>.
                </p>
                <p>
                  O Encarregado é responsável por aceitar reclamações e comunicações dos titulares, prestar
                  esclarecimentos e adotar providências; receber comunicações da Autoridade Nacional de
                  Proteção de Dados (ANPD) e adotar providências; orientar os funcionários e os contratados
                  da entidade a respeito das práticas a serem tomadas em relação à proteção de dados pessoais;
                  e executar as demais atribuições determinadas pelo Controlador ou estabelecidas em normas
                  complementares.
                </p>
              </section>

              {/* Section 11 */}
              <section>
                <h2 className="text-xl font-bold text-slate-900" style={{ fontFamily: "'Poppins', sans-serif" }}>
                  11. ALTERAÇÕES
                </h2>
                <p>
                  Esta Política de Privacidade poderá ser atualizada periodicamente para refletir alterações
                  nas práticas de tratamento de dados, mudanças legislativas ou regulatórias. O titular será
                  informado sobre alterações relevantes por meio do e-mail cadastrado ou por aviso na
                  plataforma. A versão atualizada terá efeito imediato a partir da data de publicação, salvo
                  disposição em contrário.
                </p>
              </section>

              {/* Section 12 */}
              <section>
                <h2 className="text-xl font-bold text-slate-900" style={{ fontFamily: "'Poppins', sans-serif" }}>
                  12. FORO
                </h2>
                <p>
                  Fica eleito o foro da Comarca de São Paulo, Estado de São Paulo, como competente para dirimir
                  quaisquer dúvidas ou controvérsias oriundas desta Política de Privacidade, com renúncia
                  expressa a qualquer outro, por mais privilegiado que seja.
                </p>
              </section>
            </div>

            {/* Back button */}
            <div className="mt-10 pt-6 border-t border-slate-100">
              <Button variant="secondary" onClick={() => navigate(-1)}>
                <ArrowLeft className="h-4 w-4" />
                Voltar
              </Button>
            </div>
          </div>
        </Container>
      </main>

      <Footer />
    </motion.div>
  );
}

export default PrivacidadePage;
