// Blog posts data - loads from backend API
var allBlogPosts = [];

// API base URL - same-origin so it works on any host (Railway, custom domain, localhost)
// without re-deploying. The Express server serves both the site and the /api routes.
const API_URL = '';

// Load posts from backend
async function loadBlogPosts() {
    try {
        const response = await fetch(`${API_URL}/api/posts`);
        if (response.ok) {
            allBlogPosts = await response.json();
        }
    } catch (error) {
        console.error('Error loading posts:', error);
    }
    return allBlogPosts;
}

// Create new post
async function createPost(postData) {
    try {
        const response = await fetch(`${API_URL}/api/posts`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(postData)
        });
        
        if (response.ok) {
            const result = await response.json();
            return result;
        }
    } catch (error) {
        console.error('Error creating post:', error);
    }
    return null;
}

// Delete post
async function deletePost(postId) {
    try {
        const response = await fetch(`${API_URL}/api/posts/${postId}`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            return true;
        }
    } catch (error) {
        console.error('Error deleting post:', error);
    }
    return false;
}

// Login
async function adminLogin(password) {
    try {
        const response = await fetch(`${API_URL}/api/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ password })
        });
        
        if (response.ok) {
            const result = await response.json();
            return result;
        }
    } catch (error) {
        console.error('Error logging in:', error);
    }
    return null;
}
