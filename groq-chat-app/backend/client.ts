export type ChatMessage = {
  role: 'user' | 'assistant' | 'system';
  content: string;
};

export type ChatOptions = {
  prompt?: string;
  messages?: ChatMessage[];
  maxTokens?: number;
  temperature?: number;
  model?: string;
};

export type ApiResponse = {
  ok: boolean;
  text?: string;
  error?: string;
};

const DEFAULT_API_BASE_URL = 'http://localhost:3001';

const getApiBaseUrl = (): string => {
  const fromEnv = (process.env as any)?.EXPO_PUBLIC_API_BASE_URL as string | undefined;
  return fromEnv && fromEnv.length > 0 ? fromEnv : DEFAULT_API_BASE_URL;
};

const buildRequestBody = (options: ChatOptions): Record<string, any> => {
  const body: Record<string, any> = {};
  
  if (options.prompt) body.prompt = options.prompt;
  if (options.messages) body.messages = options.messages;
  if (typeof options.maxTokens === 'number') body.max_tokens = options.maxTokens;
  if (typeof options.temperature === 'number') body.temperature = options.temperature;
  if (options.model) body.model = options.model;
  
  return body;
};

export const chat = async (options: ChatOptions): Promise<ApiResponse> => {
  try {
    const url = `${getApiBaseUrl()}/api/chat`;
    const body = buildRequestBody(options);
    
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    
    return await response.json();
  } catch (error) {
    return { ok: false, error: 'Network error' };
  }
};

export const ping = async (): Promise<ApiResponse> => {
  try {
    const url = `${getApiBaseUrl()}/api/ping`;
    const response = await fetch(url);
    return await response.json();
  } catch (error) {
    return { ok: false, error: 'Network error' };
  }
};


