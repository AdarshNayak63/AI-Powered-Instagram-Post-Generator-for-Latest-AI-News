'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ExternalLink, Sparkles, RefreshCw, Calendar } from 'lucide-react';
import { fetchArticles, triggerScrape, generatePost } from '@/lib/api';

type Article = {
  id: number;
  title: string;
  summary: string;
  image_url: string;
  source_url: string;
  published_date: string;
};

export default function Dashboard() {
  const router = useRouter();
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [scraping, setScraping] = useState(false);
  const [generatingId, setGeneratingId] = useState<number | null>(null);
  const [filterDays, setFilterDays] = useState(1);

  useEffect(() => {
    loadArticles(filterDays);
  }, [filterDays]);

  const loadArticles = async (days: number) => {
    setLoading(true);
    try {
      const data = await fetchArticles(days);
      setArticles(data || []);
    } catch (error) {
      console.error('Failed to load articles', error);
    }
    setLoading(false);
  };

  const handleScrape = async () => {
    setScraping(true);
    try {
      await triggerScrape(filterDays);
      alert('Scraping job started in the background. Please refresh in a moment.');
    } catch (error) {
      console.error('Scraping failed', error);
      alert('Failed to trigger scraping.');
    }
    setScraping(false);
  };

  const handleGenerate = async (articleId: number) => {
    setGeneratingId(articleId);
    try {
      const post = await generatePost(articleId);
      if (post && post.id) {
        router.push(`/generator/${post.id}`);
      }
    } catch (error) {
      console.error('Failed to generate post', error);
      alert('Generation failed. Please try again.');
    }
    setGeneratingId(null);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 p-8">
      <div className="max-w-7xl mx-auto">
        
        <header className="mb-12 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mb-2">
              AI News Feed
            </h1>
            <p className="text-gray-500 dark:text-gray-400">Select an article to generate an Instagram post.</p>
          </div>
          
          <div className="flex items-center gap-4">
            <button 
              onClick={handleScrape}
              disabled={scraping}
              className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${scraping ? 'animate-spin' : ''}`} />
              {scraping ? 'Scraping...' : 'Scrape Latest'}
            </button>
          </div>
        </header>

        <div className="mb-8 flex flex-wrap gap-3">
          <div className="flex items-center gap-2 text-gray-500 mr-2">
            <Calendar className="w-5 h-5" />
            <span className="font-medium">Filter by:</span>
          </div>
          {[
            { label: 'Today', days: 1 },
            { label: 'Yesterday', days: 2 },
            { label: 'Last 7 Days', days: 7 },
            { label: 'Last 10 Days', days: 10 },
          ].map((filter) => (
            <button
              key={filter.label}
              onClick={() => setFilterDays(filter.days)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                filterDays === filter.days 
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200 dark:shadow-none' 
                  : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-[400px] bg-gray-200 dark:bg-gray-800 rounded-2xl animate-pulse"></div>
            ))}
          </div>
        ) : articles.length === 0 ? (
          <div className="text-center py-20 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm">
            <h3 className="text-xl font-semibold mb-2">No articles found</h3>
            <p className="text-gray-500 dark:text-gray-400 mb-6">Try scraping for the latest news or change your date filter.</p>
            <button 
              onClick={handleScrape}
              className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-md"
            >
              Start Scraping
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {articles.map((article) => (
              <div key={article.id} className="group flex flex-col bg-white dark:bg-gray-800 rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
                <div className="h-48 overflow-hidden bg-gray-200 dark:bg-gray-700 relative">
                  {article.image_url ? (
                    <img 
                      src={article.image_url} 
                      alt={article.title} 
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400">No Image</div>
                  )}
                  <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-md text-white text-xs px-2 py-1 rounded-md">
                    {new Date(article.published_date).toLocaleDateString()}
                  </div>
                </div>
                
                <div className="p-6 flex-1 flex flex-col">
                  <h3 className="font-bold text-lg mb-3 line-clamp-2 leading-tight">
                    {article.title}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 text-sm mb-6 line-clamp-3 flex-1">
                    {article.summary}
                  </p>
                  
                  <div className="flex items-center gap-3 mt-auto pt-4 border-t border-gray-100 dark:border-gray-700">
                    <button 
                      onClick={() => handleGenerate(article.id)}
                      disabled={generatingId === article.id}
                      className="flex-1 flex justify-center items-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white px-4 py-2.5 rounded-lg font-medium transition-all shadow-md shadow-indigo-200/50 dark:shadow-none disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                      {generatingId === article.id ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <Sparkles className="w-4 h-4" />
                      )}
                      {generatingId === article.id ? 'Generating...' : 'Generate Post'}
                    </button>
                    
                    <a 
                      href={article.source_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="p-2.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors"
                      title="View Source"
                    >
                      <ExternalLink className="w-5 h-5" />
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
