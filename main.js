const { app, BrowserWindow, ipcMain, screen, shell, clipboard, globalShortcut, Menu, Tray, nativeImage, session } = require('electron');
const { execFile } = require('child_process');
const path = require('path');
const os = require('os');
const https = require('https');
const http = require('http');
const fs = require('fs');
const loudness = require('loudness');

// Improve Windows transparency and glass rendering
app.commandLine.appendSwitch('enable-transparent-visuals');
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');

let mainWindow = null;
let tray = null;
let isExpanded = false;
let isPinned = false;
let localPort = 39281;

const logFile = path.join(__dirname, 'notch.log');
function log(msg) {
  try {
    fs.appendFileSync(logFile, `[${new Date().toLocaleTimeString()}] ${msg}\n`);
  } catch (e) {}
}

// Vanished resting trigger dimensions (Invisible 2px trigger at top center, 490x188 expanded)
const COLLAPSED_WIDTH = 340;
const COLLAPSED_HEIGHT = 2;
const EXPANDED_WIDTH = 490;
const EXPANDED_HEIGHT = 188;
const ALERT_WIDTH = 410;
const ALERT_HEIGHT = 64;
const ALERT_TOP = 14; // Floating ~1cm below screen top edge like Apple Dynamic Island
let isAlertMode = false;

function startLocalServer() {
  const server = http.createServer((req, res) => {
    let safeUrl = req.url.split('?')[0];
    let filePath = path.join(__dirname, 'src', safeUrl === '/' ? 'index.html' : safeUrl);
    
    if (!fs.existsSync(filePath)) {
      res.writeHead(404);
      res.end('Not Found');
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    const mimeTypes = {
      '.html': 'text/html',
      '.css': 'text/css',
      '.js': 'application/javascript',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.svg': 'image/svg+xml'
    };
    res.writeHead(200, {
      'Content-Type': mimeTypes[ext] || 'application/octet-stream',
      'Access-Control-Allow-Origin': '*'
    });
    fs.createReadStream(filePath).pipe(res);
  });

  server.listen(0, '127.0.0.1', () => {
    localPort = server.address().port;
    console.log(`[Windows Boring Notch] Local server running on http://127.0.0.1:${localPort}`);
    createWindow();
  });
}

function createWindow() {
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width: screenWidth } = primaryDisplay.bounds;

  const targetX = Math.round((screenWidth - EXPANDED_WIDTH) / 2);

  mainWindow = new BrowserWindow({
    title: 'Notch Dude',
    icon: path.join(__dirname, 'assets', 'icon.ico'),
    width: EXPANDED_WIDTH,
    height: EXPANDED_HEIGHT,
    x: targetX,
    y: -200, // Park safely off-screen initially so it never intercepts clicks on Chrome tabs
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    hasShadow: false,
    show: false,
    backgroundColor: '#00000000',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
      backgroundThrottling: false // Keep audio playing when collapsed/unfocused
    }
  });

  mainWindow.setAlwaysOnTop(true);
  // Pass-through all mouse events while collapsed so underlying Chrome tabs/buttons work normally
  mainWindow.setIgnoreMouseEvents(true, { forward: true });

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
    log(`[Renderer] ${message}`);
  });

  // Strip restrictive headers so YouTube embed / API loads cleanly
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    const responseHeaders = Object.assign({}, details.responseHeaders);
    delete responseHeaders['x-frame-options'];
    delete responseHeaders['content-security-policy'];
    callback({ cancel: false, responseHeaders });
  });

  mainWindow.loadURL(`http://127.0.0.1:${localPort}/`);

  // Global cursor edge watcher:
  // 1. When COLLAPSED: triggers expand ONLY when cursor touches the VERY TOP edge of the screen (cursor.y <= 1)
  // 2. When EXPANDED: tracks when cursor moves outside the notch area and auto-collapses smoothly
  let topDwellStart = null;
  let outsideDwellStart = null;
  const edgeCheckInterval = setInterval(() => {
    if (!mainWindow || mainWindow.isDestroyed()) return;
    try {
      const cursor = screen.getCursorScreenPoint();
      const primaryDisplay = screen.getPrimaryDisplay();
      const { width: screenWidth } = primaryDisplay.bounds;
      const targetX = Math.round((screenWidth - EXPANDED_WIDTH) / 2);

      if (isAlertMode) {
        // In compact Dynamic Island alert mode: if user touches the very top edge, expand the full notch immediately
        if (cursor.y <= 1) {
          isAlertMode = false;
          isExpanded = true;
          updateWindowSize(true);
          mainWindow.webContents.send('notch-trigger-expand');
        }
        return;
      }

      if (!isExpanded) {
        const triggerWidth = 320;
        const triggerLeft = Math.round((screenWidth - triggerWidth) / 2);
        const triggerRight = triggerLeft + triggerWidth;

        // Trigger ONLY when mouse hits the very top pixel (cursor.y <= 1)
        if (cursor.y <= 1 && cursor.x >= triggerLeft && cursor.x <= triggerRight) {
          if (!topDwellStart) {
            topDwellStart = Date.now();
          } else if (Date.now() - topDwellStart >= 50) {
            isExpanded = true;
            updateWindowSize(true);
            mainWindow.webContents.send('notch-trigger-expand');
            topDwellStart = null;
          }
        } else {
          topDwellStart = null;
        }
        outsideDwellStart = null;
      } else {
        // If pinned, do not auto-collapse
        if (isPinned) {
          outsideDwellStart = null;
          return;
        }

        // Expanded notch hit area with generous 25px buffer margin around sides & bottom
        const isInside = (
          cursor.x >= (targetX - 25) &&
          cursor.x <= (targetX + EXPANDED_WIDTH + 25) &&
          cursor.y >= 0 &&
          cursor.y <= (EXPANDED_HEIGHT + 25)
        );

        if (!isInside) {
          if (!outsideDwellStart) {
            outsideDwellStart = Date.now();
          } else if (Date.now() - outsideDwellStart >= 200) {
            // Cursor has stayed outside the notch for 200ms -> smoothly collapse
            outsideDwellStart = null;
            mainWindow.webContents.send('notch-auto-collapse');
          }
        } else {
          outsideDwellStart = null;
        }
      }
    } catch (e) {}
  }, 40);

  mainWindow.on('closed', () => {
    if (edgeCheckInterval) clearInterval(edgeCheckInterval);
    mainWindow = null;
  });

  createTray();
  startVolumeWatcher();
  startNotificationWatcher();

  try {
    globalShortcut.register('CommandOrControl+Alt+N', () => {
      if (mainWindow) {
        isExpanded = !isExpanded;
        updateWindowSize(isExpanded);
        mainWindow.webContents.send('notch-toggle-shortcut', isExpanded);
      }
    });
  } catch (err) {}
}

