import { describe, expect, it } from 'vitest';
import { createDb, migrateDb, type Db } from '@/server/db';
import {
  createProfile,
  deleteProfile,
  listProfiles,
  updateProfile,
} from '../profiles';

function freshDb(): Db {
  const db = createDb(':memory:');
  migrateDb(db);
  return db;
}

describe('profiles service', () => {
  it('creates profiles with defaults and returns them', () => {
    const db = freshDb();
    const p = createProfile(db, { name: 'Paolo' });
    expect(p.id).toBeTypeOf('number');
    expect(p).toMatchObject({
      name: 'Paolo',
      dietaryConstraints: '',
      preferences: '',
      portionFactor: 1,
    });
  });

  it('lists profiles ordered by sortOrder then id', () => {
    const db = freshDb();
    createProfile(db, { name: 'Paolo' });
    createProfile(db, { name: 'Giulia' });
    createProfile(db, { name: 'Sofia' });
    const names = listProfiles(db).map((p) => p.name);
    expect(names).toEqual(['Paolo', 'Giulia', 'Sofia']);
  });

  it('assigns distinct colors round-robin as members are added', () => {
    const db = freshDb();
    const a = createProfile(db, { name: 'A' });
    const b = createProfile(db, { name: 'B' });
    expect(a.color).not.toBe(b.color);
  });

  it('updates a profile', () => {
    const db = freshDb();
    const p = createProfile(db, { name: 'Sofia' });
    const u = updateProfile(db, p.id, {
      preferences: 'non ama i funghi',
      portionFactor: 0.5,
    });
    expect(u.preferences).toBe('non ama i funghi');
    expect(u.portionFactor).toBe(0.5);
    expect(u.name).toBe('Sofia');
  });

  it('deletes a profile', () => {
    const db = freshDb();
    const p = createProfile(db, { name: 'Temp' });
    deleteProfile(db, p.id);
    expect(listProfiles(db)).toHaveLength(0);
  });

  it('throws when creating a profile with a blank name', () => {
    const db = freshDb();
    expect(() => createProfile(db, { name: '  ' })).toThrow();
  });
});
