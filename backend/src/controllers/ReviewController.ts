import { Response } from 'express';
import { ProductReview, Product, Order, OrderItem } from '../models';
import { AuthRequest } from '../middleware/auth';
import sequelize from '../config/database';
import { pagination } from '../utils/pagination';

const BOOKED_ORDER_STATUSES = ['confirmed', 'processing', 'shipping', 'delivered', 'completed'];

class ReviewController {
  private async reviewPermission(productId: number, userId: number) {
    const existing = await ProductReview.findOne({ where: { product_id: productId, user_id: userId } });
    if (existing) return { canReview: false, reason: 'already_reviewed', message: 'Bạn đã đánh giá dịch vụ này rồi.' };
    const booking = await Order.findOne({
      where: { user_id: userId, status: BOOKED_ORDER_STATUSES },
      include: [{ model: OrderItem, where: { product_id: productId }, required: true }],
    });
    return booking
      ? { canReview: true, reason: 'eligible', message: 'Bạn có thể đánh giá dịch vụ đã đặt.' }
      : { canReview: false, reason: 'no_booking', message: 'Bạn chỉ có thể đánh giá khi có đơn đặt tiệc được xác nhận chứa dịch vụ này. Đơn chờ xác nhận hoặc đã hủy chưa đủ điều kiện.' };
  }

  async getEligibility(req: AuthRequest, res: Response) {
    const productId = Number(req.params.productId);
    if (!Number.isSafeInteger(productId) || productId < 1) return res.status(400).json({ success: false, message: 'Sản phẩm không hợp lệ.' });
    try {
      if (!await Product.findByPk(productId)) return res.status(404).json({ success: false, message: 'Không tìm thấy sản phẩm.' });
      return res.json({ success: true, data: await this.reviewPermission(productId, req.user!.id) });
    } catch (error) {
      console.error('Review eligibility error:', error);
      return res.status(500).json({ success: false, message: 'Chưa kiểm tra được đơn đặt tiệc. Vui lòng thử lại.' });
    }
  }
  async getProductReviews(req: AuthRequest, res: Response) {
    let paging;
    try { paging = pagination(req.query); } catch (error: any) {
      return res.status(400).json({ success: false, message: error.message });
    }
    try {
      const productId = req.params.productId || req.query.productId;
      const { limit, offset } = paging;

      if (!productId) {
        return res.status(400).json({
          success: false,
          message: 'Product ID is required',
        });
      }

      const reviews = await ProductReview.findAll({
        where: { product_id: productId },
        limit,
        offset,
        order: [['created_at', 'DESC']],
      });

      const summary = await ProductReview.findOne({
        where: { product_id: productId },
        attributes: [
          [sequelize.fn('AVG', sequelize.col('rating')), 'average_rating'],
          [sequelize.fn('COUNT', sequelize.col('id')), 'review_count'],
        ],
        raw: true,
      });

      res.json({
        success: true,
        data: reviews,
        summary: {
          average_rating: summary?.['average_rating'] || 0,
          review_count: summary?.['review_count'] || 0,
        },
      });
    } catch (error) {
      console.error('Get reviews error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get reviews',
      });
    }
  }

  async addReview(req: AuthRequest, res: Response) {
    try {
      const { productId, reviewer_name, rating, comment } = req.body;
      const userId = req.user?.id;

      if (!Number.isSafeInteger(Number(productId)) || Number(productId) < 1 || !rating) {
        return res.status(400).json({
          success: false,
          message: 'Product ID and rating are required',
        });
      }

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Please login before reviewing this service',
        });
      }

      if (!Number.isInteger(Number(rating)) || rating < 1 || rating > 5) {
        return res.status(400).json({
          success: false,
          message: 'Rating must be between 1 and 5',
        });
      }
      if (comment !== undefined && (typeof comment !== 'string' || comment.length > 2000)) return res.status(400).json({ success: false, message: 'Nội dung đánh giá tối đa 2000 ký tự.' });
      const permission = await this.reviewPermission(Number(productId), userId);
      if (!permission.canReview) return res.status(permission.reason === 'already_reviewed' ? 409 : 403).json({ success: false, message: permission.message });

      const review = await ProductReview.create({
        product_id: productId,
        user_id: userId,
        reviewer_name: reviewer_name || req.user?.username || 'Khách hàng',
        rating,
        comment: comment || '',
      });

      // Update product average rating
      const avgRating = await ProductReview.findOne({
        where: { product_id: productId },
        attributes: [[sequelize.fn('AVG', sequelize.col('rating')), 'average_rating']],
        raw: true,
      });

      const reviewCount = await ProductReview.count({
        where: { product_id: productId },
      });

      await Product.update(
        { average_rating: avgRating?.['average_rating'] || 0, review_count: reviewCount },
        { where: { id: productId } }
      );

      res.status(201).json({
        success: true,
        message: 'Review added successfully',
        data: review,
      });
    } catch (error) {
      console.error('Add review error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to add review',
      });
    }
  }

  async deleteReview(req: AuthRequest, res: Response) {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

      const review = await ProductReview.findByPk(id as any);
      if (!review) {
        return res.status(404).json({
          success: false,
          message: 'Review not found',
        });
      }

      const productId = review.product_id;
      await review.destroy();

      // Recalculate product rating
      const avgRating = await ProductReview.findOne({
        where: { product_id: productId },
        attributes: [[sequelize.fn('AVG', sequelize.col('rating')), 'average_rating']],
        raw: true,
      });

      const reviewCount = await ProductReview.count({
        where: { product_id: productId },
      });

      await Product.update(
        { average_rating: avgRating?.['average_rating'] || 0, review_count: reviewCount },
        { where: { id: productId } }
      );

      res.json({
        success: true,
        message: 'Review deleted successfully',
      });
    } catch (error) {
      console.error('Delete review error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete review',
      });
    }
  }
}

export default new ReviewController();
