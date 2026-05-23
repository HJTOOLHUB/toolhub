const express = require('express');
const path = require('path');
const fs = require('fs');
const authRoutes = require('./src/routes/auth');
const userRoutes = require('./src/routes/users');
const adminRoutes = require('./src/routes/admin');

const app = express();
const PORT = process.env.PORT || 3000;

// 中间件
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS 头
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }
    next();
});

// 静态文件服务
app.use(express.static(path.join(__dirname)));

// 处理根路径请求
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// API 路由
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/admin', adminRoutes);

// 健康检查
app.get('/api/health', (req, res) => {
    res.json({
        success: true,
        message: '服务器运行正常',
        timestamp: new Date().toISOString()
    });
});

// 初始化数据文件
const dataDir = path.join(__dirname, 'src', 'data');
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

['users.json', 'tools.json', 'logs.json'].forEach(file => {
    const filePath = path.join(dataDir, file);
    if (!fs.existsSync(filePath)) {
        fs.writeFileSync(filePath, file === 'logs.json' ? JSON.stringify({ logs: [] }, null, 2) : JSON.stringify([], null, 2));
        console.log(`创建数据文件: ${file}`);
    }
});

// 错误处理
app.use((err, req, res, next) => {
    console.error('服务器错误:', err);
    res.status(500).json({
        success: false,
        message: '服务器内部错误'
    });
});

// 启动服务器
app.listen(PORT, () => {
    console.log(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║   🎉 在线工具平台服务器已启动！                            ║
║                                                           ║
║   📡 本地访问: http://localhost:${PORT}                      ║
║   🌐 网络访问: http://0.0.0.0:${PORT}                        ║
║                                                           ║
║   📝 API 接口:                                            ║
║   • POST /api/auth/register - 用户注册                    ║
║   • POST /api/auth/login - 用户登录                       ║
║   • GET /api/auth/me - 获取当前用户信息                    ║
║   • PUT /api/users/profile - 更新个人资料                  ║
║   • GET /api/admin/stats - 管理统计                       ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
    `);
});