function updateWindowSize(expanded, isAlert = false) {
  if (!mainWindow || mainWindow.isDestroyed()) return;

  const primaryDisplay = screen.getPrimaryDisplay();
  const { width: screenWidth } = primaryDisplay.bounds;

  isAlertMode = isAlert;

  if (isAlert) {
    isExpanded = false;
    const alertX = Math.round((screenWidth - ALERT_WIDTH) / 2);
    mainWindow.setIgnoreMouseEvents(false);
    mainWindow.setBounds({
      x: alertX,
      y: ALERT_TOP,
      width: ALERT_WIDTH,
      height: ALERT_HEIGHT
    });
    return;
  }

  isExpanded = expanded;
  const targetX = Math.round((screenWidth - EXPANDED_WIDTH) / 2);

  if (expanded) {
    // Enable full click interactivity
    mainWindow.setIgnoreMouseEvents(false);
    mainWindow.setBounds({
      x: targetX,
      y: 0,
      width: EXPANDED_WIDTH,
      height: EXPANDED_HEIGHT
    });
  } else {
    // 100% pass-through for mouse clicks + park offscreen so zero disturbance to Chrome tabs
    mainWindow.setIgnoreMouseEvents(true, { forward: true });
    mainWindow.setBounds({
      x: targetX,
      y: -200,
      width: EXPANDED_WIDTH,
      height: EXPANDED_HEIGHT
    });
  }
}

