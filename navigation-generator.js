// 导航生成器 - 基于配置文件动态生成导航
class NavigationGenerator {
    constructor() {
        this.config = window.CONFIG || {};
        this.categories = this.config.categories || [];
    }

    // 生成导航HTML
    generateNavigation(currentCategory = '') {
        if (!this.categories.length) {
            console.warn('No categories found in config');
            return '';
        }

        return this.categories.map(category => {
            const isActive = currentCategory === category.name ? ' class="active"' : '';
            return `<a href="?category=${encodeURIComponent(category.name)}"${isActive} onclick="SPA.navigateToCategory('${category.name}'); return false;"><i class="${category.icon}"></i> ${category.displayName}</a>`;
        }).join('\n                ');
    }

    // 生成支付方式HTML
    generatePaymentMethods() {
        if (!this.config.PAYMENT_METHODS) {
            return '';
        }

        const paymentIcons = this.config.PAYMENT_METHODS.map(method => 
            `<img src="${method.logo}" alt="${method.alt}" height="24" style="padding: 0 4px; vertical-align: middle;">`
        ).join('\n        ');

        return `
<div style="text-align: center; margin: 12px 0 18px;">
    <div style="font-size: 13px; color: #555; margin-bottom: 6px;">${this.config.TRUST_INFO?.PAYMENT_MESSAGE || '<strong>Secure payments</strong> supported by'}</div>
    <div style="display: inline-flex; align-items: center; gap: 12px;">
        ${paymentIcons}
    </div>
</div>`;
    }

    // 生成信任信息栏HTML
    generateTrustBar() {
        if (!this.config.TRUST_INFO) {
            return '<div class="top-info-bar"><i class="fas fa-shield-alt"></i> Secure shopping platform</div>';
        }

        return `<div class="top-info-bar"> 
   <i class="fas fa-shield-alt"></i> 
   ${this.config.TRUST_INFO.SECURITY_MESSAGE}
 </div>`;
    }

    // 生成Logo栏HTML
    generateLogoBar() {
        const logoText = this.config.SITE?.LOGO_TEXT || '$FFBuy SpreadSheet';
        return `<div class="fixed-logo-bar">
        <a href="index.html" class="logo">${logoText}</a>
    </div>`;
    }

    // 获取当前页面分类
    getCurrentCategory() {
        const urlParams = new URLSearchParams(window.location.search);
        const categoryParam = urlParams.get('category');
        
        if (categoryParam) {
            const category = this.categories.find(cat => cat.name === categoryParam);
            return category ? category.name : '';
        }
        
        // 默认返回配置中的默认分类
        return this.config.SITE?.DEFAULT_CATEGORY || '';
    }

    // 初始化页面导航
    initializeNavigation() {
        const currentCategory = this.getCurrentCategory();
        
        // 更新页面标题
        if (currentCategory) {
            const category = this.categories.find(cat => cat.name === currentCategory);
            if (category) {
                document.title = `${category.displayName} - ${this.config.SITE?.NAME || '$FFBuy SpreadSheet'}`;
            }
        }

        // 生成并插入导航
        this.insertNavigation(currentCategory);
        
        // 生成并插入其他组件
        this.insertTrustBar();
        this.insertPaymentMethods();
    }

    // 插入导航到页面
    insertNavigation(currentCategory) {
        const navElements = document.querySelectorAll('nav');
        const headerNavElements = document.querySelectorAll('.header-top .nav-links');
        
        const navigationHTML = this.generateNavigation(currentCategory);
        
        // 更新主导航
        navElements.forEach(nav => {
            nav.innerHTML = navigationHTML;
        });
        
        // 更新头部导航
        headerNavElements.forEach(nav => {
            nav.innerHTML = navigationHTML;
        });
    }

    // 插入信任信息栏
    insertTrustBar() {
        const existingTrustBar = document.querySelector('.top-info-bar');
        if (existingTrustBar) {
            existingTrustBar.outerHTML = this.generateTrustBar();
        }
    }

    // 插入支付方式
    insertPaymentMethods() {
        // 查找支付方式容器或在header后插入
        const header = document.querySelector('header');
        const existingPayment = document.querySelector('[style*="text-align: center"][style*="margin: 12px 0 18px"]');
        
        if (existingPayment) {
            existingPayment.outerHTML = this.generatePaymentMethods();
        } else if (header) {
            header.insertAdjacentHTML('afterend', this.generatePaymentMethods());
        }
    }

    // 获取分类的API端点
    getCategoryEndpoint(categoryName) {
        const category = this.categories.find(cat => cat.name === categoryName);
        return category ? category.endpoint : categoryName;
    }

    // 获取分类的完整API URL
    getCategoryApiUrl(categoryName) {
        const endpoint = this.getCategoryEndpoint(categoryName);
        // 使用配置中的工具函数
        if (this.config.UTILS && this.config.UTILS.getCategoryUrl) {
            return this.config.UTILS.getCategoryUrl(endpoint);
        }
        // 后备方案
        return `${this.config.API?.BASE_URL || ''}/${encodeURIComponent(endpoint)}`;
    }
}

// 创建全局实例
const navigationGenerator = new NavigationGenerator();

// 导出到全局
if (typeof window !== 'undefined') {
    window.navigationGenerator = navigationGenerator;
    window.NavigationGenerator = NavigationGenerator;
}

// 模块导出
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { NavigationGenerator, navigationGenerator };
}

// 自动初始化（当DOM加载完成时）
if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            navigationGenerator.initializeNavigation();
        });
    } else {
        // DOM已经加载完成
        navigationGenerator.initializeNavigation();
    }
}
