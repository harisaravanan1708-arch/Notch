const { app, BrowserWindow, ipcMain, screen, shell, clipboard, globalShortcut, Menu, Tray, nativeImage, session } = require('electron');
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

// Super compact mini notch dimensions
const COLLAPSED_WIDTH = 190;
const COLLAPSED_HEIGHT = 32;
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

  const initialWidth = COLLAPSED_WIDTH;
  const initialHeight = COLLAPSED_HEIGHT;
  const initialX = Math.round((screenWidth - initialWidth) / 2);

  mainWindow = new BrowserWindow({
    width: initialWidth,
    height: initialHeight,
    x: initialX,
    y: 0,
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

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  createTray();
  startVolumeWatcher();

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

  const targetWidth = expanded ? EXPANDED_WIDTH : COLLAPSED_WIDTH;
  const targetHeight = expanded ? EXPANDED_HEIGHT : COLLAPSED_HEIGHT;
  const targetX = Math.round((screenWidth - targetWidth) / 2);

  isExpanded = expanded;
  mainWindow.setBounds({
    x: targetX,
    y: 0,
    width: targetWidth,
    height: targetHeight
  });
}

function createTray() {
  try {
    const iconCanvas = nativeImage.createFromBuffer(
      Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAZElEQVQ4T2NkoBAwUqifAW5AI038Z2g4YhTDn3/9DJTAhIyMzEaOAm5kGv3/fy+DjBgn1W5kYGD4zyBDphu5GNgZGBj+/9/O8H+7N8VuZGBgYGD8z7CDkU5uG87/QYnU6BymAQYAyF0n/QZpTq0AAAAASUVORK5CYII=',
        'base64'
      )
    );

    tray = new Tray(iconCanvas);
    const contextMenu = Menu.buildFromTemplate([
      {
        label: 'Windows Mini Glass Notch',
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
        label: 'Quit',
        click: () => {
          app.quit();
        }
      }
    ]);

    tray.setToolTip('Windows Mini Glass Notch');
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

// 3. Native YouTube Music Auto-Play Queue (Fetches YouTube's exact official Mix playlist)
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
        try {
          const match = html.match(/ytInitialData\s*=\s*({.+?});<\/script>/);
          if (match) {
            const data = JSON.parse(match[1]);
            const playlist = data?.contents?.twoColumnWatchNextResults?.playlist?.playlist;
            if (playlist && Array.isArray(playlist.contents)) {
              for (const c of playlist.contents) {
                const item = c.playlistPanelVideoRenderer;
                if (item && item.videoId && item.videoId !== videoId) {
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
          }
        } catch (e) {
          console.error('[YT Mix Error]:', e.message);
        }
        resolve(results);
      });
    }).on('error', (err) => {
      console.error('[YT Mix Fetch Error]:', err);
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
