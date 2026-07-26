import { getDb } from '@/server/db';
import { listMessages } from '@/server/services/chat';
import { ChatClient, type InitialMessage } from './chat-client';

export default function ChatPage() {
  const db = getDb();
  const initial: InitialMessage[] = listMessages(db).map((m) => ({
    id: String(m.id),
    role: m.role,
    text: m.content,
  }));
  return <ChatClient initial={initial} />;
}
