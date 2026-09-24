import type { Dataset } from '../domain/types.ts';

export interface AiReference { kind: 'Order' | 'SKU'; id: string; label: string; }
export interface AiAnswer { text: string; references: AiReference[]; }

// The only integration point for AI: a customer swaps this for a real
// provider (Azure OpenAI, Gemini — both shown as supported integration
// shapes in the Syncfusion AI AssistView docs) with server-held credentials.
// No UI change is required, and no client-exposed key belongs here.
export interface AiProviderPort {
  answer(question: string, dataset: Dataset, signal: AbortSignal): Promise<AiAnswer>;
}
