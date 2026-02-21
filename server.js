const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { Pool } = require('pg');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// PostgreSQL connection
const pool = new Pool({
    connectionString: process.env.DATABASE_URL || process.env.DATABASE_PUBLIC_URL,
    ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false
});

// Initialize database table
async function initDatabase() {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS posts (
                id BIGINT PRIMARY KEY,
                date VARCHAR(255) NOT NULL,
                title TEXT NOT NULL,
                excerpt TEXT NOT NULL,
                content TEXT NOT NULL,
                author VARCHAR(255) DEFAULT 'Precious C. Enoch, Esq.',
                read_time VARCHAR(50) DEFAULT '5 min read',
                category VARCHAR(100) NOT NULL,
                featured BOOLEAN DEFAULT FALSE,
                icon VARCHAR(10) DEFAULT '📝',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('✅ Database table initialized');
    } catch (error) {
        console.error('❌ Database initialization error:', error);
    }
}

initDatabase();

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(__dirname));

// API Routes

// API Status/Info endpoint
app.get('/api', async (req, res) => {
    try {
        const result = await pool.query('SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE featured = true) as featured FROM posts');
        const stats = result.rows[0];
        
        res.json({
            api: 'Enoch & Enoch Legal Blog System',
            status: '🟢 LIVE',
            version: 'v2.0.0',
            environment: 'Production',
            platform: 'Railway Cloud',
            tech_stack: {
                backend: 'Node.js ' + process.version,
                framework: 'Express.js',
                database: 'PostgreSQL (Railway)',
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
                'PostgreSQL persistence',
                'Admin authentication',
                'Responsive frontend'
            ],
            metrics: {
                totalPosts: parseInt(stats.total),
                featuredPosts: parseInt(stats.featured),
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
        const result = await pool.query('SELECT * FROM posts ORDER BY id DESC');
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching posts:', error);
        res.status(500).json({ error: 'Failed to fetch posts' });
    }
});

// Get single post
app.get('/api/posts/:id', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM posts WHERE id = $1', [req.params.id]);
        if (result.rows.length > 0) {
            res.json(result.rows[0]);
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
        const id = Date.now();
        const date = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
        const author = 'Precious C. Enoch, Esq.';
        
        // If featured, unfeatured others
        if (featured) {
            await pool.query('UPDATE posts SET featured = FALSE');
        }
        
        const result = await pool.query(
            `INSERT INTO posts (id, date, title, excerpt, content, author, read_time, category, featured, icon) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) 
             RETURNING *`,
            [id, date, title, excerpt, content, author, readTime || '5 min read', category, featured || false, icon || '📝']
        );
        
        res.json({ success: true, post: result.rows[0] });
    } catch (error) {
        console.error('Error creating post:', error);
        res.status(500).json({ error: 'Failed to create post' });
    }
});

// Delete post
app.delete('/api/posts/:id', async (req, res) => {
    try {
        const result = await pool.query('DELETE FROM posts WHERE id = $1', [req.params.id]);
        if (result.rowCount > 0) {
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
    console.log(`📊 Database: PostgreSQL (Railway)`);
});
