const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

function uploadsDir(rootDir) {
    const dir = path.join(rootDir, 'uploads');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    return dir;
}

function cloudinaryConfigured() {
    const name = process.env.CLOUDINARY_CLOUD_NAME;
    const key = process.env.CLOUDINARY_API_KEY;
    const secret = process.env.CLOUDINARY_API_SECRET;
    return !!(name && key && secret && name !== 'demo' && key !== 'demo' && secret !== 'demo');
}

// Pick a safe image extension from the original filename or mime type.
function extFor(originalname, mimetype) {
    const ext = (path.extname(originalname || '') || '').toLowerCase().slice(0, 8);
    if (/^\.(jpe?g|png|gif|webp)$/i.test(ext)) return ext;
    const map = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/gif': '.gif', 'image/webp': '.webp' };
    return map[(mimetype || '').toLowerCase()] || '.jpg';
}

// Make a unique, URL-safe filename for an uploaded image.
function uploadName(originalname, mimetype) {
    return `${Date.now()}-${crypto.randomBytes(8).toString('hex')}${extFor(originalname, mimetype)}`;
}

// Disk fallback. Returns a RELATIVE url (/uploads/<name>) so it stays valid on any
// host/domain. NOTE: Railway's disk is ephemeral — prefer Cloudinary or MongoDB storage.
function saveUploadLocally(file, rootDir) {
    const name = uploadName(file.originalname, file.mimetype);
    fs.writeFileSync(path.join(uploadsDir(rootDir), name), file.buffer);
    return `/uploads/${name}`;
}

module.exports = { uploadsDir, cloudinaryConfigured, saveUploadLocally, extFor, uploadName };
