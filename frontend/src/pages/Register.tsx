
import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
    ShieldCheck,
    Eye,
    EyeOff,
    User,
    Mail,
    LockKeyhole,
    ArrowRight,
    Store,
    ShoppingBag
} from "lucide-react";

import Logo from "../components/common/Logo";
import { registerUser } from "../services/api";

type UserRole = "buyer" | "seller";

export default function Register() {
    const navigate = useNavigate();

    const [showPassword, setShowPassword] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);

    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [role, setRole] = useState<UserRole>("buyer");
    const [terms, setTerms] = useState(false);

    const [message, setMessage] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    async function handleSubmit(e: FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setMessage("");

        if (password.length < 12) {
            setMessage("Password must contain at least 12 characters.");
            return;
        }

        if (password !== confirmPassword) {
            setMessage("Passwords do not match.");
            return;
        }

        if (!terms) {
            setMessage("Please accept the Terms and Privacy Policy.");
            return;
        }

        try {
            setIsLoading(true);

            const response = await registerUser({
                fullName: name.trim(),
                email: email.trim(),
                password,
                role
            });

            if (response.success && response.user) {
                setMessage("Account created successfully!");

                // The backend sets the authentication cookie.
                // Redirect after successful registration.
                navigate("/dashboard", { replace: true });
            } else {
                setMessage(response.message || "Registration failed.");
            }
        } catch (error) {
            setMessage(
                error instanceof Error
                    ? error.message
                    : "Unable to create your account. Please try again."
            );
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <div className="auth-layout">

            <section className="auth-brand-panel">
                <div className="auth-brand-content">
                    <Logo />

                    <div className="auth-brand-message">
                        <div className="auth-large-icon">
                            <ShieldCheck size={58} strokeWidth={1.3} />
                        </div>

                        <span className="auth-overline">
                            YOUR TRUSTED DIGITAL SPACE
                        </span>

                        <h1>
                            Connect safely.
                            <span> Build trust.</span>
                        </h1>

                        <p>
                            Join a platform that puts safer communication,
                            transparency and intelligent fraud awareness
                            at the centre of every interaction.
                        </p>

                        <div className="auth-benefits">
                            <div>
                                <ShieldCheck size={19} />
                                Security-focused interactions
                            </div>

                            <div>
                                <LockKeyhole size={19} />
                                Protected account access
                            </div>

                            <div>
                                <Store size={19} />
                                Buyer and seller communities
                            </div>
                        </div>
                    </div>

                    <div className="auth-brand-footer">
                        <ShieldCheck size={17} />
                        Designed for safer digital interactions
                    </div>
                </div>
            </section>

            <section className="auth-form-panel register-panel">
                <div className="auth-form-wrapper">

                    <div className="auth-mobile-logo">
                        <Logo />
                    </div>

                    <div className="auth-heading">
                        <span className="auth-label">GET STARTED</span>
                        <h2>Create your account</h2>
                        <p>Join TrustBridge and start building trust.</p>
                    </div>

                    <form onSubmit={handleSubmit} className="auth-form">

                        <div className="form-field">
                            <label htmlFor="register-name">Full name</label>

                            <div className="input-wrapper">
                                <User size={18} />

                                <input
                                    id="register-name"
                                    type="text"
                                    placeholder="Enter your full name"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    autoComplete="name"
                                    minLength={2}
                                    maxLength={80}
                                    required
                                    disabled={isLoading}
                                />
                            </div>
                        </div>

                        <div className="form-field">
                            <label htmlFor="register-email">Email address</label>

                            <div className="input-wrapper">
                                <Mail size={18} />

                                <input
                                    id="register-email"
                                    type="email"
                                    placeholder="you@example.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    autoComplete="email"
                                    required
                                    disabled={isLoading}
                                />
                            </div>
                        </div>

                        <div className="form-field">
                            <label>Choose account type</label>

                            <div className="role-selection">

                                <button
                                    type="button"
                                    className={`role-card ${role === "buyer" ? "selected" : ""}`}
                                    onClick={() => setRole("buyer")}
                                    aria-pressed={role === "buyer"}
                                    disabled={isLoading}
                                >
                                    <ShoppingBag size={23} />
                                    <strong>Buyer</strong>
                                    <span>Purchase safely</span>
                                </button>

                                <button
                                    type="button"
                                    className={`role-card ${role === "seller" ? "selected" : ""}`}
                                    onClick={() => setRole("seller")}
                                    aria-pressed={role === "seller"}
                                    disabled={isLoading}
                                >
                                    <Store size={23} />
                                    <strong>Seller</strong>
                                    <span>Sell with confidence</span>
                                </button>

                            </div>
                        </div>

                        <div className="form-field">
                            <label htmlFor="register-password">Password</label>

                            <div className="input-wrapper">
                                <LockKeyhole size={18} />

                                <input
                                    id="register-password"
                                    type={showPassword ? "text" : "password"}
                                    placeholder="Create a strong password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    autoComplete="new-password"
                                    minLength={12}
                                    maxLength={128}
                                    required
                                    disabled={isLoading}
                                />

                                <button
                                    type="button"
                                    className="password-toggle"
                                    onClick={() => setShowPassword(!showPassword)}
                                    aria-label={showPassword ? "Hide password" : "Show password"}
                                    disabled={isLoading}
                                >
                                    {showPassword
                                        ? <EyeOff size={18} />
                                        : <Eye size={18} />}
                                </button>
                            </div>

                            <span className="field-hint">
                                Use at least 12 characters.
                            </span>
                        </div>

                        <div className="form-field">
                            <label htmlFor="confirm-password">Confirm password</label>

                            <div className="input-wrapper">
                                <LockKeyhole size={18} />

                                <input
                                    id="confirm-password"
                                    type={showConfirm ? "text" : "password"}
                                    placeholder="Re-enter your password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    autoComplete="new-password"
                                    required
                                    disabled={isLoading}
                                />

                                <button
                                    type="button"
                                    className="password-toggle"
                                    onClick={() => setShowConfirm(!showConfirm)}
                                    aria-label={showConfirm ? "Hide password" : "Show password"}
                                    disabled={isLoading}
                                >
                                    {showConfirm
                                        ? <EyeOff size={18} />
                                        : <Eye size={18} />}
                                </button>
                            </div>
                        </div>

                        <label className="terms-option">
                            <input
                                type="checkbox"
                                checked={terms}
                                onChange={(e) => setTerms(e.target.checked)}
                                disabled={isLoading}
                            />

                            <span>
                                I agree to the Terms of Service and Privacy Policy.
                            </span>
                        </label>

                        <button
                            type="submit"
                            className="auth-primary-btn"
                            disabled={isLoading}
                        >
                            {isLoading ? "Creating account..." : "Create Account"}

                            {!isLoading && <ArrowRight size={18} />}
                        </button>

                        {message && (
                            <p className="auth-feedback" role="status">
                                {message}
                            </p>
                        )}

                    </form>

                    <p className="auth-bottom-text">
                        Already have an account?
                        <Link to="/login"> Sign in</Link>
                    </p>

                    <div className="auth-legal">
                        © 2026 TrustBridge. All rights reserved.
                    </div>

                </div>
            </section>

        </div>
    );
}
