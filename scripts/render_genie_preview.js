const { app, BrowserWindow, ipcMain } = require('electron');
const fs = require('fs');
const path = require('path');

app.whenReady().then(async () => {
  const win = new BrowserWindow({
    width: 1280,
    height: 720,
    show: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    background: #000;
    overflow: hidden;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  }
  canvas {
    display: block;
    width: 1280px;
    height: 720px;
  }
</style>
</head>
<body>
<canvas id="c" width="1280" height="720"></canvas>
<script>
  const { ipcRenderer } = require('electron');
  const canvas = document.getElementById('c');
  const ctx = canvas.getContext('2d');

  // Video recording setup
  const stream = canvas.captureStream(60);
  let mimeType = 'video/mp4;codecs=avc1';
  if (!MediaRecorder.isTypeSupported(mimeType)) {
    mimeType = 'video/mp4';
    if (!MediaRecorder.isTypeSupported(mimeType)) {
      mimeType = 'video/webm;codecs=vp9';
    }
  }

  const recorder = new MediaRecorder(stream, {
    mimeType: mimeType,
    videoBitsPerSecond: 6000000
  });

  const chunks = [];
  recorder.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data); };
  recorder.onstop = async () => {
    const blob = new Blob(chunks, { type: mimeType });
    const buffer = Buffer.from(await blob.arrayBuffer());
    ipcRenderer.send('video-recorded', { buffer, ext: mimeType.includes('mp4') ? 'mp4' : 'webm' });
  };

  recorder.start();

  // Animation Timeline: 5.2 seconds total
  const TOTAL_DURATION = 5.2;
  const startTime = performance.now();

  function easeOutElastic(x) {
    const c4 = (2 * Math.PI) / 3;
    return x === 0 ? 0 : x === 1 ? 1 : Math.pow(2, -10 * x) * Math.sin((x * 10 - 0.75) * c4) + 1;
  }

  function easeOutCubic(x) {
    return 1 - Math.pow(1 - x, 3);
  }

  function easeInCubic(x) {
    return x * x * x;
  }

  function easeInOutQuad(x) {
    return x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2;
  }

  function drawCursor(x, y, isClick = false) {
    ctx.save();
    ctx.translate(x, y);
    if (isClick) ctx.scale(0.9, 0.9);
    ctx.shadowColor = 'rgba(0,0,0,0.5)';
    ctx.shadowBlur = 8;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 4;

    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1.5;

    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, 18);
    ctx.lineTo(4.5, 14);
    ctx.lineTo(8, 21.5);
    ctx.lineTo(11, 20);
    ctx.lineTo(7.5, 12.5);
    ctx.lineTo(13.5, 12.5);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    if (isClick) {
      ctx.strokeStyle = 'rgba(255, 69, 58, 0.8)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(6, 6, 12, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawWallpaper() {
    // Elegant macOS Sequoia / Windows 11 Dark Luxury wallpaper
    const grad = ctx.createLinearGradient(0, 0, 1280, 720);
    grad.addColorStop(0, '#06070a');
    grad.addColorStop(0.3, '#0d111a');
    grad.addColorStop(0.6, '#131b2c');
    grad.addColorStop(1, '#080a10');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 1280, 720);

    // Subtle ambient color glow behind the notch
    const glow = ctx.createRadialGradient(640, 0, 20, 640, 0, 450);
    glow.addColorStop(0, 'rgba(255, 0, 51, 0.12)');
    glow.addColorStop(0.5, 'rgba(56, 189, 248, 0.06)');
    glow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, 1280, 400);

    // Screen top bezel line
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, 1280, 3);
  }

  function drawWaterDropNotch(progress, retractionProgress = 0, isHovered = false) {
    // progress: 0 (collapsed) -> 1 (fully open)
    // retractionProgress: 0 (not retracting) -> 1 (fully sucked back up)

    const cx = 640;
    const finalW = 490;
    const finalH = 186;

    // Resting pill dimensions
    const restW = 120;
    const restH = 22;

    let currentW, currentH, pinchNeck, dropBulge, alpha;

    if (retractionProgress > 0) {
      // RETRACTION / SUCTION PHASE (Mac Genie Suction Effect)
      const p = retractionProgress;
      // Genie pinch: the middle narrows dramatically as the bottom pulls upward
      const pinch = Math.sin(p * Math.PI) * 0.45;
      currentW = finalW - (finalW - restW) * easeInCubic(p) * (1 - pinch);
      currentH = finalH - (finalH - restH) * easeInCubic(p);
      pinchNeck = pinch;
      alpha = 1 - easeInCubic(p) * 0.2;
    } else {
      // EXPANSION / WATER DROP PHASE
      const p = progress;
      if (p <= 0.001) {
        currentW = restW;
        currentH = restH;
        pinchNeck = 0;
        alpha = 1;
      } else {
        // Liquid Drop Physics:
        // Starts with a narrow elongation (teardrop neck dripping down)
        // Then snaps out to full width with liquid surface tension bounce
        const stretchY = p < 0.7 ? Math.sin((p / 0.7) * Math.PI) * 18 : 0;
        currentH = restH + (finalH - restH) * easeOutCubic(p) + stretchY;
        
        // Width expands with slight delay (like water pulling down before ballooning outward)
        const delayedW = Math.max(0, (p - 0.15) / 0.85);
        currentW = restW + (finalW - restW) * easeOutCubic(delayedW);

        // Water droplet neck curvature
        pinchNeck = p < 0.6 ? Math.sin((p / 0.6) * Math.PI) * 0.25 : 0;
        alpha = 1;
      }
    }

    const halfW = currentW / 2;
    const h = Math.max(restH, currentH);

    ctx.save();
    ctx.translate(cx, 0);

    // Drop shadow with liquid depth
    ctx.shadowColor = 'rgba(0, 0, 0, ' + (0.5 + progress * 0.3) + ')';
    ctx.shadowBlur = 24 + progress * 24;
    ctx.shadowOffsetY = 12 + progress * 16;

    // Draw Organic Liquid Teardrop Path
    ctx.beginPath();
    ctx.moveTo(-halfW * (1 - pinchNeck), 0);

    // Top neck flare (connects smoothly into bezel like a water droplet hanging)
    const neckCtrlY = h * 0.3;
    const waistCtrlY = h * 0.65;
    const waistWidth = halfW * (1 - pinchNeck * 0.5);

    // Left side curve
    ctx.bezierCurveTo(
      -halfW * (1 - pinchNeck), neckCtrlY,
      -waistWidth, waistCtrlY,
      -halfW, h - 22
    );

    // Bottom-left rounded corner
    ctx.quadraticCurveTo(-halfW, h, -halfW + 22, h);

    // Bottom flat edge with subtle liquid surface tension arc
    ctx.lineTo(halfW - 22, h);

    // Bottom-right rounded corner
    ctx.quadraticCurveTo(halfW, h, halfW, h - 22);

    // Right side curve
    ctx.bezierCurveTo(
      waistWidth, waistCtrlY,
      halfW * (1 - pinchNeck), neckCtrlY,
      halfW * (1 - pinchNeck), 0
    );

    ctx.closePath();

    // Liquid Glass Gradient fill
    const glassGrad = ctx.createLinearGradient(0, 0, 0, h);
    glassGrad.addColorStop(0, 'rgba(20, 24, 34, 0.96)');
    glassGrad.addColorStop(0.5, 'rgba(12, 14, 20, 0.94)');
    glassGrad.addColorStop(1, 'rgba(9, 10, 15, 0.97)');
    ctx.fillStyle = glassGrad;
    ctx.fill();

    // Liquid Glass Surface Border
    ctx.shadowColor = 'transparent';
    ctx.lineWidth = 1.2;
    const borderGrad = ctx.createLinearGradient(0, 0, 0, h);
    borderGrad.addColorStop(0, 'rgba(255, 255, 255, 0.35)');
    borderGrad.addColorStop(0.5, 'rgba(255, 255, 255, 0.12)');
    borderGrad.addColorStop(1, 'rgba(255, 255, 255, 0.22)');
    ctx.strokeStyle = borderGrad;
    ctx.stroke();

    // Top subtle highlight reflection (Apple glass shine)
    ctx.beginPath();
    ctx.moveTo(-halfW * 0.85, 2);
    ctx.lineTo(halfW * 0.85, 2);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Render Inner Components based on expansion progress
    if (progress > 0.4 && retractionProgress < 0.6) {
      const contentAlpha = Math.min(1, (progress - 0.4) / 0.45) * (1 - retractionProgress / 0.6);
      ctx.save();
      ctx.globalAlpha = contentAlpha;

      // 1. Header Bar (32px)
      ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
      ctx.fillRect(-halfW + 4, 3, currentW - 8, 30);

      // Header Tabs
      const tabs = [
        { name: 'YT Music', icon: '🎵', active: true },
        { name: 'Alerts', icon: '🔔', active: false },
        { name: 'Shelf', icon: '📁', active: false },
        { name: 'HUD', icon: '⚡', active: false },
        { name: 'Clips', icon: '📋', active: false }
      ];

      let tabX = -halfW + 16;
      ctx.font = '600 10px -apple-system, sans-serif';
      tabs.forEach(t => {
        if (t.active) {
          ctx.fillStyle = 'rgba(255, 0, 51, 0.2)';
          ctx.beginPath();
          ctx.roundRect(tabX, 7, 65, 22, 6);
          ctx.fill();
          ctx.strokeStyle = 'rgba(255, 0, 51, 0.4)';
          ctx.stroke();
          ctx.fillStyle = '#ff4d6d';
        } else {
          ctx.fillStyle = '#94a3b8';
        }
        ctx.fillText(t.icon + ' ' + t.name, tabX + 8, 22);
        tabX += 70;
      });

      // Right Action Buttons: Pin, Mode, Collapse, Red Quit
      const btnX = halfW - 95;
      const btns = ['📌', '▢', '⌃', '✕'];
      btns.forEach((b, idx) => {
        const bx = btnX + idx * 22;
        ctx.fillStyle = idx === 3 ? 'rgba(255, 69, 58, 0.25)' : 'rgba(255, 255, 255, 0.08)';
        ctx.beginPath();
        ctx.roundRect(bx, 7, 18, 18, 4);
        ctx.fill();
        ctx.fillStyle = idx === 3 ? '#ff453a' : '#cbd5e1';
        ctx.font = '700 9px sans-serif';
        ctx.fillText(b, bx + 5, 20);
      });

      // 2. Body Area (YouTube Music Player Mockup)
      // Album Art Squircle
      ctx.fillStyle = '#1e2330';
      ctx.beginPath();
      ctx.roundRect(-halfW + 18, 45, 64, 64, 12);
      ctx.fill();
      ctx.fillStyle = '#ff0033';
      ctx.font = '24px sans-serif';
      ctx.fillText('▶', -halfW + 40, 85);

      // Song Title & Artist
      ctx.fillStyle = '#ffffff';
      ctx.font = '700 12px sans-serif';
      ctx.fillText('Hukum - Thalaivar Alappara', -halfW + 94, 62);
      ctx.fillStyle = '#94a3b8';
      ctx.font = '500 10.5px sans-serif';
      ctx.fillText('Anirudh Ravichander &bull; Jailer', -halfW + 94, 78);

      // Playback waveform / progress bar
      ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.beginPath();
      ctx.roundRect(-halfW + 94, 94, 260, 4, 2);
      ctx.fill();

      const progressWidth = 140;
      const progGrad = ctx.createLinearGradient(-halfW + 94, 0, -halfW + 94 + progressWidth, 0);
      progGrad.addColorStop(0, '#ff0033');
      progGrad.addColorStop(1, '#ff453a');
      ctx.fillStyle = progGrad;
      ctx.beginPath();
      ctx.roundRect(-halfW + 94, 94, progressWidth, 4, 2);
      ctx.fill();

      // Audio Equalizer bars animation
      const time = performance.now() * 0.005;
      for (let i = 0; i < 5; i++) {
        const barH = 6 + Math.sin(time + i * 1.2) * 8;
        ctx.fillStyle = '#ff453a';
        ctx.fillRect(halfW - 55 + i * 6, 85 - barH, 3.5, barH);
      }

      // Radio Station Chips below
      const stations = ['ARR Mix', 'Anirudh Hits', 'Yuvan Classics', 'Lofi Beats'];
      let stX = -halfW + 18;
      stations.forEach((st, idx) => {
        ctx.fillStyle = idx === 1 ? 'rgba(255, 0, 51, 0.15)' : 'rgba(255, 255, 255, 0.05)';
        ctx.beginPath();
        ctx.roundRect(stX, 122, 85, 20, 6);
        ctx.fill();
        ctx.strokeStyle = idx === 1 ? 'rgba(255, 0, 51, 0.35)' : 'rgba(255, 255, 255, 0.08)';
        ctx.stroke();
        ctx.fillStyle = idx === 1 ? '#ff4d6d' : '#94a3b8';
        ctx.font = '500 9px sans-serif';
        ctx.fillText(st, stX + 12, 136);
        stX += 92;
      });

      ctx.restore();
    } else {
      // In collapsed mini pill mode: show camera dot & mini equalizer
      const pillAlpha = 1 - progress;
      ctx.save();
      ctx.globalAlpha = pillAlpha;
      ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
      ctx.beginPath();
      ctx.arc(-halfW + 14, 11, 4, 0, Math.PI * 2);
      ctx.fill();

      // Green privacy lens reflection
      ctx.fillStyle = 'rgba(16, 185, 129, 0.7)';
      ctx.beginPath();
      ctx.arc(-halfW + 14, 11, 2, 0, Math.PI * 2);
      ctx.fill();

      // Mini equalizer
      for (let i = 0; i < 3; i++) {
        const barH = 4 + (i % 2) * 3;
        ctx.fillStyle = '#ff0033';
        ctx.fillRect(halfW - 22 + i * 5, 11 - barH / 2, 2.5, barH);
      }
      ctx.restore();
    }

    ctx.restore();
  }

  // Draw overlay label explaining the effect
  function drawOverlay(t) {
    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.roundRect = ctx.roundRect || function(x, y, w, h, r) {
      this.rect(x, y, w, h);
    };

    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(24, 650, 420, 48, 10);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = '700 13px -apple-system, sans-serif';
    ctx.fillText('Mac Genie & Liquid Water-Drop Transition', 40, 670);

    ctx.font = '500 10.5px -apple-system, sans-serif';
    let statusText = 'Resting Pill State';
    if (t >= 0.6 && t < 1.8) statusText = '💧 Water-Drop Stretch & Elastic Expansion';
    else if (t >= 1.8 && t < 3.2) statusText = '✨ Active Interaction State';
    else if (t >= 3.2 && t < 4.4) statusText = '🌀 Genie Pinch & Liquid Suction Retraction';
    else if (t >= 4.4) statusText = '💧 Settled Back into Top Bezel';

    ctx.fillStyle = '#38bdf8';
    ctx.fillText(statusText, 40, 688);

    // Duration timer pill on right
    ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.beginPath();
    ctx.roundRect(1170, 660, 80, 28, 6);
    ctx.fill();
    ctx.fillStyle = '#94a3b8';
    ctx.font = '600 11px monospace';
    ctx.fillText(t.toFixed(1) + 's / 5.2s', 1180, 678);

    ctx.restore();
  }

  // Main Render Loop
  function render() {
    const elapsed = (performance.now() - startTime) / 1000;
    const t = Math.min(TOTAL_DURATION, elapsed);

    drawWallpaper();

    // Timeline calculation
    let expansionProgress = 0;
    let retractionProgress = 0;
    let cursorX = 640;
    let cursorY = 480;
    let isClick = false;

    if (t < 0.6) {
      // 0.0 - 0.6s: Rest at top, cursor approaches from below
      const p = t / 0.6;
      cursorX = 640;
      cursorY = 500 - easeOutCubic(p) * 495;
      expansionProgress = 0;
    } else if (t < 1.8) {
      // 0.6 - 1.8s: Cursor touches top edge (y <= 5), water drop expands!
      const p = (t - 0.6) / 1.2;
      expansionProgress = p;
      cursorX = 640 + Math.sin(p * Math.PI) * 20;
      cursorY = 5 + p * 60; // cursor follows droplet down slightly
    } else if (t < 3.2) {
      // 1.8 - 3.2s: Fully expanded, cursor moves to play button & clicks
      expansionProgress = 1;
      const p = (t - 1.8) / 1.4;
      if (p < 0.4) {
        // move to button
        const subP = p / 0.4;
        cursorX = 640 + 50 * subP;
        cursorY = 65 + 20 * subP;
      } else if (p < 0.65) {
        // click
        cursorX = 690;
        cursorY = 85;
        isClick = true;
      } else {
        // move away
        const subP = (p - 0.65) / 0.35;
        cursorX = 690;
        cursorY = 85 + subP * 120;
      }
    } else if (t < 4.4) {
      // 3.2 - 4.4s: Cursor leaves, Genie suction pulls notch up!
      expansionProgress = 1;
      const p = (t - 3.2) / 1.2;
      retractionProgress = p;
      cursorX = 690 + p * 30;
      cursorY = 205 + p * 200; // cursor walks away downward
    } else {
      // 4.4 - 5.2s: Settle back into top bezel
      expansionProgress = 0;
      retractionProgress = 1;
      cursorX = 720;
      cursorY = 405;
    }

    drawWaterDropNotch(expansionProgress, retractionProgress, t >= 0.6 && t < 3.2);
    drawCursor(cursorX, cursorY, isClick);
    drawOverlay(t);

    if (t < TOTAL_DURATION) {
      requestAnimationFrame(render);
    } else {
      // Finished 5.2 seconds recording
      setTimeout(() => {
        recorder.stop();
      }, 100);
    }
  }

  requestAnimationFrame(render);
