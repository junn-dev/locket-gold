/***********************************************
> deleteHeader by Junn.k6
***********************************************/	

const version = 'V1.0.2';

/**
 * Cập nhật hoặc thêm giá trị header
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

// Xóa giá trị X-RevenueCat-ETag
setHeaderValue(modifiedHeaders, "X-RevenueCat-ETag", "");

// Hoàn tất và trả về headers
$done({ headers: modifiedHeaders });
