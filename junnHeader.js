/***********************************************
> deleteHeader by Junn.k6
***********************************************/

const version = 'V1.0.3';

/**
 * Hàm đặt lại giá trị header
 * @param {object} headers - Object chứa toàn bộ headers
 * @param {string} key - Tên header cần thay đổi
 * @param {string} value - Giá trị mới
 */
function setHeaderValue(headers, key, value) {
  const lowerKey = key.toLowerCase();
  if (lowerKey in headers) {
    headers[lowerKey] = value;
  } else {
    headers[key] = value;
  }
}

// Lấy headers của request
let modifiedHeaders = $request.headers;

// Xóa giá trị "X-RevenueCat-ETag"
setHeaderValue(modifiedHeaders, "X-RevenueCat-ETag", "");

// Trả lại request đã chỉnh sửa
$done({ headers: modifiedHeaders });
