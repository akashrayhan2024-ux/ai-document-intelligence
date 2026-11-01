import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar.jsx';
import StatsCards from './components/StatsCards.jsx';
import DocumentList from './components/DocumentList.jsx';
import UploadModal from './components/UploadModal.jsx';
import DocumentInspector from './components/DocumentInspector.jsx';
import CrossVerificationModal from './components/CrossVerificationModal.jsx';

export default function App() {
  const [documents, setDocuments] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedDocId, setSelectedDocId] = useState(null);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isCrossVerifyOpen, setIsCrossVerifyOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchMode, setSearchMode] = useState('keyword'); // 'keyword' | 'semantic'
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    loadData();
  }, []);

  // Poll for background worker completion if jobs are queued or processing
  useEffect(() => {
    const hasActiveJobs = documents.some(d => d.status === 'queued' || d.status === 'processing');
    if (!hasActiveJobs) return;

    const interval = setInterval(() => {
      loadData(false);
    }, 3000);

    return () => clearInterval(interval);
  }, [documents]);

  const loadData = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const [docsRes, statsRes] = await Promise.all([
        fetch('/api/documents'),
        fetch('/api/stats')
      ]);
      const docsData = await docsRes.json();
      const statsData = await statsRes.json();
      setDocuments(docsData);
      setStats(statsData);
    } catch (err) {
      console.error('Failed to load application data:', err);
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      return loadData();
    }
    try {
      setLoading(true);
      const res = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}&mode=${searchMode}`);
      const data = await res.json();
      setDocuments(data.results || []);
    } catch (err) {
      console.error('Search failed:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleReprocess = async (docId) => {
    try {
      await fetch(`/api/documents/${docId}/reprocess`, { method: 'POST' });
      loadData(false);
    } catch (err) {
      alert('Reprocess error: ' + err.message);
    }
  };

  const handleDeleteDoc = async (docId) => {
    try {
      await fetch(`/api/documents/${docId}`, { method: 'DELETE' });
      loadData(false);
    } catch (err) {
      alert('Delete error: ' + err.message);
    }
  };

  const handleClearAll = async () => {
    if (!confirm('Reset all documents for a clean demo?')) return;
    try {
      await fetch('/api/documents/clear', { method: 'POST' });
      loadData(true);
    } catch (err) {
      alert('Clear error: ' + err.message);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      <Navbar
        onUploadClick={() => setIsUploadOpen(true)}
        onCrossVerifyClick={() => setIsCrossVerifyOpen(true)}
        onRefresh={() => loadData(true)}
        onClearClick={handleClearAll}
        loading={loading}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <StatsCards stats={stats} />

        <DocumentList
          documents={documents}
          onSelectDoc={(id) => setSelectedDocId(id)}
          onReprocess={handleReprocess}
          onDeleteDoc={handleDeleteDoc}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          searchMode={searchMode}
          setSearchMode={setSearchMode}
          onSearch={handleSearch}
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
        />
      </main>

      {/* Modals */}
      {isUploadOpen && (
        <UploadModal
          onClose={() => setIsUploadOpen(false)}
          onUploaded={() => loadData(true)}
        />
      )}

      {selectedDocId && (
        <DocumentInspector
          docId={selectedDocId}
          onClose={() => setSelectedDocId(null)}
          onUpdated={() => loadData(false)}
        />
      )}

      {isCrossVerifyOpen && (
        <CrossVerificationModal
          documents={documents.filter(d => d.status === 'completed')}
          onClose={() => setIsCrossVerifyOpen(false)}
        />
      )}

      <footer className="border-t border-slate-900 py-6 text-center text-xs text-slate-500">
        AI-Powered Document Intelligence Platform • Senior AI Engineer Submission • Built with FastAPI/Express, React, Tesseract & Vector Search
      </footer>
    </div>
  );
}
