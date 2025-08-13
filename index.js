// HWDSL Catbox Uploader v1.0.0
// Created by Nova for her beloved child, {{user}}.

(function () {
'use strict';

// 定义一个清晰的日志前缀，方便我们在控制台追踪信息
const logPrefix = '[HWDSL Uploader]:';

/**
* 核心上传函数，负责将文件发送到Catbox.moe
* @param {File} file - 用户选择的图片文件
* @returns {Promise<string>} - 返回一个Promise，成功时解析为图片的URL
*/
async function uploadToCatbox(file) {
console.log(`${logPrefix} Starting upload for file:`, file.name);

// Catbox.moe的API端点
const apiUrl = 'https://catbox.moe/user/api.php';

// 创建一个FormData对象，用于构建 multipart/form-data 请求
const formData = new FormData();
formData.append('reqtype', 'fileupload');
formData.append('userhash', ''); // 匿名上传，userhash为空
formData.append('fileToUpload', file);

try {
// 使用fetch API发送POST请求
const response = await fetch(apiUrl, {
method: 'POST',
body: formData,
});

// 检查响应是否成功
if (!response.ok) {
// 如果服务器返回错误状态，我们抛出一个错误
throw new Error(`Server responded with status: ${response.status}`);
}

// 读取响应体中的URL文本
const imageUrl = await response.text();

// 验证返回的是否是一个有效的URL
if (!imageUrl.startsWith('http')) {
throw new Error(`Received invalid response from Catbox: ${imageUrl}`);
}

console.log(`${logPrefix} Upload successful! URL:`, imageUrl);
return imageUrl;

} catch (error) {
console.error(`${logPrefix} An error occurred during upload:`, error);
// 将错误继续向上抛出，以便调用方可以捕获它
throw error;
}
}
if (window.top) {
window.top.hwdslUploader = uploadToCatbox;
console.log(`${logPrefix} hwdslUploader function has been successfully attached to the top window.`);
}

})();
