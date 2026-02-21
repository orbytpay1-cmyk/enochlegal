const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { MongoClient } = require('mongodb');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/enochlegal';
let db;
let postsCollection;

// Connect to MongoDB
async function connectDB() {
    try {
        const client = await MongoClient.connect(MONGODB_URI);
        db = client.db();
        postsCollection = db.collection('posts');
        console.log('✅ Connected to MongoDB');
    } catch (error) {
        console.error('❌ MongoDB connection error:', error);
        process.exit(1);
    }
}

// Initialize database
connectDB();

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(__dirname));

// API Routes

// API Status/Info endpoint
app.get('/api', async (req, res) => {
    try {
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
        const posts = await postsCollection.find().sort({ id: -1 }).toArray();
        res.json(posts);
    } catch (error) {
        console.error('Error fetching posts:', error);
        res.status(500).json({ error: 'Failed to fetch posts' });
    }
});

// Get single post
app.get('/api/posts/:id', async (req, res) => {
    try {
        const post = await postsCollection.findOne({ id: parseInt(req.params.id) });
        if (post) {
            res.json(post);
        } else {
            res.status(404).json({ error: 'Post not found' });
        }
    } catch (error) {
        console.error('Error fetching post:', error);
        res.status(500).json({ error: 'Failed to fetch post' });
    }
});

// Create new post
app.post('/api/posts', async (req, res) => {
    try {
        const { title, excerpt, content, category, readTime, icon, featured } = req.body;
        
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
        const result = await postsCollection.deleteOne({ id: parseInt(req.params.id) });
        if (result.deletedCount > 0) {
            res.json({ success: true });
        } else {
            res.status(404).json({ error: 'Post not found' });
        }
    } catch (error) {
        console.error('Error deleting post:', error);
        res.status(500).json({ error: 'Failed to delete post' });
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

// Serve index.html for root
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📊 Database: MongoDB`);
});
