import React from 'react';
import { FileText, Upload, GitCompare, RefreshCw, Sparkles, ShieldCheck, Trash2 } from 'lucide-react';

export default function Navbar({ onUploadClick, onCrossVerifyClick, onRefresh, onClearClick, loading }) {
  return (
    <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-md sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-gradient-to-tr from-sky-500 to-indigo-600 rounded-xl shadow-lg shadow-sky-500/20">
            <FileText className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-sky-400 via-indigo-300 to-white bg-clip-text text-transparent">
                DocuIntel AI
              </span>
              <span className="px-2 py-0.5 text-xs font-semibold uppercase tracking-wider bg-sky-500/10 text-sky-400 border border-sky-500/20 rounded-full">
                v1.0 Senior AI
              </span>
            </div>
            <p className="text-xs text-slate-400">Autonomous Financial Document Extraction & Cross-Verification</p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={onRefresh}
            disabled={loading}
            className="p-2 text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-700/80 rounded-lg border border-slate-700/60 transition-all text-sm flex items-center space-x-1"
            title="Refresh Data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-sky-400' : ''}`} />
          </button>

          <button
            onClick={onClearClick}
            className="px-3 py-2 text-xs font-medium text-rose-400 bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800/40 rounded-lg transition-all flex items-center space-x-1.5"
            title="Reset All Documents (Clean Slate for Demo)"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Reset Demo</span>
          </button>

          <button
            onClick={onCrossVerifyClick}
            className="px-3.5 py-2 text-sm font-medium text-indigo-300 bg-indigo-950/60 hover:bg-indigo-900/60 border border-indigo-700/40 rounded-lg transition-all flex items-center space-x-2 hover:border-indigo-500/50"
          >
            <GitCompare className="w-4 h-4 text-indigo-400" />
            <span>Cross-Verify</span>
          </button>

          <button
            onClick={onUploadClick}
            className="px-4 py-2 text-sm font-semibold text-white bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 rounded-lg shadow-lg shadow-sky-500/25 transition-all flex items-center space-x-2"
          >
            <Upload className="w-4 h-4" />
            <span>Upload Documents</span>
          </button>
        </div>
      </div>
    </header>
  );
}
