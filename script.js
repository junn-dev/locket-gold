// ============================================
// LOCKET VIP SYSTEM - PROFESSIONAL VERSION
// VERSION: Optimized Frontend (FIXED UX)
// ============================================

// --- CONFIG & CONSTANTS ---
const WORKER_URL = "https://locket-vip.hungnguyen-junn.workers.dev";
const QR_BANK_ID = "MB";
const QR_ACCOUNT_NO = "09999999900";
const QR_ACCOUNT_NAME = "NGUYEN VAN HUNG";
const POLL_INTERVAL_MS = 5000; // 5 giây

let DYNAMIC_CONFIG = {
    ACTIVATION_COST: 20000,
    REFERRAL_REWARD: 5000,
};

let currentUsername = localStorage.getItem('locket_user') || null;
let pollTimer = null; // Đổi tên biến interval thành timer để dễ hiểu hơn
let configLoaded = false;

// =====================
// UTILITIES
// =====================
function formatMoney(amount) {
    return new Intl.NumberFormat('vi-VN', { 
        style: 'currency', 
        currency: 'VND' 
    }).format(amount || 0);
}

function cleanUsername(username) {
    if (!username) return '';
    let cleaned = username.trim();
    if (cleaned.startsWith('@')) {
        cleaned = cleaned.substring(1);
    }
    // Regex: Chỉ giữ lại chữ cái, số, gạch dưới (_) và dấu chấm (.)
    cleaned = cleaned.replace(/[^a-zA-Z0-9_.]/g, ''); 
    return cleaned;
}

function showView(view) {
    ['login-view', 'main-card', 'dashboard-view'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.add('hidden');
    });
    const targetEl = document.getElementById(view);
    if (targetEl) targetEl.classList.remove('hidden');
}

function showMessage(el, msg, type) {
    if (!el) return;
    const icons = {
        success: '✅',
        warning: '⚠️',
        error: '❌',
        info: 'ℹ️'
    };
    el.innerHTML = `<div style="display:flex;align-items:flex-start;gap:12px;">
        <span style="font-size:20px;flex-shrink:0;">${icons[type]}</span>
        <div>${msg}</div>
    </div>`;
    el.className = `alert alert-${type}`;
    el.classList.remove('hidden');
}

function hideMessage(el) {
    if (el) el.classList.add('hidden');
}

function clearPolling() {
    if (pollTimer) clearInterval(pollTimer);
    pollTimer = null;
    console.log("⏸️ Polling dừng.");
}

function showLoadingScreen(show = true) {
    const loadingEl = document.getElementById('global-loading'); 
    if (loadingEl) {
        loadingEl.classList.toggle('hidden', !show);
    }
}

function copyToClipboard(elementId, successMessage = "✅ Đã sao chép!") {
    const el = document.getElementById(elementId);
    if (!el) return;

    const textToCopy = el.textContent || el.value;

    if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(textToCopy)
            .then(() => alert(successMessage))
            .catch(() => fallbackCopy(textToCopy, successMessage));
    } else {
        fallbackCopy(textToCopy, successMessage);
    }
}

function fallbackCopy(textToCopy, successMessage) {
    const tempInput = document.createElement('textarea');
    tempInput.value = textToCopy;
    document.body.appendChild(tempInput);
    tempInput.select();
    document.execCommand('copy');
    document.body.removeChild(tempInput);
    alert(successMessage);
}

// =====================
// CONFIG & DISPLAY
// =====================
async function fetchConfig() {
    if (configLoaded) return;
    
    let configData = null;

    try {
        // Ưu tiên /user/config vì nó nhẹ nhất
        const res = await fetch(`${WORKER_URL}/user/config`); 
        const data = await res.json();
        if (data.ok && data.config) configData = data.config;
    } catch (err) {
        console.warn("⚠️ Không thể tải config từ /user/config:", err);
    }
    
    if (configData) {
        DYNAMIC_CONFIG.ACTIVATION_COST = parseInt(configData.ACTIVATION_COST) || DYNAMIC_CONFIG.ACTIVATION_COST;
        DYNAMIC_CONFIG.REFERRAL_REWARD = parseInt(configData.REFERRAL_REWARD) || DYNAMIC_CONFIG.REFERRAL_REWARD;
        console.log("✅ Config loaded:", DYNAMIC_CONFIG);
        configLoaded = true;
    }
    
    updateCostDisplay();
}

