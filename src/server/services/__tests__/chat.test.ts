import { describe, expect, it } from 'vitest';
import { createDb, migrateDb, type Db } from '@/server/db';
import { appendMessage, listMessages, pruneMessages } from '../chat';
import { createProfile } from '../profiles';
import { appendPreference, listPreferenceEvents } from '../learning';

function freshDb(): Db {
  const db = createDb(':memory:');
  migrateDb(db);
  return db;
}

describe('chat service', () => {
  it('appends and lists messages in order', () => {
    const db = freshDb();
    appendMessage(db, 'user', 'ciao');
    appendMessage(db, 'assistant', 'ciao a te');
    const msgs = listMessages(db);
    expect(msgs.map((m) => [m.role, m.content])).toEqual([
      ['user', 'ciao'],
      ['assistant', 'ciao a te'],
    ]);
  });

  it('prunes to the most recent N messages', () => {
    const db = freshDb();
    for (let i = 0; i < 10; i++) appendMessage(db, 'user', `m${i}`);
    pruneMessages(db, 3);
    const msgs = listMessages(db);
    expect(msgs).toHaveLength(3);
    expect(msgs[0].content).toBe('m7');
  });
});

describe('learning service', () => {
  it('appends a preference and logs an event', () => {
    const db = freshDb();
    const p = createProfile(db, { name: 'Sofia', preferences: 'ama la pasta' });
    const updated = appendPreference(db, p.id, 'non ama i funghi');
    expect(updated.preferences).toBe('ama la pasta; non ama i funghi');
    expect(listPreferenceEvents(db)).toHaveLength(1);
    expect(listPreferenceEvents(db)[0].text).toBe('non ama i funghi');
  });

  it('sets the preference when previously empty', () => {
    const db = freshDb();
    const p = createProfile(db, { name: 'Paolo' });
    const updated = appendPreference(db, p.id, 'ama il pesce');
    expect(updated.preferences).toBe('ama il pesce');
  });
});
