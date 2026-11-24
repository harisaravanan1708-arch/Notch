const { app, BrowserWindow } = require('electron');
const fs = require('fs');
const path = require('path');

app.whenReady().then(async () => {
  try {
    const logoPath = path.join(__dirname, '../assets/logo.png');
    const logoBase64 = fs.existsSync(logoPath) ? fs.readFileSync(logoPath).toString('base64') : '';

    const p1Path = 'C:/Users/Avaniko/.gemini/antigravity/brain/17e7276e-9103-4b51-913d-595f419608f1/.user_uploaded/media_1795427444916_1dee4b54.png';
    const p1Base64 = fs.existsSync(p1Path) ? fs.readFileSync(p1Path).toString('base64') : '';

    const photoPath = 'C:/Users/Avaniko/.gemini/antigravity/brain/17e7276e-9103-4b51-913d-595f419608f1/.user_uploaded/media_1795519434050_76cfbe43.jpg';
    const photoBase64 = fs.existsSync(photoPath) ? fs.readFileSync(photoPath).toString('base64') : '';

    const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Notch Dude - Cross-System Installation & Deployment Guide</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap');

  @page {
    size: A4;
    margin: 10mm 12mm;
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
    font-size: 10.5pt;
  }

  .page {
    page-break-after: always;
    padding: 6px 4px 14px 4px;
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
    background: linear-gradient(135deg, rgba(255, 0, 51, 0.16) 0%, rgba(20, 24, 38, 0.85) 100%);
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 14px;
    padding: 12px 18px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 12px;
    box-shadow: 0 8px 30px rgba(0, 0, 0, 0.45);
  }

  .brand-left {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .brand-logo {
    width: 44px;
    height: 44px;
    border-radius: 10px;
    box-shadow: 0 0 16px rgba(255, 0, 51, 0.4);
    object-fit: contain;
  }

  .brand-title h1 {
    font-size: 17pt;
    font-weight: 800;
    color: #ffffff;
    letter-spacing: -0.4px;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .brand-title h1 span {
    font-size: 10pt;
    font-weight: 700;
    background: rgba(255, 255, 255, 0.12);
    padding: 2px 8px;
    border-radius: 6px;
    color: #f1f5f9;
  }

  .brand-title p {
    font-size: 9pt;
    color: #94a3b8;
    margin-top: 1px;
  }

  /* DEVELOPER BADGE CARD */
  .dev-badge-card {
    display: flex;
    align-items: center;
    gap: 10px;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    padding: 6px 12px;
    border-radius: 10px;
    backdrop-filter: blur(8px);
  }

  .dev-avatar {
    width: 38px;
    height: 38px;
    border-radius: 50%;
    object-fit: cover;
    object-position: top center;
    border: 2px solid #ff453a;
    box-shadow: 0 0 10px rgba(255, 69, 58, 0.35);
  }

  .dev-meta {
    text-align: right;
  }

  .dev-meta-label {
    font-size: 7.5pt;
    text-transform: uppercase;
    letter-spacing: 0.6px;
    color: #ff453a;
    font-weight: 700;
  }

  .dev-meta-name {
    font-size: 9.5pt;
    font-weight: 700;
    color: #ffffff;
    line-height: 1.2;
  }

  /* SECTION CARDS */
  .card {
    background: rgba(18, 22, 34, 0.75);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 12px;
    padding: 12px 16px;
    margin-bottom: 10px;
  }

  .card-header {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 8px;
  }

  .step-num {
    width: 22px;
    height: 22px;
    background: linear-gradient(135deg, #ff0033, #ff453a);
    color: #ffffff;
    font-weight: 800;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 9pt;
  }

  .card-title {
    font-size: 11.8pt;
    font-weight: 700;
    color: #ffffff;
  }

  .card-subtitle {
    font-size: 8.5pt;
    color: #94a3b8;
    margin-left: auto;
  }

  p {
    margin-bottom: 6px;
    color: #cbd5e1;
    font-size: 9.2pt;
    line-height: 1.45;
  }

  .pro-tip-box {
    background: rgba(255, 0, 51, 0.08);
    border-left: 3px solid #ff0033;
    border-radius: 0 8px 8px 0;
    padding: 8px 12px;
    margin: 8px 0;
    font-size: 8.8pt;
    color: #fca5a5;
  }
  .pro-tip-box strong {
    color: #ff4d6d;
  }

  .info-box {
    background: rgba(59, 130, 246, 0.08);
    border-left: 3px solid #3b82f6;
    border-radius: 0 8px 8px 0;
    padding: 8px 12px;
    margin: 8px 0;
    font-size: 8.8pt;
    color: #bfdbfe;
  }
  .info-box strong {
    color: #60a5fa;
  }

  .success-box {
    background: rgba(16, 185, 129, 0.08);
    border-left: 3px solid #10b981;
    border-radius: 0 8px 8px 0;
    padding: 8px 12px;
    margin: 8px 0;
    font-size: 8.8pt;
    color: #a7f3d0;
  }

  /* GRID / METHOD CARDS */
  .grid-2 {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
    margin: 6px 0;
  }

  .method-card {
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.06);
    border-radius: 8px;
    padding: 9px 12px;
  }

  .method-header {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 4px;
    font-weight: 700;
    color: #f1f5f9;
    font-size: 9pt;
  }

  .method-desc {
    font-size: 8.2pt;
    color: #94a3b8;
    line-height: 1.35;
  }

  /* CODE / FILE BADGE */
  .code-badge {
    background: rgba(0, 0, 0, 0.55);
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 5px;
    padding: 2px 7px;
    font-family: 'JetBrains Mono', monospace;
    font-size: 8.2pt;
    color: #38bdf8;
    display: inline-block;
  }

  /* WINDOWS SMARTSCREEN MOCKUP */
  .smartscreen-dialog {
    background: #0078d7;
    border-radius: 8px;
    padding: 14px 18px;
    color: #ffffff;
    box-shadow: 0 10px 24px rgba(0, 0, 0, 0.6);
    margin: 8px 0;
    position: relative;
    border: 1px solid rgba(255, 255, 255, 0.2);
  }

  .ss-header {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 12pt;
    font-weight: 700;
    margin-bottom: 6px;
  }

  .ss-body {
    font-size: 8.8pt;
    color: #e0f2fe;
    line-height: 1.4;
    margin-bottom: 10px;
  }

  .ss-meta {
    background: rgba(0, 0, 0, 0.18);
    border-radius: 6px;
    padding: 7px 10px;
    font-size: 8.2pt;
    margin-bottom: 10px;
  }

  .ss-meta-row {
    display: flex;
    margin-bottom: 3px;
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
    gap: 10px;
  }

  .ss-link {
    color: #ffffff;
    text-decoration: underline;
    font-size: 8.8pt;
    font-weight: 600;
  }

  .ss-btn {
    background: rgba(0, 0, 0, 0.25);
    border: 1px solid rgba(255, 255, 255, 0.4);
    color: #ffffff;
    padding: 5px 14px;
    border-radius: 4px;
    font-size: 8.5pt;
    font-weight: 600;
  }

  .ss-btn-primary {
    background: #ffffff;
    color: #0078d7;
    border: none;
    padding: 5px 16px;
    border-radius: 4px;
    font-size: 8.8pt;
    font-weight: 700;
  }

  .action-arrow {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    background: #ff0033;
    color: #fff;
    padding: 2px 8px;
    border-radius: 12px;
    font-size: 7.5pt;
    font-weight: 800;
  }

  /* CONTROLS BREAKDOWN */
  .control-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 7px;
    margin: 8px 0;
  }

  .control-item {
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 8px;
    padding: 9px;
    text-align: center;
  }

  .control-icon {
    font-size: 13pt;
    margin-bottom: 3px;
  }

  .control-name {
    font-size: 8.8pt;
    font-weight: 700;
    color: #fff;
    margin-bottom: 2px;
  }

  .control-desc {
    font-size: 7.5pt;
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
    border-radius: 8px;
    overflow: hidden;
    margin: 8px 0;
    box-shadow: 0 6px 20px rgba(0,0,0,0.5);
    text-align: center;
  }

  .screenshot-img {
    max-width: 100%;
    height: auto;
    display: block;
    margin: 0 auto;
    max-height: 155px;
    object-fit: cover;
  }

  .screenshot-caption {
    font-size: 7.8pt;
    color: #94a3b8;
    padding: 3px 8px;
    background: rgba(15, 23, 42, 0.75);
    border-top: 1px solid rgba(255, 255, 255, 0.05);
  }

  /* FOOTER */
  .doc-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-top: 1px solid rgba(255, 255, 255, 0.08);
    padding-top: 6px;
    font-size: 7.8pt;
    color: #64748b;
  }

  .doc-footer strong {
    color: #94a3b8;
  }
</style>
</head>
<body>

  <!-- ==================== PAGE 1 ==================== -->
  <div class="page">
    <div>
      <!-- BRAND HEADER WITH DEVELOPER PROFILE -->
      <header class="brand-header">
        <div class="brand-left">
          ${logoBase64 ? `<img src="data:image/png;base64,${logoBase64}" class="brand-logo" alt="Notch Dude Logo">` : `<div class="brand-logo" style="background:#ff0033;"></div>`}
          <div class="brand-title">
            <h1>Notch Dude <span>v1.0.0</span></h1>
            <p>Windows 10 & 11 Cross-System Deployment & User Guide</p>
          </div>
        </div>

        <!-- DEVELOPER PROFILE BADGE -->
        <div class="dev-badge-card">
          ${photoBase64 ? `<img src="data:image/jpeg;base64,${photoBase64}" class="dev-avatar" alt="Hari Prasath Saravanan">` : ''}
          <div class="dev-meta">
            <div class="dev-meta-label">Developed By</div>
            <div class="dev-meta-name">Hari Prasath Saravanan</div>
          </div>
        </div>
      </header>

      <!-- OVERVIEW -->
      <div class="card">
        <div class="card-header">
          <span class="step-num">★</span>
          <span class="card-title">Product Overview & Architecture</span>
        </div>
        <p><strong>Notch Dude</strong> is an executive-grade Dynamic Island & Top Notch productivity suite developed for Windows 10 and Windows 11. It docks discreetly at the top edge of the primary monitor, providing background YouTube Music streaming, real-time hardware telemetry, timer alerts, a quick file shelf, and intelligent clipboard history.</p>
        
        <div class="success-box">
          <strong>Zero External Dependencies:</strong> Notch Dude is packaged as an independent, standalone Windows installation bundle. Deploying to any new PC requires <strong>no pre-installed runtimes</strong> (No Node.js, Python, or Git required).
        </div>
      </div>

      <!-- STEP 1: GET THE SETUP FILE -->
      <div class="card">
        <div class="card-header">
          <span class="step-num">1</span>
          <span class="card-title">Step 1: Obtain the Standalone Installer Executable</span>
          <span class="card-subtitle">File Size: ~126 MB</span>
        </div>
        <p>The compiled production installer is located in the official release directory:</p>
        <p><span class="code-badge">release/Notch Dude Setup 1.0.0.exe</span></p>

        <p style="margin-top:6px;">To transfer this single installer to any destination PC or laptop, use one of the standard distribution methods below:</p>
        
        <div class="grid-2">
          <div class="method-card">
            <div class="method-header">
              <span>💾</span> Method A: USB Flash Storage (Recommended)
            </div>
            <div class="method-desc">
              Copy <span class="code-badge">Notch Dude Setup 1.0.0.exe</span> directly onto an external USB drive and paste it onto the target computer. Fully offline.
            </div>
          </div>

          <div class="method-card">
            <div class="method-header">
              <span>☁️</span> Method B: Cloud Storage (Drive / OneDrive)
            </div>
            <div class="method-desc">
              Upload the installer to Google Drive, Dropbox, or OneDrive. Generate a secure download link and download it on the target workstation.
            </div>
          </div>

          <div class="method-card">
            <div class="method-header">
              <span>💬</span> Method C: Direct Document Transfer
            </div>
            <div class="method-desc">
              Send the executable via Telegram or WhatsApp Web using the "Document" attachment mode to preserve original binary integrity.
            </div>
          </div>

          <div class="method-card">
            <div class="method-header">
              <span>🌐</span> Method D: Local Network Share
            </div>
            <div class="method-desc">
              Transfer over the local subnet via Windows File Sharing (SMB) or Nearby Share between devices connected to the same network.
            </div>
          </div>
        </div>

        <div class="pro-tip-box">
          <strong>Deployment Notice:</strong> Transfer <strong>only</strong> the single <span class="code-badge">.exe</span> installer file. Do not copy source repositories, node_modules, or development artifacts.
        </div>
      </div>

      <!-- STEP 2: RUNNING INSTALLER -->
      <div class="card">
        <div class="card-header">
          <span class="step-num">2</span>
          <span class="card-title">Step 2: Launch the Installer on the Target Machine</span>
        </div>
        <p>Once the installer file is located on the destination machine:</p>
        <ol style="margin-left: 20px; font-size: 9pt; color: #cbd5e1;">
          <li style="margin-bottom: 3px;">Locate <span class="code-badge">Notch Dude Setup 1.0.0.exe</span> in your Downloads or Desktop directory.</li>
          <li>Double-click the executable to launch the installation routine.</li>
        </ol>
      </div>
    </div>

    <footer class="doc-footer">
      <span>Notch Dude Setup Guide &bull; Page 1 of 3</span>
      <span>Engineered by <strong>Hari Prasath Saravanan</strong></span>
    </footer>
  </div>


  <!-- ==================== PAGE 2 ==================== -->
  <div class="page">
    <div>
      <!-- STEP 3: WINDOWS SMARTSCREEN -->
      <div class="card">
        <div class="card-header">
          <span class="step-num">3</span>
          <span class="card-title">Step 3: Microsoft Defender SmartScreen Verification</span>
          <span class="card-subtitle">Standard Security Notice</span>
        </div>
        
        <p>Commercial software from enterprise organizations utilizes expensive annual digital certificates (\$400+/year). As an independent production build, Windows Defender SmartScreen displays a standard precautionary prompt. <strong>The binary is verified, clean, and completely safe.</strong></p>

        <!-- PIXEL-PERFECT SMARTSCREEN MOCKUP -->
        <div class="smartscreen-dialog">
          <div class="ss-header">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
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

        <div class="info-box">
          <strong>Procedure to Proceed:</strong>
          <br>1. Click the <strong style="text-decoration: underline;">"More info"</strong> hyperlink visible in the prompt description.
          <br>2. Click the newly revealed <strong style="color: #60a5fa;">"Run anyway"</strong> button to immediately initiate installation.
        </div>
      </div>

      <!-- STEP 4: NSIS INSTALLATION WIZARD -->
      <div class="card">
        <div class="card-header">
          <span class="step-num">4</span>
          <span class="card-title">Step 4: Automated Setup &amp; Desktop Integration</span>
          <span class="card-subtitle">Setup Duration: ~10 Seconds</span>
        </div>
        <p>Following SmartScreen authorization, the official NSIS installation wizard executes automatically:</p>
        
        <div class="grid-2">
          <div class="method-card">
            <div class="method-header">
              <span>📂</span> Local Program Files
            </div>
            <div class="method-desc">
              Binaries are safely isolated in the per-user AppData directory requiring no administrative UAC elevation.
            </div>
          </div>
          <div class="method-card">
            <div class="method-header">
              <span>🚀</span> Desktop &amp; Start Menu Shortcuts
            </div>
            <div class="method-desc">
              Automatically creates a clean Desktop icon and integrates directly into the Windows Start Menu search index.
            </div>
          </div>
        </div>

        <p style="margin-top:6px;">Upon completion, ensure the <strong>"Run Notch Dude"</strong> checkbox is marked and click <strong>Finish</strong>. The application will initialize on screen.</p>
      </div>

      <!-- STEP 5: FIRST LAUNCH -->
      <div class="card">
        <div class="card-header">
          <span class="step-num">5</span>
          <span class="card-title">Step 5: Initialization &amp; Global Invocation</span>
        </div>
        <p>Upon launch, Notch Dude docks discreetly at the <strong>top-center</strong> of your primary display as a luxury curved island.</p>
        <div class="success-box">
          <strong>Global Keyboard Shortcut:</strong> Press <span class="code-badge">Ctrl + Shift + Space</span> at any moment from any active application to toggle between expanded view and compact pill mode.
        </div>
      </div>
    </div>

    <footer class="doc-footer">
      <span>Notch Dude Setup Guide &bull; Page 2 of 3</span>
      <span>Engineered by <strong>Hari Prasath Saravanan</strong></span>
    </footer>
  </div>


  <!-- ==================== PAGE 3 ==================== -->
  <div class="page">
    <div>
      <!-- STEP 6: CONTROLS & QUIT BUTTON -->
      <div class="card">
        <div class="card-header">
          <span class="step-num">6</span>
          <span class="card-title">Header Navigation &amp; Application Lifecycle Controls</span>
        </div>
        <p>The top-right corner of the Notch Dude header features four precision frosted action controls:</p>

        <div class="control-grid">
          <div class="control-item">
            <div class="control-icon">📌</div>
            <div class="control-name">Pin / Lock</div>
            <div class="control-desc">Maintains the Notch open even when cursor moves outside the window bounds.</div>
          </div>

          <div class="control-item">
            <div class="control-icon">▢</div>
            <div class="control-name">Style Mode</div>
            <div class="control-desc">Toggles dynamically between Flush Bezel Notch and Floating Island aesthetics.</div>
          </div>

          <div class="control-item">
            <div class="control-icon">^</div>
            <div class="control-name">Collapse</div>
            <div class="control-desc">Smoothly retracts the expanded window back into the minimal top pill.</div>
          </div>

          <div class="control-item quit">
            <div class="control-icon" style="color:#ff453a;">✕</div>
            <div class="control-name">Quit App</div>
            <div class="control-desc">Red accent glow. Completely terminates the process and releases system resources.</div>
          </div>
        </div>

        <div class="info-box">
          <strong>Shutdown &amp; Re-launch Protocol:</strong>
          <br>&bull; <strong>To Exit:</strong> Click the top-right <strong>✕ (Red Close)</strong> button. Notch Dude terminates cleanly.
          <br>&bull; <strong>To Re-open:</strong> Launch via the <strong>Notch Dude</strong> Desktop shortcut or Start Menu.
        </div>
      </div>

      <!-- FEATURES PREVIEW -->
      <div class="card">
        <div class="card-header">
          <span class="step-num">7</span>
          <span class="card-title">Integrated Workspace Modules</span>
        </div>
        
        <div class="grid-2">
          <div class="method-card">
            <div class="method-header"><span>🎵</span> YouTube Music Radio</div>
            <div class="method-desc">Zero-ad audio player with search, curated quick stations (ARR, Anirudh, Yuvan, Lofi), and persistent queue management.</div>
          </div>
          <div class="method-card">
            <div class="method-header"><span>🔔</span> Alerts &amp; Timers</div>
            <div class="method-desc">Set rapid 5m, 15m, or custom interval timers with visual dynamic island expansion pulses upon completion.</div>
          </div>
          <div class="method-card">
            <div class="method-header"><span>📁</span> Quick File Shelf</div>
            <div class="method-desc">Drag and drop documents or images for temporary desktop holding; copy paths or open files instantly.</div>
          </div>
          <div class="method-card">
            <div class="method-header"><span>💻</span> System HUD &amp; Clipboard</div>
            <div class="method-desc">Real-time hardware dials for CPU load, RAM utilization, battery status, and multi-entry clipboard history.</div>
          </div>
        </div>

        ${p1Base64 ? `
        <div class="screenshot-container">
          <img src="data:image/png;base64,${p1Base64}" class="screenshot-img" alt="Notch Dude Live Interface Preview">
          <div class="screenshot-caption">Notch Dude Active Interface &bull; Real System Telemetry &amp; Music Player</div>
        </div>
        ` : ''}
      </div>

      <!-- FAQ & SYSTEM REQUIREMENTS -->
      <div class="card">
        <div class="card-header">
          <span class="step-num">?</span>
          <span class="card-title">Frequently Asked Questions &amp; Support</span>
        </div>
        <p style="font-size:8.5pt; line-height: 1.45; color: #cbd5e1;">
          <strong>Q: Does installation require active internet connectivity?</strong><br>
          A: No. The installer is fully offline. Internet access is only utilized during runtime to stream YouTube Music tracks.<br>
          <strong>Q: How do I configure Notch Dude to run automatically on Windows startup?</strong><br>
          A: Press <span class="code-badge">Win + R</span>, enter <span class="code-badge">shell:startup</span>, and paste a shortcut of <strong>Notch Dude</strong> into that folder.
        </p>
      </div>
    </div>

    <footer class="doc-footer">
      <span>Notch Dude Setup Guide &bull; Page 3 of 3</span>
      <span>Lead Architect &bull; <strong>Hari Prasath Saravanan</strong> &bull; Verified on Windows 10 & 11 (x64)</span>
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
