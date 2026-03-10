// AidSync Components
// All components for the coming soon page

import { useState, useRef } from 'react';

// ==================== Icons ====================

export function Logo({ size = 32 }: { size?: number }) {
  return (
    <img 
      src="/logo.png" 
      alt="AidSync Logo" 
      width={size} 
      height={size} 
      className="logo-img"
      style={{ objectFit: 'contain' }}
    />
  );
}

export function HeroImage() {
  return (
    <div className="hero-banner-container">
      <img 
        src="/hero-banner.png" 
        alt="AidSync Medication Safety System" 
        className="hero-banner-img"
      />
    </div>
  );
}

function Icon({ children, size = 16 }: { children: React.ReactNode; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      {children}
    </svg>
  );
}

export function ClockIcon({ size = 16 }: { size?: number }) {
  return (
    <Icon size={size}>
      <circle cx="8" cy="8" r="6"/>
      <path d="M8 5v3l2 2" strokeLinecap="round"/>
    </Icon>
  );
}

export function CardIcon({ size = 16 }: { size?: number }) {
  return (
    <Icon size={size}>
      <rect x="2" y="4" width="12" height="10" rx="1"/>
      <path d="M2 7h12"/>
    </Icon>
  );
}

export function PlusIcon({ size = 16 }: { size?: number }) {
  return (
    <Icon size={size}>
      <path d="M8 2v12M2 8h12" strokeLinecap="round"/>
    </Icon>
  );
}

// ==================== Sync Indicator ====================

export function SyncIndicator({ text, color }: { text: string; color: string }) {
  const colorMap: Record<string, string> = {
    caution: '#d97706',
    info: '#64748b',
    safe: '#16a34a',
    warning: '#dc2626',
  };

  return (
    <div className="sync-indicator">
      <span 
        className="sync-dot" 
        style={{ backgroundColor: colorMap[color] || colorMap.caution }}
      />
      <span className="sync-text">{text}</span>
    </div>
  );
}

// ==================== Hero Section ====================

export function HeroSection() {
  return (
    <header className="hero" role="banner">
      <div className="container">
        <div className="hero-layout">
          <div className="hero-content">
            <div className="hero-badge">
              <span className="badge-icon">🔶</span>
              <span>Offline-first medication safety</span>
            </div>
            <h1 className="hero-title">
              Prepare. Check.<br />Record. Sync.
            </h1>
            <p className="hero-subtitle">
              AidSync is an offline-first clinical workflow system. Prepare medication safety data online, 
              sync to field devices, and run suitability checks locally — even when the network fails.
            </p>
            <div className="hero-actions">
              <a href="#early-access" className="btn btn-primary">Join the waitlist</a>
              <a href="#how-it-works" className="btn btn-secondary">See how it works</a>
            </div>
            <div className="hero-meta">
              <span className="meta-item">
                <ClockIcon />
                Care continuity
              </span>
              <span className="meta-item">
                <CardIcon />
                Clinical safety assist
              </span>
              <span className="meta-item">
                <PlusIcon />
                Local SQLite data plane
              </span>
            </div>
          </div>
          <div className="hero-visual">
            <HeroImage />
            <DevicePreview />
          </div>
        </div>
      </div>
    </header>
  );
}

function DevicePreview() {
  return (
    <div className="device-preview">
      <div className="device-frame">
        <div className="device-screen">
          <div className="screen-header">
            <span className="screen-dot red"></span>
            <span className="screen-dot amber"></span>
            <span className="screen-dot green"></span>
          </div>
          <div className="screen-content">
            <div className="patient-card">
              <div className="patient-avatar">MJ</div>
              <div className="patient-info">
                <div className="patient-name">Maria Johnson</div>
                <div className="patient-meta">34 yrs • Pregnant</div>
              </div>
            </div>
            <div className="warning-card severe">
              <div className="warning-header">
                <WarningIcon />
                <span>Severe Warning</span>
              </div>
              <div className="warning-text">Active ingredient conflicts with penicillin allergy</div>
            </div>
            <div className="scan-result">
              <div className="scan-label">Medication: Amoxicillin 500mg</div>
              <div className="scan-status">Clinician review required</div>
            </div>
          </div>
        </div>
      </div>
      <div className="sync-pulse"></div>
    </div>
  );
}

