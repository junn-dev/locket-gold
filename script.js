// ============================================
// FRONTEND JAVASCRIPT FOR LOCKET VIP SYSTEM (DYNAMIC CONFIG)
// ============================================

// --- CẤU HÌNH CƠ BẢN ---
const WORKER_URL = "https://locket-vip.hungnguyen-junn.workers.dev"; 
const QR_BANK_ID = "MB";
const QR_ACCOUNT_NO = "09999999900"; 
const QR_ACCOUNT_NAME = "NGUYEN VAN HUNG"; 

// Biến toàn cục để lưu trữ cấu hình động
let DYNAMIC_CONFIG = {
    ACTIVATION_COST: 20000, // Giá trị mặc định an toàn
    REFERRAL_REWARD: 5000,  // Giá trị mặc định an toàn
};

let currentUsername = localStorage.getItem('locket_user') || null;
let pollInterval = null;

// =====================
// --- Utilities ---
function formatMoney(amount) {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount || 0);
}

function showLogin(show) { document.getElementById('login-view').style.display = show ? 'block' : 'none'; }
function showUpgrade(show) { document.getElementById('main-card').style.display = show ? 'flex' : 'none'; }
function showDashboard(show) { document.getElementById('dashboard-view').style.display = show ? 'flex' : 'none'; }

function showMessage(el, msg, type) {
    el.innerHTML = msg;
    el.className = "message " + type;
    el.style.display = 'block';
}

function hideMessage(el) {
    if (el) el.style.display = 'none';
}

function hideUpgradeElements() {
    document.getElementById("qr-container").style.display = "none";
    document.getElementById("install-notice").style.display = "none";
    document.getElementById("download-link").style.display = "none";
    document.getElementById("reactivate-btn").style.display = "none";
    document.getElementById("start-btn").style.display = "inline-block";
    document.getElementById("start-btn").disabled = false;
    document.getElementById("start-btn").textContent = "✨ Bắt đầu nâng cấp";
    hideMessage(document.getElementById("activation-message"));
    // Cập nhật thông tin chi phí trên Main Card
    updateCostDisplay(); 
}

function clearPolling() {
    if (pollInterval) clearInterval(pollInterval);
    pollInterval = null;
}

// =====================
// --- Dynamic Config and Display ---

/**
 * Lấy cấu hình phí và thưởng từ Worker (Sử dụng /admin/stats)
 * LƯU Ý: Endpoint /admin/stats thường không công khai. 
 * Nếu Worker của bạn không yêu cầu auth, ta dùng nó. Nếu không, phải tạo endpoint mới.
 */
async function fetchConfig() {
    try {
        // GỌI ENDPOINT ADMIN/STATS ĐỂ LẤY CẤU HÌNH
        const res = await fetch(`${WORKER_URL}/admin/stats`);
        const data = await res.json();
        
        if (data.ok && data.data && data.data.config) {
            DYNAMIC_CONFIG.ACTIVATION_COST = data.data.config.ACTIVATION_COST || DYNAMIC_CONFIG.ACTIVATION_COST;
            DYNAMIC_CONFIG.REFERRAL_REWARD = data.data.config.REFERRAL_REWARD || DYNAMIC_CONFIG.REFERRAL_REWARD;
            
            console.log("✅ Cấu hình tải thành công:", DYNAMIC_CONFIG);
        } else {
             // Thử gọi /user/check nếu Admin/stats không có
             const userCheckRes = await fetch(`${WORKER_URL}/user/check?username=test`);
             const userCheckData = await userCheckRes.json();
             if (userCheckData.config) {
                 DYNAMIC_CONFIG.ACTIVATION_COST = userCheckData.config.ACTIVATION_COST || DYNAMIC_CONFIG.ACTIVATION_COST;
                 DYNAMIC_CONFIG.REFERRAL_REWARD = userCheckData.config.REFERRAL_REWARD || DYNAMIC_CONFIG.REFERRAL_REWARD;
             }
        }
        
    } catch (err) {
        console.warn("⚠️ Không thể tải cấu hình động, sử dụng giá trị mặc định:", err.message);
    }
    updateCostDisplay();
}

/**
 * Cập nhật phí và thưởng trên giao diện
 */
