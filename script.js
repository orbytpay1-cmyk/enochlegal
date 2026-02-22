// Simple Typewriter Effect
const titleText = "Excellence in Corporate Law and Compliance";
const subtitleText = "Trusted legal solutions for businesses navigating today's complex regulatory environment";
let titleIndex = 0;
let subtitleIndex = 0;

function typeTitle() {
    const titleEl = document.getElementById('typewriter-title');
    if (titleEl && titleIndex < titleText.length) {
        titleEl.textContent += titleText.charAt(titleIndex);
        titleIndex++;
        setTimeout(typeTitle, 50);
    } else {
        setTimeout(typeSubtitle, 300);
    }
}

function typeSubtitle() {
    const subtitleEl = document.getElementById('typewriter-subtitle');
    if (subtitleEl && subtitleIndex < subtitleText.length) {
        subtitleEl.textContent += subtitleText.charAt(subtitleIndex);
        subtitleIndex++;
        setTimeout(typeSubtitle, 30);
    } else if (subtitleEl) {
        subtitleEl.classList.add('visible');
    }
}

// Mobile Navigation
const hamburger = document.querySelector('.hamburger');
const navMenu = document.querySelector('.nav-menu');

if (hamburger && navMenu) {
    hamburger.addEventListener('click', function() {
        navMenu.classList.toggle('active');
    });

    // Close menu when clicking links
    const navLinks = document.querySelectorAll('.nav-menu a');
    navLinks.forEach(function(link) {
        link.addEventListener('click', function() {
            navMenu.classList.remove('active');
        });
    });
}

// Smooth Scrolling
const anchorLinks = document.querySelectorAll('a[href^="#"]');
anchorLinks.forEach(function(anchor) {
    anchor.addEventListener('click', function(e) {
        e.preventDefault();
        const targetId = this.getAttribute('href');
        const target = document.querySelector(targetId);
        if (target) {
            const offsetTop = target.offsetTop - 80;
            window.scrollTo({
                top: offsetTop,
                behavior: 'smooth'
            });
        }
    });
});

// Contact Form
const contactForm = document.querySelector('.contact-form');
if (contactForm) {
    contactForm.addEventListener('submit', function(e) {
        e.preventDefault();
        alert('Thank you for your message! We will get back to you soon.');
        contactForm.reset();
    });
}

// Practice Carousel
let practiceIndex = 0;
let practiceInterval;

function movePracticeSlide(direction) {
    const cards = document.querySelectorAll('.practice-carousel .practice-card');
    if (cards.length === 0) return;
    
    cards[practiceIndex].classList.remove('active');
    practiceIndex = (practiceIndex + direction + cards.length) % cards.length;
    cards[practiceIndex].classList.add('active');
    updatePracticeDots();
}

function updatePracticeDots() {
    const container = document.getElementById('practiceDots');
    const cards = document.querySelectorAll('.practice-carousel .practice-card');
    if (!container || cards.length === 0) return;
    
    container.innerHTML = '';
    for (let i = 0; i < cards.length; i++) {
        const dot = document.createElement('span');
        dot.className = 'dot';
        if (i === practiceIndex) dot.classList.add('active');
        dot.onclick = function() {
            cards[practiceIndex].classList.remove('active');
            practiceIndex = i;
            cards[practiceIndex].classList.add('active');
            updatePracticeDots();
        };
        container.appendChild(dot);
    }
}

function startPracticeCarousel() {
    practiceInterval = setInterval(function() {
        movePracticeSlide(1);
    }, 5000);
}

// Value Carousel
let valueIndex = 0;
let valueInterval;

function moveValueSlide(direction) {
    const cards = document.querySelectorAll('.values-carousel .value-card');
    if (cards.length === 0) return;
    
    cards[valueIndex].classList.remove('active');
    valueIndex = (valueIndex + direction + cards.length) % cards.length;
    cards[valueIndex].classList.add('active');
    updateValueDots();
}

function updateValueDots() {
    const container = document.getElementById('valueDots');
    const cards = document.querySelectorAll('.values-carousel .value-card');
    if (!container || cards.length === 0) return;
    
    container.innerHTML = '';
    for (let i = 0; i < cards.length; i++) {
        const dot = document.createElement('span');
        dot.className = 'dot';
        if (i === valueIndex) dot.classList.add('active');
        dot.onclick = function() {
            cards[valueIndex].classList.remove('active');
            valueIndex = i;
            cards[valueIndex].classList.add('active');
            updateValueDots();
        };
        container.appendChild(dot);
    }
}

function startValueCarousel() {
    valueInterval = setInterval(function() {
        moveValueSlide(1);
    }, 4000);
}

// Initialize everything when page loads
window.addEventListener('load', async function() {
    // Start typewriter
    setTimeout(typeTitle, 500);
    
    // Initialize carousels
    updatePracticeDots();
    updateValueDots();
    startPracticeCarousel();
    startValueCarousel();
    
    // Load and display blog posts
    await displayBlogPosts();
});