function updateCostDisplay() {
    const cost = formatMoney(DYNAMIC_CONFIG.ACTIVATION_COST);
    const reward = formatMoney(DYNAMIC_CONFIG.REFERRAL_REWARD);

    // Main card hint
    const hint = document.getElementById('referrer-reward');
    if (hint) {
        hint.innerHTML = `💡 Người giới thiệu nhận <strong>${reward}</strong>`;
    }

    // Start Button
    const startBtn = document.getElementById('start-btn');
    if (startBtn) {
        const content = `Bắt đầu nâng cấp <small style="opacity:0.8;font-size:14px;">(${cost})</small>`;
        const span = startBtn.querySelector('span:last-child');
        if (span) span.innerHTML = content;
    }

    // Reactivate Buttons
    const reactivateContent = `Nâng cấp lại`;
    [document.getElementById('reactivate-btn'), document.getElementById('reactivate-btn-dashboard')].forEach(btn => {
        if (btn) {
            const span = btn.querySelector('span:last-child');
            if (span) span.innerHTML = reactivateContent;
        }
    });

    // Dashboard
    const friendCost = document.getElementById('friend-activation-cost');
    if (friendCost) friendCost.textContent = cost;

    const referralReward = document.getElementById('referral-reward-amount');
    if (referralReward) referralReward.textContent = reward;
}

// =====================
// INIT & AUTH
// =====================
async function initApp() {
    showLoadingScreen(true);
    await fetchConfig();
    
    const urlParams = new URLSearchParams(window.location.search);
    const referrerFromURL = cleanUsername(urlParams.get('referrer') || '');

    if (currentUsername) {
        await handleUser(currentUsername, referrerFromURL);
    } else {
        showView('login-view');
        const userUsernameEl = document.getElementById('user-username');
        if (userUsernameEl) userUsernameEl.value = '';
    }

    updateCostDisplay();
    showLoadingScreen(false);
}

async function loginUser() {
    const username = cleanUsername(document.getElementById('user-username')?.value);

    if (!username) {
        alert("⚠️ Vui lòng nhập username!");
        return;
    }

    localStorage.setItem('locket_user', username);
    currentUsername = username;

    const urlParams = new URLSearchParams(window.location.search);
    const referrerFromURL = cleanUsername(urlParams.get('referrer') || '');

    await fetchConfig(); // Tải lại config nếu chưa load
    await handleUser(username, referrerFromURL);
}

function logout() {
    localStorage.removeItem('locket_user');
    clearPolling();
    currentUsername = null;
    showView('login-view');
    const userUsernameEl = document.getElementById('user-username');
    if (userUsernameEl) userUsernameEl.value = '';
    
    fetchConfig().then(() => updateCostDisplay());
}

// =====================
// USER HANDLER (Luồng chính)
// =====================
function hideUpgradeElements() {
    ['qr-container', 'install-notice', 'download-link', 'reactivate-btn'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.add('hidden');
    });
    
    const referrerContainer = document.getElementById('referrer-container');
    if (referrerContainer) referrerContainer.classList.remove('hidden');

    const startBtn = document.getElementById('start-btn');
    if (startBtn) {
        startBtn.classList.remove('hidden');
        startBtn.disabled = false;
    }

    hideMessage(document.getElementById('activation-message'));
    updateCostDisplay();
}

