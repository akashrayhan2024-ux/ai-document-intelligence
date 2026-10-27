import React, { useState, useEffect } from 'react';
import { X, CheckCircle, AlertTriangle, XCircle, Save, History, FileText, ArrowRight, ShieldAlert, Cpu } from 'lucide-react';

export default function DocumentInspector({ docId, onClose, onUpdated }) {
  const [doc, setDoc] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({});
  const [activeTab, setActiveTab] = useState('editor'); // 'editor', 'audit', 'raw'

  useEffect(() => {
    fetchDoc();
  }, [docId]);

  const fetchDoc = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/documents/${docId}`);
      const data = await res.json();
      setDoc(data);
      if (data.extraction) {
        setFormData({
          invoice_number: data.extraction.invoice_number || '',
          invoice_date: data.extraction.invoice_date || '',
          supplier_name: data.extraction.supplier_name || '',
          customer_name: data.extraction.customer_name || '',
          subtotal: data.extraction.subtotal ?? '',
          tax: data.extraction.tax ?? '',
          total: data.extraction.total ?? '',
          currency: data.extraction.currency || 'USD'
        });
      }
    } catch (err) {
      console.error('Failed to load document details:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveField = async (field, value) => {
    try {
      setSaving(true);
      const numVal = ['subtotal', 'tax', 'total'].includes(field) ? parseFloat(value) || 0 : value;
      const res = await fetch(`/api/documents/${docId}/corrections`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ field, value: numVal, user: 'Lead Reviewer' })
      });
      const updated = await res.json();
      setDoc(updated.document);
      if (onUpdated) onUpdated();
    } catch (err) {
      alert('Error updating field: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAll = async (e) => {
    e.preventDefault();
    setSaving(true);
    for (const [key, val] of Object.entries(formData)) {
      const orig = doc?.extraction?.[key];
      if (val !== orig) {
        await handleSaveField(key, val);
      }
    }
    setSaving(false);
    fetchDoc();
  };

  if (!doc) return null;

  const ext = doc.extraction || {};
  const val = doc.validation || {};
  const errors = val.errors || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-5xl max-h-[90vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-950/40">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-sky-500/10 text-sky-400 border border-sky-500/20 rounded-xl">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center space-x-2">
                <span>{doc.original_name}</span>
                <span className="text-xs font-mono px-2 py-0.5 rounded uppercase bg-slate-800 text-slate-400">
                  {doc.file_type}
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Uploaded: {new Date(doc.created_at).toLocaleString()} • {doc.page_count} page(s) / sheets
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {/* Tabs */}
            <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
              <button
                onClick={() => setActiveTab('editor')}
                className={`px-3 py-1 rounded-lg transition-all ${activeTab === 'editor' ? 'bg-sky-600 text-white font-semibold' : 'text-slate-400 hover:text-white'}`}
              >
                HITL Editor
              </button>
              <button
                onClick={() => setActiveTab('audit')}
                className={`px-3 py-1 rounded-lg transition-all ${activeTab === 'audit' ? 'bg-sky-600 text-white font-semibold' : 'text-slate-400 hover:text-white'}`}
              >
                Audit History ({doc.audit_logs?.length || 0})
              </button>
              <button
                onClick={() => setActiveTab('raw')}
                className={`px-3 py-1 rounded-lg transition-all ${activeTab === 'raw' ? 'bg-sky-600 text-white font-semibold' : 'text-slate-400 hover:text-white'}`}
              >
                Raw Text
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Validation Status Banner */}
          {val.requires_manual_review ? (
            <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl">
              <div className="flex items-start space-x-3">
                <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h4 className="text-sm font-bold text-amber-300">Action Required: Discrepancies Detected</h4>
                  <p className="text-xs text-amber-400/80 mt-0.5">
                    The deterministic validation engine flagged {errors.length} issue(s) that require manual human review.
                  </p>
                  <div className="mt-3 space-y-1.5">
                    {errors.map((err, idx) => (
                      <div key={idx} className="flex items-center space-x-2 text-xs text-amber-200 bg-amber-500/10 px-3 py-1.5 rounded-lg border border-amber-500/20">
                        <span className="font-semibold uppercase tracking-wider text-[10px] text-amber-400">[{err.rule}]</span>
                        <span>{err.message}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl flex items-center space-x-3">
              <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0" />
              <div>
                <h4 className="text-sm font-bold text-emerald-300">Validation Passed (Zero Discrepancies)</h4>
                <p className="text-xs text-emerald-400/80">Mathematical calculations, line item sums, and required invoice fields verified.</p>
              </div>
            </div>
          )}

          {activeTab === 'editor' && (
            <form onSubmit={handleSaveAll} className="space-y-6">
              {/* Form Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Invoice #</label>
                  <input
                    type="text"
                    value={formData.invoice_number}
                    onChange={(e) => setFormData({ ...formData, invoice_number: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm font-mono text-white focus:outline-none focus:border-sky-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Date</label>
                  <input
                    type="date"
                    value={formData.invoice_date}
                    onChange={(e) => setFormData({ ...formData, invoice_date: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm font-mono text-white focus:outline-none focus:border-sky-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Supplier Name</label>
                  <input
                    type="text"
                    value={formData.supplier_name}
                    onChange={(e) => setFormData({ ...formData, supplier_name: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-sky-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Customer Name</label>
                  <input
                    type="text"
                    value={formData.customer_name}
                    onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-sky-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Subtotal ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.subtotal}
                    onChange={(e) => setFormData({ ...formData, subtotal: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm font-mono text-white focus:outline-none focus:border-sky-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Tax ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.tax}
                    onChange={(e) => setFormData({ ...formData, tax: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm font-mono text-white focus:outline-none focus:border-sky-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Grand Total ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.total}
                    onChange={(e) => setFormData({ ...formData, total: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm font-mono font-bold text-sky-400 focus:outline-none focus:border-sky-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Currency</label>
                  <input
                    type="text"
                    value={formData.currency}
                    onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm font-mono text-white focus:outline-none focus:border-sky-500"
                  />
                </div>
              </div>

              {/* Line Items Table */}
              <div>
                <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-3">Itemized Line Items</h3>
                <div className="border border-slate-800 rounded-2xl overflow-hidden bg-slate-950/60">
                  <table className="w-full text-left text-sm text-slate-300">
                    <thead className="text-xs uppercase bg-slate-950 text-slate-400 border-b border-slate-800">
                      <tr>
                        <th className="px-4 py-3">Description</th>
                        <th className="px-4 py-3">Quantity</th>
                        <th className="px-4 py-3">Unit Price</th>
                        <th className="px-4 py-3 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 font-mono text-xs">
                      {ext.line_items && ext.line_items.length > 0 ? (
                        ext.line_items.map((item, idx) => (
                          <tr key={idx} className="hover:bg-slate-800/30">
                            <td className="px-4 py-3 font-sans font-medium text-white">{item.description}</td>
                            <td className="px-4 py-3">{item.quantity !== null ? item.quantity : '-'}</td>
                            <td className="px-4 py-3">{item.unit_price !== null ? `$${item.unit_price.toFixed(2)}` : '-'}</td>
                            <td className="px-4 py-3 text-right font-bold text-sky-400">${Number(item.amount).toFixed(2)}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="4" className="px-4 py-6 text-center text-slate-500 italic font-sans">
                            No discrete line items extracted.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Footer Save Button */}
              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2.5 bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white font-semibold rounded-xl shadow-lg shadow-sky-500/25 transition-all flex items-center space-x-2 text-sm"
                >
                  <Save className="w-4 h-4" />
                  <span>{saving ? 'Saving & Re-validating...' : 'Save Corrections & Re-Validate'}</span>
                </button>
              </div>
            </form>
          )}

          {activeTab === 'audit' && (
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider">Human-In-The-Loop Audit Trail</h3>
              {doc.audit_logs && doc.audit_logs.length > 0 ? (
                <div className="border border-slate-800 rounded-2xl overflow-hidden divide-y divide-slate-800 bg-slate-950/60">
                  {doc.audit_logs.map((log) => (
                    <div key={log.id} className="p-4 flex items-center justify-between text-xs">
                      <div>
                        <span className="font-semibold text-white">{log.user}</span> modified field{' '}
                        <code className="text-sky-400 bg-sky-950/60 px-1.5 py-0.5 rounded border border-sky-800/60 font-mono">
                          {log.field}
                        </code>
                        <div className="mt-1 text-slate-400 flex items-center space-x-2">
                          <span className="line-through text-rose-400">{String(log.original_value)}</span>
                          <ArrowRight className="w-3 h-3 text-slate-500" />
                          <span className="text-emerald-400 font-semibold">{String(log.corrected_value)}</span>
                        </div>
                      </div>
                      <span className="text-slate-500 font-mono">{new Date(log.timestamp).toLocaleTimeString()}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center text-slate-500 italic bg-slate-950/40 rounded-2xl border border-slate-800">
                  No manual corrections recorded yet. AI extraction was unmodified.
                </div>
              )}
            </div>
          )}

          {activeTab === 'raw' && (
            <div className="space-y-2">
              <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider">Raw Extracted OCR & Layout Text</h3>
              <pre className="p-4 bg-slate-950 border border-slate-800 rounded-2xl text-xs font-mono text-slate-300 overflow-x-auto whitespace-pre-wrap max-h-96">
                {doc.raw_text || 'No text extracted from document.'}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
