'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Send, Image as ImageIcon, CheckCircle, RefreshCw } from 'lucide-react';
import { api, getTemplates, generateImage, sendEmail } from '@/lib/api';

export default function GeneratorPage() {
  const params = useParams();
  const router = useRouter();
  const postId = parseInt(params.id as string);
  
  type PostData = {
    id: number;
    generated_title?: string;
    generated_caption?: string;
    template_used?: string;
    image_path?: string;
  };

  const [post, setPost] = useState<PostData | null>(null);
  const [templates, setTemplates] = useState<{id: string, name: string}[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState('professional_clean');
  const fixedRecipient = 'lipunnayak069@gmail.com';
  
  const [title, setTitle] = useState('');
  const [caption, setCaption] = useState('');
  
  const [loading, setLoading] = useState(true);
  const [generatingImg, setGeneratingImg] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [previewError, setPreviewError] = useState(false);
  const [imageVersion, setImageVersion] = useState(0);

  const getPreviewSrc = (imagePath?: string) => {
    if (!imagePath || imagePath === "placeholder.png") return null;
    const normalized = imagePath.replace(/^\/+/, "");
    const staticPath = normalized.startsWith("static/") ? normalized : `static/${normalized}`;
    return `/api/proxy/${staticPath}?v=${imageVersion}`;
  };

  const loadPostData = useCallback(async () => {
    try {
      // In a real app we'd fetch the post by ID. For now we assume the backend returns it after generation, 
      // or we simulate it here if we don't have a GET /posts/:id endpoint yet.
      // Assuming GET /api/posts/:id exists or we'll create it.
      const response = await api.get(`/api/posts/${postId}`).catch(() => null);
      if (response && response.data) {
        setPost(response.data);
        setTitle(response.data.generated_title);
        setCaption(response.data.generated_caption);
        const activeTemplate = response.data.template_used || 'modern_dark';
        setSelectedTemplate(activeTemplate);
        setPreviewError(false);

        if (!response.data.image_path || response.data.image_path === "placeholder.png") {
          try {
            const regenerated = await generateImage(postId, activeTemplate);
            if (regenerated?.post) {
              setPost(regenerated.post);
              setImageVersion((v) => v + 1);
            } else {
              const refreshed = await api.get(`/api/posts/${postId}`).catch(() => null);
              if (refreshed && refreshed.data) {
                setPost(refreshed.data);
                setImageVersion((v) => v + 1);
              }
            }
          } catch (regenerateError) {
            console.error('Auto-regeneration failed', regenerateError);
          }
        }
      } else {
        // Fallback mock if backend endpoint is missing during dev
        setTitle("AI generated title hook goes here...");
        setCaption("This is an AI generated caption full of insights.\n\n#AI #Tech");
        setPost({ id: postId, image_path: "placeholder.png" });
      }
    } catch (error) {
      console.error(error);
    }
    setLoading(false);
  }, [postId]);

  const loadTemplates = useCallback(async () => {
    try {
      const data = await getTemplates();
      if (data && data.templates) {
        setTemplates(data.templates);
      }
    } catch {
      setTemplates([
        { id: "modern_dark", name: "Modern Dark" },
        { id: "glassmorphism", name: "Glassmorphism" }
      ]);
    }
  }, []);

  useEffect(() => {
    if (postId) {
      loadPostData();
      loadTemplates();
    }
  }, [postId, loadPostData, loadTemplates]);

  const handleTemplateChange = async (templateId: string) => {
    setSelectedTemplate(templateId);
    setGeneratingImg(true);
    setPreviewError(false);
    try {
      // Re-generate image on the backend with new template
      const result = await generateImage(postId, templateId);
      if (result?.post) {
        setPost(result.post);
      } else {
        await loadPostData();
      }
      setImageVersion((v) => v + 1);
    } catch (error) {
      console.error("Failed to change template", error);
      alert("Failed to regenerate image with new template.");
    }
    setGeneratingImg(false);
  };

  const handleSendEmail = async () => {
    setSendingEmail(true);
    try {
      // Optional: Save the edited title and caption to the backend first
      await api.put(`/api/posts/${postId}`, { generated_title: title, generated_caption: caption }).catch(() => console.log('Save failed'));
      
      await sendEmail(postId, fixedRecipient);
      setEmailSent(true);
    } catch (error) {
      console.error("Failed to send email", error);
      alert("Failed to send email. Please try again.");
    }
    setSendingEmail(false);
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center dark:bg-gray-900"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div></div>;

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
          {/* Left Column - Editor */}
          <div className="lg:col-span-5 space-y-8">
            <div>
              <h1 className="text-3xl font-bold mb-2 tracking-tight">Post Editor</h1>
              <p className="text-gray-500 dark:text-gray-400">Refine your AI-generated content before exporting.</p>
            </div>

            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm space-y-6">
              
              {/* Template Selector */}
              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-3">
                  Visual Template
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {templates.map(tpl => (
                    <button
                      key={tpl.id}
                      onClick={() => handleTemplateChange(tpl.id)}
                      disabled={generatingImg}
                      className={`py-3 px-4 rounded-xl border flex items-center justify-center gap-2 transition-all ${
                        selectedTemplate === tpl.id 
                          ? 'bg-indigo-50 border-indigo-500 text-indigo-700 dark:bg-indigo-900/30 dark:border-indigo-500 dark:text-indigo-300 shadow-sm'
                          : 'bg-transparent border-gray-200 dark:border-gray-700 hover:border-indigo-300 dark:hover:border-indigo-700 text-gray-600 dark:text-gray-400'
                      }`}
                    >
                      {selectedTemplate === tpl.id && generatingImg ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <ImageIcon className="w-4 h-4" />
                      )}
                      <span className="text-sm font-medium">{tpl.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Title Input */}
              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                  Instagram Hook (Title)
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                  placeholder="Catchy title..."
                />
              </div>

              {/* Caption Input */}
              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                  Instagram Caption & Hashtags
                </label>
                <textarea
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  rows={8}
                  className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all resize-none"
                  placeholder="Write your engaging caption here..."
                />
              </div>
            </div>
          </div>

          {/* Right Column - Preview & Actions */}
          <div className="lg:col-span-7 flex flex-col">
            <div className="bg-gray-200 dark:bg-gray-800 rounded-3xl overflow-hidden shadow-2xl flex-1 flex items-center justify-center relative aspect-square w-full max-w-lg mx-auto border-8 border-white dark:border-gray-900">
              {/* Instagram Image Preview Box */}
              {generatingImg ? (
                <div className="flex flex-col items-center text-gray-500">
                  <RefreshCw className="w-10 h-10 animate-spin mb-4 text-indigo-500" />
                  <p className="font-medium">Applying Template...</p>
                </div>
              ) : (
                <div className="relative w-full h-full bg-gradient-to-br from-gray-800 to-black flex items-center justify-center">
                  <p className="text-gray-500 text-sm">
                    {/* Placeholder for actual generated image */}
                    Image Preview for <br/> <strong>{selectedTemplate}</strong> <br/>
                    (Requires Backend PIL generation)
                  </p>
                  {post?.image_path && post.image_path !== "placeholder.png" && (
                    <img
                      src={getPreviewSrc(post.image_path) || undefined}
                      className="absolute inset-0 w-full h-full object-cover"
                      alt="Preview"
                      onError={() => setPreviewError(true)}
                      onLoad={() => setPreviewError(false)}
                    />
                  )}
                  {previewError && (
                    <p className="absolute bottom-4 left-4 right-4 text-red-300 text-xs text-center">
                      Failed to load generated image. Please change template once to regenerate.
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Email Section */}
            <div className="mt-8 bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm max-w-lg mx-auto w-full">
              {emailSent ? (
                <div className="flex flex-col items-center py-6 text-center">
                  <CheckCircle className="w-16 h-16 text-green-500 mb-4" />
                  <h3 className="text-xl font-bold mb-2">Post Sent Successfully!</h3>
                  <p className="text-gray-500 dark:text-gray-400 mb-6">Check your email for the generated PNG and text.</p>
                  <button onClick={() => router.push('/')} className="text-indigo-600 font-medium hover:underline">Generate Another</button>
                </div>
              ) : (
                <>
                  <h3 className="font-bold text-lg mb-4">Export & Send</h3>
                  <div className="space-y-3">
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Recipient: <strong>{fixedRecipient}</strong>
                    </p>
                    <button
                      onClick={handleSendEmail}
                      disabled={sendingEmail}
                      className="w-full bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl font-medium transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {sendingEmail ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                      Send
                    </button>
                  </div>
                </>
              )}
            </div>
            
          </div>
        </div>

      </div>
    </div>
  );
}