async function handleUser(username, prefillReferrer = '') {
    clearPolling();
    currentUsername = username;
    const messageEl = document.getElementById('activation-message');
    
    showLoadingScreen(true);

    // FIX: Xóa tham số referrer khỏi URL sau khi đã đọc
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('referrer')) {
        urlParams.delete('referrer');
        const newUrl = `${window.location.pathname}${urlParams.toString() ? '?' + urlParams.toString() : ''}${window.location.hash}`;
        window.history.replaceState({}, document.title, newUrl);
    }
    
    if (!configLoaded) await fetchConfig();

    // Cập nhật giá trị input
    const usernameInput = document.getElementById('username');
    if (usernameInput) {
        usernameInput.value = username;
        usernameInput.readOnly = false;
    }

    const referrerInput = document.getElementById('referrer');
    if (prefillReferrer && referrerInput) {
        referrerInput.value = prefillReferrer;
    }

    try {
        const res = await fetch(`${WORKER_URL}/user/check?username=${encodeURIComponent(username)}`);
        const data = await res.json();

        if (data.config) {
            DYNAMIC_CONFIG.ACTIVATION_COST = parseInt(data.config.ACTIVATION_COST) || DYNAMIC_CONFIG.ACTIVATION_COST;
            DYNAMIC_CONFIG.REFERRAL_REWARD = parseInt(data.config.REFERRAL_REWARD) || DYNAMIC_CONFIG.REFERRAL_REWARD;
            updateCostDisplay();
        }

        const referralLink = document.getElementById('referral-link-display');
        if (referralLink) {
            referralLink.value = `${window.location.origin}${window.location.pathname}?referrer=${encodeURIComponent(username)}`;
        }

        if (data.ok && (data.user.status === "ACTIVATED" || data.user.status === "GOLD")) {
            // Trường hợp 1: Đã kích hoạt (ACTIVATED/GOLD)
            showView('dashboard-view');
            hideMessage(messageEl);
            await loadUserData(username, data.user);

        } else if (data.user?.status === "TXN_USED" || data.user?.status === "RC_FAILED" || data.user?.status === "PENDING") {
            // Trường hợp 2: Đã thanh toán, bị lỗi kích hoạt, hoặc đang PENDING (cần thanh toán/kích hoạt lại)
            // Gọi startUpgrade với cờ isRecheck để kích hoạt luồng QR/Reactivate mà không cần POST lại
            await startUpgrade(true);
            
        } else {
            // Trường hợp 3: Chưa đăng ký/Chưa có record (UNREGISTERED)
            showView('main-card');
            hideUpgradeElements();
            hideMessage(messageEl);
        }

    } catch (err) {
        console.error("❌ Lỗi API khi check user:", err);
        alert("Lỗi kết nối! Vui lòng thử lại.");
        showView('login-view');
    } finally {
        updateCostDisplay();
        showLoadingScreen(false);
    }
}


