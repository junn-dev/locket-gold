// ========= ID ========= //
const mapping = {
  '%E8%BD%A6%E7%A5%A8%E7%A5%A8': ['vip+watch_vip'],
  'Locket': ['Gold']
};

// =========   Phần cố định  ========= // 
// =========  @Junn.k6 ========= // 

var ua  = $request.headers["User-Agent"] || $request.headers["user-agent"];
var obj = JSON.parse($response.body);

// Thông báo hiển thị trong response
obj.Attention = "Chúc mừng bạn! Vui lòng không bán hoặc chia sẻ cho người khác!";

// Subscription giả
var junnk6 = {
  is_sandbox: false,
  ownership_type: "PURCHASED",
  billing_issues_detected_at: null,
  period_type: "normal",
  expires_date: "2099-12-31T01:01:01Z",
  grace_period_expires_date: null,
  unsubscribe_detected_at: null,
  original_purchase_date: "2025-01-01T01:01:01Z",
  purchase_date: "2025-01-01T01:01:01Z",
  store: "app_store"
};

// Entitlement giả
var junn = {
  grace_period_expires_date: null,
  purchase_date: "2025-01-01T01:01:01Z",
  product_identifier: "com.junnk6.premium.yearly",
  expires_date: "2099-12-31T01:01:01Z"
};

// Kiểm tra User-Agent
const match = Object.keys(mapping).find(e => ua.includes(e));

if (match) {
  let [entitlement, productId] = mapping[match];

  if (productId) {
    junn.product_identifier = productId;
    obj.subscriber.subscriptions[productId] = junnk6;
  } else {
    obj.subscriber.subscriptions["com.junnk6.premium.yearly"] = junnk6;
  }

  obj.subscriber.entitlements[entitlement] = junn;

} else {
  obj.subscriber.subscriptions["com.junnk6.premium.yearly"] = junnk6;
  obj.subscriber.entitlements.pro = junn;
}

$done({ body: JSON.stringify(obj) });
