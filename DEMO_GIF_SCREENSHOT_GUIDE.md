# 📸 Demo GIF & Screenshot Creation Guide

**Goal**: Create compelling visual assets for README, landing page, and marketplace submission

---

## 🎬 Tools Needed

### For macOS

**Screen Recording**:
- **QuickTime Player** (built-in, free)
- **Kap** (free, https://getkap.co/) - Recommended for GIFs
- **OBS Studio** (free, full-featured)

**GIF Creation**:
- **Gifski** (free, https://gif.ski/) - Best quality
- **EZGIF** (online, https://ezgif.com/)
- **ffmpeg** (command line): `brew install ffmpeg`

**Screenshots**:
- **Cmd+Shift+4** (built-in)
- **CleanShot X** (paid, but excellent)
- **Shottr** (free, great features)

---

## 📋 Required Assets

### GIFs (3-4 animations, ~3-5 seconds each)

1. **Installation GIF** (install.gif)
   - Show: `npm install -g @pcircle/memesh`
   - Duration: 3-5 seconds
   - Size: < 5MB

2. **buddy-do Workflow** (buddy-do.gif)
   - Show: Executing `buddy-do` command + Memory saved confirmation
   - Duration: 5-8 seconds
   - Size: < 5MB

3. **buddy-remember Search** (buddy-remember.gif)
   - Show: Searching with `buddy-remember` + Results displayed
   - Duration: 5-8 seconds
   - Size: < 5MB

4. **Project Isolation** (isolation.gif) - Optional
   - Show: Different projects, different memories
   - Duration: 8-10 seconds
   - Size: < 5MB

### Screenshots (5-7 images, PNG format)

1. **Terminal Setup** (terminal-setup.png)
   - Clean terminal with MeMesh installed
   - Show `buddy-help` output

2. **buddy-do Example** (buddy-do-example.png)
   - Full command execution
   - Memory saved confirmation

3. **buddy-remember Results** (buddy-remember-results.png)
   - Search results formatted nicely
   - Multiple memory entries visible

4. **Memory Details** (memory-details.png)
   - Detailed view of a single memory
   - Shows metadata, tags, timestamps

5. **Project Isolation** (project-isolation.png)
   - Side-by-side comparison of two projects
   - Different memory contexts

---

## 🎥 Recording Process

### Step 1: Prepare Terminal

```bash
# Set terminal to optimal recording settings
# Font: Monaco or Menlo, 16-18pt
# Theme: Dark with high contrast
# Window size: 1920x1080 or 1280x720

# Clean environment
clear
cd ~/memesh-demo-project

# Remove unnecessary prompt elements
export PS1="\$ "
```

### Step 2: Record Screen with Kap (for GIFs)

1. **Install Kap**:
   ```bash
   brew install --cask kap
   ```

2. **Kap Settings**:
   - FPS: 30 (smooth but not too large)
   - Format: MP4 (convert to GIF later)
   - Cursor: Show
   - Highlight clicks: Optional

3. **Record**:
   - Open Kap
   - Select recording area (terminal only)
   - Click record
   - Execute commands
   - Stop recording
   - Export as MP4

### Step 3: Convert MP4 to GIF

**Option A: Using Gifski (Best Quality)**

```bash
# Install Gifski
brew install gifski

# Convert (adjust width for size)
gifski --fps 20 --width 800 --quality 90 input.mp4 -o output.gif

# Optimize further if needed
gifsicle -O3 --colors 256 output.gif -o optimized.gif
```

**Option B: Using ffmpeg**

```bash
# Install ffmpeg
brew install ffmpeg

# Create palette for better colors
ffmpeg -i input.mp4 -vf "fps=20,scale=800:-1:flags=lanczos,palettegen" palette.png

# Generate GIF
ffmpeg -i input.mp4 -i palette.png -filter_complex "fps=20,scale=800:-1:flags=lanczos[x];[x][1:v]paletteuse" output.gif
```

**Option C: Using EZGIF (Online, Easy)**

1. Go to https://ezgif.com/video-to-gif
2. Upload your MP4
3. Set:
   - Size: 800px width
   - Frame rate: 20 FPS
   - Method: Lanczos3
4. Download GIF
5. Optimize at https://ezgif.com/optimize

---

## 📸 Screenshot Best Practices

### Terminal Screenshots

1. **Clean the prompt**:
   ```bash
   export PS1="\$ "
   ```

2. **Use Cmd+Shift+4**:
   - Press Cmd+Shift+4
   - Select terminal area
   - Screenshot saved to Desktop

3. **Or use Shottr**:
   - Better annotations
   - Quick blur for sensitive info
   - Auto-upload options

### Screenshot Composition

**Good Screenshot**:
- ✅ Clear command visible
- ✅ Full output shown
- ✅ No sensitive information
- ✅ High contrast, readable
- ✅ Proper window size

**Bad Screenshot**:
- ❌ Truncated output
- ❌ Low contrast
- ❌ Personal info visible
- ❌ Too small to read

---

## 🎨 GIF Optimization

### Target Specs

- **Size**: < 5MB per GIF
- **Dimensions**: 800-1000px width
- **Frame Rate**: 15-20 FPS
- **Colors**: 256 colors max
- **Duration**: 3-10 seconds

### If GIF is Too Large

1. **Reduce dimensions**:
   ```bash
   gifski --width 600 input.mp4 -o smaller.gif
   ```

2. **Reduce frame rate**:
   ```bash
   gifski --fps 15 input.mp4 -o slower.gif
   ```

3. **Reduce colors**:
   ```bash
   gifsicle -O3 --colors 128 input.gif -o fewer-colors.gif
   ```

4. **Trim duration**:
   ```bash
   # Use ffmpeg to trim video first
   ffmpeg -i input.mp4 -ss 00:00:00 -t 00:00:05 -c copy trimmed.mp4
   ```

---

## 📝 Recording Script

### GIF 1: Installation (3-5 seconds)

```bash
# Clear terminal
clear

# Type command (slowly for readability)
npm install -g @pcircle/memesh

# Wait for installation to complete
# Show success message
# End recording
```

### GIF 2: buddy-do Workflow (5-8 seconds)

```bash
# Clear terminal
clear

# Show the command
buddy-do "explain our authentication system"

# Wait for:
# 1. Claude's response
# 2. "✓ Memory saved" message

# End recording when memory saved message appears
```

### GIF 3: buddy-remember Search (5-8 seconds)

```bash
# Clear terminal
clear

# Show the command
buddy-remember "authentication"

# Wait for:
# 1. Search results to appear
# 2. Formatted memory entries displayed

# End recording after results shown
```

---

## 🎬 Quick Recording Workflow

### One-Command Solution

```bash
#!/bin/bash
# Quick GIF recording workflow

# 1. Prepare terminal
export PS1="\$ "
clear

# 2. Start Kap recording (manual)
# ... record your demo ...

# 3. Convert to GIF (after stopping Kap)
LATEST_MP4=$(ls -t ~/Movies/*.mp4 | head -1)
gifski --fps 20 --width 800 "$LATEST_MP4" -o ~/Desktop/demo.gif

# 4. Optimize
gifsicle -O3 --colors 256 ~/Desktop/demo.gif -o ~/Desktop/demo-optimized.gif

echo "✅ GIF created: ~/Desktop/demo-optimized.gif"
ls -lh ~/Desktop/demo-optimized.gif
```

---

## 📦 Asset Organization

Create this folder structure:

```
demo-assets/
├── gifs/
│   ├── install.gif
│   ├── buddy-do.gif
│   ├── buddy-remember.gif
│   └── isolation.gif
├── screenshots/
│   ├── terminal-setup.png
│   ├── buddy-do-example.png
│   ├── buddy-remember-results.png
│   ├── memory-details.png
│   └── project-isolation.png
├── raw/
│   ├── recordings/ (original MP4 files)
│   └── unoptimized/ (unoptimized GIFs)
└── README.md (this file)
```

---

## ✅ Quality Checklist

Before finalizing any asset:

### For GIFs
- [ ] Size < 5MB
- [ ] Width 800-1000px
- [ ] Smooth playback (no stuttering)
- [ ] Clear and readable text
- [ ] No sensitive information visible
- [ ] Loops seamlessly

### For Screenshots
- [ ] High resolution (at least 1280px width)
- [ ] Clear, readable text
- [ ] No personal information
- [ ] Good contrast
- [ ] Properly cropped
- [ ] Saved as PNG (not JPG)

---

## 🎯 Where to Use These Assets

### GIFs
- **README.md**: Embed in Usage section
- **Landing Page**: Hero section demos
- **Social Media**: Twitter, LinkedIn posts
- **Documentation**: Tutorial walkthroughs

### Screenshots
- **Marketplace Submission**: Required screenshots
- **Documentation**: Command examples
- **Blog Posts**: Technical articles
- **GitHub Issues**: Bug reports, feature requests

---

## 💡 Pro Tips

1. **Record multiple takes**: Get 3-4 versions, pick the best
2. **Slow down typing**: Fast typing is hard to read in GIFs
3. **Pause between actions**: Give viewers time to process
4. **Use consistent timing**: Keep GIFs around same duration
5. **Test on different screens**: Ensure readable on mobile
6. **Keep it simple**: One concept per GIF
7. **Add captions if needed**: Use annotation tools

---

## 🔧 Troubleshooting

**GIF too large?**
- Reduce width to 600-700px
- Lower FPS to 15
- Reduce color palette to 128
- Trim duration to 3-5 seconds

**Text not readable?**
- Increase terminal font size (18-20pt)
- Use high contrast theme
- Record at higher resolution, scale down
- Use GIF with fewer frames but clearer

**Recording stutters?**
- Close other applications
- Record at lower FPS (15 instead of 30)
- Use simpler terminal theme
- Ensure enough disk space

---

**Created**: 2026-02-15
**Status**: Ready to use
**Next**: Run demo-setup.sh and start recording!
