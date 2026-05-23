const express = require('express');
const router = express.Router();
const DataManager = require('../utils/dataManager');
const EncryptionUtil = require('../utils/encryption');
const AuthMiddleware = require('../middleware/auth');
const logger = require('../utils/logger');
const { USER_LEVELS, VIP_LEVELS } = require('./auth');

const usersManager = new DataManager('users.json');

// 获取用户等级配置
router.get('/levels/config', (req, res) => {
    res.json({
        success: true,
        data: {
            userLevels: USER_LEVELS,
            vipLevels: VIP_LEVELS
        }
    });
});

// 计算用户等级
function calculateLevel(exp) {
    let currentLevel = 'bronze';
    for (const [key, config] of Object.entries(USER_LEVELS)) {
        if (exp >= config.minExp) {
            currentLevel = key;
        }
    }
    return currentLevel;
}

// 获取下一个等级信息
function getNextLevelInfo(currentLevel, exp) {
    const levels = Object.keys(USER_LEVELS);
    const currentIndex = levels.indexOf(currentLevel);
    
    if (currentIndex === levels.length - 1) {
        return null; // 已达最高等级
    }
    
    const nextLevel = levels[currentIndex + 1];
    const nextConfig = USER_LEVELS[nextLevel];
    const progress = exp - USER_LEVELS[currentLevel].minExp;
    const required = nextConfig.minExp - USER_LEVELS[currentLevel].minExp;
    
    return {
        name: nextConfig.name,
        requiredExp: nextConfig.minExp,
        currentProgress: progress,
        progressNeeded: required,
        percentage: Math.round((progress / required) * 100)
    };
}

// 获取用户公开信息
router.get('/:id/public', async (req, res) => {
    try {
        const user = await usersManager.findById(req.params.id);
        
        if (!user) {
            return res.status(404).json({
                success: false,
                message: '用户不存在'
            });
        }

        res.json({
            success: true,
            data: {
                username: user.username,
                avatar: user.avatar,
                level: user.level,
                levelInfo: USER_LEVELS[user.level],
                title: user.title,
                vipLevel: user.vipLevel,
                vipInfo: VIP_LEVELS[user.vipLevel],
                createdAt: user.createdAt,
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

// 更新个人资料
router.put('/profile', AuthMiddleware.authenticate, AuthMiddleware.logAction('updateProfile'), async (req, res) => {
    try {
        const { username, avatar, title } = req.body;
        const userId = req.user.userId;

        const user = await usersManager.findById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: '用户不存在'
            });
        }

        const updates = {};

        // 更新用户名
        if (username && username !== user.username) {
            if (username.length < 3 || username.length > 20) {
                return res.status(400).json({
                    success: false,
                    message: '用户名长度必须在3-20个字符之间'
                });
            }
            const existingUser = await usersManager.find(u => u.username === username && u.id !== userId);
            if (existingUser) {
                return res.status(400).json({
                    success: false,
                    message: '用户名已存在'
                });
            }
            updates.username = username;
        }

        // 更新头像
        if (avatar) {
            updates.avatar = avatar;
        }

        // 更新称号
        if (title !== undefined) {
            if (title && title.length > 20) {
                return res.status(400).json({
                    success: false,
                    message: '称号长度不能超过20个字符'
                });
            }
            updates.title = title;
        }

        if (Object.keys(updates).length === 0) {
            return res.status(400).json({
                success: false,
                message: '没有需要更新的内容'
            });
        }

        await usersManager.update(userId, updates);
        const updatedUser = await usersManager.findById(userId);

        res.json({
            success: true,
            message: '资料更新成功',
            data: {
                username: updatedUser.username,
                avatar: updatedUser.avatar,
                title: updatedUser.title
            }
        });
    } catch (error) {
        console.error('更新资料错误:', error);
        res.status(500).json({
            success: false,
            message: '服务器错误'
        });
    }
});

// 修改密码
router.put('/password', AuthMiddleware.authenticate, AuthMiddleware.logAction('changePassword'), async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        const userId = req.user.userId;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({
                success: false,
                message: '请填写所有字段'
            });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({
                success: false,
                message: '新密码长度至少6个字符'
            });
        }

        const user = await usersManager.findById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: '用户不存在'
            });
        }

        const isMatch = await EncryptionUtil.verifyPassword(currentPassword, user.passwordHash);
        if (!isMatch) {
            return res.status(401).json({
                success: false,
                message: '当前密码错误'
            });
        }

        const passwordHash = await EncryptionUtil.hashPassword(newPassword);
        await usersManager.update(userId, { passwordHash });

        await logger.addLog('password_changed', userId, user.username, {}, req.ip);

        res.json({
            success: true,
            message: '密码修改成功'
        });
    } catch (error) {
        console.error('修改密码错误:', error);
        res.status(500).json({
            success: false,
            message: '服务器错误'
        });
    }
});

// 获取用户经验和等级信息
router.get('/experience', AuthMiddleware.authenticate, async (req, res) => {
    try {
        const user = await usersManager.findById(req.user.userId);
        
        if (!user) {
            return res.status(404).json({
                success: false,
                message: '用户不存在'
            });
        }

        const levelInfo = USER_LEVELS[user.level];
        const vipInfo = VIP_LEVELS[user.vipLevel];
        const nextLevel = getNextLevelInfo(user.level, user.exp);

        res.json({
            success: true,
            data: {
                exp: user.exp,
                level: user.level,
                levelInfo,
                vipLevel: user.vipLevel,
                vipInfo,
                nextLevel,
                stats: user.stats
            }
        });
    } catch (error) {
        console.error('获取经验信息错误:', error);
        res.status(500).json({
            success: false,
            message: '服务器错误'
        });
    }
});

// 添加经验值
router.post('/exp', AuthMiddleware.authenticate, AuthMiddleware.logAction('gainExp'), async (req, res) => {
    try {
        const { amount, reason } = req.body;
        const userId = req.user.userId;

        if (!amount || amount <= 0) {
            return res.status(400).json({
                success: false,
                message: '经验值必须大于0'
            });
        }

        const user = await usersManager.findById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: '用户不存在'
            });
        }

        const newExp = user.exp + parseInt(amount);
        const newLevel = calculateLevel(newExp);

        await usersManager.update(userId, {
            exp: newExp,
            level: newLevel
        });

        await logger.addLog('exp_gained', userId, user.username, { amount, reason, newExp, newLevel }, req.ip);

        res.json({
            success: true,
            message: '经验值添加成功',
            data: {
                exp: newExp,
                level: newLevel,
                levelInfo: USER_LEVELS[newLevel],
                leveledUp: newLevel !== user.level
            }
        });
    } catch (error) {
        console.error('添加经验值错误:', error);
        res.status(500).json({
            success: false,
            message: '服务器错误'
        });
    }
});

// 获取操作日志
router.get('/logs', AuthMiddleware.authenticate, async (req, res) => {
    try {
        const { page = 1, limit = 20 } = req.query;
        const result = await logger.getLogs({
            userId: req.user.userId,
            page: parseInt(page),
            limit: parseInt(limit)
        });

        res.json({
            success: true,
            data: result
        });
    } catch (error) {
        console.error('获取日志错误:', error);
        res.status(500).json({
            success: false,
            message: '服务器错误'
        });
    }
});

module.exports = router;
