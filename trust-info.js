// 信任保障按钮和弹窗功能
document.addEventListener('DOMContentLoaded', function() {
    // 获取信任按钮和弹窗元素
    const trustBtn = document.getElementById('trustBtn');
    let trustModal = document.getElementById('trustModal');
    
    if (!trustModal) {
        trustModal = document.createElement('div');
        trustModal.id = 'trustModal';
        trustModal.innerHTML = `
            <p style="text-align: center; margin-bottom: 15px;"><strong style="font-size: 20px; color: #00784E; text-transform: uppercase; letter-spacing: 1px;">About Us</strong></p>
            <div style="height: 2px; background: linear-gradient(to right, #00784E, transparent); margin-bottom: 15px;"></div>
            <p><span style="color: #00784E;">✓</span> This page displays hot-selling products. Click to jump to the official <span style="color: #00784E; font-weight: bold;">CNFANS</span> platform.</p>
            <p><span style="color: #00784E;">✓</span> We support <span style="font-weight: bold;">escrow transactions</span>, <span style="font-weight: bold;">authentic product guarantee</span>, <span style="font-weight: bold;">after-sales service</span>, and <span style="font-weight: bold;">secure payment</span>.</p>
            <p><span style="color: #00784E;">✓</span> If you have any questions, please contact our <span style="color: #0088cc; font-weight: bold;">Telegram</span> or <span style="color: #25D366; font-weight: bold;">WhatsApp</span> customer service.</p>
            <div style="text-align: center; margin-top: 15px;">
                <button id="closeTrustModal" style="background-color: #f8f8f8; border: 1px solid #ddd; border-radius: 4px; padding: 5px 15px; cursor: pointer; font-size: 12px; color: #666; transition: all 0.3s ease;">Close</button>
            </div>
        `;
        document.body.appendChild(trustModal);
    }
    
    // 控制弹窗显示和隐藏的变量
    let isModalOpen = false;
    
    // 点击问号按钮显示/隐藏弹窗
    trustBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        if (isModalOpen) {
            trustModal.style.display = 'none';
            isModalOpen = false;
        } else {
            trustModal.style.display = 'block';
            isModalOpen = true;
        }
    });
    
    // 点击弹窗内部不关闭弹窗
    trustModal.addEventListener('click', function(e) {
        e.stopPropagation();
    });
    
    // 点击关闭按钮关闭弹窗
    const closeBtn = document.getElementById('closeTrustModal');
    if (closeBtn) {
        closeBtn.addEventListener('click', function() {
            trustModal.style.display = 'none';
            isModalOpen = false;
        });
    }
    
    // 点击页面其他区域关闭弹窗
    document.addEventListener('click', function() {
        if (isModalOpen) {
            trustModal.style.display = 'none';
            isModalOpen = false;
        }
    });
});
