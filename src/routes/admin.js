const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const DataManager = require('../utils/dataManager');
const EncryptionUtil = require('../utils/encryption');
const AuthMiddleware = require('../middleware/auth');
const logger = require('../utils/logger');
const { USER_LEVELS, VIP_LEVELS } = require('./auth');

const usersManager = new DataManager('users.json');
const toolsManager = new DataManager('tools.json');

// 管理员认证中间件
router.use(AuthMiddleware.authenticate);

// 权限检查
const checkAdminRole = (req, res, next) => {
    if (req.user.role !== 'admin' && req.user.role !== 'superadmin') {
        return res.status(403).json({
            success: false,
            message: '需要管理员权限'
        });
    }
    next();
};

router.use(checkAdminRole);

// 获取用户列表
router.get('/users', async (req, res) => {
    try {
        const { page = 1, limit = 20, search, role, vipLevel, status } = req.query;
        
        const result = await usersManager.paginate({
            page: parseInt(page),
            limit: parseInt(limit),
            predicate: (user) => {
                if (search) {
                    const searchLower = search.toLowerCase();
                    if (!user.username.toLowerCase().includes(searchLower) && 
                        !user.email.toLowerCase().includes(searchLower)) {
                        return false;
                    }
                }
                if (role && user.role !== role) return false;
                if (vipLevel && user.vipLevel !== vipLevel) return false;
                if (status && user.status !== status) return false;
                return true;
            },
            sortBy: 'createdAt',
            order: 'desc'
        });

        // 脱敏处理
        result.items = result.items.map(user => ({
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
            status: user.status,
            stats: user.stats
        }));

        res.json({
            success: true,
            data: result
        });
    } catch (error) {
        console.error('获取用户列表错误:', error);
        res.status(500).json({
            success: false,
            message: '服务器错误'
        });
    }
});

// 获取单个用户详情
router.get('/users/:id', async (req, res) => {
    try {
        const user = await usersManager.findById(req.params.id);
        
        if (!user) {
            return res.status(404).json({
                success: false,
                message: '用户不存在'
            });
        }

        // 获取用户操作统计
        const userStats = await logger.getUserStats(user.id);

        res.json({
            success: true,
            data: {
                ...user,
                passwordHash: undefined, // 移除密码
                userStats
            }
        });
    } catch (error) {
        console.error('获取用户详情错误:', error);
        res.status(500).json({
            success: false,
            message: '服务器错误'
        });
    }
});

// 更新用户信息
router.put('/users/:id', AuthMiddleware.logAction('adminUpdateUser'), async (req, res) => {
    try {
        const { role, vipLevel, title, status } = req.body;
        const userId = req.params.id;

        const user = await usersManager.findById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: '用户不存在'
            });
        }

        // 防止修改超级管理员
        if (user.role === 'superadmin' && req.user.role !== 'superadmin') {
            return res.status(403).json({
                success: false,
                message: '无法修改超级管理员信息'
            });
        }

        const updates = {};

        // 只能超级管理员修改超级管理员
        if (req.user.role === 'superadmin') {
            if (role) updates.role = role;
        } else if (role && role !== 'superadmin') {
            updates.role = role;
        }

        if (vipLevel !== undefined) updates.vipLevel = vipLevel;
        if (title !== undefined) updates.title = title;
        if (status) updates.status = status;

        await usersManager.update(userId, updates);

        await logger.addLog(
            'admin_update_user', 
            req.user.userId, 
            req.user.username, 
            { targetUserId: userId, updates },
            req.ip
        );

        const updatedUser = await usersManager.findById(userId);

        res.json({
            success: true,
            message: '用户信息更新成功',
            data: {
                id: updatedUser.id,
                username: updatedUser.username,
                role: updatedUser.role,
                vipLevel: updatedUser.vipLevel,
                title: updatedUser.title,
                status: updatedUser.status
            }
        });
    } catch (error) {
        console.error('更新用户信息错误:', error);
        res.status(500).json({
            success: false,
            message: '服务器错误'
        });
    }
});

// 删除用户
router.delete('/users/:id', AuthMiddleware.logAction('adminDeleteUser'), async (req, res) => {
    try {
        const userId = req.params.id;
        const user = await usersManager.findById(userId);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: '用户不存在'
            });
        }

        if (user.role === 'superadmin') {
            return res.status(403).json({
                success: false,
                message: '无法删除超级管理员'
            });
        }

        await usersManager.delete(userId);

        await logger.addLog(
            'admin_delete_user', 
            req.user.userId, 
            req.user.username, 
            { deletedUserId: userId, username: user.username },
            req.ip
        );

        res.json({
            success: true,
            message: '用户删除成功'
        });
    } catch (error) {
        console.error('删除用户错误:', error);
        res.status(500).json({
            success: false,
            message: '服务器错误'
        });
    }
});

