// 在庫管理アプリケーション
class InventoryManager {
    constructor() {
        this.items = this.loadItems();
        this.history = this.loadHistory();
        this.currentFilter = {
            category: 'all',
            lowStock: false
        };
        this.init();
    }

    // LocalStorageからアイテムを読み込み
    loadItems() {
        const stored = localStorage.getItem('inventoryItems');
        return stored ? JSON.parse(stored) : [];
    }

    // LocalStorageから履歴を読み込み
    loadHistory() {
        const stored = localStorage.getItem('inventoryHistory');
        return stored ? JSON.parse(stored) : [];
    }

    // LocalStorageにアイテムを保存
    saveItems() {
        localStorage.setItem('inventoryItems', JSON.stringify(this.items));
    }

    // LocalStorageに履歴を保存
    saveHistory() {
        localStorage.setItem('inventoryHistory', JSON.stringify(this.history));
    }

    // 履歴を記録
    recordHistory(itemId, oldQuantity, newQuantity) {
        const change = newQuantity - oldQuantity;
        this.history.push({
            itemId,
            timestamp: new Date().toISOString(),
            oldQuantity,
            newQuantity,
            change
        });
        this.saveHistory();
    }

    // 初期化
    init() {
        this.setupEventListeners();
        this.render();
    }

    // イベントリスナーの設定
    setupEventListeners() {
        // フォーム送信
        document.getElementById('add-item-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.addItem();
        });

        // カテゴリフィルター
        document.getElementById('category-filter').addEventListener('change', (e) => {
            this.currentFilter.category = e.target.value;
            this.render();
        });

        // 在庫不足フィルター
        document.getElementById('low-stock-filter').addEventListener('change', (e) => {
            this.currentFilter.lowStock = e.target.checked;
            this.render();
        });

        // Amazon検索ボタン
        document.getElementById('search-amazon').addEventListener('click', () => {
            this.searchAmazon();
        });

