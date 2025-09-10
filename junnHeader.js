/***********************************************
> deleteHeader by Junn.k6
***********************************************/	

const version = 'V1.0.2';

/**
 * Hàm setHeaderValue
 * - e: object chứa headers
 * - a: tên header
 * - d: giá trị header cần set
 */
function setHeaderValue(e, a, d) {
  var r = a.toLowerCase();
  r in e ? e[r] = d : e[a] = d;
}

// Lấy header gốc của request
var modifiedHeaders = $request.headers;

// Xóa giá trị của header X-RevenueCat-ETag
setHeaderValue(modifiedHeaders, "X-RevenueCat-ETag", "");

// Trả lại headers đã chỉnh sửa
$done({ headers: modifiedHeaders });
