const fs = require('fs').promises;
const path = require('path');
const bcrypt = require('bcryptjs');

const usersFile = path.join(__dirname, 'src', 'data', 'users.json');

async function debugLogin() {
    console.log('🔍 调试登录问题...\n');
    
    try {
        // 1. 读取用户数据
        console.log('1. 读取用户数据文件...');
        const data = await fs.readFile(usersFile, 'utf8');
        const users = JSON.parse(data);
        console.log(`   找到 ${users.length} 个用户\n`);
        
        // 2. 查找 admin 用户
        console.log('2. 查找 admin 用户...');
        const admin = users.find(u => u.username === 'admin');
        
        if (!admin) {
            console.log('❌ 未找到 admin 用户！');
            console.log('所有用户:');
            users.forEach(u => console.log(`   - ${u.username} (${u.email})`));
            return;
        }
        
        console.log('   ✅ 找到 admin 用户');
        console.log(`   ID: ${admin.id}`);
        console.log(`   用户名: ${admin.username}`);
        console.log(`   邮箱: ${admin.email}`);
        console.log(`   状态: ${admin.status}`);
        console.log(`   角色: ${admin.role}`);
        console.log('');
        
        // 3. 检查密码哈希
        console.log('3. 检查密码哈希...');
        console.log(`   数据库中的哈希: ${admin.passwordHash}`);
        console.log('');
        
        // 4. 验证密码
        console.log('4. 验证密码...');
        const password = 'admin123';
        console.log(`   尝试密码: "${password}"`);
        console.log(`   密码长度: ${password.length}`);
        
        const isMatch = await bcrypt.compare(password, admin.passwordHash);
        
        if (isMatch) {
            console.log('   ✅ 密码验证成功！');
        } else {
            console.log('   ❌ 密码验证失败！');
        }
        console.log('');
        
        // 5. 结论
        console.log('=' .repeat(50));
        if (isMatch) {
            console.log('✅ 所有检查通过！登录应该成功。');
            console.log('');
            console.log('如果仍然失败，可能的原因：');
            console.log('1. 服务器缓存了旧的用户数据');
            console.log('2. 需要重启服务器');
        } else {
            console.log('❌ 密码验证失败');
            console.log('');
            console.log('这很奇怪，密码应该是一致的。');
            console.log('请尝试：');
            console.log('1. 删除用户数据文件');
            console.log('2. 重新初始化管理员');
            console.log('3. 重启服务器');
        }
        console.log('=' .repeat(50));
        
    } catch (error) {
        console.error('调试失败:', error);
    }
}

debugLogin();
