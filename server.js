const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { MongoClient } = require('mongodb');
const path = require('path');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const nodemailer = require('nodemailer');

const app = express();
const PORT = process.env.PORT || 3000;

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
let db;
let postsCollection;
let isConnected = false;

// Middleware
app.use(cors());
app.use(bodyParser.json({ limit: '10mb' }));
app.use(express.static(__dirname));

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
                website: 'https://enochlegal-production.up.railway.app',
                admin: 'https://enochlegal-production.up.railway.app/admin-files/admin.html',
                blog: 'https://enochlegal-production.up.railway.app/blog.html'
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

// Get all posts
app.get('/api/posts', async (req, res) => {
    try {
        if (!isConnected || !postsCollection) {
            return res.status(503).json({ error: 'Database not connected' });
        }
        const posts = await postsCollection.find().sort({ id: -1 }).toArray();
        res.json(posts);
    } catch (error) {
        console.error('Error fetching posts:', error);
        res.status(500).json({ error: 'Failed to fetch posts', details: error.message });
    }
});

// Get single post
app.get('/api/posts/:id', async (req, res) => {
    try {
        if (!isConnected || !postsCollection) {
            return res.status(503).json({ error: 'Database not connected' });
        }
        const post = await postsCollection.findOne({ id: parseInt(req.params.id) });
        if (post) {
            res.json(post);
        } else {
            res.status(404).json({ error: 'Post not found' });
        }
    } catch (error) {
        console.error('Error fetching post:', error);
        res.status(500).json({ error: 'Failed to fetch post', details: error.message });
    }
});

// Upload image endpoint
app.post('/api/upload-image', upload.single('image'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No image file provided' });
        }

        // Convert buffer to base64
        const b64 = Buffer.from(req.file.buffer).toString('base64');
        const dataURI = `data:${req.file.mimetype};base64,${b64}`;

        // Upload to Cloudinary
        const result = await cloudinary.uploader.upload(dataURI, {
            folder: 'enochlegal-blog',
            resource_type: 'auto'
        });

        res.json({ 
            success: true, 
            url: result.secure_url,
            public_id: result.public_id
        });
    } catch (error) {
        console.error('Error uploading image:', error);
        res.status(500).json({ error: 'Failed to upload image', details: error.message });
    }
});

// Create new post
app.post('/api/posts', async (req, res) => {
    try {
        if (!isConnected || !postsCollection) {
            return res.status(503).json({ 
                error: 'Database not connected. Please check MongoDB connection.',
                mongodb_uri_set: !!process.env.MONGODB_URI
            });
        }
        
        const { title, excerpt, content, category, readTime, icon, featured, coverImage } = req.body;
        
        // Validate required fields
        if (!title || !excerpt || !content || !category) {
            return res.status(400).json({ error: 'Missing required fields: title, excerpt, content, category' });
        }
        
        const id = Date.now();
        const date = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
        const author = 'Precious C. Enoch, Esq.';
        
        // If featured, unfeatured others
        if (featured) {
            await postsCollection.updateMany({}, { $set: { featured: false } });
        }
        
        const newPost = {
            id,
            date,
            title,
            excerpt,
            content,
            author,
            read_time: readTime || '5 min read',
            category,
            featured: featured || false,
            icon: icon || '📝',
            coverImage: coverImage || null,
            created_at: new Date()
        };
        
        await postsCollection.insertOne(newPost);
        
        res.json({ success: true, post: newPost });
    } catch (error) {
        console.error('Error creating post:', error);
        res.status(500).json({ error: 'Failed to create post', details: error.message });
    }
});

// Delete post
app.delete('/api/posts/:id', async (req, res) => {
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

// Admin login
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    
    if (username === 'prech114' && password === 'pre11726644472837466@@@') {
        res.json({ success: true, token: 'admin-token-' + Date.now() });
    } else {
        res.status(401).json({ error: 'Invalid credentials' });
    }
});

// Contact form submission
app.post('/api/contact', async (req, res) => {
    try {
        const { name, email, subject, message } = req.body;
        
        // Validate required fields
        if (!name || !email || !message) {
            return res.status(400).json({ error: 'Name, email, and message are required' });
        }
        
        // Check if email is configured
        const emailConfigured = process.env.EMAIL_USER && 
                               process.env.EMAIL_PASS && 
                               process.env.EMAIL_USER !== 'your-email@gmail.com';
        
        if (!emailConfigured) {
            console.log('📧 Email not configured - logging message instead');
            console.log('Contact Form Submission:', { name, email, subject, message });
            
            // Return success even without email configured (for testing)
            return res.json({ 
                success: true, 
                message: 'Message received! We\'ll get back to you soon.',
                note: 'Email service not configured - message logged to console'
            });
        }
        
        // Email options
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
        
        // Send email with timeout
        const sendPromise = transporter.sendMail(mailOptions);
        const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Email timeout')), 10000)
        );
        
        await Promise.race([sendPromise, timeoutPromise]);
        
        res.json({ success: true, message: 'Message sent successfully!' });
    } catch (error) {
        console.error('Error sending email:', error);
        
        // Log the message even if email fails
        console.log('📧 Failed to send email - logging message:', {
            name: req.body.name,
            email: req.body.email,
            subject: req.body.subject,
            message: req.body.message
        });
        
        res.status(500).json({ 
            error: 'Unable to send email at this time. Please contact us directly at preciousenoch2026@gmail.com or via WhatsApp.' 
        });
    }
});

// Serve index.html for root
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

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
        
        db = client.db();
        postsCollection = db.collection('posts');
        isConnected = true;
        console.log('✅ Connected to MongoDB successfully!');
        
        // Test the connection
        const count = await postsCollection.countDocuments();
        console.log(`📊 Found ${count} posts in database`);
        
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
