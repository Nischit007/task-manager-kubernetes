import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import request from 'supertest';

const { createApp } = await import('../../src/index.js');

/**
 * Creates an in-memory mock pool that simulates PostgreSQL behavior
 * for the tasks table, handling INSERT...RETURNING and SELECT queries.
 */
function createMockPool() {
  let idCounter = 0;
  const store = new Map();

  const pool = {
    query: async (sql, params) => {
      // INSERT INTO tasks (title, description, completed) VALUES ($1, $2, $3) RETURNING *
      if (sql.includes('INSERT INTO tasks')) {
        const id = ++idCounter;
        const task = {
          id,
          title: params[0],
          description: params[1],
          completed: params[2],
          created_at: new Date().toISOString(),
        };
        store.set(id, task);
        return { rows: [task] };
      }

      // SELECT * FROM tasks WHERE id = $1
      if (sql.includes('SELECT') && sql.includes('WHERE id')) {
        const id = params[0];
        const task = store.get(id);
        return { rows: task ? [task] : [] };
      }

      // SELECT * FROM tasks ORDER BY id ASC
      if (sql.includes('SELECT') && sql.includes('ORDER BY')) {
        return { rows: Array.from(store.values()) };
      }

      // UPDATE tasks SET ... WHERE id = $N RETURNING *
      if (sql.includes('UPDATE tasks')) {
        const id = params[params.length - 1];
        const task = store.get(id);
        if (!task) return { rows: [] };
        const updated = { ...task };
        const setClauses = sql.match(/SET (.+) WHERE/)[1];
        const fields = setClauses.split(', ').map((c) => c.split(' = ')[0].trim());
        fields.forEach((field, i) => {
          updated[field] = params[i];
        });
        store.set(id, updated);
        return { rows: [updated] };
      }

      // DELETE FROM tasks WHERE id = $1 RETURNING id
      if (sql.includes('DELETE')) {
        const id = params[0];
        const task = store.get(id);
        if (!task) return { rows: [] };
        store.delete(id);
        return { rows: [{ id }] };
      }

      return { rows: [] };
    },
  };

  return pool;
}

describe('Property: CRUD round-trip preservation', () => {
  /**
   * **Validates: Requirements 1.1**
   *
   * Property 1: CRUD round-trip preservation
   * For any valid task object, creating it via POST and then retrieving it
   * via GET should return matching title, description, and completed fields.
   */
  it('POST then GET preserves title, description, and completed', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 255 }).filter((s) => s.trim().length > 0),
        fc.option(fc.string(), { nil: undefined }),
        fc.option(fc.boolean(), { nil: undefined }),
        async (title, description, completed) => {
          const mockPool = createMockPool();
          const app = createApp({ pool: mockPool });

          // Build request body
          const body = { title };
          if (description !== undefined) {
            body.description = description;
          }
          if (completed !== undefined) {
            body.completed = completed;
          }

          // POST to create the task
          const createRes = await request(app).post('/api/tasks').send(body);

          expect(createRes.status).toBe(201);
          const createdTask = createRes.body;
          expect(createdTask.id).toBeDefined();

          // GET the created task by ID
          const getRes = await request(app).get(`/api/tasks/${createdTask.id}`);

          expect(getRes.status).toBe(200);
          const fetchedTask = getRes.body;

          // Verify round-trip preservation
          expect(fetchedTask.title).toBe(title);
          expect(fetchedTask.description).toBe(
            description !== undefined ? description : ''
          );
          expect(fetchedTask.completed).toBe(
            completed !== undefined ? completed : false
          );
        }
      ),
      { numRuns: 100 }
    );
  });
});
