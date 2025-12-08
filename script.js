const WORKER_URL = "https://locket-vip.hungnguyen-junn.workers.dev";
let currentUsername = null;
let pollInterval = null;

// =====================
// --- Utilities ---
function formatMoney(amount) {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount || 0);
}

function showLogin(show) { document.getElementById('login-view').style.display = show ? 'block' : 'none'; }
function showUpgrade(show) { document.getElementById('main-card').style.display = show ? 'block' : 'none'; }
function showDashboard(show) { document.getElementById('dashboard-view').style.display = show ? 'block' : 'none'; }

function showMessage(el, msg, type) {
    el.textContent = msg;
    el.className = "message " + type;
    el.style.display = 'block';
}

// =====================
// --- Init App ---
async function initApp() {
    const urlParams = new URLSearchParams(window.location.search);
    const referrerFromURL = urlParams.get('referrer') || '';

    const storedUser = localStorage.getItem('locket_user');
    if (storedUser) {
        await handleUser(storedUser, referrerFromURL);
    } else {
        showLogin(true);
        if (referrerFromURL) document.getElementById("referrer").value = referrerFromURL;
    }
}

// =====================
// --- Login & Logout ---
async function loginUser() {
    const username = document.getElementById("user-username").value.trim();
    if (!username) { alert("Vui lòng nhập Username!"); return; }
    localStorage.setItem('locket_user', username);
    await handleUser(username);
}

function logout() {
    localStorage.removeItem('locket_user');
    currentUsername = null;
    showLogin(true);
    showUpgrade(false);
    showDashboard(false);
    document.getElementById("user-username").value = '';
}

// =====================
// --- Handle User ---
async function handleUser(username, prefillReferrer = '') {
    currentUsername = username;
    showLogin(false);

    try {
        const res = await fetch(`${WORKER_URL}/user/check?username=${encodeURIComponent(username)}`);
        const data = await res.json();

        if (data.ok && data.user.status === "ACTIVATED") {
            // User cũ
            showUpgrade(false);
            showDashboard(true);
            loadUserData(username);
            document.getElementById("reactivate-btn-dashboard").style.display = "inline-block";
        } else {
            // User mới
            showDashboard(false);
            showUpgrade(true);
            document.getElementById('username').value = username;
            if (prefillReferrer) document.getElementById("referrer").value = prefillReferrer;
            document.getElementById("reactivate-btn-dashboard").style.display = "none";
        }
    } catch (err) {
        console.error(err);
        alert("Lỗi kết nối!");
        showLogin(true);
    }
}

// =====================
// --- Load Dashboard Data ---
async function loadUserData(username) {
    const balanceEl = document.getElementById('current-balance');
    const statusEl = document.getElementById('user-status');
    const referralCountEl = document.getElementById('referral-count');

    balanceEl.textContent = 'Đang tải...';
    statusEl.textContent = 'Đang tải...';
    referralCountEl.textContent = '';

    try {
        const res = await fetch(`${WORKER_URL}/user/check?username=${encodeURIComponent(username)}`);
        const data = await res.json();

        if (data.ok) {
            const user = data.user;
            balanceEl.textContent = formatMoney(user.balance);
            statusEl.textContent = user.status === 'ACTIVATED' ? '✅ Premium Đã Kích hoạt' : '❌ Chưa kích hoạt';
            referralCountEl.textContent = `(${user.referralCount || 0} lượt giới thiệu thành công)`;
        }

        document.getElementById('referral-link-display').value =
            `${window.location.origin}/locket-gold/?referrer=${encodeURIComponent(username)}`;
        document.getElementById('welcome-message').textContent = `Xin chào, ${username}!`;
    } catch (err) {
        console.error(err);
        balanceEl.textContent = 'Lỗi';
        statusEl.textContent = 'Lỗi kết nối';
    }
}

function copyReferralLink() {
    const linkInput = document.getElementById('referral-link-display');
    linkInput.select();
    linkInput.setSelectionRange(0, 99999);
    document.execCommand('copy');
    alert("Đã sao chép link:\n" + linkInput.value);
}

