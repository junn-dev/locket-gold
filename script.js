// ============================================
// FRONTEND JAVASCRIPT CHO LOCKET VIP SYSTEM
// ============================================

// --- CẤU HÌNH CƠ BẢN ---
const WORKER_URL = "https://locket-vip.hungnguyen-junn.workers.dev";
const QR_BANK_ID = "MB";
const QR_ACCOUNT_NO = "09999999900";
const QR_ACCOUNT_NAME = "NGUYEN VAN HUNG";

// Biến toàn cục
let DYNAMIC_CONFIG = {
    ACTIVATION_COST: 20000,
    REFERRAL_REWARD: 5000,
};

let currentUsername = localStorage.getItem('locket_user') || null;
let pollInterval = null;

// =====================
// --- Utilities ---
// =====================

/**
 * Format số tiền theo định dạng Việt Nam
 */
function formatMoney(amount) {
    return new Intl.NumberFormat('vi-VN', { 
        style: 'currency', 
        currency: 'VND' 
    }).format(amount || 0);
}

/**
 * Chuẩn hóa username: xóa ký tự '@' ở đầu nếu có
 */
function cleanUsername(username) {
    if (!username) return '';
    let cleaned = username.trim();
    if (cleaned.startsWith('@')) {
        cleaned = cleaned.substring(1);
    }
    return cleaned;
}

/**
 * Hiển thị view cụ thể và ẩn các view khác
 */
function showView(view) {
    document.getElementById('login-view').classList.add('hidden');
    document.getElementById('main-card').classList.add('hidden');
    document.getElementById('dashboard-view').classList.add('hidden');
    document.getElementById(view).classList.remove('hidden');
}

/**
 * Hiển thị thông báo
 */
function showMessage(el, msg, type) {
    el.innerHTML = msg;
    el.className = `alert alert-${type}`;
    el.classList.remove('hidden');
}

/**
 * Ẩn thông báo
 */
function hideMessage(el) {
    if (el) el.classList.add('hidden');
}

/**
 * Dừng polling
 */
function clearPolling() {
    if (pollInterval) {
        clearInterval(pollInterval);
    }
    pollInterval = null;
}

// =====================
// --- Dynamic Config ---
// =====================

/**
 * Lấy cấu hình động từ API
 */
async function fetchConfig() {
    let configData = null;

    // Thử lấy từ admin/stats
    try {
        const adminRes = await fetch(`${WORKER_URL}/admin/stats`);
        const adminData = await adminRes.json();
        if (adminData.ok && adminData.data && adminData.data.config) {
            configData = adminData.data.config;
        }
    } catch (err) {
        console.warn("⚠️ Không thể tải cấu hình từ /admin/stats.");
    }

    // Nếu không có, thử từ user/check
    if (!configData) {
        try {
            const userCheckRes = await fetch(`${WORKER_URL}/user/check?username=__system__`);
            const userCheckData = await userCheckRes.json();
            if (userCheckData.config) {
                configData = userCheckData.config;
            }
        } catch (err) {
            console.warn("⚠️ Không thể tải cấu hình từ /user/check.");
        }
    }

    // Cập nhật config nếu có
    if (configData) {
        DYNAMIC_CONFIG.ACTIVATION_COST = configData.ACTIVATION_COST || DYNAMIC_CONFIG.ACTIVATION_COST;
        DYNAMIC_CONFIG.REFERRAL_REWARD = configData.REFERRAL_REWARD || DYNAMIC_CONFIG.REFERRAL_REWARD;
        console.log("✅ Cấu hình tải thành công:", DYNAMIC_CONFIG);
    }

    // 🔥 Đảm bảo updateCostDisplay được gọi ngay sau khi config được tải
    updateCostDisplay(); 
}

/**
 * Cập nhật hiển thị chi phí và thưởng
 */
