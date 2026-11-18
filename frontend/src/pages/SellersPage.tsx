import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Flag,
  MapPin,
  MessageSquare,
  Search,
  ShieldCheck,
  Store,
} from "lucide-react";
import Logo from "../components/common/Logo";
import { useAuth } from "../contexts/AuthContext";
import {
  createConversation,
  listSellers,
  reportAccount,
  type SellerProfile,
} from "../services/api";

export default function SellersPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [sellers, setSellers] = useState<SellerProfile[]>([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");

  const [reportingSeller, setReportingSeller] = useState<SellerProfile | null>(
    null
  );
  const [reportReason, setReportReason] = useState("Suspicious listing claims");
  const [reportDetails, setReportDetails] = useState("");
  const [reportFeedback, setReportFeedback] = useState("");

  async function fetchSellers() {
    setLoading(true);
    setError("");
    try {
      const res = await listSellers({ q: search, category });
      setSellers((res.sellers as SellerProfile[]) || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load sellers.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const res = await listSellers({ q: search, category });
        if (active) {
          setSellers((res.sellers as SellerProfile[]) || []);
          setError("");
        }
      } catch (err) {
        if (active) {
          setError(
            err instanceof Error ? err.message : "Failed to load sellers."
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [category]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleStartConversation(sellerUserId: string) {
    setActionError("");
    if (!user) {
      navigate("/login");
      return;
    }
    try {
      const res = await createConversation(sellerUserId);
      if (res.conversationId) {
        navigate(`/dashboard/messages/${res.conversationId}`);
      }
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : "Unable to start conversation."
      );
    }
  }

  async function handleSubmitReport() {
    if (!reportingSeller) return;
    setReportFeedback("");
    try {
      const res = await reportAccount({
        reportedUserId: reportingSeller.userId,
        reason: reportReason,
        details: reportDetails,
      });
      setReportFeedback(String(res.message || "Report submitted."));
      setReportDetails("");
      setTimeout(() => {
        setReportingSeller(null);
        setReportFeedback("");
      }, 1200);
    } catch (err) {
      setReportFeedback(
        err instanceof Error ? err.message : "Failed to submit report."
      );
    }
  }

  const categories = ["all", "Pro Electronics", "Home & Workshop", "Apparel & Textiles", "General Commerce"];

  return (
    <div className="min-h-screen bg-[#F5F8FB] text-[#172B3A]">
      {!user && (
        <header className="border-b border-slate-200 bg-white">
          <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-8 px-4 sm:px-8">
            <Logo to="/" />
            <nav className="flex items-center gap-6 text-sm font-medium text-[#64748B]">
              <Link to="/" className="hover:text-[#172B3A]">
                Home
              </Link>
              <Link to="/login" className="hover:text-[#172B3A]">
                Sign In
              </Link>
            </nav>
            <Link
              to="/register"
              className="rounded-lg bg-[#167C91] px-4 py-2 text-sm font-semibold text-white hover:bg-[#105E6F]"
            >
              Get Started
            </Link>
          </div>
        </header>
      )}

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-8">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            {user && (
              <Link
                to="/dashboard"
                className="text-xs font-semibold text-[#167C91] hover:underline"
              >
                Back to Dashboard
              </Link>
            )}
            <h1 className="mt-1 text-3xl font-bold tracking-tight text-[#102A3A]">
              Seller Directory
            </h1>
            <p className="mt-1 text-sm text-[#64748B]">
              Inspect business profiles, explainable trust scores, and start verified buyer–seller conversations.
            </p>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              void fetchSellers();
            }}
            className="flex w-full max-w-md gap-2"
          >
            <div className="relative flex-1">
              <Search
                className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-[#64748B]"
                aria-hidden="true"
              />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search sellers, categories, locations..."
                aria-label="Search sellers"
                className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-[#167C91]"
              />
            </div>
            <button
              type="submit"
              className="rounded-lg bg-[#102A3A] px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
            >
              Search
            </button>
          </form>
        </div>

        {/* Category Filter Buttons */}
        <div className="mt-6 flex flex-wrap gap-2">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setCategory(cat)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                category === cat
                  ? "bg-[#167C91] text-white"
                  : "border border-slate-200 bg-white text-[#64748B] hover:text-[#172B3A]"
              }`}
            >
              {cat === "all" ? "All Categories" : cat}
            </button>
          ))}
        </div>

        {actionError && (
          <div
            role="alert"
            className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-[#D84B4B]"
          >
            {actionError}
          </div>
        )}

        {error && (
          <div
            role="alert"
            className="mt-6 rounded-xl border border-rose-200 bg-rose-50 p-6 text-sm text-[#D84B4B]"
          >
            {error}
          </div>
        )}

        {loading ? (
          <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-64 animate-pulse rounded-xl border border-slate-200 bg-white p-6"
              />
            ))}
          </div>
        ) : sellers.length === 0 ? (
          <div className="mt-8 rounded-xl border border-slate-200 bg-white p-12 text-center">
            <Store className="mx-auto h-10 w-10 text-slate-300" />
            <h2 className="mt-3 text-lg font-semibold text-[#102A3A]">
              No matching sellers found
            </h2>
            <p className="mt-1 text-sm text-[#64748B]">
              Try adjusting your search query or category filter.
            </p>
          </div>
        ) : (
          <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {sellers.map((seller) => {
              const ts = seller.trustScore;
              return (
                <article
                  key={seller.id}
                  className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-6"
                >
                  <div>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h2 className="text-lg font-semibold text-[#102A3A]">
                          {seller.businessName}
                        </h2>
                        <p className="mt-0.5 text-xs text-[#64748B]">
                          {seller.fullName} · {seller.category}
                        </p>
                      </div>
                      <span
                        className={`text-xs font-semibold ${
                          seller.verificationStatus === "verified"
                            ? "text-[#16845B]"
                            : "text-[#D99A28]"
                        }`}
                      >
                        {seller.verificationStatus === "verified"
                          ? "Verified"
                          : seller.verificationStatus === "pending"
                          ? "Pending review"
                          : "Unverified"}
                      </span>
                    </div>

                    <p className="mt-4 line-clamp-3 text-sm leading-relaxed text-[#64748B]">
                      {seller.description ||
                        "No storefront description provided yet."}
                    </p>

                    <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-[#64748B]">
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
                        {seller.location}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="tabular-nums">
                        {seller.completedTransactions} completed orders
                      </span>
                    </div>

                    <div className="mt-4 border-t border-slate-100 pt-3">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-medium text-[#64748B]">
                          Trust score
                        </span>
                        <span className="font-semibold text-[#102A3A] tabular-nums">
                          {ts?.insufficientData || ts?.score === null
                            ? "Not enough data"
                            : `${ts?.score}/100 (${ts?.level})`}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 flex items-center gap-2">
                    {(!user || user.role === "buyer") && (
                      <button
                        type="button"
                        onClick={() => handleStartConversation(seller.userId)}
                        className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-[#167C91] px-3 py-2 text-xs font-semibold text-white hover:bg-[#105E6F]"
                      >
                        <MessageSquare className="h-3.5 w-3.5" />
                        <span>Message Seller</span>
                      </button>
                    )}

                    {user && user.id !== seller.userId && (
                      <button
                        type="button"
                        aria-label={`Report ${seller.businessName}`}
                        onClick={() => setReportingSeller(seller)}
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-[#64748B] hover:text-[#D84B4B]"
                      >
                        <Flag className="h-3.5 w-3.5" />
                        <span>Report</span>
                      </button>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </main>

      {/* Report Modal */}
      {reportingSeller && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="report-seller-title"
        >
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-[#167C91]" />
              <h2
                id="report-seller-title"
                className="text-lg font-semibold text-[#102A3A]"
              >
                Report {reportingSeller.businessName}
              </h2>
            </div>
            <p className="mt-1 text-xs text-[#64748B]">
              Reports are reviewed by TrustBridge administrators and never automatically penalize an account without verification.
            </p>

            <div className="mt-4 space-y-3">
              <div>
                <label
                  htmlFor="report-reason"
                  className="block text-xs font-semibold text-[#172B3A]"
                >
                  Reason
                </label>
                <select
                  id="report-reason"
                  value={reportReason}
                  onChange={(e) => setReportReason(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-[#167C91]"
                >
                  <option>Suspicious listing claims</option>
                  <option>Off-platform payment solicitation</option>
                  <option>Impersonation or false identity</option>
                  <option>Abusive or deceptive behavior</option>
                </select>
              </div>

              <div>
                <label
                  htmlFor="report-details"
                  className="block text-xs font-semibold text-[#172B3A]"
                >
                  Details
                </label>
                <textarea
                  id="report-details"
                  rows={3}
                  value={reportDetails}
                  onChange={(e) => setReportDetails(e.target.value)}
                  placeholder="Describe the concern with specific details (min 10 characters)..."
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-[#167C91]"
                />
              </div>

              {reportFeedback && (
                <p className="text-xs font-medium text-[#167C91]">
                  {reportFeedback}
                </p>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setReportingSeller(null);
                    setReportFeedback("");
                  }}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-xs font-semibold text-[#172B3A]"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSubmitReport}
                  className="rounded-lg bg-[#D84B4B] px-4 py-2 text-xs font-semibold text-white hover:bg-rose-700"
                >
                  Submit Report
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
