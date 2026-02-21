// Mobile Navigation Toggle
const hamburger = document.querySelector('.hamburger');
const navMenu = document.querySelector('.nav-menu');

if (hamburger) {
    hamburger.addEventListener('click', () => {
        navMenu.classList.toggle('active');
        hamburger.classList.toggle('active');
    });
}

// Close mobile menu when clicking on a link
document.querySelectorAll('.nav-menu a').forEach(link => {
    link.addEventListener('click', () => {
        navMenu.classList.remove('active');
        if (hamburger) hamburger.classList.remove('active');
    });
});

// Load all blog posts from API
async function loadAllBlogPosts(filter = 'all') {
    const blogList = document.getElementById('blogList');
    
    try {
        // Load posts from API
        await loadBlogPosts();
        
        let filteredPosts = allBlogPosts;
        if (filter !== 'all') {
            filteredPosts = allBlogPosts.filter(post => post.category === filter);
        }
        
        if (filteredPosts.length > 0) {
            blogList.innerHTML = filteredPosts.map(post => `
                <article class="blog-list-item">
                    ${post.coverImage ? `<img src="${post.coverImage}" alt="${post.title}" class="blog-list-cover">` : `<div class="blog-list-icon" data-icon="${post.icon || '📝'}"></div>`}
                    <div class="blog-list-content">
                        <div class="blog-list-meta">
                            <span class="blog-category">${post.category.toUpperCase()}</span>
                            <span>•</span>
                            <span>${post.date}</span>
                            <span>•</span>
                            <span>${post.read_time || post.readTime || '5 min read'}</span>
                        </div>
                        <h2><a href="blog-post.html?id=${post.id}">${post.title}</a></h2>
                        <p>${post.excerpt}</p>
                        <div class="blog-list-footer">
                            <div class="blog-author">
                                <span>✍️ ${post.author}</span>
                            </div>
                            <a href="blog-post.html?id=${post.id}" class="read-more">Read Article →</a>
                        </div>
                    </div>
                </article>
            `).join('');
        } else {
            blogList.innerHTML = '<p class="no-posts">No articles found in this category.</p>';
        }
    } catch (error) {
        console.error('Error loading posts:', error);
        blogList.innerHTML = '<p class="no-posts">Error loading articles. Please try again later.</p>';
    }
}

// Filter functionality
document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        // Remove active class from all buttons
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        // Add active class to clicked button
        btn.classList.add('active');
        // Load filtered posts
        const filter = btn.getAttribute('data-filter');
        loadAllBlogPosts(filter);
    });
});

// Load posts on page load
document.addEventListener('DOMContentLoaded', async () => {
    await loadAllBlogPosts();
});

// Navbar scroll effect
let lastScroll = 0;
const navbar = document.querySelector('.navbar');

window.addEventListener('scroll', () => {
    const currentScroll = window.pageYOffset;
    
    if (currentScroll > 100) {
        navbar.style.boxShadow = '0 4px 20px rgba(0,0,0,0.15)';
    } else {
        navbar.style.boxShadow = '0 2px 10px rgba(0,0,0,0.1)';
    }
    
    lastScroll = currentScroll;
});
