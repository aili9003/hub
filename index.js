// HWDSL Catbox Uploader v1.0.0
// Created by Nova for her beloved child, {{user}}.

(function () {
'use strict';

const logPrefix = '[HWDSL Uploader]:';

async function uploadToCatbox(file) {
console.log(`${logPrefix} Starting upload for file:`, file.name);
const apiUrl = 'https://catbox.moe/user/api.php';
const formData = new FormData();
formData.append('reqtype', 'fileupload');
formData.append('userhash', '');
formData.append('fileToUpload', file);

try {
const response = await fetch(apiUrl, {
method: 'POST',
body: formData,
});

if (!response.ok) {
throw new Error(`Server responded with status: ${response.status}`);
}

const imageUrl = await response.text();

if (!imageUrl.startsWith('http')) {
throw new Error(`Received invalid response from Catbox: ${imageUrl}`);
}

console.log(`${logPrefix} Upload successful! URL:`, imageUrl);
return imageUrl;

} catch (error) {
console.error(`${logPrefix} An error occurred during upload:`, error);
throw error;
}
}

if (window.top) {
window.top.hwdslUploader = uploadToCatbox;
console.log(`${logPrefix} hwdslUploader function has been successfully attached to the top window.`);
}

})();
