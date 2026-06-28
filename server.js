const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { MongoClient } = require('mongodb');
const path = require('path');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const nodemailer = require('nodemailer');
const fs = require('fs');
const crypto = require('crypto');
const { uploadsDir, cloudinaryConfigured, saveUploadLocally } = require('./upload-images');
const { registerSeoRoutes } = require('./seo-routes');
const { publicPostsFilter, buildPostFields, postIsPublic } = require('./post-helpers');

const UPLOADS_DIR = uploadsDir(__dirname);

const app = express();
const PORT = process.env.PORT || 3000;

// Trust the Railway/hosting proxy so req.protocol reflects the real https scheme.
// This keeps canonical URLs, sitemap and the API info links correct on any domain.
app.set('trust proxy', true);

// Absolute base URL for the current request (host-aware, so it is correct on the
// Railway subdomain, a custom domain, or localhost without any hard-coded URL).
function siteBase(req) {
    return `${req.protocol}://${req.get('host')}`;
}

// ---- Admin auth (token-based) -------------------------------------------------
// Password-only login. Override on Railway via ADMIN_PASSWORD if you rotate it.
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '761733024737482465143681815056761006303106594842458082750423980112916864535756736339925761101951001313260448677944392036810305049575878960683399327558826205441864329176199115239260930714017255467530019236944604637828824744573794156006021397928955536093425914137697476346474024563046394438766275723880266316948600820296849021172403578240768760973622142689601980381555675801863532581949140512003408158386672046236477727503154733925276525605478267966884';
const validTokens = new Map(); // token -> expiresAt (ms)

function issueToken() {
    const token = crypto.randomBytes(24).toString('hex');
    validTokens.set(token, Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
    return token;
}
function isValidToken(token) {
    const exp = validTokens.get(token);
    if (!exp) return false;
    if (Date.now() > exp) { validTokens.delete(token); return false; }
    return true;
}
// Guards admin-only endpoints. Public read endpoints (GET posts) stay open.
function requireAuth(req, res, next) {
    const header = req.headers.authorization || '';
    const bearer = header.startsWith('Bearer ') ? header.slice(7) : null;
    const token = bearer || req.query.token;
    if (token && isValidToken(token)) return next();
    return res.status(401).json({ error: 'Unauthorized' });
}

// Configure email transporter
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER || 'your-email@gmail.com',
        pass: process.env.EMAIL_PASS || 'your-app-password'
    }
});

// Configure Cloudinary (free image hosting)
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'demo',
    api_key: process.env.CLOUDINARY_API_KEY || 'demo',
    api_secret: process.env.CLOUDINARY_API_SECRET || 'demo'
});

// Configure multer for memory storage
const storage = multer.memoryStorage();
const upload = multer({ 
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Only image files are allowed!'), false);
        }
    }
});

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/enochlegal';
const MONGODB_DB_NAME = process.env.MONGODB_DB_NAME || 'enochlegal';
let db;
let postsCollection;
let messagesCollection;
let visitsCollection;
let isConnected = false;

// Middleware
app.use(cors());
app.use(bodyParser.json({ limit: '10mb' }));

// Health check endpoint (always works)
app.get('/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        timestamp: new Date().toISOString(),
        database: isConnected ? 'connected' : 'disconnected'
    });
});

