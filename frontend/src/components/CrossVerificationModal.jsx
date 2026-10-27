import React, { useState } from 'react';
import { X, GitCompare, CheckCircle2, AlertTriangle, ArrowRight, ShieldCheck, Scale } from 'lucide-react';

export default function CrossVerificationModal({ documents, onClose }) {
  const [docAId, setDocAId] = useState(documents[0]?.id || '');
  const [docBId, setDocBId] = useState(documents[1]?.id || documents[0]?.id || '');
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleVerify = async () => {
    if (!docAId || !docBId) return;
    try {
      setLoading(true);
      const res = await fetch('/api/documents/cross-verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentIdA: docAId, documentIdB: docBId })
      });
      const data = await res.json();
      setReport(data);
    } catch (err) {
      alert('Verification error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-4xl max-h-[90vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-950/40">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-xl">
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base">Cross-Document Verification Engine</h3>
              <p className="text-xs text-slate-400">Reconcile PDF vs. PDF or PDF vs. Excel financial records</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-white rounded-xl">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Selector Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
            {/* Document A */}
            <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl">
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Document A (e.g. Invoice PDF)
              </label>
              <select
                value={docAId}
                onChange={(e) => setDocAId(e.target.value)}
                className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500"
              >
                {documents.map((d) => (
                  <option key={d.id} value={d.id}>
                    [{d.file_type.toUpperCase()}] {d.original_name} (${d.extraction?.total || 0})
                  </option>
                ))}
              </select>
            </div>

            {/* Document B */}
            <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl">
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Document B (e.g. Ledger Excel or PO PDF)
              </label>
              <select
                value={docBId}
                onChange={(e) => setDocBId(e.target.value)}
                className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500"
              >
                {documents.map((d) => (
                  <option key={d.id} value={d.id}>
                    [{d.file_type.toUpperCase()}] {d.original_name} (${d.extraction?.total || 0})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex justify-center">
            <button
              onClick={handleVerify}
              disabled={loading}
              className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl text-sm shadow-lg shadow-indigo-500/25 transition-all flex items-center space-x-2"
            >
              <GitCompare className="w-4 h-4" />
              <span>{loading ? 'Reconciling Documents...' : 'Run Cross-Verification'}</span>
            </button>
          </div>

          {/* Verification Report */}
          {report && (
            <div className="space-y-4 pt-4 border-t border-slate-800 animate-in fade-in duration-300">
              <div className="flex items-center justify-between p-4 bg-slate-950 border border-slate-800 rounded-2xl">
                <div>
                  <span className="text-xs uppercase font-semibold text-slate-400 tracking-wider">Reconciliation Result</span>
                  <div className="flex items-center space-x-2 mt-1">
                    <span
                      className={`text-lg font-extrabold ${
                        report.verificationStatus === 'MATCH'
                          ? 'text-emerald-400'
                          : report.verificationStatus === 'PARTIAL_MATCH'
                          ? 'text-amber-400'
                          : 'text-rose-400'
                      }`}
                    >
                      {report.verificationStatus}
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono">
                      Match Score: {report.matchScore}%
                    </span>
                  </div>
                </div>
                <p className="text-xs text-slate-400 text-right">{report.reconciliationSummary}</p>
              </div>

              {/* Discrepancies */}
              {report.discrepancies.length > 0 && (
                <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl space-y-2">
                  <h4 className="text-xs font-bold text-rose-300 uppercase tracking-wider flex items-center">
                    <AlertTriangle className="w-4 h-4 mr-1 text-rose-400" /> Discrepancies & Variances Detected
                  </h4>
                  {report.discrepancies.map((disc, idx) => (
                    <div key={idx} className="p-2.5 bg-slate-950/80 rounded-xl border border-rose-500/20 text-xs">
                      <p className="font-semibold text-rose-200">{disc.message}</p>
                      <div className="mt-1 flex items-center space-x-4 text-slate-400 font-mono text-[11px]">
                        <span>Doc A: <strong className="text-white">{String(disc.docA_value)}</strong></span>
                        <span>Doc B: <strong className="text-white">{String(disc.docB_value)}</strong></span>
                        {disc.difference && <span className="text-rose-400 font-bold">Variance: ${disc.difference}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Matches */}
              {report.matches.length > 0 && (
                <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl space-y-2">
                  <h4 className="text-xs font-bold text-emerald-300 uppercase tracking-wider flex items-center">
                    <CheckCircle2 className="w-4 h-4 mr-1 text-emerald-400" /> Verified Reconciled Fields
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {report.matches.map((m, idx) => (
                      <div key={idx} className="p-2 bg-slate-950/80 rounded-xl border border-emerald-500/20 text-xs">
                        <span className="text-slate-400 uppercase text-[10px] block font-semibold">{m.field}</span>
                        <span className="font-mono text-emerald-300 font-medium truncate block">{String(m.value)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