function updateCostDisplay() {
    const cost = formatMoney(DYNAMIC_CONFIG.ACTIVATION_COST);
    const reward = formatMoney(DYNAMIC_CONFIG.REFERRAL_REWARD);

    // Main Card
    const hint = document.querySelector('#main-card .input-hint');
    if (hint) {
        hint.textContent = `Người giới thiệu nhận ${reward}`;
    }

    const startBtn = document.getElementById('start-btn');
    if (startBtn && !startBtn.disabled) {
        // Chỉ cập nhật nội dung nút nếu không đang ở trạng thái loading (disabled)
        startBtn.innerHTML = `Bắt đầu nâng cấp <span style="opacity:0.8">(${cost})</span>`;
    }

    // Dashboard
    const friendCost = document.getElementById('friend-activation-cost');
    if (friendCost) {
        friendCost.textContent = cost;
    }
}

// =====================
// --- Init App ---
// =====================

/**
 * Khởi tạo ứng dụng
 */
async function initApp() {
    // 💥 Dùng await để đảm bảo code dừng và chờ cấu hình tải xong
    await fetchConfig();
    
    // updateCostDisplay() đã được gọi bên trong fetchConfig()
    // Không cần gọi lại ở đây trừ khi bạn muốn chắc chắn tuyệt đối
    // updateCostDisplay(); 

    const urlParams = new URLSearchParams(window.location.search);
    const referrerFromURL = cleanUsername(urlParams.get('referrer') || '');

    if (currentUsername) {
        await handleUser(currentUsername, referrerFromURL);
    } else {
        showView('login-view');
        document.getElementById('user-username').value = '';
        if (referrerFromURL) {
            document.getElementById('referrer').value = referrerFromURL;
        }
    }
}

// =====================
// --- Login & Logout ---
// =====================

/**
 * Xử lý đăng nhập user
 */
async function loginUser() {
    const rawUsername = document.getElementById('user-username').value;
    const username = cleanUsername(rawUsername);

    if (!username) {
        alert("Vui lòng nhập Username!");
        return;
    }

    localStorage.setItem('locket_user', username);
    currentUsername = username;

    const urlParams = new URLSearchParams(window.location.search);
    const referrerFromURL = cleanUsername(urlParams.get('referrer') || '');

    await handleUser(username, referrerFromURL);
}

/**
 * Đăng xuất
 */
function logout() {
    localStorage.removeItem('locket_user');
    clearPolling();
    currentUsername = null;
    showView('login-view');
    document.getElementById('user-username').value = '';
    document.getElementById('referrer').value = '';
}

// =====================
// --- Handle User ---
// =====================

/**
 * Xử lý user sau khi login
 */
async function handleUser(username, prefillReferrer = '') {
    clearPolling();
    currentUsername = username;

    // Tải lại config và cập nhật hiển thị giá
    await fetchConfig();

    // Đặt username vào form
    document.getElementById('username').value = username;
    document.getElementById('username').readOnly = false;

    if (prefillReferrer) {
        document.getElementById('referrer').value = prefillReferrer;
    }

    try {
        const res = await fetch(`${WORKER_URL}/user/check?username=${encodeURIComponent(username)}`);
        const data = await res.json();

        // Tạo referral link
        document.getElementById('referral-link-display').value =
            `${window.location.origin}${window.location.pathname}?referrer=${encodeURIComponent(username)}`;

        if (data.ok && (data.user.status === "ACTIVATED" || data.user.status === "GOLD")) {
            // Đã kích hoạt -> Dashboard
            showView('dashboard-view');
            loadUserData(username, data.user);
        } else {
            // Chưa kích hoạt -> Upgrade view
            showView('main-card');
            hideUpgradeElements();

            // Hiển thị các nút phù hợp với status
            if (data.user?.status === "TXN_USED" || data.user?.status === "RC_FAILED") {
                document.getElementById('install-notice').classList.remove('hidden');
                document.getElementById('download-link').classList.remove('hidden');
                document.getElementById('reactivate-btn').classList.remove('hidden');
                showMessage(
                    document.getElementById('activation-message'),
                    "📢 Thanh toán thành công nhưng kích hoạt thất bại. Vui lòng nâng cấp lại.",
                    "warning"
                );
            }
        }
    } catch (err) {
        console.error(err);
        alert("Lỗi kết nối API Worker!");
        showView('login-view');
    }
}

/**
 * Ẩn các phần tử nâng cấp
 */