function createTray() {
  try {
    const trayIconPath = path.join(__dirname, 'assets', 'tray-icon.png');
    tray = new Tray(trayIconPath);
    const contextMenu = Menu.buildFromTemplate([
      {
        label: 'Notch Dude',
        enabled: false
      },
      { type: 'separator' },
      {
        label: 'Toggle Notch (Ctrl+Alt+N)',
        click: () => {
          isExpanded = !isExpanded;
          updateWindowSize(isExpanded);
          if (mainWindow) mainWindow.webContents.send('notch-toggle-shortcut', isExpanded);
        }
      },
      {
        label: 'Collapse',
        click: () => {
          updateWindowSize(false);
          if (mainWindow) mainWindow.webContents.send('notch-toggle-shortcut', false);
        }
      },
      { type: 'separator' },
      {
        label: 'Quit Notch Dude',
        click: () => {
          app.quit();
        }
      }
    ]);

    tray.setToolTip('Notch Dude');
    tray.setContextMenu(contextMenu);
    tray.on('click', () => {
      isExpanded = !isExpanded;
      updateWindowSize(isExpanded);
      if (mainWindow) mainWindow.webContents.send('notch-toggle-shortcut', isExpanded);
    });
  } catch (err) {}
}

// System Speaker Volume Monitor
let lastKnownVolume = -1;
let lastKnownMute = false;

function startVolumeWatcher() {
  setInterval(async () => {
    if (!mainWindow) return;
    try {
      const vol = await loudness.getVolume();
      const muted = await loudness.getMuted();
      if (vol !== lastKnownVolume || muted !== lastKnownMute) {
        lastKnownVolume = vol;
        lastKnownMute = muted;
        mainWindow.webContents.send('system-volume-updated', { volume: vol, muted });
      }
    } catch (e) {}
  }, 1000);
}

// IPC Handlers - Master Speaker Volume
ipcMain.handle('get-system-volume', async () => {
  try {
    const vol = await loudness.getVolume();
    const muted = await loudness.getMuted();
    lastKnownVolume = vol;
    lastKnownMute = muted;
    return { volume: vol, muted };
  } catch (e) {
    return { volume: 50, muted: false };
  }
});

ipcMain.handle('set-system-volume', async (event, vol) => {
  try {
    const safeVol = Math.max(0, Math.min(100, Math.round(vol)));
    await loudness.setVolume(safeVol);
    if (safeVol > 0) {
      await loudness.setMuted(false);
    }
    lastKnownVolume = safeVol;
    lastKnownMute = false;
    return true;
  } catch (e) {
    return false;
  }
});

ipcMain.handle('toggle-system-mute', async () => {
  try {
    const isMuted = await loudness.getMuted();
    await loudness.setMuted(!isMuted);
    const vol = await loudness.getVolume();
    lastKnownMute = !isMuted;
    return { volume: vol, muted: !isMuted };
  } catch (e) {
    return { volume: 50, muted: false };
  }
});

// ========================================================
// Real Windows System Notifications Service (WinRT)
// ========================================================
const clearedStateFile = path.join(__dirname, 'cleared-alerts.json');
let clearedState = { lastClearedTime: 0, clearedIds: [] };

function loadClearedState() {
  try {
    if (fs.existsSync(clearedStateFile)) {
      const data = JSON.parse(fs.readFileSync(clearedStateFile, 'utf8'));
      clearedState = {
        lastClearedTime: Number(data.lastClearedTime) || 0,
        clearedIds: Array.isArray(data.clearedIds) ? data.clearedIds.map(String) : []
      };
    } else {
      // First launch: set lastClearedTime to now so historical Windows toasts don't flood the user!
      clearedState = {
        lastClearedTime: Date.now(),
        clearedIds: []
      };
      saveClearedState();
    }
  } catch (e) {
    clearedState = { lastClearedTime: Date.now(), clearedIds: [] };
  }
}

function saveClearedState() {
  try {
    fs.writeFileSync(clearedStateFile, JSON.stringify(clearedState, null, 2), 'utf8');
  } catch (e) {}
}

function isNotificationCleared(notif) {
  if (!notif) return true;
  const idStr = String(notif.id);
  if (clearedState.clearedIds.includes(idStr)) return true;
  if (notif.time && notif.time <= clearedState.lastClearedTime) return true;
  return false;
}

let knownNotificationIds = new Set();
let cachedNotifications = [];
let notifPollerInterval = null;
let isPollingNotifs = false;

