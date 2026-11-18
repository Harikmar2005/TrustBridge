import { Link } from "react-router-dom";
import {
    ShieldCheck,
    LockKeyhole,
    MessageCircle,
    ScanSearch,
    ArrowRight,
    CheckCircle2,
    Globe
} from "lucide-react";
import Logo from "../components/common/Logo";

const features = [
    {
        icon: <ShieldCheck />,
        title: "Trust Intelligence",
        description:
            "Evaluate suspicious interactions and understand potential risks before engaging."
    },
    {
        icon: <ScanSearch />,
        title: "AI Fraud Detection",
        description:
            "Identify suspicious messages, malicious links and common scam patterns."
    },
    {
        icon: <MessageCircle />,
        title: "Secure Communication",
        description:
            "Keep buyer and seller conversations organized with security-focused messaging."
    },
    {
        icon: <Globe />,
        title: "Multilingual Support",
        description:
            "Make communication accessible with multilingual assistance."
    }
];

export default function Landing() {
    return (
        <>
            <header className="landing-nav">
                <div className="container nav-content">
                    <Logo />

                    <nav>
                        <a href="#features">Features</a>
                        <a href="#how-it-works">How it works</a>
                        <Link to="/login">Login</Link>
                        <Link to="/register" className="btn btn-primary">
                            Get Started <ArrowRight size={15} />
                        </Link>
                    </nav>
                </div>
            </header>

            <main>
                <section className="hero container">
                    <div className="hero-content">
                        <span className="eyebrow">
                            <ShieldCheck size={16} />
                            TRUST FIRST. TRANSACT SMARTER.
                        </span>

                        <h1>
                            Building trust in
                            <br />
                            <span>every interaction.</span>
                        </h1>

                        <p>
                            TrustBridge brings secure communication,
                            intelligent fraud detection and trust
                            intelligence together to create safer
                            digital interactions.
                        </p>

                        <div className="hero-actions">
                            <Link to="/register" className="btn btn-primary">
                                Get Started <ArrowRight size={17} />
                            </Link>

                            <a href="#features" className="btn btn-outline">
                                Explore Features
                            </a>
                        </div>

                        <div className="hero-proof">
                            <CheckCircle2 size={17} />
                            Security-focused digital interactions
                        </div>
                    </div>

                    <div className="hero-visual">
                        <div className="visual-card">
                            <div className="visual-top">
                                <ShieldCheck size={30} />
                                <span>TRUSTBRIDGE SECURITY</span>
                            </div>

                            <div className="shield-graphic">
                                <ShieldCheck size={95} strokeWidth={1.3} />
                            </div>

                            <h3>Trust starts here.</h3>
                            <p>Communication with security at its core.</p>

                            <div className="security-status">
                                <span />
                                Security features available
                            </div>
                        </div>
                    </div>
                </section>

                <section id="features" className="features-section">
                    <div className="container">
                        <div className="section-heading">
                            <span className="eyebrow">OUR CAPABILITIES</span>
                            <h2>Security built around trust.</h2>
                            <p>
                                Tools designed to make digital interactions
                                safer and more transparent.
                            </p>
                        </div>

                        <div className="features-grid">
                            {features.map((feature) => (
                                <article className="card feature-card" key={feature.title}>
                                    <div className="feature-icon">{feature.icon}</div>
                                    <h3>{feature.title}</h3>
                                    <p>{feature.description}</p>
                                </article>
                            ))}
                        </div>
                    </div>
                </section>

                <section id="how-it-works" className="how-section container">
                    <span className="eyebrow">SIMPLE WORKFLOW</span>
                    <h2>Trust at every step.</h2>

                    <div className="steps-grid">
                        <div className="step">
                            <span>01</span>
                            <h3>Connect</h3>
                            <p>Join TrustBridge as a buyer or seller.</p>
                        </div>

                        <div className="step">
                            <span>02</span>
                            <h3>Communicate</h3>
                            <p>Start conversations through the platform.</p>
                        </div>

                        <div className="step">
                            <span>03</span>
                            <h3>Stay protected</h3>
                            <p>Use security intelligence to identify potential threats.</p>
                        </div>
                    </div>
                </section>

                <section className="cta-section container">
                    <LockKeyhole size={35} />
                    <h2>Make trust your first transaction.</h2>
                    <p>Start building safer digital relationships today.</p>
                    <Link to="/register" className="btn btn-primary">
                        Join TrustBridge <ArrowRight size={16} />
                    </Link>
                </section>
            </main>

            <footer>
                <div className="container footer-content">
                    <Logo />
                    <p>© 2026 TrustBridge. Built for safer digital interactions.</p>
                </div>
            </footer>
        </>
    );
}