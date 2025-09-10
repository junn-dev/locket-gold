// ========= ID ========= //
const mapping = {
  '%E8%BD%A6%E7%A5%A8%E7%A5%A8': ['vip+watch_vip'], // App có UA chứa chuỗi này => entitlement vip+watch_vip
  'Locket': ['Gold']                               // App có UA chứa Locket => entitlement Gold
};

// =========  @Junn.k6 ========= // 
var ua  = $request.headers["User-Agent"] || $request.headers["user-agent"]; // Lấy User-Agent
var obj = JSON.parse($response.body);                                       // Parse JSON gốc

// Thêm thông báo cảnh báo
obj.Attention = "Chúc mừng bạn! Vui lòng không bán hoặc chia sẻ cho người khác!";

// Fake Subscription Info
var junnk6 = {
  is_sandbox: false,
  ownership_type: "PURCHASED",
  billing_issues_detected_at: null,
  period_type: "normal",
  expires_date: "2099-12-18T01:04:17Z",     // Ngày hết hạn vĩnh viễn (2099)
  grace_period_expires_date: null,
  unsubscribe_detected_at: null,
  original_purchase_date: "2025-07-28T01:04:18Z",
  purchase_date: "2025-07-28T01:04:17Z",
  store: "app_store"
};

// Fake Entitlement Info
var junn = {
  grace_period_expires_date: null,
  purchase_date: "2025-07-28T01:04:17Z",
  product_identifier: "com.junnk6.premium.yearly",
  expires_date: "2099-12-18T01:04:17Z"
};

// Kiểm tra User-Agent có khớp mapping hay không
const match = Object.keys(mapping).find(e => ua.includes(e));

if (match) {
  // Nếu UA khớp
  let [entitlementKey, subscriptionId] = mapping[match];

  if (subscriptionId) {
    // Gắn subscription giả vào với ID tương ứng
    junn.product_identifier = subscriptionId;
    obj.subscriber.subscriptions[subscriptionId] = junnk6;
  } else {
    // Nếu không có subscriptionId thì dùng mặc định yearly
    obj.subscriber.subscriptions["com.junnk6.premium.yearly"] = junnk6;
  }

  // Thêm entitlement tương ứng
  obj.subscriber.entitlements[entitlementKey] = junn;

} else {
  // Nếu UA không khớp bất kỳ mapping nào
  obj.subscriber.subscriptions["com.junnk6.premium.yearly"] = junnk6;
  obj.subscriber.entitlements.pro = junn;
}

// Trả lại response đã sửa
$done({ body: JSON.stringify(obj) });
