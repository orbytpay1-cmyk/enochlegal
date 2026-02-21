// Admin credentials
const ADMIN_USERNAME = 'prech114';
const ADMIN_PASSWORD = 'pre11726644472837466@@@';

// API base URL - always use Railway backend
const API_URL = 'https://enochlegal-production.up.railway.app';

// Check if user is logged in
function checkAuth() {
    const isLoggedIn = localStorage.getItem('adminLoggedIn');
    if (isLoggedIn === 'true') {
        showDashboard();
    }
}

// Login handler
document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const errorDiv = document.getElementById('loginError');

    if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
        localStorage.setItem('adminLoggedIn', 'true');
        showDashboard();
    } else {
        errorDiv.textContent = 'Invalid username or password';
        errorDiv.classList.add('show');
        setTimeout(() => {
            errorDiv.classList.remove('show');
        }, 3000);
    }
});

// Show dashboard
function showDashboard() {
    document.getElementById('loginPage').style.display = 'none';
    document.getElementById('dashboard').classList.add('active');
    loadBlogPosts();
}

// Logout
function logout() {
    localStorage.removeItem('adminLoggedIn');
    location.reload();
}

// Switch tabs
function switchTab(tabName) {
    document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    
    event.target.classList.add('active');
    document.getElementById(tabName).classList.add('active');
    
    if (tabName === 'manage-posts') {
        loadBlogPosts();
    }
}

// Insert HTML tags
function insertTag(tag) {
    const textarea = document.getElementById('postContent');
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = textarea.value.substring(start, end);
    
    let insertion = '';
    switch(tag) {
        case 'h2':
            insertion = `<h2>${selectedText || 'Heading'}</h2>\n`;
            break;
        case 'h3':
            insertion = `<h3>${selectedText || 'Subheading'}</h3>\n`;
            break;
        case 'p':
            insertion = `<p>${selectedText || 'Your paragraph text here'}</p>\n`;
            break;
        case 'ul':
            insertion = `<ul>\n    <li>${selectedText || 'List item 1'}</li>\n    <li>List item 2</li>\n</ul>\n`;
            break;
        case 'blockquote':
            insertion = `<blockquote>\n    "${selectedText || 'Your quote here'}"\n</blockquote>\n`;
            break;
    }
    
    textarea.value = textarea.value.substring(0, start) + insertion + textarea.value.substring(end);
    textarea.focus();
}

// Convert normal text to HTML
function textToHtml(text) {
    // Split by double line breaks (paragraphs)
    const paragraphs = text.split(/\n\n+/);
    
    let html = '';
    paragraphs.forEach(para => {
        para = para.trim();
        if (!para) return;
        
        // Check if it looks like a heading (short line, no punctuation at end)
        if (para.length < 60 && !para.match(/[.!?]$/)) {
            html += `<h2>${para}</h2>\n`;
        } else {
            // Regular paragraph
            html += `<p>${para}</p>\n`;
        }
    });
    
    return html;
}

// Handle new post submission
document.getElementById('newPostForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    console.log('🚀 Form submitted - starting publish process...');
    
    const contentText = document.getElementById('postContent').value;
    const contentHtml = textToHtml(contentText);
    
    const newPost = {
        title: document.getElementById('postTitle').value,
        excerpt: document.getElementById('postExcerpt').value,
        content: contentHtml,
        readTime: document.getElementById('postReadTime').value,
        category: document.getElementById('postCategory').value,
        featured: document.getElementById('postFeatured').checked,
        icon: document.getElementById('postIcon').value
    };
    
    console.log('📝 Post data:', newPost);
    console.log('🌐 API URL:', `${API_URL}/api/posts`);
    
    try {
        console.log('📡 Sending request to server...');
        
        // Send to backend API
        const response = await fetch(`${API_URL}/api/posts`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(newPost)
        });
        
        console.log('📥 Response status:', response.status, response.statusText);
        
        if (response.ok) {
            const result = await response.json();
            console.log('✅ Success! Result:', result);
            
            // Show success message
            const successMsg = document.getElementById('successMessage');
            successMsg.textContent = '✅ Blog post published successfully!';
            successMsg.classList.add('show');
            
            // Reset form
            document.getElementById('newPostForm').reset();
            
            // Hide success message after 5 seconds
            setTimeout(() => {
                successMsg.classList.remove('show');
            }, 5000);
            
            // Reload blog list if on that tab
            loadBlogPosts();
        } else {
            // Try to get error details from response
            let errorMessage = 'Unknown error';
            try {
                const errorData = await response.json();
                errorMessage = errorData.error || errorData.message || JSON.stringify(errorData);
                console.error('❌ Server error response:', errorData);
            } catch (e) {
                errorMessage = response.statusText || `HTTP ${response.status}`;
                console.error('❌ Could not parse error response');
            }
            
            console.error('❌ Publish failed:', errorMessage);
            alert(`❌ Error publishing post: ${errorMessage}\n\nCheck the console (F12) for more details.`);
        }
    } catch (error) {
        console.error('❌ Network/Connection error:', error);
        alert(`❌ Error connecting to server: ${error.message}\n\nPossible causes:\n- Server is not running\n- Network connection issue\n- CORS problem\n\nCheck the console (F12) for more details.`);
    }
});

// Load and display blog posts in manage section
async function loadBlogPosts() {
    const blogList = document.getElementById('blogList');
    
    try {
        const response = await fetch(`${API_URL}/api/posts`);
        if (!response.ok) {
            blogList.innerHTML = '<p style="text-align: center; color: #666;">Error loading posts.</p>';
            return;
        }
        
        const posts = await response.json();
        
        if (posts.length === 0) {
            blogList.innerHTML = '<p style="text-align: center; color: #666;">No blog posts yet. Create your first post!</p>';
            return;
        }
        
        blogList.innerHTML = posts.map(post => `
            <div class="blog-item">
                <div class="blog-item-content">
                    <h3>${post.title}</h3>
                    <div class="blog-item-meta">
                        ${post.date} • ${post.category} • ${post.read_time}
                        ${post.featured ? ' • <strong>FEATURED</strong>' : ''}
                    </div>
                    <p style="color: #666; margin-top: 10px;">${post.excerpt}</p>
                </div>
                <div class="blog-item-actions">
                    <button class="btn-small btn-delete" onclick="deletePostById(${post.id})">Delete</button>
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error loading posts:', error);
        blogList.innerHTML = '<p style="text-align: center; color: #666;">Error loading posts.</p>';
    }
}

// Delete post
async function deletePostById(id) {
    if (confirm('Are you sure you want to delete this post?')) {
        try {
            const response = await fetch(`${API_URL}/api/posts/${id}`, {
                method: 'DELETE'
            });
            
            if (response.ok) {
                alert('Post deleted successfully!');
                loadBlogPosts();
            } else {
                alert('Error deleting post. Please try again.');
            }
        } catch (error) {
            console.error('Error:', error);
            alert('Error connecting to server.');
        }
    }
}

// Initialize
checkAuth();