// 获取操作日志
router.get('/logs', async (req, res) => {
    try {
        const { page = 1, limit = 20, userId, action, startDate, endDate } = req.query;

        const result = await logger.getLogs({
            page: parseInt(page),
            limit: parseInt(limit),
            userId,
            action,
            startDate,
            endDate
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

// 工具管理
router.get('/tools', async (req, res) => {
    try {
        const tools = await toolsManager.read();
        res.json({
            success: true,
            data: tools
        });
    } catch (error) {
        console.error('获取工具列表错误:', error);
        res.status(500).json({
            success: false,
            message: '服务器错误'
        });
    }
});

router.post('/tools', AuthMiddleware.logAction('adminCreateTool'), async (req, res) => {
    try {
        const { name, description, category, icon, url, status } = req.body;

        if (!name || !description || !category) {
            return res.status(400).json({
                success: false,
                message: '请填写必填字段'
            });
        }

        const tool = {
            id: uuidv4(),
            name,
            description,
            category,
            icon: icon || 'fa-tools',
            url: url || '',
            status: status || 'active',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            stats: {
                views: 0,
                uses: 0
            }
        };

        await toolsManager.add(tool);

        await logger.addLog(
            'admin_create_tool', 
            req.user.userId, 
            req.user.username, 
            { toolId: tool.id, toolName: name },
            req.ip
        );

        res.status(201).json({
            success: true,
            message: '工具创建成功',
            data: tool
        });
    } catch (error) {
        console.error('创建工具错误:', error);
        res.status(500).json({
            success: false,
            message: '服务器错误'
        });
    }
});

router.put('/tools/:id', AuthMiddleware.logAction('adminUpdateTool'), async (req, res) => {
    try {
        const toolId = req.params.id;
        const updates = req.body;

        delete updates.id;
        delete updates.createdAt;
        updates.updatedAt = new Date().toISOString();

        const tool = await toolsManager.update(toolId, updates);

        if (!tool) {
            return res.status(404).json({
                success: false,
                message: '工具不存在'
            });
        }

        await logger.addLog(
            'admin_update_tool', 
            req.user.userId, 
            req.user.username, 
            { toolId, updates },
            req.ip
        );

        res.json({
            success: true,
            message: '工具更新成功',
            data: tool
        });
    } catch (error) {
        console.error('更新工具错误:', error);
        res.status(500).json({
            success: false,
            message: '服务器错误'
        });
    }
});

router.delete('/tools/:id', AuthMiddleware.logAction('adminDeleteTool'), async (req, res) => {
    try {
        const toolId = req.params.id;
        const tool = await toolsManager.findById(toolId);

        if (!tool) {
            return res.status(404).json({
                success: false,
                message: '工具不存在'
            });
        }

        await toolsManager.delete(toolId);

        await logger.addLog(
            'admin_delete_tool', 
            req.user.userId, 
            req.user.username, 
            { toolId, toolName: tool.name },
            req.ip
        );

        res.json({
            success: true,
            message: '工具删除成功'
        });
    } catch (error) {
        console.error('删除工具错误:', error);
        res.status(500).json({
            success: false,
            message: '服务器错误'
        });
    }
});

// 获取统计数据
router.get('/stats', async (req, res) => {
    try {
        const users = await usersManager.read();
        const tools = await toolsManager.read();
        const logs = await logger.getLogs({ limit: 1000 });

        const stats = {
            totalUsers: users.length,
            activeUsers: users.filter(u => u.status === 'active').length,
            totalTools: tools.length,
            activeTools: tools.filter(t => t.status === 'active').length,
            recentLogs: logs.logs.length,
            roleDistribution: {
                user: users.filter(u => u.role === 'user').length,
                admin: users.filter(u => u.role === 'admin').length,
                superadmin: users.filter(u => u.role === 'superadmin').length
            },
            vipDistribution: {
                none: users.filter(u => u.vipLevel === 'none').length,
                vip: users.filter(u => u.vipLevel === 'vip').length,
                svip: users.filter(u => u.vipLevel === 'svip').length
            },
            levelDistribution: {}
        };

        Object.keys(USER_LEVELS).forEach(level => {
            stats.levelDistribution[level] = users.filter(u => u.level === level).length;
        });

        res.json({
            success: true,
            data: stats
        });
    } catch (error) {
        console.error('获取统计错误:', error);
        res.status(500).json({
            success: false,
            message: '服务器错误'
        });
    }
});

// 授予称号
router.post('/users/:id/title', AuthMiddleware.logAction('grantTitle'), async (req, res) => {
    try {
        const { title } = req.body;
        const userId = req.params.id;

        if (title && title.length > 20) {
            return res.status(400).json({
                success: false,
                message: '称号长度不能超过20个字符'
            });
        }

        const user = await usersManager.findById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: '用户不存在'
            });
        }

        await usersManager.update(userId, { title });

        await logger.addLog(
            'admin_grant_title', 
            req.user.userId, 
            req.user.username, 
            { targetUserId: userId, username: user.username, title },
            req.ip
        );

        res.json({
            success: true,
            message: '称号授予成功',
            data: { title }
        });
    } catch (error) {
        console.error('授予称号错误:', error);
        res.status(500).json({
            success: false,
            message: '服务器错误'
        });
    }
});

module.exports = router;