// API Status/Info endpoint
app.get('/api', async (req, res) => {
    try {
        if (!isConnected || !postsCollection) {
            return res.json({
                api: 'Enoch & Enoch Legal Blog System',
                status: '🟡 PARTIAL',
                message: 'API operational but database not connected',
                database: 'Disconnected',
                mongodb_uri_set: !!process.env.MONGODB_URI,
                timestamp: new Date().toISOString()
            });
        }
        
        const total = await postsCollection.countDocuments();
        const featured = await postsCollection.countDocuments({ featured: true });
        
        res.json({
            api: 'Enoch & Enoch Legal Blog System',
            status: '🟢 LIVE',
            version: 'v2.0.0',
            environment: 'Production',
            platform: 'Railway Cloud',
            tech_stack: {
                backend: 'Node.js ' + process.version,
                framework: 'Express.js',
                database: 'MongoDB',
                hosting: 'Railway',
                deployment: 'Continuous Deployment'
            },
            endpoints: {
                status: 'GET /api',
                posts: 'GET /api/posts',
                singlePost: 'GET /api/posts/:id',
                createPost: 'POST /api/posts',
                deletePost: 'DELETE /api/posts/:id',
                authentication: 'POST /api/login'
            },
            features: [
                'Real-time blog publishing',
                'RESTful API architecture',
                'CORS enabled',
                'MongoDB persistence',
                'Admin authentication',
                'Responsive frontend'
            ],
            metrics: {
                totalPosts: total,
                featuredPosts: featured,
                serverUptime: Math.floor(process.uptime()) + ' seconds',
                memoryUsage: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + ' MB',
                database: 'Connected'
            },
            links: {
                website: siteBase(req),
                admin: `${siteBase(req)}/admin`,
                blog: `${siteBase(req)}/blog.html`
            },
            timestamp: new Date().toISOString(),
            message: '⚡ API is operational and ready to serve requests'
        });
    } catch (error) {
        console.error('API error:', error);
        res.json({
            api: 'Enoch & Enoch Legal Blog System',
            status: '🟢 LIVE',
            message: 'API operational',
            timestamp: new Date().toISOString()
        });
    }
});

// Get all published posts (public — hides drafts & future-scheduled)
app.get('/api/posts', async (req, res) => {
    try {
        if (!isConnected || !postsCollection) {
            return res.status(503).json({ error: 'Database not connected' });
        }
        const posts = await postsCollection.find(publicPostsFilter()).sort({ id: -1 }).toArray();
        res.json(posts.filter(p => postIsPublic(p)));
    } catch (error) {
        console.error('Error fetching posts:', error);
        res.status(500).json({ error: 'Failed to fetch posts', details: error.message });
    }
});

// Get single published post
app.get('/api/posts/:id', async (req, res) => {
    try {
        if (!isConnected || !postsCollection) {
            return res.status(503).json({ error: 'Database not connected' });
        }
        const post = await postsCollection.findOne({ id: parseInt(req.params.id) });
        if (post && postIsPublic(post)) {
            res.json(post);
        } else {
            res.status(404).json({ error: 'Post not found' });
        }
    } catch (error) {
        console.error('Error fetching post:', error);
        res.status(500).json({ error: 'Failed to fetch post', details: error.message });
    }
});

// Admin: all posts including drafts & scheduled
app.get('/api/admin/posts', requireAuth, async (req, res) => {
    try {
        if (!isConnected || !postsCollection) {
            return res.status(503).json({ error: 'Database not connected' });
        }
        const posts = await postsCollection.find().sort({ id: -1 }).toArray();
        res.json(posts);
    } catch (error) {
        console.error('Error fetching admin posts:', error);
        res.status(500).json({ error: 'Failed to fetch posts', details: error.message });
    }
});

// Admin: single post (any status)
app.get('/api/admin/posts/:id', requireAuth, async (req, res) => {
    try {
        if (!isConnected || !postsCollection) {
            return res.status(503).json({ error: 'Database not connected' });
        }
        const post = await postsCollection.findOne({ id: parseInt(req.params.id) });
        if (post) res.json(post);
        else res.status(404).json({ error: 'Post not found' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch post', details: error.message });
    }
});

// Upload image — Cloudinary when configured, otherwise saves to /uploads on the server
app.post('/api/upload-image', requireAuth, upload.single('image'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No image file provided' });
        }

        if (cloudinaryConfigured()) {
            const b64 = Buffer.from(req.file.buffer).toString('base64');
            const dataURI = `data:${req.file.mimetype};base64,${b64}`;
            const result = await cloudinary.uploader.upload(dataURI, {
                folder: 'enochlegal-blog',
                resource_type: 'auto'
            });
            return res.json({
                success: true,
                url: result.secure_url,
                public_id: result.public_id,
                storage: 'cloudinary'
            });
        }

        // Fallback: store on server (works immediately; add Cloudinary env vars for permanent CDN hosting)
        const url = saveUploadLocally(req.file, __dirname, siteBase(req));
        console.log('📸 Image saved locally:', url);
        res.json({ success: true, url, storage: 'local' });
    } catch (error) {
        console.error('Error uploading image:', error);
        res.status(500).json({
            error: 'Failed to upload image',
            details: error.message,
            hint: cloudinaryConfigured()
                ? 'Cloudinary upload failed — check your API credentials.'
                : 'Using local storage. If this failed, try a smaller JPG/PNG/WebP under 5MB.'
        });
    }
});

