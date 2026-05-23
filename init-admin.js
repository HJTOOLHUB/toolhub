const fs = require('fs').promises;
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');

async function initAdmin() {
    console.log('🚀 开始初始化管理员账号...\n');

    const dataDir = path.join(__dirname, 'src', 'data');
    const usersFile = path.join(dataDir, 'users.json');

    try {
        // 读取现有用户
        let users = [];
        try {
            const data = await fs.readFile(usersFile, 'utf8');
            users = JSON.parse(data);
        } catch {
            users = [];
        }

        // 检查是否已有管理员
        const existingAdmin = users.find(u => u.role === 'superadmin');
        if (existingAdmin) {
            console.log('⚠️  管理员已存在:');
            console.log(`   用户名: ${existingAdmin.username}`);
            console.log(`   邮箱: ${existingAdmin.email}`);
            console.log(`   角色: ${existingAdmin.role}`);
            console.log('\n如需创建新管理员，请先删除现有管理员账号。\n');
            return;
        }

        // 创建默认管理员
        const adminUsername = 'admin';
        const adminPassword = 'admin123';
        const adminEmail = 'admin@example.com';

        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(adminPassword, salt);

        const admin = {
            id: uuidv4(),
            username: adminUsername,
            email: adminEmail,
            passwordHash,
            avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=admin',
            role: 'superadmin',
            vipLevel: 'svip',
            title: '系统管理员',
            exp: 999999,
            level: 'grandmaster',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            lastLoginAt: new Date().toISOString(),
            status: 'active',
            stats: {
                loginCount: 0,
                toolsUsed: 0
            }
        };

        users.push(admin);
        await fs.writeFile(usersFile, JSON.stringify(users, null, 2));

        console.log('✅ 管理员账号创建成功！\n');
        console.log('📋 管理员信息:');
        console.log(`   用户名: ${adminUsername}`);
        console.log(`   密码: ${adminPassword}`);
        console.log(`   邮箱: ${adminEmail}`);
        console.log(`   角色: ${admin.role}`);
        console.log(`   VIP: ${admin.vipLevel}`);
        console.log(`   等级: ${admin.level} (${admin.title})`);
        console.log('\n⚠️  警告: 请立即修改默认密码！\n');

    } catch (error) {
        console.error('❌ 初始化失败:', error);
        process.exit(1);
    }
}

initAdmin();