</script>
</body>
</html>`;

  const htmlPath = path.join(__dirname, '../docs/temp_render.html');
  fs.writeFileSync(htmlPath, html);

  ipcMain.on('video-recorded', (event, { buffer, ext }) => {
    try {
      const outputVideoDocs = path.join(__dirname, `../docs/Notch_Dude_Genie_WaterDrop_Preview.${ext}`);
      const outputVideoArtifacts = path.join('C:/Users/Avaniko/.gemini/antigravity/brain/17e7276e-9103-4b51-913d-595f419608f1', `Notch_Dude_Genie_WaterDrop_Preview.${ext}`);
      const outputVideoAssets = path.join(__dirname, `../assets/Notch_Dude_Genie_WaterDrop_Preview.${ext}`);

      fs.writeFileSync(outputVideoDocs, buffer);
      fs.writeFileSync(outputVideoArtifacts, buffer);
      fs.writeFileSync(outputVideoAssets, buffer);

      console.log('Video recorded successfully!');
      console.log('Docs path:', outputVideoDocs, 'Size:', buffer.length);
      console.log('Artifacts path:', outputVideoArtifacts);

      // Clean up temp file
      if (fs.existsSync(htmlPath)) fs.unlinkSync(htmlPath);

      app.quit();
    } catch (err) {
      console.error('Error saving video:', err);
      app.quit();
      process.exit(1);
    }
  });

  await win.loadFile(htmlPath);
});
