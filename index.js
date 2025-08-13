(function() {
'use strict';

// 配置常量
const CONFIG = {
CATBOX_API: 'https://catbox.moe/user/api.php',
IMGBB_API: 'https://api.imgbb.com/1/upload',
MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
SUPPORTED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
SUPPORTED_AUDIO_TYPES: ['audio/webm', 'audio/mp3', 'audio/wav', 'audio/ogg']
};

// 存储管理
class StorageManager {
constructor() {
this.storageKey = 'enhanced_hub_files';
}

saveFileRecord(fileInfo) {
const records = this.getFileRecords();
records.push({
...fileInfo,
timestamp: Date.now(),
id: this.generateId()
});
localStorage.setItem(this.storageKey, JSON.stringify(records));
}

getFileRecords() {
try {
return JSON.parse(localStorage.getItem(this.storageKey) || '[]');
} catch {
return [];
}
}

generateId() {
return Date.now().toString(36) + Math.random().toString(36).substr(2);
}
}

// 上传服务管理器
class UploadManager {
constructor() {
this.storage = new StorageManager();
}

async uploadToCatbox(file) {
const formData = new FormData();
formData.append('reqtype', 'fileupload');
formData.append('fileToUpload', file);

try {
const response = await fetch(CONFIG.CATBOX_API, {
method: 'POST',
body: formData
});

if (!response.ok) {
throw new Error(`HTTP error! status: ${response.status}`);
}

const url = await response.text();

if (url && url.startsWith('https://files.catbox.moe/')) {
return {
success: true,
url: url.trim(),
service: 'catbox'
};
} else {
throw new Error('Invalid response from Catbox');
}
} catch (error) {
console.error('Catbox upload failed:', error);
return { success: false, error: error.message };
}
}

async uploadToImgbb(file, apiKey) {
if (!apiKey) {
return { success: false, error: 'ImgBB API key required' };
}

const formData = new FormData();
formData.append('image', file);

try {
const response = await fetch(`${CONFIG.IMGBB_API}?key=${apiKey}`, {
method: 'POST',
body: formData
});

const result = await response.json();

if (result.success) {
return {
success: true,
url: result.data.url,
service: 'imgbb'
};
} else {
throw new Error(result.error?.message || 'Upload failed');
}
} catch (error) {
console.error('ImgBB upload failed:', error);
return { success: false, error: error.message };
}
}

async uploadFile(file, options = {}) {
// 文件验证
if (!file) {
throw new Error('No file provided');
}

if (file.size > CONFIG.MAX_FILE_SIZE) {
throw new Error(`File too large. Maximum size: ${CONFIG.MAX_FILE_SIZE / 1024 / 1024}MB`);
}

// 尝试多个上传服务
const uploadServices = [
() => this.uploadToCatbox(file),
() => this.uploadToImgbb(file, options.imgbbApiKey)
];

let lastError;
for (const uploadService of uploadServices) {
try {
const result = await uploadService();
if (result.success) {
// 保存文件记录
this.storage.saveFileRecord({
filename: file.name,
size: file.size,
type: file.type,
url: result.url,
service: result.service
});

return {
url: result.url,
filename: file.name,
size: file.size,
type: file.type,
service: result.service
};
}
lastError = result.error;
} catch (error) {
lastError = error.message;
continue;
}
}

throw new Error(`All upload services failed. Last error: ${lastError}`);
}
}

// 文件类型检测
function isImageFile(file) {
return CONFIG.SUPPORTED_IMAGE_TYPES.includes(file.type);
}

function isAudioFile(file) {
return CONFIG.SUPPORTED_AUDIO_TYPES.includes(file.type);
}

// 创建上传管理器实例
const uploadManager = new UploadManager();

// 主要上传函数
async function uploadImageByPlugin(file) {
try {
if (!isImageFile(file)) {
throw new Error('Unsupported image format');
}

console.log('Uploading image:', file.name, file.size, 'bytes');
const result = await uploadManager.uploadFile(file);
console.log('Image upload successful:', result.url);

return result;
} catch (error) {
console.error('Image upload failed:', error);
throw error;
}
}

async function uploadFileByPlugin(file) {
try {
console.log('Uploading file:', file.name, file.size, 'bytes');
const result = await uploadManager.uploadFile(file);
console.log('File upload successful:', result.url);

return result;
} catch (error) {
console.error('File upload failed:', error);
throw error;
}
}

// 获取文件历史记录
function getFileHistory() {
return uploadManager.storage.getFileRecords();
}

// 清理文件历史记录
function clearFileHistory() {
localStorage.removeItem('enhanced_hub_files');
return true;
}

// 获取插件状态
function getPluginStatus() {
return {
version: '2.0.0',
supportedImageTypes: CONFIG.SUPPORTED_IMAGE_TYPES,
supportedAudioTypes: CONFIG.SUPPORTED_AUDIO_TYPES,
maxFileSize: CONFIG.MAX_FILE_SIZE,
fileCount: uploadManager.storage.getFileRecords().length
};
}

// 注册全局函数到window对象
function registerGlobalFunctions() {
const functions = {
__uploadImageByPlugin: uploadImageByPlugin,
__uploadFileByPlugin: uploadFileByPlugin,
__getFileHistory: getFileHistory,
__clearFileHistory: clearFileHistory,
__getPluginStatus: getPluginStatus
};

// 注册到当前window
Object.assign(window, functions);

// 注册到顶层window（跨iframe访问）
if (typeof top !== 'undefined' && top.window && top.window !== window) {
Object.assign(top.window, functions);
}

// 注册到parent window（如果存在）
if (typeof parent !== 'undefined' && parent.window && parent.window !== window) {
Object.assign(parent.window, functions);
}

console.log('Enhanced Hub Plugin functions registered successfully');
}

// 插件初始化
function initializePlugin() {
console.log('Enhanced Hub Plugin v2.0.0 initializing...');

// 注册全局函数
registerGlobalFunctions();

// 添加样式（如果需要UI）
const style = document.createElement('style');
style.textContent = `
.enhanced-hub-notification {
position: fixed;
top: 20px;
right: 20px;
background: #4CAF50;
color: white;
padding: 12px 20px;
border-radius: 4px;
z-index: 10000;
font-family: Arial, sans-serif;
box-shadow: 0 2px 8px rgba(0,0,0,0.2);
}
.enhanced-hub-notification.error {
background: #f44336;
}
`;
document.head.appendChild(style);

console.log('Enhanced Hub Plugin initialized successfully');

// 显示初始化成功通知
showNotification('Enhanced Hub Plugin loaded successfully!', 'success');
}

// 通知函数
function showNotification(message, type = 'success') {
const notification = document.createElement('div');
notification.className = `enhanced-hub-notification ${type}`;
notification.textContent = message;
document.body.appendChild(notification);

setTimeout(() => {
if (notification.parentNode) {
notification.parentNode.removeChild(notification);
}
}, 3000);
}

// 等待DOM加载完成后初始化
if (document.readyState === 'loading') {
document.addEventListener('DOMContentLoaded', initializePlugin);
} else {
initializePlugin();
}

// 导出模块（如果支持）
if (typeof module !== 'undefined' && module.exports) {
module.exports = {
uploadImageByPlugin,
uploadFileByPlugin,
getFileHistory,
clearFileHistory,
getPluginStatus
};
}

})();
未选择文件
