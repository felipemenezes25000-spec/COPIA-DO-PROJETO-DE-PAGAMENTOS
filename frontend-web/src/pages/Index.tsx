import { AppHeader } from '@/components/landing/AppHeader';
import { AppHeroSection } from '@/components/landing/AppHeroSection';
import { AppStepsSection } from '@/components/landing/AppStepsSection';
import { AppBenefitsSection } from '@/components/landing/AppBenefitsSection';
import { AppScreensSection } from '@/components/landing/AppScreensSection';
import { AppTutorialSection } from '@/components/landing/AppTutorialSection';
import { AppPricingSection } from '@/components/landing/AppPricingSection';
import { AppTestimonialsSection } from '@/components/landing/AppTestimonialsSection';
import { AppFAQSection } from '@/components/landing/AppFAQSection';
import { AppCTASection } from '@/components/landing/AppCTASection';
import { AppFooter } from '@/components/landing/AppFooter';
import { WhatsAppButton } from '@/components/landing/WhatsAppButton';

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main>
        <AppHeroSection />
        <AppStepsSection />
        <AppBenefitsSection />
        <AppTutorialSection />
        <AppScreensSection />
        <AppTestimonialsSection />
        <AppPricingSection />
        <AppFAQSection />
        <AppCTASection />
      </main>
      <AppFooter />
      <WhatsAppButton />
    </div>
  );
};

export default Index;
