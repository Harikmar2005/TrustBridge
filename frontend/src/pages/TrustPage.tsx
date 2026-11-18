import { useEffect, useState } from "react";
import {
  Info,
  Minus,
  RefreshCw,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import {
  getMyTrustScore,
  recalculateTrustScore,
  type TrustScoreResult,
} from "../services/api";

interface TrustHistoryItem {
  id: string;
  delta: number;
  reason: string;
  sourceType: string;
  createdAt: string;
}

export default function TrustPage() {
  const [trustScore, setTrustScore] = useState<TrustScoreResult | null>(null);
  const [history, setHistory] = useState<TrustHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  async function loadTrust() {
    setLoading(true);
    setError("");
    try {
      const res = await getMyTrustScore();
      if (res.data) {
        setTrustScore(res.data.trustScore);
        setHistory(res.data.history || []);
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to load trust evaluation."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const res = await getMyTrustScore();
        if (active && res.data) {
          setTrustScore(res.data.trustScore);
          setHistory(res.data.history || []);
          setError("");
        }
      } catch (err) {
        if (active) {
          setError(
            err instanceof Error
              ? err.message
              : "Unable to load trust evaluation."
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  async function handleRecalculate() {
    setRefreshing(true);
    setError("");
    try {
      await recalculateTrustScore();
      await loadTrust();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to refresh trust score."
      );
    } finally {
      setRefreshing(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-36 animate-pulse rounded-xl border border-slate-200 bg-white" />
        <div className="h-64 animate-pulse rounded-xl border border-slate-200 bg-white" />
      </div>
    );
  }

  if (error || !trustScore) {
    return (
      <div
        role="alert"
        className="rounded-xl border border-rose-200 bg-rose-50 p-6 text-sm text-[#D84B4B]"
      >
        {error || "Unable to load trust score details."}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header Summary */}
      <section className="flex flex-col justify-between gap-6 rounded-xl border border-slate-200 bg-white p-6 sm:flex-row sm:items-center">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-[#167C91]">
            Explainable Trust Engine
          </p>
          <div className="mt-2 flex items-baseline gap-4">
            <h1 className="text-3xl font-bold text-[#102A3A] tabular-nums">
              {trustScore.insufficientData || trustScore.score === null
                ? "Not enough data"
                : `${trustScore.score} / 100`}
            </h1>
            <span className="text-sm font-semibold text-[#64748B]">
              Standing: {trustScore.level}
            </span>
          </div>
          <p className="mt-2 text-xs text-[#64748B] tabular-nums">
            Last evaluated: {new Date(trustScore.lastUpdated).toLocaleString()}
          </p>
        </div>

        <button
          type="button"
          onClick={() => void handleRecalculate()}
          disabled={refreshing}
          className="inline-flex items-center gap-2 rounded-lg bg-[#167C91] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#105E6F] disabled:opacity-60"
        >
          <RefreshCw
            className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
            aria-hidden="true"
          />
          <span>{refreshing ? "Evaluating..." : "Recalculate"}</span>
        </button>
      </section>

      {/* Non-guarantee disclaimer */}
      <section className="flex items-start gap-3 rounded-xl border border-slate-200 bg-[#E6F4F5]/50 p-5 text-xs leading-relaxed text-[#172B3A]">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-[#167C91]" aria-hidden="true" />
        <p>{trustScore.disclaimer}</p>
      </section>

      {/* Contributing Factors */}
      <section className="rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="text-base font-semibold text-[#102A3A]">
          Contributing Score Factors
        </h2>
        <p className="mt-1 text-xs text-[#64748B]">
          Every signal below is derived directly from verified account, interaction, security, and dispute records.
        </p>

        <ul className="mt-5 divide-y divide-slate-100">
          {trustScore.factors.map((factor, idx) => (
            <li
              key={`${factor.name}-${idx}`}
              className="flex items-start justify-between gap-4 py-4"
            >
              <div className="flex items-start gap-3">
                <div className="mt-0.5 rounded-lg bg-slate-100 p-2">
                  {factor.impact === "positive" ? (
                    <TrendingUp className="h-4 w-4 text-[#16845B]" />
                  ) : factor.impact === "negative" ? (
                    <TrendingDown className="h-4 w-4 text-[#D84B4B]" />
                  ) : (
                    <Minus className="h-4 w-4 text-[#64748B]" />
                  )}
                </div>
                <div>
                  <p className="text-sm font-semibold text-[#102A3A]">
                    {factor.name}
                  </p>
                  <p className="mt-0.5 text-xs text-[#64748B]">
                    {factor.detail}
                  </p>
                </div>
              </div>
              <span
                className={`shrink-0 text-sm font-bold tabular-nums ${
                  factor.points > 0
                    ? "text-[#16845B]"
                    : factor.points < 0
                    ? "text-[#D84B4B]"
                    : "text-[#64748B]"
                }`}
              >
                {factor.points > 0 ? `+${factor.points}` : factor.points} pts
              </span>
            </li>
          ))}
        </ul>
      </section>

      {/* Evaluation Log */}
      <section className="rounded-xl border border-slate-200 bg-white p-6">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-[#167C91]" aria-hidden="true" />
          <h2 className="text-base font-semibold text-[#102A3A]">
            Trust Evaluation History
          </h2>
        </div>

        {history.length === 0 ? (
          <p className="mt-4 text-xs text-[#64748B]">
            No evaluation events logged yet.
          </p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-[#64748B]">
                  <th className="py-2.5 pr-4 font-semibold">Timestamp</th>
                  <th className="py-2.5 pr-4 font-semibold">Reason</th>
                  <th className="py-2.5 pr-4 font-semibold">Source</th>
                  <th className="py-2.5 text-right font-semibold">Delta</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {history.map((item) => (
                  <tr key={item.id}>
                    <td className="py-3 pr-4 text-[#64748B] tabular-nums">
                      {new Date(item.createdAt).toLocaleString()}
                    </td>
                    <td className="py-3 pr-4 font-medium text-[#172B3A]">
                      {item.reason}
                    </td>
                    <td className="py-3 pr-4 text-[#64748B]">
                      {item.sourceType}
                    </td>
                    <td
                      className={`py-3 text-right font-semibold tabular-nums ${
                        item.delta > 0
                          ? "text-[#16845B]"
                          : item.delta < 0
                          ? "text-[#D84B4B]"
                          : "text-[#64748B]"
                      }`}
                    >
                      {item.delta > 0 ? `+${item.delta}` : item.delta}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
