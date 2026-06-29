// Blog posts data - loads from backend API
var allBlogPosts = [];

// Load status, so the UI can tell "the database is empty" apart from
// "couldn't reach the server". null = not tried, true = loaded, false = unreachable.
window.EEL_POSTS_OK = null;

// API base URL. Same-origin when the site is served by the Express server (Railway).
// When the site is on a different host (Netlify), eel-config.js points this at the
// Railway backend so live posts, images and analytics still load. See eel-config.js.
const API_URL = (typeof window !== 'undefined' && window.EEL_API_BASE) || '';

// Load posts from backend
async function loadBlogPosts() {
    try {
        const response = await fetch(`${API_URL}/api/posts`, { cache: 'no-store' });
        const ct = (response.headers.get('content-type') || '').toLowerCase();
        if (response.ok && ct.indexOf('application/json') !== -1) {
            allBlogPosts = await response.json();
            window.EEL_POSTS_OK = true;
        } else {
            // Non-JSON / error means there is no API on this origin (e.g. the static
            // Netlify site with no Railway URL set in eel-config.js).
            window.EEL_POSTS_OK = false;
        }
    } catch (error) {
        window.EEL_POSTS_OK = false;
        console.error('Error loading posts:', error);
    }
    if (window.EEL_POSTS_OK === false && !window.EEL_API_BASE) {
        console.warn('[EEL] Could not reach /api/posts on this origin. If this site is on ' +
            'Netlify, set RAILWAY_API_BASE in eel-config.js to your Railway URL (or run ' +
            'localStorage.setItem("eel_api_base","https://your-app.up.railway.app") to test).');
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
