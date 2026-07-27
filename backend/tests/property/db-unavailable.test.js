import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import request from 'supertest';

/**
 * Property 3: Unavailable database returns 503
 * **Validates: Requirements 1.6**
 *
 * When the database is unavailable, all CRUD requests and the health
 * endpoint should return 503 with { error: 'Database unavailable' }.
 */

const { createApp } = await import('../../src/index.js');

describe('Property 3: Unavailable database returns 503', () => {
  // Mock pool where all operations reject (simulates DB connection failure)
  const mockPool = {
    connect: () => Promise.reject(new Error('Connection refused')),
    query: () => Promise.reject(new Error('Connection refused')),
  };

  const app = createApp({ pool: mockPool });

  it('all valid CRUD requests return 503 when database is unavailable', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.oneof(
          fc.constant('GET'),
          fc.constant('POST'),
          fc.constant('PUT'),
          fc.constant('DELETE')
        ),
        fc.integer({ min: 1, max: 10000 }),
        fc.string({ minLength: 1, maxLength: 255 }),
        async (method, id, title) => {
          let res;

          switch (method) {
            case 'GET': {
              // Randomly test either list or single item
              const useList = id % 2 === 0;
              if (useList) {
                res = await request(app).get('/api/tasks');
              } else {
                res = await request(app).get(`/api/tasks/${id}`);
              }
              break;
            }
            case 'POST':
              res = await request(app)
                .post('/api/tasks')
                .send({ title });
              break;
            case 'PUT':
              res = await request(app)
                .put(`/api/tasks/${id}`)
                .send({ title });
              break;
            case 'DELETE':
              res = await request(app).delete(`/api/tasks/${id}`);
              break;
          }

          expect(res.status).toBe(503);
          expect(res.body).toEqual({ error: 'Database unavailable' });
        }
      ),
      { numRuns: 100 }
    );
  });

  it('health endpoint returns 503 when database is unavailable', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(503);
    expect(res.body).toEqual({ error: 'Database unavailable' });
  });
});
