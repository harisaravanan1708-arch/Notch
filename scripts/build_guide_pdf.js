const { app, BrowserWindow } = require('electron');
const fs = require('fs');
const path = require('path');

app.whenReady().then(async () => {
  try {
    const logoPath = path.join(__dirname, '../assets/logo.png');
    const logoBase64 = fs.existsSync(logoPath) ? fs.readFileSync(logoPath).toString('base64') : '';

    const p1Path = 'C:/Users/Avaniko/.gemini/antigravity/brain/17e7276e-9103-4b51-913d-595f419608f1/.user_uploaded/media_1795427444916_1dee4b54.png';
    const p1Base64 = fs.existsSync(p1Path) ? fs.readFileSync(p1Path).toString('base64') : '';

    const pHeaderPath = 'C:/Users/Avaniko/.gemini/antigravity/brain/17e7276e-9103-4b51-913d-595f419608f1/.user_uploaded/media_1795456251351_935c5d48.png';
    const pHeaderBase64 = fs.existsSync(pHeaderPath) ? fs.readFileSync(pHeaderPath).toString('base64') : '';

    const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Notch Dude - Cross-System Installation & User Guide</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap');

  @page {
    size: A4;
    margin: 12mm 14mm;
  }

  * {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }

  body {
    font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    background: #090a0f;
    color: #e2e8f0;
    line-height: 1.45;
    font-size: 11pt;
  }

  .page {
    page-break-after: always;
    padding: 8px 4px 16px 4px;
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
  }

  .page:last-child {
    page-break-after: avoid;
  }

  /* HEADER BANNER */
  .brand-header {
    background: linear-gradient(135deg, rgba(255, 0, 51, 0.15) 0%, rgba(20, 24, 38, 0.8) 100%);
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 14px;
    padding: 14px 20px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 14px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
  }

  .brand-left {
    display: flex;
    align-items: center;
    gap: 14px;
  }

  .brand-logo {
    width: 48px;
    height: 48px;
    border-radius: 12px;
    box-shadow: 0 0 16px rgba(255, 0, 51, 0.4);
    object-fit: contain;
  }

  .brand-title h1 {
    font-size: 18pt;
    font-weight: 800;
    color: #ffffff;
    letter-spacing: -0.5px;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .brand-title p {
    font-size: 9.5pt;
    color: #94a3b8;
    margin-top: 2px;
  }

  .badge-container {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 5px;
  }

  .badge {
    display: inline-block;
    padding: 4px 10px;
    border-radius: 20px;
    font-size: 8pt;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .badge-red {
    background: rgba(255, 0, 51, 0.2);
    color: #ff4d6d;
    border: 1px solid rgba(255, 0, 51, 0.4);
  }

  .badge-green {
    background: rgba(16, 185, 129, 0.15);
    color: #34d399;
    border: 1px solid rgba(16, 185, 129, 0.3);
  }

  /* SECTION CARDS */
  .card {
    background: rgba(18, 22, 34, 0.75);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 12px;
    padding: 14px 16px;
    margin-bottom: 12px;
  }

  .card-header {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 8px;
  }

  .step-num {
    width: 24px;
    height: 24px;
    background: linear-gradient(135deg, #ff0033, #ff453a);
    color: #ffffff;
    font-weight: 800;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 9.5pt;
  }

  .card-title {
    font-size: 12.5pt;
    font-weight: 700;
    color: #ffffff;
  }

  .card-subtitle {
    font-size: 9pt;
    color: #94a3b8;
    margin-left: auto;
  }

  p {
    margin-bottom: 8px;
    color: #cbd5e1;
    font-size: 9.5pt;
  }

  .tanglish-box {
    background: rgba(245, 158, 11, 0.08);
    border-left: 3px solid #f59e0b;
    border-radius: 0 8px 8px 0;
    padding: 8px 12px;
    margin: 8px 0;
    font-size: 9pt;
    color: #fde68a;
  }
  .tanglish-box strong {
    color: #fbbf24;
  }

  .info-box {
    background: rgba(59, 130, 246, 0.08);
    border-left: 3px solid #3b82f6;
    border-radius: 0 8px 8px 0;
    padding: 8px 12px;
    margin: 8px 0;
    font-size: 9pt;
    color: #bfdbfe;
  }

  /* GRID / METHOD CARDS */
  .grid-2 {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
    margin: 8px 0;
  }

  .method-card {
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.06);
    border-radius: 10px;
    padding: 10px 12px;
  }

  .method-header {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 4px;
    font-weight: 700;
    color: #f1f5f9;
    font-size: 9.5pt;
  }

  .method-desc {
    font-size: 8.5pt;
    color: #94a3b8;
    line-height: 1.35;
  }

  /* CODE / FILE BADGE */
  .code-badge {
    background: rgba(0, 0, 0, 0.5);
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 6px;
    padding: 3px 8px;
    font-family: 'JetBrains Mono', monospace;
    font-size: 8.5pt;
    color: #38bdf8;
    display: inline-block;
  }

  /* WINDOWS SMARTSCREEN MOCKUP */
  .smartscreen-dialog {
    background: #0078d7;
    border-radius: 8px;
    padding: 16px 20px;
    color: #ffffff;
    box-shadow: 0 12px 28px rgba(0, 0, 0, 0.6);
    margin: 10px 0;
    position: relative;
    border: 1px solid rgba(255, 255, 255, 0.2);
  }

  .ss-header {
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 13pt;
    font-weight: 700;
    margin-bottom: 8px;
  }

  .ss-body {
    font-size: 9pt;
    color: #e0f2fe;
    line-height: 1.4;
    margin-bottom: 12px;
  }

  .ss-meta {
    background: rgba(0, 0, 0, 0.15);
    border-radius: 6px;
    padding: 8px 12px;
    font-size: 8.5pt;
    margin-bottom: 12px;
  }

  .ss-meta-row {
    display: flex;
    margin-bottom: 4px;
  }

  .ss-meta-label {
    width: 80px;
    color: #bae6fd;
    font-weight: 600;
  }

  .ss-meta-val {
    color: #ffffff;
    font-family: 'JetBrains Mono', monospace;
  }

  .ss-actions {
    display: flex;
    justify-content: flex-end;
    align-items: center;
    gap: 12px;
  }

  .ss-link {
    color: #ffffff;
    text-decoration: underline;
    font-size: 9pt;
    cursor: pointer;
    font-weight: 600;
    position: relative;
  }

  .ss-btn {
    background: rgba(0, 0, 0, 0.25);
    border: 1px solid rgba(255, 255, 255, 0.4);
    color: #ffffff;
    padding: 5px 16px;
    border-radius: 4px;
    font-size: 9pt;
    font-weight: 600;
  }

  .ss-btn-primary {
    background: #ffffff;
    color: #0078d7;
    border: none;
    padding: 6px 18px;
    border-radius: 4px;
    font-size: 9pt;
    font-weight: 700;
  }

  .action-arrow {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    background: #ff0033;
    color: #fff;
    padding: 3px 10px;
    border-radius: 20px;
    font-size: 8pt;
    font-weight: 800;
    box-shadow: 0 2px 8px rgba(0,0,0,0.4);
    animation: pulse 2s infinite;
  }

  /* CONTROLS BREAKDOWN */
  .control-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 8px;
    margin: 10px 0;
  }

  .control-item {
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 8px;
    padding: 10px;
    text-align: center;
  }

  .control-icon {
    font-size: 15pt;
    margin-bottom: 4px;
  }

  .control-name {
    font-size: 9pt;
    font-weight: 700;
    color: #fff;
    margin-bottom: 2px;
  }

  .control-desc {
    font-size: 7.8pt;
    color: #94a3b8;
    line-height: 1.25;
  }

  .control-item.quit {
    border-color: rgba(255, 69, 58, 0.4);
    background: rgba(255, 69, 58, 0.08);
  }
  .control-item.quit .control-name {
    color: #ff453a;
  }

  /* SCREENSHOT STYLING */
  .screenshot-container {
    background: rgba(0, 0, 0, 0.5);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 10px;
    overflow: hidden;
    margin: 8px 0;
    box-shadow: 0 8px 24px rgba(0,0,0,0.5);
    text-align: center;
  }

  .screenshot-img {
    max-width: 100%;
    height: auto;
    display: block;
    margin: 0 auto;
    max-height: 165px;
    object-fit: cover;
  }

  .screenshot-caption {
    font-size: 8pt;
    color: #94a3b8;
    padding: 4px 8px;
    background: rgba(15, 23, 42, 0.7);
    border-top: 1px solid rgba(255, 255, 255, 0.05);
  }

  /* FOOTER */
  .doc-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-top: 1px solid rgba(255, 255, 255, 0.08);
    padding-top: 8px;
    font-size: 8pt;
    color: #64748b;
  }
</style>
</head>
<body>

  <!-- ==================== PAGE 1 ==================== -->
  <div class="page">
    <div>
      <!-- BRAND HEADER -->
      <header class="brand-header">
        <div class="brand-left">
          ${logoBase64 ? `<img src="data:image/png;base64,${logoBase64}" class="brand-logo" alt="Notch Dude Logo">` : `<div class="brand-logo" style="background:#ff0033;"></div>`}
          <div class="brand-title">
            <h1>Notch Dude <span>v1.0.0</span></h1>
            <p>Windows 10 & 11 Cross-System Installation & User Guide</p>
          </div>
        </div>
        <div class="badge-container">
          <span class="badge badge-red">Standalone Setup</span>
          <span class="badge badge-green">Zero Dependencies</span>
        </div>
      </header>

      <!-- OVERVIEW -->
      <div class="card">
        <div class="card-header">
          <span class="step-num">★</span>
          <span class="card-title">Quick Overview / Enna Idhu?</span>
        </div>
        <p><strong>Notch Dude</strong> is a luxury Dynamic Island & Top Notch productivity HUD for Windows. It provides ad-free YouTube Music background radio, instant timer alerts, quick file shelf, system resource monitors (CPU, RAM, Battery, Volume), and a persistent clipboard history.</p>
        <div class="tanglish-box">
          <strong>Machan Note:</strong> Inoru puthu laptop or PC ku Notch Dude-ah kondu poga <strong>project folder, node_modules, or Node.js ethuvume theva illa!</strong> Ore oru standalone installer file mattum share panni 10 seconds-la install pannikalam.
        </div>
      </div>

      <!-- STEP 1: GET THE SETUP FILE -->
      <div class="card">
        <div class="card-header">
          <span class="step-num">1</span>
          <span class="card-title">Step 1: Get & Transfer the Setup File (.exe)</span>
          <span class="card-subtitle">File Size: ~126 MB</span>
        </div>
        <p>Un current system-la build aana official installer file location:</p>
        <p><span class="code-badge">release/Notch Dude Setup 1.0.0.exe</span></p>

        <p style="margin-top:8px;">Indha single file-ah inoru system ku transfer panna <strong>4 best methods</strong>:</p>
        
        <div class="grid-2">
          <div class="method-card">
            <div class="method-header">
              <span>💾</span> Method A: USB Pen Drive (Fastest)
            </div>
            <div class="method-desc">
              Pendrive-la <span class="code-badge">Notch Dude Setup 1.0.0.exe</span>-ah copy panni inoru laptop-la paste pannidalam. No internet needed.
            </div>
          </div>

          <div class="method-card">
            <div class="method-header">
              <span>☁️</span> Method B: Google Drive / OneDrive
            </div>
            <div class="method-desc">
              Google Drive-la upload panni, shareable link create panni inoru system browser-la download pannikalam.
            </div>
          </div>

          <div class="method-card">
            <div class="method-header">
              <span>💬</span> Method C: WhatsApp / Telegram
            </div>
            <div class="method-desc">
              WhatsApp Web or Telegram-la "Document" option select panni .exe file-ah direct-ah send pannalam.
            </div>
          </div>

          <div class="method-card">
            <div class="method-header">
              <span>🌐</span> Method D: Local Network Share
            </div>
            <div class="method-desc">
              Rendu PC-yum ore Wi-Fi-la irundha Windows Shared Folder or Nearby Share moolama direct-ah send pannalam.
            </div>
          </div>
        </div>

        <div class="info-box">
          <strong>Remember:</strong> Only transfer the <strong>Notch Dude Setup 1.0.0.exe</strong> file. Do not copy the source code or git folders.
        </div>
      </div>

      <!-- STEP 2: RUNNING INSTALLER -->
      <div class="card">
        <div class="card-header">
          <span class="step-num">2</span>
          <span class="card-title">Step 2: Double-Click the Setup File</span>
        </div>
        <p>Inoru system-la file transfer aagi mudinjadhukku approm:</p>
        <ol style="margin-left: 20px; font-size: 9.5pt; color: #cbd5e1;">
          <li style="margin-bottom: 4px;">Target PC-la <span class="code-badge">Notch Dude Setup 1.0.0.exe</span>-ah double click pannunga.</li>
          <li>Windows Installer launch aagum. Modhal thadava run aagum bothu Windows SmartScreen Blue Screen varum (Next page-la irukra step-ah follow pannunga).</li>
        </ol>
      </div>
    </div>

    <footer class="doc-footer">
      <span>Notch Dude Setup Guide &bull; Page 1 of 3</span>
      <span>Confidential & Open Source Indie Build</span>
    </footer>
  </div>


  <!-- ==================== PAGE 2 ==================== -->
  <div class="page">
    <div>
      <!-- STEP 3: WINDOWS SMARTSCREEN -->
      <div class="card">
        <div class="card-header">
          <span class="step-num">3</span>
          <span class="card-title">Step 3: Windows Defender SmartScreen Bypass</span>
          <span class="card-subtitle">Normal Security Check</span>
        </div>
        
        <p>Commercial apps (Microsoft, Google) yearly \$400 code-signing certificate vachurpaanga. Namma indie open-source app create pannirukom, adhunaala Windows blue warning screen kaatum. <strong>Idhu virus kedayadhu, completely safe!</strong></p>

        <!-- PIXEL-PERFECT SMARTSCREEN MOCKUP -->
        <div class="smartscreen-dialog">
          <div class="ss-header">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            Windows protected your PC
          </div>
          <div class="ss-body">
            Microsoft Defender SmartScreen prevented an unrecognized app from starting. Running this app might put your PC at risk.
          </div>
          <div class="ss-meta">
            <div class="ss-meta-row">
              <span class="ss-meta-label">App:</span>
              <span class="ss-meta-val">Notch Dude Setup 1.0.0.exe</span>
            </div>
            <div class="ss-meta-row">
              <span class="ss-meta-label">Publisher:</span>
              <span class="ss-meta-val">Unknown Publisher</span>
            </div>
          </div>
          <div class="ss-actions">
            <div style="margin-right:auto;">
              <span class="action-arrow">STEP 1</span>
              <span class="ss-link">More info</span>
            </div>
            <span class="action-arrow">STEP 2</span>
            <button class="ss-btn-primary">Run anyway</button>
            <button class="ss-btn">Don't run</button>
          </div>
        </div>

        <div class="tanglish-box">
          <strong>Machan Follow This Exactly:</strong>
          <br>1. First Blue screen-la irukra <strong style="text-decoration:underline;">"More info"</strong> text-ah click pannu.
          <br>2. Udaney keela <strong style="color:#38bdf8;">"Run anyway"</strong> nu pudhu button thonrum. Adha click pannina installer smooth-ah start aagidum!
        </div>
      </div>

      <!-- STEP 4: NSIS INSTALLATION WIZARD -->
      <div class="card">
        <div class="card-header">
          <span class="step-num">4</span>
          <span class="card-title">Step 4: Installation Wizard & Automatic Setup</span>
          <span class="card-subtitle">Takes ~10 Seconds</span>
        </div>
        <p>SmartScreen pass aana udaney official setup wizard open aagum:</p>
        
        <div class="grid-2">
          <div class="method-card">
            <div class="method-header">
              <span>📂</span> Standard Installation
            </div>
            <div class="method-desc">
              Default install path-laye <span class="code-badge">Next</span> &amp; <span class="code-badge">Install</span> click pannunga. 100% automated installation.
            </div>
          </div>
          <div class="method-card">
            <div class="method-header">
              <span>🚀</span> Desktop &amp; Start Menu
            </div>
            <div class="method-desc">
              Installation mudinjadhum automatic-ah Desktop-la <strong>"Notch Dude"</strong> shortcut-um, Windows Start Menu-la entry-yum create aagidum.
            </div>
          </div>
        </div>

        <p style="margin-top:6px;">Finish screen-la <strong>"Run Notch Dude"</strong> checkbox tick panni <strong>Finish</strong> click pannunga. App udaney unga screen-la appear aagum!</p>
      </div>

      <!-- STEP 5: FIRST LAUNCH -->
      <div class="card">
        <div class="card-header">
          <span class="step-num">5</span>
          <span class="card-title">Step 5: First Launch & Screen Position</span>
        </div>
        <p>App start aagum bothu unga monitor-oda <strong>Top-Center</strong>-la oru sleek curved Dynamic Island appear aagum.</p>
        <div class="info-box">
          <strong>Global Keyboard Shortcut:</strong> Ungalukku eppo thevai patalum <span class="code-badge">Ctrl + Shift + Space</span> press pannina Notch Dude instant-ah expand / collapse aagum!
        </div>
      </div>
    </div>

    <footer class="doc-footer">
      <span>Notch Dude Setup Guide &bull; Page 2 of 3</span>
      <span>Confidential & Open Source Indie Build</span>
    </footer>
  </div>


  <!-- ==================== PAGE 3 ==================== -->
  <div class="page">
    <div>
      <!-- STEP 6: CONTROLS & QUIT BUTTON -->
      <div class="card">
        <div class="card-header">
          <span class="step-num">6</span>
          <span class="card-title">Header Action Controls & The Brand New Quit Button</span>
        </div>
        <p>Notch Dude header-oda top-right corner-la 4 premium frosted controls irukku:</p>

        <div class="control-grid">
          <div class="control-item">
            <div class="control-icon">📌</div>
            <div class="control-name">Pin / Lock</div>
            <div class="control-desc">Mouse veliya poonalum notch close aagama open-laye vekkum.</div>
          </div>

          <div class="control-item">
            <div class="control-icon">▢</div>
            <div class="control-name">Style Mode</div>
            <div class="control-desc">Top Bezel Notch &amp; Floating Island style mathikalam.</div>
          </div>

          <div class="control-item">
            <div class="control-icon">^</div>
            <div class="control-name">Collapse</div>
            <div class="control-desc">Notch-ah sleek mini dynamic island pill-ah kurukkum.</div>
          </div>

          <div class="control-item quit">
            <div class="control-icon" style="color:#ff453a;">✕</div>
            <div class="control-name">Quit App</div>
            <div class="control-desc">Red hover glow button. Click panna app clean-ah full-ah quit aagidum.</div>
          </div>
        </div>

        <div class="tanglish-box">
          <strong>Quit &amp; Restart Workflow:</strong>
          <br>&bull; <strong>Quit Panna:</strong> Top-right la irukra <strong>✕ (Red X)</strong> button click panna app udaney shut down aayidum.
          <br>&bull; <strong>Thirumba Open Panna:</strong> Desktop icon or Start menu-la irundhu <strong>"Notch Dude"</strong> double-click pannina fresh-ah restart aagi work aagum!
        </div>
      </div>

      <!-- FEATURES PREVIEW -->
      <div class="card">
        <div class="card-header">
          <span class="step-num">7</span>
          <span class="card-title">Built-In Superpowers Breakdown</span>
        </div>
        
        <div class="grid-2">
          <div class="method-card">
            <div class="method-header"><span>🎵</span> YouTube Music Radio</div>
            <div class="method-desc">Search songs, trending Tamil/English playlists, live radio stations, zero ads with background playback.</div>
          </div>
          <div class="method-card">
            <div class="method-header"><span>🔔</span> Quick Alerts &amp; Timers</div>
            <div class="method-desc">Set 5m/15m/custom reminders. Sound and dynamic visual island pulses when time is up.</div>
          </div>
          <div class="method-card">
            <div class="method-header"><span>📁</span> Quick File Shelf</div>
            <div class="method-desc">Drag and drop images/docs to stash them temporarily. One-click open or copy path.</div>
          </div>
          <div class="method-card">
            <div class="method-header"><span>💻</span> System HUD &amp; Clipboard</div>
            <div class="method-desc">Live CPU %, RAM %, Battery &amp; Volume controls + persistent clipboard snippet history.</div>
          </div>
        </div>

        ${p1Base64 ? `
        <div class="screenshot-container">
          <img src="data:image/png;base64,${p1Base64}" class="screenshot-img" alt="Notch Dude Live Preview">
          <div class="screenshot-caption">Notch Dude Active Interface &bull; Real System Screenshot</div>
        </div>
        ` : ''}
      </div>

      <!-- TROUBLESHOOTING / FAQ -->
      <div class="card">
        <div class="card-header">
          <span class="step-num">?</span>
          <span class="card-title">Troubleshooting &amp; FAQs</span>
        </div>
        <p style="font-size:8.8pt; line-height: 1.4; color: #cbd5e1;">
          <strong>Q: Target PC-la internet illana install aaguma?</strong><br>
          A: Yes! Installer is 100% offline. Installation-ku internet theva illa. (YouTube Music stream panna mattum internet thevai).<br>
          <strong>Q: Windows Boot aagum bothu automatic-ah start aaganuma?</strong><br>
          A: Press <span class="code-badge">Win + R</span> &rarr; type <span class="code-badge">shell:startup</span> &rarr; copy &amp; paste the Desktop "Notch Dude" shortcut there!
        </p>
      </div>
    </div>

    <footer class="doc-footer">
      <span>Notch Dude Setup Guide &bull; Page 3 of 3</span>
      <span>Build: Release 1.0.0 &bull; Verified on Windows 10/11</span>
    </footer>
  </div>

</body>
</html>`;

    const htmlPath = path.join(__dirname, '../docs/Notch_Dude_Installation_Guide.html');
    fs.writeFileSync(htmlPath, htmlContent, 'utf8');
    console.log('HTML guide written to:', htmlPath);

    // Launch offscreen Electron window to generate PDF
    const win = new BrowserWindow({
      show: false,
      width: 1200,
      height: 1600,
      webPreferences: {
        offscreen: true
      }
    });

    await win.loadFile(htmlPath);
    // Allow fonts and images to load
    await new Promise(r => setTimeout(r, 1200));

    const pdfData = await win.webContents.printToPDF({
      pageSize: 'A4',
      printBackground: true,
      margins: {
        marginType: 'custom',
        top: 0.35,
        bottom: 0.35,
        left: 0.35,
        right: 0.35
      }
    });

    const pdfDocsPath = path.join(__dirname, '../docs/Notch_Dude_Installation_Guide.pdf');
    const pdfReleasePath = path.join(__dirname, '../release/Notch_Dude_Installation_Guide.pdf');

    fs.writeFileSync(pdfDocsPath, pdfData);
    fs.writeFileSync(pdfReleasePath, pdfData);

    console.log('PDF guide written to docs:', pdfDocsPath, 'Size:', pdfData.length);
    console.log('PDF guide written to release:', pdfReleasePath, 'Size:', pdfData.length);

    app.quit();
  } catch (err) {
    console.error('Error creating PDF:', err);
    app.quit();
    process.exit(1);
  }
});