function updateCostDisplay() {
    const cost = formatMoney(DYNAMIC_CONFIG.ACTIVATION_COST);
    const reward = formatMoney(DYNAMIC_CONFIG.REFERRAL_REWARD);
    
    // Main Card
    const mainCardInfo = document.querySelector('.input-group small');
    if (mainCardInfo) {
        mainCardInfo.textContent = `Người giới thiệu nhận ${reward}`;
    }
    const startBtn = document.getElementById('start-btn');
    if (startBtn) {
         startBtn.textContent = `✨ Bắt đầu nâng cấp (${cost})`;
    }

    // Dashboard - Activate Friend
}


// =====================
// --- Init App ---
async function initApp() {
    // 1. Tải cấu hình trước
    await fetchConfig(); 
    
    // 2. Xử lý User/Referrer
    const urlParams = new URLSearchParams(window.location.search);
    const referrerFromURL = urlParams.get('referrer') || '';

    if (currentUsername) {
        await handleUser(currentUsername, referrerFromURL);
    } else {
        showLogin(true);
        document.getElementById("user-username").value = '';
        if (referrerFromURL) {
            document.getElementById("referrer").value = referrerFromURL;
        } else {
             document.getElementById("referrer").value = '';
        }
    }
}

// =====================
// --- Login & Logout ---
async function loginUser() {
    const username = document.getElementById("user-username").value.trim();
    if (!username) { alert("Vui lòng nhập Username!"); return; }
    
    localStorage.setItem('locket_user', username);
    currentUsername = username;
    
    const urlParams = new URLSearchParams(window.location.search);
    const referrerFromURL = urlParams.get('referrer') || '';

    await handleUser(username, referrerFromURL);
}

function logout() {
    localStorage.removeItem('locket_user');
    clearPolling();
    currentUsername = null;
    showLogin(true);
    showUpgrade(false);
    showDashboard(false);
    document.getElementById("user-username").value = '';
}

// =====================
// --- Handle User ---
async function handleUser(username, prefillReferrer = '') {
    clearPolling();
    currentUsername = username;
    showLogin(false);
    hideUpgradeElements(); 

    document.getElementById('username').value = username;
    if (prefillReferrer) {
        document.getElementById("referrer").value = prefillReferrer;
    } 

    try {
        const res = await fetch(`${WORKER_URL}/user/check?username=${encodeURIComponent(username)}`);
        const data = await res.json();
        
        document.getElementById('referral-link-display').value =
            `${window.location.origin}/locket-gold/?referrer=${encodeURIComponent(username)}`;

        if (data.ok && (data.user.status === "ACTIVATED" || data.user.status === "GOLD")) {
            showUpgrade(false);
            showDashboard(true);
            loadUserData(username, data.user);
        } else {
            showDashboard(false);
            showUpgrade(true);
            if (data.user?.status === "TXN_USED" || data.user?.status === "RC_FAILED") {
                 document.getElementById("reactivate-btn").style.display = "inline-block";
                 showMessage(document.getElementById("activation-message"), 
                    "📢 Thanh toán đã thành công, nhưng kích hoạt Premium thất bại. Vui lòng bấm 'Nâng cấp lại Gold'.", 
                    "warning");
            }
        }
    } catch (err) {
        console.error(err);
        alert("Lỗi kết nối API Worker!");
        showLogin(true);
    }
}

// =====================
// --- Load Dashboard Data ---
async function loadUserData(username, initialData) {
    const balanceEl = document.getElementById('current-balance');
    const statusEl = document.getElementById('user-status');
    const referralCountEl = document.getElementById('referral-count');
    const statusBox = statusEl.closest('.stat-box');
    
    let user = initialData;

    document.getElementById('welcome-message').textContent = `Xin chào, ${username}!`;
    balanceEl.textContent = 'Đang tải...';
    statusEl.textContent = 'Đang tải...';

    try {
        if (!user) {
            const res = await fetch(`${WORKER_URL}/user/check?username=${encodeURIComponent(username)}`);
            const data = await res.json();
            if (data.ok) user = data.user;
        }

        if (user) {
            balanceEl.textContent = formatMoney(user.balance);
            statusEl.textContent = user.status === 'ACTIVATED' ? 'GOLD' : user.status === 'GOLD' ? '👑 GOLD VIP' : '❌ Chưa kích hoạt';
            statusBox.style.backgroundColor = (user.status === 'ACTIVATED' || user.status === 'GOLD') ? '#e6ffe6' : '#fff3cd';
            referralCountEl.textContent = `(${user.referralCount || 0} lượt giới thiệu thành công)`;
            document.getElementById('reactivate-btn-dashboard').style.display = (user.status === 'ACTIVATED' || user.status === 'GOLD') ? "inline-block" : "none";
        }

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
    
    if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(linkInput.value)
            .then(() => alert("Đã sao chép link giới thiệu:\n" + linkInput.value))
            .catch(err => console.error("Could not copy text: ", err));
    } else {
        document.execCommand('copy');
        alert("Đã sao chép link:\n" + linkInput.value);
    }
}

