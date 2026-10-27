import React, { useState } from 'react';
import { Search, Sparkles, FileText, CheckCircle, AlertTriangle, XCircle, RotateCcw, Eye, ArrowUpDown, Filter } from 'lucide-react';

export default function DocumentList({
  documents,
  onSelectDoc,
  onReprocess,
  searchQuery,
  setSearchQuery,
  searchMode,
  setSearchMode,
  onSearch,
  statusFilter,
  setStatusFilter
}) {
  const [sortField, setSortField] = useState('created_at');
  const [sortOrder, setSortOrder] = useState('desc');

  const filteredDocs = documents.filter(doc => {
    if (statusFilter === 'all') return true;
    if (statusFilter === 'review') return doc.validation?.requires_manual_review;
    if (statusFilter === 'passed') return doc.validation?.is_valid && !doc.validation?.requires_manual_review;
    if (statusFilter === 'failed') return doc.status === 'failed';
    return true;
  });

  const getFormatBadge = (type) => {
    const map = {
      pdf: 'bg-red-500/10 text-red-400 border-red-500/20',
      xlsx: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
      xls: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
      csv: 'bg-teal-500/10 text-teal-400 border-teal-500/20',
      jpg: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
      png: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
      tiff: 'bg-purple-500/10 text-purple-400 border-purple-500/20'
    };
    return map[type?.toLowerCase()] || 'bg-slate-500/10 text-slate-400 border-slate-500/20';
  };

  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden backdrop-blur-md">
      {/* Search & Filter Toolbar */}
      <div className="p-4 sm:p-6 border-b border-slate-800 space-y-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Search Input Bar */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder={searchMode === 'semantic' ? "Semantic Vector Search (e.g. 'cloud hosting server infra', 'stationery expenses')..." : "Keyword search by invoice #, vendor, customer..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && onSearch()}
              className="w-full pl-10 pr-24 py-2.5 bg-slate-950/70 border border-slate-700/60 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 transition-colors font-sans"
            />
            <button
              onClick={onSearch}
              className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-semibold transition-colors"
            >
              Search
            </button>
          </div>

          {/* Search Mode Toggle (Keyword vs Semantic) */}
          <div className="flex items-center p-1 bg-slate-950/80 border border-slate-800 rounded-xl">
            <button
              onClick={() => { setSearchMode('keyword'); }}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                searchMode === 'keyword'
                  ? 'bg-slate-800 text-sky-400 shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Keyword Match
            </button>
            <button
              onClick={() => { setSearchMode('semantic'); }}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all flex items-center space-x-1 ${
                searchMode === 'semantic'
                  ? 'bg-gradient-to-r from-sky-500/20 to-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              <span>Semantic Vector</span>
            </button>
          </div>
        </div>

        {/* Status Filter Chips */}
        <div className="flex items-center space-x-2 pt-1 text-xs">
          <span className="text-slate-500 font-medium flex items-center mr-2">
            <Filter className="w-3.5 h-3.5 mr-1" /> Filter:
          </span>
          {[
            { id: 'all', label: `All Documents (${documents.length})` },
            { id: 'review', label: 'Requires Review' },
            { id: 'passed', label: 'Verified Passed' },
            { id: 'failed', label: 'Ingestion Errors' }
          ].map(chip => (
            <button
              key={chip.id}
              onClick={() => setStatusFilter(chip.id)}
              className={`px-3 py-1 rounded-lg border transition-all ${
                statusFilter === chip.id
                  ? 'bg-sky-500/10 text-sky-300 border-sky-500/30 font-semibold'
                  : 'bg-slate-950/40 text-slate-400 border-slate-800 hover:border-slate-700'
              }`}
            >
              {chip.label}
            </button>
          ))}
        </div>
      </div>

      {/* Document Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-slate-300">
          <thead className="text-xs uppercase bg-slate-950/60 text-slate-400 border-b border-slate-800">
            <tr>
              <th className="px-6 py-3.5 font-semibold">Document</th>
              <th className="px-6 py-3.5 font-semibold">Type</th>
              <th className="px-6 py-3.5 font-semibold">Invoice #</th>
              <th className="px-6 py-3.5 font-semibold">Supplier</th>
              <th className="px-6 py-3.5 font-semibold">Total</th>
              <th className="px-6 py-3.5 font-semibold">Validation Status</th>
              <th className="px-6 py-3.5 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {filteredDocs.length === 0 ? (
              <tr>
                <td colSpan="7" className="px-6 py-12 text-center text-slate-500">
                  <FileText className="w-10 h-10 mx-auto mb-2 text-slate-600" />
                  <p className="font-medium">No documents match the current filter or search criteria.</p>
                  <p className="text-xs text-slate-600 mt-1">Upload financial documents to begin autonomous processing.</p>
                </td>
              </tr>
            ) : (
              filteredDocs.map((doc) => {
                const ext = doc.extraction || {};
                const val = doc.validation || {};
                const isReview = val.requires_manual_review;
                const isFailed = doc.status === 'failed';

                return (
                  <tr
                    key={doc.id}
                    className="hover:bg-slate-800/40 transition-colors group cursor-pointer"
                    onClick={() => onSelectDoc(doc.id)}
                  >
                    <td className="px-6 py-4 font-medium text-white flex items-center space-x-3">
                      <FileText className="w-4 h-4 text-sky-400 flex-shrink-0" />
                      <div>
                        <p className="truncate max-w-xs">{doc.original_name}</p>
                        <p className="text-xs text-slate-500">{(doc.file_size / 1024).toFixed(1)} KB • {doc.page_count || 1} pg/sheet</p>
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <span className={`px-2 py-0.5 text-xs font-mono font-semibold uppercase rounded-md border ${getFormatBadge(doc.file_type)}`}>
                        {doc.file_type}
                      </span>
                    </td>

                    <td className="px-6 py-4 font-mono text-xs text-slate-300">
                      {ext.invoice_number ? ext.invoice_number : <span className="text-slate-500 italic">null</span>}
                    </td>

                    <td className="px-6 py-4 text-slate-300">
                      {ext.supplier_name ? ext.supplier_name : <span className="text-slate-500 italic">null</span>}
                    </td>

                    <td className="px-6 py-4 font-mono font-semibold text-white">
                      {ext.total !== null && ext.total !== undefined ? `${ext.currency || '$'}${Number(ext.total).toFixed(2)}` : <span className="text-slate-500 italic">null</span>}
                    </td>

                    <td className="px-6 py-4">
                      {isFailed ? (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                          <XCircle className="w-3.5 h-3.5 mr-1" />
                          Corrupted / Failed
                        </span>
                      ) : isReview ? (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                          <AlertTriangle className="w-3.5 h-3.5 mr-1" />
                          Review ({val.errors?.length || 0})
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          <CheckCircle className="w-3.5 h-3.5 mr-1" />
                          Passed
                        </span>
                      )}
                    </td>

                    <td className="px-6 py-4 text-right space-x-2" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => onSelectDoc(doc.id)}
                        className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-sky-400 rounded-lg text-xs font-medium transition-colors inline-flex items-center space-x-1"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Inspect</span>
                      </button>

                      {isFailed && (
                        <button
                          onClick={() => onReprocess(doc.id)}
                          className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-amber-400 rounded-lg text-xs font-medium transition-colors inline-flex items-center space-x-1"
                          title="Reprocess Document"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Retry</span>
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
