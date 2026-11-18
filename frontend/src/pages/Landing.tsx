import { useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  ChevronDown,
  Globe,
  LockKeyhole,
  MessageSquare,
  Scale,
  ScanSearch,
  ShieldCheck,
} from "lucide-react";
import Logo from "../components/common/Logo";
import heroWorkspaceImg from "../assets/images/trustbridge_hero_workspace_1795011851832.jpg";

const CAPABILITIES = [
  {
    index: "01",
    icon: MessageSquare,
    title: "Authenticated Buyer–Seller Messaging",
    description:
      "Every conversation is bound to verified buyer and seller roles with persistent message history, read receipts, and Socket.IO real-time updates.",
  },
  {
    index: "02",
    icon: ScanSearch,
    title: "Explainable Rule-Based Screening",
    description:
      "Automated rules flag off-platform payment requests, suspicious links, coercion language, and burst activity without making false claims of certainty.",
  },
  {
    index: "03",
    icon: ShieldCheck,
    title: "Transparent Trust Scoring",
    description:
      "Scores are computed from verifiable account age, profile completeness, fulfilled history, and confirmed dispute outcomes—or honestly marked when insufficient data exists.",
  },
  {
    index: "04",
    icon: Scale,
    title: "Structured Dispute Arbitration",
    description:
      "Documented evidence timelines, counterparty responses, and administrator review statuses keep transaction disputes transparent from filing to resolution.",
  },
  {
    index: "05",
    icon: Globe,
    title: "Multilingual Provider Architecture",
    description:
      "Users choose preferred languages while a modular translation adapter preserves original text and clearly labels machine-generated output when enabled.",
  },
];

const WORKFLOW_STEPS = [
  {
    step: "01",
    title: "Verify your role",
    description:
      "Register as a buyer or seller with Argon2 password protection, session tracking, and role-enforced permissions.",
  },
  {
    step: "02",
    title: "Discover & communicate",
    description:
      "Browse seller profiles, review explainable trust factors, and open encrypted-cookie authenticated threads.",
  },
  {
    step: "03",
    title: "Monitor & resolve",
    description:
      "Receive automated risk advisories on suspicious patterns and escalate unresolved issues through audited dispute workflows.",
  },
];

const FAQS = [
  {
    q: "How are TrustBridge trust scores calculated?",
    a: "Scores combine verifiable signals including account age, profile completeness, email verification, interaction history, and confirmed dispute or policy outcomes. New accounts with limited activity display 'Not enough data' rather than an invented score, and no score is presented as a guarantee.",
  },
  {
    q: "Does TrustBridge automatically accuse users of fraud?",
    a: "No. Rule-based screening raises potential risk advisories for participants and logs events for human administrator review. Unverified user reports do not automatically penalize an account.",
  },
  {
    q: "Can buyers or sellers register as administrators?",
    a: "No. Public registration strictly accepts Buyer or Seller roles. Administrator accounts are provisioned separately on the backend and protected by role-based access control.",
  },
  {
    q: "How does multilingual translation work?",
    a: "TrustBridge includes a provider abstraction that connects to an external translation service when configured via environment variables. When unconfigured, original messages are preserved without fabricating translations.",
  },
];

