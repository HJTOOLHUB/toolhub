const fs = require('fs').promises;
const path = require('path');
const bcrypt = require('bcryptjs');

const usersFile = path.join(__dirname, 'src', 'data', 'users.json');

async function resetAdminPassword() {
    console.log('🔧 开始重置 admin 密码...\n');
    
    try {
        // 读取用户
        const data = await fs.readFile(usersFile, 'utf8');
        const users = JSON.parse(data);
        
        // 找到 admin 用户
        const adminIndex = users.findIndex(u => u.username === 'admin');
        
        if (adminIndex === -1) {
            console.log('❌ 未找到 admin 用户！');
            return;
        }
        
        const admin = users[adminIndex];
        console.log('找到 admin 用户:');
        console.log('  ID:', admin.id);
        console.log('  用户名:', admin.username);
        console.log('  邮箱:', admin.email);
        console.log('  当前哈希:', admin.passwordHash);
        console.log('');
        
        // 生成新的密码哈希
        const newPassword = 'admin123';
        const salt = await bcrypt.genSalt(10);
        const newHash = await bcrypt.hash(newPassword, salt);
        
        console.log('新密码:', newPassword);
        console.log('新哈希:', newHash);
        console.log('');
        
        // 验证新哈希
        const isValid = await bcrypt.compare(newPassword, newHash);
        console.log('新哈希验证:', isValid ? '✅ 通过' : '❌ 失败');
        console.log('');
        
        // 更新用户
        users[adminIndex].passwordHash = newHash;
        users[adminIndex].updatedAt = new Date().toISOString();
        
        // 保存
        await fs.writeFile(usersFile, JSON.stringify(users, null, 2));
        console.log('✅ 密码已重置并保存！');
        console.log('');
        
        // 再次验证
        const verifyData = await fs.readFile(usersFile, 'utf8');
        const verifyUsers = JSON.parse(verifyData);
        const verifyAdmin = verifyUsers.find(u => u.username === 'admin');
        
        console.log('验证保存的哈希:', verifyAdmin.passwordHash);
        const verifyResult = await bcrypt.compare(newPassword, verifyAdmin.passwordHash);
        console.log('保存后验证:', verifyResult ? '✅ 密码正确' : '❌ 密码错误');
        
    } catch (error) {
        console.error('重置失败:', error);
    }
}

resetAdminPassword();
