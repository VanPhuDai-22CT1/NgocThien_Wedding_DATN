import { Response } from 'express';
import { resolveSelection } from '../utils/productSelection';
import { Order, OrderItem, Product, Consultation } from '../models';
import { AuthRequest } from '../middleware/auth';
import { randomUUID } from 'crypto';
import sequelize from '../config/database';
import { pagination } from '../utils/pagination';
import { Op, Transaction } from 'sequelize';

class OrderController {
  async getOrders(req: AuthRequest, res: Response) {
    let paging;
    try { paging = pagination(req.query); } catch (error: any) {
      return res.status(400).json({ success: false, message: error.message });
    }
    try {
      const { status, user_id } = req.query;
      const { page, limit, offset } = paging;

      const where: any = {};
      if (status) {
        where.status = status;
      }
      if (user_id) {
        where.user_id = user_id;
      }

      const { count, rows } = await Order.findAndCountAll({
        distinct: true,
        where,
        include: [{ model: OrderItem, include: [Product] }],
        limit: limit as unknown as number,
        offset,
        order: [['created_at', 'DESC']],
      });

      res.json({
        success: true,
        orders: rows,
        pagination: {
          total: count,
          page,
          limit,
          pages: Math.ceil(count / (limit as unknown as number)),
        },
      });
    } catch (error) {
      console.error('Get orders error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get orders',
      });
    }
  }

  async getOrderById(req: AuthRequest, res: Response) {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

      const order = await Order.findByPk(id as any, {
        include: [{ model: OrderItem, include: [Product] }],
      });

      if (!order) {
        return res.status(404).json({
          success: false,
          message: 'Order not found',
        });
      }

      if (req.user?.role !== 'admin' && order.user_id !== req.user?.id) {
        return res.status(403).json({ success: false, message: 'Forbidden' });
      }

      res.json({
        success: true,
        data: order,
      });
    } catch (error) {
      console.error('Get order error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get order',
      });
    }
  }

  async createOrder(req: AuthRequest, res: Response) {
    try {
      const { items, delivery_address, phone, email, payment_method, customer_name, event_date, note } = req.body;
      const user_id = req.user!.id;
      const minDate = new Date(Date.now() + 3 * 86400000).toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' });

      if (typeof customer_name !== 'string' || !customer_name.trim() || typeof phone !== 'string' || !/^[0-9+\-\s().]{8,20}$/.test(phone) || typeof event_date !== 'string' || !event_date) {
        return res.status(400).json({ success: false, message: 'Vui lòng nhập họ tên, số điện thoại và ngày cưới hợp lệ.' });
      }

      if (!Array.isArray(items) || items.length === 0 || items.length > 100) {
        return res.status(400).json({
          success: false,
          message: 'Order items are required',
        });
      }

      if (items.some((item: any) => !item || !Number.isSafeInteger(item.product_id) || item.product_id < 1 || !Number.isSafeInteger(item.quantity) || item.quantity < 1 || item.quantity > 999)) {
        return res.status(400).json({ success: false, message: 'Invalid product or quantity' });
      }
      if (payment_method && !['cash', 'bank'].includes(payment_method)) {
        return res.status(400).json({ success: false, message: 'Invalid payment method' });
      }
      if (event_date) {
        const date = new Date(`${event_date}T00:00:00+07:00`);
        if (!/^\d{4}-\d{2}-\d{2}$/.test(event_date) || !Number.isFinite(date.getTime()) || date.toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }) !== event_date || event_date < minDate) {
          return res.status(400).json({ success: false, message: 'Ngày tổ chức phải hợp lệ và được đặt trước ít nhất 3 ngày.' });
        }
      }

      let totalAmount = 0;
      const orderItems: any[] = [];

      for (const item of items) {
        const product = await Product.findByPk(item.product_id);
        if (!product) {
          return res.status(404).json({
            success: false,
            message: `Product ${item.product_id} not found`,
          });
        }

        let resolved;
        try { resolved = resolveSelection(product, item.selection); } catch (error: any) { return res.status(400).json({ success: false, message: error.message }); }
        if (resolved.selection.event_date && resolved.selection.event_date < minDate) {
          return res.status(400).json({ success: false, message: 'Ngày sử dụng của từng dịch vụ phải được đặt trước ít nhất 3 ngày. Vui lòng cập nhật tùy chọn trong giỏ hàng.' });
        }
        const subtotal = resolved.price * item.quantity;
        totalAmount += subtotal;

        orderItems.push({
          product_id: product.id,
          quantity: item.quantity,
          price: resolved.price,
          selection: resolved.selection,
          subtotal,
        });
      }

      const order = await sequelize.transaction({ isolationLevel: Transaction.ISOLATION_LEVELS.SERIALIZABLE }, async (transaction) => {
        const existingOrders = await Order.findAll({
          where: { event_date, status: { [Op.ne]: 'cancelled' } },
          transaction, lock: transaction.LOCK.UPDATE,
        });
        const existingConsultations = await Consultation.findAll({
          where: {
            event_date: { [Op.gte]: `${event_date} 00:00:00`, [Op.lte]: `${event_date} 23:59:59` },
            status: { [Op.in]: ['confirmed', 'processing', 'delivering', 'completed'] },
          }, transaction, lock: transaction.LOCK.UPDATE,
        });
        if (existingOrders.length + existingConsultations.length >= 2) {
          throw Object.assign(new Error('Ngày này đã đủ 2 tiệc cưới, vui lòng chọn ngày khác.'), { status: 409 });
        }
        const created = await Order.create({
          user_id,
          order_code: `ORD-${Date.now().toString(36).toUpperCase()}-${randomUUID().slice(0, 8).toUpperCase()}`,
          total_amount: totalAmount,
          status: 'pending',
          payment_status: 'pending',
          delivery_address,
          phone,
          email,
          payment_method,
          customer_name,
          event_date,
          note,
        }, { transaction });

        await OrderItem.bulkCreate(
          orderItems.map((item) => ({ order_id: created.id, ...item })), { transaction }
        );
        return created;
      });

      res.status(201).json({
        success: true,
        message: 'Order created successfully',
        data: {
          order_id: order.id,
          order_code: order.order_code,
          total_amount: order.total_amount,
        },
      });
    } catch (error: any) {
      if (error.status === 409 || ['ER_LOCK_DEADLOCK', 'ER_LOCK_WAIT_TIMEOUT'].includes(error.parent?.code)) {
        return res.status(409).json({ success: false, message: error.status === 409 ? error.message : 'Lịch đang được cập nhật. Vui lòng thử lại.' });
      }
      console.error('Create order error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create order',
      });
    }
  }

  async updateOrderStatus(req: AuthRequest, res: Response) {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const { status } = req.body;

      if (!['pending', 'confirmed', 'processing', 'shipping', 'delivered', 'cancelled'].includes(status)) {
        return res.status(400).json({ success: false, message: 'Invalid order status' });
      }

      const order = await Order.findByPk(id as any);
      if (!order) {
        return res.status(404).json({
          success: false,
          message: 'Order not found',
        });
      }

      await order.update({ status, updated_at: new Date() });

      res.json({
        success: true,
        message: 'Order status updated successfully',
        data: order,
      });
    } catch (error) {
      console.error('Update order status error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update order status',
      });
    }
  }

  async getUserOrders(req: AuthRequest, res: Response) {
    try {
      const { user_id } = req.params;

      if (req.user?.role !== 'admin' && Number(user_id) !== req.user?.id) {
        return res.status(403).json({ success: false, message: 'Forbidden' });
      }

      const orders = await Order.findAll({
        where: { user_id },
        include: [{ model: OrderItem, include: [Product] }],
        order: [['created_at', 'DESC']],
      });

      res.json({
        success: true,
        orders,
      });
    } catch (error) {
      console.error('Get user orders error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get user orders',
      });
    }
  }
}

export default new OrderController();