// Create new post (publish now, schedule, or draft)
app.post('/api/posts', requireAuth, async (req, res) => {
    try {
        if (!isConnected || !postsCollection) {
            return res.status(503).json({ 
                error: 'Database not connected. Please check MongoDB connection.',
                mongodb_uri_set: !!process.env.MONGODB_URI
            });
        }
        
        const { title, excerpt, content, category } = req.body;
        if (!title || !excerpt || !content || !category) {
            return res.status(400).json({ error: 'Missing required fields: title, excerpt, content, category' });
        }

        let fields;
        try {
            fields = buildPostFields(req.body, null);
        } catch (err) {
            return res.status(400).json({ error: err.message });
        }

        const id = Date.now();
        if (fields.featured && fields.status === 'published' && postIsPublic({ ...fields, status: fields.status, publishAt: fields.publishAt })) {
            await postsCollection.updateMany({}, { $set: { featured: false } });
        }
        
        const newPost = {
            id,
            ...fields,
            created_at: new Date()
        };
        
        await postsCollection.insertOne(newPost);
        
        res.json({ success: true, post: newPost });
    } catch (error) {
        console.error('Error creating post:', error);
        res.status(500).json({ error: 'Failed to create post', details: error.message });
    }
});

// Update existing post
app.put('/api/posts/:id', requireAuth, async (req, res) => {
    try {
        if (!isConnected || !postsCollection) {
            return res.status(503).json({ error: 'Database not connected' });
        }
        const id = parseInt(req.params.id);
        const existing = await postsCollection.findOne({ id });
        if (!existing) return res.status(404).json({ error: 'Post not found' });

        const { title, excerpt, content, category } = req.body;
        if (!title || !excerpt || !content || !category) {
            return res.status(400).json({ error: 'Missing required fields: title, excerpt, content, category' });
        }

        let fields;
        try {
            fields = buildPostFields(req.body, existing);
        } catch (err) {
            return res.status(400).json({ error: err.message });
        }

        if (fields.featured && postIsPublic({ ...fields, status: fields.status, publishAt: fields.publishAt })) {
            await postsCollection.updateMany({ id: { $ne: id } }, { $set: { featured: false } });
        }

        await postsCollection.updateOne({ id }, { $set: fields });
        const updated = await postsCollection.findOne({ id });
        res.json({ success: true, post: updated });
    } catch (error) {
        console.error('Error updating post:', error);
        res.status(500).json({ error: 'Failed to update post', details: error.message });
    }
});

// Quick publish / unpublish
app.patch('/api/posts/:id/status', requireAuth, async (req, res) => {
    try {
        if (!isConnected || !postsCollection) {
            return res.status(503).json({ error: 'Database not connected' });
        }
        const id = parseInt(req.params.id);
        const { action } = req.body; // publish | draft | unschedule
        const existing = await postsCollection.findOne({ id });
        if (!existing) return res.status(404).json({ error: 'Post not found' });

        const now = new Date();
        let update = { updated_at: now };
        if (action === 'publish') {
            update.status = 'published';
            update.publishAt = now;
        } else if (action === 'draft') {
            update.status = 'draft';
            update.publishAt = null;
        } else {
            return res.status(400).json({ error: 'Unknown action' });
        }
        await postsCollection.updateOne({ id }, { $set: update });
        res.json({ success: true, post: await postsCollection.findOne({ id }) });
    } catch (error) {
        res.status(500).json({ error: 'Failed to update status', details: error.message });
    }
});

// Delete post
app.delete('/api/posts/:id', requireAuth, async (req, res) => {
    try {
        if (!isConnected || !postsCollection) {
            return res.status(503).json({ error: 'Database not connected' });
        }
        const result = await postsCollection.deleteOne({ id: parseInt(req.params.id) });
        if (result.deletedCount > 0) {
            res.json({ success: true });
        } else {
            res.status(404).json({ error: 'Post not found' });
        }
    } catch (error) {
        console.error('Error deleting post:', error);
        res.status(500).json({ error: 'Failed to delete post', details: error.message });
    }
});

