const WORKER_URL = "https://locket-vip.hungnguyen-junn.workers.dev/";
let currentUser = null;

// ----- LOGIN -----
async function login() {
  const email = document.getElementById("email").value.trim();
  const pass = document.getElementById("password").value.trim();
  const error = document.getElementById("error");

  error.textContent = "";
  if (!email || !pass) {
    error.textContent = "⚠️ Vui lòng nhập đầy đủ thông tin!";
    return;
  }

  try {
    const res = await fetch(WORKER_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password: pass })
    });
    const data = await res.json();

    if (res.ok && (data.fbData || data.userId)) {
      currentUser = data.fbData || {
        localId: data.userId,
        email,
        displayName: email.split("@")[0]
      };

      // Hiển thị profile
      document.getElementById("login-card").style.display = "none";
      document.getElementById("profile-card").style.display = "block";

      const avatarEl = document.getElementById("avatar");
      avatarEl.src = currentUser.profilePicture 
        || `https://api.dicebear.com/6.x/identicon/svg?seed=${currentUser.displayName}`;

      document.getElementById("username").textContent = currentUser.displayName;
    } else {
      error.textContent = data.error || "❌ Email hoặc mật khẩu không đúng!";
    }
  } catch (err) {
    error.textContent = "❌ Lỗi kết nối server!";
    console.error(err);
  }
}

// ----- UPGRADE LOCKET GOLD -----
async function upgradeLocketGold() {
  if (!currentUser) return;

  const qrContainer = document.getElementById("qr-container");
  const btn = document.querySelector("#profile-card button");
  const downloadLink = document.getElementById("download-link");

  // Tạo QR dựa trên email trước @
  const substr = currentUser.localId ? currentUser.localId.slice(0, 10) : "locket";
  const qrUrl = `https://vietqr.co/api/generate/mb/09999999900/NGUYEN%20VAN%20HUNG/30000/${substr}?isMask=0&logo=1&style=2&bg=61`;

  qrContainer.style.display = "block";
  qrContainer.innerHTML = `
    <p>Quét QR để thanh toán <b>30.000 VND</b></p>
    <img src="${qrUrl}" alt="QR Thanh toán">
  `;

  btn.disabled = true;
  btn.textContent = "⏳ Đang chờ thanh toán...";

  // Poll Worker để kiểm tra giao dịch
  const interval = setInterval(async () => {
    try {
      const res = await fetch(WORKER_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "check_tx",
          localId: currentUser.localId,
          email: currentUser.email,
          amount: 30000
        })
      });
      const data = await res.json();

      if (data.ok) {
        clearInterval(interval);
        qrContainer.style.display = "none";
        alert("🎉 Thanh toán thành công! Bạn đã nâng cấp Locket Gold.");

        btn.style.display = "none";
        downloadLink.style.display = "inline-block";
        downloadLink.href = "LocketJunn.mobileconfig";
      }
    } catch (err) {
      console.error("Poll error:", err);
    }
  }, 1000); // poll 1s để auto check
}

// ----- EVENT LISTENERS -----
document.getElementById("login-form").addEventListener("submit", e => {
  e.preventDefault();
  login();
});

document.querySelector("#profile-card button").addEventListener("click", upgradeLocketGold);
