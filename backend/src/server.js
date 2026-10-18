import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const backendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
// backend/src/server.js -> backend/ -> repository root -> frontend/dist
const clientDist = path.resolve(backendRoot, '..', 'frontend', 'dist');
const statuses = ['Submitted', 'Under Review', 'More Information Required', 'Approved', 'Rejected'];
const dataFile = name => path.join(backendRoot, 'data', name);
const readFixture = async name => JSON.parse(await readFile(dataFile(name), 'utf8'));
const cleanText = value => typeof value === 'string' ? value.trim().replace(/[<>]/g, '') : '';
const demoHealth = () => ({ status: 'ok', service: 'WaterNav API', mode: 'illustrative-demo', persistence: 'in-memory-requests-reset-on-restart' });
function createDemoRequestStore(initialRequests = []) {
  const items = [...initialRequests];
  return { all: () => items, add: item => { items.unshift(item); return item; }, update: (id, status) => { const item = items.find(request => request.id === id); if (item) item.status = status; return item; } };
}

function calculateCost(body) {
  const fields = ['quantityKld', 'purchasePrice', 'transport', 'pumping', 'treatment', 'storage', 'infrastructure', 'maintenance'];
  if (!fields.every(key => Number.isFinite(Number(body[key])) && Number(body[key]) >= 0 && Number(body[key]) <= 10000000)) return null;
  const values = Object.fromEntries(fields.map(key => [key, Number(body[key])]));
  const totalPerKld = values.purchasePrice + values.transport + values.pumping + values.treatment + values.storage + values.infrastructure + values.maintenance;
  return { totalPerKld, dailyTotal: totalPerKld * values.quantityKld, note: 'Illustrative estimate only; validate quality, reliability, contracts, approvals and infrastructure before making a decision.' };
}

export function createApp({ env = process.env } = {}) {
  const app = express();
  const allowedOrigins = (env.CORS_ORIGIN || '').split(',').map(value => value.trim()).filter(Boolean);
  let requestStore;
  const store = async () => { if (!requestStore) requestStore = createDemoRequestStore(await readFixture('requests.json')); return requestStore; };
  app.set('trust proxy', 1);
  app.use(helmet({ contentSecurityPolicy: false, crossOriginResourcePolicy: false }));
  app.use(cors({ origin(origin, callback) { if (!origin || !allowedOrigins.length || allowedOrigins.includes(origin)) return callback(null, true); return callback(Object.assign(new Error('Origin is not permitted.'), { status: 403 })); } }));
  app.use(express.json({ limit: '100kb' }));
  const sensitiveLimit = rateLimit({ windowMs: 15 * 60 * 1000, limit: 60, standardHeaders: 'draft-8', legacyHeaders: false, message: { error: 'Too many requests. Please try again later.' } });

  app.get('/api/health', (_, res) => res.json(demoHealth()));
  app.get('/api/stps', async (_, res, next) => { try { res.json(await readFixture('stps.json')); } catch (error) { next(error); } });
  app.get('/api/industries', async (_, res, next) => { try { res.json(await readFixture('industries.json')); } catch (error) { next(error); } });
  app.get('/api/requests', async (_, res, next) => { try { res.json((await store()).all()); } catch (error) { next(error); } });
  app.post('/api/requests', sensitiveLimit, async (req, res, next) => {
    try {
      const industryName = cleanText(req.body.industryName), intendedUse = cleanText(req.body.intendedUse), requiredQuality = cleanText(req.body.requiredQuality), preferredSource = cleanText(req.body.preferredSource), startDate = cleanText(req.body.startDate), quantityKld = Number(req.body.quantityKld);
      if (![industryName, intendedUse, requiredQuality, preferredSource, startDate].every(Boolean)) return res.status(400).json({ error: 'All request fields are required.' });
      if (!Number.isFinite(quantityKld) || quantityKld <= 0 || quantityKld > 10000000) return res.status(400).json({ error: 'Requested quantity must be between 1 and 10,000,000 KL/day.' });
      if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate) || Number.isNaN(Date.parse(`${startDate}T00:00:00Z`))) return res.status(400).json({ error: 'Required start date must be valid.' });
      const item = { id: `req-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, industryName, quantityKld, intendedUse, requiredQuality, preferredSource, startDate, status: 'Submitted', createdAt: new Date().toISOString(), verification: 'DEMO DATA — NOT VERIFIED' };
      (await store()).add(item);
      res.status(201).json({ ...item, persistence: 'in-memory-demo-resets-on-restart' });
    } catch (error) { next(error); }
  });
  app.patch('/api/requests/:id/status', sensitiveLimit, async (req, res, next) => {
    try {
      const status = cleanText(req.body.status); if (!statuses.includes(status)) return res.status(400).json({ error: `Status must be one of: ${statuses.join(', ')}.` });
      const item = (await store()).update(cleanText(req.params.id), status);
      if (!item) return res.status(404).json({ error: 'Request not found.' });
      item.status = status; res.json({ ...item, persistence: 'in-memory-demo-resets-on-restart' });
    } catch (error) { next(error); }
  });
  app.post('/api/calculate-cost', sensitiveLimit, (req, res) => {
    const result = calculateCost(req.body); if (!result) return res.status(400).json({ error: 'Every cost input must be a non-negative, reasonable number.' }); res.json(result);
  });
  if (env.NODE_ENV === 'production') { app.use(express.static(clientDist)); app.get('*', (_, res) => res.sendFile(path.join(clientDist, 'index.html'))); }
  app.use((_, res) => res.status(404).json({ error: 'Route not found.' }));
  app.use((error, _, res, __) => { console.error(error); res.status(error.status || 500).json({ error: error.status ? error.message : 'Unable to complete the request.' }); });
  return app;
}

const app = createApp();
const runningDirectly = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (runningDirectly) { const port = Number(process.env.PORT) || 5000; app.listen(port, '0.0.0.0', () => console.log(`WaterNav API listening on ${port} (illustrative demo mode)`)); }
export { app, statuses, calculateCost, readFixture, createDemoRequestStore, demoHealth };
