// ========= Mapping App → Entitlements ========= //
// Nếu User-Agent chứa chuỗi này thì sẽ gán entitlement tương ứng
const mapping = {
  '%E8%BD%A6%E7%A5%A8%E7%A5%A8': ['vip+watch_vip'], // App 1 → entitlement "vip+watch_vip"
  'Locket': ['Gold']                                // App Locket → entitlement "Gold"
};

// ========= Bắt đầu xử lý ========= //
// Lấy User-Agent từ request
var ua = $request.headers["User-Agent"] || $request.headers["user-agent"];

// Parse response từ RevenueCat (JSON body)
var obj = JSON.parse($response.body);

// Thêm thông điệp cảnh báo (có thể bỏ đi nếu không cần)
obj.Attention = "Chúc mừng bạn! Vui lòng không bán hoặc chia sẻ cho người khác!";

// ========= Subscription giả (Fake Data) ========= //
// Đây là dữ liệu giả lập trạng thái "đã mua" từ App Store
var fakeSubscription = {
  is_sandbox: false,
  ownership_type: "PURCHASED",
  billing_issues_detected_at: null,
  period_type: "normal",
  expires_date: "2099-12-18T01:04:17Z",       // Thời gian hết hạn (vĩnh viễn)
  grace_period_expires_date: null,
  unsubscribe_detected_at: null,
  original_purchase_date: "2025-01-01T01:01:01Z",
  purchase_date: "2025-01-01T01:01:01Z",
  store: "app_store"
};

// ========= Entitlement giả (Fake Entitlement) ========= //
var fakeEntitlement = {
  grace_period_expires_date: null,
  purchase_date: "2025-01-01T01:01:01Z",
  product_identifier: "com.junnk6.premium.yearly", // ID gói VIP
  expires_date: "2099-12-18T01:04:17Z"
};

// ========= Kiểm tra User-Agent để áp entitlement ========= //
const match = Object.keys(mapping).find(e => ua.includes(e));

if (match) {
  // Nếu User-Agent khớp 1 key trong mapping
  let [entitlementKey, productId] = mapping[match];

  if (productId) {
    // Nếu mapping có productId → thay product_identifier
    fakeEntitlement.product_identifier = productId;
    obj.subscriber.subscriptions[productId] = fakeSubscription;
  } else {
    // Nếu không có productId → gán mặc định
    obj.subscriber.subscriptions["com.junnk6.premium.yearly"] = fakeSubscription;
  }

  // Gán entitlement tương ứng (ví dụ "Gold" hoặc "vip+watch_vip")
  obj.subscriber.entitlements[entitlementKey] = fakeEntitlement;

} else {
  // Nếu không khớp bất kỳ app nào trong mapping → mặc định là "pro"
  obj.subscriber.subscriptions["com.junnk6.premium.yearly"] = fakeSubscription;
  obj.subscriber.entitlements.pro = fakeEntitlement;
}

// ========= Trả lại response đã chỉnh sửa ========= //
$done({ body: JSON.stringify(obj) });