// =====================
// --- Upgrade VIP ---
async function startUpgrade() {
    const username = document.getElementById("username").value.trim();
    const referrer = document.getElementById("referrer").value.trim();
    const messageEl = document.getElementById("activation-message");

    showMessage(messageEl, "⏳ Đang xử lý...", "warning");

    if (!username) { messageEl.textContent = "⚠️ Vui lòng nhập username!"; return; }

    try {
        const startBtn = document.getElementById("start-btn");
        startBtn.disabled = true;
        startBtn.textContent = "⏳ Đang xử lý...";

        const res = await fetch(WORKER_URL + (referrer ? `?referrer=${encodeURIComponent(referrer)}` : ''), {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username, referrer })
        });

        const data = await res.json();

        if (data.ok) {
            showMessage(messageEl, "✅ Nâng cấp Gold thành công! 🎉", "success");
            document.getElementById("install-notice").style.display = "block";
            document.getElementById("download-link").style.display = "inline-block";
            document.getElementById("reactivate-btn").style.display = "inline-block";
            startBtn.style.display = "none";
            await handleUser(username);
        } else if (data.message && data.hint) {
            const hintMatch = data.hint.match(/nội dung:\s*(\w+)/);
            const substr = hintMatch ? hintMatch[1] : null;
            if (!substr) throw new Error("Không lấy được mã chuyển khoản");

            document.getElementById("transfer-content").textContent = substr;
            document.getElementById("qr-image").src =
                `https://vietqr.co/api/generate/mb/09999999900/NGUYEN%20VAN%20HUNG/20000/${encodeURIComponent(substr)}?isMask=0&logo=1&style=2&bg=61`;
            document.getElementById("qr-container").style.display = "block";
            startBtn.style.display = "none";
            startPolling(username, referrer);
        } else {
            showMessage(messageEl, data.error || "❌ Có lỗi xảy ra!", "error");
            startBtn.disabled = false;
            startBtn.textContent = "✨ Bắt đầu nâng cấp";
        }
    } catch (err) {
        showMessage(messageEl, "❌ Lỗi kết nối: " + err.message, "error");
    }
}

// =====================
// --- Reactivate Gold ---
async function reactivate() {
    const username = document.getElementById("username").value.trim() || currentUsername;
    const referrer = document.getElementById("referrer").value.trim();

    const messageEl = document.getElementById('dashboard-view').style.display === 'block'
        ? document.getElementById("dashboard-activation-message")
        : document.getElementById("activation-message");

    if (!messageEl) return;

    showMessage(messageEl, "⏳ Đang nâng cấp lại...", "warning");

    try {
        const res = await fetch(WORKER_URL + (referrer ? `?referrer=${encodeURIComponent(referrer)}` : ''), {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username, referrer })
        });

        const data = await res.json();
        if (data.ok) {
            showMessage(messageEl, "✅ Nâng cấp Gold lại thành công! 🎉", "success");
            await handleUser(username);
        } else {
            showMessage(messageEl, data.error || "❌ Nâng cấp thất bại!", "error");
        }
    } catch (err) {
        showMessage(messageEl, "❌ Lỗi kết nối: " + err.message, "error");
    }
}

// =====================
// --- Activate Premium for friends ---
async function activateFriend() {
    const referred_username = document.getElementById("friend-username").value.trim();
    const messageElement = document.getElementById("dashboard-activation-message");

    if (!referred_username) {
        showMessage(messageElement, "⚠️ Vui lòng nhập Username bạn bè.", "error");
        return;
    }

    showMessage(messageElement, "⏳ Đang xử lý...", "warning");

    try {
        const res = await fetch(`${WORKER_URL}/user/referral-activate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ referrer_username: currentUsername, referred_username })
        });

        const data = await res.json();
        if (data.ok) {
            showMessage(messageElement, `✅ Premium đã kích hoạt cho ${referred_username}`, "success");
            loadUserData(currentUsername);
        } else {
            showMessage(messageElement, data.error || "❌ Không thành công", "error");
        }
    } catch (err) {
        showMessage(messageElement, "❌ Lỗi kết nối: " + err.message, "error");
    }
}

// =====================
// --- Polling (Placeholder) ---
function startPolling(username, referrer) {
    console.log(`Bắt đầu polling cho user: ${username}`);
}

// =====================
// --- Start App ---
document.getElementById('reactivate-btn-dashboard').addEventListener('click', async () => {
    if (!currentUsername) return;
    await reactivate();
});

initApp();
