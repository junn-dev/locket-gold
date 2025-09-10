/***********************************************
 > deleteHeader by Junn.k6
 > Version: V1.0.2
***********************************************/

const version = "V1.0.2";

/**
 * Hàm setHeaderValue
 * - Nếu header đã tồn tại (case-insensitive) → cập nhật giá trị
 * - Nếu chưa tồn tại → thêm mới
 */
function setHeaderValue(headers, key, value) {
  const lowerKey = key.toLowerCase();
  if (lowerKey in headers) {
    headers[lowerKey] = value;
  } else {
    headers[key] = value;
  }
}

let modifiedHeaders = $request.headers;

// Xoá giá trị ETag (ngăn RevenueCat cache hoặc kiểm tra trạng thái)
setHeaderValue(modifiedHeaders, "X-RevenueCat-ETag", "");

// Trả lại headers đã sửa đổi
$done({ headers: modifiedHeaders });
