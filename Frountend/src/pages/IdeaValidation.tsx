import React, { useState } from 'react';

interface AnalysisResult {
  idea?: string;
  market_opportunity?: string;
  competition_level?: string;
  insight?: string;
  raw?: string;
  error?: string;
  details?: string;
}

const IdeaValidation: React.FC = () => {
  const [idea, setIdea] = useState('');
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);

    try {
      const res = await fetch('http://localhost:8000/validate-idea', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: idea }),
      });

      const data = await res.json();
      setResult(data);
    } catch (err) {
      console.error('Error:', err);
      setResult({
        error: 'Failed to connect to the server',
        details: err instanceof Error ? err.message : 'Unknown error'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a032a] text-white font-sans px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Startup Idea Validator</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <textarea
            value={idea}
            onChange={(e) => setIdea(e.target.value)}
            placeholder="Describe your startup idea..."
            className="w-full h-32 p-4 rounded bg-[#1c0f4c] border border-purple-800 focus:outline-none focus:ring-2 focus:ring-purple-500"
            required
          />
          <button
            type="submit"
            disabled={loading}
            className="bg-purple-600 hover:bg-purple-700 px-6 py-3 rounded-full font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Analyzing...
              </span>
            ) : 'Validate Idea'}
          </button>
        </form>

        {result?.error && (
          <div className="mt-8 bg-red-900/50 p-6 rounded-xl border border-red-700">
            <h2 className="text-xl font-bold text-red-300 mb-2">Error</h2>
            <p>{result.error}</p>
            {result.details && <p className="mt-2 text-sm opacity-80">{result.details}</p>}
          </div>
        )}

        {result && !result.error && (
          <div className="mt-8 bg-[#1c0f4c] p-6 rounded-xl border border-purple-800 space-y-4">
            <h2 className="text-xl font-bold text-purple-300 mb-2">Analysis Results</h2>
            
            {result.idea && (
              <div>
                <h3 className="font-semibold text-white mb-1">Your Idea:</h3>
                <p className="bg-[#2a1a6e] p-3 rounded">{result.idea}</p>
              </div>
            )}

            {result.market_opportunity && (
              <div>
                <h3 className="font-semibold text-white mb-1">Market Opportunity:</h3>
                <p className="bg-[#2a1a6e] p-3 rounded">{result.market_opportunity}</p>
              </div>
            )}

            {result.competition_level && (
              <div>
                <h3 className="font-semibold text-white mb-1">Competition Level:</h3>
                <p className="bg-[#2a1a6e] p-3 rounded">{result.competition_level}</p>
              </div>
            )}

            {result.insight && (
              <div>
                <h3 className="font-semibold text-white mb-1">Insight:</h3>
                <p className="bg-[#2a1a6e] p-3 rounded">{result.insight}</p>
              </div>
            )}

            {result.raw && (
              <details className="mt-4">
                <summary className="text-sm text-purple-400 cursor-pointer">Show raw analysis</summary>
                <pre className="mt-2 p-3 bg-[#2a1a6e] rounded text-sm overflow-x-auto">{result.raw}</pre>
              </details>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default IdeaValidation;