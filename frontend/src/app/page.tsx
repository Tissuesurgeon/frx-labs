import Link from 'next/link';
import { AnnouncementBar } from '@/components/landing/AnnouncementBar';
import { HeroSection } from '@/components/landing/HeroSection';
import { SystemPanel } from '@/components/landing/SystemPanel';
import { AbstractSection } from '@/components/landing/AbstractSection';
import { ProblemSection } from '@/components/landing/ProblemSection';
import { OverviewSection } from '@/components/landing/OverviewSection';
import { ShieldProductSection } from '@/components/landing/ShieldProductSection';
import { ShieldModulesSection } from '@/components/landing/ShieldModulesSection';
import { IntentGuardianSection } from '@/components/landing/IntentGuardianSection';
import { WalletReferenceSection } from '@/components/landing/WalletReferenceSection';
import { ArchitectureSection } from '@/components/landing/ArchitectureSection';
import { RiskAndChainSection } from '@/components/landing/RiskAndChainSection';
import {
  DeveloperSection,
  StackSection,
} from '@/components/landing/DeveloperSection';
import { VisionSection } from '@/components/landing/VisionSection';
import { WaitlistSection } from '@/components/landing/WaitlistSection';
import { FooterSection } from '@/components/landing/FooterSection';
import { LandingMobileNav } from '@/components/landing/MobileNav';
import { Logo } from '@/components/ui/Logo';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-50">
        <AnnouncementBar />
        <nav className="relative border-b border-border bg-background/90 backdrop-blur-md">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
            <Logo href="/" size="sm" textClassName="text-sm" />
            <div className="flex items-center gap-6 font-mono text-xs tracking-wider">
              <a href="#shield" className="hidden text-muted-foreground transition-colors hover:text-accent sm:inline">
                SHIELD
              </a>
              <a href="#wallet" className="hidden text-muted-foreground transition-colors hover:text-accent sm:inline">
                WALLET
              </a>
              <a href="#architecture" className="hidden text-muted-foreground transition-colors hover:text-accent md:inline">
                ARCHITECTURE
              </a>
              <a href="#developers" className="hidden text-muted-foreground transition-colors hover:text-accent md:inline">
                DEVELOPERS
              </a>
              <a href="#vision" className="hidden text-muted-foreground transition-colors hover:text-accent md:inline">
                VISION
              </a>
              <Link href="/login" className="landing-btn landing-btn-primary landing-btn-sm hidden sm:inline-flex">
                CONSOLE__{'\u276F'}
              </Link>
              <LandingMobileNav />
            </div>
          </div>
        </nav>
      </header>

      <main>
        <HeroSection />
        <SystemPanel />
        <AbstractSection />
        <ProblemSection />
        <OverviewSection />
        <ShieldProductSection />
        <ShieldModulesSection />
        <IntentGuardianSection />
        <WalletReferenceSection />
        <ArchitectureSection />
        <RiskAndChainSection />
        <div id="developers" className="section-anchor">
          <DeveloperSection />
        </div>
        <StackSection />
        <div id="vision" className="section-anchor">
          <VisionSection />
        </div>
        <div id="waitlist" className="section-anchor">
          <WaitlistSection />
        </div>
      </main>

      <FooterSection />
    </div>
  );
}
