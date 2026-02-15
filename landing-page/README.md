# MeMesh Landing Page

Production-ready landing page for MeMesh marketplace promotion.

## 📁 Files

- `index.html` - Complete single-page application
- `README.md` - This file (deployment guide)

## 🚀 Quick Deploy

### Option 1: GitHub Pages (Recommended - Free)

```bash
# 1. Create gh-pages branch
git checkout -b gh-pages

# 2. Copy landing page to root
cp landing-page/index.html ./
git add index.html
git commit -m "Add landing page"

# 3. Push to GitHub
git push origin gh-pages

# 4. Enable GitHub Pages
# Go to: Settings → Pages → Source: gh-pages branch → Save
```

**Result**: https://pcircle-ai.github.io/claude-code-buddy/

---

### Option 2: Vercel (Fast & Auto-Deploy)

```bash
# 1. Install Vercel CLI
npm install -g vercel

# 2. Deploy
cd landing-page
vercel

# 3. Follow prompts, then production deploy
vercel --prod
```

**Custom Domain**: Add `memesh.ai` in Vercel Dashboard → Settings → Domains

---

### Option 3: Cloudflare Pages (Fast Global CDN)

```bash
# 1. Push to GitHub (if not already)
git add landing-page/
git commit -m "Add landing page"
git push origin main

# 2. Go to Cloudflare Dashboard
# - Pages → Create a project → Connect to Git
# - Select: PCIRCLE-AI/claude-code-buddy
# - Build settings:
#   - Build command: (none)
#   - Build output directory: landing-page
#   - Root directory: landing-page

# 3. Deploy
# Cloudflare auto-deploys on every git push
```

**Custom Domain**: Cloudflare Pages → Custom Domains → Add `memesh.ai`

---

### Option 4: Netlify (Simple Drag & Drop)

**Method 1: Drag & Drop**
1. Go to https://app.netlify.com/drop
2. Drag the `landing-page/` folder
3. Done! Get instant URL

**Method 2: CLI**
```bash
npm install -g netlify-cli
cd landing-page
netlify deploy

# Production deploy
netlify deploy --prod
```

---

## 🎨 Customization

### Update Content

Edit `index.html` directly:

- **Hero Section**: Lines 293-315
- **Features**: Lines 371-429
- **Demo GIFs**: Lines 447-471 (replace placeholder images)
- **CTA Buttons**: Lines 309-313, 481-483, 614-616

### Replace Placeholder Images

Current placeholders need replacement:

1. **Demo Video** (Line 446):
   ```html
   <img src="https://via.placeholder.com/800x450/1a1a1a/8B5CF6?text=Demo+Video+Coming+Soon">
   ```
   Replace with actual demo video or YouTube embed

2. **GIF Demos** (Lines 451-469):
   ```html
   <img src="https://via.placeholder.com/400x300/1a1a1a/10B981?text=buddy-do+demo.gif">
   ```
   Replace with actual GIFs from `demo-assets/gifs/`

### Add Analytics

**Google Analytics 4** (before `</head>`):
```html
<!-- Google tag (gtag.js) -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'G-XXXXXXXXXX');
</script>
```

**Plausible Analytics** (privacy-focused, before `</head>`):
```html
<script defer data-domain="memesh.ai" src="https://plausible.io/js/script.js"></script>
```

---

## 📊 Pre-Launch Checklist

Before deploying to production:

### Content
- [ ] Replace all placeholder images with actual GIFs/screenshots
- [ ] Add demo video (YouTube embed or self-hosted)
- [ ] Update stats (stars, downloads) to match GitHub
- [ ] Verify all links point to correct URLs
- [ ] Proofread all copy (Grammarly)

### Technical
- [ ] Test on mobile (iOS Safari, Android Chrome)
- [ ] Test on desktop (Chrome, Firefox, Safari, Edge)
- [ ] Check page load speed (< 3s on GTmetrix)
- [ ] Verify meta tags (Facebook Debugger, Twitter Card Validator)
- [ ] Add analytics (GA4 or Plausible)
- [ ] Setup custom domain (memesh.ai)
- [ ] Enable HTTPS
- [ ] Add favicon (currently emoji, consider PNG)

### SEO
- [ ] Submit sitemap to Google Search Console
- [ ] Verify robots.txt allows crawling
- [ ] Check mobile-friendly (Google Mobile-Friendly Test)
- [ ] Add structured data (JSON-LD schema)

---

## 🔧 Advanced: Custom Domain Setup

### For memesh.ai

**DNS Records** (at your domain registrar):

**Option A: Vercel**
```
A     @     76.76.21.21
CNAME www   cname.vercel-dns.com
```

**Option B: Cloudflare Pages**
```
CNAME @     <your-project>.pages.dev
CNAME www   <your-project>.pages.dev
```

**Option C: GitHub Pages**
```
A     @     185.199.108.153
A     @     185.199.109.153
A     @     185.199.110.153
A     @     185.199.111.153
CNAME www   pcircle-ai.github.io
```

---

## 📈 Performance Optimization

Already optimized:
- ✅ Single HTML file (no external CSS/JS)
- ✅ Minimal inline styles
- ✅ No external dependencies
- ✅ Lazy-load ready (images should use `loading="lazy"`)

### Optional Improvements

**1. Image Optimization**
```bash
# Install TinyPNG CLI
npm install -g tinypng-cli

# Optimize all images
tinypng landing-page/assets/*.png -k <api-key>
```

**2. Add Service Worker** (for offline support)

**3. Compress HTML** (Cloudflare/Vercel do this automatically)

---

## 🐛 Troubleshooting

**Page not loading?**
- Check browser console for errors
- Verify all asset URLs are correct
- Test in incognito mode

**GIFs not showing?**
- Ensure GIF files are < 5MB each
- Use correct relative or absolute paths
- Check CORS headers if served from different domain

**Custom domain not working?**
- Wait 24-48h for DNS propagation
- Verify DNS records with `dig memesh.ai`
- Check SSL certificate is issued

---

## 📞 Support

**Issues?** Open an issue on GitHub:
https://github.com/PCIRCLE-AI/claude-code-buddy/issues

**Questions?** Email: support@memesh.ai

---

**Created**: 2026-02-15
**Status**: Ready for deployment
**Next**: Replace placeholder images and deploy to production
