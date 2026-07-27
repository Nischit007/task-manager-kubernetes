import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';

// Import createApp to build app with injected mock pool
const { createApp } = await import('../../src/index.js');

describe('GET /health', () => {
  let app;
  let mockPool;

  beforeEach(() => {
    mockPool = { connect: vi.fn() };
    app = createApp({ pool: mockPool });
  });

  it('returns 200 with {"status":"ok"} when DB is connected', async () => {
    const mockClient = { release: vi.fn() };
    mockPool.connect.mockResolvedValue(mockClient);

    const res = await request(app).get('/health');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
    expect(mockClient.release).toHaveBeenCalled();
  });

  it('returns 503 when DB connection fails', async () => {
    mockPool.connect.mockRejectedValue(new Error('Connection refused'));

    const res = await request(app).get('/health');

    expect(res.status).toBe(503);
    expect(res.body).toEqual({ error: 'Database unavailable' });
  });
});

describe('Global error handler', () => {
  let app;

  beforeEach(() => {
    app = createApp({ pool: { connect: vi.fn() } });
  });

  it('returns 404 for unknown routes', async () => {
    const res = await request(app).get('/nonexistent');
    expect(res.status).toBe(404);
  });
});

describe('CORS headers', () => {
  let app;
  let mockPool;

  beforeEach(() => {
    mockPool = { connect: vi.fn() };
    app = createApp({ pool: mockPool });
  });

  it('sets CORS headers on responses', async () => {
    const mockClient = { release: vi.fn() };
    mockPool.connect.mockResolvedValue(mockClient);

    const res = await request(app).get('/health');

    expect(res.headers['access-control-allow-origin']).toBe('*');
    expect(res.headers['access-control-allow-methods']).toContain('GET');
    expect(res.headers['access-control-allow-headers']).toContain('Content-Type');
  });

  it('responds to OPTIONS preflight with 204', async () => {
    const res = await request(app).options('/health');

    expect(res.status).toBe(204);
    expect(res.headers['access-control-allow-origin']).toBe('*');
  });
});
