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

function saveUploadLocally(file, rootDir, siteBase) {
    const ext = (path.extname(file.originalname || '') || '.jpg').toLowerCase().slice(0, 8);
    const safeExt = /^\.(jpe?g|png|gif|webp)$/i.test(ext) ? ext : '.jpg';
    const name = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}${safeExt}`;
    fs.writeFileSync(path.join(uploadsDir(rootDir), name), file.buffer);
    return `${siteBase}/uploads/${name}`;
}

module.exports = { uploadsDir, cloudinaryConfigured, saveUploadLocally };
