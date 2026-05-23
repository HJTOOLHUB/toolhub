const CryptoJS = require('crypto-js');
const bcrypt = require('bcryptjs');

const SECRET_KEY = 'your-secret-key-change-in-production';
const SALT_ROUNDS = 10;

class EncryptionUtil {
    // 加密数据（用于存储敏感信息）
    static encrypt(data) {
        try {
            const encrypted = CryptoJS.AES.encrypt(
                JSON.stringify(data), 
                SECRET_KEY
            );
            return encrypted.toString();
        } catch (error) {
            console.error('加密失败:', error);
            throw new Error('数据加密失败');
        }
    }

    // 解密数据
    static decrypt(encryptedData) {
        try {
            const decrypted = CryptoJS.AES.decrypt(encryptedData, SECRET_KEY);
            const bytes = decrypted.toString(CryptoJS.enc.Utf8);
            return JSON.parse(bytes);
        } catch (error) {
            console.error('解密失败:', error);
            throw new Error('数据解密失败');
        }
    }

    // 哈希密码
    static async hashPassword(password) {
        try {
            const salt = await bcrypt.genSalt(SALT_ROUNDS);
            const hash = await bcrypt.hash(password, salt);
            return hash;
        } catch (error) {
            console.error('密码哈希失败:', error);
            throw new Error('密码加密失败');
        }
    }

    // 验证密码
    static async verifyPassword(password, hash) {
        try {
            const isMatch = await bcrypt.compare(password, hash);
            return isMatch;
        } catch (error) {
            console.error('密码验证失败:', error);
            return false;
        }
    }

    // 生成随机字符串
    static generateRandomString(length = 32) {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let result = '';
        for (let i = 0; i < length; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    }

    // 掩码敏感信息
    static maskSensitiveData(data, fields = ['password', 'token', 'phone']) {
        const masked = { ...data };
        fields.forEach(field => {
            if (masked[field]) {
                if (field === 'phone') {
                    masked[field] = masked[field].replace(/(\d{3})\d{4}(\d{4})/, '$1****$2');
                } else {
                    masked[field] = '***';
                }
            }
        });
        return masked;
    }
}

module.exports = EncryptionUtil;
