// ストレージキー
const STORAGE_KEY = 'sunocat_links';
const SUNOCAT_PLAYER_URL = 'https://sunocatplayer.coedo-music.jp/';

// DOM要素
const addBtn = document.getElementById('addBtn');
const clearBtn = document.getElementById('clearBtn');
const openPlayerBtn = document.getElementById('openPlayerBtn');
const linkList = document.getElementById('linkList');
const stockCount = document.getElementById('stockCount');
const message = document.getElementById('message');

// 初期化
document.addEventListener('DOMContentLoaded', () => {
    loadLinks();

    addBtn.addEventListener('click', addLink);
    clearBtn.addEventListener('click', clearAll);
    openPlayerBtn.addEventListener('click', openInPlayer);
});

// リンク一覧を読み込み
async function loadLinks() {
    const result = await chrome.storage.local.get(STORAGE_KEY);
    const links = result[STORAGE_KEY] || [];

    renderLinks(links);
    updateCount(links.length);
}

// リンク一覧を表示
function renderLinks(links) {
    if (links.length === 0) {
        linkList.innerHTML = '<p class="empty-message">まだリンクがストックされていません</p>';
        return;
    }

    linkList.innerHTML = links.map((link, index) => `
        <div class="link-item">
            <span class="link-number">${index + 1}.</span>
            <span class="link-url" title="${link}">${truncateUrl(link)}</span>
            <button class="btn-delete" data-index="${index}">×</button>
        </div>
    `).join('');

    // 削除ボタンのイベント
    document.querySelectorAll('.btn-delete').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const index = parseInt(e.target.dataset.index);
            deleteLink(index);
        });
    });
}

// URLを短縮表示
function truncateUrl(url) {
    const maxLength = 35;
    if (url.length <= maxLength) return url;
    return url.substring(0, maxLength) + '...';
}

// ストック数を更新
function updateCount(count) {
    stockCount.textContent = `${count}曲`;
}

// 現在のタブのURLを追加
async function addLink() {
    try {
        // 現在のタブを取得
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        const url = tab.url;

        // SUNOのリンクか確認
        if (!url.includes('suno.com/song/')) {
            showMessage('❌ SUNOの曲ページを開いてください', 'error');
            return;
        }

        // 既存のリンクを取得
        const result = await chrome.storage.local.get(STORAGE_KEY);
        const links = result[STORAGE_KEY] || [];

        // 重複チェック
        if (links.includes(url)) {
            showMessage('⚠️ このリンクは既に追加されています', 'warning');
            return;
        }

        // リンクを追加
        links.push(url);
        await chrome.storage.local.set({ [STORAGE_KEY]: links });

        // 再描画
        renderLinks(links);
        updateCount(links.length);
        showMessage('✅ リンクを追加しました！', 'success');

    } catch (err) {
        console.error('タブ情報取得エラー:', err);
        showMessage('❌ ページ情報の取得に失敗しました', 'error');
    }
}

// リンクを削除
async function deleteLink(index) {
    const result = await chrome.storage.local.get(STORAGE_KEY);
    const links = result[STORAGE_KEY] || [];

    links.splice(index, 1);
    await chrome.storage.local.set({ [STORAGE_KEY]: links });

    renderLinks(links);
    updateCount(links.length);
    showMessage('🗑️ リンクを削除しました', 'success');
}

// 全削除
async function clearAll() {
    if (!confirm('本当に全てのリンクを削除しますか？')) {
        return;
    }

    await chrome.storage.local.set({ [STORAGE_KEY]: [] });

    renderLinks([]);
    updateCount(0);
    showMessage('🗑️ 全てのリンクを削除しました', 'success');
}

// SUNOCAT PLAYERで開く
async function openInPlayer() {
    const result = await chrome.storage.local.get(STORAGE_KEY);
    const links = result[STORAGE_KEY] || [];

    if (links.length === 0) {
        showMessage('❌ ストックにリンクがありません', 'error');
        return;
    }

    // SUNOCAT PLAYERを開く（自動貼り付けはcontent.jsが行う）
    chrome.tabs.create({ url: SUNOCAT_PLAYER_URL });

    showMessage('📤 SUNOCAT PLAYERを開きました！', 'success');
}

// メッセージ表示
function showMessage(text, type = 'info') {
    message.textContent = text;
    message.className = `message message-${type}`;
    message.style.display = 'block';

    setTimeout(() => {
        message.style.display = 'none';
    }, 3000);
}
