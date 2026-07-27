import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';

const { createApp } = await import('../../src/index.js');

describe('Tasks CRUD API', () => {
  let app;
  let mockPool;

  beforeEach(() => {
    mockPool = { query: vi.fn() };
    app = createApp({ pool: mockPool });
  });

  describe('GET /api/tasks', () => {
    it('returns 200 with JSON array of tasks', async () => {
      const tasks = [
        { id: 1, title: 'Task 1', description: '', completed: false, created_at: '2024-01-01T00:00:00.000Z' },
        { id: 2, title: 'Task 2', description: 'desc', completed: true, created_at: '2024-01-02T00:00:00.000Z' },
      ];
      mockPool.query.mockResolvedValue({ rows: tasks });

      const res = await request(app).get('/api/tasks');

      expect(res.status).toBe(200);
      expect(res.body).toEqual(tasks);
    });

    it('returns 503 when database is unavailable', async () => {
      mockPool.query.mockRejectedValue(new Error('Connection refused'));

      const res = await request(app).get('/api/tasks');

      expect(res.status).toBe(503);
      expect(res.body).toEqual({ error: 'Database unavailable' });
    });
  });

  describe('GET /api/tasks/:id', () => {
    it('returns 200 with task when found', async () => {
      const task = { id: 1, title: 'Task 1', description: '', completed: false, created_at: '2024-01-01T00:00:00.000Z' };
      mockPool.query.mockResolvedValue({ rows: [task] });

      const res = await request(app).get('/api/tasks/1');

      expect(res.status).toBe(200);
      expect(res.body).toEqual(task);
    });

    it('returns 404 when task not found', async () => {
      mockPool.query.mockResolvedValue({ rows: [] });

      const res = await request(app).get('/api/tasks/999');

      expect(res.status).toBe(404);
      expect(res.body).toEqual({ error: 'Task not found' });
    });

    it('returns 400 for non-integer id', async () => {
      const res = await request(app).get('/api/tasks/abc');

      expect(res.status).toBe(400);
      expect(res.body).toEqual({ error: 'Invalid ID', fields: ['id'] });
    });

    it('returns 400 for negative id', async () => {
      const res = await request(app).get('/api/tasks/-1');

      expect(res.status).toBe(400);
      expect(res.body).toEqual({ error: 'Invalid ID', fields: ['id'] });
    });

    it('returns 400 for zero id', async () => {
      const res = await request(app).get('/api/tasks/0');

      expect(res.status).toBe(400);
      expect(res.body).toEqual({ error: 'Invalid ID', fields: ['id'] });
    });

    it('returns 400 for decimal id', async () => {
      const res = await request(app).get('/api/tasks/1.5');

      expect(res.status).toBe(400);
      expect(res.body).toEqual({ error: 'Invalid ID', fields: ['id'] });
    });
  });

  describe('POST /api/tasks', () => {
    it('returns 201 with created task', async () => {
      const created = { id: 1, title: 'New task', description: '', completed: false, created_at: '2024-01-01T00:00:00.000Z' };
      mockPool.query.mockResolvedValue({ rows: [created] });

      const res = await request(app)
        .post('/api/tasks')
        .send({ title: 'New task' });

      expect(res.status).toBe(201);
      expect(res.body).toEqual(created);
    });

    it('returns 201 with all optional fields', async () => {
      const created = { id: 1, title: 'New task', description: 'A desc', completed: true, created_at: '2024-01-01T00:00:00.000Z' };
      mockPool.query.mockResolvedValue({ rows: [created] });

      const res = await request(app)
        .post('/api/tasks')
        .send({ title: 'New task', description: 'A desc', completed: true });

      expect(res.status).toBe(201);
      expect(res.body).toEqual(created);
    });

    it('returns 400 when title is missing', async () => {
      const res = await request(app)
        .post('/api/tasks')
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Validation failed');
      expect(res.body.fields).toContain('title');
    });

    it('returns 400 when title is empty string', async () => {
      const res = await request(app)
        .post('/api/tasks')
        .send({ title: '' });

      expect(res.status).toBe(400);
      expect(res.body.fields).toContain('title');
    });

    it('returns 400 when title exceeds 255 characters', async () => {
      const res = await request(app)
        .post('/api/tasks')
        .send({ title: 'a'.repeat(256) });

      expect(res.status).toBe(400);
      expect(res.body.fields).toContain('title');
    });

    it('accepts title of exactly 255 characters', async () => {
      const created = { id: 1, title: 'a'.repeat(255), description: '', completed: false, created_at: '2024-01-01T00:00:00.000Z' };
      mockPool.query.mockResolvedValue({ rows: [created] });

      const res = await request(app)
        .post('/api/tasks')
        .send({ title: 'a'.repeat(255) });

      expect(res.status).toBe(201);
    });

    it('returns 400 when title is not a string', async () => {
      const res = await request(app)
        .post('/api/tasks')
        .send({ title: 123 });

      expect(res.status).toBe(400);
      expect(res.body.fields).toContain('title');
    });

    it('returns 400 when completed is not a boolean', async () => {
      const res = await request(app)
        .post('/api/tasks')
        .send({ title: 'Test', completed: 'yes' });

      expect(res.status).toBe(400);
      expect(res.body.fields).toContain('completed');
    });

    it('returns 400 when description is not a string', async () => {
      const res = await request(app)
        .post('/api/tasks')
        .send({ title: 'Test', description: 123 });

      expect(res.status).toBe(400);
      expect(res.body.fields).toContain('description');
    });

    it('returns 503 on database error', async () => {
      mockPool.query.mockRejectedValue(new Error('Connection terminated'));

      const res = await request(app)
        .post('/api/tasks')
        .send({ title: 'Test task' });

      expect(res.status).toBe(503);
      expect(res.body).toEqual({ error: 'Database unavailable' });
    });
  });

  describe('PUT /api/tasks/:id', () => {
    it('returns 200 with updated task', async () => {
      const updated = { id: 1, title: 'Updated', description: '', completed: false, created_at: '2024-01-01T00:00:00.000Z' };
      mockPool.query.mockResolvedValue({ rows: [updated] });

      const res = await request(app)
        .put('/api/tasks/1')
        .send({ title: 'Updated' });

      expect(res.status).toBe(200);
      expect(res.body).toEqual(updated);
    });

    it('returns 404 when task not found', async () => {
      mockPool.query.mockResolvedValue({ rows: [] });

      const res = await request(app)
        .put('/api/tasks/999')
        .send({ title: 'Updated' });

      expect(res.status).toBe(404);
      expect(res.body).toEqual({ error: 'Task not found' });
    });

    it('returns 400 for invalid id', async () => {
      const res = await request(app)
        .put('/api/tasks/abc')
        .send({ title: 'Updated' });

      expect(res.status).toBe(400);
      expect(res.body).toEqual({ error: 'Invalid ID', fields: ['id'] });
    });

    it('returns 400 when no fields provided', async () => {
      const res = await request(app)
        .put('/api/tasks/1')
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Validation failed');
    });

    it('returns 400 when title is empty string', async () => {
      const res = await request(app)
        .put('/api/tasks/1')
        .send({ title: '' });

      expect(res.status).toBe(400);
      expect(res.body.fields).toContain('title');
    });

    it('returns 400 when title exceeds 255 characters', async () => {
      const res = await request(app)
        .put('/api/tasks/1')
        .send({ title: 'a'.repeat(256) });

      expect(res.status).toBe(400);
      expect(res.body.fields).toContain('title');
    });

    it('allows updating only completed field', async () => {
      const updated = { id: 1, title: 'Task', description: '', completed: true, created_at: '2024-01-01T00:00:00.000Z' };
      mockPool.query.mockResolvedValue({ rows: [updated] });

      const res = await request(app)
        .put('/api/tasks/1')
        .send({ completed: true });

      expect(res.status).toBe(200);
      expect(res.body).toEqual(updated);
    });

    it('returns 503 on database error', async () => {
      mockPool.query.mockRejectedValue(new Error('Connection terminated'));

      const res = await request(app)
        .put('/api/tasks/1')
        .send({ title: 'Updated' });

      expect(res.status).toBe(503);
      expect(res.body).toEqual({ error: 'Database unavailable' });
    });
  });

  describe('DELETE /api/tasks/:id', () => {
    it('returns 204 when task is deleted', async () => {
      mockPool.query.mockResolvedValue({ rows: [{ id: 1 }] });

      const res = await request(app).delete('/api/tasks/1');

      expect(res.status).toBe(204);
    });

    it('returns 204 and subsequent GET returns 404', async () => {
      // DELETE succeeds
      mockPool.query.mockResolvedValueOnce({ rows: [{ id: 1 }] });
      const delRes = await request(app).delete('/api/tasks/1');
      expect(delRes.status).toBe(204);

      // Subsequent GET returns 404
      mockPool.query.mockResolvedValueOnce({ rows: [] });
      const getRes = await request(app).get('/api/tasks/1');
      expect(getRes.status).toBe(404);
      expect(getRes.body).toEqual({ error: 'Task not found' });
    });

    it('returns 404 when task not found', async () => {
      mockPool.query.mockResolvedValue({ rows: [] });

      const res = await request(app).delete('/api/tasks/999');

      expect(res.status).toBe(404);
      expect(res.body).toEqual({ error: 'Task not found' });
    });

    it('returns 400 for invalid id', async () => {
      const res = await request(app).delete('/api/tasks/abc');

      expect(res.status).toBe(400);
      expect(res.body).toEqual({ error: 'Invalid ID', fields: ['id'] });
    });

    it('returns 503 on database error', async () => {
      mockPool.query.mockRejectedValue(new Error('Connection terminated'));

      const res = await request(app).delete('/api/tasks/1');

      expect(res.status).toBe(503);
      expect(res.body).toEqual({ error: 'Database unavailable' });
    });
  });
});
