import { Router } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import AssistantController from '../controllers/AssistantController';

const router = Router();
const buckets = new Map<string, { count: number; until: number }>();
const pending = new Set<string>();
router.get('/status', (req, res) => AssistantController.status(req, res));
router.use((req, res, next) => req.headers.authorization ? authMiddleware(req, res, next) : next());
router.post('/message', (req: AuthRequest, res, next) => {
  const key = `${req.ip || req.socket.remoteAddress}:${req.user?.id || 'guest'}`;
  const now = Date.now();
  if (buckets.size > 4096) for (const [key, bucket] of buckets) if (bucket.until <= now) buckets.delete(key);
  let bucket = buckets.get(key);
  if (!bucket || bucket.until <= now) { bucket = { count: 0, until: now + 60000 }; buckets.set(key, bucket); }
  if (bucket.count >= 20 || pending.has(key)) {
    res.setHeader('Retry-After', pending.has(key) ? '2' : String(Math.max(1, Math.ceil((bucket.until - now) / 1000))));
    return res.status(429).json({ success: false, message: 'Vui lòng chờ câu trả lời hiện tại hoặc thử lại sau ít giây.' });
  }
  bucket.count++; pending.add(key);
  let released = false;
  const release = () => { if (!released) { released = true; pending.delete(key); } };
  res.once('finish', release); res.once('close', release);
  next();
}, (req, res) => AssistantController.reply(req, res));
router.get('/support/messages', (req, res) => AssistantController.supportMessages(req, res));
router.post('/support/message', (req, res) => AssistantController.supportSend(req, res));
export default router;
