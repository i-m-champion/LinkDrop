<div align="center">

<!-- Hero Banner -->
<img src="https://capsule-render.vercel.app/api?type=waving&color=0:f97316,50:ec4899,100:8b5cf6&height=215&section=header&text=ReelJet%20Studio&fontSize=60&fontColor=ffffff&fontAlignY=38&desc=Universal%20High-Speed%20Video%20%26%20Audio%20Batch%20Downloader&descSize=18&descAlignY=62&animation=fadeIn" alt="ReelJet Studio Banner" width="100%" />

<p align="center">
  <a href="https://nodejs.org/"><img src="https://img.shields.io/badge/Node.js-18%2B-339933?style=for-the-badge&logo=nodedotjs&logoColor=white" alt="Node.js" /></a>
  <a href="https://react.dev/"><img src="https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react&logoColor=black" alt="React" /></a>
  <a href="https://tailwindcss.com/"><img src="https://img.shields.io/badge/Tailwind_CSS-3.4-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white" alt="Tailwind CSS" /></a>
  <a href="https://github.com/yt-dlp/yt-dlp"><img src="https://img.shields.io/badge/yt--dlp-Powered-ef4444?style=for-the-badge&logo=youtube&logoColor=white" alt="yt-dlp" /></a>
  <a href="https://ffmpeg.org/"><img src="https://img.shields.io/badge/FFmpeg-Muxing-007808?style=for-the-badge&logo=ffmpeg&logoColor=white" alt="FFmpeg" /></a>
</p>

<p align="center">
  <strong>Paste mixed links from YouTube, Instagram, TikTok, X, Reddit &amp; 1,000+ sites. Extract streams in parallel, convert to HD MP4 or lossless audio, trim exact clips, grab subtitles, and bundle everything into a folder-organized ZIP.</strong>
</p>

<p align="center">
  <a href="#-supported-platforms">Platforms</a> •
  <a href="#-key-features">Features</a> •
  <a href="#-architecture">Architecture</a> •
  <a href="#-quick-start">Quick Start</a> •
  <a href="#-api-reference">API Reference</a>
</p>

</div>

---

## 🌐 Supported Platforms

| Platform | Capabilities |
| :--- | :--- |
| **YouTube** | Videos, Shorts, Music, **4K/1440p/1080p Muxed MP4**, **Playlist Expander**, `.srt` Subtitles |
| **Instagram** | Reels, Posts, Carousels via **Ultra-Fast SSR Engine** (~0.5s) + optional `sessionid` unlock |
| **TikTok / X / Facebook** | Watermark-free HD MP4s, audio extraction, batch ZIP bundling |
| **Reddit / Vimeo / Twitch / 1,000+ Sites** | Automatic resolution detection, audio conversion, clipping & cover download |

---

## ✨ Key Features

<table>
  <tr>
    <td width="50%">
      <h3>⚡ Mixed-Platform Parallel Batching</h3>
      <p>Paste 1 to 100 links from different platforms in one box. Color-coded detection pills, bounded worker concurrency (<code>2x Safe</code>, <code>5x Balanced</code>, <code>8x Turbo</code>), and live SSE progress.</p>
    </td>
    <td width="50%">
      <h3>🎬 4K Muxing &amp; Audio Studio</h3>
      <p>Choose per-item or batch-wide output: <strong>MP4 (4K / 1440p / 1080p / 720p)</strong> muxed cleanly via <code>ffmpeg</code>, or extract <strong>MP3 (320k), M4A, FLAC, WAV</strong> with embedded cover art.</p>
    </td>
  </tr>
  <tr>
    <td width="50%">
      <h3>✂️ Clip Trimmer, Subtitles &amp; Covers</h3>
      <p>Preview in HD inside the Studio Modal, trim exact <code>Start → End</code> timestamp segments, download <code>.srt</code> captions, and save full-resolution thumbnails.</p>
    </td>
    <td width="50%">
      <h3>📂 Folder-Grouped Store-Mode ZIP</h3>
      <p>Bundle dozens of videos &amp; audio tracks into one archive organized into platform folders (<code>YouTube/</code>, <code>Instagram/</code>, <code>TikTok/</code>) at wire speed.</p>
    </td>
  </tr>
  <tr>
    <td width="50%">
      <h3>📜 Playlist Expander</h3>
      <p>Drop any YouTube Playlist link and click <strong>Expand Playlist</strong> to populate up to 30+ videos directly into your batch studio queue.</p>
    </td>
    <td width="50%">
      <h3>🌓 Dark/Light Studio + Table View + History</h3>
      <p>Switch between a visual Card Grid and a high-density Compact Table View, toggle Dark/Light mode, and re-queue past downloads from the History Drawer.</p>
    </td>
  </tr>
