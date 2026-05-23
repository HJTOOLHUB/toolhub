const fs = require('fs').promises;
const path = require('path');
const { v4: uuidv4 } = require('uuid');

class Logger {
    constructor() {
        this.logFilePath = path.join(__dirname, '../data/logs.json');
    }

    // 确保日志文件存在
    async ensureLogFile() {
        try {
            await fs.access(this.logFilePath);
        } catch {
            await fs.writeFile(this.logFilePath, JSON.stringify({ logs: [] }, null, 2));
        }
    }

    // 读取日志
    async readLogs() {
        try {
            await this.ensureLogFile();
            const data = await fs.readFile(this.logFilePath, 'utf8');
            return JSON.parse(data);
        } catch (error) {
            console.error('读取日志失败:', error);
            return { logs: [] };
        }
    }

    // 写入日志
    async writeLogs(data) {
        try {
            await fs.writeFile(this.logFilePath, JSON.stringify(data, null, 2));
        } catch (error) {
            console.error('写入日志失败:', error);
            throw new Error('日志写入失败');
        }
    }

    // 添加日志
    async addLog(action, userId, username, details = {}, ip = 'unknown') {
        const logData = await this.readLogs();
        
        const logEntry = {
            id: uuidv4(),
            timestamp: new Date().toISOString(),
            action,
            userId,
            username,
            details,
            ip,
            userAgent: details.userAgent || 'unknown'
        };

        logData.logs.unshift(logEntry); // 添加到开头
        
        // 只保留最近1000条日志
        if (logData.logs.length > 1000) {
            logData.logs = logData.logs.slice(0, 1000);
        }

        await this.writeLogs(logData);
        return logEntry;
    }

    // 获取日志（支持分页和筛选）
    async getLogs(options = {}) {
        const { page = 1, limit = 20, userId, action, startDate, endDate } = options;
        let logs = (await this.readLogs()).logs;

        // 筛选
        if (userId) {
            logs = logs.filter(log => log.userId === userId);
        }
        if (action) {
            logs = logs.filter(log => log.action === action);
        }
        if (startDate) {
            logs = logs.filter(log => new Date(log.timestamp) >= new Date(startDate));
        }
        if (endDate) {
            logs = logs.filter(log => new Date(log.timestamp) <= new Date(endDate));
        }

        // 分页
        const total = logs.length;
        const startIndex = (page - 1) * limit;
        const paginatedLogs = logs.slice(startIndex, startIndex + limit);

        return {
            logs: paginatedLogs,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            }
        };
    }

    // 清理旧日志
    async cleanOldLogs(daysToKeep = 30) {
        const logData = await this.readLogs();
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

        logData.logs = logData.logs.filter(log => 
            new Date(log.timestamp) >= cutoffDate
        );

        await this.writeLogs(logData);
        return logData.logs.length;
    }

    // 获取用户操作统计
    async getUserStats(userId) {
        const logData = await this.readLogs();
        const userLogs = logData.logs.filter(log => log.userId === userId);

        const stats = {
            totalActions: userLogs.length,
            actionsByType: {},
            lastActivity: userLogs[0]?.timestamp || null
        };

        userLogs.forEach(log => {
            stats.actionsByType[log.action] = (stats.actionsByType[log.action] || 0) + 1;
        });

        return stats;
    }
}

module.exports = new Logger();
