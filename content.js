// SUNOCAT PLAYERページで自動的にリンクを貼り付ける
const STORAGE_KEY = 'sunocat_links';

// ページ読み込み時に実行
(async function () {
    // ストレージからリンクを取得
    const result = await chrome.storage.local.get(STORAGE_KEY);
    const links = result[STORAGE_KEY] || [];

    if (links.length === 0) {
        return; // リンクがなければ何もしない
    }

    // テキストエリアを見つける
    const textarea = document.querySelector('textarea#songLinksInput, textarea');

    if (textarea && !textarea.value) { // 空の場合のみ
        // リンクを改行区切りで結合
        const linksText = links.join('\n');

        // テキストエリアに入力
        textarea.value = linksText;
        textarea.dispatchEvent(new Event('input', { bubbles: true }));

        // 通知を表示（オプション）
        const notification = document.createElement('div');
        notification.textContent = `🐱 ${links.length}曲のリンクを自動で入力しました！`;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 15px 25px;
            border-radius: 10px;
            box-shadow: 0 4px 20px rgba(102, 126, 234, 0.5);
            z-index: 10000;
            font-weight: 600;
            animation: slideIn 0.3s ease;
        `;

        document.body.appendChild(notification);

        // 3秒後に消す
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }
})();
