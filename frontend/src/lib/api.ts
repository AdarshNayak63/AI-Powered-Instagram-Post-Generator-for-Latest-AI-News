import axios from 'axios';

const resolveApiUrl = () => {
  if (process.env.NEXT_PUBLIC_API_URL) return process.env.NEXT_PUBLIC_API_URL;

  // In browser, reuse the current host so LAN access works too.
  if (typeof window !== 'undefined') {
    return `${window.location.protocol}//${window.location.hostname}:5001`;
  }

  return 'http://localhost:5001';
};

export const API_URL = resolveApiUrl();
const API_PROXY_BASE = '/api/proxy';

export const api = axios.create({
  baseURL: API_PROXY_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const fetchArticles = async (days: number = 7) => {
  const response = await api.get(`/api/articles?days=${days}`);
  return response.data;
};

export const triggerScrape = async (days: number = 1) => {
  const response = await api.post(`/api/scrape?days=${days}`);
  return response.data;
};

export const generatePost = async (articleId: number) => {
  const response = await api.post('/api/generate', { article_id: articleId });
  return response.data;
};

export const getTemplates = async () => {
  const response = await api.get('/api/templates');
  return response.data;
};

export const generateImage = async (postId: number, template: string) => {
  // Assuming a new route to change templates and regenerate image
  const response = await api.post('/api/image', { post_id: postId, template: template });
  return response.data;
};

export type SendEmailPayload = {
  instagram_hook: string;
  description: string;
  template_used: string;
  template_html: string;
  template_image_base64?: string;
};

export const sendEmail = async (postId: number, email: string, payload: SendEmailPayload) => {
  const response = await api.post('/api/email', { post_id: postId, email_to: email, ...payload });
  return response.data;
};
