'use client';

import { useState } from 'react';
import { useChat } from '@ai-sdk/react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/cn';

export type InitialMessage = {
  id: string;
  role: 'user' | 'assistant';
  text: string;
};

export function ChatClient({ initial }: { initial: InitialMessage[] }) {
  const t = useTranslations('chat');
  const [input, setInput] = useState('');
  const { messages, sendMessage, status } = useChat({
    messages: initial.map((m) => ({
      id: m.id,
      role: m.role,
      parts: [{ type: 'text' as const, text: m.text }],
    })),
  });

  const busy = status === 'submitted' || status === 'streaming';

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || busy) return;
    sendMessage({ text });
    setInput('');
  }

  return (
    <div className="flex min-h-[calc(100dvh-6rem)] flex-col p-4 md:mx-auto md:max-w-2xl md:p-8">
      <h2 className="mb-3 font-display text-[1.45rem] md:text-[1.7rem]">
        {t('title')}
      </h2>

      <div className="flex flex-1 flex-col gap-2.5 overflow-y-auto pb-3">
        {messages.length === 0 && (
          <p className="text-[0.9rem] text-muted">{t('empty')}</p>
        )}
        {messages.map((m) => (
          <div key={m.id} className="flex flex-col gap-1.5">
            {(m.parts as Array<{ type: string; text?: string }>).map(
              (part, i) => {
                if (part.type === 'text') {
                  return (
                    <div
                      key={i}
                      className={cn(
                        'max-w-[85%] rounded-2xl px-3 py-2.5 text-[0.92rem]',
                        m.role === 'user'
                          ? 'self-end rounded-br-md bg-accent text-on-accent'
                          : 'self-start rounded-bl-md border border-line bg-surface',
                      )}
                    >
                      {part.text}
                    </div>
                  );
                }
                // Parti tool: mostra una "chip" con il nome del tool.
                if (part.type.startsWith('tool-')) {
                  return (
                    <div
                      key={i}
                      className="flex items-center gap-2 self-start rounded-[10px] border border-dashed border-line bg-surface2 px-2.5 py-1.5 text-[0.78rem] text-muted"
                    >
                      🔧
                      <b className="font-mono text-[0.75rem] text-ink">
                        {part.type.replace(/^tool-/, '')}
                      </b>
                    </div>
                  );
                }
                return null;
              },
            )}
          </div>
        ))}
      </div>

      <form onSubmit={submit} className="mt-2 flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={t('placeholder')}
          aria-label={t('placeholder')}
          className="flex-1 rounded-full border border-line bg-surface px-4 py-2.5"
        />
        <button
          type="submit"
          disabled={busy || !input.trim()}
          aria-label={t('send')}
          className="h-11 w-11 flex-none rounded-full bg-accent text-on-accent disabled:opacity-50"
        >
          ➤
        </button>
      </form>
    </div>
  );
}