export default function Landing() {
  const [imgFailed, setImgFailed] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  return (
    <div className="min-h-screen bg-[#F5F8FB] text-[#172B3A]">
      {/* 1. Navigation bar (Strict 3-Zone Top Bar Contract) */}
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur-sm">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-8 px-4 sm:px-8">
          <Logo to="/" />

          <nav className="hidden items-center gap-6 text-sm font-medium text-[#64748B] md:flex">
            <a
              href="#features"
              className="whitespace-nowrap shrink-0 transition-colors hover:text-[#172B3A]"
            >
              Features
            </a>
            <a
              href="#how-it-works"
              className="whitespace-nowrap shrink-0 transition-colors hover:text-[#172B3A]"
            >
              How It Works
            </a>
            <Link
              to="/sellers"
              className="whitespace-nowrap shrink-0 transition-colors hover:text-[#172B3A]"
            >
              Sellers
            </Link>
            <Link
              to="/login"
              className="whitespace-nowrap shrink-0 transition-colors hover:text-[#172B3A]"
            >
              Sign In
            </Link>
          </nav>

          <div className="flex items-center gap-3 shrink-0">
            <Link
              to="/register"
              className="inline-flex items-center gap-2 whitespace-nowrap shrink-0 rounded-lg bg-[#167C91] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#105E6F]"
            >
              <span>Get Started</span>
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </header>

      <main>
        {/* 2. Hero Section */}
        <section className="mx-auto max-w-7xl px-4 py-16 sm:px-8 lg:py-24">
          <div className="grid items-stretch gap-12 lg:grid-cols-12">
            <div className="flex flex-col justify-center lg:col-span-6">
              <p className="text-xs font-semibold tracking-wide text-[#167C91]">
                Digital commerce trust & security infrastructure
              </p>

              <h1 className="mt-4 max-w-xl text-balance text-4xl font-bold tracking-tight text-[#102A3A] sm:text-5xl lg:text-[54px] lg:leading-[1.08]">
                Building Trust in Every Digital Interaction.
              </h1>

              <p className="mt-6 max-w-xl text-base leading-relaxed text-[#64748B] sm:text-lg">
                Connect, communicate, and transact with confidence through a
                secure platform designed to make buyer–seller interactions more
                transparent.
              </p>

              <div className="mt-8 flex flex-wrap items-center gap-4">
                <Link
                  to="/register"
                  className="inline-flex items-center gap-2 whitespace-nowrap rounded-lg bg-[#167C91] px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#105E6F]"
                >
                  <span>Get Started</span>
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
                <a
                  href="#features"
                  className="inline-flex items-center whitespace-nowrap rounded-lg border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-[#172B3A] transition-colors hover:bg-slate-50"
                >
                  Explore Features
                </a>
              </div>

              <div className="mt-8 flex flex-wrap items-center gap-3 text-xs font-medium text-[#64748B]">
                <span>Argon2 & HTTP-only sessions</span>
                <span aria-hidden="true">·</span>
                <span>Rule-based risk advisories</span>
                <span aria-hidden="true">·</span>
                <span>Audited dispute workflows</span>
              </div>
            </div>

            <div className="lg:col-span-6">
              <div className="h-full overflow-hidden rounded-2xl border border-slate-200 bg-white">
                {!imgFailed ? (
                  <img
                    src={heroWorkspaceImg}
                    alt="TrustBridge security operations workspace"
                    referrerPolicy="no-referrer"
                    onError={() => setImgFailed(true)}
                    className="h-72 w-full object-cover sm:h-96 lg:h-full"
                  />
                ) : (
                  <div className="flex h-full min-h-[320px] flex-col items-center justify-center bg-[#102A3A] p-8 text-center text-white">
                    <ShieldCheck className="h-14 w-14 text-[#58C4D4]" />
                    <p className="mt-4 text-lg font-semibold">
                      TrustBridge Interaction Workspace
                    </p>
                    <p className="mt-1 text-sm text-slate-300">
                      Protected buyer–seller messaging and risk monitoring
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* 3. TrustBridge Introduction */}
        <section className="border-y border-slate-200 bg-white py-16">
          <div className="mx-auto grid max-w-7xl gap-8 px-4 sm:px-8 lg:grid-cols-12">
            <div className="lg:col-span-4">
              <h2 className="text-2xl font-bold text-[#102A3A]">
                Built for transparent digital transactions
              </h2>
            </div>
            <div className="lg:col-span-8">
              <p className="text-base leading-relaxed text-[#64748B]">
                Online marketplaces often break down when communication moves
                into unmonitored channels or when buyers lack verifiable context
                about sellers. TrustBridge centralizes buyer–seller messaging,
                surfaces explainable trust factors, screens conversations with
                transparent rules, and provides structured arbitration when
                disagreements arise.
              </p>
            </div>
          </div>
        </section>

        {/* 4. Key Platform Features */}
        <section id="features" className="mx-auto max-w-7xl px-4 py-20 sm:px-8">
          <div className="max-w-2xl">
            <h2 className="text-3xl font-bold tracking-tight text-[#102A3A]">
              Core platform capabilities
            </h2>
            <p className="mt-3 text-base text-[#64748B]">
              Every module is backed by persistent database records, server-side
              authorization, and clear audit trails.
            </p>
          </div>

          <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {CAPABILITIES.map((cap, idx) => {
              const Icon = cap.icon;
              return (
                <article
                  key={cap.index}
                  className={`rounded-xl border border-slate-200 bg-white p-6 ${
                    idx === 0 ? "md:col-span-2 lg:col-span-2" : ""
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-semibold text-[#167C91] tabular-nums">
                      {cap.index}
                    </span>
                    <Icon className="h-5 w-5 text-[#167C91]" aria-hidden="true" />
                  </div>
                  <h3 className="mt-4 text-lg font-semibold text-[#102A3A]">
                    {cap.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-[#64748B]">
                    {cap.description}
                  </p>
                </article>
              );
            })}
          </div>
        </section>

        {/* 5. How It Works */}
        <section
          id="how-it-works"
          className="border-y border-slate-200 bg-white py-20"
        >
          <div className="mx-auto max-w-7xl px-4 sm:px-8">
            <h2 className="text-3xl font-bold tracking-tight text-[#102A3A]">
              How TrustBridge works
            </h2>
            <div className="mt-10 grid gap-8 md:grid-cols-3">
              {WORKFLOW_STEPS.map((item) => (
                <div
                  key={item.step}
                  className="rounded-xl border border-slate-200 bg-[#F5F8FB] p-6"
                >
                  <span className="font-mono text-sm font-bold text-[#167C91] tabular-nums">
                    {item.step}
                  </span>
                  <h3 className="mt-3 text-lg font-semibold text-[#102A3A]">
                    {item.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-[#64748B]">
                    {item.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 6. Buyer and Seller Benefits */}
        <section className="mx-auto max-w-7xl px-4 py-20 sm:px-8">
          <div className="grid gap-8 lg:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-white p-8">
              <p className="text-xs font-semibold text-[#167C91]">For Buyers</p>
              <h3 className="mt-2 text-2xl font-bold text-[#102A3A]">
                Evaluate sellers before committing
              </h3>
              <ul className="mt-6 space-y-3 text-sm text-[#64748B]">
                <li>Browse seller storefronts with verified business profiles and trust factor breakdowns.</li>
                <li>Receive automated alerts if a conversation introduces off-platform payment requests or phishing links.</li>
                <li>Open documented disputes with evidence logs directly from your buyer dashboard.</li>
              </ul>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-8">
              <p className="text-xs font-semibold text-[#167C91]">For Sellers</p>
              <h3 className="mt-2 text-2xl font-bold text-[#102A3A]">
                Demonstrate reliability with real history
              </h3>
              <ul className="mt-6 space-y-3 text-sm text-[#64748B]">
                <li>Publish a verified storefront profile with category, response commitments, and location details.</li>
                <li>Communicate with prospective buyers in real time with read receipts and audit integrity.</li>
                <li>Respond formally to disputes and build an explainable trust record over time.</li>
              </ul>
            </div>
          </div>
        </section>

        {/* 7. Security Features */}
        <section className="border-y border-slate-200 bg-[#102A3A] py-20 text-white">
          <div className="mx-auto max-w-7xl px-4 sm:px-8">
            <div className="grid items-start gap-10 lg:grid-cols-12">
              <div className="lg:col-span-5">
                <LockKeyhole className="h-8 w-8 text-[#58C4D4]" aria-hidden="true" />
                <h2 className="mt-4 text-3xl font-bold tracking-tight">
                  Security engineered at every layer
                </h2>
                <p className="mt-3 text-sm leading-relaxed text-slate-300">
                  All authorization, session revocation, password hashing, and
                  conversation access controls are enforced server-side.
                </p>
              </div>
              <div className="grid gap-6 sm:grid-cols-2 lg:col-span-7">
                <div className="rounded-xl border border-white/15 bg-white/5 p-5">
                  <h3 className="font-semibold text-white">Argon2 & HTTP-Only Sessions</h3>
                  <p className="mt-2 text-xs leading-relaxed text-slate-300">
                    Passwords are hashed with Argon2 and paired with revocable database-backed JWT sessions.
                  </p>
                </div>
                <div className="rounded-xl border border-white/15 bg-white/5 p-5">
                  <h3 className="font-semibold text-white">Strict Role-Based Access</h3>
                  <p className="mt-2 text-xs leading-relaxed text-slate-300">
                    Buyers, sellers, and administrators operate within isolated permissions validated on every endpoint.
                  </p>
                </div>
                <div className="rounded-xl border border-white/15 bg-white/5 p-5">
                  <h3 className="font-semibold text-white">Parameterized SQLite Persistence</h3>
                  <p className="mt-2 text-xs leading-relaxed text-slate-300">
                    All queries use bound parameters with foreign-key integrity and persistent storage across restarts.
                  </p>
                </div>
                <div className="rounded-xl border border-white/15 bg-white/5 p-5">
                  <h3 className="font-semibold text-white">Audit & Security Event Logs</h3>
                  <p className="mt-2 text-xs leading-relaxed text-slate-300">
                    Unauthorized access attempts, failed sign-in bursts, and moderation actions are logged for review.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 8. Frequently Asked Questions */}
        <section className="mx-auto max-w-4xl px-4 py-20 sm:px-8">
          <h2 className="text-center text-3xl font-bold tracking-tight text-[#102A3A]">
            Frequently asked questions
          </h2>
          <div className="mt-10 divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white">
            {FAQS.map((item, idx) => {
              const isOpen = openFaq === idx;
              return (
                <div key={item.q} className="p-5">
                  <button
                    type="button"
                    aria-expanded={isOpen}
                    onClick={() => setOpenFaq(isOpen ? null : idx)}
                    className="flex w-full items-center justify-between gap-4 text-left text-sm font-semibold text-[#102A3A]"
                  >
                    <span>{item.q}</span>
                    <ChevronDown
                      className={`h-4 w-4 shrink-0 text-[#64748B] transition-transform ${
                        isOpen ? "rotate-180" : ""
                      }`}
                    />
                  </button>
                  {isOpen && (
                    <p className="mt-3 text-sm leading-relaxed text-[#64748B]">
                      {item.a}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* 9. Call-to-action */}
        <section className="mx-auto max-w-7xl px-4 pb-20 sm:px-8">
          <div className="rounded-2xl border border-slate-200 bg-[#E6F4F5] px-6 py-12 text-center sm:px-12">
            <h2 className="text-3xl font-bold text-[#102A3A]">
              Start communicating with transparent safeguards
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-sm text-[#64748B]">
              Create a Buyer or Seller account in seconds, or explore active
              sellers in the directory.
            </p>
            <div className="mt-7 flex flex-wrap justify-center gap-4">
              <Link
                to="/register"
                className="inline-flex items-center gap-2 rounded-lg bg-[#167C91] px-6 py-3 text-sm font-semibold text-white hover:bg-[#105E6F]"
              >
                <span>Create Account</span>
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
              <Link
                to="/sellers"
                className="inline-flex items-center rounded-lg border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-[#172B3A] hover:bg-slate-50"
              >
                Browse Sellers
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* 10. Footer */}
      <footer className="border-t border-slate-200 bg-white py-8">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 text-xs text-[#64748B] sm:flex-row sm:px-8">
          <Logo to="/" />
          <div className="flex items-center gap-6">
            <Link to="/sellers" className="hover:text-[#172B3A]">
              Seller Directory
            </Link>
            <Link to="/login" className="hover:text-[#172B3A]">
              Sign In
            </Link>
            <Link to="/register" className="hover:text-[#172B3A]">
              Register
            </Link>
          </div>
          <p>© 2026 TrustBridge. Built for safer digital interactions.</p>
        </div>
      </footer>
    </div>
  );
}