        // 楽天検索ボタン
        document.getElementById('search-rakuten').addEventListener('click', () => {
            this.searchRakuten();
        });
    }

    // 新しいアイテムを追加
    addItem() {
        const name = document.getElementById('item-name').value.trim();
        const quantity = parseInt(document.getElementById('item-quantity').value);
        const minQuantity = parseInt(document.getElementById('item-min-quantity').value);
        const category = document.getElementById('item-category').value;
        const amazonLink = document.getElementById('item-amazon-link').value.trim();
        const rakutenLink = document.getElementById('item-rakuten-link').value.trim();

        if (!name) {
            alert('商品名を入力してください');
            return;
        }

        const item = {
            id: Date.now(),
            name,
            quantity,
            minQuantity,
            category,
            amazonLink,
            rakutenLink,
            createdAt: new Date().toISOString()
        };

        this.items.push(item);
        this.saveItems();
        this.render();

        // フォームをリセット
        document.getElementById('add-item-form').reset();

        // 成功メッセージを表示（簡易的）
        this.showMessage(`「${name}」を追加しました`);
    }

    // アイテムを削除
    deleteItem(id) {
        if (confirm('このアイテムを削除してもよろしいですか？')) {
            this.items = this.items.filter(item => item.id !== id);
            this.saveItems();
            this.render();
            this.showMessage('アイテムを削除しました');
        }
    }

    // 在庫数を更新
    updateQuantity(id, change) {
        const item = this.items.find(item => item.id === id);
        if (item) {
            const oldQuantity = item.quantity;
            const newQuantity = Math.max(0, item.quantity + change);
            item.quantity = newQuantity;

            // 履歴を記録（減少した場合のみ）
            if (change < 0) {
                this.recordHistory(id, oldQuantity, newQuantity);
            }

            this.saveItems();
            this.render();
        }
    }

    // アイテムの状態を判定
    getItemStatus(item) {
        if (item.quantity === 0) {
            return 'out';
        } else if (item.quantity <= item.minQuantity) {
            return 'low';
        }
        return 'ok';
    }

    // 状態のラベルを取得
    getStatusLabel(status) {
        const labels = {
            ok: '在庫あり',
            low: '在庫不足',
            out: '在庫切れ'
        };
        return labels[status];
    }

    // 消費ペースを計算（個/日）
    calculateConsumptionRate(itemId) {
        const itemHistory = this.history.filter(h => h.itemId === itemId && h.change < 0);

        if (itemHistory.length < 2) {
            return null; // データ不足
        }

        // 過去30日間のデータのみ使用
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const recentHistory = itemHistory.filter(h =>
            new Date(h.timestamp) >= thirtyDaysAgo
        );

        if (recentHistory.length < 2) {
            return null;
        }

        // 総消費量
        const totalConsumption = recentHistory.reduce((sum, h) => sum + Math.abs(h.change), 0);

        // 期間（日数）
        const firstTimestamp = new Date(recentHistory[0].timestamp);
        const lastTimestamp = new Date(recentHistory[recentHistory.length - 1].timestamp);
        const daysDiff = (lastTimestamp - firstTimestamp) / (1000 * 60 * 60 * 24);

        if (daysDiff < 1) {
            return null; // 1日未満のデータは不十分
        }

        return totalConsumption / daysDiff;
    }

    // 在庫切れ予測日を計算
    getPredictedRunOutDate(item) {
        const rate = this.calculateConsumptionRate(item.id);

        if (!rate || rate === 0 || item.quantity === 0) {
            return null;
        }

        const daysRemaining = item.quantity / rate;
        const predictedDate = new Date();
        predictedDate.setDate(predictedDate.getDate() + Math.floor(daysRemaining));

        return {
            days: Math.floor(daysRemaining),
            date: predictedDate
        };
    }

    // フィルタリングされたアイテムを取得
    getFilteredItems() {
        return this.items.filter(item => {
            // カテゴリフィルター
            if (this.currentFilter.category !== 'all' && item.category !== this.currentFilter.category) {
                return false;
            }

            // 在庫不足フィルター
            if (this.currentFilter.lowStock) {
                const status = this.getItemStatus(item);
                if (status !== 'low' && status !== 'out') {
                    return false;
                }
            }

            return true;
        });
    }

    // アイテムカードのHTMLを生成
    createItemCard(item) {
        const status = this.getItemStatus(item);
        const statusLabel = this.getStatusLabel(status);
        const prediction = this.getPredictedRunOutDate(item);

        let predictionHtml = '';
        if (prediction) {
            const warningClass = prediction.days <= 3 ? 'prediction-warning' : '';
            const icon = prediction.days <= 3 ? '⚠️' : '📊';
            predictionHtml = `
                <div class="prediction-info ${warningClass}">
                    ${icon} あと約<strong>${prediction.days}日</strong>で在庫切れ予測
                </div>
            `;
        }

        return `
            <div class="inventory-item ${status === 'low' ? 'low-stock' : ''} ${status === 'out' ? 'out-of-stock' : ''}">
                <div class="item-header">
                    <div class="item-title">
                        <h3>${this.escapeHtml(item.name)}</h3>
                        <span class="item-category">${this.escapeHtml(item.category)}</span>
                    </div>
                    <div class="item-actions">
                        <button class="btn btn-danger" onclick="app.deleteItem(${item.id})">削除</button>
                    </div>
                </div>

                ${predictionHtml}

                <div class="item-details">
                    <div class="detail-item">
                        <div class="detail-label">現在の在庫</div>
                        <div class="detail-value">${item.quantity}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">最低在庫数</div>
                        <div class="detail-value">${item.minQuantity}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">状態</div>
                        <span class="status-badge status-${status}">${statusLabel}</span>
                    </div>
                </div>

                <div class="quantity-controls">
                    <button class="quantity-btn" onclick="app.updateQuantity(${item.id}, -1)">−</button>
                    <span class="quantity-display">${item.quantity}</span>
                    <button class="quantity-btn" onclick="app.updateQuantity(${item.id}, 1)">＋</button>
                </div>

                ${this.createShoppingLinks(item)}
            </div>
        `;
    }

    // 購入リンクのHTMLを生成
    createShoppingLinks(item) {
        if (!item.amazonLink && !item.rakutenLink) {
            return '';
        }

        let linksHtml = '<div class="shopping-links">';

        if (item.amazonLink) {
            linksHtml += `
                <a href="${this.escapeHtml(item.amazonLink)}" target="_blank" rel="noopener noreferrer" class="shopping-link amazon-link">
                    <span class="link-icon">🛒</span> Amazonで購入
                </a>
            `;
        }

        if (item.rakutenLink) {
            linksHtml += `
                <a href="${this.escapeHtml(item.rakutenLink)}" target="_blank" rel="noopener noreferrer" class="shopping-link rakuten-link">
                    <span class="link-icon">🛒</span> 楽天で購入
                </a>
            `;
        }

        linksHtml += '</div>';
        return linksHtml;
    }

    // Amazonで商品検索
    searchAmazon() {
        const itemName = document.getElementById('item-name').value.trim();
        if (!itemName) {
            alert('商品名を入力してください');
            return;
        }

        const searchUrl = `https://www.amazon.co.jp/s?k=${encodeURIComponent(itemName)}`;
        window.open(searchUrl, '_blank', 'noopener,noreferrer');

        this.showMessage('Amazonで検索を開きました。商品を選んでURLをコピーしてください。');
    }

    // 楽天で商品検索
    searchRakuten() {
        const itemName = document.getElementById('item-name').value.trim();
        if (!itemName) {
            alert('商品名を入力してください');
            return;
        }

        const searchUrl = `https://search.rakuten.co.jp/search/mall/${encodeURIComponent(itemName)}`;
        window.open(searchUrl, '_blank', 'noopener,noreferrer');

        this.showMessage('楽天で検索を開きました。商品を選んでURLをコピーしてください。');
    }

    // HTMLエスケープ
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // メッセージを表示
    showMessage(message) {
        // 簡易的なメッセージ表示
        const existingMsg = document.querySelector('.success-message');
        if (existingMsg) {
            existingMsg.remove();
        }

        const msgDiv = document.createElement('div');
        msgDiv.className = 'success-message';
        msgDiv.textContent = message;
        msgDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #28a745;
            color: white;
            padding: 15px 25px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.2);
            z-index: 1000;
            animation: slideIn 0.3s ease-out;
        `;

        document.body.appendChild(msgDiv);

        setTimeout(() => {
            msgDiv.style.animation = 'slideOut 0.3s ease-out';
            setTimeout(() => msgDiv.remove(), 300);
        }, 2000);
    }

    // 画面を描画
    render() {
        const filteredItems = this.getFilteredItems();
        const inventoryList = document.getElementById('inventory-list');
        const emptyState = document.getElementById('empty-state');

        // 警告バナーを更新
        this.updateWarningBanner();

        if (filteredItems.length === 0) {
            inventoryList.innerHTML = '';
            emptyState.classList.remove('hidden');

            if (this.items.length > 0) {
                emptyState.innerHTML = '<p>フィルター条件に一致するアイテムがありません。</p>';
            } else {
                emptyState.innerHTML = '<p>まだ日用品が登録されていません。上のフォームから追加してください。</p>';
            }
        } else {
            emptyState.classList.add('hidden');
            inventoryList.innerHTML = filteredItems.map(item => this.createItemCard(item)).join('');
        }
    }

    // 警告バナーを更新
    updateWarningBanner() {
        const warningBanner = document.getElementById('warning-banner');
        const warningItems = [];

        this.items.forEach(item => {
            const prediction = this.getPredictedRunOutDate(item);
            if (prediction && prediction.days <= 3) {
                warningItems.push({
                    name: item.name,
                    days: prediction.days
                });
            }
        });

        if (warningItems.length === 0) {
            warningBanner.classList.add('hidden');
            return;
        }

        warningBanner.classList.remove('hidden');
        const itemList = warningItems.map(item =>
            `<strong>${this.escapeHtml(item.name)}</strong>（あと${item.days}日）`
        ).join('、');

        warningBanner.innerHTML = `
            <div class="warning-icon">⚠️</div>
            <div class="warning-content">
                <strong>在庫切れ警告</strong>
                <p>以下の商品が3日以内に在庫切れ予測: ${itemList}</p>
            </div>
        `;
    }
}

// アニメーションのスタイルを追加
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }

    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

// アプリケーションを起動
const app = new InventoryManager();
