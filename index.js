// SillyTavern插件标准格式
(() => {
'use strict';

console.log('Enhanced Hub Plugin loading...');

// 配置
const UPLOAD_URL = 'https://catbox.moe/user/api.php';

// 上传函数
async function uploadImageByPlugin(file) {
if (!file) {
throw new Error('No file provided');
}

const formData = new FormData();
formData.append('reqtype', 'fileupload');
formData.append('fileToUpload', file);

try {
const response = await fetch(UPLOAD_URL, {
method: 'POST',
body: formData
});

if (!response.ok) {
throw new Error(`HTTP ${response.status}`);
}

const url = await response.text();

if (url && url.startsWith('https://files.catbox.moe/')) {
console.log('Upload success:', url);
return {
url: url.trim(),
filename: file.name,
size: file.size,
type: file.type
};
} else {
throw new Error('Invalid response');
}
} catch (error) {
console.error('Upload failed:', error);
throw error;
}
}

// 文件上传函数（兼容性）
async function uploadFileByPlugin(file) {
return await uploadImageByPlugin(file);
}

// 获取插件状态
function getPluginStatus() {
return {
version: '1.0.0',
ready: true,
service: 'catbox.moe'
};
}

// 获取文件历史
function getFileHistory() {
try {
return JSON.parse(localStorage.getItem('plugin_files') || '[]');
} catch {
return [];
}
}

// 清理历史
function clearFileHistory() {
localStorage.removeItem('plugin_files');
return true;
}

// 注册到全局 - 使用多种方式确保成功
const functions = {
__uploadImageByPlugin: uploadImageByPlugin,
__uploadFileByPlugin: uploadFileByPlugin,
__getPluginStatus: getPluginStatus,
__getFileHistory: getFileHistory,
__clearFileHistory: clearFileHistory
};

// 方式1：直接赋值到window
Object.assign(window, functions);

// 方式2：赋值到globalThis
Object.assign(globalThis, functions);

// 方式3：定义到全局作用域
window.__uploadImageByPlugin = uploadImageByPlugin;
window.__uploadFileByPlugin = uploadFileByPlugin;
window.__getPluginStatus = getPluginStatus;
window.__getFileHistory = getFileHistory;
window.__clearFileHistory = clearFileHistory;

// 方式4：如果在iframe中，也注册到父窗口
try {
if (window.parent && window.parent !== window) {
Object.assign(window.parent, functions);
}
if (window.top && window.top !== window) {
Object.assign(window.top, functions);
}
} catch (e) {
// 跨域限制，忽略错误
}

console.log('Enhanced Hub Plugin loaded successfully');
console.log('Functions available:', Object.keys(functions));

// 延迟测试
setTimeout(() => {
console.log('=== Plugin Self Test ===');
console.log('__uploadImageByPlugin type:', typeof window.__uploadImageByPlugin);
if (typeof window.__uploadImageByPlugin === 'function') {
console.log('✅ Plugin ready for use');
} else {
console.log(' Plugin not ready');
}
}, 1000);

})();
未选择文件
