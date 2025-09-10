// ========= ID ========= //
const mapping = {
    '%E8%BD%A6%E7%A5%A8%E7%A5%A8': ['vip+watch_vip'],
    'Locket': ['Gold']
};

// =========   Phần cố định  ========= // 
// =========  @Junn.k6 ========= // 

// Lấy User-Agent và parse body
var ua = $request.headers["User-Agent"] || $request.headers["user-agent"];
var obj = JSON.parse($response.body);

// Thêm thông báo bản quyền
obj.Attention = "Bản quyền Junn.k6! Vui lòng không bán hoặc chia sẻ cho người khác!";

// Thông tin subscription chuẩn Junn.k6
var junnk6 = {
    is_sandbox: false,
    ownership_type: "PURCHASED",
    billing_issues_detected_at: null,
    period_type: "normal",
    expires_date: "2099-12-31T23:59:59Z",
    grace_period_expires_date: null,
    unsubscribe_detected_at: null,
    original_purchase_date: "2025-01-01T01:01:01Z",
    purchase_date: "2025-01-01T01:01:01Z",
    store: "app_store"
};

// Thông tin sản phẩm cụ thể
var junn = {
    grace_period_expires_date: null,
    purchase_date: "2025-01-01T01:01:01Z",
    product_identifier: "com.junnk6.premium.yearly",
    expires_date: "2099-12-31T23:59:59Z"
};

// Kiểm tra mapping dựa vào User-Agent
const match = Object.keys(mapping).find(key => ua.includes(key));

if (match) {
    let [entitlement, subscriptionId] = mapping[match];
    
    if (subscriptionId) {
        junn.product_identifier = subscriptionId;
        obj.subscriber.subscriptions[subscriptionId] = junnk6;
    } else {
        obj.subscriber.subscriptions["com.junnk6.premium.yearly"] = junnk6;
    }

    obj.subscriber.entitlements[entitlement] = junn;
} else {
    obj.subscriber.subscriptions["com.junnk6.premium.yearly"] = junnk6;
    obj.subscriber.entitlements.pro = junn;
}

// Trả về body đã chỉnh sửa
$done({ body: JSON.stringify(obj) });

