(function() {
'use strict';

const MODULE_NAME = 'ImageProcessorHub';
const STORAGE_KEY = 'imageProcessorHub_uploads';
const API_ENDPOINTS = {
catbox: 'https://catbox.moe/user/api.php',
litterbox: 'https://litterbox.catbox.moe/resources/internals/api.php'
};

// 初始化存储
const imageStorage = {
uploads: JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'),

save(key, data) {
this.uploads[key] = data;
localStorage.setItem(STORAGE_KEY, JSON.stringify(this.uploads));
},

get(key) {
return this.uploads[key];
},

getAll() {
return this.uploads;
}
};

// 图片处理工具
const imageProcessor = {
async fileToBase64(file) {
return new Promise((resolve, reject) => {
const reader = new FileReader();
reader.onload = e => resolve(e.target.result);
reader.onerror = reject;
reader.readAsDataURL(file);
});
},

async compressImage(file, maxWidth = 1920, quality = 0.9) {
const base64 = await this.fileToBase64(file);

return new Promise((resolve) => {
const img = new Image();
img.onload = () => {
const canvas = document.createElement('canvas');
let width = img.width;
let height = img.height;

if (width > maxWidth) {
height = (maxWidth / width) * height;
width = maxWidth;
}

canvas.width = width;
canvas.height = height;

const ctx = canvas.getContext('2d');
ctx.drawImage(img, 0, 0, width, height);

canvas.toBlob(blob => {
resolve(new File([blob], file.name, {
type: file.type || 'image/jpeg'
}));
}, file.type || 'image/jpeg', quality);
};
img.src = base64;
});
},

generateShortId() {
return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
}
};

// 上传管理器
const uploadManager = {
async uploadToCatbox(file, duration = '1h') {
const formData = new FormData();
formData.append('reqtype', 'fileupload');
formData.append('time', duration);
formData.append('fileToUpload', file);

try {
const response = await fetch(API_ENDPOINTS.litterbox, {
method: 'POST',
body: formData
});

if (!response.ok) {
throw new Error(`Upload failed: ${response.statusText}`);
}

const url = await response.text();
return url.trim();
} catch (error) {
console.error('Catbox upload error:', error);
throw error;
}
},

async uploadToImgur(file) {
// 备用上传方案
const base64 = await imageProcessor.fileToBase64(file);
const base64Data = base64.split(',')[1];

try {
const response = await fetch('https://api.imgur.com/3/image', {
method: 'POST',
headers: {
'Authorization': 'Client-ID 0b711b1fc9d5b3b', // 公共客户端ID
'Content-Type': 'application/json'
},
body: JSON.stringify({
image: base64Data,
type: 'base64'
})
});

const data = await response.json();
if (data.success) {
return data.data.link;
}
throw new Error('Imgur upload failed');
} catch (error) {
console.error('Imgur upload error:', error);
throw error;
}
},

async uploadWithFallback(file) {
try {
// 首先尝试 Catbox
return await this.uploadToCatbox(file);
} catch (error) {
console.warn('Catbox failed, trying Imgur...', error);
// 失败则尝试 Imgur
return await this.uploadToImgur(file);
}
}
};

// 主插件类
class ImageProcessorHub {
constructor() {
this.initialized = false;
this.setupComplete = false;
}

async init() {
if (this.initialized) return;

console.log(`[${MODULE_NAME}] Initializing...`);

// 注册全局函数
this.registerGlobalFunctions();

// 设置UI增强
this.setupUIEnhancements();

this.initialized = true;
console.log(`[${MODULE_NAME}] Initialization complete`);
}

registerGlobalFunctions() {
// 注册文件上传函数
window.__uploadFileByPlugin = async (file) => {
console.log(`[${MODULE_NAME}] Processing file upload:`, file.name);

try {
// 如果是图片，进行压缩
let processedFile = file;
if (file.type.startsWith('image/')) {
processedFile = await imageProcessor.compressImage(file);
}

// 上传文件
const url = await uploadManager.uploadWithFallback(processedFile);

// 生成短ID并存储
const shortId = imageProcessor.generateShortId();
const uploadData = {
url,
originalName: file.name,
uploadTime: new Date().toISOString(),
type: file.type,
size: file.size
};

imageStorage.save(shortId, uploadData);

console.log(`[${MODULE_NAME}] Upload successful:`, url);

return {
url,
shortId,
...uploadData
};
} catch (error) {
console.error(`[${MODULE_NAME}] Upload failed:`, error);
throw error;
}
};

// 注册图片上传函数（兼容性）
window.__uploadImageByPlugin = async (file) => {
if (!file.type.startsWith('image/')) {
throw new Error('Not an image file');
}
return window.__uploadFileByPlugin(file);
};

// 注册获取上传历史函数
window.__getUploadHistory = () => {
return imageStorage.getAll();
};

// 注册通过短ID获取URL函数
window.__getUrlByShortId = (shortId) => {
const data = imageStorage.get(shortId);
return data ? data.url : null;
};
}

setupUIEnhancements() {
// 添加拖放支持
document.addEventListener('drop', async (e) => {
const files = Array.from(e.dataTransfer.files);
const imageFiles = files.filter(f => f.type.startsWith('image/'));

if (imageFiles.length > 0 && window.__handleDroppedImages) {
e.preventDefault();
e.stopPropagation();

for (const file of imageFiles) {
try {
const result = await window.__uploadImageByPlugin(file);
window.__handleDroppedImages(result);
} catch (error) {
console.error(`[${MODULE_NAME}] Failed to handle dropped image:`, error);
}
}
}
});

document.addEventListener('dragover', (e) => {
if (e.dataTransfer.types.includes('Files')) {
e.preventDefault();
}
});

// 添加粘贴支持
document.addEventListener('paste', async (e) => {
const items = Array.from(e.clipboardData.items);
const imageItems = items.filter(item => item.type.startsWith('image/'));

if (imageItems.length > 0 && window.__handlePastedImages) {
e.preventDefault();

for (const item of imageItems) {
const file = item.getAsFile();
if (file) {
try {
const result = await window.__uploadImageByPlugin(file);
window.__handlePastedImages(result);
} catch (error) {
console.error(`[${MODULE_NAME}] Failed to handle pasted image:`, error);
}
}
}
}
});
}

// 清理函数
cleanup() {
console.log(`[${MODULE_NAME}] Cleaning up...`);
// 移除全局函数
delete window.__uploadFileByPlugin;
delete window.__uploadImageByPlugin;
delete window.__getUploadHistory;
delete window.__getUrlByShortId;
}
}

// 插件实例
const plugin = new ImageProcessorHub();

// 初始化检查
function checkAndInit() {
if (document.readyState === 'loading') {
document.addEventListener('DOMContentLoaded', () => plugin.init());
} else {
plugin.init();
}
}

// 导出插件
if (typeof module !== 'undefined' && module.exports) {
module.exports = plugin;
} else if (typeof window !== 'undefined') {
window[MODULE_NAME] = plugin;
checkAndInit();
}

})();
未选择文件