// =====================
// --- Upgrade VIP (POST /) ---
async function startUpgrade() {
    const username = document.getElementById("username").value.trim();
    const referrer = document.getElementById("referrer").value.trim();
    const messageEl = document.getElementById("activation-message");
    const cost = DYNAMIC_CONFIG.ACTIVATION_COST;

    hideUpgradeElements();
    showMessage(messageEl, "⏳ Đang xử lý...", "warning");

    if (!username) { showMessage(messageEl, "⚠️ Vui lòng nhập username!", "error"); return; }

    try {
        const startBtn = document.getElementById("start-btn");
        startBtn.disabled = true;
        startBtn.textContent = "⏳ Đang xử lý...";

        const res = await fetch(WORKER_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username, referrer })
        });

        const data = await res.json();
        startBtn.disabled = false;
        startBtn.textContent = `✨ Bắt đầu nâng cấp (${formatMoney(cost)})`;

        if (data.ok) {
            clearPolling();
            showMessage(messageEl, 
                `✅ Nâng cấp Gold thành công! 🎉 ${data.referral_info || ''}`, 
                "success"
            );
            
            document.getElementById("install-notice").style.display = "block";
            document.getElementById("download-link").style.display = "inline-block";
            startBtn.style.display = "none";
            document.getElementById("reactivate-btn").style.display = "inline-block";

            setTimeout(() => handleUser(username), 3000); 

        } else if (data.flow === 'PAYMENT_REQUIRED') {
            const substr = data.localIdCode;
            
            document.getElementById("transfer-content").textContent = substr;
            document.getElementById("qr-image").src =
                `https://vietqr.co/api/generate/${QR_BANK_ID}/${QR_ACCOUNT_NO}/${QR_ACCOUNT_NAME}/${cost}/${encodeURIComponent(substr)}?isMask=0&logo=1&style=2&bg=61`;

            document.getElementById("qr-container").style.display = "block";
            startBtn.style.display = "none";
            showMessage(messageEl, `📢 Quét QR để thanh toán ${formatMoney(cost)} với nội dung: ${substr}. Hệ thống sẽ tự kiểm tra.`, "info");

            startPolling(username);
        } else if (data.flow === 'ALREADY_ACTIVATED_PANEL') {
             showMessage(messageEl, "🎉 Bạn đã là Premium! Đang kích hoạt lại dịch vụ. (Chuyển sang Dashboard)", "warning");
             setTimeout(() => handleUser(username), 2000); 
        } 
        else {
            showMessage(messageEl, data.error || data.details || "❌ Có lỗi xảy ra!", "error");
            startBtn.style.display = "inline-block";
        }
    } catch (err) {
        showMessage(messageEl, "❌ Lỗi kết nối API: " + err.message, "error");
        document.getElementById("start-btn").disabled = false;
        document.getElementById("start-btn").textContent = `✨ Bắt đầu nâng cấp (${formatMoney(cost)})`;
    }
}

