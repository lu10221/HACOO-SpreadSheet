// 统一的产品服务模块
class ProductService {
    constructor() {
        this.cache = new Map();
        this.isLoading = false;
        this.retryCount = 0;
    }

    // 获取产品数据（带缓存和重试机制）
    async fetchProducts(endpoint) {
        const cacheKey = endpoint;
        
        // 检查缓存
        if (CONFIG.CACHE.ENABLED && this.cache.has(cacheKey)) {
            const cached = this.cache.get(cacheKey);
            if (Date.now() - cached.timestamp < CONFIG.CACHE.EXPIRY_TIME) {
                console.log(`Using cached data for ${endpoint}`);
                return cached.data;
            }
        }

        // 特殊处理 Hot 分类：从其他分类随机抽取
        if (endpoint === 'Hot') {
            try {
                const hotData = await this.fetchHotProducts();
                // 缓存数据
                if (CONFIG.CACHE.ENABLED) {
                    this.updateCache(cacheKey, hotData);
                }
                return hotData;
            } catch (error) {
                console.error('Error generating Hot products:', error);
                // 如果生成失败，降级到默认行为或抛出错误
                throw this.handleError(error);
            }
        }

        // 构建API URL - 使用配置中的工具函数
        const apiUrl = (CONFIG.UTILS && CONFIG.UTILS.getCategoryUrl) 
            ? CONFIG.UTILS.getCategoryUrl(endpoint)
            : `${CONFIG.API.BASE_URL}/${encodeURIComponent(endpoint)}`;
        
        try {
            const data = await this.fetchWithRetry(apiUrl);
            
            const validProducts = data.filter(product => 
                (product.title_clean || product.spbt) && 
                (product.media_urls || product.ztURL) && 
                (product.converted_link || product.spURL)
            );
            
            // 缓存数据
            if (CONFIG.CACHE.ENABLED) {
                this.updateCache(cacheKey, validProducts);
            }
            
            return validProducts;
        } catch (error) {
            console.error(`Error fetching products for ${endpoint}:`, error);
            throw this.handleError(error);
        }
    }

    // 生成 Hot 分类数据
    async fetchHotProducts() {
        // 1. 计算种子 (每3天变化一次)
        // 使用 3天 的毫秒数: 3 * 24 * 60 * 60 * 1000 = 259200000
        const seed = Math.floor(Date.now() / 259200000);
        console.log(`Generating Hot products with seed: ${seed}`);

        // 2. 获取其他所有分类
        const otherCategories = CONFIG.categories
            .filter(c => c.name !== 'Hot')
            .map(c => c.endpoint);

        if (otherCategories.length === 0) {
            return [];
        }

        // 3. 并行获取所有分类数据
        // 使用 Promise.all 并行请求，如果有失败的请求则返回空数组，不影响整体
        const promises = otherCategories.map(endpoint => 
            this.fetchProducts(endpoint).catch(err => {
                console.warn(`Failed to fetch ${endpoint} for Hot page:`, err);
                return [];
            })
        );

        const results = await Promise.all(promises);
        
        // 4. 合并所有商品
        let allProducts = results.flat();
        
        // 5. 基于种子打乱商品列表
        return this.seededShuffle(allProducts, seed);
    }

    // 基于种子的随机打乱算法 (Fisher-Yates shuffle)
    seededShuffle(array, seed) {
        const shuffled = [...array];
        
        // 简单的伪随机数生成器
        // 注意：这里使用局部变量 currentSeed 来避免修改传入的 seed 参数（虽然基本类型是按值传递）
        let currentSeed = seed;
        const random = () => {
            var x = Math.sin(currentSeed++) * 10000;
            return x - Math.floor(x);
        };

        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        
        return shuffled;
    }

    // 带重试机制的fetch
    async fetchWithRetry(url, retryCount = 0) {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), CONFIG.API.TIMEOUT);
            
            const response = await fetch(url, {
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            return await response.json();
        } catch (error) {
            if (retryCount < CONFIG.API.RETRY_COUNT) {
                console.log(`Retrying request (${retryCount + 1}/${CONFIG.API.RETRY_COUNT})...`);
                await this.delay(CONFIG.API.RETRY_DELAY * (retryCount + 1));
                return this.fetchWithRetry(url, retryCount + 1);
            }
            throw error;
        }
    }

    // 错误处理
    handleError(error) {
        if (error.name === 'AbortError') {
            return new Error(CONFIG.ERROR_MESSAGES.TIMEOUT_ERROR);
        }
        if (error.message.includes('Failed to fetch')) {
            return new Error(CONFIG.ERROR_MESSAGES.NETWORK_ERROR);
        }
        return new Error(CONFIG.ERROR_MESSAGES.LOADING_ERROR);
    }

    // 更新缓存
    updateCache(key, data) {
        // 如果缓存已满，删除最旧的条目
        if (this.cache.size >= CONFIG.CACHE.MAX_SIZE) {
            const firstKey = this.cache.keys().next().value;
            this.cache.delete(firstKey);
        }
        
        this.cache.set(key, {
            data: data,
            timestamp: Date.now()
        });
    }

    // 延迟函数
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // 清除缓存
    clearCache() {
        this.cache.clear();
    }

    // 获取缓存状态
    getCacheInfo() {
        return {
            size: this.cache.size,
            keys: Array.from(this.cache.keys())
        };
    }
}

// 创建全局实例
const productService = new ProductService();

// 导出服务实例
if (typeof module !== 'undefined' && module.exports) {
    module.exports = productService;
} else if (typeof window !== 'undefined') {
    window.productService = productService;
}
