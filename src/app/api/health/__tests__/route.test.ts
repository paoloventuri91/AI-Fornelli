import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('GET /api/health', () => {
  beforeEach(() => {
    vi.resetModules();
    process.env.DB_PATH = ':memory:';
  });

  it('returns ok when the database responds', async () => {
    const { GET } = await import('../route');
    const res = GET();

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ status: 'ok' });
  });

  it('returns 503 when the database is unavailable', async () => {
    vi.doMock('@/server/db', () => ({
      getDb: () => {
        throw new Error('db down');
      },
    }));

    const { GET } = await import('../route');
    const res = GET();

    expect(res.status).toBe(503);
    await expect(res.json()).resolves.toEqual({ status: 'error' });
  });
});
