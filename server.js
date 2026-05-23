const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// 中间件
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS 头
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
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

['tools.json', 'logs.json'].forEach(file => {
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
║   • GET /api/health - 健康检查                             ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
    `);
});