function WarningIcon() {
  return (
    <svg className="warning-icon" viewBox="0 0 16 16" fill="none">
      <path d="M8 2L2 13h12L8 2z" fill="currentColor"/>
      <path d="M8 6v4M8 11.5v.5" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  );
}

// ==================== Problem Section ====================

export function ProblemSection() {
  return (
    <section className="section problem" aria-labelledby="problem-heading">
      <div className="container">
        <div className="section-grid">
          <div className="section-content">
            <h2 id="problem-heading" className="section-title">Connectivity fails at the worst moments.</h2>
            <p className="section-text">
              In rural outreach and disaster response, network availability is unpredictable. 
              Yet clinicians still need patient history, still need to check medication safety, 
              and still need to save encounter records.
            </p>
            <p className="section-text">
              AidSync keeps the critical workflow local-first. Patient records and medication safety 
              data remain available in local SQLite. Safety checks run on-device, and encounter 
              updates reconcile later through PowerSync.
            </p>
          </div>
          <div className="section-visual">
            <div className="problem-cards">
              <ProblemCard 
                icon="📡" 
                title="No signal, no service" 
                desc="Remote locations, infrastructure damage, overloaded networks" 
              />
              <ProblemCard 
                icon="⚠️" 
                title="Safety risks" 
                desc="Paper records are hard to cross-check against patient history" 
              />
              <ProblemCard 
                icon="📝" 
                title="Interrupted care" 
                desc="Waiting for sync blocks care and creates gaps in field records" 
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function ProblemCard({ icon, title, desc }: { icon: string; title: string; desc: string }) {
  return (
    <div className="problem-card">
      <div className="problem-icon">{icon}</div>
      <div className="problem-title">{title}</div>
      <div className="problem-desc">{desc}</div>
    </div>
  );
}

// ==================== Workflow Section ====================

const workflowSteps = [
  {
    icon: 'prepare',
    title: 'Prepare safety data',
    desc: 'Supervisors ingest and normalize medication leaflet data online using the AidSync dashboard.',
  },
  {
    icon: 'sync',
    title: 'Sync to field devices',
    desc: 'PowerSync streams patient records and safety reference data into local SQLite on clinician devices.',
  },
  {
    icon: 'check',
    title: 'Check suitability',
    desc: 'Deterministic rules compare medications against allergies, conditions, and history on-device.',
  },
  {
    icon: 'save',
    title: 'Record encounter',
    desc: 'Clinicians save reasoning and actions locally. Notes are captured quickly with Cactus transcription.',
  },
  {
    icon: 'sync-back',
    title: 'Sync back results',
    desc: 'Encounter outcomes reconcile with the backend when connectivity returns. No data loss.',
  },
];

export function WorkflowSection() {
  return (
    <section className="section workflow" id="how-it-works" aria-labelledby="workflow-heading">
      <div className="container">
        <div className="section-header centered">
          <h2 id="workflow-heading" className="section-title">How AidSync works</h2>
          <p className="section-subtitle">A system for medication safety in disconnected environments</p>
        </div>
        <div className="workflow-steps-layout">
          {workflowSteps.map((step, index) => (
            <WorkflowStep key={step.icon} step={step} index={index + 1} />
          ))}
        </div>
      </div>
    </section>
  );
}

function WorkflowStep({ step, index }: { step: typeof workflowSteps[0]; index: number }) {
  return (
    <div className="workflow-step">
      <div className="step-number">{index}</div>
      <div className={`step-icon ${step.icon.includes('sync') ? 'sync-icon' : ''}`}>
        <WorkflowIcon type={step.icon} />
      </div>
      <h3 className="step-title">{step.title}</h3>
      <p className="step-desc">{step.desc}</p>
    </div>
  );
}

function WorkflowIcon({ type }: { type: string }) {
  const icons: Record<string, React.ReactNode> = {
    prepare: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="3" width="18" height="18" rx="2"/>
        <path d="M3 9h18"/>
        <path d="M9 21V9"/>
      </svg>
    ),
    sync: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
        <path d="M3 3v5h5"/>
      </svg>
    ),
    check: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M9 12l2 2 4-4"/>
        <circle cx="12" cy="12" r="10"/>
      </svg>
    ),
    save: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/>
        <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
        <line x1="12" y1="19" x2="12" y2="22"/>
      </svg>
    ),
    'sync-back': (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/>
        <path d="M16 21h5v-5"/>
      </svg>
    ),
  };

  return icons[type] || null;
}

