'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Send, CheckCircle, RefreshCw } from 'lucide-react';
import ReactDOMServer from 'react-dom/server';
import { toPng } from 'html-to-image';
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
  template_used?: string;
  article?: ArticleData;
};

type TemplateDef = {
  template_id: string;
  template_name: string;
  design_style: string;
  layout_description: string;
  color_scheme: string;
  typography_style: string;
  decorative_elements: string;
  implementation_details: string;
};

const TEMPLATES: TemplateDef[] = [
  {
    template_id: 'modern-dark-news',
    template_name: 'Modern Dark News',
    design_style: 'Elegant dark editorial',
    layout_description: 'Large rounded image, bold heading, clean divider, concise body.',
    color_scheme: 'Deep navy, slate, white text',
    typography_style: 'Bold sans headline + readable body',
    decorative_elements: 'Subtle noise gradient and soft glow',
    implementation_details: 'Rounded image, dark split layout, minimal divider, shadowed frame.',
  },
  {
    template_id: 'gradient-glassmorphism',
    template_name: 'Gradient Glassmorphism',
    design_style: 'Vibrant frosted panel',
    layout_description: 'Floating glass card over gradient with image-first hierarchy.',
    color_scheme: 'Cyan, blue, pink gradient with white text',
    typography_style: 'Clean geometric sans',
    decorative_elements: 'Blurred blobs, translucent borders, depth shadows',
    implementation_details: 'Backdrop blur panel, translucent layers, soft rounded corners.',
  },
  {
    template_id: 'magazine-editorial',
    template_name: 'Magazine Editorial',
    design_style: 'Premium publication',
    layout_description: 'Structured masthead feel with strong title and balanced whitespace.',
    color_scheme: 'Ivory, charcoal, muted accents',
    typography_style: 'Serif headline + sans body',
    decorative_elements: 'Top rule, category chip, editorial spacing',
    implementation_details: 'Paper-like card, high-contrast title, thin divider rhythm.',
  },
  {
    template_id: 'neon-tech',
    template_name: 'Neon Tech',
    design_style: 'Futuristic interface',
    layout_description: 'Dark grid foundation, neon frame, cyber-style content blocks.',
    color_scheme: 'Black, electric cyan, neon magenta',
    typography_style: 'Bold techno sans + compact body',
    decorative_elements: 'Glow lines, gradient borders, HUD accents',
    implementation_details: 'Inset neon border, glow divider, layered tech panel.',
  },
  {
    template_id: 'template_cinematic_story_pro',
    template_name: 'Cinematic Story Card Pro',
    design_style: 'Immersive cinematic editorial premium',
    layout_description: 'Hero image with dramatic veil, floating badge, overlaid headline, glass description, luxury footer.',
    color_scheme: 'Deep black with gold and plum highlights',
    typography_style: 'Extra-bold cinematic headline with refined body rhythm',
    decorative_elements: 'Vignette, glow accents, frosted panel, gradient strip, premium shadows',
    implementation_details: 'Layered gradients and flares guide eye from image to title to description with strong mobile readability.',
  },
  {
    template_id: 'premium-card-stack',
    template_name: 'Premium Card Stack',
    design_style: 'Layered luxury',
    layout_description: 'Foreground card with stacked gradient plates for depth.',
    color_scheme: 'Indigo, slate, soft gold highlights',
    typography_style: 'Bold modern sans',
    decorative_elements: 'Offset background cards, premium glows, rounded stack',
    implementation_details: 'Multi-layer composition, soft shadows, accent edge lighting.',
  },
  {
    template_id: 'breaking-news-alert',
    template_name: 'Breaking News Alert Template',
    design_style: 'High-impact newsroom alert',
    layout_description: 'Top hero image, floating badge, bold title, divider, body, alert strip, footer handle.',
    color_scheme: 'Charcoal, white, red alert accents',
    typography_style: 'Heavy sans headline + compact supporting text',
    decorative_elements: 'Floating category badge, dot bullet, urgent alert bar',
    implementation_details: 'Upper image block, layered content section, strong contrast bottom bars.',
  },
  {
    template_id: 'premium-magazine-alert',
    template_name: 'Premium Magazine Alert Template',
    design_style: 'Luxury editorial magazine',
    layout_description: 'Top image with gradient veil, elegant tag, refined text block, premium accent strip.',
    color_scheme: 'Onyx, ivory, warm gold accents',
    typography_style: 'Editorial serif-sans pairing',
    decorative_elements: 'Soft gradients, elegant tag, subtle inset borders',
    implementation_details: 'Balanced whitespace, polished typography hierarchy, premium footer system.',
  },
  {
    template_id: 'spotlight-focus',
    template_name: 'Spotlight Focus Template',
    design_style: 'Futuristic editorial spotlight',
    layout_description: 'Radial spotlight background, elevated hero card, focus-led text flow, attention strip.',
    color_scheme: 'Near-black, electric blue, white',
    typography_style: 'Heavy sans headline + clean compact body',
    decorative_elements: 'Spotlight glow, pulse halo, floating badge',
    implementation_details: 'High-contrast focal center with layered glows and highlighted description panel.',
  },
  {
    template_id: 'cinematic-story-card',
    template_name: 'Cinematic Story Card Template',
    design_style: 'Movie-poster luxury storytelling',
    layout_description: 'Immersive full image with gradient veil, overlaid headline, glass description card.',
    color_scheme: 'Deep charcoal, amber highlights, frosted white',
    typography_style: 'Massive bold headline + elegant supporting body',
    decorative_elements: 'Cinematic overlays, glow accent line, glassmorphism panel',
    implementation_details: 'Layered depth composition guiding eye from visual to headline to context.',
  },
];