// =====================
// UPGRADE & REACTIVATE
// =====================
async function startUpgrade(isRecheck = false) {
    const username = cleanUsername(document.getElementById('username')?.value);
    const referrer = cleanUsername(document.getElementById('referrer')?.value || '');
    const messageEl = document.getElementById('activation-message');
    
    if (!username) {
        showMessage(messageEl, "Vui lòng nhập username!", "error");
        return;
    }

    localStorage.setItem('locket_user', username);
    currentUsername = username;

    await fetchConfig();
    const cost = DYNAMIC_CONFIG.ACTIVATION_COST;

    const startBtn = document.getElementById('start-btn');
    
    if (!isRecheck) { 
        if (startBtn) {
            startBtn.disabled = true;
            startBtn.innerHTML = '<div class="spinner"></div><span>Đang xử lý...</span>';
        }
    }
    
    const referrerContainer = document.getElementById('referrer-container');

    try {
        const endpoint = isRecheck ? `${WORKER_URL}/user/check?username=${encodeURIComponent(username)}` : WORKER_URL;
        
        const fetchOptions = isRecheck ? { method: "GET" } : {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username, referrer })
        };
        
        const res = await fetch(endpoint, fetchOptions);

        const data = await res.json();
        
        clearPolling(); 
        
        if (data.ok && (data.flow === 'ACTIVATED_SUCCESS' || data.user?.status === 'ACTIVATED' || data.user?.status === 'GOLD')) {
            // Trường hợp 1: Kích hoạt thành công
            showMessage(
                messageEl,
                `<strong>Nâng cấp Gold thành công! 🎉</strong><br>${data.referral_info || ''}`,
                "success"
            );

            document.getElementById('install-notice')?.classList.remove('hidden');
            document.getElementById('download-link')?.classList.remove('hidden');
            if (startBtn) startBtn.classList.add('hidden');
            document.getElementById('reactivate-btn')?.classList.remove('hidden');
            
            if (referrerContainer) referrerContainer.classList.add('hidden');

            setTimeout(() => handleUser(username), 3000);

        } else if (data.flow === 'PAYMENT_REQUIRED') {
            // Trường hợp 2: Yêu cầu thanh toán (Hiển thị QR)
            const substr = data.localIdCode;
            const qrImage = document.getElementById('qr-image');

            if (qrImage) {
                qrImage.src = `https://vietqr.co/api/generate/${QR_BANK_ID}/${QR_ACCOUNT_NO}/${QR_ACCOUNT_NAME}/${cost}/${encodeURIComponent(substr)}?isMask=0&logo=1&style=2&bg=61`;
            }

            document.getElementById('qr-container')?.classList.remove('hidden');
            if (startBtn) startBtn.classList.add('hidden');
            
            if (referrerContainer) referrerContainer.classList.add('hidden');
            
            // Bắt đầu polling để kiểm tra giao dịch
            startPolling(username, false); 

        } else if (data.flow === 'ALREADY_ACTIVATED_PANEL') {
            // Trường hợp 3: Đã Premium
            showMessage(
                messageEl,
                "<strong>Bạn đã là Premium!</strong><br>Đang chuyển sang Dashboard...",
                "success"
            );
            setTimeout(() => handleUser(username), 2000);

        } else if (data.user?.status === "TXN_USED" || data.user?.status === "RC_FAILED" || data.user?.status === "PENDING") {
            // Trường hợp 4: Đã thanh toán nhưng chưa kích hoạt thành công, hoặc đang PENDING (không tìm thấy QR code trong data.flow=PAYMENT_REQUIRED)
            // Hiển thị nút reactivate/thông báo
            showView('main-card');
            hideUpgradeElements(); 

            startPolling(username, true); // Bắt đầu polling để check chuyển trạng thái
        }
        else {
            // Trường hợp 5: Lỗi khác 
            showMessage(messageEl, data.error || data.details || "Có lỗi xảy ra!", "error");
            if (startBtn) {
                startBtn.classList.remove('hidden');
                startBtn.disabled = false;
                updateCostDisplay();
            }
        }
    } catch (err) {
        showMessage(messageEl, `Lỗi kết nối: ${err.message}`, "error");
    } finally {
        if (startBtn && !isRecheck) {
            startBtn.disabled = false;
            updateCostDisplay();
        }
    }
}

async function reactivate() {
    const username = currentUsername;
    const referrer = cleanUsername(document.getElementById('referrer')?.value || '');

    const isDashboard = !document.getElementById('dashboard-view')?.classList.contains('hidden');
    const messageEl = isDashboard
        ? document.getElementById('dashboard-activation-message')
        : document.getElementById('activation-message');

    if (!messageEl || !username) return;

    const btns = [
        document.getElementById('reactivate-btn'),
        document.getElementById('reactivate-btn-dashboard')
    ];
    btns.forEach(btn => { if (btn) btn.disabled = true; });

    showMessage(messageEl, "Đang nâng cấp lại...", "warning");

    try {
        // Gửi POST request tới main flow, backend sẽ cố gắng kích hoạt lại RevenueCat
        const res = await fetch(WORKER_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username, referrer })
        });

        const data = await res.json();
        clearPolling();

        if (data.ok || data.flow === 'ALREADY_ACTIVATED_PANEL') {
            showMessage(messageEl, "<strong>Nâng cấp Gold thành công! 🎉</strong>", "success");
            
            if (isDashboard) {
                await loadUserData(username);
            } else {
                setTimeout(() => handleUser(username), 2000);
            }
        } else {
            showMessage(messageEl, data.error || data.details || "Nâng cấp thất bại!", "error");
        }
    } catch (err) {
        showMessage(messageEl, `Lỗi kết nối: ${err.message}`, "error");
    } finally {
        btns.forEach(btn => { if (btn) btn.disabled = false; });
        updateCostDisplay();
    }
}

