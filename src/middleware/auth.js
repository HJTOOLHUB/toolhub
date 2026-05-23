const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');

const JWT_SECRET = 'your-jwt-secret-change-in-production';
const JWT_EXPIRES_IN = '7d';

class AuthMiddleware {
    // 生成JWT令牌
    static generateToken(user) {
        const payload = {
            userId: user.id,
            username: user.username,
            role: user.role,
            vipLevel: user.vipLevel
        };

        return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
    }

    // 验证JWT令牌
    static verifyToken(token) {
        try {
            return jwt.verify(token, JWT_SECRET);
        } catch (error) {
            return null;
        }
    }

    // 认证中间件
    static authenticate(req, res, next) {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false,
                message: '未提供认证令牌'
            });
        }

        const token = authHeader.substring(7);
        const decoded = this.verifyToken(token);

        if (!decoded) {
            return res.status(401).json({
                success: false,
                message: '令牌无效或已过期'
            });
        }

        req.user = decoded;
        next();
    }

    // 可选认证（不强制要求登录）
    static optionalAuth(req, res, next) {
        const authHeader = req.headers.authorization;

        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.substring(7);
            const decoded = this.verifyToken(token);
            if (decoded) {
                req.user = decoded;
            }
        }

        next();
    }

    // 角色权限中间件
    static requireRole(...roles) {
        return (req, res, next) => {
            if (!req.user) {
                return res.status(401).json({
                    success: false,
                    message: '请先登录'
                });
            }

            if (!roles.includes(req.user.role)) {
                return res.status(403).json({
                    success: false,
                    message: '您没有权限执行此操作'
                });
            }

            next();
        };
    }

    // VIP权限中间件
    static requireVip(minLevel = 'none') {
        const levels = ['none', 'vip', 'svip'];
        const minIndex = levels.indexOf(minLevel);

        return (req, res, next) => {
            if (!req.user) {
                return res.status(401).json({
                    success: false,
                    message: '请先登录'
                });
            }

            const userLevel = req.user.vipLevel || 'none';
            const userIndex = levels.indexOf(userLevel);

            if (userIndex < minIndex) {
                return res.status(403).json({
                    success: false,
                    message: '需要VIP会员才能使用此功能'
                });
            }

            next();
        };
    }

    // 记录操作日志中间件
    static logAction(action) {
        return async (req, res, next) => {
            // 保存原始的res.json
            const originalJson = res.json;

            res.json = function(data) {
                // 操作成功后记录日志
                if (data.success && req.user) {
                    logger.addLog(
                        action,
                        req.user.userId,
                        req.user.username,
                        {
                            method: req.method,
                            path: req.path,
                            body: req.body,
                            userAgent: req.get('user-agent')
                        },
                        req.ip || req.connection.remoteAddress
                    ).catch(err => console.error('日志记录失败:', err));
                }

                return originalJson.call(this, data);
            };

            next();
        };
    }
}

module.exports = AuthMiddleware;
