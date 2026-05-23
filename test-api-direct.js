const http = require('http');

function makeRequest(options, postData) {
    return new Promise((resolve, reject) => {
        const req = http.request(options, (res) => {
            let data = '';
            
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                try {
                    resolve({
                        status: res.statusCode,
                        data: JSON.parse(data)
                    });
                } catch (e) {
                    reject(new Error('JSON解析失败: ' + data));
                }
            });
        });
        
        req.on('error', (e) => {
            reject(e);
        });
        
        if (postData) {
            req.write(postData);
        }
        
        req.end();
    });
}

async function testLoginAPI() {
    console.log('🧪 测试登录 API...\n');
    
    const postData = JSON.stringify({
        username: 'admin',
        password: 'admin123'
    });
    
    const options = {
        hostname: 'localhost',
        port: 3000,
        path: '/api/auth/login',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(postData)
        }
    };
    
    try {
        console.log('发送请求到: http://localhost:3000/api/auth/login');
        console.log('请求数据:', postData);
        console.log('');
        
        const result = await makeRequest(options, postData);
        
        console.log('响应状态码:', result.status);
        console.log('响应数据:', JSON.stringify(result.data, null, 2));
        
        if (result.data.success) {
            console.log('\n✅ 登录成功！');
            console.log('用户信息:');
            console.log('  用户名:', result.data.data.user.username);
            console.log('  角色:', result.data.data.user.role);
            console.log('  VIP:', result.data.data.user.vipLevel);
        } else {
            console.log('\n❌ 登录失败:', result.data.message);
        }
        
    } catch (error) {
        console.error('请求失败:', error.message);
    }
}

testLoginAPI();
