import { useRef } from 'react';
import { Sparkles, ShieldCheck } from 'lucide-react';
import { AIAssistViewComponent } from '@syncfusion/ej2-react-interactive-chat';
import type { PromptRequestEventArgs } from '@syncfusion/ej2-interactive-chat';
import type { Dataset } from '../domain/types.ts';
import { SampleAiProvider } from '../adapters/sampleAiProvider.ts';

const provider = new SampleAiProvider();

export function Assistant({ dataset }: { dataset: Dataset }) {
  const assist = useRef<AIAssistViewComponent>(null);
  const controller = useRef<AbortController | null>(null);

  async function answer(args: PromptRequestEventArgs) {
    controller.current?.abort();
    const current = new AbortController();
    controller.current = current;
    try {
      const result = await provider.answer(args.prompt ?? '', dataset, current.signal);
      const referenceLine = result.references.length ? `\n\nReferenced: ${result.references.map(r => r.label).join(', ')}` : '';
      assist.current?.addPromptResponse(result.text + referenceLine);
    } catch (error) {
      if (!current.signal.aborted) assist.current?.addPromptResponse(error instanceof Error ? error.message : 'The sample response could not be created.');
    }
  }

  return <section className="panel scope-box">
    <div className="inline"><Sparkles size={28} /><span className="scope-label">Sample responses</span></div>
    <h2>AI assistant</h2>
    <p className="muted">Grounded only in the current session's live inventory and order data — not a live model, and it never changes data on its own.</p>
    <AIAssistViewComponent ref={assist} height="520px"
      promptSuggestions={['What is at risk today?', 'What should I reorder?', 'Which orders are behind schedule?']}
      promptSuggestionsHeader="Try a sample question"
      promptRequest={answer} />
    <div className="notice">
      <ShieldCheck size={18} aria-hidden="true" />
      <p>Sample provider through a swappable port. No external model call, browser-exposed model key, or automatic stock/order change — apply any suggestion through Inventory or Order Fulfillment's own controls.</p>
    </div>
  </section>;
}
