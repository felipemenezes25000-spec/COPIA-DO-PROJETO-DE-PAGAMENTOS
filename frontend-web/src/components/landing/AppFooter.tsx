import { motion } from 'framer-motion';
import { Facebook, Instagram, Linkedin, Mail, Phone, AlertTriangle, Shield, Award, CheckCircle2, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';
import logo from '@/assets/logo-renoveja-new.png';

const footerLinks = {
  legal: [
    { name: 'Termos de Uso', href: '/termos' },
    { name: 'Privacidade', href: '/privacidade' },
    { name: 'LGPD', href: '/lgpd' },
  ],
  support: [
    { name: 'FAQ', href: '#faq' },
    { name: 'Suporte', href: 'https://wa.me/5511986318000' },
    { name: 'Contato', href: 'mailto:contato@renoveja.com.br' },
  ],
};

const socialLinks = [
  { icon: Facebook, href: 'https://facebook.com/renoveja', label: 'Facebook' },
  { icon: Instagram, href: 'https://instagram.com/renoveja', label: 'Instagram' },
  { icon: Linkedin, href: 'https://linkedin.com/company/renoveja', label: 'LinkedIn' },
];

export function AppFooter() {
  const currentYear = new Date().getFullYear();

  const scrollToFaq = (e: React.MouseEvent, href: string) => {
    if (href.startsWith('#')) {
      e.preventDefault();
      const element = document.querySelector(href);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  return (
    <footer className="bg-[#1E3A5F]">
      {/* Compliance Notice */}
      <div className="bg-[#25D366]/10 border-b border-[#25D366]/30">
        <div className="container mx-auto px-4 py-5">
          <div className="flex items-start gap-4 max-w-4xl mx-auto">
            <div className="w-10 h-10 rounded-full bg-[#25D366] flex items-center justify-center flex-shrink-0 mt-0.5">
              <CheckCircle2 className="w-5 h-5 text-white" />
            </div>
            <div className="text-sm">
              <p className="font-bold text-white mb-2 text-base">✓ Serviço em Conformidade com as Legislações Vigentes</p>
              <p className="text-white/80 leading-relaxed">
                O RenoveJá+ opera em total conformidade com a{' '}
                <Link to="/lgpd" className="text-[#25D366] hover:underline font-semibold">
                  Lei Geral de Proteção de Dados (LGPD)
                </Link>, 
                resoluções do <span className="text-white font-medium">Conselho Federal de Medicina (CFM)</span> sobre telemedicina e demais normas aplicáveis. 
                Todos os profissionais são devidamente habilitados com CRM ativo.
                <span className="text-[#25D366] font-semibold"> Receitas emitidas com Certificado Digital ICP-Brasil</span>.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Important Notice */}
      <div className="bg-amber-500/10 border-b border-amber-500/30">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-3 max-w-4xl mx-auto">
            <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0" />
            <p className="text-sm text-white/90">
              <span className="font-bold text-amber-400">Aviso:</span> Este serviço não atende urgências ou emergências médicas. 
              Em caso de sintomas graves, procure atendimento presencial ou ligue <strong className="text-white">SAMU 192</strong>.
            </p>
          </div>
        </div>
      </div>

      {/* Main Footer */}
      <div className="container mx-auto px-4 py-12">
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Brand Column */}
          <div className="lg:col-span-2">
            <Link to="/" className="inline-flex items-center gap-3 mb-6 group">
              <motion.img 
                src={logo} 
                alt="RenoveJá+" 
                className="h-14 w-auto drop-shadow-md" 
                whileHover={{ scale: 1.05, rotate: 2 }}
                transition={{ duration: 0.3 }}
              />
              <span className="text-2xl font-bold">
                <span className="text-primary">Renove</span>
                <span className="text-white">Já</span>
                <span className="text-primary">+</span>
              </span>
            </Link>
            <p className="text-white/70 mb-6 max-w-sm leading-relaxed text-sm">
              Plataforma digital para renovação de receitas e pedidos de exames. 
              Simples, rápido e seguro.
            </p>
            
            {/* Contact Info */}
            <div className="space-y-3">
              <a
                href="https://wa.me/5511986318000"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 text-white/80 hover:text-[#25D366] transition-colors text-sm group"
              >
                <div className="w-10 h-10 rounded-full bg-[#25D366]/20 group-hover:bg-[#25D366] flex items-center justify-center transition-colors">
                  <Phone className="w-5 h-5" />
                </div>
                <div>
                  <span className="font-medium block">(11) 98631-8000</span>
                  <span className="text-xs text-white/50">WhatsApp</span>
                </div>
              </a>
              <a
                href="mailto:contato@renoveja.com.br"
                className="flex items-center gap-3 text-white/80 hover:text-primary transition-colors text-sm group"
              >
                <div className="w-10 h-10 rounded-full bg-primary/20 group-hover:bg-primary flex items-center justify-center transition-colors">
                  <Mail className="w-5 h-5" />
                </div>
                <div>
                  <span className="font-medium block">contato@renoveja.com.br</span>
                  <span className="text-xs text-white/50">Email</span>
                </div>
              </a>
              <div className="flex items-center gap-3 text-white/60 text-sm">
                <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <span className="font-medium block text-white/80">Seg-Sex, 8h às 18h</span>
                  <span className="text-xs text-white/50">Horário de atendimento</span>
                </div>
              </div>
            </div>
          </div>

          {/* Legal Links */}
          <div>
            <h4 className="font-bold text-white mb-5 text-lg flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" />
              Legal
            </h4>
            <ul className="space-y-3">
              {footerLinks.legal.map((link) => (
                <li key={link.name}>
                  <Link
                    to={link.href}
                    className="text-white/70 hover:text-primary transition-colors text-sm flex items-center gap-2 group py-1"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-primary/50 group-hover:bg-primary transition-colors" />
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Support Links */}
          <div>
            <h4 className="font-bold text-white mb-5 text-lg flex items-center gap-2">
              <Mail className="w-5 h-5 text-primary" />
              Suporte
            </h4>
            <ul className="space-y-3">
              {footerLinks.support.map((link) => (
                <li key={link.name}>
                  {link.href.startsWith('#') ? (
                    <a
                      href={link.href}
                      onClick={(e) => scrollToFaq(e, link.href)}
                      className="text-white/70 hover:text-primary transition-colors text-sm flex items-center gap-2 group cursor-pointer py-1"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-primary/50 group-hover:bg-primary transition-colors" />
                      {link.name}
                    </a>
                  ) : link.href.startsWith('http') || link.href.startsWith('mailto') ? (
                    <a
                      href={link.href}
                      target={link.href.startsWith('http') ? '_blank' : undefined}
                      rel={link.href.startsWith('http') ? 'noopener noreferrer' : undefined}
                      className="text-white/70 hover:text-primary transition-colors text-sm flex items-center gap-2 group py-1"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-primary/50 group-hover:bg-primary transition-colors" />
                      {link.name}
                    </a>
                  ) : (
                    <Link
                      to={link.href}
                      className="text-white/70 hover:text-primary transition-colors text-sm flex items-center gap-2 group py-1"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-primary/50 group-hover:bg-primary transition-colors" />
                      {link.name}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-white/10">
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            {/* Copyright */}
            <p className="text-sm text-white/60 text-center md:text-left">
              © {currentYear} RenoveJá+. Todos os direitos reservados.
            </p>

            {/* Social Links */}
            <div className="flex items-center gap-3">
              {socialLinks.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white/70 hover:bg-primary hover:text-white transition-all hover:scale-110"
                  aria-label={social.label}
                >
                  <social.icon className="w-5 h-5" />
                </a>
              ))}
            </div>

            {/* Certifications */}
            <div className="flex flex-wrap items-center justify-center gap-3 text-sm">
              <span className="flex items-center gap-2 text-white/80 bg-white/10 px-4 py-2.5 rounded-full hover:bg-white/20 transition-all duration-300 shadow-soft">
                <Shield className="w-4 h-4 text-primary" />
                SSL/TLS
              </span>
              <span className="flex items-center gap-2 text-white/80 bg-white/10 px-4 py-2.5 rounded-full hover:bg-white/20 transition-all duration-300 shadow-soft">
                <CheckCircle2 className="w-4 h-4 text-[#25D366]" />
                LGPD
              </span>
              <span className="flex items-center gap-2 text-white/80 bg-white/10 px-4 py-2.5 rounded-full hover:bg-white/20 transition-all duration-300 shadow-soft">
                <Award className="w-4 h-4 text-primary" />
                CFM
              </span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