// Display blog posts on homepage
async function displayBlogPosts() {
    const blogGrid = document.getElementById('blogGrid');
    if (!blogGrid) return;
    
    try {
        // Load posts from backend
        await loadBlogPosts();
        
        if (allBlogPosts.length === 0) {
            blogGrid.innerHTML = '';
            return;
        }
        
        // Show up to 3 most recent posts
        const recentPosts = allBlogPosts.slice(0, 3);
        
        blogGrid.innerHTML = recentPosts.map(function(post) {
            return `
                <div class="blog-card">
                    <div class="blog-card-image" style="background: linear-gradient(135deg, #1e3a8a 0%, #c9a961 100%); display: flex; align-items: center; justify-content: center; height: 200px; font-size: 4rem;">
                        ${post.icon || '📝'}
                    </div>
                    <div class="blog-card-content">
                        <div class="blog-date">${post.date}</div>
                        <h3>${post.title}</h3>
                        <p>${post.excerpt}</p>
                        <div class="blog-card-footer">
                            <div class="blog-author">
                                <span>✍️ ${post.author}</span>
                            </div>
                            <a href="blog-post.html?id=${post.id}" class="read-more">Read More →</a>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    } catch (error) {
        console.error('Error displaying blog posts:', error);
        blogGrid.innerHTML = '';
    }
}


// Load blog previews on homepage
async function loadBlogPreviews() {
    const blogPreviewGrid = document.getElementById('blogPreviewGrid');
    
    if (!blogPreviewGrid) return; // Not on homepage
    
    try {
        // Load posts from API
        await loadBlogPosts();
        
        // Get latest 3 posts or featured posts
        let previewPosts = allBlogPosts.slice(0, 3);
        
        if (previewPosts.length === 0) {
            blogPreviewGrid.innerHTML = '<p style="text-align: center; color: #666;">No articles available yet.</p>';
            return;
        }
        
        blogPreviewGrid.innerHTML = previewPosts.map(post => `
            <div class="blog-preview-card" onclick="window.location.href='blog-post.html?id=${post.id}'">
                ${post.coverImage ? 
                    `<div class="blog-preview-image">
                        <img src="${post.coverImage}" alt="${post.title}">
                    </div>` : 
                    `<div class="blog-preview-icon">${post.icon || '📝'}</div>`
                }
                <div class="blog-preview-body">
                    <span class="blog-preview-category">${post.category}</span>
                    <h3>${post.title}</h3>
                    <p class="blog-preview-excerpt">${post.excerpt}</p>
                    <div class="blog-preview-meta">
                        <span>${post.date}</span>
                        <a href="blog-post.html?id=${post.id}" class="blog-preview-read-more">Read More →</a>
                    </div>
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error loading blog previews:', error);
        blogPreviewGrid.innerHTML = '<p style="text-align: center; color: #666;">Unable to load articles.</p>';
    }
}

// Load blog previews when page loads
if (document.getElementById('blogPreviewGrid')) {
    loadBlogPreviews();
}


// Contact form submission
const contactForm = document.getElementById('contactForm');
if (contactForm) {
    contactForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const statusDiv = document.getElementById('contactStatus');
        const submitBtn = contactForm.querySelector('button[type="submit"]');
        const originalBtnText = submitBtn.textContent;
        
        // Disable button and show loading
        submitBtn.disabled = true;
        submitBtn.textContent = 'Sending...';
        statusDiv.style.display = 'none';
        
        const formData = {
            name: document.getElementById('contactName').value,
            email: document.getElementById('contactEmail').value,
            subject: document.getElementById('contactSubject').value,
            message: document.getElementById('contactMessage').value
        };
        
        try {
            const response = await fetch('https://enochlegal-production.up.railway.app/api/contact', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });
            
            const result = await response.json();
            
            if (response.ok) {
                // Success
                statusDiv.style.display = 'block';
                statusDiv.style.background = '#d4edda';
                statusDiv.style.color = '#155724';
                statusDiv.textContent = '✅ Message sent successfully! We\'ll get back to you soon.';
                contactForm.reset();
            } else {
                // Error
                statusDiv.style.display = 'block';
                statusDiv.style.background = '#f8d7da';
                statusDiv.style.color = '#721c24';
                statusDiv.textContent = '❌ ' + (result.error || 'Failed to send message. Please try again.');
            }
        } catch (error) {
            console.error('Error:', error);
            statusDiv.style.display = 'block';
            statusDiv.style.background = '#f8d7da';
            statusDiv.style.color = '#721c24';
            statusDiv.textContent = '❌ Network error. Please check your connection and try again.';
        } finally {
            // Re-enable button
            submitBtn.disabled = false;
            submitBtn.textContent = originalBtnText;
        }
    });
}