// =====================
// DASHBOARD
// =====================
async function loadUserData(username, initialData = null) {
    let user = initialData;

    const welcomeMsg = document.getElementById('welcome-message');
    if (welcomeMsg) welcomeMsg.textContent = `Xin chào, ${username}!`;
    
    const balanceEl = document.getElementById('current-balance');
    if (balanceEl) balanceEl.textContent = '...';

    try {
        if (!user) {
            const res = await fetch(`${WORKER_URL}/user/check?username=${encodeURIComponent(username)}`);
            const data = await res.json();
            if (data.ok) {
                user = data.user;
                if (data.config) {
                    DYNAMIC_CONFIG.ACTIVATION_COST = parseInt(data.config.ACTIVATION_COST) || DYNAMIC_CONFIG.ACTIVATION_COST;
                    DYNAMIC_CONFIG.REFERRAL_REWARD = parseInt(data.config.REFERRAL_REWARD) || DYNAMIC_CONFIG.REFERRAL_REWARD;
                }
            }
        }

        if (user) {
            if (balanceEl) balanceEl.textContent = formatMoney(user.balance);

            const statusEl = document.getElementById('user-status');
            if (statusEl) {
                const statusText = user.status === 'GOLD' ? '👑 GOLD' :
                    user.status === 'ACTIVATED' ? '✨ GOLD' : '❌ Chưa kích hoạt';
                statusEl.textContent = statusText;
            }

            const referralCount = document.getElementById('referral-count');
            if (referralCount) {
                referralCount.innerHTML = `💎 ${user.referralCount || 0} lượt giới thiệu`;
            }

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

        updateCostDisplay();
    } catch (err) {
        console.error("❌ Lỗi load user data:", err);
        if (balanceEl) balanceEl.textContent = 'Lỗi';
        const statusEl = document.getElementById('user-status');
        if (statusEl) statusEl.textContent = 'Lỗi kết nối';
    }
}

function copyReferralLink() {
    copyToClipboard('referral-link-display', "✅ Đã sao chép link giới thiệu!");
}

async function activateFriend() {
    const referred_username = cleanUsername(document.getElementById('friend-username')?.value || '');
    const messageEl = document.getElementById('dashboard-activation-message');
    const cost = DYNAMIC_CONFIG.ACTIVATION_COST;

    if (!referred_username) {
        showMessage(messageEl, "Vui lòng nhập Username bạn bè.", "error");
        return;
    }

    showMessage(messageEl, `Đang dùng ${formatMoney(cost)} để kích hoạt...`, "warning");

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
                messageEl,
                `<strong>Thành công!</strong><br>Đã dùng ${formatMoney(cost)} để kích hoạt Gold cho <strong>${referred_username}</strong>`,
                "success"
            );
            const friendInput = document.getElementById('friend-username');
            if (friendInput) friendInput.value = '';
            await loadUserData(currentUsername);
        } else {
            showMessage(messageEl, data.error || "Không thành công", "error");
        }
    } catch (err) {
        showMessage(messageEl, `Lỗi kết nối: ${err.message}`, "error");
    }
}

