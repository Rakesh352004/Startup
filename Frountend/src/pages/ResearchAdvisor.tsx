import { useState } from 'react';

interface ResearchPaper {
  title: string;
  authors: string[];
  abstract: string;
  published_date: string;
  source: string;
  url: string;
  doi?: string;
}

export default function ResearchAdvisor() {
  const [idea, setIdea] = useState('');
  const [papers, setPapers] = useState<ResearchPaper[]>([]);
  const [searchTerms, setSearchTerms] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [sourceStats, setSourceStats] = useState<{[key: string]: number}>({});

  const fetchResearchPapers = async () => {
    if (!idea.trim()) {
      setError('Please enter your startup idea');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Please log in to access research papers');
        setIsLoading(false);
        return;
      }

      console.log('🔍 Sending request to backend...');
      const response = await fetch('http://localhost:8000/research-papers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
          idea: idea.trim(), 
          max_results: 15
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = 'Failed to fetch research papers';
        
        try {
          const errorJson = JSON.parse(errorText);
          errorMessage = errorJson.detail || errorMessage;
        } catch {
          errorMessage = errorText || errorMessage;
        }
        
        throw new Error(errorMessage);
      }

      const data = await response.json();
      console.log('📊 Received data:', data);
      
      const receivedPapers = data.papers || [];
      setPapers(receivedPapers);
      setSearchTerms(data.search_terms || []);
      
      const stats: {[key: string]: number} = {};
      receivedPapers.forEach((paper: ResearchPaper) => {
        stats[paper.source] = (stats[paper.source] || 0) + 1;
      });
      setSourceStats(stats);
      
      console.log('📈 Source statistics:', stats);
      
      if (!receivedPapers || receivedPapers.length === 0) {
        setError('No research papers found for your idea. Try rephrasing or using different keywords.');
      } else {
        console.log(`✅ Successfully loaded ${receivedPapers.length} papers from ${Object.keys(stats).length} sources`);
      }
    } catch (err: any) {
      console.error('❌ Error fetching research papers:', err);
      setError(err.message || 'Failed to fetch research papers');
      setPapers([]);
      setSearchTerms([]);
      setSourceStats({});
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'Unknown date';
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return dateString;
    }
  };

  const truncateAbstract = (abstract: string, maxLength: number = 300) => {
    if (!abstract) return 'No abstract available';
    if (abstract.length <= maxLength) return abstract;
    return abstract.substring(0, maxLength) + '...';
  };

  const getSourceColor = (source: string) => {
    switch (source) {
      case 'Semantic Scholar':
        return 'bg-blue-600/20 text-blue-300 border-blue-500/40';
      case 'arXiv':
        return 'bg-blue-500/20 text-blue-200 border-blue-400/40';
      case 'CrossRef':
        return 'bg-blue-800/20 text-blue-400 border-blue-600/40';
      default:
        return 'bg-gray-600/20 text-gray-300 border-gray-500/40';
    }
  };

  const getSourceIcon = (source: string) => {
    switch (source) {
      case 'Semantic Scholar':
        return '🎓';
      case 'arXiv':
        return '📚';
      case 'CrossRef':
        return '🔬';
      default:
        return '📄';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-600/10 via-blue-800/5 to-transparent"></div>
      
      <div className="relative z-10">
        {/* Header Section */}
        <div className="text-center pt-16 pb-12 px-4">
          <div className="mb-6">
            <div className="inline-flex items-center space-x-3 mb-4">
              <div className="text-4xl">🧠</div>
              <h1 className="text-5xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                Research Advisor
              </h1>
              <div className="text-4xl text-cyan-400">✨</div>
            </div>
            
            <p className="text-xl text-gray-300 max-w-4xl mx-auto leading-relaxed">
              Discover relevant academic research papers powered by AI.{' '}
              <span className="text-blue-400 font-semibold">Search across Semantic Scholar, arXiv, and CrossRef</span>{' '}
              to accelerate your research and innovation.
            </p>
          </div>

          {/* Source Indicators */}
          <div className="flex items-center justify-center space-x-8 mb-12">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-blue-600 rounded-full"></div>
              <span className="text-gray-300">Semantic Scholar</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
              <span className="text-gray-300">arXiv</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-blue-800 rounded-full"></div>
              <span className="text-gray-300">CrossRef</span>
            </div>
          </div>

          {/* Search Section */}
          <div className="max-w-4xl mx-auto">
            <div className="relative mb-6">
              <textarea
                value={idea}
                onChange={(e) => setIdea(e.target.value)}
                placeholder="Enter your research idea and we'll find relevant papers from Semantic Scholar, arXiv, and CrossRef"
                disabled={isLoading}
                className="w-full h-32 bg-black/60 border border-blue-500/30 rounded-2xl px-6 py-4 text-white placeholder-gray-400 text-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 backdrop-blur-sm transition-all duration-300"
              />
              
            </div>

            <button
              onClick={fetchResearchPapers}
              disabled={isLoading || !idea.trim()}
              className="group relative inline-flex items-center justify-center px-8 py-4 bg-gradient-to-r from-blue-600 to-blue-800 hover:from-blue-700 hover:to-blue-900 text-white font-semibold text-lg rounded-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed min-w-72"
            >
              {isLoading ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-3"></div>
                  Discovering Research
                </div>
              ) : (
                <div className="flex items-center">
                  <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  Discover Research
                </div>
              )}
            </button>
          </div>
        </div>

        {/* Content Section */}
        <div className="max-w-7xl mx-auto px-4 pb-16">
          {error && (
            <div className="mb-8 p-4 bg-red-900/20 border border-red-500/30 rounded-xl backdrop-blur-sm">
              <p className="text-red-300">{error}</p>
            </div>
          )}

          {searchTerms.length > 0 && (
            <div className="mb-8 p-6 bg-black/40 border border-blue-500/30 rounded-xl backdrop-blur-sm">
              <h2 className="text-lg font-semibold mb-3 text-blue-300">Search Terms Used:</h2>
              <div className="flex flex-wrap gap-2 mb-3">
                {searchTerms.map((term, index) => (
                  <span 
                    key={index} 
                    className="bg-blue-600/20 text-blue-300 px-3 py-1 rounded-full text-sm font-medium border border-blue-500/40"
                  >
                    {term}
                  </span>
                ))}
              </div>
              <p className="text-sm text-blue-400">
                These terms were used to search across Semantic Scholar, arXiv, and CrossRef databases.
              </p>
            </div>
          )}

          {Object.keys(sourceStats).length > 0 && (
            <div className="mb-8 p-6 bg-black/40 border border-blue-500/30 rounded-xl backdrop-blur-sm">
              <h3 className="text-lg font-semibold mb-4 text-blue-200">Results by Source:</h3>
              <div className="flex flex-wrap gap-4 mb-4">
                {Object.entries(sourceStats).map(([source, count]) => (
                  <div 
                    key={source}
                    className={`flex items-center px-4 py-3 rounded-xl border ${getSourceColor(source)} backdrop-blur-sm`}
                  >
                    <span className="mr-2 text-lg">{getSourceIcon(source)}</span>
                    <span className="font-medium">{source}</span>
                    <span className="ml-3 px-3 py-1 bg-white/10 rounded-full text-xs font-semibold">
                      {count} paper{count !== 1 ? 's' : ''}
                    </span>
                  </div>
                ))}
              </div>
              <p className="text-sm text-blue-400">
                Total: {papers.length} papers from {Object.keys(sourceStats).length} source{Object.keys(sourceStats).length !== 1 ? 's' : ''}
              </p>
            </div>
          )}

          {papers.length > 0 && (
            <div className="space-y-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-blue-200">Relevant Research Papers</h2>
                <span className="text-sm text-blue-400 bg-black/50 px-3 py-1 rounded-full border border-blue-500/30">
                  Found {papers.length} paper{papers.length !== 1 ? 's' : ''}
                </span>
              </div>
              
              {papers.map((paper, index) => (
                <div 
                  key={index} 
                  className="bg-black/50 border border-blue-500/30 rounded-xl p-6 backdrop-blur-sm hover:bg-black/60 hover:border-blue-400/40 transition-all duration-300"
                >
                  <div className="flex items-start justify-between mb-4">
                    <h3 className="text-xl font-semibold leading-tight flex-1 mr-4 text-blue-100">
                      {paper.url ? (
                        <a 
                          href={paper.url} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="text-blue-400 hover:text-blue-300 hover:underline transition-colors"
                        >
                          {paper.title}
                        </a>
                      ) : (
                        <span>{paper.title}</span>
                      )}
                    </h3>
                    <div className={`flex items-center px-3 py-2 rounded-lg border text-xs font-medium whitespace-nowrap ${getSourceColor(paper.source)}`}>
                      <span className="mr-1">{getSourceIcon(paper.source)}</span>
                      {paper.source}
                    </div>
                  </div>
                  
                  <div className="text-sm text-blue-200 mb-4 space-y-1">
                    {paper.authors && paper.authors.length > 0 && (
                      <p>
                        <span className="font-medium text-blue-100">Authors:</span> {
                          paper.authors.length > 3 
                            ? `${paper.authors.slice(0, 3).join(', ')} et al.`
                            : paper.authors.join(', ')
                        }
                      </p>
                    )}
                    <p>
                      <span className="font-medium text-blue-100">Published:</span> {formatDate(paper.published_date)}
                    </p>
                    {paper.doi && (
                      <p>
                        <span className="font-medium text-blue-100">DOI:</span> {paper.doi}
                      </p>
                    )}
                  </div>
                  
                  <p className="text-blue-200 mb-6 leading-relaxed">
                    {truncateAbstract(paper.abstract)}
                  </p>
                  
                  <div className="flex items-center justify-between">
                    {paper.url ? (
                      <a 
                        href={paper.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white text-sm font-medium rounded-lg transition-all duration-300"
                      >
                        Read Full Paper
                        <svg className="ml-2 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      </a>
                    ) : (
                      <span className="text-sm text-gray-500">No URL available</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
          
          {isLoading && (
            <div className="text-center py-16">
              <div className="inline-flex items-center px-6 py-4 bg-black/40 border border-blue-500/30 rounded-xl backdrop-blur-sm">
                <div className="animate-spin rounded-full h-6 w-6 border-2 border-blue-500 border-t-transparent mr-4"></div>
                <div>
                  <span className="text-blue-200 font-medium">Searching across multiple academic databases...</span>
                  <p className="text-sm text-blue-400 mt-1">
                    Fetching from Semantic Scholar, arXiv, and CrossRef...
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}