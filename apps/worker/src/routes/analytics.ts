import { Hono } from 'hono';
import type { Env } from '../index.js';
import { summarizeOfficialLineAnalytics } from '../services/official-line-analytics.js';

export const analytics = new Hono<Env>();

analytics.get('/api/analytics/official-line/summary', async (c) => {
  const accountId = c.req.query('account_id')?.trim();
  if (!accountId) return c.json({ success: false, error: 'account_id query param required' }, 400);
  try {
    const metrics = await summarizeOfficialLineAnalytics(c.env.DB, {
      accountId,
      from: c.req.query('from'),
      to: c.req.query('to'),
    });
    return c.json({ success: true, metrics });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'official LINE analytics summary failed';
    return c.json({ success: false, error: message }, 500);
  }
});
