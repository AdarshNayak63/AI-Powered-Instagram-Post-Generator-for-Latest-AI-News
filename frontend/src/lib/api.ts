import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const fetchArticles = async (days: number = 1) => {
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

export const sendEmail = async (postId: number, email: string) => {
  const response = await api.post('/api/email', { post_id: postId, email_to: email });
  return response.data;
};
