import { Facebook, Instagram, Linkedin, Twitter, Mail, Phone, MapPin } from 'lucide-react';
import { Link } from 'react-router-dom';
import logo from '@/assets/logo-renoveja.png';

const footerLinks = {
  product: {
    title: 'Produto',
    links: [
      { name: 'Como Funciona', href: '#how-it-works' },
      { name: 'Planos', href: '#pricing' },
      { name: 'Benefícios', href: '#benefits' },
      { name: 'Depoimentos', href: '#testimonials' },
    ],
  },
  company: {
    title: 'Empresa',
    links: [
      { name: 'Sobre Nós', href: '/sobre' },
      { name: 'Blog', href: '/blog' },
      { name: 'Carreiras', href: '/carreiras' },
      { name: 'Contato', href: '/contato' },
    ],
  },
  legal: {
    title: 'Legal',
    links: [
      { name: 'Termos de Uso', href: '/termos' },
      { name: 'Privacidade', href: '/privacidade' },
      { name: 'LGPD', href: '/lgpd' },
      { name: 'Compliance', href: '/compliance' },
    ],
  },
};

const socialLinks = [
  { icon: Facebook, href: 'https://facebook.com/renoveja', label: 'Facebook' },
  { icon: Instagram, href: 'https://instagram.com/renoveja', label: 'Instagram' },
  { icon: Linkedin, href: 'https://linkedin.com/company/renoveja', label: 'LinkedIn' },
  { icon: Twitter, href: 'https://twitter.com/renoveja', label: 'Twitter' },
];

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-foreground text-background">
      {/* Main Footer */}
      <div className="container mx-auto px-4 py-16">
        <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-12">
          {/* Brand Column */}
          <div className="lg:col-span-2">
            <Link to="/" className="inline-block mb-6">
              <img src={logo} alt="RenoveJá" className="h-12 w-auto brightness-0 invert" />
            </Link>
            <p className="text-background/70 mb-6 max-w-sm leading-relaxed">
              Plataforma líder em renovação digital de receitas médicas. Simples, rápido e seguro, com médicos certificados pelo CRM.
            </p>
            
            {/* Contact Info */}
            <div className="space-y-3">
              <a
                href="https://wa.me/5511986318000"
                className="flex items-center gap-3 text-background/70 hover:text-primary transition-colors"
              >
                <Phone className="w-5 h-5" />
                (11) 98631-8000
              </a>
              <a
                href="mailto:contato@renovejasaude.com.br"
                className="flex items-center gap-3 text-background/70 hover:text-primary transition-colors"
              >
                <Mail className="w-5 h-5" />
                contato@renovejasaude.com.br
              </a>
              <div className="flex items-start gap-3 text-background/70">
                <MapPin className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <span>São Paulo, SP - Brasil</span>
              </div>
            </div>
          </div>

          {/* Links Columns */}
          {Object.entries(footerLinks).map(([key, section]) => (
            <div key={key}>
              <h4 className="font-semibold text-background mb-4">{section.title}</h4>
              <ul className="space-y-3">
                {section.links.map((link) => (
                  <li key={link.name}>
                    <Link
                      to={link.href}
                      className="text-background/70 hover:text-primary transition-colors"
                    >
                      {link.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-background/10">
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            {/* Copyright */}
            <p className="text-sm text-background/60 text-center md:text-left">
              © {currentYear} RenoveJá. Todos os direitos reservados.
            </p>

            {/* Social Links */}
            <div className="flex items-center gap-4">
              {socialLinks.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 rounded-full bg-background/10 flex items-center justify-center text-background/70 hover:bg-primary hover:text-primary-foreground transition-all"
                  aria-label={social.label}
                >
                  <social.icon className="w-5 h-5" />
                </a>
              ))}
            </div>

            {/* Certifications */}
            <div className="flex items-center gap-4 text-xs text-background/60">
              <span className="flex items-center gap-1">
                🔒 SSL Seguro
              </span>
              <span className="flex items-center gap-1">
                ✓ LGPD Compliant
              </span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
