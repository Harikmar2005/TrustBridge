import React, { useState } from 'react';
import {
  X,
  ShieldAlert,
  UploadCloud,
  FileCheck,
  CheckCircle2,
  AlertCircle,
  FileText,
  Lock,
  ArrowRight,
} from 'lucide-react';
import { DisputeCategory } from '../types';
import { useDispute } from '../context/DisputeContext';
import { useAuth } from '../context/AuthContext';

interface RaiseDisputeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (disputeId: string, roomId: string) => void;
}

const CATEGORIES: Array<{ key: DisputeCategory; label: string; desc: string }> = [
  {
    key: 'suspected_fraud',
    label: 'Suspected Fraud & Phishing',
    desc: 'Seller solicited off-platform payment, asked for OTP or sent suspicious links.',
  },
  {
    key: 'payment_issue',
    label: 'Payment & Escrow Discrepancy',
    desc: 'Unauthorized fee surcharge or irregular billing deduction.',
  },
  {
    key: 'non_delivery',
    label: 'Non-Delivery of Item',
    desc: 'Package has not arrived past agreed guaranteed courier window.',
  },
  {
    key: 'wrong_product',
    label: 'Damaged or Wrong Product',
    desc: 'Item received diverges significantly from description.',
  },
  {
    key: 'refund_request',
    label: 'Escrow Refund Demand',
    desc: 'Order cancelled by mutual agreement but funds remained locked.',
  },
  {
    key: 'seller_misconduct',
    label: 'Seller Harassment or Coercion',
    desc: 'Threats, abusive language or hostile ultimatum behavior.',
  },
];

export const RaiseDisputeModal: React.FC<RaiseDisputeModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { createDispute } = useDispute();
  const { currentUser } = useAuth();

  const [category, setCategory] = useState<DisputeCategory>('suspected_fraud');
  const [transactionRef, setTransactionRef] = useState('TXN-2026-8849');
  const [reason, setReason] = useState(
    'Seller requested ₹1,30,000 on external link pay-fast-direct.net and coerced me to share my 6-digit OTP under a 10-minute threat deadline.'
  );
  const [submitting, setSubmitting] = useState(false);
  const [evidenceFiles, setEvidenceFiles] = useState([
    {
      name: 'phishing_link_screenshot.png',
      url: 'https://images.unsplash.com/photo-1563986768609-322da13575f3?w=800&auto=format&fit=crop&q=80',
      description: 'Screenshot of seller asking for OTP and external link',
    },
  ]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const res = await createDispute({
        transactionId: 'txn_101',
        conversationId: 'conv_direct_1',
        category,
        reason,
        evidenceFiles,
      });

      if (res) {
        onSuccess(res.dispute.id, res.roomId);
        onClose();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSubmitting(false);
    }
  };

  const addEvidenceItem = () => {
    setEvidenceFiles((prev) => [
      ...prev,
      {
        name: `escrow_protection_proof_${prev.length + 1}.pdf`,
        url: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=800&auto=format&fit=crop&q=80',
        description: 'TrustBridge Escrow Hold statement',
      },
    ]);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden animate-in zoom-in-95">
        {/* Header */}
        <div className="p-5 bg-gradient-to-r from-red-50 to-orange-50 border-b border-red-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-600 text-white flex items-center justify-center shadow-md shadow-red-500/20">
              <ShieldAlert className="w-6 h-6 stroke-[2.2]" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900">
                Initiate Structured Dispute & Freeze Escrow
              </h3>
              <p className="text-xs text-slate-600">
                Protects funds and instantly auto-dispatches an accredited Trust & Safety Agent
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-white/80 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* Transaction Reference & Escrow Freeze notice */}
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl flex items-center justify-between text-xs text-blue-900">
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-blue-600" />
              <span>
                Linked Order: <strong>{transactionRef}</strong> (Sony Alpha A7 IV &bull; $1,850.00)
              </span>
            </div>
            <span className="px-2 py-0.5 rounded-md bg-blue-200/70 font-mono text-[10px] font-bold text-blue-800">
              ESCROW LOCKED
            </span>
          </div>

          {/* Dispute Category Picker */}
          <div>
            <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
              Select Dispute Category <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {CATEGORIES.map((cat) => {
                const isSelected = category === cat.key;
                return (
                  <button
                    type="button"
                    key={cat.key}
                    onClick={() => setCategory(cat.key)}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      isSelected
                        ? 'border-blue-600 bg-blue-50/70 shadow-xs ring-1 ring-blue-600'
                        : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-slate-900">{cat.label}</span>
                      {isSelected && <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />}
                    </div>
                    <p className="text-[11px] text-slate-500 line-clamp-2">{cat.desc}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Reason Description */}
          <div>
            <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
              Factual Statement / Reason <span className="text-red-500">*</span>
            </label>
            <textarea
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Describe what occurred with exact dates, amounts, and specific demands made..."
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white leading-relaxed"
              required
            />
          </div>

          {/* Supporting Evidence Uploader */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Supporting Evidence & Screenshots
              </label>
              <button
                type="button"
                onClick={addEvidenceItem}
                className="text-xs font-bold text-blue-600 hover:underline flex items-center gap-1"
              >
                + Add Another File
              </button>
            </div>

            <div className="space-y-2">
              {evidenceFiles.map((ev, idx) => (
                <div
                  key={idx}
                  className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between gap-3 text-xs"
                >
                  <div className="flex items-center gap-2.5">
                    <FileText className="w-5 h-5 text-blue-600" />
                    <div>
                      <p className="font-bold text-slate-800">{ev.name}</p>
                      <p className="text-[11px] text-slate-500">{ev.description}</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                    Verified Hash
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Legal Acknowledgement */}
          <div className="p-3 bg-slate-100 rounded-xl text-[11px] text-slate-600 leading-relaxed">
            By filing this dispute, you confirm all evidence submitted is true. False or fraudulent claims are
            subject to platform probation and forfeiture of escrow claims according to TrustBridge TOS.
          </div>

          {/* Submit Actions */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !reason.trim()}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-md shadow-red-500/20 disabled:opacity-50 transition-all"
            >
              <ShieldAlert className="w-4 h-4" />
              <span>{submitting ? 'Submitting & Dispatching...' : 'Confirm Dispute & Dispatch Agent'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