// Admin login — password only; issues a real, expiring token for admin endpoints
app.post('/api/login', (req, res) => {
    const { password } = req.body;

    if (password && password === ADMIN_PASSWORD) {
        res.json({ success: true, token: issueToken() });
    } else {
        res.status(401).json({ error: 'Invalid access code' });
    }
});

// Verify a token is still valid (used by the dashboard on load)
app.get('/api/admin/verify', requireAuth, (req, res) => {
    res.json({ ok: true });
});

// Contact form submission - Save to database
app.post('/api/contact', async (req, res) => {
    try {
        const { name, email, subject, message } = req.body;
        
        // Validate required fields
        if (!name || !email || !message) {
            return res.status(400).json({ error: 'Name, email, and message are required' });
        }
        
        // Save message to database
        const newMessage = {
            id: Date.now(),
            name,
            email,
            subject: subject || 'No subject',
            message,
            date: new Date().toISOString(),
            read: false,
            created_at: new Date()
        };
        
        if (isConnected && messagesCollection) {
            await messagesCollection.insertOne(newMessage);
            console.log('✅ Message saved to database:', newMessage.id);
        } else {
            console.log('⚠️ Database not connected - message not saved');
        }
        
        // Try to send email (optional, won't fail if email not configured)
        try {
            const emailConfigured = process.env.EMAIL_USER && 
                                   process.env.EMAIL_PASS && 
                                   process.env.EMAIL_USER !== 'your-email@gmail.com';
            
            if (emailConfigured) {
                const mailOptions = {
                    from: process.env.EMAIL_USER,
                    to: 'preciousenoch2026@gmail.com',
                    replyTo: email,
                    subject: `Contact Form: ${subject || 'New Message'}`,
                    html: `
                        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                            <h2 style="color: #1a1a2e; border-bottom: 3px solid #c9a961; padding-bottom: 10px;">
                                New Contact Form Submission
                            </h2>
                            <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
                                <p style="margin: 10px 0;"><strong>Name:</strong> ${name}</p>
                                <p style="margin: 10px 0;"><strong>Email:</strong> ${email}</p>
                                <p style="margin: 10px 0;"><strong>Subject:</strong> ${subject || 'No subject'}</p>
                            </div>
                            <div style="background: white; padding: 20px; border-left: 4px solid #c9a961; margin: 20px 0;">
                                <h3 style="color: #1a1a2e; margin-top: 0;">Message:</h3>
                                <p style="line-height: 1.6; color: #333;">${message}</p>
                            </div>
                            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; color: #666; font-size: 0.9rem;">
                                <p>This message was sent from the Enoch & Enoch Legal website contact form.</p>
                                <p>Reply directly to: <a href="mailto:${email}" style="color: #c9a961;">${email}</a></p>
                            </div>
                        </div>
                    `
                };
                
                const sendPromise = transporter.sendMail(mailOptions);
                const timeoutPromise = new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('Email timeout')), 10000)
                );
                
                await Promise.race([sendPromise, timeoutPromise]);
                console.log('✅ Email sent successfully');
            }
        } catch (emailError) {
            console.log('⚠️ Email failed but message saved to database:', emailError.message);
        }
        
        res.json({ success: true, message: 'Message received! We\'ll get back to you soon.' });
    } catch (error) {
        console.error('Error processing contact form:', error);
        res.status(500).json({ 
            error: 'Unable to process your message. Please try again or contact us directly.' 
        });
    }
});

// Get all messages (admin only)
app.get('/api/messages', requireAuth, async (req, res) => {
    try {
        if (!isConnected || !messagesCollection) {
            return res.status(503).json({ error: 'Database not connected' });
        }
        const messages = await messagesCollection.find().sort({ id: -1 }).toArray();
        res.json(messages);
    } catch (error) {
        console.error('Error fetching messages:', error);
        res.status(500).json({ error: 'Failed to fetch messages', details: error.message });
    }
});

// Mark message as read
app.patch('/api/messages/:id/read', requireAuth, async (req, res) => {
    try {
        if (!isConnected || !messagesCollection) {
            return res.status(503).json({ error: 'Database not connected' });
        }
        await messagesCollection.updateOne(
            { id: parseInt(req.params.id) },
            { $set: { read: true } }
        );
        res.json({ success: true });
    } catch (error) {
        console.error('Error marking message as read:', error);
        res.status(500).json({ error: 'Failed to update message', details: error.message });
    }
});

