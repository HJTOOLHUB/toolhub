const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const DataManager = require('../utils/dataManager');
const EncryptionUtil = require('../utils/encryption');
const AuthMiddleware = require('../middleware/auth');
const logger = require('../utils/logger');

const usersManager = new DataManager('users.json');

// 用户等级配置
const USER_LEVELS = {
    bronze: { name: '青铜', minExp: 0, color: '#cd7f32', icon: '🥉' },
    silver: { name: '白银', minExp: 100, color: '#c0c0c0', icon: '🥈' },
    gold: { name: '黄金', minExp: 500, color: '#ffd700', icon: '🥇' },
    platinum: { name: '铂金', minExp: 1000, color: '#e5e4e2', icon: '💎' },
    diamond: { name: '钻石', minExp: 5000, color: '#b9f2ff', icon: '💠' },
    master: { name: '大师', minExp: 10000, color: '#9b59b6', icon: '🌟' },
    grandmaster: { name: '宗师', minExp: 50000, color: '#f39c12', icon: '👑' }
};

// VIP等级配置
const VIP_LEVELS = {
    none: { name: '普通用户', color: '#95a5a6' },
    vip: { name: 'VIP会员', color: '#f1c40f' },
    svip: { name: 'SVIP会员', color: '#e74c3c' }
};

// 注册
router.post('/register', AuthMiddleware.logAction('register'), async (req, res) => {
    try {
        const { username, email, password } = req.body;

        // 验证必填字段
        if (!username || !email || !password) {
            return res.status(400).json({
                success: false,
                message: '请填写所有必填字段'
            });
        }

        // 验证用户名格式
        if (username.length < 3 || username.length > 20) {
            return res.status(400).json({
                success: false,
                message: '用户名长度必须在3-20个字符之间'
            });
        }

        // 验证邮箱格式
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({
                success: false,
                message: '请输入有效的邮箱地址'
            });
        }

        // 验证密码强度
        if (password.length < 6) {
            return res.status(400).json({
                success: false,
                message: '密码长度至少6个字符'
            });
        }

        // 检查用户名是否已存在
        const existingUser = await usersManager.find(u => u.username === username);
        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: '用户名已存在'
            });
        }

        // 检查邮箱是否已注册
        const existingEmail = await usersManager.find(u => u.email === email);
        if (existingEmail) {
            return res.status(400).json({
                success: false,
                message: '该邮箱已被注册'
            });
        }

        // 创建用户
        const user = {
            id: uuidv4(),
            username,
            email,
            passwordHash: await EncryptionUtil.hashPassword(password),
            avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`,
            role: 'user',
            vipLevel: 'none',
            title: '',
            exp: 0,
            level: 'bronze',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            lastLoginAt: new Date().toISOString(),
            status: 'active',
            stats: {
                loginCount: 0,
                toolsUsed: 0
            }
        };

        await usersManager.add(user);

        // 生成令牌
        const token = AuthMiddleware.generateToken(user);

        await logger.addLog('register', user.id, user.username, { email }, req.ip);

        res.status(201).json({
            success: true,
            message: '注册成功',
            data: {
                user: {
                    id: user.id,
                    username: user.username,
                    email: user.email,
                    avatar: user.avatar,
                    role: user.role,
                    vipLevel: user.vipLevel,
                    title: user.title,
                    level: user.level,
                    exp: user.exp,
                    createdAt: user.createdAt
                },
                token
            }
        });
    } catch (error) {
        console.error('注册错误:', error);
        res.status(500).json({
            success: false,
            message: '服务器错误，请稍后重试'
        });
    }
});

// 登录
router.post('/login', AuthMiddleware.logAction('login'), async (req, res) => {
    try {
        const { username, password } = req.body;
        
        console.log('\n🔐 登录请求:');
        console.log('  用户名:', username);
        console.log('  密码:', password);
        console.log('  密码长度:', password ? password.length : 'undefined');

        if (!username || !password) {
            console.log('  ❌ 未提供用户名或密码');
            return res.status(400).json({
                success: false,
                message: '请填写用户名和密码'
            });
        }

        // 查找用户（支持用户名或邮箱登录）
        const user = await usersManager.find(
            u => u.username === username || u.email === username
        );
        
        console.log('  查找结果:', user ? `找到用户 ${user.username}` : '未找到用户');

        if (!user) {
            console.log('  ❌ 用户不存在');
            return res.status(401).json({
                success: false,
                message: '用户名或密码错误'
            });
        }

        // 检查用户状态
        if (user.status === 'banned') {
            console.log('  ❌ 用户已被禁用');
            return res.status(403).json({
                success: false,
                message: '账号已被禁用，请联系管理员'
            });
        }

        // 验证密码
        console.log('  验证密码中...');
        console.log('  数据库哈希:', user.passwordHash);
        const isMatch = await EncryptionUtil.verifyPassword(password, user.passwordHash);
        console.log('  验证结果:', isMatch ? '✅ 通过' : '❌ 失败');
        
        if (!isMatch) {
            console.log('  ❌ 密码错误');
            return res.status(401).json({
                success: false,
                message: '用户名或密码错误'
            });
        }

        // 更新登录信息
        await usersManager.update(user.id, {
            lastLoginAt: new Date().toISOString(),
            'stats.loginCount': user.stats.loginCount + 1
        });

        // 生成令牌
        const token = AuthMiddleware.generateToken(user);

        await logger.addLog('login', user.id, user.username, {}, req.ip);

        res.json({
            success: true,
            message: '登录成功',
            data: {
                user: {
                    id: user.id,
                    username: user.username,
                    email: user.email,
                    avatar: user.avatar,
                    role: user.role,
                    vipLevel: user.vipLevel,
                    title: user.title,
                    level: user.level,
                    exp: user.exp,
                    createdAt: user.createdAt,
                    stats: user.stats
                },
                token
            }
        });
    } catch (error) {
        console.error('登录错误:', error);
        res.status(500).json({
            success: false,
            message: '服务器错误，请稍后重试'
        });
    }
});

// 获取当前用户信息
router.get('/me', AuthMiddleware.authenticate, async (req, res) => {
    try {
        const user = await usersManager.findById(req.user.userId);
        
        if (!user) {
            return res.status(404).json({
                success: false,
                message: '用户不存在'
            });
        }

        res.json({
            success: true,
            data: {
                id: user.id,
                username: user.username,
                email: user.email,
                avatar: user.avatar,
                role: user.role,
                vipLevel: user.vipLevel,
                title: user.title,
                level: user.level,
                exp: user.exp,
                createdAt: user.createdAt,
                lastLoginAt: user.lastLoginAt,
                stats: user.stats
            }
        });
    } catch (error) {
        console.error('获取用户信息错误:', error);
        res.status(500).json({
            success: false,
            message: '服务器错误'
        });
    }
});

// 退出登录
router.post('/logout', AuthMiddleware.authenticate, async (req, res) => {
    try {
        await logger.addLog('logout', req.user.userId, req.user.username, {}, req.ip);
        
        res.json({
            success: true,
            message: '退出登录成功'
        });
    } catch (error) {
        console.error('退出登录错误:', error);
        res.status(500).json({
            success: false,
            message: '服务器错误'
        });
    }
});

// 获取用户等级配置
router.get('/levels', (req, res) => {
    res.json({
        success: true,
        data: {
            userLevels: USER_LEVELS,
            vipLevels: VIP_LEVELS
        }
    });
});

module.exports = router;
module.exports.USER_LEVELS = USER_LEVELS;
module.exports.VIP_LEVELS = VIP_LEVELS;
