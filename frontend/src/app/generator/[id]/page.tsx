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
  const [footerLeft, setFooterLeft] = useState('@futurewire');
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
      await api.put(`/api/posts/${postId}`, {
        generated_title: title,
        generated_caption: caption,
        template_used: selectedTemplateId,
      });
      await sendEmail(postId, fixedRecipient, {
        instagram_hook: displayTitle,
        description: displaySummary,
        template_used: selectedTemplateId,
        template_html: templateHtml,
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
    const safeTitle = escapeHtml(displayTitle);
    const safeSummary = escapeHtml(displaySummary);
    const safeImage = escapeHtml(displayImage || '');
    const safeLabel = escapeHtml(templateLabel);
    const safeSubLabel = escapeHtml(templateSubLabel);
    const safeFooterLeft = escapeHtml(footerLeft);
    const safeFooterRight = escapeHtml(footerRight);

    const themeMap: Record<string, { bg: string; panel: string; border: string; accent: string; text: string }> = {
      'spotlight-focus': { bg: '#05070d', panel: '#0a0f1d', border: 'rgba(34,211,238,0.35)', accent: '#22d3ee', text: '#ecfeff' },
      'breaking-news-alert': { bg: '#070b14', panel: '#0b1020', border: 'rgba(255,255,255,0.14)', accent: '#ef4444', text: '#f8fafc' },
      'premium-magazine-alert': { bg: '#11131a', panel: '#141821', border: 'rgba(211,183,131,0.4)', accent: '#d3b783', text: '#f5efe4' },
      'neon-tech': { bg: '#050814', panel: '#0b1226', border: 'rgba(34,211,238,0.45)', accent: '#22d3ee', text: '#e0f2fe' },
    };
    const theme = themeMap[selectedTemplateId] || { bg: '#0a0f1b', panel: '#111827', border: 'rgba(255,255,255,0.2)', accent: '#6366f1', text: '#f9fafb' };

    return `
<div style="max-width:420px;margin:0 auto;background:${theme.bg};padding:16px;border-radius:24px;font-family:Arial,sans-serif;">
  <div style="background:${theme.panel};border:1px solid ${theme.border};border-radius:20px;overflow:hidden;color:${theme.text};">
    <div style="position:relative;height:220px;background:linear-gradient(135deg,#334155,#0f172a);">
      ${safeImage ? `<img src="${safeImage}" alt="Template image" style="width:100%;height:100%;object-fit:cover;display:block;" />` : ''}
      <div style="position:absolute;top:12px;left:12px;background:${theme.accent};color:#082f49;padding:6px 10px;border-radius:999px;font-size:11px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;">${safeLabel}</div>
    </div>
    <div style="padding:14px 14px 10px 14px;">
      <h2 style="margin:0;font-size:20px;line-height:1.2;font-weight:800;color:${theme.text};">${safeTitle}</h2>
      <p style="margin:6px 0 0 0;font-size:12px;opacity:.88;text-transform:uppercase;letter-spacing:.08em;">${safeSubLabel}</p>
      <div style="height:1px;background:rgba(255,255,255,0.28);margin:10px 0;"></div>
      <p style="margin:0;font-size:13px;line-height:1.45;color:${theme.text};white-space:pre-wrap;">${safeSummary}</p>
    </div>
    <div style="display:flex;justify-content:space-between;gap:8px;padding:10px 14px;background:linear-gradient(90deg,${theme.accent},#60a5fa);color:#082f49;font-size:10px;font-weight:800;letter-spacing:.09em;text-transform:uppercase;">
      <span>${safeFooterLeft}</span>
      <span>${safeFooterRight}</span>
    </div>
  </div>
</div>`;
  };

  const renderTemplatePreview = () => {
    const imageNode = displayImage ? (
      <img src={displayImage} alt={post?.article?.title || 'Article'} className="w-full h-full object-cover" />
    ) : (
      <div className="w-full h-full bg-gradient-to-br from-slate-500 to-slate-800" />
    );

    if (selectedTemplateId === 'gradient-glassmorphism') {
      return (
        <div className="w-full h-full relative bg-gradient-to-br from-cyan-500 via-blue-600 to-fuchsia-600 p-6">
          <div className="absolute -top-10 -right-10 w-44 h-44 rounded-full bg-white/25 blur-2xl" />
          <div className="absolute -bottom-10 -left-10 w-44 h-44 rounded-full bg-purple-300/25 blur-2xl" />
          <div className="relative w-full h-full rounded-[26px] border border-white/35 bg-white/15 backdrop-blur-xl p-4 flex flex-col shadow-2xl">
            <div className="h-[52%] rounded-2xl overflow-hidden border border-white/30">{imageNode}</div>
            <h2 className="mt-4 text-[17px] leading-[1.25] font-bold text-white line-clamp-4">{displayTitle}</h2>
            <div className="w-full h-[2px] bg-white/35 my-3" />
            <p className="text-[12px] leading-[1.38] text-white/95 line-clamp-6">{displaySummary}</p>
          </div>
        </div>
      );
    }

    if (selectedTemplateId === 'magazine-editorial') {
      return (
        <div className="w-full h-full bg-[#f6f1e9] text-[#222222] p-5 flex flex-col">
          <div className="text-[10px] tracking-[0.24em] uppercase font-semibold text-[#666] mb-2">Tech Brief</div>
          <div className="h-[49%] rounded-2xl overflow-hidden">{imageNode}</div>
          <h2 className="mt-4 text-[18px] leading-[1.24] font-semibold font-serif line-clamp-4">{displayTitle}</h2>
          <div className="w-full h-[1px] bg-[#222]/25 my-3" />
          <p className="text-[12px] leading-[1.42] text-[#2e2e2e] font-sans line-clamp-6">{displaySummary}</p>
        </div>
      );
    }

    if (selectedTemplateId === 'neon-tech') {
      return (
        <div className="w-full h-full bg-[#050814] p-4">
          <div className="w-full h-full rounded-[24px] border border-cyan-300/70 shadow-[0_0_24px_rgba(34,211,238,0.28)] bg-gradient-to-b from-[#0b1226] to-[#040813] overflow-hidden flex flex-col">
            <div className="h-[50%] relative">
              {imageNode}
              <div className="absolute inset-0 ring-1 ring-cyan-300/40" />
            </div>
            <div className="p-5 flex-1">
              <h2 className="text-[16px] leading-[1.24] font-extrabold text-cyan-100 line-clamp-4">{displayTitle}</h2>
              <div className="w-full h-[2px] bg-gradient-to-r from-cyan-300 to-fuchsia-400 my-3 shadow-[0_0_12px_rgba(236,72,153,0.45)]" />
              <p className="text-[12px] leading-[1.38] text-cyan-50/95 line-clamp-6">{displaySummary}</p>
            </div>
          </div>
        </div>
      );
    }

    if (selectedTemplateId === 'template_cinematic_story_pro') {
      return (
        <div className="w-full h-full relative bg-[#06060a] p-4 overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_18%,rgba(234,179,8,0.22),transparent_34%),radial-gradient(circle_at_20%_82%,rgba(168,85,247,0.2),transparent_36%)]" />
          <div className="absolute inset-0 bg-gradient-to-b from-[#090912] via-[#080913] to-[#040406]" />
          <div className="relative w-full h-full rounded-[30px] overflow-hidden border border-amber-200/20 shadow-[0_30px_70px_rgba(0,0,0,0.65)]">
            <div className="absolute inset-0">
              {imageNode}
              <div className="absolute inset-0 bg-gradient-to-t from-[#050507] via-[#090915]/65 to-transparent" />
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_75%_20%,rgba(250,204,21,0.2),transparent_35%)]" />
              <div className="absolute inset-0 bg-black/25" />
            </div>

              <div className="absolute top-4 left-4 px-3 py-1 rounded-md border border-amber-200/40 bg-black/35 backdrop-blur-md text-amber-100 text-[10px] font-bold tracking-[0.12em] uppercase">
              {templateLabel}
              </div>

            <div className="absolute left-5 right-5 top-[40%]">
              <h2 className="text-[23px] leading-[1.1] font-extrabold tracking-tight text-white drop-shadow-[0_4px_16px_rgba(0,0,0,0.8)] line-clamp-4">
                {displayTitle}
              </h2>
              <p className="text-[11px] mt-1 text-amber-100/85 uppercase tracking-[0.12em] line-clamp-1">{templateSubLabel}</p>
              <div className="w-24 h-[3px] rounded-full bg-gradient-to-r from-amber-300 to-fuchsia-300 shadow-[0_0_14px_rgba(251,191,36,0.7)] mt-3 mb-3" />
              <div className="rounded-2xl border border-white/25 bg-white/10 backdrop-blur-xl px-4 py-3 shadow-[0_14px_32px_rgba(0,0,0,0.35)]">
                <p className="text-[12px] leading-[1.42] text-white/95 line-clamp-6">{displaySummary}</p>
              </div>
            </div>

            <div className="absolute left-0 right-0 bottom-0 h-[12%] bg-gradient-to-r from-amber-300/95 via-yellow-200/90 to-fuchsia-300/90 text-[#1f1300] flex items-center justify-between px-5 text-[10px] font-extrabold uppercase tracking-[0.12em]">
              <span>{footerLeft}</span>
              <span>{footerRight}</span>
            </div>
          </div>
        </div>
      );
    }

    if (selectedTemplateId === 'premium-card-stack') {
      return (
        <div className="w-full h-full relative bg-gradient-to-b from-[#101629] to-[#060912] p-7">
          <div className="absolute inset-x-10 top-10 bottom-10 rounded-[26px] bg-gradient-to-br from-indigo-400/25 to-cyan-300/20" />
          <div className="absolute inset-x-8 top-8 bottom-8 rounded-[28px] bg-gradient-to-br from-slate-700/35 to-indigo-700/25" />
          <div className="relative w-full h-full rounded-[26px] border border-white/20 bg-[#0d1324] shadow-2xl overflow-hidden flex flex-col">
            <div className="h-[50%]">{imageNode}</div>
            <div className="p-5">
              <h2 className="text-[16px] leading-[1.26] font-extrabold text-white line-clamp-4">{displayTitle}</h2>
              <div className="w-full h-[2px] bg-gradient-to-r from-amber-200/70 to-white/15 my-3" />
              <p className="text-[12px] leading-[1.38] text-slate-100 line-clamp-6">{displaySummary}</p>
            </div>
          </div>
        </div>
      );
    }

    if (selectedTemplateId === 'breaking-news-alert') {
      return (
        <div className="w-full h-full bg-[#070b14] text-white p-4">
          <div className="w-full h-full rounded-[26px] overflow-hidden border border-white/10 shadow-[0_24px_50px_rgba(0,0,0,0.45)] bg-[#0b1020] flex flex-col">
            <div className="relative h-[48%]">
              {imageNode}
              <div className="absolute inset-0 bg-gradient-to-t from-black/45 to-transparent" />
              <div className="absolute top-4 left-4 px-3 py-1 rounded-full bg-red-600 text-[10px] font-extrabold tracking-[0.12em] uppercase">
                {templateLabel}
              </div>
            </div>

            <div className="h-[40%] px-5 pt-4 pb-2 flex flex-col">
              <h2 className="text-[18px] leading-[1.2] font-extrabold tracking-tight text-white line-clamp-4">{displayTitle}</h2>
              <p className="text-[11px] text-slate-300 mt-1 line-clamp-1">{templateSubLabel}</p>
              <div className="w-full h-[1px] bg-white/20 mt-3 mb-3" />
              <p className="text-[12px] leading-[1.38] text-slate-100 line-clamp-6">{displaySummary}</p>
            </div>

            <div className="h-[6%] bg-gradient-to-r from-red-600 to-red-500 text-white text-[10px] font-extrabold tracking-[0.16em] uppercase flex items-center px-5">
              News Alert
            </div>
            <div className="h-[6%] bg-[#050910] text-[10px] text-slate-300 flex items-center justify-between px-5 uppercase tracking-[0.08em]">
              <span>{footerLeft}</span>
              <span>{footerRight}</span>
            </div>
          </div>
        </div>
      );
    }

    if (selectedTemplateId === 'premium-magazine-alert') {
      return (
        <div className="w-full h-full bg-gradient-to-b from-[#11131a] to-[#0b0c11] p-5">
          <div className="w-full h-full rounded-[28px] overflow-hidden bg-[#141821] border border-[#d3b783]/35 shadow-[0_28px_60px_rgba(0,0,0,0.4)] flex flex-col">
            <div className="relative h-[48%]">
              {imageNode}
              <div className="absolute inset-0 bg-gradient-to-t from-[#141821]/85 via-[#141821]/25 to-transparent" />
              <div className="absolute top-4 left-4 px-3 py-1 rounded-md bg-[#d3b783] text-[#1a1a1a] text-[10px] font-bold tracking-[0.1em] uppercase">
                {templateLabel}
              </div>
            </div>

            <div className="h-[40%] px-6 py-4 text-[#f5efe4]">
              <h2 className="text-[18px] leading-[1.24] font-semibold tracking-tight line-clamp-4">{displayTitle}</h2>
              <p className="text-[11px] text-[#d8c9aa] mt-1 line-clamp-1">{templateSubLabel}</p>
              <div className="w-full h-[1px] bg-[#d3b783]/45 mt-3 mb-3" />
              <div className="rounded-xl border border-[#d3b783]/25 bg-[#1a1f2b] px-3 py-2">
                <p className="text-[12px] leading-[1.4] text-[#f2ecdf] line-clamp-6">{displaySummary}</p>
              </div>
            </div>

            <div className="h-[6%] bg-gradient-to-r from-[#d3b783] to-[#f0ddba] text-[#1c1c1c] text-[10px] font-extrabold tracking-[0.14em] uppercase flex items-center px-6">
              Premium Alert
            </div>
            <div className="h-[6%] bg-[#0f1219] text-[10px] text-[#d0c3a8] flex items-center justify-between px-6 uppercase tracking-[0.08em]">
              <span>{footerLeft}</span>
              <span>{footerRight}</span>
            </div>
          </div>
        </div>
      );
    }

    if (selectedTemplateId === 'spotlight-focus') {
      return (
        <div className="w-full h-full relative bg-[#05070d] p-5 overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_22%,rgba(56,189,248,0.35),rgba(5,7,13,0.96)_45%)]" />
          <div className="absolute inset-x-10 top-8 h-28 rounded-full bg-cyan-300/20 blur-3xl animate-pulse" />
          <div className="relative w-full h-full rounded-[28px] border border-cyan-200/20 bg-[#0a0f1d] shadow-[0_25px_60px_rgba(0,0,0,0.55)] overflow-hidden flex flex-col">
            <div className="relative h-[48%]">
              {imageNode}
              <div className="absolute inset-0 bg-gradient-to-t from-[#0a0f1d]/65 to-transparent" />
              <div className="absolute top-4 left-4 px-3 py-1 rounded-full bg-cyan-400 text-[#042634] text-[10px] font-extrabold tracking-[0.12em] uppercase">
                {templateLabel}
              </div>
            </div>
            <div className="h-[40%] px-5 py-4">
              <h2 className="text-[20px] leading-[1.18] font-extrabold tracking-tight text-white line-clamp-4">{displayTitle}</h2>
              <div className="mt-3 rounded-xl border border-cyan-300/30 bg-cyan-300/8 px-3 py-2">
                <p className="text-[12px] leading-[1.4] text-cyan-50 line-clamp-6">{displaySummary}</p>
              </div>
            </div>
            <div className="h-[6%] bg-gradient-to-r from-cyan-400 to-blue-500 text-[#031923] text-[10px] font-black tracking-[0.16em] uppercase flex items-center px-5">
              Trending Now
            </div>
            <div className="h-[6%] bg-[#070b16] text-[10px] text-cyan-100/80 flex items-center justify-between px-5 uppercase tracking-[0.08em]">
              <span>{footerLeft}</span>
              <span>{footerRight}</span>
            </div>
          </div>
        </div>
      );
    }

    if (selectedTemplateId === 'cinematic-story-card') {
      return (
        <div className="w-full h-full bg-[#07090f] p-4">
          <div className="w-full h-full rounded-[28px] overflow-hidden relative shadow-[0_30px_70px_rgba(0,0,0,0.55)]">
            <div className="absolute inset-0">
              {imageNode}
            </div>
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/55 to-transparent" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_78%_25%,rgba(251,191,36,0.25),transparent_42%)]" />

              <div className="absolute top-4 left-4 px-3 py-1 rounded-md bg-white/18 backdrop-blur-md border border-white/30 text-white text-[10px] font-bold tracking-[0.11em] uppercase">
              {templateLabel}
              </div>

            <div className="absolute left-5 right-5 top-[42%]">
              <h2 className="text-[22px] leading-[1.12] font-extrabold text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.7)] line-clamp-4">
                {displayTitle}
              </h2>
              <div className="w-20 h-[3px] bg-amber-300 shadow-[0_0_12px_rgba(251,191,36,0.75)] mt-3 mb-3 rounded-full" />
              <div className="rounded-2xl border border-white/25 bg-white/12 backdrop-blur-xl px-4 py-3">
                <p className="text-[12px] leading-[1.4] text-white/95 line-clamp-6">{displaySummary}</p>
              </div>
            </div>

            <div className="absolute left-0 right-0 bottom-0 h-[12%] bg-gradient-to-r from-amber-300/90 to-orange-300/90 text-[#1f1300] flex items-center justify-between px-5 text-[10px] font-extrabold uppercase tracking-[0.12em]">
              <span>{footerLeft}</span>
              <span>{footerRight}</span>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="w-full h-full rounded-[28px] overflow-hidden bg-[#0a0f1b] text-white flex flex-col">
        <div className="relative h-[52%] bg-gray-800 rounded-[20px] m-4 mb-0 overflow-hidden">{imageNode}</div>
        <div className="h-[48%] px-7 py-5 bg-[#060912] flex flex-col">
          <h2 className="text-[16px] leading-[1.25] font-bold tracking-tight line-clamp-4">{displayTitle}</h2>
          <div className="w-full h-[2px] bg-white/12 mt-4 mb-4" />
          <p className="text-[12px] leading-[1.35] text-gray-100 line-clamp-6">{displaySummary}</p>
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
                        className={`text-left rounded-xl border px-3 py-2 transition-all ${
                          isActive
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
            <div className="bg-gray-200 dark:bg-gray-800 rounded-3xl overflow-hidden shadow-2xl flex-1 flex items-center justify-center relative aspect-square w-full max-w-lg mx-auto border-8 border-white dark:border-gray-900">
              {renderTemplatePreview()}
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
