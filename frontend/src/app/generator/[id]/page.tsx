'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Send, CheckCircle, RefreshCw } from 'lucide-react';
import { api, sendEmail } from '@/lib/api';

type ArticleData = {
  title?: string;
  summary?: string;
  image_url?: string;
  published_date?: string;
};

type PostData = {
  id: number;
  generated_title?: string;
  generated_caption?: string;
  hashtags?: string;
  article?: ArticleData;
};

export default function GeneratorPage() {
  const params = useParams();
  const router = useRouter();
  const postId = parseInt(params.id as string, 10);

  const fixedRecipient = 'lipunnayak069@gmail.com';
  const [post, setPost] = useState<PostData | null>(null);
  const [title, setTitle] = useState('');
  const [caption, setCaption] = useState('');
  const [loading, setLoading] = useState(true);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const loadPostData = useCallback(async () => {
    try {
      const response = await api.get(`/api/posts/${postId}`);
      const data: PostData = response.data;
      setPost(data);
      setTitle(data.generated_title || '');
      setCaption(data.generated_caption || '');
    } catch (error) {
      console.error('Failed to load post data', error);
    } finally {
      setLoading(false);
    }
  }, [postId]);

  useEffect(() => {
    if (!postId) return;
    const timer = setTimeout(() => {
      loadPostData();
    }, 0);
    return () => clearTimeout(timer);
  }, [postId, loadPostData]);

  const handleSendEmail = async () => {
    setSendingEmail(true);
    try {
      await api.put(`/api/posts/${postId}`, { generated_title: title, generated_caption: caption });
      await sendEmail(postId, fixedRecipient);
      setEmailSent(true);
    } catch (error) {
      console.error('Failed to send email', error);
      alert('Failed to send email. Please try again.');
    } finally {
      setSendingEmail(false);
    }
  };

  const cleanCaption = caption
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .join(' ');

  const captionSummary = cleanCaption
    .replace(/#[A-Za-z0-9_]+/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  const contentSummary = (post?.article?.summary || '').trim() || captionSummary;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center dark:bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 p-8">
      <div className="max-w-6xl mx-auto">
        <button
          onClick={() => router.push('/')}
          className="flex items-center gap-2 text-gray-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors mb-8 font-medium"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          <div className="lg:col-span-5 space-y-8">
            <div>
              <h1 className="text-3xl font-bold mb-2 tracking-tight">Post Editor</h1>
              <p className="text-gray-500 dark:text-gray-400">Edit content and generate your Instagram-ready card.</p>
            </div>

            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm space-y-6">
              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Instagram Hook (Title)</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Description / Caption</label>
                <textarea
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  rows={8}
                  className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all resize-none"
                />
              </div>
            </div>
          </div>

          <div className="lg:col-span-7 flex flex-col">
            <div className="bg-gray-200 dark:bg-gray-800 rounded-3xl overflow-hidden shadow-2xl flex-1 flex items-center justify-center relative aspect-square w-full max-w-lg mx-auto border-8 border-white dark:border-gray-900">
              <div className="w-full h-full rounded-[28px] overflow-hidden bg-[#0a0f1b] text-white flex flex-col">
                <div className="relative h-[52%] bg-gray-800">
                  {post?.article?.image_url ? (
                    <img src={post.article.image_url} alt={post.article.title || 'Article'} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-slate-700 to-slate-900" />
                  )}
                </div>

                <div className="h-[48%] px-7 py-5 bg-[#060912] flex flex-col">
                  <h2
                    className="text-[16px] leading-[1.25] font-bold tracking-tight line-clamp-4"
                  >
                    {title || post?.generated_title || 'Generated Headline'}
                  </h2>
                  <div className="w-full h-[2px] bg-white/12 mt-4 mb-4" />
                  <p
                    className="text-[12px] leading-[1.35] text-gray-100 line-clamp-6"
                  >
                    {contentSummary || post?.article?.summary || 'Generated summary will appear here.'}
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-8 bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm max-w-lg mx-auto w-full">
              {emailSent ? (
                <div className="flex flex-col items-center py-6 text-center">
                  <CheckCircle className="w-16 h-16 text-green-500 mb-4" />
                  <h3 className="text-xl font-bold mb-2">Post Sent Successfully!</h3>
                  <p className="text-gray-500 dark:text-gray-400 mb-6">Check your email for the generated post content.</p>
                  <button onClick={() => router.push('/')} className="text-indigo-600 font-medium hover:underline">Generate Another</button>
                </div>
              ) : (
                <>
                  <h3 className="font-bold text-lg mb-4">Export & Send</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">Recipient: <strong>{fixedRecipient}</strong></p>
                  <button
                    onClick={handleSendEmail}
                    disabled={sendingEmail}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl font-medium transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {sendingEmail ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                    Send
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