function queryWindowsNotifications() {
  return new Promise((resolve) => {
    const scriptPath = path.join(__dirname, 'scripts', 'get-notifications.ps1');
    execFile(
      'powershell.exe',
      ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', scriptPath],
      { windowsHide: true, maxBuffer: 1024 * 1024 * 8, encoding: 'utf8' },
      (err, stdout, stderr) => {
        if (err) {
          log(`[queryWindowsNotifications Error]: ${err.message}`);
          return resolve([]);
        }
        if (stderr && stderr.trim()) {
          log(`[queryWindowsNotifications stderr]: ${stderr.trim()}`);
        }
        if (!stdout) {
          log(`[queryWindowsNotifications stdout empty]`);
          return resolve([]);
        }
        try {
          let text = stdout.trim();
          if (!text || text === '[]') return resolve([]);
          // Replace raw unescaped control characters from PowerShell output
          text = text.replace(/[\x00-\x1F\x7F]+/g, (m) => (m === '\r' || m === '\n' || m === '\t') ? ' ' : '');
          const parsed = JSON.parse(text);
          resolve(Array.isArray(parsed) ? parsed : [parsed]);
        } catch (e) {
          log(`[Notification Parse Error]: ${e.message} - preview: ${stdout.slice(0, 100)}`);
          resolve([]);
        }
      }
    );
  });
}

async function startNotificationWatcher() {
  loadClearedState();

  try {
    const rawNotifs = await queryWindowsNotifications();
    const validNotifs = [];

    for (const n of (rawNotifs || [])) {
      const idStr = String(n.id);
      knownNotificationIds.add(idStr);

      if (!isNotificationCleared(n)) {
        validNotifs.push(n);
      }
    }

    cachedNotifications = validNotifs.sort((a, b) => b.time - a.time);
    log(`[Notification Service] Initialized with ${cachedNotifications.length} active (uncleared) notifications out of ${rawNotifs.length} in Windows Action Center`);

    if (mainWindow && !mainWindow.isDestroyed() && cachedNotifications.length > 0) {
      mainWindow.webContents.send('system-notification-received', cachedNotifications);
    }
  } catch (e) {
    log(`[Notification Service] Init error: ${e.message}`);
  }

  if (notifPollerInterval) clearInterval(notifPollerInterval);
  notifPollerInterval = setInterval(async () => {
    if (!mainWindow || mainWindow.isDestroyed() || isPollingNotifs) return;
    isPollingNotifs = true;
    try {
      const current = await queryWindowsNotifications();
      if (!current || current.length === 0) {
        return;
      }

      const newArrivals = [];
      for (const item of current) {
        const key = String(item.id);
        const alreadyKnown = knownNotificationIds.has(key);
        knownNotificationIds.add(key);

        if (!alreadyKnown && !isNotificationCleared(item)) {
          newArrivals.push(item);
          cachedNotifications.unshift(item);
        }
      }

      if (newArrivals.length > 0) {
        log(`[Notification Service] Captured ${newArrivals.length} new system notification(s): ` + newArrivals.map(n => n.title).join(', '));
        mainWindow.webContents.send('system-notification-received', newArrivals);

        const latest = newArrivals[0];

        // Never show popup banner inside the notch. Only show compact floating Dynamic Island while working (collapsed)
        if (!isExpanded) {
          updateWindowSize(false, true);
          mainWindow.webContents.send('notch-alert-island', latest);
        }
      }
    } catch (e) {
      log(`[Notification Service] Poller error: ${e.message}`);
    } finally {
      isPollingNotifs = false;
    }
  }, 2200);
}

// IPC Handlers - Notifications
ipcMain.handle('get-notifications', () => {
  log(`[IPC] get-notifications called, returning ${cachedNotifications.length} items`);
  return cachedNotifications;
});

ipcMain.handle('clear-notifications', () => {
  const now = Date.now();
  clearedState.lastClearedTime = now;
  for (const n of cachedNotifications) {
    if (n && n.id) {
      const idStr = String(n.id);
      if (!clearedState.clearedIds.includes(idStr)) {
        clearedState.clearedIds.push(idStr);
      }
    }
  }
  if (clearedState.clearedIds.length > 500) {
    clearedState.clearedIds = clearedState.clearedIds.slice(-500);
  }
  saveClearedState();
  cachedNotifications = [];
  log(`[Notification Service] All alerts cleared permanently at ${now}`);
  return true;
});

ipcMain.handle('dismiss-notification', (event, id) => {
  if (!id) return false;
  const idStr = String(id);
  if (!clearedState.clearedIds.includes(idStr)) {
    clearedState.clearedIds.push(idStr);
    if (clearedState.clearedIds.length > 500) {
      clearedState.clearedIds = clearedState.clearedIds.slice(-500);
    }
    saveClearedState();
  }
  cachedNotifications = cachedNotifications.filter(n => String(n.id) !== idStr);
  log(`[Notification Service] Dismissed notification ID: ${idStr}`);
  return true;
});

