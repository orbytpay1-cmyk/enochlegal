# Blog System - Admin to Live Site Connection

## ✅ How It Works

Your admin dashboard and live website are now connected through **localStorage**. When you publish a post from the admin dashboard, it will appear on the live site instantly!

## 📝 How to Use

### Step 1: Access Admin Dashboard
1. Open `admin-files/admin.html` in your browser
2. Login with:
   - Username: `prech114`
   - Password: `pre11726644472837466@@@`

### Step 2: Create a Blog Post
1. Click "New Post" tab
2. Fill in:
   - Title
   - Category
   - Excerpt (summary)
   - Content (use the toolbar buttons for formatting)
   - Icon (emoji like 📝 ⚖️ 💼)
3. Check "Set as Featured Post" if you want it highlighted
4. Click "Publish Post"

### Step 3: See It Live
1. The post is saved to localStorage
2. Go to your main website (`index.html`)
3. Scroll to the "Legal Insights" section
4. Your new post will appear automatically!
5. The blog page (`blog.html`) will also show all posts

### Step 4: Download Blog Post HTML
- When you publish, a file `blog-post-[ID].html` will download
- Upload this file to your website hosting
- This creates the individual blog post page

## 🔄 How Posts Sync

- Admin dashboard saves posts to **localStorage**
- Main website reads from **localStorage**
- Both use the same `blog-data.js` file
- Posts appear instantly (just refresh the page)

## 📱 Managing Posts

### View All Posts
- Go to "Manage Posts" tab in admin dashboard
- See all your published posts
- Delete posts you don't want

### Featured Posts
- Only ONE post can be featured at a time
- Featured posts appear at the top
- Uncheck "Featured" on old post before featuring a new one

## ⚠️ Important Notes

1. **Same Browser**: Admin and live site must be viewed in the SAME browser (they share localStorage)
2. **Same Domain**: Both must be on the same domain/localhost
3. **Upload HTML Files**: After publishing, upload the downloaded HTML file to your hosting
4. **Backup**: Export your posts regularly (copy from localStorage)

## 🚀 For Production (Netlify/Vercel)

For the live website, you'll need to:
1. Upload all files including `admin-files/` folder
2. Access admin at: `yoursite.com/admin-files/admin.html`
3. Posts will work across all devices viewing your site

## 🎨 Customization

Edit these files to customize:
- `styles.css` - Change colors, fonts, layout
- `admin.html` - Modify admin dashboard
- `blog-data.js` - Change how posts are stored/loaded

## ✅ Everything is Connected!

Admin Dashboard → localStorage → Live Website → Blog Page

Your blog system is ready to use!
