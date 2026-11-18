import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { KeyRound, Laptop, Loader2, Save, Trash2 } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import {
  changePassword,
  getActiveSessions,
  getDashboardSummary,
  requestAccountDeletion,
  revokeSession,
  updateProfile,
  upsertSellerProfile,
  type NotificationPreferences,
} from "../services/api";

interface SessionItem {
  id: string;
  userAgent: string;
  ipAddress: string;
  createdAt: string;
  lastActiveAt: string;
  isCurrent: boolean;
}

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required."),
    newPassword: z
      .string()
      .min(12, "New password must be at least 12 characters.")
      .regex(/[A-Z]/, "Must include an uppercase letter.")
      .regex(/[a-z]/, "Must include a lowercase letter.")
      .regex(/[0-9]/, "Must include a number."),
    confirmPassword: z.string(),
  })
  .refine((v) => v.newPassword === v.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

type PasswordFormValues = z.infer<typeof passwordSchema>;

export default function SettingsPage() {
  const { user, setUser } = useAuth();

  const [fullName, setFullName] = useState(user?.fullName || "");
  const [preferredLanguage, setPreferredLanguage] = useState(
    user?.preferredLanguage || "en"
  );
  const [notificationPrefs, setNotificationPrefs] =
    useState<NotificationPreferences>(
      user?.notificationPrefs || {
        newMessages: true,
        securityAlerts: true,
        disputeUpdates: true,
        accountChanges: true,
        adminAnnouncements: true,
      }
    );
  const [profileStatus, setProfileStatus] = useState("");
  const [profileSaving, setProfileSaving] = useState(false);

  // Seller profile fields
  const [businessName, setBusinessName] = useState("");
  const [category, setCategory] = useState("General Commerce");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [website, setWebsite] = useState("");
  const [responseTimeLabel, setResponseTimeLabel] = useState("Within 24 hours");
  const [sellerStatus, setSellerStatus] = useState("");
  const [sellerSaving, setSellerSaving] = useState(false);

  // Sessions
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [passwordStatus, setPasswordStatus] = useState("");
  const [passwordError, setPasswordError] = useState("");

  // Account deletion
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleteStatus, setDeleteStatus] = useState("");

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordSchema),
  });

  async function loadExtras() {
    try {
      const sessRes = await getActiveSessions();
      setSessions((sessRes.sessions as SessionItem[]) || []);

      if (user?.role === "seller") {
        const dash = await getDashboardSummary();
        const sp = dash.data?.sellerProfile;
        if (sp) {
          setBusinessName(sp.businessName || "");
          setCategory(sp.category || "General Commerce");
          setLocation(sp.location || "");
          setDescription(sp.description || "");
          setWebsite(sp.website || "");
          setResponseTimeLabel(sp.responseTimeLabel || "Within 24 hours");
        }
      }
    } catch {
      // Non-blocking
    }
  }

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const sessRes = await getActiveSessions();
        if (active) {
          setSessions((sessRes.sessions as SessionItem[]) || []);
        }
        if (user?.role === "seller") {
          const dash = await getDashboardSummary();
          const sp = dash.data?.sellerProfile;
          if (active && sp) {
            setBusinessName(sp.businessName || "");
            setCategory(sp.category || "General Commerce");
            setLocation(sp.location || "");
            setDescription(sp.description || "");
            setWebsite(sp.website || "");
            setResponseTimeLabel(sp.responseTimeLabel || "Within 24 hours");
          }
        }
      } catch {
        // Non-blocking
      }
    })();
    return () => {
      active = false;
    };
  }, [user?.id, user?.role]);

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    setProfileSaving(true);
    setProfileStatus("");
    try {
      const res = await updateProfile({
        fullName,
        preferredLanguage,
        notificationPrefs,
      });
      if (res.user) {
        setUser(res.user);
      }
      setProfileStatus("Profile and preferences saved.");
    } catch (err) {
      setProfileStatus(
        err instanceof Error ? err.message : "Failed to save profile."
      );
    } finally {
      setProfileSaving(false);
    }
  }

  async function handleSaveSellerProfile(e: React.FormEvent) {
    e.preventDefault();
    setSellerSaving(true);
    setSellerStatus("");
    try {
      await upsertSellerProfile({
        businessName,
        category,
        location,
        description,
        website,
        responseTimeLabel,
      });
      setSellerStatus("Seller business profile saved.");
    } catch (err) {
      setSellerStatus(
        err instanceof Error ? err.message : "Failed to save business profile."
      );
    } finally {
      setSellerSaving(false);
    }
  }

  async function onPasswordSubmit(values: PasswordFormValues) {
    setPasswordStatus("");
    setPasswordError("");
    try {
      const res = await changePassword({
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      });
      setPasswordStatus(String(res.message || "Password updated."));
      reset();
      await loadExtras();
    } catch (err) {
      setPasswordError(
        err instanceof Error ? err.message : "Unable to update password."
      );
    }
  }

  async function handleRevokeSession(sessionId: string) {
    try {
      await revokeSession(sessionId);
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
    } catch {
      // Ignore error
    }
  }

  async function handleRequestDeletion() {
    try {
      const res = await requestAccountDeletion();
      setDeleteStatus(String(res.message || "Deletion request recorded."));
      setConfirmDelete(false);
    } catch (err) {
      setDeleteStatus(
        err instanceof Error ? err.message : "Failed to record request."
      );
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[#102A3A]">
          Account & Preferences
        </h1>
        <p className="mt-1 text-sm text-[#64748B]">
          Manage your profile, language settings, notifications, password, and active sessions.
        </p>
      </div>

      {/* General Profile & Language & Notifications */}
      <form
        onSubmit={handleSaveProfile}
        className="rounded-xl border border-slate-200 bg-white p-6"
      >
        <h2 className="text-base font-semibold text-[#102A3A]">
          Profile & Notification Preferences
        </h2>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label
              htmlFor="settings-fullname"
              className="block text-xs font-semibold text-[#172B3A]"
            >
              Full Name
            </label>
            <input
              id="settings-fullname"
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              minLength={2}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-[#167C91]"
            />
          </div>

          <div>
            <label
              htmlFor="settings-language"
              className="block text-xs font-semibold text-[#172B3A]"
            >
              Preferred Language
            </label>
            <select
              id="settings-language"
              value={preferredLanguage}
              onChange={(e) => setPreferredLanguage(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-[#167C91]"
            >
              <option value="en">English (en)</option>
              <option value="es">Spanish (es)</option>
              <option value="fr">French (fr)</option>
              <option value="de">German (de)</option>
              <option value="hi">Hindi (hi)</option>
              <option value="ta">Tamil (ta)</option>
            </select>
          </div>
        </div>

        <fieldset className="mt-6">
          <legend className="text-xs font-semibold text-[#172B3A]">
            Notification Categories
          </legend>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {(
              [
                ["newMessages", "New buyer/seller messages"],
                ["securityAlerts", "Security alerts & risk advisories"],
                ["disputeUpdates", "Dispute status updates"],
                ["accountChanges", "Account & password changes"],
                ["adminAnnouncements", "Administrator notices"],
              ] as const
            ).map(([key, label]) => (
              <label
                key={key}
                className="flex items-center gap-2.5 rounded-lg border border-slate-200 px-3 py-2 text-xs text-[#172B3A]"
              >
                <input
                  type="checkbox"
                  checked={Boolean(notificationPrefs[key])}
                  onChange={(e) =>
                    setNotificationPrefs((prev) => ({
                      ...prev,
                      [key]: e.target.checked,
                    }))
                  }
                  className="h-4 w-4 accent-[#167C91]"
                />
                <span>{label}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <div className="mt-5 flex items-center justify-between gap-4">
          <p className="text-xs font-medium text-[#167C91]">{profileStatus}</p>
          <button
            type="submit"
            disabled={profileSaving}
            className="inline-flex items-center gap-2 rounded-lg bg-[#167C91] px-4 py-2 text-xs font-semibold text-white hover:bg-[#105E6F] disabled:opacity-60"
          >
            <Save className="h-3.5 w-3.5" aria-hidden="true" />
            <span>{profileSaving ? "Saving..." : "Save Profile"}</span>
          </button>
        </div>
      </form>

      {/* Seller Business Profile (only for sellers) */}
      {user?.role === "seller" && (
        <form
          onSubmit={handleSaveSellerProfile}
          className="rounded-xl border border-slate-200 bg-white p-6"
        >
          <h2 className="text-base font-semibold text-[#102A3A]">
            Seller Business Profile
          </h2>
          <p className="mt-1 text-xs text-[#64748B]">
            Displayed to buyers in the Seller Directory and contributes to your explainable trust factors.
          </p>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="seller-business-name"
                className="block text-xs font-semibold text-[#172B3A]"
              >
                Business Name
              </label>
              <input
                id="seller-business-name"
                type="text"
                required
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-[#167C91]"
              />
            </div>

            <div>
              <label
                htmlFor="seller-category"
                className="block text-xs font-semibold text-[#172B3A]"
              >
                Category
              </label>
              <select
                id="seller-category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-[#167C91]"
              >
                <option>Pro Electronics</option>
                <option>Home & Workshop</option>
                <option>Apparel & Textiles</option>
                <option>General Commerce</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="seller-location"
                className="block text-xs font-semibold text-[#172B3A]"
              >
                Location
              </label>
              <input
                id="seller-location"
                type="text"
                required
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-[#167C91]"
              />
            </div>

            <div>
              <label
                htmlFor="seller-response-time"
                className="block text-xs font-semibold text-[#172B3A]"
              >
                Typical Response Time
              </label>
              <input
                id="seller-response-time"
                type="text"
                value={responseTimeLabel}
                onChange={(e) => setResponseTimeLabel(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-[#167C91]"
              />
            </div>

            <div className="sm:col-span-2">
              <label
                htmlFor="seller-website"
                className="block text-xs font-semibold text-[#172B3A]"
              >
                Website (optional)
              </label>
              <input
                id="seller-website"
                type="url"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                placeholder="https://example.com"
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-[#167C91]"
              />
            </div>

            <div className="sm:col-span-2">
              <label
                htmlFor="seller-description"
                className="block text-xs font-semibold text-[#172B3A]"
              >
                Storefront Description
              </label>
              <textarea
                id="seller-description"
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-[#167C91]"
              />
            </div>
          </div>

          <div className="mt-5 flex items-center justify-between gap-4">
            <p className="text-xs font-medium text-[#167C91]">{sellerStatus}</p>
            <button
              type="submit"
              disabled={sellerSaving}
              className="inline-flex items-center gap-2 rounded-lg bg-[#102A3A] px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
            >
              <Save className="h-3.5 w-3.5" aria-hidden="true" />
              <span>{sellerSaving ? "Saving..." : "Save Storefront"}</span>
            </button>
          </div>
        </form>
      )}

      {/* Password Update */}
      <form
        onSubmit={handleSubmit(onPasswordSubmit)}
        className="rounded-xl border border-slate-200 bg-white p-6"
        noValidate
      >
        <div className="flex items-center gap-2">
          <KeyRound className="h-4 w-4 text-[#167C91]" aria-hidden="true" />
          <h2 className="text-base font-semibold text-[#102A3A]">
            Change Password
          </h2>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <div>
            <label
              htmlFor="curr-pass"
              className="block text-xs font-semibold text-[#172B3A]"
            >
              Current Password
            </label>
            <input
              id="curr-pass"
              type="password"
              {...register("currentPassword")}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-[#167C91]"
            />
            {errors.currentPassword && (
              <p className="mt-1 text-xs text-[#D84B4B]">
                {errors.currentPassword.message}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="new-pass"
              className="block text-xs font-semibold text-[#172B3A]"
            >
              New Password
            </label>
            <input
              id="new-pass"
              type="password"
              {...register("newPassword")}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-[#167C91]"
            />
            {errors.newPassword && (
              <p className="mt-1 text-xs text-[#D84B4B]">
                {errors.newPassword.message}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="confirm-new-pass"
              className="block text-xs font-semibold text-[#172B3A]"
            >
              Confirm New Password
            </label>
            <input
              id="confirm-new-pass"
              type="password"
              {...register("confirmPassword")}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-[#167C91]"
            />
            {errors.confirmPassword && (
              <p className="mt-1 text-xs text-[#D84B4B]">
                {errors.confirmPassword.message}
              </p>
            )}
          </div>
        </div>

        {passwordError && (
          <p role="alert" className="mt-3 text-xs text-[#D84B4B]">
            {passwordError}
          </p>
        )}
        {passwordStatus && (
          <p className="mt-3 text-xs font-medium text-[#16845B]">
            {passwordStatus}
          </p>
        )}

        <div className="mt-4 flex justify-end">
          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex items-center gap-2 rounded-lg bg-[#102A3A] px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
          >
            {isSubmitting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : null}
            <span>Update Password</span>
          </button>
        </div>
      </form>

      {/* Active Sessions */}
      <section className="rounded-xl border border-slate-200 bg-white p-6">
        <div className="flex items-center gap-2">
          <Laptop className="h-4 w-4 text-[#167C91]" aria-hidden="true" />
          <h2 className="text-base font-semibold text-[#102A3A]">
            Active Sessions
          </h2>
        </div>

        {sessions.length === 0 ? (
          <p className="mt-3 text-xs text-[#64748B]">No active sessions found.</p>
        ) : (
          <ul className="mt-4 divide-y divide-slate-100">
            {sessions.map((s) => (
              <li
                key={s.id}
                className="flex flex-col justify-between gap-2 py-3 sm:flex-row sm:items-center"
              >
                <div className="min-w-0">
                  <p className="truncate text-xs font-semibold text-[#102A3A]">
                    {s.userAgent}{" "}
                    {s.isCurrent && (
                      <span className="text-[#16845B]">· Current session</span>
                    )}
                  </p>
                  <p className="mt-0.5 text-[11px] text-[#64748B] tabular-nums">
                    IP: {s.ipAddress} · Last active:{" "}
                    {new Date(s.lastActiveAt).toLocaleString()}
                  </p>
                </div>
                {!s.isCurrent && (
                  <button
                    type="button"
                    onClick={() => void handleRevokeSession(s.id)}
                    className="shrink-0 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-[#D84B4B] hover:bg-rose-50"
                  >
                    Revoke
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Account Deletion Request */}
      <section className="rounded-xl border border-rose-200 bg-white p-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-base font-semibold text-[#D84B4B]">
              Request Account Deletion
            </h2>
            <p className="mt-1 text-xs text-[#64748B]">
              Marks your account as pending deletion for administrator processing.
            </p>
            {deleteStatus && (
              <p className="mt-2 text-xs font-medium text-[#167C91]">
                {deleteStatus}
              </p>
            )}
          </div>

          {!confirmDelete ? (
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-rose-300 px-4 py-2 text-xs font-semibold text-[#D84B4B] hover:bg-rose-50"
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Request Deletion</span>
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setConfirmDelete(false)}
                className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-[#172B3A]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleRequestDeletion()}
                className="rounded-lg bg-[#D84B4B] px-3 py-2 text-xs font-semibold text-white hover:bg-rose-700"
              >
                Confirm Deletion Request
              </button>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
