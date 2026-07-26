import {
  convertToModelMessages,
  stepCountIs,
  streamText,
  type UIMessage,
} from 'ai';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { getDb } from '@/server/db';
import { getSettings } from '@/server/services/settings';
import { appendMessage, pruneMessages } from '@/server/services/chat';
import { buildChatSystem, buildChatTools } from '@/server/ai/chatToolsAi';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function lastUserText(messages: UIMessage[]): string {
  const last = messages[messages.length - 1];
  if (!last || last.role !== 'user') return '';
  return last.parts
    .filter((p): p is { type: 'text'; text: string } => p.type === 'text')
    .map((p) => p.text)
    .join(' ')
    .trim();
}

export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json();
  const db = getDb();
  const settings = getSettings(db);

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return Response.json({ error: 'no_key' }, { status: 400 });
  }

  // Persisti il messaggio utente in arrivo.
  const userText = lastUserText(messages);
  if (userText) {
    appendMessage(db, 'user', userText);
    pruneMessages(db, 100);
  }

  const openrouter = createOpenRouter({ apiKey });
  const result = streamText({
    model: openrouter.chat(settings.aiModel),
    system: buildChatSystem(db),
    messages: await convertToModelMessages(messages),
    tools: buildChatTools(db),
    stopWhen: stepCountIs(6),
    onFinish: ({ text }) => {
      if (text.trim()) {
        appendMessage(db, 'assistant', text.trim());
        pruneMessages(db, 100);
      }
    },
  });

  return result.toUIMessageStreamResponse();
}