function hideUpgradeElements() {
    document.getElementById('qr-container').classList.add('hidden');
    document.getElementById('install-notice').classList.add('hidden');
    document.getElementById('download-link').classList.add('hidden');
    document.getElementById('reactivate-btn').classList.add('hidden');
    document.getElementById('start-btn').classList.remove('hidden');
    document.getElementById('start-btn').disabled = false;
    hideMessage(document.getElementById('activation-message'));
    // Luôn cập nhật giá khi reset view để đảm bảo giá mới nhất
    updateCostDisplay(); 
}

// =====================
// --- Dashboard ---
// =====================

/**
 * Load dữ liệu user cho dashboard
 */
async function loadUserData(username, initialData) {
    let user = initialData;

    document.getElementById('welcome-message').textContent = `Xin chào, ${username}!`;

    try {
        if (!user) {
            const res = await fetch(`${WORKER_URL}/user/check?username=${encodeURIComponent(username)}`);
            const data = await res.json();
            if (data.ok) user = data.user;
        }

        if (user) {
            // Cập nhật số dư
            document.getElementById('current-balance').textContent = formatMoney(user.balance);

            // Cập nhật trạng thái
            const statusText = user.status === 'GOLD' ? '👑 GOLD VIP' :
                user.status === 'ACTIVATED' ? '✨ GOLD' : '❌ Chưa kích hoạt';
            document.getElementById('user-status').textContent = statusText;

            // Số lượt giới thiệu
            document.getElementById('referral-count').textContent =
                `${user.referralCount || 0} lượt giới thiệu`;

            // Hiển thị/ẩn các nút
            const reactivateBtn = document.getElementById('reactivate-btn-dashboard');
            const downloadBtn = document.getElementById('download-link-dashboard');

            if (user.status === 'ACTIVATED' || user.status === 'GOLD') {
                reactivateBtn?.classList.remove('hidden');
                downloadBtn?.classList.remove('hidden');
            } else {
                reactivateBtn?.classList.add('hidden');
                downloadBtn?.classList.add('hidden');
            }
        }

        // Cập nhật chi phí/thưởng trong Dashboard
        updateCostDisplay(); 
    } catch (err) {
        console.error(err);
        document.getElementById('current-balance').textContent = 'Lỗi';
        document.getElementById('user-status').textContent = 'Lỗi kết nối';
    }
}

/**
 * Copy referral link
 */
function copyReferralLink() {
    const input = document.getElementById('referral-link-display');
    input.select();
    input.setSelectionRange(0, 99999);

    if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(input.value)
            .then(() => alert("✅ Đã sao chép link giới thiệu!"))
            .catch(err => {
                console.error("Could not copy:", err);
                document.execCommand('copy');
                alert("✅ Đã sao chép link!");
            });
    } else {
        document.execCommand('copy');
        alert("✅ Đã sao chép link!");
    }
}

// =====================
// --- Upgrade Flow ---
// =====================

/**
 * Bắt đầu nâng cấp VIP
 */
