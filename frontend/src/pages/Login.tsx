import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  LockKeyhole,
  Mail,
  ShieldCheck,
} from "lucide-react";
import Logo from "../components/common/Logo";
import { useAuth } from "../contexts/AuthContext";
import {
  loginUser,
  requestPasswordReset,
  resetPasswordWithToken,
} from "../services/api";

const loginSchema = z.object({
  email: z.string().trim().email("Please enter a valid email address."),
  password: z.string().min(1, "Password is required."),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function Login() {
  const navigate = useNavigate();
  const { setUser } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState("");
  const [resetOpen, setResetOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [resetPassword, setResetPassword] = useState("");
  const [resetStatus, setResetStatus] = useState("");
  const [devTokenNotice, setDevTokenNotice] = useState("");

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  async function onSubmit(values: LoginFormValues) {
    setServerError("");
    try {
      const response = await loginUser({
        email: values.email.trim(),
        password: values.password,
      });

      if (response.success && response.user) {
        setUser(response.user);
        navigate(response.user.role === "admin" ? "/admin" : "/dashboard", {
          replace: true,
        });
      } else {
        setServerError(response.message || "Unable to sign in.");
      }
    } catch (err) {
      setServerError(
        err instanceof Error ? err.message : "Unable to sign in right now."
      );
    }
  }

  function fillDemoCredentials(email: string, password: string) {
    setValue("email", email, { shouldValidate: true });
    setValue("password", password, { shouldValidate: true });
    setServerError("");
  }

  async function handleRequestReset() {
    setResetStatus("");
    setDevTokenNotice("");
    try {
      const res = await requestPasswordReset(resetEmail);
      setResetStatus(String(res.message || "Reset instructions generated."));
      if (typeof res.devResetToken === "string") {
        setDevTokenNotice(res.devResetToken);
        setResetToken(res.devResetToken);
      }
    } catch (err) {
      setResetStatus(
        err instanceof Error ? err.message : "Failed to request reset."
      );
    }
  }

  async function handleConfirmReset() {
    setResetStatus("");
    try {
      const res = await resetPasswordWithToken({
        token: resetToken.trim(),
        newPassword: resetPassword,
      });
      setResetStatus(String(res.message || "Password updated."));
      setResetPassword("");
    } catch (err) {
      setResetStatus(
        err instanceof Error ? err.message : "Failed to reset password."
      );
    }
  }

  return (
    <div className="grid min-h-screen bg-white lg:grid-cols-12">
      <section className="hidden flex-col justify-between bg-[#102A3A] p-12 text-white lg:col-span-5 lg:flex">
        <Logo light to="/" />

        <div className="max-w-md">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-xl border border-white/15 bg-white/5 text-[#58C4D4]">
            <ShieldCheck className="h-8 w-8" />
          </div>
          <h1 className="mt-8 text-4xl font-bold tracking-tight">
            Sign in to your TrustBridge workspace.
          </h1>
          <p className="mt-4 text-sm leading-relaxed text-slate-300">
            Access authenticated buyer–seller conversations, rule-based safety
            alerts, explainable trust scores, and dispute arbitration.
          </p>
        </div>

        <p className="text-xs text-slate-400">
          HTTP-only JWT cookie sessions · Argon2 credential protection
        </p>
      </section>

      <section className="flex items-center justify-center px-4 py-12 sm:px-8 lg:col-span-7">
        <div className="w-full max-w-md">
          <div className="mb-8 lg:hidden">
            <Logo to="/" />
          </div>

          <h2 className="text-3xl font-bold tracking-tight text-[#102A3A]">
            Welcome back
          </h2>
          <p className="mt-2 text-sm text-[#64748B]">
            Enter your account credentials to continue.
          </p>

          <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-5" noValidate>
            <div>
              <label
                htmlFor="login-email"
                className="block text-sm font-semibold text-[#172B3A]"
              >
                Email address
              </label>
              <div className="relative mt-1.5">
                <Mail
                  className="pointer-events-none absolute left-3.5 top-3.5 h-4 w-4 text-[#64748B]"
                  aria-hidden="true"
                />
                <input
                  id="login-email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  {...register("email")}
                  className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-10 pr-3 text-sm text-[#172B3A] outline-none transition-colors focus:border-[#167C91]"
                />
              </div>
              {errors.email && (
                <p className="mt-1 text-xs text-[#D84B4B]" role="alert">
                  {errors.email.message}
                </p>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label
                  htmlFor="login-password"
                  className="block text-sm font-semibold text-[#172B3A]"
                >
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => setResetOpen((p) => !p)}
                  className="text-xs font-semibold text-[#167C91] hover:underline"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative mt-1.5">
                <LockKeyhole
                  className="pointer-events-none absolute left-3.5 top-3.5 h-4 w-4 text-[#64748B]"
                  aria-hidden="true"
                />
                <input
                  id="login-password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  {...register("password")}
                  className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-10 pr-10 text-sm text-[#172B3A] outline-none transition-colors focus:border-[#167C91]"
                />
                <button
                  type="button"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  onClick={() => setShowPassword((p) => !p)}
                  className="absolute right-2.5 top-2.5 rounded p-1 text-[#64748B] hover:text-[#172B3A]"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1 text-xs text-[#D84B4B]" role="alert">
                  {errors.password.message}
                </p>
              )}
            </div>

            {serverError && (
              <div
                role="alert"
                className="rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs font-medium text-[#D84B4B]"
              >
                {serverError}
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#167C91] py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#105E6F] disabled:opacity-60"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Signing in...</span>
                </>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </>
              )}
            </button>
          </form>

          {/* Local development seeded accounts helper */}
          <div className="mt-6 rounded-xl border border-slate-200 bg-[#F5F8FB] p-4">
            <p className="text-xs font-semibold text-[#172B3A]">
              Seeded local evaluation accounts
            </p>
            <p className="mt-1 text-xs text-[#64748B]">
              Populate credentials for real server-side authentication:
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() =>
                  fillDemoCredentials(
                    "buyer@trustbridge.local",
                    "TrustBridgeBuyer!2026"
                  )
                }
                className="rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-[#172B3A] hover:bg-slate-50"
              >
                Fill Buyer
              </button>
              <button
                type="button"
                onClick={() =>
                  fillDemoCredentials(
                    "elena@vanceaudio.local",
                    "TrustBridgeSeller!2026"
                  )
                }
                className="rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-[#172B3A] hover:bg-slate-50"
              >
                Fill Seller
              </button>
              <button
                type="button"
                onClick={() =>
                  fillDemoCredentials(
                    "admin@trustbridge.local",
                    "TrustBridgeAdmin!2026"
                  )
                }
                className="rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-[#172B3A] hover:bg-slate-50"
              >
                Fill Admin
              </button>
            </div>
          </div>

          {/* Development Password Reset Workflow */}
          {resetOpen && (
            <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4">
              <div className="flex items-center gap-2 text-xs font-semibold text-[#102A3A]">
                <KeyRound className="h-4 w-4 text-[#167C91]" />
                <span>Password reset (development workflow)</span>
              </div>
              <p className="mt-1 text-xs text-[#64748B]">
                External email delivery is not configured in local mode; a temporary reset token is returned directly for verification.
              </p>
              <div className="mt-3 space-y-2.5">
                <div className="flex gap-2">
                  <input
                    type="email"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    placeholder="Account email"
                    aria-label="Reset account email"
                    className="flex-1 rounded-lg border border-slate-300 px-3 py-1.5 text-xs outline-none focus:border-[#167C91]"
                  />
                  <button
                    type="button"
                    onClick={handleRequestReset}
                    className="rounded-lg bg-[#102A3A] px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800"
                  >
                    Generate Token
                  </button>
                </div>

                {devTokenNotice && (
                  <p className="break-all rounded bg-slate-100 p-2 font-mono text-[11px] text-[#172B3A]">
                    Dev token: {devTokenNotice}
                  </p>
                )}

                <input
                  type="text"
                  value={resetToken}
                  onChange={(e) => setResetToken(e.target.value)}
                  placeholder="Reset token"
                  aria-label="Password reset token"
                  className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-xs outline-none focus:border-[#167C91]"
                />
                <div className="flex gap-2">
                  <input
                    type="password"
                    value={resetPassword}
                    onChange={(e) => setResetPassword(e.target.value)}
                    placeholder="New password (min 12 chars)"
                    aria-label="New password"
                    className="flex-1 rounded-lg border border-slate-300 px-3 py-1.5 text-xs outline-none focus:border-[#167C91]"
                  />
                  <button
                    type="button"
                    onClick={handleConfirmReset}
                    className="rounded-lg bg-[#167C91] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#105E6F]"
                  >
                    Reset
                  </button>
                </div>
                {resetStatus && (
                  <p className="text-xs text-[#167C91]">{resetStatus}</p>
                )}
              </div>
            </div>
          )}

          <p className="mt-6 text-center text-sm text-[#64748B]">
            Don&apos;t have an account?{" "}
            <Link to="/register" className="font-semibold text-[#167C91] hover:underline">
              Create an account
            </Link>
          </p>
        </div>
      </section>
    </div>
  );
}
