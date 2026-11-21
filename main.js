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

// Vanished resting trigger dimensions (Invisible 2px trigger at top center, 480x185 expanded)
const COLLAPSED_WIDTH = 340;
const COLLAPSED_HEIGHT = 2;
const EXPANDED_WIDTH = 480;
const EXPANDED_HEIGHT = 185;

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

function updateWindowSize(expanded) {
  if (!mainWindow) return;

  const primaryDisplay = screen.getPrimaryDisplay();
  const { width: screenWidth } = primaryDisplay.bounds;
  const targetX = Math.round((screenWidth - EXPANDED_WIDTH) / 2);

  isExpanded = expanded;

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
let knownNotificationIds = new Set();
let cachedNotifications = [];
let notifPollerInterval = null;
let autoCollapseTimer = null;
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
          log(`[queryWindowsNotifications stdout length]: ${text.length}`);
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
  try {
    const initial = await queryWindowsNotifications();
    cachedNotifications = (initial || []).sort((a, b) => b.time - a.time);
    for (const n of cachedNotifications) {
      knownNotificationIds.add(String(n.id));
    }
    log(`[Notification Service] Initialized with ${cachedNotifications.length} existing notifications`);
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
        if (!knownNotificationIds.has(key)) {
          knownNotificationIds.add(key);
          newArrivals.push(item);
          cachedNotifications.unshift(item);
        }
      }

      if (newArrivals.length > 0) {
        log(`[Notification Service] Captured ${newArrivals.length} new system notification(s): ` + newArrivals.map(n => n.title).join(', '));
        mainWindow.webContents.send('system-notification-received', newArrivals);

        const latest = newArrivals[0];
        mainWindow.webContents.send('notch-notification-popup', latest);

        // When a new notification arrives, dynamically pop open the notch if collapsed
        if (!isExpanded) {
          updateWindowSize(true);
          mainWindow.webContents.send('notch-trigger-expand');

          if (autoCollapseTimer) clearTimeout(autoCollapseTimer);
          autoCollapseTimer = setTimeout(() => {
            if (mainWindow && !mainWindow.isDestroyed() && !isPinned) {
              mainWindow.webContents.send('notch-auto-collapse');
            }
          }, 6000);
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
  cachedNotifications = [];
  return true;
});

// Helper YouTube searcher (parses modern YouTube JSON and fallback patterns)
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
                    const vr = item.videoRenderer;
                    if (vr && vr.videoId) {
                      const title = vr.title?.runs?.[0]?.text || vr.title?.simpleText || 'Unknown Title';
                      const author = vr.ownerText?.runs?.[0]?.text || vr.shortBylineText?.runs?.[0]?.text || 'YouTube Music';
                      results.push({
                        id: vr.videoId,
                        title: title.replace(/\\u0026/g, '&').replace(/\\"/g, '"'),
                        author: author.replace(/\\u0026/g, '&').replace(/\\"/g, '"'),
                        thumbnail: `https://i.ytimg.com/vi/${vr.videoId}/hqdefault.jpg`
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
          const seen = new Set();
          for (const m of videoIdMatches) {
            const id = m[1];
            if (!seen.has(id)) {
              seen.add(id);
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

// Fallback resolver for songs restricted by record labels (Error 150/101)
ipcMain.handle('get-fallback-audio', async (event, query) => {
  if (!query || typeof query !== 'string') return [];
  const clean = query
    .replace(/[\[\(].*?[\]\)]/g, '')
    .replace(/official\s+(music\s+)?video/gi, '')
    .replace(/video\s+song/gi, '')
    .trim();
  const fallbackQuery = `${clean} audio`;
  console.log(`[YouTube Fallback Resolver] Querying alternative audio: "${fallbackQuery}"`);
  return await fetchYouTubeSearchResults(fallbackQuery);
});

// 2. Today's Tamil Trending Hits (Fresh and dynamic on each startup/refresh)
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
                  results.push({
                    id: item.videoId,
                    title: title.replace(/\\u0026/g, '&').replace(/\\"/g, '"'),
                    author: author.replace(/\\u0026/g, '&').replace(/\\"/g, '"'),
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
                    title: title.replace(/\\u0026/g, '&').replace(/\\"/g, '"'),
                    author: author.replace(/\\u0026/g, '&').replace(/\\"/g, '"'),
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

ipcMain.on('set-notch-state', (event, { expanded, pinned }) => {
  if (pinned !== undefined) isPinned = pinned;
  if (!isPinned || expanded) {
    updateWindowSize(expanded);
  }
});

ipcMain.handle('get-system-info', () => {
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const usedMem = totalMem - freeMem;
  const memUsagePercent = Math.round((usedMem / totalMem) * 100);

  const cpus = os.cpus();
  const cpuModel = cpus[0] ? cpus[0].model.trim() : 'Unknown CPU';
  const cpuCount = cpus.length;

  return {
    memUsagePercent,
    usedMemGB: (usedMem / (1024 ** 3)).toFixed(1),
    totalMemGB: (totalMem / (1024 ** 3)).toFixed(1),
    cpuModel,
    cpuCount,
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

ipcMain.on('copy-to-clipboard', (event, text) => {
  if (text) clipboard.writeText(text);
});

ipcMain.on('close-app', () => {
  app.quit();
});

app.whenReady().then(() => {
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
