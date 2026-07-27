import { describe, it, expect, vi, beforeEach } from 'vitest';
import fc from 'fast-check';
import request from 'supertest';

const { createApp } = await import('../../src/index.js');

/**
 * Property 2: Invalid input rejection
 *
 * For any create or update request payload that is missing the required title field,
 * or contains a title that is empty or exceeds 255 characters, or contains fields of
 * incorrect types, the Backend_Service shall return HTTP 400 with a JSON body identifying
 * the invalid fields, and the database state shall remain unchanged.
 *
 * **Validates: Requirements 1.7**
 */
describe('Property 2: Invalid input rejection', () => {
  let app;
  let mockPool;

  beforeEach(() => {
    mockPool = { query: vi.fn() };
    app = createApp({ pool: mockPool });
  });

  // Generator for payloads with missing title (no title field at all)
  const missingTitleArb = fc.record({
    description: fc.option(fc.string(), { nil: undefined }),
    completed: fc.option(fc.boolean(), { nil: undefined }),
  });

  // Generator for payloads with empty title
  const emptyTitleArb = fc.record({
    title: fc.constant(''),
    description: fc.option(fc.string(), { nil: undefined }),
    completed: fc.option(fc.boolean(), { nil: undefined }),
  });

  // Generator for payloads with title too long (> 255 chars)
  const longTitleArb = fc.record({
    title: fc.string({ minLength: 256, maxLength: 500 }),
    description: fc.option(fc.string(), { nil: undefined }),
    completed: fc.option(fc.boolean(), { nil: undefined }),
  });

  // Generator for payloads with wrong type title
  const wrongTypeTitleArb = fc.record({
    title: fc.oneof(fc.integer(), fc.boolean(), fc.constant(null)),
    description: fc.option(fc.string(), { nil: undefined }),
    completed: fc.option(fc.boolean(), { nil: undefined }),
  });

  // Generator for payloads with wrong type description (valid title required)
  const wrongTypeDescriptionArb = fc.record({
    title: fc.string({ minLength: 1, maxLength: 255 }),
    description: fc.oneof(fc.integer(), fc.boolean(), fc.array(fc.anything())),
  });

  // Generator for payloads with wrong type completed (valid title required)
  const wrongTypeCompletedArb = fc.record({
    title: fc.string({ minLength: 1, maxLength: 255 }),
    completed: fc.oneof(fc.string(), fc.integer(), fc.array(fc.anything())),
  });

  // Combined arbitrary for all invalid payloads targeting POST
  const invalidPostPayloadArb = fc.oneof(
    missingTitleArb,
    emptyTitleArb,
    longTitleArb,
    wrongTypeTitleArb,
    wrongTypeDescriptionArb,
    wrongTypeCompletedArb
  );

  // For PUT, "missing title" means no valid fields or an invalid payload.
  // PUT requires at least one field. We use payloads that have invalid values.
  const invalidPutPayloadArb = fc.oneof(
    emptyTitleArb,
    longTitleArb,
    wrongTypeTitleArb,
    wrongTypeDescriptionArb,
    wrongTypeCompletedArb
  );

  it('POST /api/tasks rejects invalid payloads with 400 and does not touch database', async () => {
    await fc.assert(
      fc.asyncProperty(invalidPostPayloadArb, async (payload) => {
        mockPool.query.mockClear();

        const res = await request(app)
          .post('/api/tasks')
          .send(payload);

        // Must return 400
        expect(res.status).toBe(400);

        // Must have error and fields in body
        expect(res.body).toHaveProperty('error');
        expect(res.body).toHaveProperty('fields');
        expect(Array.isArray(res.body.fields)).toBe(true);
        expect(res.body.fields.length).toBeGreaterThan(0);

        // Database must not have been called (state unchanged)
        expect(mockPool.query).not.toHaveBeenCalled();
      }),
      { numRuns: 100 }
    );
  });

  it('PUT /api/tasks/:id rejects invalid payloads with 400 and does not touch database', async () => {
    await fc.assert(
      fc.asyncProperty(invalidPutPayloadArb, fc.integer({ min: 1, max: 10000 }), async (payload, id) => {
        mockPool.query.mockClear();

        const res = await request(app)
          .put(`/api/tasks/${id}`)
          .send(payload);

        // Must return 400
        expect(res.status).toBe(400);

        // Must have error and fields in body
        expect(res.body).toHaveProperty('error');
        expect(res.body).toHaveProperty('fields');
        expect(Array.isArray(res.body.fields)).toBe(true);
        expect(res.body.fields.length).toBeGreaterThan(0);

        // Database must not have been called (state unchanged)
        expect(mockPool.query).not.toHaveBeenCalled();
      }),
      { numRuns: 100 }
    );
  });
});
