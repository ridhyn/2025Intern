export type ChatMessage = {
	role: 'user' | 'assistant' | 'system';
	content: string;
};

const DEFAULT_API_BASE_URL = 'http://localhost:3001';

function getApiBaseUrl(): string {
	// Prefer Expo public env if defined at bundle time; fallback to localhost
	const fromEnv = (process.env as any)?.EXPO_PUBLIC_API_BASE_URL as string | undefined;
	return fromEnv && fromEnv.length > 0 ? fromEnv : DEFAULT_API_BASE_URL;
}

export async function chat(options: {
	prompt?: string;
	messages?: ChatMessage[];
	maxTokens?: number;
	temperature?: number;
	model?: string;
}): Promise<{ ok: boolean; text?: string; error?: string }>
{
	const baseUrl = getApiBaseUrl();
	const url = `${baseUrl}/api/chat`;

	const body: any = {};
	if (options.prompt) body.prompt = options.prompt;
	if (options.messages) body.messages = options.messages;
	if (typeof options.maxTokens === 'number') body.max_tokens = options.maxTokens;
	if (typeof options.temperature === 'number') body.temperature = options.temperature;
	if (options.model) body.model = options.model;

	const res = await fetch(url, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(body),
	});

	const data = await res.json().catch(() => ({ ok: false, error: 'Invalid JSON' }));
	return data;
}

export async function ping(): Promise<{ ok: boolean; text?: string; error?: string }>
{
	const baseUrl = getApiBaseUrl();
	const url = `${baseUrl}/api/ping`;
	const res = await fetch(url);
	return res.json();
}


