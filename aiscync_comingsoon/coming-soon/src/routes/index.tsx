import { createFileRoute } from '@tanstack/react-router';
import { useState, useEffect } from 'react';
import { 
  Logo, 
  SyncIndicator, 
  HeroSection, 
  ProblemSection, 
  WorkflowSection,
  FeaturesSection,
  UsersSection,
  EarlyAccessSection,
  FAQSection,
  Footer
} from '../components';

export const Route = createFileRoute('/')({
  component: HomeComponent,
});

function HomeComponent() {
  return (
    <div className="page">
      <nav className="nav" role="navigation" aria-label="Main navigation">
        <div className="nav-container">
          <div className="nav-brand">
            <span className="brand-name">AidSync</span>
          </div>
          <a href="#early-access" className="nav-cta">Get early access</a>
        </div>
      </nav>

      <main>
        <HeroSection />
        <ProblemSection />
        <WorkflowSection />
        <FeaturesSection />
        <UsersSection />
        <EarlyAccessSection />
        <FAQSection />
      </main>

      <Footer />
    </div>
  );
}
