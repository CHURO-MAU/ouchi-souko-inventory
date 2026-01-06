// 在庫管理アプリケーション
class InventoryManager {
    constructor() {
        this.items = this.loadItems();
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

    // LocalStorageにアイテムを保存
    saveItems() {
        localStorage.setItem('inventoryItems', JSON.stringify(this.items));
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
            item.quantity = Math.max(0, item.quantity + change);
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
