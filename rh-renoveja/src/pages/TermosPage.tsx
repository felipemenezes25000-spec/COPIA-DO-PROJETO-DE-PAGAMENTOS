import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';

import { Header } from '../components/layout/Header';
import { Footer } from '../components/layout/Footer';
import { Container } from '../components/layout/Container';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';

function TermosPage() {
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
                Termo de Consentimento para Tratamento de Dados Pessoais
              </h1>
              <Badge variant="gray">Última atualização: Abril de 2026</Badge>
              <p className="mt-4 text-sm text-slate-600 font-semibold">
                RENOVEJÁ SAÚDE LTDA — CNPJ: 65.947.180/0001-69
              </p>
            </div>

            {/* Content */}
            <div className="prose prose-slate max-w-none space-y-6 text-slate-700 leading-relaxed">
              <p>
                Pelo presente Termo de Consentimento, eu, na qualidade de titular dos dados pessoais,
                declaro que fui informado(a) de forma clara, adequada e ostensiva pela{' '}
                <strong>RENOVEJÁ SAÚDE LTDA</strong>, inscrita no CNPJ sob o nº 65.947.180/0001-69
                ("Controlador"), sobre o tratamento dos meus dados pessoais, e{' '}
                <strong>CONSINTO</strong> livremente com os seguintes termos:
              </p>

              {/* Point 1 */}
              <section>
                <h2 className="text-xl font-bold text-slate-900" style={{ fontFamily: "'Poppins', sans-serif" }}>
                  1. Coleta e tratamento de dados pessoais
                </h2>
                <p>
                  Autorizo a coleta e o tratamento dos meus dados pessoais fornecidos no formulário de
                  cadastro do portal de recrutamento RenoveJá+, incluindo, mas não se limitando a: dados de
                  identificação (nome, CPF, data de nascimento, gênero, endereço, e-mail, telefone), dados
                  profissionais (categoria profissional, registro em conselho de classe, especialidade,
                  experiência), dados acadêmicos (graduação, universidade, pós-graduação, residência) e
                  documentos (currículo e diploma em formato PDF).
                </p>
              </section>

              {/* Point 2 */}
              <section>
                <h2 className="text-xl font-bold text-slate-900" style={{ fontFamily: "'Poppins', sans-serif" }}>
                  2. Finalidade do tratamento
                </h2>
                <p>
                  Estou ciente de que meus dados pessoais serão tratados para as seguintes finalidades:
                  avaliação e triagem da minha candidatura para atuação como profissional de saúde na
                  plataforma RenoveJá+; verificação de registro profissional junto ao respectivo conselho de
                  classe; comunicação sobre o andamento do processo seletivo; análise automatizada por
                  inteligência artificial, seguida de revisão humana; e cumprimento de obrigações legais e
                  regulatórias aplicáveis.
                </p>
              </section>

              {/* Point 3 */}
              <section>
                <h2 className="text-xl font-bold text-slate-900" style={{ fontFamily: "'Poppins', sans-serif" }}>
                  3. Análise por inteligência artificial
                </h2>
                <p>
                  Autorizo expressamente que meus dados pessoais e documentos sejam submetidos a sistemas de
                  inteligência artificial (IA) para fins de triagem e análise preliminar. Estou ciente de que:
                </p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>
                    A IA será utilizada como ferramenta auxiliar para agilizar o processo de triagem de
                    currículos e documentos.
                  </li>
                  <li>
                    A decisão final sobre minha aprovação ou reprovação será{' '}
                    <strong>sempre realizada por um ser humano</strong>, em conformidade com o Art. 20 da
                    LGPD.
                  </li>
                  <li>
                    Tenho o direito de solicitar a revisão de qualquer decisão tomada unicamente com base em
                    tratamento automatizado de dados pessoais que afete meus interesses.
                  </li>
                  <li>
                    Posso obter informações claras e adequadas sobre os critérios e procedimentos utilizados
                    na decisão automatizada, observados os segredos comercial e industrial.
                  </li>
                </ul>
              </section>

              {/* Point 4 */}
              <section>
                <h2 className="text-xl font-bold text-slate-900" style={{ fontFamily: "'Poppins', sans-serif" }}>
                  4. Compartilhamento de dados
                </h2>
                <p>
                  Autorizo o compartilhamento dos meus dados pessoais com: prestadores de serviços de
                  tecnologia contratados pelo Controlador (incluindo serviços de hospedagem em nuvem e
                  inteligência artificial), que atuam como operadores de dados e estão sujeitos a obrigações
                  de confidencialidade; conselhos profissionais de classe, para fins de verificação de
                  registro; e autoridades competentes, quando exigido por lei ou determinação judicial.
                </p>
              </section>

              {/* Point 5 */}
              <section>
                <h2 className="text-xl font-bold text-slate-900" style={{ fontFamily: "'Poppins', sans-serif" }}>
                  5. Direitos do titular
                </h2>
                <p>
                  Estou ciente de que, nos termos dos Arts. 17 e 18 da LGPD, posso exercer a qualquer momento
                  os seguintes direitos: confirmação da existência de tratamento; acesso aos dados; correção
                  de dados incompletos, inexatos ou desatualizados; anonimização, bloqueio ou eliminação de
                  dados desnecessários ou excessivos; portabilidade dos dados; eliminação dos dados tratados
                  com consentimento; informação sobre compartilhamento; e revogação do consentimento. Para
                  exercer esses direitos, devo entrar em contato pelo e-mail{' '}
                  <a href="mailto:dpo@renoveja.com.br" className="text-primary-600 hover:underline font-semibold">
                    dpo@renoveja.com.br
                  </a>.
                </p>
              </section>

              {/* Point 6 */}
              <section>
                <h2 className="text-xl font-bold text-slate-900" style={{ fontFamily: "'Poppins', sans-serif" }}>
                  6. Revogação do consentimento
                </h2>
                <p>
                  Estou ciente de que posso revogar este consentimento a qualquer momento, mediante
                  manifestação expressa ao Controlador, por meio do e-mail{' '}
                  <a href="mailto:dpo@renoveja.com.br" className="text-primary-600 hover:underline font-semibold">
                    dpo@renoveja.com.br
                  </a>, sem que isso comprometa a licitude do tratamento de dados realizado anteriormente com base
                  no consentimento (Art. 8º, §5º, LGPD). A revogação poderá resultar na impossibilidade de
                  dar continuidade ao processo seletivo.
                </p>
              </section>

              {/* Footer note */}
              <div className="mt-8 rounded-xl border border-slate-200 bg-slate-50 p-5">
                <p className="text-sm text-slate-600 leading-relaxed">
                  <strong>Nota:</strong> A aceitação eletrônica deste Termo de Consentimento, realizada por
                  meio do preenchimento do formulário de cadastro e marcação dos campos de aceite, é válida
                  como forma de manifestação de vontade livre, informada e inequívoca, nos termos do Art. 8º,
                  §1º, da Lei nº 13.709/2018 (LGPD). O registro do consentimento (data, hora e endereço IP)
                  será armazenado pelo Controlador para fins de comprovação e auditoria.
                </p>
              </div>
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

export default TermosPage;
