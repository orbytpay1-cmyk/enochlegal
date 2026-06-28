# Admin Dashboard Guide for Precious Enoch

## Accessing the Admin Dashboard

1. Open `admin.html` in your web browser
2. Login with your credentials:
   - **Username**: `prech114`
   - **Password**: `pre11726644472837466@@@`

## Creating a New Blog Post

1. After logging in, you'll see the "New Post" tab (default view)
2. Fill in the form:
   - **Title**: Your article title
   - **Category**: Choose from Corporate Law, Compliance, or Insolvency
   - **Read Time**: Estimated reading time (e.g., "5 min read")
   - **Icon**: Choose an emoji (⚖️ 📝 💼 📋 🔒 💰 etc.)
   - **Excerpt**: A brief 1-2 sentence summary
   - **Content**: Your full article using HTML tags
   - **Featured**: Check this box if you want it as the featured post (only one at a time)

3. Use the toolbar buttons to insert HTML tags:
   - **H2**: Main section heading
   - **H3**: Subsection heading
   - **Paragraph**: Regular text
   - **List**: Bullet points
   - **Quote**: Highlighted quote

4. Click "Publish Post"
5. The system will automatically download the blog post HTML file
6. Upload this file to your website along with the updated blog data

## Managing Existing Posts

1. Click the "Manage Posts" tab
2. View all your published posts
3. Click "Delete" to remove a post (with confirmation)

## How It Works

- All blog posts are stored in your browser's localStorage
- When you create a post, it's immediately visible on your website
- The system generates the HTML file for you to upload
- Posts automatically appear on the homepage and blog page

## Important Notes

- Only ONE post should be marked as "Featured" at a time
- The featured post appears in the large showcase on the homepage
- Regular posts appear in the blog grid (currently showing 1 post on homepage)
- All posts are visible on the full blog page (blog.html)

## Website Features

### Automatic Carousels
- Practice Areas: Auto-slides every 5 seconds
- Clients: Auto-slides every 6 seconds  
- Core Values: Auto-slides every 4 seconds
- Manual navigation available with arrow buttons
- Click dots to jump to specific slides

### Blog Display
- Homepage shows 1 featured post + 1 regular post
- Full blog page shows all posts with category filtering
- Each post has its own dedicated page

## Tips for Writing

1. **Use HTML tags** for formatting:
   ```html
   <p>Your paragraph text</p>
   <h2>Main Heading</h2>
   <h3>Subheading</h3>
   <ul>
       <li>List item</li>
   </ul>
   <blockquote>"Your quote"</blockquote>
   ```

2. **Keep it structured**: Use headings to break up content

3. **Write engaging excerpts**: This appears on the blog listing pages

4. **Choose relevant icons**: Match the icon to your topic

## Troubleshooting

**Can't login?**
- Double-check the access code (450 digits, exact match required)
- Clear browser cache and try again

**Post not appearing?**
- Make sure you uploaded the generated HTML file
- Check that blog-data.js is updated
- Clear browser cache and refresh

**Featured post not showing?**
- Only one post can be featured at a time
- Uncheck "Featured" on other posts

## Security

- Keep your login credentials secure
- Don't share your admin URL publicly
- Consider adding .htaccess protection for the admin page

## Need Help?

Contact your web developer for technical assistance or if you encounter any issues.

---

**Happy Blogging!** 📝
