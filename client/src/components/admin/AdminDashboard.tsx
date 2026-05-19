import { useQuery } from '@apollo/client';
import { LIST_EXPERIMENTS, GET_EXPERIMENT_RESULTS } from '../../graphql/queries';
import type { Experiment, ExperimentResults } from '../../types';
import { LoadingSpinner, ErrorMessage } from '../common/ErrorMessage';
import { formatDate } from '../../utils/formatters';
import { useState } from 'react';

const ExperimentCard = ({ experiment }: { experiment: Experiment }) => {
  const [expanded, setExpanded] = useState(false);
  const { data, loading } = useQuery<{ getExperimentResults: ExperimentResults }>(
    GET_EXPERIMENT_RESULTS,
    {
      variables: { experimentId: experiment.id },
      skip: !expanded,
    }
  );

  const results = data?.getExperimentResults;
  const maxConversion = results
    ? Math.max(...results.variants.map((v) => v.conversionRate))
    : 0;

  const statusColors: Record<string, string> = {
    active: 'bg-green-100 text-green-700',
    paused: 'bg-yellow-100 text-yellow-700',
    completed: 'bg-gray-100 text-gray-600',
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div
        className="p-5 cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={() => setExpanded((v) => !v)}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold text-gray-900 truncate">
                {experiment.name.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
              </h3>
              <span
                className={`text-xs px-2 py-0.5 rounded-full font-semibold capitalize ${statusColors[experiment.status]}`}
              >
                {experiment.status}
              </span>
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              {experiment.variants.map((v) => (
                <span key={v} className="text-xs px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full">
                  {v}
                </span>
              ))}
            </div>
            {experiment.startDate && (
              <p className="text-xs text-gray-400 mt-2">Started {formatDate(experiment.startDate)}</p>
            )}
          </div>
          <span className="text-gray-400 flex-shrink-0 mt-1">{expanded ? '▲' : '▼'}</span>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-gray-100 p-5 bg-gray-50/50 animate-fade-in">
          {loading && <LoadingSpinner label="Loading results..." />}

          {results && (
            <div className="space-y-4">
              {/* Improvement banner */}
              {results.improvement !== null && results.improvement !== undefined && (
                <div
                  className={`rounded-lg p-3 text-sm font-medium ${
                    results.improvement >= 0
                      ? 'bg-green-100 text-green-800 border border-green-200'
                      : 'bg-red-100 text-red-800 border border-red-200'
                  }`}
                >
                  {results.improvement >= 0 ? '📈' : '📉'}{' '}
                  Winning variant{' '}
                  <strong className="font-bold">"{results.winningVariant}"</strong> shows a{' '}
                  <strong>{Math.abs(results.improvement).toFixed(1)}%</strong>{' '}
                  {results.improvement >= 0 ? 'improvement' : 'decline'} in conversion rate
                </div>
              )}

              {/* Variant comparison table */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                        Variant
                      </th>
                      <th className="text-right py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                        Events
                      </th>
                      <th className="text-right py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                        Started
                      </th>
                      <th className="text-right py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                        Completed
                      </th>
                      <th className="text-right py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                        CVR
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.variants.map((v) => {
                      const isWinner = v.variant === results.winningVariant && maxConversion > 0;
                      return (
                        <tr
                          key={v.variant}
                          className={`border-b border-gray-100 ${
                            isWinner ? 'bg-green-50' : ''
                          }`}
                        >
                          <td className="py-3 font-medium">
                            <div className="flex items-center gap-2">
                              {isWinner && (
                                <span className="text-xs bg-green-500 text-white px-1.5 py-0.5 rounded font-bold">
                                  WIN
                                </span>
                              )}
                              <span className="text-gray-800">{v.variant}</span>
                            </div>
                          </td>
                          <td className="py-3 text-right text-gray-600">{v.totalEvents.toLocaleString()}</td>
                          <td className="py-3 text-right text-gray-600">{v.bookingStarted.toLocaleString()}</td>
                          <td className="py-3 text-right text-gray-600">{v.bookingCompleted.toLocaleString()}</td>
                          <td className="py-3 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-blue-500 rounded-full transition-all"
                                  style={{
                                    width: maxConversion > 0
                                      ? `${(v.conversionRate / maxConversion) * 100}%`
                                      : '0%',
                                  }}
                                />
                              </div>
                              <span className={`font-semibold ${isWinner ? 'text-green-700' : 'text-gray-700'}`}>
                                {(v.conversionRate * 100).toFixed(1)}%
                              </span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {results.variants.every((v) => v.totalEvents === 0) && (
                <p className="text-xs text-gray-400 text-center py-2">
                  No events recorded yet for this experiment. Events will appear as users interact with the platform.
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export const AdminDashboard = () => {
  const { data, loading, error, refetch } = useQuery<{ listExperiments: Experiment[] }>(
    LIST_EXPERIMENTS
  );

  const experiments = data?.listExperiments || [];
  const activeCount = experiments.filter((e) => e.status === 'active').length;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-1">A/B Testing Dashboard</h1>
        <p className="text-gray-500">
          Monitor conversion experiments and optimize the booking funnel
        </p>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {[
          { label: 'Active Experiments', value: activeCount, color: 'text-green-700', bg: 'bg-green-50 border-green-200' },
          { label: 'Total Experiments', value: experiments.length, color: 'text-blue-700', bg: 'bg-blue-50 border-blue-200' },
          { label: 'Tracked Events', value: 12, color: 'text-purple-700', bg: 'bg-purple-50 border-purple-200' },
        ].map(({ label, value, color, bg }) => (
          <div key={label} className={`rounded-xl border p-4 ${bg}`}>
            <p className={`text-2xl font-bold ${color}`}>{value}</p>
            <p className="text-xs text-gray-600 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Event types reference */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
          Tracked Interaction Signals
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
          {[
            'search_initiated', 'results_loaded', 'result_clicked', 'details_viewed',
            'form_started', 'form_completed', 'price_expanded', 'sort_changed',
            'filter_applied', 'booking_started', 'booking_completed', 'booking_abandoned',
          ].map((event) => (
            <span
              key={event}
              className="text-xs font-mono px-2.5 py-1.5 bg-gray-100 text-gray-600 rounded-lg"
            >
              {event}
            </span>
          ))}
        </div>
      </div>

      {/* Experiments */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Experiments</h2>
          <button
            onClick={() => refetch()}
            className="text-xs text-blue-600 hover:text-blue-700 font-medium"
          >
            ↺ Refresh
          </button>
        </div>

        {loading && <LoadingSpinner label="Loading experiments..." />}
        {error && (
          <ErrorMessage
            message="Could not load experiments. Is the server running?"
            onRetry={() => refetch()}
          />
        )}

        {!loading && !error && experiments.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            <p className="text-4xl mb-3">🧪</p>
            <p>No experiments found.</p>
            <p className="text-sm mt-1">Make sure the server is running and the DB is seeded.</p>
          </div>
        )}

        <div className="space-y-3">
          {experiments.map((exp) => (
            <ExperimentCard key={exp.id} experiment={exp} />
          ))}
        </div>
      </div>
    </div>
  );
};
