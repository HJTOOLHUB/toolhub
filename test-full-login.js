const fs = require('fs').promises;
const path = require('path');
const bcrypt = require('bcryptjs');

async function testFullLogin(username, password) {
    console.log('=== 完整登录测试 ===\n');
    console.log('输入的用户名:', username);
    console.log('输入的密码:', password);
    console.log('');
    
    const usersFile = path.join(__dirname, 'src', 'data', 'users.json');
    
    try {
        const data = await fs.readFile(usersFile, 'utf8');
        const users = JSON.parse(data);
        
        console.log('1. 查找用户...');
        const user = users.find(u => u.username === username || u.email === username);
        
        if (!user) {
            console.log('❌ 未找到用户:', username);
            console.log('\n可用的用户名:');
            users.forEach(u => console.log(`  - ${u.username} (${u.email})`));
            return;
        }
        
        console.log('✅ 找到用户:', user.username);
        console.log('');
        
        console.log('2. 检查用户状态...');
        if (user.status === 'banned') {
            console.log('❌ 用户已被禁用');
            return;
        }
        console.log('✅ 用户状态正常:', user.status);
        console.log('');
        
        console.log('3. 验证密码...');
        console.log('   数据库中的哈希:', user.passwordHash);
        console.log('   正在验证...');
        
        const isMatch = await bcrypt.compare(password, user.passwordHash);
        
        if (isMatch) {
            console.log('✅ 密码验证成功！');
            console.log('\n=== 登录应该成功 ===');
            console.log('\n如果仍然登录失败，可能的原因：');
            console.log('1. 登录页面请求格式错误');
            console.log('2. 网络连接问题');
            console.log('3. API 接口地址错误');
            console.log('\n建议：请尝试重新输入用户名和密码，确保没有多余空格。');
        } else {
            console.log('❌ 密码错误');
            console.log('\n请确认密码是: admin123');
        }
        
    } catch (error) {
        console.error('测试失败:', error);
    }
}

// 测试 admin 登录
testFullLogin('admin', 'admin123');
