const fs = require('fs').promises;
const path = require('path');

class DataManager {
    constructor(fileName) {
        this.filePath = path.join(__dirname, '../data', fileName);
    }

    // 确保文件存在
    async ensureFile() {
        try {
            await fs.access(this.filePath);
        } catch {
            await fs.writeFile(this.filePath, JSON.stringify([], null, 2));
        }
    }

    // 读取数据
    async read() {
        try {
            await this.ensureFile();
            const data = await fs.readFile(this.filePath, 'utf8');
            return JSON.parse(data);
        } catch (error) {
            console.error(`读取文件失败 ${this.filePath}:`, error);
            return [];
        }
    }

    // 写入数据
    async write(data) {
        try {
            await fs.writeFile(this.filePath, JSON.stringify(data, null, 2));
            return true;
        } catch (error) {
            console.error(`写入文件失败 ${this.filePath}:`, error);
            throw new Error('数据写入失败');
        }
    }

    // 查找单条记录
    async findById(id) {
        const data = await this.read();
        return data.find(item => item.id === id);
    }

    // 查找记录
    async find(predicate) {
        const data = await this.read();
        if (typeof predicate === 'function') {
            return data.find(predicate); // 使用 find 而不是 filter
        }
        return data.find(predicate);
    }

    // 添加记录
    async add(item) {
        const data = await this.read();
        data.push(item);
        await this.write(data);
        return item;
    }

    // 更新记录
    async update(id, updates) {
        const data = await this.read();
        const index = data.findIndex(item => item.id === id);
        
        if (index === -1) {
            return null;
        }

        data[index] = { ...data[index], ...updates, updatedAt: new Date().toISOString() };
        await this.write(data);
        return data[index];
    }

    // 删除记录
    async delete(id) {
        const data = await this.read();
        const index = data.findIndex(item => item.id === id);
        
        if (index === -1) {
            return false;
        }

        data.splice(index, 1);
        await this.write(data);
        return true;
    }

    // 分页查询
    async paginate(options = {}) {
        const { page = 1, limit = 20, predicate, sortBy = 'createdAt', order = 'desc' } = options;
        let data = await this.read();

        // 筛选
        if (predicate) {
            data = data.filter(predicate);
        }

        // 排序
        data.sort((a, b) => {
            const aVal = a[sortBy] || '';
            const bVal = b[sortBy] || '';
            return order === 'desc' 
                ? (bVal > aVal ? 1 : -1)
                : (aVal > bVal ? 1 : -1);
        });

        // 分页
        const total = data.length;
        const startIndex = (page - 1) * limit;
        const items = data.slice(startIndex, startIndex + limit);

        return {
            items,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            }
        };
    }
}

module.exports = DataManager;
