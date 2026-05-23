const bcrypt = require('bcryptjs');

async function testPassword() {
    const password = 'admin123';
    
    // 测试密码哈希
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(password, salt);
    
    console.log('测试密码:', password);
    console.log('生成的哈希:', hash);
    
    // 测试密码验证
    const testHash = '$2a$10$Kwrv3TyGE5hqdFmkBIKCL.FLhHA2wqtqla3g4vCeuaUmlDiFvjUSO';
    const isMatch = await bcrypt.compare(password, testHash);
    
    console.log('测试哈希:', testHash);
    console.log('验证结果:', isMatch ? '✅ 密码正确' : '❌ 密码错误');
    
    // 直接验证admin123
    const isMatch2 = await bcrypt.compare(password, hash);
    console.log('验证新哈希:', isMatch2 ? '✅ 密码正确' : '❌ 密码错误');
}

testPassword();
