import { Response } from 'express';
import jwt from 'jsonwebtoken';
import { User } from '../models';
import { AuthRequest } from '../middleware/auth';
import { Op, UniqueConstraintError } from 'sequelize';

class AuthController {
  async register(req: AuthRequest, res: Response) {
    try {
      const { password, confirmPassword, full_name, phone, address } = req.body;
      const username = typeof req.body.username === 'string' ? req.body.username.trim() : '';
      const email = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : '';

      if (!username || !email || !password) {
        return res.status(400).json({
          success: false,
          message: 'Username, email, and password are required',
        });
      }

      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 100 || username.length > 100 || typeof password !== 'string' || password.length < 6 || Buffer.byteLength(password, 'utf8') > 72) {
        return res.status(400).json({ success: false, message: 'Email không hợp lệ hoặc mật khẩu phải từ 6 đến 72 byte.' });
      }

      if (password !== confirmPassword) {
        return res.status(400).json({
          success: false,
          message: 'Passwords do not match',
        });
      }

      const existingUser = await User.findOne({ where: { [Op.or]: [{ email }, { username }] } });
      if (existingUser) {
        return res.status(409).json({
          success: false,
          message: 'Email hoặc tên người dùng đã tồn tại',
        });
      }

      const user = await User.create({
        username,
        email,
        password,
        full_name: full_name || '',
        phone: phone || '',
        address: address || '',
        role: 'user',
        is_active: true,
      });

      const signOptions: any = {
        expiresIn: process.env.JWT_EXPIRES_IN || '7d',
      };

      const token = jwt.sign(
        { id: user.id, username: user.username, email: user.email, role: user.role },
        (process.env.JWT_SECRET || 'secret') as string,
        signOptions
      );

      res.status(201).json({
        success: true,
        message: 'Registration successful',
        data: {
          user_id: user.id,
          username: user.username,
          email: user.email,
          token,
        },
      });
    } catch (error) {
      if (error instanceof UniqueConstraintError) {
        return res.status(409).json({ success: false, message: 'Email hoặc tên người dùng đã tồn tại' });
      }
      console.error('Register error:', error);
      res.status(500).json({
        success: false,
        message: 'Registration failed',
      });
    }
  }

  async login(req: AuthRequest, res: Response) {
    try {
      const { password } = req.body;
      const email = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : '';

      if (!email || typeof password !== 'string' || !password) {
        return res.status(400).json({
          success: false,
          message: 'Email and password are required',
        });
      }

      const user = await User.findOne({ where: { email } });
      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Invalid email or password',
        });
      }

      const isPasswordValid = await user.validatePassword(password);
      if (!isPasswordValid) {
        return res.status(401).json({
          success: false,
          message: 'Invalid email or password',
        });
      }

      if (!user.is_active) {
        return res.status(403).json({
          success: false,
          message: 'Account is inactive',
        });
      }

      const signOptions: any = {
        expiresIn: process.env.JWT_EXPIRES_IN || '7d',
      };

      const token = jwt.sign(
        { id: user.id, username: user.username, email: user.email, role: user.role },
        (process.env.JWT_SECRET || 'secret') as string,
        signOptions
      );

      res.json({
        success: true,
        message: 'Login successful',
        data: {
          user_id: user.id,
          username: user.username,
          email: user.email,
          role: user.role,
          token,
        },
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({
        success: false,
        message: 'Login failed',
      });
    }
  }

  async me(req: AuthRequest, res: Response) {
    try {
      const user = await User.findByPk(req.user?.id, {
        attributes: { exclude: ['password'] },
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found',
        });
      }

      res.json({
        success: true,
        data: user,
      });
    } catch (error) {
      console.error('Get user error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get user info',
      });
    }
  }
}

export default new AuthController();