// ==================== Features Section ====================

const features = [
  {
    icon: 'offline',
    title: 'Offline-first continuity',
    desc: 'Care sessions continue without interruption. Patient data and safety checks are background infrastructure, not blockers.',
  },
  {
    icon: 'safety',
    title: 'Medication safety assist',
    desc: 'deterministic rules engine compares medications against allergies, conditions, and age-related cautions on-device.',
  },
  {
    icon: 'voice',
    title: 'Voice notes with Cactus',
    desc: 'Capture encounter notes quickly during treatment. Hybrid on-device and cloud transcription supports field workflows.',
  },
  {
    icon: 'explain',
    title: 'Transparent warnings',
    desc: 'Every safety alert explains why it triggered. Clinicians make informed decisions with clear reasoning, not black-box AI.',
  },
  {
    icon: 'audit',
    title: 'Full audit trail',
    desc: 'Every warning and clinician action is recorded in encounter history for supervisor review and clinical handoff.',
  },
  {
    icon: 'resilient',
    title: 'PowerSync reconciliation',
    desc: 'Sync is infrastructure. Resume partial syncs, handle conflicts, and ensure data integrity across unreliable networks.',
  },
];

export function FeaturesSection() {
  return (
    <section className="section features" aria-labelledby="features-heading">
      <div className="container">
        <div className="section-header centered">
          <h2 id="features-heading" className="section-title">Built for field conditions</h2>
        </div>
        <div className="features-grid">
          {features.map((feature) => (
            <FeatureCard key={feature.icon} feature={feature} />
          ))}
        </div>
      </div>
    </section>
  );
}

function FeatureCard({ feature }: { feature: typeof features[0] }) {
  return (
    <div className="feature-card">
      <div className={`feature-icon ${feature.icon}-icon`}>
        <FeatureIcon type={feature.icon} />
      </div>
      <h3 className="feature-title">{feature.title}</h3>
      <p className="feature-desc">{feature.desc}</p>
    </div>
  );
}

function FeatureIcon({ type }: { type: string }) {
  const icons: Record<string, React.ReactNode> = {
    offline: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 2a10 10 0 1 0 10 10"/>
        <path d="M12 12 4.5 4.5"/>
        <path d="M12 12v10"/>
      </svg>
    ),
    safety: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
        <path d="m9 12 2 2 4-4"/>
      </svg>
    ),
    voice: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/>
        <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
        <line x1="12" y1="19" x2="12" y2="22"/>
      </svg>
    ),
    explain: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="10"/>
        <line x1="12" y1="16" x2="12" y2="12"/>
        <line x1="12" y1="8" x2="12.01" y2="8"/>
      </svg>
    ),
    audit: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
        <polyline points="14 2 14 8 20 8"/>
        <line x1="16" y1="13" x2="8" y2="13"/>
        <line x1="16" y1="17" x2="8" y2="17"/>
        <polyline points="10 9 9 9 8 9"/>
      </svg>
    ),
    resilient: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <polygon points="12 2 2 7 12 12 22 7 12 2"/>
        <polyline points="2 17 12 22 22 17"/>
        <polyline points="2 12 12 17 22 12"/>
      </svg>
    ),
  };

  return icons[type] || null;
}

// ==================== Users Section ====================

const userTypes = [
  { icon: '🏥', label: 'Field doctors' },
  { icon: '🚑', label: 'Outreach clinicians' },
  { icon: '👩‍⚕️', label: 'Mobile nurses' },
  { icon: '🌍', label: 'NGO medical teams' },
  { icon: '⚡', label: 'Disaster response' },
];

const useCases = [
  'Rural outreach programs',
  'Disaster and emergency response',
  'Conflict-affected areas',
  'Remote and wilderness medicine',
];