// =====================
// --- Reactivate Gold (GỌI LẠI POST /) ---
async function reactivate() {
    const username = currentUsername;
    const referrer = document.getElementById("referrer").value.trim();
    
    const isDashboard = document.getElementById('dashboard-view').style.display === 'flex';
    const messageEl = isDashboard 
        ? document.getElementById("dashboard-activation-message")
        : document.getElementById("activation-message");

    if (!messageEl || !username) return;

    const reactivateBtnMain = document.getElementById("reactivate-btn");
    const reactivateBtnDash = document.getElementById("reactivate-btn-dashboard");
    reactivateBtnMain.disabled = true;
    reactivateBtnDash.disabled = true;

    showMessage(messageEl, "⏳ Đang nâng cấp lại...", "warning");

    try {
        const res = await fetch(WORKER_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username, referrer })
        });

        const data = await res.json();
        if (data.ok || data.flow === 'ALREADY_ACTIVATED_PANEL') {
            showMessage(messageEl, "✅ Nâng cấp Gold lại thành công! 🎉", "success");
            await loadUserData(username); 
        } else {
            showMessage(messageEl, data.error || data.details || "❌ Nâng cấp thất bại!", "error");
        }
    } catch (err) {
        showMessage(messageEl, "❌ Lỗi kết nối: " + err.message, "error");
    } finally {
        reactivateBtnMain.disabled = false;
        reactivateBtnDash.disabled = false;
    }
}

// =====================
// --- Activate Premium for friends (POST /user/referral-activate) ---
async function activateFriend() {
    const referred_username = document.getElementById("friend-username").value.trim();
    const messageElement = document.getElementById("dashboard-activation-message");
    const cost = DYNAMIC_CONFIG.ACTIVATION_COST;

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
            showMessage(messageElement, `✅ Đã dùng ${formatMoney(cost)} Gold để kích hoạt Premium cho ${referred_username}`, "success");
            loadUserData(currentUsername);
        } else {
            showMessage(messageElement, data.error || "❌ Không thành công", "error");
        }
    } catch (err) {
        showMessage(messageElement, "❌ Lỗi kết nối: " + err.message, "error");
    }
}

// =====================
// --- Polling (GỌI LẠI POST /) ---
function startPolling(username) {
    console.log(`🔄 Bắt đầu kiểm tra thanh toán cho user: ${username}`);
    clearPolling(); 

    const qrStatusEl = document.querySelector('.qr-status');
    const cost = DYNAMIC_CONFIG.ACTIVATION_COST;
    let dotCount = 0;

    pollInterval = setInterval(async () => {
        try {
            const res = await fetch(WORKER_URL, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username }) 
            });
            
            const data = await res.json();
            
            if (data.ok && data.flow !== 'PAYMENT_REQUIRED') {
                clearPolling();
                qrStatusEl.innerHTML = "✅ **Thanh toán đã được xác nhận!** Đang hoàn tất kích hoạt Premium...";
                
                document.getElementById("qr-container").style.display = "none";
                showMessage(document.getElementById("activation-message"), 
                    `🎉 Thanh toán thành công! Đã lên Gold. ${data.referral_info || ''}`, 
                    "success"
                );
                
                document.getElementById("install-notice").style.display = "block";
                document.getElementById("download-link").style.display = "inline-block";
                document.getElementById("start-btn").style.display = "none";
                document.getElementById("reactivate-btn").style.display = "inline-block";
                
                setTimeout(() => handleUser(username), 3000); 

            } else if (data.flow === 'PAYMENT_REQUIRED') {
                dotCount = (dotCount + 1) % 4;
                qrStatusEl.textContent = `⏳ Đang chờ thanh toán${'.'.repeat(dotCount)}`;
            } else {
                 clearPolling();
                 qrStatusEl.innerHTML = `❌ Lỗi khi chờ xác nhận: ${data.error || 'Vui lòng thử lại'}`;
            }

        } catch (err) {
            console.error("Polling Error:", err);
            dotCount = (dotCount + 1) % 4;
            qrStatusEl.textContent = `❌ Lỗi kết nối khi chờ xác nhận${'.'.repeat(dotCount)}`;
        }
    }, 5000); 
}


// =====================
// --- Start App ---
document.getElementById('reactivate-btn-dashboard').addEventListener('click', reactivate);
document.getElementById('reactivate-btn').addEventListener('click', reactivate);
document.getElementById('start-btn').addEventListener('click', startUpgrade);
document.getElementById('login-view').querySelector('button').addEventListener('click', loginUser);
document.getElementById('dashboard-view').querySelector('.logout').addEventListener('click', logout);
// Gán sự kiện cho nút Kích hoạt bạn bè
document.querySelector('#dashboard-view .action-card button.btn-primary').addEventListener('click', activateFriend);
document.getElementById('copy-link-btn')?.addEventListener('click', copyReferralLink);


window.onload = initApp;