async function startUpgrade() {
    const rawUsername = document.getElementById('username').value;
    const username = cleanUsername(rawUsername);
    const referrer = cleanUsername(document.getElementById('referrer').value);
    const messageEl = document.getElementById('activation-message');
    const cost = DYNAMIC_CONFIG.ACTIVATION_COST;

    if (!username) {
        showMessage(messageEl, "⚠️ Vui lòng nhập username!", "error");
        return;
    }

    // Cập nhật localStorage
    localStorage.setItem('locket_user', username);
    currentUsername = username;

    // Disable button và hiển thị loading
    const startBtn = document.getElementById('start-btn');
    startBtn.disabled = true;
    startBtn.innerHTML = '<span class="loading-spinner"></span> Đang xử lý...';

    hideUpgradeElements(); // Sẽ gọi updateCostDisplay() ở cuối

    showMessage(messageEl, "⏳ Đang xử lý yêu cầu...", "info");

    try {
        const res = await fetch(WORKER_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username, referrer })
        });

        const data = await res.json();

        if (data.ok) {
            // Thành công
            clearPolling();
            showMessage(
                messageEl,
                `✅ Nâng cấp Gold thành công! 🎉 ${data.referral_info || ''}`,
                "success"
            );

            document.getElementById('install-notice').classList.remove('hidden');
            document.getElementById('download-link').classList.remove('hidden');
            startBtn.classList.add('hidden');
            document.getElementById('reactivate-btn').classList.remove('hidden');

            setTimeout(() => handleUser(username), 3000);

        } else if (data.flow === 'PAYMENT_REQUIRED') {
            // Cần thanh toán
            const substr = data.localIdCode;

            document.getElementById('transfer-content').textContent = substr;
            document.getElementById('qr-image').src =
                `https://vietqr.co/api/generate/${QR_BANK_ID}/${QR_ACCOUNT_NO}/${QR_ACCOUNT_NAME}/${cost}/${encodeURIComponent(substr)}?isMask=0&logo=1&style=2&bg=61`;

            document.getElementById('qr-container').classList.remove('hidden');
            startBtn.classList.add('hidden');
            showMessage(
                messageEl,
                `📢 Quét QR để thanh toán ${formatMoney(cost)} với nội dung: ${substr}. Hệ thống sẽ tự kiểm tra.`,
                "info"
            );

            startPolling(username);

        } else if (data.flow === 'ALREADY_ACTIVATED_PANEL') {
            showMessage(
                messageEl,
                "🎉 Bạn đã là Premium! Đang kích hoạt lại dịch vụ. (Chuyển sang Dashboard)",
                "warning"
            );
            setTimeout(() => handleUser(username), 2000);

        } else {
            // Lỗi khác
            showMessage(messageEl, data.error || data.details || "❌ Có lỗi xảy ra!", "error");
            startBtn.classList.remove('hidden');
            startBtn.disabled = false;
            updateCostDisplay();
        }
    } catch (err) {
        showMessage(messageEl, "❌ Lỗi kết nối API: " + err.message, "error");
        startBtn.disabled = false;
        updateCostDisplay();
    }
}

/**
 * Nâng cấp lại Gold
 */
async function reactivate() {
    const username = currentUsername;
    const referrer = cleanUsername(document.getElementById('referrer').value);

    const isDashboard = document.getElementById('dashboard-view').classList.contains('hidden') === false;
    const messageEl = isDashboard
        ? document.getElementById('dashboard-activation-message')
        : document.getElementById('activation-message');

    if (!messageEl || !username) return;

    const reactivateBtnMain = document.getElementById('reactivate-btn');
    const reactivateBtnDash = document.getElementById('reactivate-btn-dashboard');
    if (reactivateBtnMain) reactivateBtnMain.disabled = true;
    if (reactivateBtnDash) reactivateBtnDash.disabled = true;

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
            
            if (isDashboard) {
                await loadUserData(username);
            } else {
                setTimeout(() => handleUser(username), 2000);
            }
        } else {
            showMessage(messageEl, data.error || data.details || "❌ Nâng cấp thất bại!", "error");
        }
    } catch (err) {
        showMessage(messageEl, "❌ Lỗi kết nối: " + err.message, "error");
    } finally {
        if (reactivateBtnMain) reactivateBtnMain.disabled = false;
        if (reactivateBtnDash) reactivateBtnDash.disabled = false;
    }
}

/**
 * Kích hoạt Premium cho bạn bè
 */