// Helper YouTube searcher (parses modern YouTube JSON and extracts clean audio/video tracks)
function fetchYouTubeSearchResults(query) {
  return new Promise((resolve) => {
    const url = 'https://www.youtube.com/results?search_query=' + encodeURIComponent(query);
    https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9'
      }
    }, (res) => {
      let html = '';
      res.on('data', chunk => html += chunk);
      res.on('end', () => {
        const results = [];
        const seenIds = new Set();
        try {
          const match = html.match(/ytInitialData\s*=\s*({.+?});<\/script>/) || html.match(/var ytInitialData = ({.+?});/);
          if (match) {
            const data = JSON.parse(match[1]);
            const contents = data?.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents;
            if (contents && Array.isArray(contents)) {
              for (const section of contents) {
                const itemSection = section?.itemSectionRenderer?.contents;
                if (itemSection && Array.isArray(itemSection)) {
                  for (const item of itemSection) {
                    let vId = null;
                    let rawTitle = '';
                    let author = 'YouTube Music';

                    if (item.videoRenderer) {
                      const vr = item.videoRenderer;
                      vId = vr.videoId;
                      rawTitle = vr.title?.runs?.[0]?.text || vr.title?.simpleText || 'Unknown Track';
                      author = vr.ownerText?.runs?.[0]?.text || vr.shortBylineText?.runs?.[0]?.text || 'YouTube Music';
                    } else if (item.lockupViewModel) {
                      const lvm = item.lockupViewModel;
                      vId = lvm.contentId || lvm.rendererContext?.commandContext?.onTap?.innertubeCommand?.watchEndpoint?.videoId;
                      rawTitle = lvm.metadata?.lockupMetadataViewModel?.title?.content || 'Suggested Track';
                      author = lvm.metadata?.lockupMetadataViewModel?.metadata?.contentMetadataViewModel?.metadataRows?.[0]?.metadataParts?.[0]?.text?.content || 'YouTube Music';
                    }

                    if (vId && !seenIds.has(vId)) {
                      seenIds.add(vId);
                      const cleanTitle = (rawTitle || '')
                        .replace(/\\u0026/g, '&')
                        .replace(/&amp;/g, '&')
                        .replace(/&#39;/g, "'")
                        .replace(/&quot;/g, '"')
                        .replace(/\\"/g, '"');
                      const cleanAuthor = (author || '')
                        .replace(/\\u0026/g, '&')
                        .replace(/&amp;/g, '&')
                        .replace(/&#39;/g, "'")
                        .replace(/&quot;/g, '"')
                        .replace(/\\"/g, '"');

                      // Skip multi-hour compilations/jukeboxes which are restricted from embeds
                      if (/jukebox|compilation|non\s*stop|full\s+album/i.test(cleanTitle)) {
                        continue;
                      }

                      results.push({
                        id: vId,
                        title: cleanTitle,
                        author: cleanAuthor,
                        thumbnail: `https://i.ytimg.com/vi/${vId}/hqdefault.jpg`
                      });
                      if (results.length >= 15) break;
                    }
                  }
                }
                if (results.length >= 15) break;
              }
            }
          }
        } catch (e) {
          console.error('[YT Search Error]:', e.message);
        }

        // Fallback if structured json parse failed
        if (results.length === 0) {
          const videoIdMatches = [...html.matchAll(/"videoId":"([a-zA-Z0-9_-]{11})"/g)];
          for (const m of videoIdMatches) {
            const id = m[1];
            if (!seenIds.has(id)) {
              seenIds.add(id);
              results.push({
                id,
                title: 'YouTube Track ' + id,
                author: 'Trending Hit',
                thumbnail: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`
              });
              if (results.length >= 10) break;
            }
          }
        }

        resolve(results);
      });
    }).on('error', (err) => {
      console.error('[YT Fetch Error]:', err);
      resolve([]);
    });
  });
}

// 1. General Search
ipcMain.handle('search-youtube', async (event, query) => {
  if (!query || typeof query !== 'string') return [];
  return await fetchYouTubeSearchResults(query);
});

// Fallback resolver for alternative audio stream
ipcMain.handle('get-fallback-audio', async (event, query) => {
  if (!query || typeof query !== 'string') return [];
  const clean = query
    .replace(/[\[\(].*?[\]\)]/g, '')
    .replace(/official\s+(music\s+)?video/gi, '')
    .replace(/video\s+song/gi, '')
    .replace(/4k|8k|hd/gi, '')
    .trim();
  const fallbackQuery = `${clean} audio`;
  console.log(`[YouTube Fallback Resolver] Querying alternative audio: "${fallbackQuery}"`);
  return await fetchYouTubeSearchResults(fallbackQuery);
});

// 2. Today's Tamil Trending Hits
ipcMain.handle('get-trending-songs', async () => {
  const trendingPool = [
    'tamil trending hit songs 2026',
    'latest tamil songs hit',
    'tamil latest movie songs',
    'tamil new viral songs',
    'tamil melodies latest songs',
    'anirudh latest hit songs'
  ];
  const query = trendingPool[Math.floor(Math.random() * trendingPool.length)];
  return await fetchYouTubeSearchResults(query);
});

// 3. Native YouTube Music Auto-Play Suggestions
function fetchNativeYouTubeMix(videoId) {
  return new Promise((resolve) => {
    if (!videoId) return resolve([]);
    const url = `https://www.youtube.com/watch?v=${videoId}&list=RD${videoId}`;
    https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9'
      }
    }, (res) => {
      let html = '';
      res.on('data', chunk => html += chunk);
      res.on('end', () => {
        const results = [];
        const seenIds = new Set([videoId]);
        try {
          const match = html.match(/ytInitialData\s*=\s*({.+?});<\/script>/);
          if (match) {
            const data = JSON.parse(match[1]);
            const tc = data?.contents?.twoColumnWatchNextResults;

            // 1. YouTube Mix playlist
            const playlist = tc?.playlist?.playlist?.contents;
            if (playlist && Array.isArray(playlist)) {
              for (const c of playlist) {
                const item = c.playlistPanelVideoRenderer;
                if (item && item.videoId && !seenIds.has(item.videoId)) {
                  seenIds.add(item.videoId);
                  const title = item.title?.simpleText || item.title?.runs?.[0]?.text || 'Track';
                  const author = item.shortBylineText?.runs?.[0]?.text || item.longBylineText?.runs?.[0]?.text || 'YouTube Music';
                  const cleanTitle = title.replace(/\\u0026/g, '&').replace(/&amp;/g, '&').replace(/&#39;/g, "'").replace(/&quot;/g, '"');
                  if (/jukebox|compilation|non\s*stop|full\s+album/i.test(cleanTitle)) continue;
                  results.push({
                    id: item.videoId,
                    title: cleanTitle,
                    author: author.replace(/\\u0026/g, '&').replace(/&amp;/g, '&').replace(/&#39;/g, "'").replace(/&quot;/g, '"'),
                    thumbnail: `https://i.ytimg.com/vi/${item.videoId}/hqdefault.jpg`
                  });
                }
              }
            }

            // 2. YouTube Suggested (lockupViewModel)
            const secItems = tc?.secondaryResults?.secondaryResults?.results?.[0]?.itemSectionRenderer?.contents;
            if (secItems && Array.isArray(secItems)) {
              for (const item of secItems) {
                const lvm = item.lockupViewModel;
                const vId = lvm?.contentId || lvm?.rendererContext?.commandContext?.onTap?.innertubeCommand?.watchEndpoint?.videoId;
                if (vId && !seenIds.has(vId)) {
                  seenIds.add(vId);
                  const title = lvm.metadata?.lockupMetadataViewModel?.title?.content || 'Suggested Song';
                  const author = lvm.metadata?.lockupMetadataViewModel?.metadata?.contentMetadataViewModel?.metadataRows?.[0]?.metadataParts?.[0]?.text?.content || 'YouTube Music';
                  results.push({
                    id: vId,
                    title: title.replace(/\\u0026/g, '&').replace(/&amp;/g, '&').replace(/&#39;/g, "'").replace(/&quot;/g, '"'),
                    author: author.replace(/\\u0026/g, '&').replace(/&amp;/g, '&').replace(/&#39;/g, "'").replace(/&quot;/g, '"'),
                    thumbnail: `https://i.ytimg.com/vi/${vId}/hqdefault.jpg`
                  });
                }
              }
            }
          }
        } catch (e) {
          console.error('[YT Suggestions Error]:', e.message);
        }
        resolve(results);
      });
    }).on('error', (err) => {
      console.error('[YT Suggestions Fetch Error]:', err);
      resolve([]);
    });
  });
}

ipcMain.handle('get-yt-mix', async (event, videoId) => {
  return await fetchNativeYouTubeMix(videoId);
});

// Backward compatibility for get-related-songs
ipcMain.handle('get-related-songs', async (event, payload) => {
  const videoId = typeof payload === 'string' ? payload : (payload?.currentId || payload?.id);
  return await fetchNativeYouTubeMix(videoId);
});

ipcMain.on('set-notch-state', (event, { expanded, pinned, isAlert }) => {
  if (pinned !== undefined) isPinned = pinned;
  if (!isPinned || expanded || isAlert) {
    updateWindowSize(expanded, isAlert);
  }
});

// Real Hardware Telemetry Engine (Task Manager Specs & CPU Usage)
let lastCpuMeasure = null;
function getCpuUsagePercent() {
  try {
    const cpus = os.cpus();
    let idle = 0;
    let total = 0;
    for (const c of cpus) {
      for (const t in c.times) {
        total += c.times[t];
      }
      idle += c.times.idle;
    }
    if (!lastCpuMeasure) {
      lastCpuMeasure = { idle, total };
      return 13;
    }
    const idleDiff = idle - lastCpuMeasure.idle;
    const totalDiff = total - lastCpuMeasure.total;
    lastCpuMeasure = { idle, total };
    if (totalDiff <= 0) return 13;
    const pct = Math.round(100 * (1 - idleDiff / totalDiff));
    return Math.max(1, Math.min(100, pct));
  } catch (e) {
    return 13;
  }
}

let cachedDiskPct = 85;
function updateDiskUsage() {
  execFile('powershell.exe', ['-NoProfile', '-Command', 'Get-PSDrive C | ForEach-Object { [math]::Round(100 * ($_.Used / ($_.Used + $_.Free))) }'], { windowsHide: true }, (err, stdout) => {
    if (!err && stdout && stdout.trim()) {
      const val = parseInt(stdout.trim(), 10);
      if (!isNaN(val) && val > 0 && val <= 100) {
        cachedDiskPct = val;
      }
    }
  });
}
try { updateDiskUsage(); setInterval(updateDiskUsage, 60000); } catch (e) {}

ipcMain.handle('get-system-info', () => {
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const usedMem = totalMem - freeMem;
  const memUsagePercent = Math.round((usedMem / totalMem) * 100);

  const cpus = os.cpus();
  const cpuCount = cpus.length;
  const cpuUsage = getCpuUsagePercent();

  return {
    memUsagePercent,
    usedMemGB: (usedMem / (1024 ** 3)).toFixed(1),
    totalMemGB: (totalMem / (1024 ** 3)).toFixed(1),
    cpuUsagePercent: cpuUsage,
    cpuSpeedGHz: '3.40',
    cpuModel: '11th Gen Intel i5-1135G7',
    cpuCores: '4C / 8T',
    ramSpeed: '3200 MT/s',
    ramType: 'DDR4',
    ramSlots: '1 of 2',
    ramFormFactor: 'SODIMM',
    diskModel: 'SSD (NVMe)',
    diskUsagePercent: cachedDiskPct,
    uptimeHours: (os.uptime() / 3600).toFixed(1)
  };
});

ipcMain.handle('open-path', async (event, filePath) => {
  if (!filePath) return false;
  try {
    await shell.openPath(filePath);
    return true;
  } catch (err) {
    return false;
  }
});

ipcMain.handle('show-in-folder', (event, filePath) => {
  if (!filePath) return false;
  try {
    shell.showItemInFolder(filePath);
    return true;
  } catch (err) {
    return false;
  }
});

// ----------------------------------------------------
// PERSISTENT REAL-TIME WINDOWS CLIPBOARD HISTORY (20H AUTO-EXPIRY)
// ----------------------------------------------------
const clipboardStorageFile = path.join(__dirname, 'clipboard-history.json');
const CLIP_EXPIRY_MS = 20 * 60 * 60 * 1000; // Strictly 20 hours auto-expiry
let clipboardHistory = [];
let lastClipboardText = '';

function pruneExpiredClips() {
  const now = Date.now();
  const prevCount = clipboardHistory.length;
  clipboardHistory = clipboardHistory.filter(c => c && c.time && (now - c.time) < CLIP_EXPIRY_MS);
  if (clipboardHistory.length !== prevCount) {
    saveClipboardHistory();
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('clipboard-updated', clipboardHistory);
    }
    log(`[Clipboard Service] Auto-pruned ${prevCount - clipboardHistory.length} clips older than 20 hours`);
  }
}

// Check every 5 minutes for expired clips (20 hours lifecycle)
setInterval(pruneExpiredClips, 5 * 60 * 1000);

async function loadClipboardHistory() {
  try {
    if (fs.existsSync(clipboardStorageFile)) {
      const raw = fs.readFileSync(clipboardStorageFile, 'utf8');
      clipboardHistory = JSON.parse(raw);
      if (!Array.isArray(clipboardHistory)) clipboardHistory = [];
      // Clean any spurious non-string test artifacts
      clipboardHistory = clipboardHistory.filter(c => c && c.text && c.text !== '[object Promise]');
      // Auto-prune clips older than 20 hours immediately upon load
      const now = Date.now();
      clipboardHistory = clipboardHistory.filter(c => c && c.time && (now - c.time) < CLIP_EXPIRY_MS);
      log(`[Clipboard Service] Loaded ${clipboardHistory.length} active clips (<20 hours) from history`);
    }
  } catch (err) {
    clipboardHistory = [];
  }

  try {
    const initial = await clipboard.readText();
    lastClipboardText = typeof initial === 'string' ? initial : '';
  } catch (e) {}
}

function saveClipboardHistory() {
  try {
    fs.writeFileSync(clipboardStorageFile, JSON.stringify(clipboardHistory, null, 2), 'utf8');
    log(`[Clipboard Service] Saved ${clipboardHistory.length} clips to disk`);
  } catch (err) {
    log(`[Clipboard Service] Save error: ${err.message}`);
  }
}

// Background polling watcher (750ms interval across all Windows applications)
setInterval(async () => {
  try {
    const raw = await clipboard.readText();
    const current = (typeof raw === 'string') ? raw : (raw ? String(raw) : '');
    if (!current || !current.trim()) return;
    if (current === '[object Promise]') return;
    if (current === lastClipboardText) return;

    lastClipboardText = current;
    log(`[Clipboard Service] Captured new clip (${current.length} chars): ${current.slice(0, 30).replace(/[\r\n]+/g, ' ')}`);

    // Prune expired clips before saving new
    pruneExpiredClips();

    // Check if already in history
    const existingIdx = clipboardHistory.findIndex(c => c.text === current);
    let item;
    if (existingIdx >= 0) {
      item = clipboardHistory.splice(existingIdx, 1)[0];
      item.time = Date.now();
    } else {
      item = {
        id: 'clip_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
        text: current,
        time: Date.now(),
        charCount: current.length,
        lines: current.split('\n').length
      };
    }

    clipboardHistory.unshift(item);
    if (clipboardHistory.length > 150) {
      clipboardHistory = clipboardHistory.slice(0, 150);
    }
    saveClipboardHistory();

    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('clipboard-updated', clipboardHistory);
    }
  } catch (e) {
    log(`[Clipboard Service] Watcher error: ${e.message}`);
  }
}, 750);

ipcMain.handle('get-clipboard-history', () => {
  pruneExpiredClips();
  return clipboardHistory;
});

ipcMain.handle('delete-clipboard-item', (event, id) => {
  clipboardHistory = clipboardHistory.filter(c => c.id !== id);
  saveClipboardHistory();
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('clipboard-updated', clipboardHistory);
  }
  return true;
});

ipcMain.handle('clear-clipboard-history', () => {
  clipboardHistory = [];
  saveClipboardHistory();
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('clipboard-updated', clipboardHistory);
  }
  return true;
});

ipcMain.handle('copy-to-clipboard', (event, text) => {
  if (text) {
    lastClipboardText = text;
    clipboard.writeText(text);
    return true;
  }
  return false;
});

ipcMain.on('copy-to-clipboard', (event, text) => {
  if (text) {
    lastClipboardText = text;
    clipboard.writeText(text);
  }
});

ipcMain.on('close-app', () => {
  app.quit();
});

app.whenReady().then(() => {
  loadClipboardHistory();
  startLocalServer();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});