// =====================
// POLLING 
// =====================
function startPolling(username, isReactivationCheck = false) {
    console.log(`🔄 Bắt đầu polling cho: ${username}, Mode: ${isReactivationCheck ? 'Reactivate Check' : 'Payment Check'}`);
    clearPolling();

    const qrStatus = document.querySelector('.qr-status');
    const messageEl = document.getElementById('activation-message');
    let dotCount = 0;

    pollTimer = setInterval(async () => {
        try {
            const res = await fetch(`${WORKER_URL}/user/check?username=${encodeURIComponent(username)}`);
            const data = await res.json();
            
            const referrerContainer = document.getElementById('referrer-container');

            if (data.ok && (data.user?.status === 'ACTIVATED' || data.user?.status === 'GOLD')) {
                // THÀNH CÔNG: Chuyển thẳng tới dashboard
                clearPolling();
                if (qrStatus) {
                    qrStatus.innerHTML = '<span>✅</span><span>Thanh toán đã xác nhận! Đang hoàn tất...</span>';
                }

                document.getElementById('qr-container')?.classList.add('hidden');
                showMessage(
                    messageEl,
                    `<strong>Thanh toán thành công! Đã lên Gold 🎉</strong><br>${data.referral_info || ''}`,
                    "success"
                );

                document.getElementById('install-notice')?.classList.remove('hidden');
                document.getElementById('download-link')?.classList.remove('hidden');
                document.getElementById('reactivate-btn')?.classList.remove('hidden');
                
                if (referrerContainer) referrerContainer.classList.remove('hidden');

                setTimeout(() => handleUser(username), 3000);
                return;

            } else if (data.user?.status === 'TXN_USED' || data.user?.status === 'RC_FAILED') {
                // GIAO DỊCH ĐÃ VÀO, nhưng kích hoạt chưa xong/bị lỗi
                clearPolling();
                
                if (!isReactivationCheck) {
                    // Nếu đang ở luồng Payment Check (chưa bấm start/reactivate)
                    if (qrStatus) {
                        qrStatus.innerHTML = '<span>⚠️</span><span>Đã nhận thanh toán. Vui lòng bấm "Nâng cấp lại".</span>';
                    }
                    document.getElementById('qr-container')?.classList.add('hidden');
                    
                    document.getElementById('install-notice')?.classList.remove('hidden');
                    document.getElementById('download-link')?.classList.remove('hidden');
                    document.getElementById('reactivate-btn')?.classList.remove('hidden');
                    
                    showMessage(
                        messageEl,
                        "<strong>Thanh toán thành công.</strong><br>Vui lòng nhấn 'Nâng cấp lại' để hoàn tất quá trình kích hoạt Premium.",
                        "warning"
                    );
                    
                    if (referrerContainer) referrerContainer.classList.remove('hidden');
                }
                
                return; // Dừng polling
                
            } else {
                // ĐANG CHỜ THANH TOÁN (Chỉ áp dụng cho luồng Payment Check)
                if (!isReactivationCheck) { 
                    dotCount = (dotCount + 1) % 4;
                    if (qrStatus) {
                        qrStatus.innerHTML = `<span>⏳</span><span>Đang chờ thanh toán${'.'.repeat(dotCount)}</span>`;
                    }
                }
            }

        } catch (err) {
            console.error("Polling error:", err);
            dotCount = (dotCount + 1) % 4;
            if (!isReactivationCheck && qrStatus) { 
                qrStatus.innerHTML = `<span>❌</span><span>Lỗi kết nối (Tự động thử lại)${'.'.repeat(dotCount)}</span>`;
            }
        }
    }, POLL_INTERVAL_MS);
}

// =====================
// BINDINGS & START
// =====================
window.loginUser = loginUser;
window.logout = logout;
window.startUpgrade = startUpgrade;
window.reactivate = reactivate;
window.activateFriend = activateFriend;
window.copyReferralLink = copyReferralLink;
window.showLoadingScreen = showLoadingScreen; 
window.copyToClipboard = copyToClipboard;

window.onload = () => {
    initApp();
};
