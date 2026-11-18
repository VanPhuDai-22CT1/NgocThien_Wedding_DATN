import { Response } from 'express';
import Joi from 'joi';
import { Order, LiveChatMessage, LiveChatSession } from '../models';
import { AuthRequest } from '../middleware/auth';
import { answerWithOpenAI, assistantConfigured, getCatalog, localAnswer, normalize, relevantProducts, webSearchEnabled } from '../services/weddingAssistant';

const schema = Joi.object({
  message: Joi.string().trim().min(1).max(4000).required(),
  history: Joi.array().max(16).items(Joi.object({ role: Joi.string().valid('user', 'assistant').required(), content: Joi.string().max(4000).required() }).unknown(false)).default([]),
  productId: Joi.number().integer().positive().allow(null),
}).unknown(false);
const sessionSchema = Joi.string().pattern(/^nt_[a-f0-9-]{36}$/i).required();

class AssistantController {
  status(_req: AuthRequest, res: Response) { return res.json({ success: true, data: { aiConfigured: assistantConfigured(), webSearch: assistantConfigured() && webSearchEnabled() } }); }

  async reply(req: AuthRequest, res: Response) {
    const { error, value } = schema.validate(req.body || {});
    if (error || value.history.reduce((size: number, item: any) => size + item.content.length, 0) > 24000) return res.status(400).json({ success: false, message: 'Nội dung hội thoại không hợp lệ hoặc quá dài. Vui lòng rút gọn và thử lại.' });
    const { message, history, productId } = value;
    const controller = new AbortController();
    const close = () => { if (!res.writableEnded) controller.abort(); };
    res.once('close', close);
    try {
      const text = normalize(message);
      if (/don hang|don cua toi|don dat|kiem tra don|trang thai don/.test(text)) {
        if (!req.user) return res.json({ success: true, data: { engine: 'system', text: 'Bạn cần đăng nhập để xem đơn đặt tiệc của mình. Tôi không thể tra cứu đơn của người khác.', products: [], actions: [{ label: 'Đăng nhập', href: '/login' }], sources: [] } });
        const orders = await Order.findAll({ where: { user_id: req.user.id }, attributes: ['order_code', 'status', 'event_date', 'total_amount'], order: [['created_at', 'DESC']], limit: 5 });
        const statuses: Record<string, string> = { pending: 'Chờ xác nhận', confirmed: 'Đã xác nhận', processing: 'Đang chuẩn bị', shipping: 'Đang triển khai', delivered: 'Đã bàn giao', completed: 'Hoàn tất', cancelled: 'Đã hủy' };
        const answer = orders.length ? `Các đơn gần nhất của bạn:\n${orders.map((order) => `- ${order.order_code}: ${statuses[order.status] || order.status}${order.event_date ? ` · Ngày ${order.event_date}` : ''} · ${Number(order.total_amount).toLocaleString('vi-VN')} ₫`).join('\n')}\n\nBạn có thể mở trang đơn hàng để xem đầy đủ chi tiết.` : 'Tài khoản của bạn chưa có đơn đặt tiệc. Bạn có thể xem các mẫu và chọn dịch vụ phù hợp trước khi gửi yêu cầu.';
        return res.json({ success: true, data: { engine: 'system', private: true, text: answer, products: [], actions: [{ label: 'Xem đơn hàng', href: '/donhang' }], sources: [] } });
      }
      const catalog = await getCatalog();
      let products = relevantProducts(catalog, message, history, productId);
      if (!products.length && /dich vu|san pham|goi cuoi|mau cuoi/.test(text)) products = catalog.slice(0, 4);
      const businessQuestion = /thuc don|nau an|nau tiec|dich vu|san pham|gia tien|san khau|cong hoa|mam qua|xe hoa|\bgia\b|chi phi|du toan|ngan sach|chon mau|tim mau|goi cuoi|goi nao|bao nhieu|\d+\s*ban\b|mau nay|thiep|be trap|ban ghe|trang tri/.test(text);
      const local = localAnswer(message, businessQuestion ? products : [], history);
      const knowledgeReply = 'topic' in local;
      const displayProducts = businessQuestion && !knowledgeReply ? products : [];
      // Scheduling and human handoff are deliberately grounded system answers.
      const grounded = /con lich|trong lich|giu lich|lich phuc vu|dat lich|nhan vien|gap nguoi|tu van vien/.test(text);
      if (assistantConfigured() && !grounded) {
        try {
          const answer = await answerWithOpenAI(message, history, products, controller.signal);
          if (controller.signal.aborted) return;
          return res.json({ success: true, data: { ...answer, engine: 'openai', products: displayProducts, actions: local.actions } });
        } catch {
          if (controller.signal.aborted) return;
          return res.json({ success: true, data: { ...local, engine: knowledgeReply ? 'knowledge' : 'catalog', products: displayProducts, sources: [], notice: 'Trợ lý AI đang tạm gián đoạn. Tôi đang hỗ trợ theo hướng dẫn cưới hỏi và dữ liệu website.' } });
        }
      }
      return res.json({ success: true, data: { ...local, engine: grounded ? 'system' : knowledgeReply ? 'knowledge' : 'catalog', products: displayProducts, sources: [] } });
    } catch {
      if (!controller.signal.aborted) return res.status(503).json({ success: false, message: 'Chưa kết nối được dữ liệu tư vấn. Nội dung của bạn vẫn được giữ lại, vui lòng thử lại.' });
    } finally { res.removeListener('close', close); }
  }

  async supportMessages(req: AuthRequest, res: Response) {
    const { error, value: sessionId } = sessionSchema.validate(req.query.session);
    if (error) return res.status(400).json({ success: false, message: 'Cuộc trò chuyện không hợp lệ.' });
    try {
      const session = await LiveChatSession.findOne({ where: { chat_session: sessionId } });
      if (session?.user_id && session.user_id !== req.user?.id) return res.status(403).json({ success: false, message: 'Bạn không có quyền xem cuộc trò chuyện này.' });
      const rows = session ? await LiveChatMessage.findAll({ where: { chat_session: sessionId }, order: [['created_at', 'DESC'], ['id', 'DESC']], limit: 100 }) : [];
      return res.json({ success: true, data: rows.reverse() });
    } catch { return res.status(503).json({ success: false, message: 'Chưa tải được tin nhắn nhân viên. Vui lòng thử lại.' }); }
  }

  async supportSend(req: AuthRequest, res: Response) {
    const { error, value } = Joi.object({ session: sessionSchema, message: Joi.string().trim().min(1).max(2000).required() }).unknown(false).validate(req.body || {});
    if (error) return res.status(400).json({ success: false, message: 'Tin nhắn không hợp lệ hoặc vượt quá 2000 ký tự.' });
    try {
      const [session] = await LiveChatSession.findOrCreate({ where: { chat_session: value.session }, defaults: { customer_name: req.user?.username || 'Khách hàng', customer_email: req.user?.email || '', user_id: req.user?.id || null, status: 'active' } });
      if (session.user_id && session.user_id !== req.user?.id) return res.status(403).json({ success: false, message: 'Bạn không có quyền gửi vào cuộc trò chuyện này.' });
      const row = await LiveChatMessage.create({ chat_session: value.session, sender_type: 'customer', sender_name: req.user?.username || 'Khách hàng', message: value.message });
      await session.update({ is_read_by_admin: false, updated_at: new Date(), status: 'active' });
      return res.status(201).json({ success: true, data: row });
    } catch { return res.status(503).json({ success: false, message: 'Tin nhắn chưa gửi được. Vui lòng thử lại.' }); }
  }
}
export default new AssistantController();
