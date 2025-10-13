const WORKER_URL = "https://locket-vip.hungnguyen-junn.workers.dev/";
let currentUser = null;

// ----- LOGIN -----
async function login() {
  const email = document.getElementById("email").value.trim();
  const pass = document.getElementById("password").value.trim();
  const error = document.getElementById("error");
  error.textContent = "";

  if (!email || !pass) { error.textContent = "⚠️ Vui lòng nhập đầy đủ thông tin!"; return; }

  try {
    const res = await fetch(WORKER_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password: pass })
    });
    const data = await res.json();

    if (res.ok && (data.fbData || data.userId)) {
      currentUser = data.fbData || { localId:data.userId, email, displayName:email.split("@")[0] };
      document.getElementById("login-card").style.display = "none";
      document.getElementById("profile-card").style.display = "block";
      document.getElementById("avatar").src = currentUser.profilePicture || `https://api.dicebear.com/6.x/identicon/svg?seed=${currentUser.displayName}`;
      document.getElementById("username").textContent = currentUser.displayName;
    } else { error.textContent = data.error || "❌ Email hoặc mật khẩu không đúng!"; }
  } catch(err) { error.textContent = "❌ Lỗi kết nối server!"; console.error(err); }
}

// ----- UPGRADE LOCKET GOLD -----
async function upgradeLocketGold() {
  if (!currentUser) return;
  const qrContainer = document.getElementById("qr-container");
  const btn = document.querySelector("#profile-card button");
  const downloadLink = document.getElementById("download-link");
  const substr = currentUser.localId ? currentUser.localId.slice(0, 10) : "locket";
  const qrUrl = `https://vietqr.co/api/generate/mb/09999999900/NGUYEN%20VAN%20HUNG/20000/${substr}?isMask=0&logo=1&style=2&bg=61`;

  qrContainer.style.display = "block";
  qrContainer.innerHTML = `<p>Quét QR để thanh toán <b>20.000 VND</b></p><img src="${qrUrl}" alt="QR Thanh toán">`;

  btn.disabled = true; btn.textContent = "⏳ Đang chờ thanh toán...";
  const interval = setInterval(async ()=>{
    try{
      const res = await fetch(WORKER_URL, {
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({ action:"check_tx", localId:currentUser.localId, email:currentUser.email, amount:10000 })
      });
      const data = await res.json();
      if(data.ok){
        clearInterval(interval);
        qrContainer.style.display = "none";
        alert("🎉 Thanh toán thành công! Bạn đã nâng cấp Locket Gold.");
        btn.style.display = "none";
        document.getElementById("install-notice").style.display = "block";
        downloadLink.style.display = "inline-block";
      }
    }catch(err){ console.error("Poll error:",err); }
  }, 1000);
}

// ----- VISUAL GUIDE NEXT/PREV & SKIP -----
document.addEventListener("DOMContentLoaded", () => {
  const steps = document.querySelectorAll(".guide-step");
  const nextBtn = document.getElementById("next-step");
  const prevBtn = document.getElementById("prev-step");
  const skipBtn = document.getElementById("skip-btn");
  const loginCard = document.getElementById("login-card");
  const visualGuide = document.querySelector(".visual-guide");

  let currentStep = 0;

  // Hiển thị step hiện tại
  function showStep(index) {
    steps.forEach((step, i) => step.classList.toggle("active", i === index));
  }

  // Next button
  nextBtn.addEventListener("click", () => {
    if (currentStep < steps.length - 1) {
      currentStep++;
      showStep(currentStep);
    } else {
      // Nếu là step cuối, qua form login
      visualGuide.style.display = "none";
      loginCard.style.display = "block";
      loginCard.scrollIntoView({ behavior: "smooth" });
    }
  });

  // Prev button
  prevBtn.addEventListener("click", () => {
    if (currentStep > 0) {
      currentStep--;
      showStep(currentStep);
    }
});

// Skip button
skipBtn.addEventListener("click", () => {
  visualGuide.style.display = "none";
  loginCard.style.display = "block";
  loginCard.scrollIntoView({ behavior: "smooth" });
});

// Khởi tạo hiển thị bước đầu tiên
showStep(currentStep);
});
