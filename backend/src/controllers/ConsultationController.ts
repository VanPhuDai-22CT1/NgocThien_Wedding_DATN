import { Response } from 'express';
import { Consultation, Order, Product } from '../models';
import Joi from 'joi';
import { pagination } from '../utils/pagination';
import { AuthRequest } from '../middleware/auth';
import { Op } from 'sequelize';

class ConsultationController {
  async createQuote(req: AuthRequest, res: Response) {
    const schema = Joi.object({
      product_id: Joi.number().integer().positive().required(),
      intent: Joi.string().valid('quote', 'consultation').default('quote'),
      name: Joi.string().trim().max(120).required().messages({ 'string.empty': 'Vui lòng nhập họ và tên.' }),
      phone: Joi.string().pattern(/^(?:0\d{9}|\+84\d{9})$/).required().messages({ 'string.pattern.base': 'Số điện thoại không hợp lệ.' }),
      event_date: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).required(),
      location: Joi.string().trim().max(250).required(),
      scale: Joi.string().trim().max(250).required(),
      note: Joi.string().trim().max(2000).allow('').default(''),
      color: Joi.string().trim().max(100).allow('').default(''),
    });
    const { error, value } = schema.validate(req.body || {}, { abortEarly: false, stripUnknown: true });
    if (error) {
      return res.status(400).json({ success: false, message: 'Vui lòng kiểm tra các trường đã nhập.', errors: Object.fromEntries(error.details.map((item) => [item.path[0], item.message])) });
    }
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' });
    const date = new Date(`${value.event_date}T12:00:00+07:00`);
    if (!Number.isFinite(date.getTime()) || date.toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }) !== value.event_date || value.event_date < today) {
      return res.status(400).json({ success: false, message: 'Ngày tổ chức không hợp lệ.', errors: { event_date: 'Chọn ngày tổ chức từ hôm nay trở đi.' } });
    }
    try {
      const product = await Product.findByPk(value.product_id);
      if (!product) return res.status(404).json({ success: false, message: 'Sản phẩm không còn trong danh mục. Vui lòng chọn lại.' });
      const intent = value.intent === 'consultation' ? 'Tư vấn' : 'Báo giá';
      const consultation = await Consultation.create({
        user_id: req.user?.id || null, name: value.name, email: req.user?.email || '', phone: value.phone,
        service: `${intent}: ${product.name}`, event_date: date,
        note: [`Loại yêu cầu: ${intent}`, `Sản phẩm #${product.id}: ${product.name}`, `Địa điểm: ${value.location}`, `Quy mô / số lượng: ${value.scale}`, value.color ? `Tông màu: ${value.color}` : '', value.note ? `Mong muốn: ${value.note}` : '', 'Chưa xác nhận đơn đặt dịch vụ hoặc lịch phục vụ.'].filter(Boolean).join('\n'),
        status: 'pending', is_read: false,
      });
      return res.status(201).json({ success: true, message: 'Đã tiếp nhận yêu cầu báo giá. Chúng tôi sẽ liên hệ để tư vấn và xác nhận lịch phục vụ.', data: { id: consultation.id, status: 'pending' } });
    } catch (error) {
      console.error('Create quote error:', error);
      return res.status(500).json({ success: false, message: 'Chưa lưu được yêu cầu. Vui lòng thử lại, nội dung của bạn vẫn được giữ trong biểu mẫu.' });
    }
  }

  async getConsultations(req: AuthRequest, res: Response) {
    let paging;
    try { paging = pagination(req.query); } catch (error: any) {
      return res.status(400).json({ success: false, message: error.message });
    }
    try {
      const { status, search } = req.query;
      const { page, limit, offset } = paging;

      const where: any = {};
      if (status) {
        where.status = status;
      }
      if (search) {
        where[Op.or] = [
          { name: { [Op.like]: `%${search}%` } },
          { email: { [Op.like]: `%${search}%` } },
          { phone: { [Op.like]: `%${search}%` } },
        ];
      }

      const { count, rows } = await Consultation.findAndCountAll({
        where,
        limit: limit as unknown as number,
        offset,
        order: [['created_at', 'DESC']],
      });

      res.json({
        success: true,
        data: rows,
        pagination: {
          total: count,
          page,
          limit,
          pages: Math.ceil(count / (limit as unknown as number)),
        },
      });
    } catch (error) {
      console.error('Get consultations error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get consultations',
      });
    }
  }

  async createConsultation(req: AuthRequest, res: Response) {
    try {
      const { user_id, name, email, phone, service, event_date, note } = req.body;

      if (!name || !email || !phone) {
        return res.status(400).json({
          success: false,
          message: 'Name, email, and phone are required',
        });
      }

      const consultation = await Consultation.create({
        user_id: user_id || null,
        name,
        email,
        phone,
        service: service || '',
        event_date: event_date || null,
        note: note || '',
        status: 'pending',
        is_read: false,
      });

      res.status(201).json({
        success: true,
        message: 'Consultation request created',
        data: consultation,
      });
    } catch (error) {
      console.error('Create consultation error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create consultation',
      });
    }
  }

  async updateConsultationStatus(req: AuthRequest, res: Response) {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const { status } = req.body;

      const consultation = await Consultation.findByPk(id as any);
      if (!consultation) {
        return res.status(404).json({
          success: false,
          message: 'Consultation not found',
        });
      }

      await consultation.update({ status });

      res.json({
        success: true,
        message: 'Consultation status updated',
        data: consultation,
      });
    } catch (error) {
      console.error('Update consultation error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update consultation',
      });
    }
  }

  async markAsRead(req: AuthRequest, res: Response) {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

      const consultation = await Consultation.findByPk(id as any);
      if (!consultation) {
        return res.status(404).json({
          success: false,
          message: 'Consultation not found',
        });
      }

      await consultation.update({ is_read: true });

      res.json({
        success: true,
        message: 'Marked as read',
      });
    } catch (error) {
      console.error('Mark as read error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to mark as read',
      });
    }
  }

  async getBookedEventDates(req: AuthRequest, res: Response) {
    try {
      const consultations = await Consultation.findAll({
        where: {
          status: { [Op.in]: ['confirmed', 'processing', 'delivering', 'completed'] },
          event_date: { [Op.ne]: null },
        },
        attributes: ['event_date'],
      });

      const orders = await Order.findAll({
        where: { status: { [Op.ne]: 'cancelled' }, event_date: { [Op.ne]: null } },
        attributes: ['event_date'],
      });
      const dates = [
        ...consultations.map((c) => ({ event_date: c.event_date ? new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(c.event_date)) : null })),
        ...orders.map((o) => ({ event_date: o.event_date })),
      ];

      res.json({
        success: true,
        data: dates,
      });
    } catch (error) {
      console.error('Get booked dates error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get booked dates',
      });
    }
  }
}

export default new ConsultationController();