export function UsersSection() {
  return (
    <section className="section users" aria-labelledby="users-heading">
      <div className="container">
        <div className="section-grid reversed">
          <div className="section-visual">
            <div className="user-types">
              {userTypes.map((user) => (
                <div key={user.label} className="user-type">
                  <div className="user-icon">{user.icon}</div>
                  <div className="user-label">{user.label}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="section-content">
            <h2 id="users-heading" className="section-title">For clinicians in challenging environments</h2>
            <p className="section-text">
              AidSync is designed for medical professionals working where infrastructure is unreliable 
              but patient care cannot wait. Rural health workers, disaster response teams, and 
              mobile clinic staff need tools that work regardless of connectivity.
            </p>
            <div className="use-cases">
              {useCases.map((useCase) => (
                <div key={useCase} className="use-case">
                  <span className="use-case-marker"></span>
                  <span>{useCase}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ==================== Early Access Section ====================

export function EarlyAccessSection() {
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isError, setIsError] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setIsError(false);

    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;
    const organization = formData.get('organization') as string;
    const role = formData.get('role') as string;
    const hp_field = formData.get('hp_field') as string;

    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

      if (!supabaseUrl || !supabasePublishableKey) {
        console.error('Supabase configuration missing');
        setIsError(true);
        setIsLoading(false);
        return;
      }

      const response = await fetch(
        `${supabaseUrl}/functions/v1/join-waitlist`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabasePublishableKey}`,
          },
          body: JSON.stringify({ email, organization, role, hp_field }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = 'Failed to join waitlist';
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.error || errorMessage;
        } catch (e) {
          // Fallback to raw text if not JSON
          errorMessage = errorText || errorMessage;
        }
        throw new Error(errorMessage);
      }

      setIsSubmitted(true);
    } catch (err: any) {
      console.error('Waitlist submission error:', err);
      setIsError(true);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <section className="section early-access" id="early-access" aria-labelledby="early-access-heading">
      <div className="container">
        <div className="access-card">
          <div className="access-content">
            <h2 id="early-access-heading" className="access-title">Get early access</h2>
            <p className="access-desc">
              AidSync is currently in development. Join the waitlist to be among the first 
              to try the offline-first field care platform.
            </p>

            {!isSubmitted ? (
              <form className="access-form" onSubmit={handleSubmit}>
                {/* Honey-pot protection */}
                <input type="text" name="hp_field" style={{ display: 'none' }} tabIndex={-1} autoComplete="off" />
                
                <div className="form-row">
                  <div className="form-field">
                    <label htmlFor="email" className="form-label">Email address</label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      className="form-input"
                      placeholder="clinician@organization.org"
                      required
                      autoComplete="email"
                    />
                  </div>
                  <div className="form-field">
                    <label htmlFor="organization" className="form-label">Organization</label>
                    <input
                      type="text"
                      id="organization"
                      name="organization"
                      className="form-input"
                      placeholder="Your clinic or NGO"
                      autoComplete="organization"
                    />
                  </div>
                </div>
                <div className="form-field">
                  <label htmlFor="role" className="form-label">Your role</label>
                  <select id="role" name="role" className="form-select">
                    <option value="">Select your role...</option>
                    <option value="physician">Physician / Doctor</option>
                    <option value="nurse">Nurse / Nurse Practitioner</option>
                    <option value="paramedic">Paramedic / EMT</option>
                    <option value="pharmacist">Pharmacist</option>
                    <option value="supervisor">Clinical Supervisor</option>
                    <option value="it">IT / Health Informatics</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <button type="submit" className="btn btn-primary btn-large" disabled={isLoading}>
                  {isLoading ? 'Sending...' : 'Join the waitlist'}
                </button>
                {isError && (
                  <div className="form-error">
                    <p>Please check your email and try again.</p>
                  </div>
                )}
              </form>
            ) : (
              <div className="form-success">
                <div className="success-icon">✓</div>
                <h3 className="success-title">You&apos;re on the list</h3>
                <p className="success-text">We&apos;ll be in touch when AidSync is ready for early access.</p>
              </div>
            )}

            <p className="access-note">
              <ClockIcon />
              No spam. Unsubscribe anytime. We respect your privacy.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

// ==================== FAQ Section ====================

const faqs = [
  {
    question: 'Is AidSync a diagnostic tool?',
    answer: 'No. AidSync is a clinical safety assist and field workflow tool. It helps clinicians check medication suitability against patient history, but it does not diagnose conditions or make prescribing decisions. Clinical judgment remains with the healthcare provider.',
  },
  {
    question: 'What happens when there\'s no internet?',
    answer: 'AidSync is designed for disconnected environments. Patient records and medication safety reference data are stored in a local SQLite data plane. Suitability checks run on-device. When connectivity returns, PowerSync automatically reconciles local encounter outcomes with the cloud backend.',
  },
  {
    question: 'How is medication safety data prepared?',
    answer: 'Medication leaflet and reference data is ingested and normalized online through the AidSync dashboard. Once reviewed, this decision-critical data is published to field devices using PowerSync Sync Streams.',
  },
  {
    question: 'What devices does AidSync support?',
    answer: 'AidSync is built with Flutter and will initially support Android smartphones and tablets. The interface is optimized for field conditions — large touch targets, high contrast, and legibility in harsh lighting.',
  },
  {
    question: 'Who can see patient data?',
    answer: 'Patient data is synced securely through PowerSync to your organization\'s Supabase backend. Supervisors can review synced encounter logs and clinician actions via the dashboard for audit and training purposes.',
  },
];

export function FAQSection() {
  return (
    <section className="section faq" aria-labelledby="faq-heading">
      <div className="container">
        <div className="section-header centered">
          <h2 id="faq-heading" className="section-title">Common questions</h2>
        </div>
        <div className="faq-list">
          {faqs.map((faq, index) => (
            <FAQItem key={index} faq={faq} />
          ))}
        </div>
      </div>
    </section>
  );
}

function FAQItem({ faq }: { faq: typeof faqs[0] }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className={`faq-item ${isOpen ? 'open' : ''}`}>
      <button 
        className="faq-question" 
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
      >
        {faq.question}
        <span className={`faq-icon ${isOpen ? 'open' : ''}`}></span>
      </button>
      {isOpen && (
        <div className="faq-answer">
          <p>{faq.answer}</p>
        </div>
      )}
    </div>
  );
}

// ==================== Footer ====================

export function Footer() {
  return (
    <footer className="footer" role="contentinfo">
      <div className="container">
        <div className="footer-grid">
          <div className="footer-brand">
            <div className="footer-logo">
              <span>AidSync</span>
            </div>
            <p className="footer-tagline">Field care, even offline.</p>
          </div>

          <div className="footer-links">
            <div className="footer-section">
              <h3 className="footer-heading">Product</h3>
              <ul className="footer-list">
                <li><a href="#how-it-works">How it works</a></li>
                <li><a href="#features">Features</a></li>
                <li><a href="#early-access">Early access</a></li>
              </ul>
            </div>
            <div className="footer-section">
              <h3 className="footer-heading">Resources</h3>
              <ul className="footer-list">
                <li><a href="#faq">FAQ</a></li>
                <li><a href="mailto:hello@aidsync.io">Contact</a></li>
              </ul>
            </div>
            <div className="footer-section">
              <h3 className="footer-heading">Connect</h3>
              <ul className="footer-list">
                <li><a href="https://twitter.com/aidsync" target="_blank" rel="noopener noreferrer">Twitter</a></li>
                <li><a href="https://linkedin.com/company/aidsync" target="_blank" rel="noopener noreferrer">LinkedIn</a></li>
                <li><a href="mailto:hello@aidsync.io">hello@aidsync.io</a></li>
              </ul>
            </div>
          </div>
        </div>

        <div className="footer-bottom">
          <p className="footer-legal">
            © {new Date().getFullYear()} AidSync. All rights reserved.
            <span className="legal-separator">•</span>
            <a href="#privacy">Privacy</a>
            <span className="legal-separator">•</span>
            <a href="#terms">Terms</a>
          </p>
          <p className="footer-tech" style={{ color: 'var(--color-text-inverse)', opacity: 0.8 }}>
            Built with <a href="https://flutter.dev" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--color-text-inverse)', fontWeight: 500 }}>Flutter</a>,{' '}
            <a href="https://supabase.com" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--color-text-inverse)', fontWeight: 500 }}>Supabase</a>,{' '}
            <a href="https://powersync.com" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--color-text-inverse)', fontWeight: 500 }}>PowerSync</a>,{' '}
            and <a href="https://cactus.ai" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--color-text-inverse)', fontWeight: 500 }}>Cactus</a>.
          </p>
        </div>
      </div>
    </footer>
  );
}
