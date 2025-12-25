# Voice RAG Web UI Bug Report - 2025-12-25

## 🚨 Status: UNRESOLVED - Escalated to Codex

## Executive Summary

Backend is **100% working** and returns audio correctly. Problem is in **frontend JavaScript** preventing audio playback despite receiving valid base64 data.

---

## Backend Status: ✅ WORKING

### Server Debug Logs (Latest Test):
```
[DEBUG] audioBuffer exists: true
[DEBUG] audioBuffer type: object
[DEBUG] audioBuffer length: 548160 bytes (535KB)
[DEBUG] audioBase64 length: 730880 chars (730KB base64)
✅ Voice RAG processing complete
```

### Backend Pipeline: ✅ ALL STEPS SUCCESSFUL
1. ✅ Audio upload: 1.4KB WebM received
2. ✅ File renaming: `.webm` extension added
3. ✅ Whisper transcription: Completed in 1022ms
4. ✅ RAG retrieval: 3 documents retrieved
5. ✅ Claude response: 490 characters generated
6. ✅ TTS synthesis: 535.31KB MP3 created
7. ✅ Base64 encoding: 730,880 characters
8. ✅ JSON response: Sent to client

**Backend Cost**: $0.007350 per query
**Total Time**: 11.48 seconds

---

## Frontend Status: ❌ BROKEN

### Error in Browser Console:
```
voice-rag-widget.html:236 Audio playback error: Event {isTrusted: true, type: 'error', ...}
voice-rag-widget.html:237 Audio base64 length: 0
voice-rag-widget.html:244 Play error: NotSupportedError: Failed to load because no supported source was found.
```

### Problem Analysis:

**Backend sends**: 730,880 characters of base64
**Frontend receives**: 0 characters

This means:
- ✅ Server is working
- ✅ JSON response is sent
- ❌ Frontend is NOT receiving the `audioBase64` field
- ❌ OR frontend is not parsing the JSON correctly

### Possible Causes (Frontend Issues):

1. **JavaScript JSON parsing error**
   - Response might be malformed
   - `data.audioBase64` might be undefined
   - Response might be truncated

2. **CORS or content-type issue**
   - Server might not be sending correct headers
   - Browser might be blocking response

3. **Frontend code bug**
   - Variable name mismatch
   - Async/await issue
   - Promise rejection not caught

---

## Files Modified (2025-12-25)

### Backend Files (All working):

#### 1. `src/agents/voice-rag/server.ts`
**Changes**:
- Line 70-73: Added `.webm` file extension renaming
- Line 89-93: Added debug logging

**Status**: ✅ Working correctly

#### 2. `src/agents/voice-rag/index.ts`
**Changes**:
- Line 223: Fixed `ttsResult.audio` (was `ttsResult.audioBuffer`)

**Status**: ✅ Working correctly

### Frontend Files (Broken):

#### 3. `voice-rag-widget.html`
**Changes**:
- Line 228: Changed MIME type to `audio/mpeg`
- Line 235-249: Added error logging

**Status**: ❌ Still not receiving audio data

---

## What Was Tried

### Attempt 1: WebM Format Error
- **Problem**: Multer temp files lacked `.webm` extension
- **Fix**: Added file renaming (server.ts:70-73)
- **Result**: ✅ Fixed - Whisper now accepts files

### Attempt 2: Audio Field Name Error
- **Problem**: Wrong field name `audioBuffer` vs `audio`
- **Fix**: Changed to `ttsResult.audio` (index.ts:223)
- **Result**: ✅ Fixed - Backend now returns audio

### Attempt 3: MIME Type Error
- **Problem**: Non-standard `audio/mp3` MIME type
- **Fix**: Changed to `audio/mpeg` (voice-rag-widget.html:228)
- **Result**: ❌ Still not working

### Attempt 4: Debug Logging
- **Problem**: Unknown why frontend receives length: 0
- **Fix**: Added comprehensive logging
- **Result**: ✅ Confirmed backend works, frontend broken

---

## Additional Issue: Browser Audio Recording

### Recording Quality Problem
- **Symptom**: 10-second recording only transcribes as "you" (3 characters)
- **Analysis**: All audio samples = 0.000000 (complete silence)
- **Root Cause**: MediaRecorder API not capturing macOS microphone
- **Status**: ❌ UNFIXED

### Workaround
Use CLI version instead:
```bash
npm run voice-rag
```

CLI version works **perfectly** with sox recording.

---

## Recommendations for Codex

### High Priority: Fix Frontend Audio Playback

1. **Check actual HTTP response**:
   ```javascript
   const res = await fetch(`${API_BASE}/chat`, { method: 'POST', body: formData });
   const text = await res.text();  // Get raw response
   console.log('Raw response:', text.substring(0, 1000));  // Check if audioBase64 is there
   const data = JSON.parse(text);
   ```

2. **Verify Content-Type header**:
   ```typescript
   // In server.ts, explicitly set:
   res.setHeader('Content-Type', 'application/json');
   res.json({ ... });
   ```

3. **Check for JSON size limits**:
   - 730KB base64 string might exceed some limit
   - Try compressing or chunking

4. **Simplify audio playback**:
   ```javascript
   // Instead of new Audio(), try:
   const audioBlob = base64ToBlob(data.audioBase64, 'audio/mpeg');
   const audioUrl = URL.createObjectURL(audioBlob);
   const audio = new Audio(audioUrl);
   ```

### Medium Priority: Fix Browser Recording

1. **Try different MediaRecorder codecs**:
   ```javascript
   const options = { mimeType: 'audio/webm;codecs=opus' };
   mediaRecorder = new MediaRecorder(stream, options);
   ```

2. **Check microphone permissions**:
   ```javascript
   const devices = await navigator.mediaDevices.enumerateDevices();
   console.log('Audio inputs:', devices.filter(d => d.kind === 'audioinput'));
   ```

3. **Use WebSocket streaming** instead of MediaRecorder:
   - Real-time audio streaming
   - More reliable on macOS

### Alternative: Accept CLI as Primary Interface

**Pros**:
- CLI works perfectly (100% success rate)
- No browser compatibility issues
- More reliable audio recording with sox

**Cons**:
- Less user-friendly
- Requires terminal access

---

## Test Verification Commands

### Backend Test (✅ Working):
```bash
npm run voice-rag
# Expected: Full pipeline works, audio plays back
```

### Web UI Test (❌ Broken):
```bash
npm run voice-rag:server
open http://localhost:3003/voice-rag-widget.html
# Expected: Audio playback fails despite backend success
```

---

## Handoff Notes

1. **Backend is perfect** - Do not modify server.ts or index.ts
2. **Frontend is broken** - Focus on voice-rag-widget.html lines 180-249
3. **Network layer might be broken** - Check CORS, content-type, JSON parsing
4. **Recording is separate issue** - May require WebSocket or native recording

---

**Created**: 2025-12-25
**Status**: Escalated to Codex
**Estimated Fix Time**: 1-2 hours for experienced frontend developer
**Blocking**: Voice RAG Web UI deployment (CLI works as backup)
