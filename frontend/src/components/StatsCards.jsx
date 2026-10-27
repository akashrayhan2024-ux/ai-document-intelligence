import React from 'react';
import { Files, CheckCircle2, AlertTriangle, XCircle, Clock } from 'lucide-react';

export default function StatsCards({ stats }) {
  const cards = [
    {
      title: 'Total Ingested',
      value: stats?.total ?? 0,
      icon: Files,
      color: 'text-sky-400',
      bgColor: 'bg-sky-500/10',
      borderColor: 'border-sky-500/20',
      subtext: 'PDF, Image, Excel, CSV'
    },
    {
      title: 'Extraction Success Rate',
      value: `${stats?.successRate ?? 100}%`,
      icon: CheckCircle2,
      color: 'text-emerald-400',
      bgColor: 'bg-emerald-500/10',
      borderColor: 'border-emerald-500/20',
      subtext: `${stats?.completed ?? 0} successfully processed`
    },
    {
      title: 'Requires Manual Review',
      value: stats?.requiresReview ?? 0,
      icon: AlertTriangle,
      color: 'text-amber-400',
      bgColor: 'bg-amber-500/10',
      borderColor: 'border-amber-500/20',
      subtext: 'Flagged by math / schema rules'
    },
    {
      title: 'Validation Pass Rate',
      value: `${stats?.validationPassRate ?? 100}%`,
      icon: Clock,
      color: 'text-indigo-400',
      bgColor: 'bg-indigo-500/10',
      borderColor: 'border-indigo-500/20',
      subtext: `${stats?.passed ?? 0} zero discrepancies`
    }
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      {cards.map((card, i) => {
        const Icon = card.icon;
        return (
          <div
            key={i}
            className={`p-5 rounded-2xl bg-slate-900/60 border ${card.borderColor} backdrop-blur-sm transition-all hover:translate-y-[-2px]`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">{card.title}</p>
                <p className="text-2xl font-bold mt-1 text-white tracking-tight">{card.value}</p>
                <p className="text-xs text-slate-500 mt-1">{card.subtext}</p>
              </div>
              <div className={`p-3 rounded-xl ${card.bgColor} ${card.color}`}>
                <Icon className="w-5 h-5" />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
