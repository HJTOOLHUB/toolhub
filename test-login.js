const fs = require('fs').promises;
const path = require('path');
const bcrypt = require('bcryptjs');

async function testLogin() {
    const usersFile = path.join(__dirname, 'src', 'data', 'users.json');
    
    try {
        const data = await fs.readFile(usersFile, 'utf8');
        const users = JSON.parse(data);
        
        console.log('找到用户数量:', users.length);
        
        users.forEach(user => {
            console.log(`\n用户: ${user.username}`);
            console.log(`邮箱: ${user.email}`);
            console.log(`角色: ${user.role}`);
            console.log(`状态: ${user.status}`);
            console.log(`密码哈希: ${user.passwordHash}`);
            
            // 测试密码
            bcrypt.compare('admin123', user.passwordHash).then(result => {
                console.log(`验证密码 'admin123': ${result ? '✅ 正确' : '❌ 错误'}`);
            });
        });
        
        console.log('\n请检查上述信息，确认用户是否存在且状态正常。');
        console.log('如果密码验证失败，请使用管理员后台删除该用户并重新初始化。');
        
    } catch (error) {
        console.error('读取用户文件失败:', error);
    }
}

testLogin();
