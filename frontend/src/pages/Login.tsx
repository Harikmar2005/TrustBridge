
import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
    ShieldCheck,
    Eye,
    EyeOff,
    LockKeyhole,
    ArrowRight,
    Mail,
    ShieldCheckIcon,
    Loader2
} from "lucide-react";

import Logo from "../components/common/Logo";
import { loginUser } from "../services/api";

export default function Login() {
    const navigate = useNavigate();

    const [showPassword, setShowPassword] = useState(false);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [remember, setRemember] = useState(false);

    const [message, setMessage] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [isError, setIsError] = useState(false);

    async function handleSubmit(e: FormEvent<HTMLFormElement>) {
        e.preventDefault();

        setMessage("");
        setIsError(false);

        try {
            setIsLoading(true);

            const response = await loginUser({
                email: email.trim(),
                password
            });

            if (response.success && response.user) {
                setMessage("Login successful! Redirecting...");

                navigate("/dashboard", { replace: true });
            } else {
                setIsError(true);
                setMessage(response.message || "Unable to sign in.");
            }
        } catch (error) {
            setIsError(true);

            setMessage(
                error instanceof Error
                    ? error.message
                    : "Something went wrong. Please try again."
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
                            TRUST FIRST. TRANSACT SMARTER.
                        </span>

                        <h1>
                            Trust begins with
                            <span> every connection.</span>
                        </h1>

                        <p>
                            A safer digital experience starts with
                            smarter communication and intelligent
                            security.
                        </p>

                    </div>

                    <div className="auth-brand-footer">
                        <ShieldCheckIcon size={17} />
                        Designed for safer digital interactions
                    </div>

                </div>
            </section>

            <section className="auth-form-panel">

                <div className="auth-form-wrapper">

                    <div className="auth-mobile-logo">
                        <Logo />
                    </div>

                    <div className="auth-heading">
                        <span className="auth-label">WELCOME BACK</span>

                        <h2>Sign in to TrustBridge</h2>

                        <p>
                            Enter your credentials to access your account.
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="auth-form">

                        <div className="form-field">

                            <label htmlFor="login-email">
                                Email address
                            </label>

                            <div className="input-wrapper">

                                <Mail size={18} />

                                <input
                                    id="login-email"
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

                            <div className="form-label-row">
                                <label htmlFor="login-password">
                                    Password
                                </label>
                            </div>

                            <div className="input-wrapper">

                                <LockKeyhole size={18} />

                                <input
                                    id="login-password"
                                    type={showPassword ? "text" : "password"}
                                    placeholder="Enter your password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    autoComplete="current-password"
                                    required
                                    disabled={isLoading}
                                />

                                <button
                                    type="button"
                                    className="password-toggle"
                                    onClick={() => setShowPassword(!showPassword)}
                                    aria-label={
                                        showPassword ? "Hide password" : "Show password"
                                    }
                                    disabled={isLoading}
                                >
                                    {showPassword
                                        ? <EyeOff size={18} />
                                        : <Eye size={18} />}
                                </button>

                            </div>

                        </div>

                        <div className="form-options">

                            <label className="remember-option">

                                <input
                                    type="checkbox"
                                    checked={remember}
                                    onChange={(e) => setRemember(e.target.checked)}
                                    disabled={isLoading}
                                />

                                Remember me

                            </label>

                            <span className="forgot-password">
                                Forgot password?
                            </span>

                        </div>

                        <button
                            type="submit"
                            className="auth-primary-btn"
                            disabled={isLoading}
                        >

                            {isLoading ? (
                                <>
                                    <Loader2 className="spin" size={18} />
                                    Signing in...
                                </>
                            ) : (
                                <>
                                    Sign In
                                    <ArrowRight size={18} />
                                </>
                            )}

                        </button>

                        {message && (
                            <p
                                className="auth-feedback"
                                role={isError ? "alert" : "status"}
                                style={
                                    isError
                                        ? {
                                            background: "#fff0f0",
                                            color: "#c0392b"
                                        }
                                        : undefined
                                }
                            >
                                {message}
                            </p>
                        )}

                    </form>

                    <div className="auth-divider">
                        <span>SECURE ACCESS</span>
                    </div>

                    <div className="auth-security-note">

                        <ShieldCheck size={19} />

                        <div>
                            <strong>Your security matters</strong>

                            <p>
                                Your account access is designed with security in mind.
                            </p>
                        </div>

                    </div>

                    <p className="auth-bottom-text">
                        Don't have an account?
                        <Link to="/register"> Create an account</Link>
                    </p>

                    <div className="auth-legal">
                        © 2026 TrustBridge. All rights reserved.
                    </div>

                </div>

            </section>

        </div>
    );
}