async function activateFriend() {
    const referred_username = cleanUsername(document.getElementById('friend-username').value);
    const messageElement = document.getElementById('dashboard-activation-message');

    if (!referred_username) {
        showMessage(messageElement, "⚠️ Vui lòng nhập Username bạn bè.", "error");
        return;
    }

    showMessage(messageElement, "⏳ Đang xử lý...", "warning");

    try {
        const res = await fetch(`${WORKER_URL}/user/referral-activate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                referrer_username: currentUsername,
                referred_username
            })
        });

        const data = await res.json();

        if (data.ok) {
            showMessage(
                messageElement,
                `✅ Đã dùng ${formatMoney(DYNAMIC_CONFIG.ACTIVATION_COST)} Gold để kích hoạt Premium cho ${referred_username}`,
                "success"
            );
            document.getElementById('friend-username').value = '';
            loadUserData(currentUsername);
        } else {
            showMessage(messageElement, data.error || "❌ Không thành công", "error");
        }
    } catch (err) {
        showMessage(messageElement, "❌ Lỗi kết nối: " + err.message, "error");
    }
}

// =====================
// --- Polling ---
// =====================

/**
 * Bắt đầu polling để kiểm tra thanh toán (chỉ giữ QR và không gián đoạn)
 */
function startPolling(username) {
    console.log(`🔄 Bắt đầu kiểm tra thanh toán cho user: ${username}`);
    clearPolling();

    const qrStatusEl = document.querySelector('.qr-status');
    const messageEl = document.getElementById('activation-message');
    let dotCount = 0;

    pollInterval = setInterval(async () => {
        try {
            // Lấy lại trạng thái user để kiểm tra thanh toán đã xong chưa
            const res = await fetch(`${WORKER_URL}/user/check?username=${encodeURIComponent(username)}`);
            const data = await res.json();
            
            // --- TRẠNG THÁI 1: THÀNH CÔNG (ACTIVATED/GOLD) ---
            if (data.ok && (data.user?.status === 'ACTIVATED' || data.user?.status === 'GOLD')) {
                // Thanh toán thành công
                clearPolling();
                qrStatusEl.innerHTML = "✅ **Thanh toán đã được xác nhận!** Đang hoàn tất kích hoạt Premium...";

                document.getElementById('qr-container').classList.add('hidden');
                showMessage(
                    messageEl,
                    `🎉 Thanh toán thành công! Đã lên Gold. ${data.referral_info || ''}`,
                    "success"
                );

                document.getElementById('install-notice').classList.remove('hidden');
                document.getElementById('download-link').classList.remove('hidden');
                
                // Ẩn nút Start và hiển thị nút Reactivate
                const startBtn = document.getElementById('start-btn');
                startBtn.classList.add('hidden');
                document.getElementById('reactivate-btn').classList.remove('hidden');

                setTimeout(() => handleUser(username), 3000);
                return; // Dừng Polling

            } 
            
            // --- TRẠNG THÁI 2: LỖI THẤT BẠI HOÀN TOÀN (RC_FAILED) ---
            // Đây là lỗi xảy ra sau khi giao dịch đã qua, cần phải dừng flow
            else if (data.ok && data.user?.status === 'RC_FAILED') {
                 // Lỗi kích hoạt sau khi thanh toán
                clearPolling();
                qrStatusEl.innerHTML = `❌ Lỗi kích hoạt! Vui lòng liên hệ hỗ trợ.`;
                
                // Hiển thị lại nút nâng cấp và ẩn QR
                document.getElementById('qr-container').classList.add('hidden');
                const startBtn = document.getElementById('start-btn');
                startBtn.classList.remove('hidden');
                startBtn.disabled = false;
                updateCostDisplay();
                
                showMessage(
                    messageEl,
                    `❌ Lỗi kích hoạt sau khi thanh toán. Vui lòng thử lại hoặc liên hệ hỗ trợ!`,
                    "error"
                );
                return; // Dừng Polling

            }
            
            // --- TRẠNG THÁI 3: VẪN CHỜ (KHÔNG THÀNH CÔNG VÀ KHÔNG THẤT BẠI HOÀN TOÀN) ---
            else {
                dotCount = (dotCount + 1) % 4;
                
                // Bỏ qua việc hiển thị lỗi API tạm thời, chỉ hiển thị "Đang chờ thanh toán"
                qrStatusEl.textContent = `⏳ Đang chờ thanh toán${'.'.repeat(dotCount)}`;
            }

        } catch (err) {
            // --- TRẠNG THÁI 4: LỖI KẾT NỐI (NETWORK) ---
            // KHÔNG DỪNG POLLING, chỉ thông báo nhỏ và tiếp tục thử
            console.error("Polling Network Error:", err);
            dotCount = (dotCount + 1) % 4;
            qrStatusEl.textContent = `❌ Lỗi kết nối mạng (Tự động thử lại)${'.'.repeat(dotCount)}`;
            
            // Ẩn thông báo lỗi lớn nếu nó đang hiển thị
            hideMessage(messageEl); 
            
            // Đảm bảo QR container vẫn hiển thị
            document.getElementById('qr-container').classList.remove('hidden'); 
            
            // Đảm bảo nút Start đang ẩn
            document.getElementById('start-btn').classList.add('hidden');
        }
    }, 5000);
}

// =====================
// --- Start App ---
// =====================

window.onload = initApp;