// Delete message
app.delete('/api/messages/:id', requireAuth, async (req, res) => {
    try {
        if (!isConnected || !messagesCollection) {
            return res.status(503).json({ error: 'Database not connected' });
        }
        const result = await messagesCollection.deleteOne({ id: parseInt(req.params.id) });
        if (result.deletedCount > 0) {
            res.json({ success: true });
        } else {
            res.status(404).json({ error: 'Message not found' });
        }
    } catch (error) {
        console.error('Error deleting message:', error);
        res.status(500).json({ error: 'Failed to delete message', details: error.message });
    }
});

// ---- Visitor analytics --------------------------------------------------------
// One lightweight document per browser session. Powers the live dashboard.
function parseDevice(ua) {
    ua = ua || '';
    let browser = 'Other';
    if (/Edg\//.test(ua)) browser = 'Edge';
    else if (/OPR\/|Opera/.test(ua)) browser = 'Opera';
    else if (/Chrome\//.test(ua)) browser = 'Chrome';
    else if (/Firefox\//.test(ua)) browser = 'Firefox';
    else if (/Safari\//.test(ua)) browser = 'Safari';
    let os = 'Other';
    if (/Windows/.test(ua)) os = 'Windows';
    else if (/iPhone|iPad|iOS/.test(ua)) os = 'iOS';
    else if (/Mac OS X|Macintosh/.test(ua)) os = 'macOS';
    else if (/Android/.test(ua)) os = 'Android';
    else if (/Linux/.test(ua)) os = 'Linux';
    const mobile = /Mobile|iPhone|Android/.test(ua);
    return { browser, os, type: mobile ? 'Mobile' : 'Desktop' };
}
function maskIp(ip) {
    if (!ip) return '';
    if (ip.includes(':')) return ip.split(':').slice(0, 4).join(':') + '::';
    const parts = ip.split('.');
    if (parts.length === 4) { parts[3] = 'x'; return parts.join('.'); }
    return ip;
}

const LIVE_WINDOW_MS = 45000; // "online now" if seen within the last 45 seconds

// Admin / staff routes — never counted in "Live Now" (public site only)
function isStaffPath(page) {
    const p = (page || '').split('?')[0];
    return p === '/admin' || p.startsWith('/admin/') || p.startsWith('/admin-files');
}
function isPublicVisitor(doc) {
    if (!doc) return false;
    if (doc.staff === true) return false;
    if (String(doc.sessionId || '').startsWith('staff_')) return false;
    return !isStaffPath(doc.lastPath);
}

function publicVisitorQuery() {
    return {
        staff: { $ne: true },
        sessionId: { $not: { $regex: '^staff_' } },
        lastPath: { $not: { $regex: '^/admin' } }
    };
}

// Record a visit / heartbeat (public — fired by every page via analytics.js)
app.post('/api/track', async (req, res) => {
    try {
        if (!isConnected || !visitsCollection) return res.json({ ok: false });
        const { sessionId, path: p, event, referrer, title } = req.body || {};
        if (!sessionId || typeof sessionId !== 'string' || sessionId.length > 80) {
            return res.status(400).json({ error: 'bad session' });
        }
        const now = new Date();
        const ipRaw = (req.headers['x-forwarded-for'] || req.ip || '').toString().split(',')[0].trim();
        const ua = (req.headers['user-agent'] || '').slice(0, 300);
        const page = (p || '/').toString().slice(0, 200);
        const onStaff = isStaffPath(page);

        const existing = await visitsCollection.findOne({ sessionId });
        if (!existing) {
            if (onStaff) {
                // Direct admin entry — do not create a public visitor record
                await visitsCollection.insertOne({
                    sessionId, firstSeen: now, lastSeen: now, totalMs: 0,
                    pageviews: 0, lastPath: page, lastTitle: 'Admin Dashboard',
                    paths: [], referrer: 'staff', ip: maskIp(ipRaw),
                    device: parseDevice(ua), staff: true
                });
            } else {
                await visitsCollection.insertOne({
                    sessionId, firstSeen: now, lastSeen: now, totalMs: 0,
                    pageviews: 1, lastPath: page, lastTitle: (title || '').slice(0, 120),
                    paths: [page], referrer: (referrer || 'direct').toString().slice(0, 200),
                    ip: maskIp(ipRaw), device: parseDevice(ua), staff: false
                });
            }
        } else if (onStaff) {
            await visitsCollection.updateOne({ sessionId }, {
                $set: {
                    lastSeen: now, lastPath: page, lastTitle: 'Admin Dashboard', staff: true
                }
            });
        } else {
            const delta = Math.min(Math.max(0, now - new Date(existing.lastSeen)), LIVE_WINDOW_MS);
            await visitsCollection.updateOne({ sessionId }, {
                $set: {
                    lastSeen: now, lastPath: page, lastTitle: (title || existing.lastTitle || '').slice(0, 120),
                    staff: false
                },
                $inc: { totalMs: delta, pageviews: event === 'enter' ? 1 : 0 },
                $addToSet: { paths: page }
            });
        }
        res.json({ ok: true });
    } catch (e) {
        console.error('Track error:', e.message);
        res.json({ ok: false });
    }
});

// Admin analytics snapshot (guarded) — polled by the dashboard for a real-time feed
app.get('/api/admin/analytics', requireAuth, async (req, res) => {
    try {
        if (!isConnected || !visitsCollection) return res.status(503).json({ error: 'Database not connected' });
        const now = Date.now();
        const liveCutoff = new Date(now - LIVE_WINDOW_MS);
        const dayCutoff = new Date(now - 24 * 60 * 60 * 1000);

        const publicMatch = publicVisitorQuery();

        const totals = (await visitsCollection.aggregate([
            { $match: publicMatch },
            { $group: { _id: null, totalMs: { $sum: '$totalMs' }, pageviews: { $sum: '$pageviews' }, count: { $sum: 1 } } }
        ]).toArray())[0] || { totalMs: 0, pageviews: 0, count: 0 };

        const recentDocs = await visitsCollection.find(publicMatch).sort({ lastSeen: -1 }).limit(60).toArray();
        const liveDocs = recentDocs.filter(d =>
            isPublicVisitor(d) && new Date(d.lastSeen) >= liveCutoff
        );
        const today = await visitsCollection.countDocuments({ ...publicMatch, firstSeen: { $gte: dayCutoff } });

        const topPagesAgg = await visitsCollection.aggregate([
            { $match: publicMatch },
            { $unwind: '$paths' },
            { $match: { paths: { $not: { $regex: '^/admin' } } } },
            { $group: { _id: '$paths', visitors: { $sum: 1 } } },
            { $sort: { visitors: -1 } },
            { $limit: 8 }
        ]).toArray();

        const slim = d => ({
            sessionId: d.sessionId,
            id: d.sessionId.length <= 10 ? d.sessionId : d.sessionId.slice(0, 6) + '…' + d.sessionId.slice(-4),
            page: d.lastPath, title: d.lastTitle || '',
            pageviews: d.pageviews || 0,
            totalMs: d.totalMs || 0,
            referrer: d.referrer || 'direct',
            device: d.device || {},
            ip: d.ip || '',
            firstSeen: d.firstSeen, lastSeen: d.lastSeen,
            live: isPublicVisitor(d) && new Date(d.lastSeen) >= liveCutoff
        });

        res.json({
            liveNow: liveDocs.length,
            totalVisitors: totals.count,
            totalPageviews: totals.pageviews,
            totalTimeMs: totals.totalMs,
            avgTimeMs: totals.count ? Math.round(totals.totalMs / totals.count) : 0,
            today,
            live: liveDocs.map(slim),
            recent: recentDocs.slice(0, 40).map(slim),
            topPages: topPagesAgg.map(t => ({ path: t._id, visitors: t.visitors })),
            serverTime: new Date().toISOString()
        });
    } catch (e) {
        res.status(500).json({ error: 'analytics failed', details: e.message });
    }
});

// Delete one visitor session (admin)
app.delete('/api/admin/analytics/visits/:sessionId', requireAuth, async (req, res) => {
    try {
        if (!isConnected || !visitsCollection) {
            return res.status(503).json({ error: 'Database not connected' });
        }
        const sessionId = decodeURIComponent(req.params.sessionId || '').trim();
        if (!sessionId || sessionId.length > 80) {
            return res.status(400).json({ error: 'Invalid session id' });
        }
        const result = await visitsCollection.deleteOne({ sessionId });
        if (result.deletedCount === 0) {
            return res.status(404).json({ error: 'Visit record not found' });
        }
        res.json({ success: true, deleted: 1 });
    } catch (e) {
        console.error('Delete visit error:', e.message);
        res.status(500).json({ error: 'Failed to delete visit', details: e.message });
    }
});

// Clear all visitor records (admin)
app.delete('/api/admin/analytics/visits', requireAuth, async (req, res) => {
    try {
        if (!isConnected || !visitsCollection) {
            return res.status(503).json({ error: 'Database not connected' });
        }
        const result = await visitsCollection.deleteMany({});
        res.json({ success: true, deleted: result.deletedCount });
    } catch (e) {
        console.error('Clear visits error:', e.message);
        res.status(500).json({ error: 'Failed to clear visits', details: e.message });
    }
});

// robots.txt — host-aware, points crawlers at the sitemap, hides the admin panel
app.get('/robots.txt', (req, res) => {
    const base = siteBase(req);
    res.type('text/plain').send(
        `User-agent: *\n` +
        `Allow: /\n` +
        `Disallow: /admin\n` +
        `Disallow: /admin-files/\n` +
        `Disallow: /api/\n\n` +
        `Sitemap: ${base}/sitemap.xml\n`
    );
});

// sitemap.xml — host-aware, includes every page + post, with image entries so the
// firm's photography (Precious C. Enoch, Esq.) is discovered and indexed by Google.
app.get('/sitemap.xml', async (req, res) => {
    const base = siteBase(req);
    const partnerImg = {
        loc: `${base}/precious-enoch-2.jpg`,
        title: 'Precious C. Enoch, Esq. — Principal Partner, Enoch & Enoch Legal',
        caption: 'Precious C. Enoch, Esq., Principal Partner at Enoch & Enoch Legal, Lagos, Nigeria.'
    };
    const urls = [
        { loc: `${base}/`, priority: '1.0', freq: 'weekly', images: [partnerImg] },
        { loc: `${base}/about`, priority: '0.9', freq: 'monthly', images: [partnerImg] },
        { loc: `${base}/practice`, priority: '0.8', freq: 'monthly' },
        { loc: `${base}/blog.html`, priority: '0.8', freq: 'weekly' },
        { loc: `${base}/insights`, priority: '0.8', freq: 'weekly' },
        { loc: `${base}/contact`, priority: '0.7', freq: 'monthly' }
    ];
    try {
        if (isConnected && postsCollection) {
            const posts = await postsCollection.find(publicPostsFilter(), { projection: { id: 1, title: 1, excerpt: 1, coverImage: 1, created_at: 1, publishAt: 1, status: 1 } }).sort({ id: -1 }).toArray();
            posts.filter(p => postIsPublic(p)).forEach(p => urls.push({
                loc: `${base}/blog-post.html?id=${p.id}`,
                priority: '0.6',
                freq: 'monthly',
                lastmod: p.created_at ? new Date(p.created_at).toISOString().slice(0, 10) : undefined,
                images: p.coverImage ? [{
                    loc: p.coverImage,
                    title: p.title || '',
                    caption: (p.excerpt || p.title || '').slice(0, 300)
                }] : []
            }));
        }
    } catch (e) {
        console.log('⚠️ sitemap: could not list posts:', e.message);
    }
    const esc = s => String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const body = `<?xml version="1.0" encoding="UTF-8"?>\n` +
        `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n` +
        urls.map(u =>
            `  <url>\n    <loc>${esc(u.loc)}</loc>\n` +
            (u.lastmod ? `    <lastmod>${u.lastmod}</lastmod>\n` : '') +
            `    <changefreq>${u.freq}</changefreq>\n    <priority>${u.priority}</priority>\n` +
            (u.images || []).map(img =>
                `    <image:image>\n      <image:loc>${esc(img.loc)}</image:loc>\n` +
                (img.title ? `      <image:title>${esc(img.title)}</image:title>\n` : '') +
                (img.caption ? `      <image:caption>${esc(img.caption)}</image:caption>\n` : '') +
                `    </image:image>\n`
            ).join('') +
            `  </url>`
        ).join('\n') +
        `\n</urlset>\n`;
    res.type('application/xml').send(body);
});

// SEO-aware blog pages + RSS feed (must register before express.static)
registerSeoRoutes(app, {
    rootDir: __dirname,
    siteBase,
    isConnected: () => isConnected,
    postsCollection: () => postsCollection
});

// Uploaded blog images (local fallback when Cloudinary is not configured)
app.use('/uploads', express.static(UPLOADS_DIR));

// Static assets — after SEO routes so blog pages get server-rendered meta for Google
app.use(express.static(__dirname));

// Clean multi-page URLs — SEO patched server-side for correct canonicals on any domain
// (handled inside registerSeoRoutes)

// Hidden admin entry — reached via the 10-tap gesture. Password is still required.
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'admin-files', 'admin.html')));

// Start server FIRST, then connect to MongoDB
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📊 Database: MongoDB`);
    console.log(`🔗 MONGODB_URI set: ${!!process.env.MONGODB_URI}`);
    
    // Connect to MongoDB after server starts
    connectDB();
});

// Connect to MongoDB (non-blocking)
async function connectDB() {
    try {
        console.log('🔄 Connecting to MongoDB...');
        console.log('📍 URI:', MONGODB_URI.replace(/:[^:@]+@/, ':****@')); // Hide password
        
        const client = await MongoClient.connect(MONGODB_URI, {
            serverSelectionTimeoutMS: 10000,
            socketTimeoutMS: 45000,
        });
        
        db = client.db(MONGODB_DB_NAME);
        postsCollection = db.collection('posts');
        messagesCollection = db.collection('messages');
        visitsCollection = db.collection('visits');
        isConnected = true;
        console.log('✅ Connected to MongoDB successfully!');

        // Helpful indexes for analytics (safe to call repeatedly)
        try {
            await visitsCollection.createIndex({ sessionId: 1 }, { unique: true });
            await visitsCollection.createIndex({ lastSeen: -1 });
            await visitsCollection.createIndex({ firstSeen: -1 });
        } catch (ixErr) { /* index may already exist */ }
        
        // Test the connection
        const count = await postsCollection.countDocuments();
        console.log(`📊 Found ${count} posts in database`);

        // Auto-publish scheduled posts every minute
        startPublishScheduler();

        // Auto-seed: if the collection is brand new / empty, load the bundled posts.json
        // so a freshly-provisioned database (e.g. on a new Railway account) is never blank.
        if (count === 0) {
            try {
                const seedPath = path.join(__dirname, 'posts.json');
                if (fs.existsSync(seedPath)) {
                    const seed = JSON.parse(fs.readFileSync(seedPath, 'utf8'));
                    if (Array.isArray(seed) && seed.length) {
                        const docs = seed.map(p => ({
                            ...p,
                            read_time: p.read_time || p.readTime || '5 min read',
                            created_at: p.created_at ? new Date(p.created_at) : new Date()
                        }));
                        await postsCollection.insertMany(docs);
                        console.log(`🌱 Seeded ${docs.length} starter post(s) from posts.json`);
                    }
                }
            } catch (seedErr) {
                console.log('⚠️ Auto-seed skipped:', seedErr.message);
            }
        }

    } catch (error) {
        console.error('❌ MongoDB connection error:', error.message);
        console.log('⚠️ Server will continue but database operations will fail');
        console.log('💡 Check: 1) MongoDB URI is correct, 2) Network access allows 0.0.0.0/0, 3) User has correct permissions');
        isConnected = false;
        
        // Retry connection after 30 seconds
        setTimeout(() => {
            console.log('🔄 Retrying MongoDB connection...');
            connectDB();
        }, 30000);
    }
}

// Promote scheduled posts when their publishAt time arrives
let publishSchedulerStarted = false;
function startPublishScheduler() {
    if (publishSchedulerStarted) return;
    publishSchedulerStarted = true;

    async function run() {
        if (!isConnected || !postsCollection) return;
        try {
            const now = new Date();
            const result = await postsCollection.updateMany(
                { status: 'scheduled', publishAt: { $lte: now } },
                { $set: { status: 'published', updated_at: now } }
            );
            if (result.modifiedCount > 0) {
                console.log(`📅 Auto-published ${result.modifiedCount} scheduled post(s)`);
            }
        } catch (e) {
            console.log('⚠️ Schedule publish check failed:', e.message);
        }
    }

    run();
    setInterval(run, 60 * 1000);
}
