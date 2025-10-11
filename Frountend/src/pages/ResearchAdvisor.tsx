import { useState, useRef, useEffect, useMemo } from 'react';
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
  const [currentPage, setCurrentPage] = useState(1);
  const [isListening, setIsListening] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(false);
  
  const papersPerPage = 8;
  const recognitionRef = useRef<any>(null);

  // Check if speech recognition is supported
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      setVoiceSupported(true);
      const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setIdea(prev => prev + (prev ? ' ' : '') + transcript);
        setIsListening(false);
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
        setError('Voice input error. Please try again.');
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  const toggleVoiceInput = () => {
    if (!voiceSupported) {
      setError('Voice input is not supported in your browser. Please use Chrome, Edge, or Safari.');
      return;
    }

    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    } else {
      try {
        recognitionRef.current?.start();
        setIsListening(true);
        setError('');
      } catch (err) {
        console.error('Failed to start recognition:', err);
        setError('Failed to start voice input. Please try again.');
      }
    }
  };

  // Calculate pagination values
  const totalPages = Math.ceil(papers.length / papersPerPage);
  const startIndex = (currentPage - 1) * papersPerPage;
  const endIndex = startIndex + papersPerPage;
  const currentPapers = papers.slice(startIndex, endIndex);

  const fetchResearchPapers = async () => {
    if (!idea.trim()) {
      setError('Please enter your research idea');
      return;
    }

    if (idea.trim().length < 10) {
      setError('Please provide a more detailed research idea (at least 10 characters)');
      return;
    }

    setIsLoading(true);
    setError('');
    setCurrentPage(1);

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Please log in to access research papers');
        setIsLoading(false);
        return;
      }

      console.log('Fetching research papers...');
      const response = await fetch('http://localhost:8000/research-papers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
          idea: idea.trim(), 
          max_results: 40
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
      console.log('Received data:', data);
      
      const receivedPapers = data.papers || [];
      setPapers(receivedPapers);
      setSearchTerms(data.search_terms || []);
      
      const stats: {[key: string]: number} = {};
      receivedPapers.forEach((paper: ResearchPaper) => {
        stats[paper.source] = (stats[paper.source] || 0) + 1;
      });
      setSourceStats(stats);
      
      if (!receivedPapers || receivedPapers.length === 0) {
        setError('No research papers found. Try rephrasing your idea.');
      } else {
        console.log(`Successfully loaded ${receivedPapers.length} papers`);
      }
    } catch (err: any) {
      console.error('Error fetching research papers:', err);
      setError(err.message || 'Failed to fetch research papers');
      setPapers([]);
      setSearchTerms([]);
      setSourceStats({});
    } finally {
      setIsLoading(false);
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handlePreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handlePageClick = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'Unknown date';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return dateString;
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return dateString;
    }
  };

  const truncateAbstract = (abstract: string, maxLength: number = 250) => {
    if (!abstract) return 'No abstract available';
    if (abstract.length <= maxLength) return abstract;
    return abstract.substring(0, maxLength) + '...';
  };

  const getSourceColor = (source: string) => {
    switch (source) {
      case 'Semantic Scholar':
        return 'bg-blue-600/20 text-blue-300 border-blue-500/40';
      case 'arXiv':
        return 'bg-purple-500/20 text-purple-300 border-purple-400/40';
      case 'CrossRef':
        return 'bg-cyan-600/20 text-cyan-300 border-cyan-500/40';
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
  const sortedPapers = useMemo(() => {
  return [...papers];
}, [papers]);
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisible = 7;
    
    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage <= 3) {
        for (let i = 1; i <= 5; i++) pages.push(i);
        pages.push('...');
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1);
        pages.push('...');
        for (let i = totalPages - 4; i <= totalPages; i++) pages.push(i);
      } else {
        pages.push(1);
        pages.push('...');
        for (let i = currentPage - 1; i <= currentPage + 1; i++) pages.push(i);
        pages.push('...');
        pages.push(totalPages);
      }
    }
    
    return pages;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-600/10 via-blue-800/5 to-transparent"></div>
      
      <div className="relative z-10">
        {/* Header Section */}
        <div className="text-center pt-16 pb-12 px-4">
          <div className="mb-6">
            <div className="inline-flex items-center space-x-4 mb-4">
              <div className="w-20 h-20 bg-gradient-to-br from-blue-600/20 to-blue-800/20 rounded-3xl border border-blue-400/30 flex items-center justify-center backdrop-blur-sm shadow-lg">
                <svg className="w-14 h-14 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <h1 className="text-5xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                Research Finder
              </h1>
            </div>
            
            <p className="text-xl text-gray-300 max-w-4xl mx-auto leading-relaxed">
              Discover up to <span className="text-blue-400 font-semibold">40 top academic research papers</span> powered by AI.{' '}
              Search across Semantic Scholar, arXiv, and CrossRef for comprehensive research.
            </p>
          </div>

          {/* Source Indicators */}
          <div className="flex items-center justify-center space-x-8 mb-12">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-blue-600 rounded-full"></div>
              <span className="text-gray-300">Semantic Scholar</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
              <span className="text-gray-300">arXiv</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-cyan-600 rounded-full"></div>
              <span className="text-gray-300">CrossRef</span>
            </div>
          </div>

          {/* Search Section with Voice Input */}
          <div className="max-w-4xl mx-auto">
            <div className="relative mb-6">
              <textarea
                value={idea}
                onChange={(e) => setIdea(e.target.value)}
                placeholder="Enter your research idea (minimum 10 characters) or use voice input..."
                disabled={isLoading || isListening}
                className="w-full h-32 bg-black/60 border border-blue-500/30 rounded-2xl px-6 py-4 pr-16 text-white placeholder-gray-400 text-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 backdrop-blur-sm transition-all duration-300"
              />
              <div className="absolute bottom-4 right-4 flex items-center space-x-3">
                <span className="text-sm text-gray-400">
                  {idea.length}/2000
                </span>
                {voiceSupported && (
                  <button
                    onClick={toggleVoiceInput}
                    disabled={isLoading}
                    className={`p-2 rounded-lg transition-all duration-300 ${
                      isListening 
                        ? 'bg-red-600/20 text-red-400 border border-red-500/40 animate-pulse' 
                        : 'bg-blue-600/20 text-blue-400 border border-blue-500/40 hover:bg-blue-600/30'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                    title={isListening ? 'Stop listening' : 'Start voice input'}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                    </svg>
                  </button>
                )}
              </div>
            </div>

            {isListening && (
              <div className="mb-4 p-3 bg-red-900/20 border border-red-500/30 rounded-lg">
                <p className="text-red-300 text-sm flex items-center justify-center">
                  <span className="animate-pulse mr-2">🎤</span>
                  Listening... Speak now
                </p>
              </div>
            )}

            <button
              onClick={fetchResearchPapers}
              disabled={isLoading || !idea.trim() || idea.trim().length < 10}
              className="group relative inline-flex items-center justify-center px-8 py-4 bg-gradient-to-r from-blue-600 to-blue-800 hover:from-blue-700 hover:to-blue-900 text-white font-semibold text-lg rounded-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed min-w-72 shadow-lg shadow-blue-500/20"
            >
              {isLoading ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-3"></div>
                  Searching 3 Databases...
                </div>
              ) : (
                <div className="flex items-center">
                  <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  Find Top 40 Papers
                </div>
              )}
            </button>
          </div>
        </div>

        {/* Content Section */}
        <div className="max-w-7xl mx-auto px-4 pb-16">
          {error && (
            <div className="mb-8 p-6 bg-red-900/20 border border-red-500/30 rounded-xl backdrop-blur-sm">
              <div className="flex items-start">
                <svg className="w-6 h-6 text-red-400 mr-3 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-red-300">{error}</p>
              </div>
            </div>
          )}

          {searchTerms.length > 0 && (
            <div className="mb-8 p-6 bg-black/40 border border-blue-500/30 rounded-xl backdrop-blur-sm">
              <h2 className="text-lg font-semibold mb-3 text-blue-300 flex items-center">
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
                </svg>
                Search Terms Used:
              </h2>
              <div className="flex flex-wrap gap-2 mb-3">
                {searchTerms.map((term, index) => (
                  <span 
                    key={index} 
                    className="bg-blue-600/20 text-blue-300 px-4 py-2 rounded-full text-sm font-medium border border-blue-500/40"
                  >
                    {term}
                  </span>
                ))}
              </div>
              <p className="text-sm text-blue-400">
                AI-extracted terms used to search across all three academic databases
              </p>
            </div>
          )}

          {Object.keys(sourceStats).length > 0 && (
            <div className="mb-8 p-6 bg-black/40 border border-blue-500/30 rounded-xl backdrop-blur-sm">
              <h3 className="text-lg font-semibold mb-4 text-blue-200 flex items-center">
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                Results by Source:
              </h3>
              <div className="flex flex-wrap gap-4 mb-4">
                {Object.entries(sourceStats).map(([source, count]) => (
                  <div 
                    key={source}
                    className={`flex items-center px-5 py-3 rounded-xl border ${getSourceColor(source)} backdrop-blur-sm shadow-md`}
                  >
                    <span className="mr-2 text-xl">{getSourceIcon(source)}</span>
                    <span className="font-medium text-base">{source}</span>
                    <span className="ml-4 px-3 py-1 bg-white/10 rounded-full text-sm font-bold">
                      {count}
                    </span>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between text-sm">
                <p className="text-blue-400">
                  <span className="font-semibold text-blue-300">Total: {papers.length}</span> papers from {Object.keys(sourceStats).length} source{Object.keys(sourceStats).length !== 1 ? 's' : ''}
                </p>
                {papers.length > 0 && (
                  <p className="text-blue-400">
                    Showing <span className="font-semibold text-blue-300">{startIndex + 1}-{Math.min(endIndex, papers.length)}</span> (Page {currentPage} of {totalPages})
                  </p>
                )}
              </div>
            </div>
          )}

          {papers.length > 0 && (
            <div className="space-y-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-3xl font-bold text-blue-100 flex items-center">
                  <svg className="w-8 h-8 mr-3 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                  Top Research Papers
                </h2>
                <div className="text-sm text-blue-400 bg-black/50 px-4 py-2 rounded-full border border-blue-500/30">
                  Page <span className="font-bold text-blue-300">{currentPage}</span> of <span className="font-bold text-blue-300">{totalPages}</span>
                </div>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {currentPapers.map((paper, index) => (
                  <div 
                    key={startIndex + index} 
                    className="bg-black/50 border border-blue-500/30 rounded-xl p-6 backdrop-blur-sm hover:bg-black/60 hover:border-blue-400/40 hover:shadow-xl hover:shadow-blue-500/10 transition-all duration-300"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <h3 className="text-lg font-semibold leading-tight flex-1 mr-3 text-blue-100">
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
                      <div className={`flex items-center px-3 py-1.5 rounded-lg border text-xs font-medium whitespace-nowrap ${getSourceColor(paper.source)}`}>
                        <span className="mr-1">{getSourceIcon(paper.source)}</span>
                        {paper.source}
                      </div>
                    </div>
                    
                    <div className="text-sm text-blue-200 mb-4 space-y-1">
                      {paper.authors && paper.authors.length > 0 && (
                        <p className="flex items-start">
                          <svg className="w-4 h-4 mr-2 mt-0.5 text-blue-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                          <span className="font-medium text-blue-100">Authors: </span>
                          <span className="ml-1">{
                            paper.authors.length > 3 
                              ? `${paper.authors.slice(0, 3).join(', ')} et al.`
                              : paper.authors.join(', ')
                          }</span>
                        </p>
                      )}
                      <p className="flex items-center">
                        <svg className="w-4 h-4 mr-2 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <span className="font-medium text-blue-100">Published: </span>
                        <span className="ml-1">{formatDate(paper.published_date)}</span>
                      </p>
                      {paper.doi && (
                        <p className="flex items-center">
                          <svg className="w-4 h-4 mr-2 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                          </svg>
                          <span className="font-medium text-blue-100">DOI: </span>
                          <span className="ml-1 text-xs break-all">{paper.doi}</span>
                        </p>
                      )}
                    </div>
                    
                    <p className="text-blue-200 mb-5 leading-relaxed text-sm">
                      {truncateAbstract(paper.abstract)}
                    </p>
                    
                    <div className="flex items-center justify-between pt-4 border-t border-blue-500/20">
                      {paper.url ? (
                        <a 
                          href={paper.url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="inline-flex items-center px-5 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white text-sm font-medium rounded-lg transition-all duration-300 shadow-md shadow-blue-500/20"
                        >
                          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                          </svg>
                          Read Full Paper
                          <svg className="ml-2 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                        </a>
                      ) : (
                        <span className="text-sm text-gray-500 italic">No URL available</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="flex flex-col items-center justify-center space-y-4 mt-12 pt-8 border-t border-blue-500/30">
                  <div className="flex items-center space-x-3">
                    <button
                      onClick={handlePreviousPage}
                      disabled={currentPage === 1}
                      className="flex items-center px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-800 hover:from-blue-700 hover:to-blue-900 text-white font-medium rounded-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-blue-500/20"
                    >
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                      Previous
                    </button>

                    {/* Page Numbers */}
                    <div className="flex items-center space-x-2">
                      {getPageNumbers().map((page, index) => (
                        page === '...' ? (
                          <span key={`ellipsis-${index}`} className="px-3 text-blue-400">...</span>
                        ) : (
                          <button
                            key={page}
                            onClick={() => handlePageClick(page as number)}
                            className={`min-w-[40px] h-10 rounded-lg font-medium transition-all duration-300 ${
                              currentPage === page
                                ? 'bg-gradient-to-r from-blue-600 to-blue-800 text-white shadow-lg shadow-blue-500/30 scale-110'
                                : 'bg-black/40 text-blue-300 hover:bg-blue-600/20 border border-blue-500/30 hover:border-blue-400/50'
                            }`}
                          >
                            {page}
                          </button>
                        )
                      ))}
                    </div>

                    <button
                      onClick={handleNextPage}
                      disabled={currentPage === totalPages}
                      className="flex items-center px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-800 hover:from-blue-700 hover:to-blue-900 text-white font-medium rounded-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-blue-500/20"
                    >
                      Next
                      <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </div>
                  
                  <p className="text-sm text-blue-400">
                    Showing papers <span className="font-semibold text-blue-300">{startIndex + 1}-{Math.min(endIndex, papers.length)}</span> of <span className="font-semibold text-blue-300">{papers.length}</span> total
                  </p>
                </div>
              )}
            </div>
          )}
          
          {isLoading && (
            <div className="text-center py-20">
              <div className="inline-flex flex-col items-center px-8 py-8 bg-black/40 border border-blue-500/30 rounded-2xl backdrop-blur-sm">
                <div className="animate-spin rounded-full h-12 w-12 border-3 border-blue-500 border-t-transparent mb-6"></div>
                <div>
                  <span className="text-blue-200 font-semibold text-lg block mb-2">Searching academic databases...</span>
                  <p className="text-sm text-blue-400">
                    Fetching all available papers from Semantic Scholar, arXiv, and CrossRef
                  </p>
                  <p className="text-xs text-blue-500 mt-2">
                    This may take a moment for comprehensive results
                  </p>
                </div>
              </div>
            </div>
          )}

          {!isLoading && papers.length === 0 && !error && (
            <div className="text-center py-20">
              <div className="inline-flex flex-col items-center px-8 py-8 bg-black/40 border border-blue-500/30 rounded-2xl backdrop-blur-sm max-w-md">
                <svg className="w-16 h-16 text-blue-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
                <h3 className="text-xl font-semibold text-blue-200 mb-2">Ready to Discover Research</h3>
                <p className="text-blue-400 text-center">
                  Enter your research idea above to find all relevant academic papers from multiple sources
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}