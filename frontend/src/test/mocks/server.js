import { setupServer } from 'msw/node';
import { rest } from 'msw';

// Mock API responses
const handlers = [
  // Auth endpoints
  rest.post('/api/auth/login', (req, res, ctx) => {
    return res(
      ctx.json({
        token: 'mock-jwt-token',
        user: { id: 1, role: 'user', name: 'Test User' }
      })
    );
  }),

  rest.get('/api/auth/verify', (req, res, ctx) => {
    return res(
      ctx.json({
        user: { id: 1, role: 'user', name: 'Test User' }
      })
    );
  }),

  // Entries endpoints
  rest.get('/api/entries', (req, res, ctx) => {
    return res(
      ctx.json([
        {
          id: 1,
          hours: 8,
          task: 'Development work',
          notes: 'Working on new features',
          date: '2025-10-09',
          tag: 'development',
          invoiceId: null,
          createdAt: '2025-10-09T10:00:00Z',
          updatedAt: '2025-10-09T10:00:00Z'
        },
        {
          id: 2,
          hours: 4,
          task: 'Meeting',
          notes: 'Team standup',
          date: '2025-10-08',
          tag: 'meeting',
          invoiceId: 1,
          createdAt: '2025-10-08T14:00:00Z',
          updatedAt: '2025-10-08T14:00:00Z'
        }
      ])
    );
  }),

  rest.post('/api/entries', (req, res, ctx) => {
    const { hours, task, notes, date, tag } = req.body;
    return res(
      ctx.status(201),
      ctx.json({
        id: Date.now(),
        hours,
        task,
        notes,
        date,
        tag,
        invoiceId: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      })
    );
  }),

  rest.put('/api/entries/:id', (req, res, ctx) => {
    const { id } = req.params;
    const { hours, task, notes, date, tag } = req.body;
    return res(
      ctx.json({
        id: parseInt(id),
        hours,
        task,
        notes,
        date,
        tag,
        invoiceId: null,
        createdAt: '2025-10-09T10:00:00Z',
        updatedAt: new Date().toISOString()
      })
    );
  }),

  rest.delete('/api/entries/:id', (req, res, ctx) => {
    return res(ctx.status(204));
  }),

  // Invoice endpoints
  rest.get('/api/invoices', (req, res, ctx) => {
    return res(
      ctx.json([
        {
          id: 1,
          total: 800,
          status: 'submitted',
          periodStart: '2025-10-01',
          periodEnd: '2025-10-07',
          createdAt: '2025-10-08T10:00:00Z',
          entries: [
            {
              id: 2,
              hours: 4,
              task: 'Meeting',
              notes: 'Team standup',
              date: '2025-10-08',
              rate: 200
            }
          ]
        }
      ])
    );
  }),

  rest.post('/api/invoices/submit', (req, res, ctx) => {
    return res(
      ctx.status(201),
      ctx.json({
        id: Date.now(),
        message: 'Invoice submitted successfully'
      })
    );
  }),

  rest.post('/api/invoices/:id/approve', (req, res, ctx) => {
    return res(
      ctx.json({ success: true, message: 'Invoice approved' })
    );
  }),

  rest.post('/api/invoices/:id/paid', (req, res, ctx) => {
    return res(
      ctx.json({ success: true, message: 'Invoice marked as paid' })
    );
  }),

  // Analytics endpoints
  rest.get('/api/analytics/burn-rates', (req, res, ctx) => {
    return res(
      ctx.json([
        { name: 'Test User', weeklyExpense: 1600, hoursWorked: 32, rate: 50 }
      ])
    );
  }),

  // Admin endpoints
  rest.get('/api/admin/settings', (req, res, ctx) => {
    return res(
      ctx.json({
        hourlyRate: { value: 50, type: 'number' },
        invoiceDeadlineWeeks: { value: 2, type: 'number' }
      })
    );
  }),

  rest.get('/api/admin/tags', (req, res, ctx) => {
    return res(
      ctx.json([
        { id: 1, name: 'development', color: '#3B82F6', active: true },
        { id: 2, name: 'meeting', color: '#10B981', active: true }
      ])
    );
  }),
];

export const server = setupServer(...handlers);