export default function GeneratorPage() {
  const params = useParams();
  const router = useRouter();
  const postId = parseInt(params.id as string, 10);

  const fixedRecipient = 'adarshnayak001@gmail.com';
  const [post, setPost] = useState<PostData | null>(null);
  const [title, setTitle] = useState('');
  const [caption, setCaption] = useState('');
  const [loading, setLoading] = useState(true);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(TEMPLATES[0].template_id);
  const [templateLabel, setTemplateLabel] = useState('Spotlight');
  const [templateSubLabel, setTemplateSubLabel] = useState('Global tech update');
  const [footerLeft, setFooterLeft] = useState('@THEAIBRIEF365');
  const [footerRight, setFooterRight] = useState('What You Should Know');

  const loadPostData = useCallback(async () => {
    try {
      const response = await api.get(`/api/posts/${postId}`);
      const data: PostData = response.data;
      setPost(data);
      setTitle(data.generated_title || '');
      setCaption(data.generated_caption || '');
      if (data.template_used) {
        setSelectedTemplateId(data.template_used);
      }
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
      const templateHtml = buildTemplateEmailHtml();

      // Capture the template preview as an image
      let templateImageBase64 = undefined;
      const captureWrapper = document.getElementById('capture-wrapper');

      if (captureWrapper) {
        // Wait for all images to load
        const images = Array.from(captureWrapper.querySelectorAll('img'));
        await Promise.all(
          images.map((img) => {
            if (img.complete) return Promise.resolve();
            return new Promise((resolve) => {
              img.onload = resolve;
              img.onerror = resolve;
            });
          })
        );

        // Wait for fonts to load
        await document.fonts.ready;

        // Force exact pixel dimensions to prevent responsive collapse during clone
        const rect = captureWrapper.getBoundingClientRect();

        templateImageBase64 = await toPng(captureWrapper, {
          cacheBust: true,
          pixelRatio: 3, // High resolution
          width: rect.width,
          height: rect.height,
          style: {
            width: `${rect.width}px`,
            height: `${rect.height}px`,
            transform: 'scale(1)',
            margin: '0',
            display: 'block',
          }
        });
      }

      await api.put(`/api/posts/${postId}`, {
        generated_title: title,
        generated_caption: caption,
        template_used: selectedTemplateId,
      });
      await sendEmail(postId, fixedRecipient, {
        instagram_hook: title || displayTitle,
        description: caption || displaySummary,
        template_used: selectedTemplateId,
        template_html: templateHtml,
        template_image_base64: templateImageBase64,
      });
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
  const selectedTemplate = TEMPLATES.find((t) => t.template_id === selectedTemplateId) || TEMPLATES[0];
  const displayTitle = title || post?.generated_title || 'Generated Headline';
  const displaySummary = contentSummary || post?.article?.summary || 'Generated summary will appear here.';
  const displayImage = post?.article?.image_url;
  const escapeHtml = (value: string) =>
    (value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');

  const buildTemplateEmailHtml = () => {
    const previewElement = renderTemplatePreview();
    const staticHtml = ReactDOMServer.renderToStaticMarkup(previewElement);

    return `
      <div style="font-family: Arial, sans-serif; background-color: #f3f4f6; padding: 20px; display: flex; justify-content: center;">
        <div style="max-width: 480px; width: 100%; aspect-ratio: 1 / 1; border-radius: 28px; overflow: hidden; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);">
          ${staticHtml}
        </div>
      </div>
    `;
  };

  const renderTemplatePreview = () => {
    const safeTitle = displayTitle || '';
    const safeSummary = displaySummary || '';

    const proxiedImageUrl = displayImage ? `/api/proxy-image?url=${encodeURIComponent(displayImage)}` : '';

    const imageNode = proxiedImageUrl ? (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={proxiedImageUrl} alt={post?.article?.title || 'Article'} crossOrigin="anonymous" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
    ) : (
      <div style={{ width: '100%', height: '100%', background: 'linear-gradient(to bottom right, #64748b, #1e293b)' }} />
    );

    const lineClamp = (lines: number) => ({
      display: '-webkit-box',
      WebkitLineClamp: lines,
      WebkitBoxOrient: 'vertical' as const,
      overflow: 'hidden',
    });

    if (selectedTemplateId === 'gradient-glassmorphism') {
      return (
        <div style={{ width: '100%', height: '100%', position: 'relative', background: 'linear-gradient(to bottom right, #06b6d4, #2563eb, #c026d3)', padding: '24px', boxSizing: 'border-box' }}>
          <div style={{ position: 'absolute', top: '-40px', right: '-40px', width: '176px', height: '176px', borderRadius: '50%', background: 'rgba(255,255,255,0.25)', filter: 'blur(40px)' }} />
          <div style={{ position: 'absolute', bottom: '-40px', left: '-40px', width: '176px', height: '176px', borderRadius: '50%', background: 'rgba(216,180,254,0.25)', filter: 'blur(40px)' }} />
          <div style={{ position: 'relative', width: '100%', height: '100%', borderRadius: '26px', border: '1px solid rgba(255,255,255,0.35)', background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(24px)', padding: '16px', display: 'flex', flexDirection: 'column', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', boxSizing: 'border-box' }}>
            <div style={{ height: '52%', borderRadius: '16px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.3)' }}>{imageNode}</div>
            <h2 style={{ marginTop: '16px', fontSize: '17px', lineHeight: '1.25', fontWeight: 'bold', color: '#ffffff', margin: '16px 0 0 0', ...lineClamp(4) }}>{safeTitle}</h2>
            <div style={{ width: '100%', height: '2px', background: 'rgba(255,255,255,0.35)', margin: '12px 0' }} />
            <p style={{ fontSize: '12px', lineHeight: '1.38', color: 'rgba(255,255,255,0.95)', margin: '0', ...lineClamp(6) }}>{safeSummary}</p>
          </div>
        </div>
      );
    }

    if (selectedTemplateId === 'magazine-editorial') {
      return (
        <div style={{ width: '100%', height: '100%', background: '#f6f1e9', color: '#222222', padding: '20px', display: 'flex', flexDirection: 'column', boxSizing: 'border-box' }}>
          <div style={{ fontSize: '10px', letterSpacing: '0.24em', textTransform: 'uppercase', fontWeight: '600', color: '#666666', marginBottom: '8px' }}>Tech Brief</div>
          <div style={{ height: '49%', borderRadius: '16px', overflow: 'hidden' }}>{imageNode}</div>
          <h2 style={{ marginTop: '16px', fontSize: '18px', lineHeight: '1.24', fontWeight: '600', fontFamily: 'Georgia, serif', margin: '16px 0 0 0', ...lineClamp(4) }}>{safeTitle}</h2>
          <div style={{ width: '100%', height: '1px', background: 'rgba(34,34,34,0.25)', margin: '12px 0' }} />
          <p style={{ fontSize: '12px', lineHeight: '1.42', color: '#2e2e2e', fontFamily: 'Arial, sans-serif', margin: '0', ...lineClamp(6) }}>{safeSummary}</p>
        </div>
      );
    }

    if (selectedTemplateId === 'neon-tech') {
      return (
        <div style={{ width: '100%', height: '100%', background: '#050814', padding: '16px', boxSizing: 'border-box' }}>
          <div style={{ width: '100%', height: '100%', borderRadius: '24px', border: '1px solid rgba(34,211,238,0.7)', boxShadow: '0 0 24px rgba(34,211,238,0.28)', background: 'linear-gradient(to bottom, #0b1226, #040813)', overflow: 'hidden', display: 'flex', flexDirection: 'column', boxSizing: 'border-box' }}>
            <div style={{ height: '50%', position: 'relative' }}>
              {imageNode}
              <div style={{ position: 'absolute', inset: 0, boxShadow: 'inset 0 0 0 1px rgba(34,211,238,0.4)' }} />
            </div>
            <div style={{ padding: '20px', flex: '1', display: 'flex', flexDirection: 'column', boxSizing: 'border-box' }}>
              <h2 style={{ fontSize: '16px', lineHeight: '1.24', fontWeight: '800', color: '#cffafe', margin: '0', ...lineClamp(4) }}>{safeTitle}</h2>
              <div style={{ width: '100%', height: '2px', background: 'linear-gradient(to right, #67e8f9, #e879f9)', margin: '12px 0', boxShadow: '0 0 12px rgba(236,72,153,0.45)' }} />
              <p style={{ fontSize: '12px', lineHeight: '1.38', color: 'rgba(236,254,255,0.95)', margin: '0', ...lineClamp(6) }}>{safeSummary}</p>
            </div>
          </div>
        </div>
      );
    }

    if (selectedTemplateId === 'template_cinematic_story_pro') {
      return (
        <div style={{ width: '100%', height: '100%', position: 'relative', background: '#06060a', padding: '16px', overflow: 'hidden', boxSizing: 'border-box' }}>
          <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at 80% 18%, rgba(234,179,8,0.22), transparent 34%), radial-gradient(circle at 20% 82%, rgba(168,85,247,0.2), transparent 36%)' }} />
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, #090912, #080913, #040406)' }} />
          <div style={{ position: 'relative', width: '100%', height: '100%', borderRadius: '30px', overflow: 'hidden', border: '1px solid rgba(253,230,138,0.2)', boxShadow: '0 30px 70px rgba(0,0,0,0.65)', boxSizing: 'border-box' }}>
            <div style={{ position: 'absolute', inset: 0 }}>
              {imageNode}
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, #050507, rgba(9,9,21,0.65), transparent)' }} />
              <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at 75% 20%, rgba(250,204,21,0.2), transparent 35%)' }} />
              <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.25)' }} />
            </div>

            <div style={{ position: 'absolute', top: '16px', left: '16px', padding: '4px 12px', borderRadius: '6px', border: '1px solid rgba(253,230,138,0.4)', background: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(12px)', color: '#fef3c7', fontSize: '10px', fontWeight: 'bold', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
              {templateLabel}
            </div>

            <div style={{ position: 'absolute', left: '20px', right: '20px', top: '40%' }}>
              <h2 style={{ fontSize: '23px', lineHeight: '1.1', fontWeight: '800', letterSpacing: '-0.02em', color: '#ffffff', textShadow: '0 4px 16px rgba(0,0,0,0.8)', margin: '0', ...lineClamp(4) }}>
                {safeTitle}
              </h2>
              <p style={{ fontSize: '11px', marginTop: '4px', color: 'rgba(254,243,199,0.85)', textTransform: 'uppercase', letterSpacing: '0.12em', margin: '4px 0 0 0', ...lineClamp(1) }}>{templateSubLabel}</p>
              <div style={{ width: '96px', height: '3px', borderRadius: '9999px', background: 'linear-gradient(to right, #fcd34d, #f0abfc)', boxShadow: '0 0 14px rgba(251,191,36,0.7)', margin: '12px 0' }} />
              <div style={{ borderRadius: '16px', border: '1px solid rgba(255,255,255,0.25)', background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(24px)', padding: '12px 16px', boxShadow: '0 14px 32px rgba(0,0,0,0.35)', boxSizing: 'border-box' }}>
                <p style={{ fontSize: '12px', lineHeight: '1.42', color: 'rgba(255,255,255,0.95)', margin: '0', ...lineClamp(6) }}>{safeSummary}</p>
              </div>
            </div>

            <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: '12%', background: 'linear-gradient(to right, rgba(252,211,77,0.95), rgba(254,240,138,0.9), rgba(240,171,252,0.9))', color: '#1f1300', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px', fontSize: '10px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.12em', boxSizing: 'border-box' }}>
              <span>{footerLeft}</span>
              <span>{footerRight}</span>
            </div>
          </div>
        </div>
      );
    }

    if (selectedTemplateId === 'premium-card-stack') {
      return (
        <div style={{ width: '100%', height: '100%', position: 'relative', background: 'linear-gradient(to bottom, #101629, #060912)', padding: '28px', boxSizing: 'border-box' }}>
          <div style={{ position: 'absolute', left: '40px', right: '40px', top: '40px', bottom: '40px', borderRadius: '26px', background: 'linear-gradient(to bottom right, rgba(129,140,248,0.25), rgba(103,232,249,0.2))' }} />
          <div style={{ position: 'absolute', left: '32px', right: '32px', top: '32px', bottom: '32px', borderRadius: '28px', background: 'linear-gradient(to bottom right, rgba(51,65,85,0.35), rgba(67,56,202,0.25))' }} />
          <div style={{ position: 'relative', width: '100%', height: '100%', borderRadius: '26px', border: '1px solid rgba(255,255,255,0.2)', background: '#0d1324', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', overflow: 'hidden', display: 'flex', flexDirection: 'column', boxSizing: 'border-box' }}>
            <div style={{ height: '50%' }}>{imageNode}</div>
            <div style={{ padding: '20px', boxSizing: 'border-box' }}>
              <h2 style={{ fontSize: '16px', lineHeight: '1.26', fontWeight: '800', color: '#ffffff', margin: '0', ...lineClamp(4) }}>{safeTitle}</h2>
              <div style={{ width: '100%', height: '2px', background: 'linear-gradient(to right, rgba(253,230,138,0.7), rgba(255,255,255,0.15))', margin: '12px 0' }} />
              <p style={{ fontSize: '12px', lineHeight: '1.38', color: '#f1f5f9', margin: '0', ...lineClamp(6) }}>{safeSummary}</p>
            </div>
          </div>
        </div>
      );
    }

    if (selectedTemplateId === 'breaking-news-alert') {
      return (
        <div style={{ width: '100%', height: '100%', background: '#070b14', color: '#ffffff', padding: '16px', boxSizing: 'border-box' }}>
          <div style={{ width: '100%', height: '100%', borderRadius: '26px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 24px 50px rgba(0,0,0,0.45)', background: '#0b1020', display: 'flex', flexDirection: 'column', boxSizing: 'border-box' }}>
            <div style={{ position: 'relative', height: '48%' }}>
              {imageNode}
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.45), transparent)' }} />
              <div style={{ position: 'absolute', top: '16px', left: '16px', padding: '4px 12px', borderRadius: '9999px', background: '#dc2626', color: '#ffffff', fontSize: '10px', fontWeight: '800', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                {templateLabel}
              </div>
            </div>

            <div style={{ height: '40%', padding: '16px 20px 8px 20px', display: 'flex', flexDirection: 'column', boxSizing: 'border-box' }}>
              <h2 style={{ fontSize: '18px', lineHeight: '1.2', fontWeight: '800', letterSpacing: '-0.02em', color: '#ffffff', margin: '0', ...lineClamp(4) }}>{safeTitle}</h2>
              <p style={{ fontSize: '11px', color: '#cbd5e1', margin: '4px 0 0 0', ...lineClamp(1) }}>{templateSubLabel}</p>
              <div style={{ width: '100%', height: '1px', background: 'rgba(255,255,255,0.2)', margin: '12px 0' }} />
              <p style={{ fontSize: '12px', lineHeight: '1.38', color: '#f1f5f9', margin: '0', ...lineClamp(6) }}>{safeSummary}</p>
            </div>

            <div style={{ height: '6%', background: 'linear-gradient(to right, #dc2626, #ef4444)', color: '#ffffff', fontSize: '10px', fontWeight: '800', letterSpacing: '0.16em', textTransform: 'uppercase', display: 'flex', alignItems: 'center', padding: '0 20px', boxSizing: 'border-box' }}>
              News Alert
            </div>
            <div style={{ height: '6%', background: '#050910', fontSize: '10px', color: '#cbd5e1', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px', textTransform: 'uppercase', letterSpacing: '0.08em', boxSizing: 'border-box' }}>
              <span>{footerLeft}</span>
              <span>{footerRight}</span>
            </div>
          </div>
        </div>
      );
    }

    if (selectedTemplateId === 'premium-magazine-alert') {
      return (
        <div style={{ width: '100%', height: '100%', background: 'linear-gradient(to bottom, #11131a, #0b0c11)', padding: '20px', boxSizing: 'border-box' }}>
          <div style={{ width: '100%', height: '100%', borderRadius: '28px', overflow: 'hidden', background: '#141821', border: '1px solid rgba(211,183,131,0.35)', boxShadow: '0 28px 60px rgba(0,0,0,0.4)', display: 'flex', flexDirection: 'column', boxSizing: 'border-box' }}>
            <div style={{ position: 'relative', height: '48%' }}>
              {imageNode}
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(20,24,33,0.85), rgba(20,24,33,0.25), transparent)' }} />
              <div style={{ position: 'absolute', top: '16px', left: '16px', padding: '4px 12px', borderRadius: '6px', background: '#d3b783', color: '#1a1a1a', fontSize: '10px', fontWeight: 'bold', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                {templateLabel}
              </div>
            </div>

            <div style={{ height: '40%', padding: '16px 24px', color: '#f5efe4', boxSizing: 'border-box' }}>
              <h2 style={{ fontSize: '18px', lineHeight: '1.24', fontWeight: '600', letterSpacing: '-0.02em', margin: '0', ...lineClamp(4) }}>{safeTitle}</h2>
              <p style={{ fontSize: '11px', color: '#d8c9aa', margin: '4px 0 0 0', ...lineClamp(1) }}>{templateSubLabel}</p>
              <div style={{ width: '100%', height: '1px', background: 'rgba(211,183,131,0.45)', margin: '12px 0' }} />
              <div style={{ borderRadius: '12px', border: '1px solid rgba(211,183,131,0.25)', background: '#1a1f2b', padding: '8px 12px', boxSizing: 'border-box' }}>
                <p style={{ fontSize: '12px', lineHeight: '1.4', color: '#f2ecdf', margin: '0', ...lineClamp(6) }}>{safeSummary}</p>
              </div>
            </div>

            <div style={{ height: '6%', background: 'linear-gradient(to right, #d3b783, #f0ddba)', color: '#1c1c1c', fontSize: '10px', fontWeight: '800', letterSpacing: '0.14em', textTransform: 'uppercase', display: 'flex', alignItems: 'center', padding: '0 24px', boxSizing: 'border-box' }}>
              Premium Alert
            </div>
            <div style={{ height: '6%', background: '#0f1219', fontSize: '10px', color: '#d0c3a8', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px', textTransform: 'uppercase', letterSpacing: '0.08em', boxSizing: 'border-box' }}>
              <span>{footerLeft}</span>
              <span>{footerRight}</span>
            </div>
          </div>
        </div>
      );
    }

    if (selectedTemplateId === 'spotlight-focus') {
      return (
        <div style={{ width: '100%', height: '100%', position: 'relative', background: '#05070d', padding: '20px', overflow: 'hidden', boxSizing: 'border-box' }}>
          <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at 50% 22%, rgba(56,189,248,0.35), rgba(5,7,13,0.96) 45%)' }} />
          <div style={{ position: 'absolute', left: '40px', right: '40px', top: '32px', height: '112px', borderRadius: '50%', background: 'rgba(103,232,249,0.2)', filter: 'blur(64px)' }} />
          <div style={{ position: 'relative', width: '100%', height: '100%', borderRadius: '28px', border: '1px solid rgba(165,243,252,0.2)', background: '#0a0f1d', boxShadow: '0 25px 60px rgba(0,0,0,0.55)', overflow: 'hidden', display: 'flex', flexDirection: 'column', boxSizing: 'border-box' }}>
            <div style={{ position: 'relative', height: '48%' }}>
              {imageNode}
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(10,15,29,0.65), transparent)' }} />
              <div style={{ position: 'absolute', top: '16px', left: '16px', padding: '4px 12px', borderRadius: '9999px', background: '#22d3ee', color: '#042634', fontSize: '10px', fontWeight: '800', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                {templateLabel}
              </div>
            </div>
            <div style={{ height: '40%', padding: '16px 20px', boxSizing: 'border-box' }}>
              <h2 style={{ fontSize: '20px', lineHeight: '1.18', fontWeight: '800', letterSpacing: '-0.02em', color: '#ffffff', margin: '0', ...lineClamp(4) }}>{safeTitle}</h2>
              <div style={{ marginTop: '12px', borderRadius: '12px', border: '1px solid rgba(103,232,249,0.3)', background: 'rgba(103,232,249,0.08)', padding: '8px 12px', boxSizing: 'border-box' }}>
                <p style={{ fontSize: '12px', lineHeight: '1.4', color: '#ecfeff', margin: '0', ...lineClamp(6) }}>{safeSummary}</p>
              </div>
            </div>
            <div style={{ height: '6%', background: 'linear-gradient(to right, #22d3ee, #3b82f6)', color: '#031923', fontSize: '10px', fontWeight: '900', letterSpacing: '0.16em', textTransform: 'uppercase', display: 'flex', alignItems: 'center', padding: '0 20px', boxSizing: 'border-box' }}>
              Trending Now
            </div>
            <div style={{ height: '6%', background: '#070b16', fontSize: '10px', color: 'rgba(207,250,254,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px', textTransform: 'uppercase', letterSpacing: '0.08em', boxSizing: 'border-box' }}>
              <span>{footerLeft}</span>
              <span>{footerRight}</span>
            </div>
          </div>
        </div>
      );
    }

    if (selectedTemplateId === 'cinematic-story-card') {
      return (
        <div style={{ width: '100%', height: '100%', background: '#07090f', padding: '16px', boxSizing: 'border-box' }}>
          <div style={{ width: '100%', height: '100%', borderRadius: '28px', overflow: 'hidden', position: 'relative', boxShadow: '0 30px 70px rgba(0,0,0,0.55)', boxSizing: 'border-box' }}>
            <div style={{ position: 'absolute', inset: 0 }}>
              {imageNode}
            </div>
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, #000000, rgba(0,0,0,0.55), transparent)' }} />
            <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at 78% 25%, rgba(251,191,36,0.25), transparent 42%)' }} />

            <div style={{ position: 'absolute', top: '16px', left: '16px', padding: '4px 12px', borderRadius: '6px', background: 'rgba(255,255,255,0.18)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.3)', color: '#ffffff', fontSize: '10px', fontWeight: 'bold', letterSpacing: '0.11em', textTransform: 'uppercase' }}>
              {templateLabel}
            </div>

            <div style={{ position: 'absolute', left: '20px', right: '20px', top: '42%' }}>
              <h2 style={{ fontSize: '22px', lineHeight: '1.12', fontWeight: '800', color: '#ffffff', textShadow: '0 2px 10px rgba(0,0,0,0.7)', margin: '0', ...lineClamp(4) }}>
                {safeTitle}
              </h2>
              <div style={{ width: '80px', height: '3px', background: '#fcd34d', boxShadow: '0 0 12px rgba(251,191,36,0.75)', margin: '12px 0', borderRadius: '9999px' }} />
              <div style={{ borderRadius: '16px', border: '1px solid rgba(255,255,255,0.25)', background: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(24px)', padding: '12px 16px', boxSizing: 'border-box' }}>
                <p style={{ fontSize: '12px', lineHeight: '1.4', color: 'rgba(255,255,255,0.95)', margin: '0', ...lineClamp(6) }}>{safeSummary}</p>
              </div>
            </div>

            <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: '12%', background: 'linear-gradient(to right, rgba(252,211,77,0.9), rgba(253,186,116,0.9))', color: '#1f1300', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px', fontSize: '10px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.12em', boxSizing: 'border-box' }}>
              <span>{footerLeft}</span>
              <span>{footerRight}</span>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div style={{ width: '100%', height: '100%', borderRadius: '28px', overflow: 'hidden', background: '#0a0f1b', color: '#ffffff', display: 'flex', flexDirection: 'column', boxSizing: 'border-box' }}>
        <div style={{ position: 'relative', height: '52%', background: '#1f2937', borderRadius: '20px', margin: '16px 16px 0 16px', overflow: 'hidden' }}>{imageNode}</div>
        <div style={{ height: '48%', padding: '20px 28px', background: '#060912', display: 'flex', flexDirection: 'column', boxSizing: 'border-box' }}>
          <h2 style={{ fontSize: '16px', lineHeight: '1.25', fontWeight: 'bold', letterSpacing: '-0.02em', margin: '0', ...lineClamp(4) }}>{safeTitle}</h2>
          <div style={{ width: '100%', height: '2px', background: 'rgba(255,255,255,0.12)', margin: '16px 0' }} />
          <p style={{ fontSize: '12px', lineHeight: '1.35', color: '#f3f4f6', margin: '0', ...lineClamp(6) }}>{safeSummary}</p>
        </div>
      </div>
    );
  };

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

              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Template Style</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {TEMPLATES.map((template) => {
                    const isActive = selectedTemplateId === template.template_id;
                    return (
                      <button
                        key={template.template_id}
                        type="button"
                        onClick={() => setSelectedTemplateId(template.template_id)}
                        className={`text-left rounded-xl border px-3 py-2 transition-all ${isActive
                          ? 'border-indigo-500 bg-indigo-50 text-indigo-900 dark:bg-indigo-950/40 dark:text-indigo-200'
                          : 'border-gray-200 bg-white hover:bg-gray-50 text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800'
                          }`}
                      >
                        <div className="text-sm font-semibold">{template.template_name}</div>
                        <div className="text-xs opacity-80">{template.design_style}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input value={templateLabel} onChange={(e) => setTemplateLabel(e.target.value)} className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-sm" placeholder="Badge Label" />
                <input value={templateSubLabel} onChange={(e) => setTemplateSubLabel(e.target.value)} className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-sm" placeholder="Sub Label" />
                <input value={footerLeft} onChange={(e) => setFooterLeft(e.target.value)} className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-sm" placeholder="Footer Left" />
                <input value={footerRight} onChange={(e) => setFooterRight(e.target.value)} className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-sm" placeholder="Footer Right" />
              </div>
            </div>
          </div>

          <div className="lg:col-span-7 flex flex-col">
            <div id="capture-wrapper" style={{ padding: '32px', background: 'transparent' }} className="w-full flex justify-center">
              <div
                id="template-preview-container"
                className="bg-gray-200 dark:bg-gray-800 rounded-3xl overflow-hidden shadow-2xl flex-1 flex items-center justify-center relative aspect-square w-full max-w-lg border-8 border-white dark:border-gray-900"
              >
                {renderTemplatePreview()}
              </div>
            </div>

            <div className="mt-4 bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm max-w-lg mx-auto w-full text-sm">
              <div className="font-semibold text-gray-900 dark:text-gray-100">{selectedTemplate.template_name}</div>
              <div className="text-gray-600 dark:text-gray-300 mt-1">{selectedTemplate.layout_description}</div>
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
