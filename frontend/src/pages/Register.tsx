import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  Eye,
  EyeOff,
  Loader2,
  LockKeyhole,
  Mail,
  ShieldCheck,
  ShoppingBag,
  Store,
  User,
} from "lucide-react";
import Logo from "../components/common/Logo";
import { useAuth } from "../contexts/AuthContext";
import { registerUser } from "../services/api";

const registerSchema = z
  .object({
    fullName: z
      .string()
      .trim()
      .min(2, "Full name must be at least 2 characters.")
      .max(80, "Full name must not exceed 80 characters."),
    email: z.string().trim().email("Please enter a valid email address."),
    role: z.enum(["buyer", "seller"]),
    password: z
      .string()
      .min(12, "Password must contain at least 12 characters.")
      .max(128, "Password must not exceed 128 characters."),
    confirmPassword: z.string(),
    terms: z.boolean().refine((val) => val, {
      message: "You must accept the Terms of Service and Privacy Policy.",
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

type RegisterFormValues = z.infer<typeof registerSchema>;

export default function Register() {
  const navigate = useNavigate();
  const { setUser } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState("");

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      fullName: "",
      email: "",
      role: "buyer",
      password: "",
      confirmPassword: "",
      terms: false,
    },
  });

  const selectedRole = watch("role");

  async function onSubmit(values: RegisterFormValues) {
    setServerError("");
    try {
      const response = await registerUser({
        fullName: values.fullName.trim(),
        email: values.email.trim(),
        password: values.password,
        role: values.role,
      });

      if (response.success && response.user) {
        setUser(response.user);
        navigate("/dashboard", { replace: true });
      } else {
        setServerError(response.message || "Registration failed.");
      }
    } catch (err) {
      setServerError(
        err instanceof Error ? err.message : "Unable to register account."
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
            Connect safely. Build verifiable trust.
          </h1>
          <p className="mt-4 text-sm leading-relaxed text-slate-300">
            Create a Buyer or Seller account to access protected messaging,
            transparent trust scoring, and structured dispute workflows.
          </p>
        </div>

        <p className="text-xs text-slate-400">
          Role-based access control · Provisioned admin governance
        </p>
      </section>

      <section className="flex items-center justify-center px-4 py-10 sm:px-8 lg:col-span-7">
        <div className="w-full max-w-md">
          <div className="mb-6 lg:hidden">
            <Logo to="/" />
          </div>

          <h2 className="text-3xl font-bold tracking-tight text-[#102A3A]">
            Create your account
          </h2>
          <p className="mt-1.5 text-sm text-[#64748B]">
            Join TrustBridge as a Buyer or Seller.
          </p>

          <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4" noValidate>
            <div>
              <label
                htmlFor="register-name"
                className="block text-sm font-semibold text-[#172B3A]"
              >
                Full name
              </label>
              <div className="relative mt-1">
                <User
                  className="pointer-events-none absolute left-3.5 top-3 h-4 w-4 text-[#64748B]"
                  aria-hidden="true"
                />
                <input
                  id="register-name"
                  type="text"
                  autoComplete="name"
                  placeholder="Enter your full name"
                  {...register("fullName")}
                  className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-10 pr-3 text-sm text-[#172B3A] outline-none focus:border-[#167C91]"
                />
              </div>
              {errors.fullName && (
                <p className="mt-1 text-xs text-[#D84B4B]" role="alert">
                  {errors.fullName.message}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="register-email"
                className="block text-sm font-semibold text-[#172B3A]"
              >
                Email address
              </label>
              <div className="relative mt-1">
                <Mail
                  className="pointer-events-none absolute left-3.5 top-3 h-4 w-4 text-[#64748B]"
                  aria-hidden="true"
                />
                <input
                  id="register-email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  {...register("email")}
                  className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-10 pr-3 text-sm text-[#172B3A] outline-none focus:border-[#167C91]"
                />
              </div>
              {errors.email && (
                <p className="mt-1 text-xs text-[#D84B4B]" role="alert">
                  {errors.email.message}
                </p>
              )}
            </div>

            <div>
              <span className="block text-sm font-semibold text-[#172B3A]">
                Account type
              </span>
              <div className="mt-1.5 grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setValue("role", "buyer", { shouldValidate: true })}
                  aria-pressed={selectedRole === "buyer"}
                  className={`flex flex-col items-start rounded-lg border p-3 text-left transition-colors ${
                    selectedRole === "buyer"
                      ? "border-[#167C91] bg-[#E6F4F5]/70 text-[#102A3A]"
                      : "border-slate-300 bg-white text-[#64748B] hover:border-slate-400"
                  }`}
                >
                  <ShoppingBag className="h-5 w-5 text-[#167C91]" aria-hidden="true" />
                  <span className="mt-2 text-sm font-semibold text-[#102A3A]">
                    Buyer
                  </span>
                  <span className="text-xs">Purchase safely</span>
                </button>

                <button
                  type="button"
                  onClick={() => setValue("role", "seller", { shouldValidate: true })}
                  aria-pressed={selectedRole === "seller"}
                  className={`flex flex-col items-start rounded-lg border p-3 text-left transition-colors ${
                    selectedRole === "seller"
                      ? "border-[#167C91] bg-[#E6F4F5]/70 text-[#102A3A]"
                      : "border-slate-300 bg-white text-[#64748B] hover:border-slate-400"
                  }`}
                >
                  <Store className="h-5 w-5 text-[#167C91]" aria-hidden="true" />
                  <span className="mt-2 text-sm font-semibold text-[#102A3A]">
                    Seller
                  </span>
                  <span className="text-xs">Sell with confidence</span>
                </button>
              </div>
            </div>

            <div>
              <label
                htmlFor="register-password"
                className="block text-sm font-semibold text-[#172B3A]"
              >
                Password
              </label>
              <div className="relative mt-1">
                <LockKeyhole
                  className="pointer-events-none absolute left-3.5 top-3 h-4 w-4 text-[#64748B]"
                  aria-hidden="true"
                />
                <input
                  id="register-password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  placeholder="At least 12 characters"
                  {...register("password")}
                  className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-10 pr-10 text-sm text-[#172B3A] outline-none focus:border-[#167C91]"
                />
                <button
                  type="button"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  onClick={() => setShowPassword((p) => !p)}
                  className="absolute right-2.5 top-2.5 rounded p-1 text-[#64748B]"
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

            <div>
              <label
                htmlFor="confirm-password"
                className="block text-sm font-semibold text-[#172B3A]"
              >
                Confirm password
              </label>
              <div className="relative mt-1">
                <LockKeyhole
                  className="pointer-events-none absolute left-3.5 top-3 h-4 w-4 text-[#64748B]"
                  aria-hidden="true"
                />
                <input
                  id="confirm-password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  placeholder="Re-enter your password"
                  {...register("confirmPassword")}
                  className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-10 pr-3 text-sm text-[#172B3A] outline-none focus:border-[#167C91]"
                />
              </div>
              {errors.confirmPassword && (
                <p className="mt-1 text-xs text-[#D84B4B]" role="alert">
                  {errors.confirmPassword.message}
                </p>
              )}
            </div>

            <div>
              <label className="flex items-start gap-2.5 text-xs text-[#64748B]">
                <input
                  type="checkbox"
                  {...register("terms")}
                  className="mt-0.5 h-4 w-4 rounded border-slate-300 accent-[#167C91]"
                />
                <span>
                  I agree to the Terms of Service and Privacy Policy.
                </span>
              </label>
              {errors.terms && (
                <p className="mt-1 text-xs text-[#D84B4B]" role="alert">
                  {errors.terms.message}
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
                  <span>Creating account...</span>
                </>
              ) : (
                <>
                  <span>Create Account</span>
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </>
              )}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-[#64748B]">
            Already have an account?{" "}
            <Link to="/login" className="font-semibold text-[#167C91] hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </section>
    </div>
  );
}