</table>

---

## 🏗️ Architecture

```mermaid
flowchart LR
    A["Mixed URLs / Playlists"] --> B["Multi-Platform Parser & Detector"]
    B --> C["POST /api/extract/batch (SSE)"]
    C --> D{"Platform Router"}
    D -->|Instagram| E1["Fast SSR data-sjs Parser (~0.5s)"]
    D -->|YouTube & 1000+ Sites| E2["yt-dlp Metadata & Format Resolver"]
    E1 --> F["20m In-Memory TTL Cache"]
    E2 --> F
    F --> G["React Studio (Grid / Table / Modal)"]
    G --> H["GET /api/prepare/:id (SSE Progress)"]
    H --> I["FFmpeg Mux / Trim / MP3-FLAC-WAV"]
    G --> J["POST /api/download-zip (Folder-Grouped ZIP)"]
```

---

## 🚀 Quick Start

### Prerequisites
- **Node.js 18+**
- **yt-dlp** & **ffmpeg** (installed on macOS via `brew install yt-dlp ffmpeg`, or use the included `Dockerfile`)

### 1. Clone & Install

```bash
git clone https://github.com/i-m-champion/Insta-downloader.git
cd Insta-downloader
npm install
```

### 2. Run in Development Mode

```bash
npm run dev
```

- Frontend (Vite): **[http://localhost:5173](http://localhost:5173)**
- Backend API: **[http://localhost:3001](http://localhost:3001)**

### 3. Build & Run in Production

```bash
npm run build
npm start
```

Everything runs on **[http://localhost:3001](http://localhost:3001)**.

### 4. Deploy Anywhere with Docker

```bash
docker build -t reeljet-studio .
docker run -p 3001:3001 reeljet-studio
```

### 5. Run Tests

```bash
npm test
```

---

## 🔌 API Reference

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/health` | Service health + live `yt-dlp` / `ffmpeg` capability flags |
| `POST` | `/api/parse` | Parses & deduplicates mixed-platform URLs + playlist flags |
| `POST` | `/api/playlist/expand` | Expands a YouTube playlist URL into queue items |
| `POST` | `/api/extract/batch` | **SSE stream** extracting mixed URLs concurrently |
| `GET` | `/api/thumb/:id` | Proxies thumbnail (`?download=1` saves full-res `.jpg`) |
| `GET` | `/api/subtitles/:id` | Extracts `.srt` subtitles (`?lang=en`) |
| `GET` | `/api/stream/:id` | HTTP `Range` streaming proxy for instant HD preview & direct saves |
| `GET` | `/api/prepare/:id` | **SSE progress** for HD muxing, MP3/M4A/FLAC/WAV conversion & clipping |
| `GET` | `/api/file/:token` | One-time download endpoint with automatic temp cleanup |
| `POST` | `/api/download-zip` | Concurrent mixed-format ZIP bundler with optional platform folders |

---

## ⚠️ Disclaimer

This tool is designed for personal archiving, offline viewing, and downloading content you own or have permission to save. Please respect creators' copyrights and platform Terms of Service.

<div align="center">
  <br />
  <sub>Built with ⚡ by <a href="https://github.com/i-m-champion">i-m-champion</a></sub>
</div>
