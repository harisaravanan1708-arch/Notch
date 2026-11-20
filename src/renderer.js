// State variables
let isExpanded = false;
let isPinned = false;
let isIslandMode = false;
let shelfFiles = [];
let collapseTimeout = null;

// YouTube Music Smart Radio State
let ytPlayer = null;
let ytPlayerReady = false;
let isPlaying = false;
let currentTrack = null;
let upcomingQueue = [];
let historyQueue = [];
let progressInterval = null;
let visualizerAnimationFrame = null;

// Volume State
let systemVolume = 50;
let isSystemMuted = false;

// Elements
const notchContainer = document.getElementById('notch-container');
const collapsedView = document.getElementById('collapsed-view');
const btnPin = document.getElementById('btn-pin');
const btnCollapse = document.getElementById('btn-collapse');
const btnStyleToggle = document.getElementById('btn-style-toggle');
const tabButtons = document.querySelectorAll('.tab-btn');
const tabContents = document.querySelectorAll('.tab-content');

// YouTube Player Elements
const ytSearchInput = document.getElementById('yt-search-input');
const btnYtSearch = document.getElementById('btn-yt-search');
const ytResultsDropdown = document.getElementById('yt-results-dropdown');
const stationChips = document.querySelectorAll('.station-chip');
const btnPlay = document.getElementById('btn-play');
const btnPrev = document.getElementById('btn-prev');
const btnNext = document.getElementById('btn-next');
const playIcon = document.getElementById('play-icon');
const pauseIcon = document.getElementById('pause-icon');
const miniEqualizer = document.getElementById('mini-equalizer');
const miniNowPlaying = document.getElementById('mini-now-playing');
const albumArt = document.getElementById('album-art');
const ytThumbImg = document.getElementById('yt-thumb-img');
const ytThumbPlaceholder = document.getElementById('yt-thumb-placeholder');
const trackTitleEl = document.getElementById('track-title');
const trackArtistEl = document.getElementById('track-artist');
const upNextHint = document.getElementById('up-next-hint');
const progressBarWrapper = document.getElementById('progress-bar-wrapper');
const progressFill = document.getElementById('progress-fill');
const currentTimeEl = document.getElementById('current-time');
const durationTimeEl = document.getElementById('duration-time');
const playerStatusBadge = document.getElementById('player-status-badge');
const canvas = document.getElementById('visualizer-canvas');
const ctx = canvas.getContext('2d');

// Master Speaker Volume Elements
const volumeSlider = document.getElementById('volume-slider');
const volumePctLabel = document.getElementById('volume-pct-label');
const btnVolumeIcon = document.getElementById('btn-volume-icon');
const volIconActive = document.getElementById('vol-icon-active');
const volIconMuted = document.getElementById('vol-icon-muted');

// ----------------------------------------------------
// 1. DYNAMIC YOUTUBE IFRAME API INITIALIZATION
// ----------------------------------------------------
let initialTrendingLoaded = false;

window.onYouTubeIframeAPIReady = async function() {
  console.log('[YouTube API] Ready event received!');
  
  let initialSong = null;
  try {
    const trending = await window.notchAPI.getTrendingSongs();
    if (trending && trending.length > 0) {
      // Pick a random song from top trending hits so it's always fresh & vibrant
      const pool = trending.slice(0, 6);
      initialSong = pool[Math.floor(Math.random() * pool.length)] || trending[0];
      upcomingQueue = trending.filter(s => s.id !== initialSong.id);
      prepareSongUI(initialSong);
      updateUpNextUI();
      initialTrendingLoaded = true;
    }
  } catch (err) {
    console.error('Initial trending error:', err);
  }

  ytPlayer = new YT.Player('yt-player', {
    height: '80',
    width: '140',
    videoId: initialSong ? initialSong.id : '',
    host: 'https://www.youtube.com',
    playerVars: {
      autoplay: 0,
      controls: 0,
      disablekb: 1,
      fs: 0,
      rel: 0,
      loop: 0,
      origin: window.location.origin,
      enablejsapi: 1
    },
    events: {
      onReady: onPlayerReady,
      onStateChange: onPlayerStateChange,
      onError: onPlayerError
    }
  });
};

const ytScriptTag = document.createElement('script');
ytScriptTag.src = 'https://www.youtube.com/iframe_api';
document.head.appendChild(ytScriptTag);

async function onPlayerReady() {
  console.log('[YouTube Player] Ready!');
  ytPlayerReady = true;

  if (ytPlayer.setVolume) {
    ytPlayer.setVolume(100);
  }

  if (!initialTrendingLoaded) {
    await loadTodaysTrendingMusic();
  }
}

// ----------------------------------------------------
// 2. SMART YOUTUBE MUSIC RADIO & AUTO-PLAY ENGINE
// ----------------------------------------------------
async function loadTodaysTrendingMusic() {
  try {
    if (playerStatusBadge) playerStatusBadge.textContent = 'Finding Hits';
    const trending = await window.notchAPI.getTrendingSongs();

    if (trending && trending.length > 0) {
      const chosen = trending[Math.floor(Math.random() * Math.min(trending.length, 5))];
      upcomingQueue = trending.filter(s => s.id !== chosen.id);
      prepareSongUI(chosen);
      updateUpNextUI();
    }
  } catch (err) {
    console.error('Error fetching trending:', err);
  }
}

function prepareSongUI(song) {
  currentTrack = song;
  trackTitleEl.textContent = song.title;
  trackTitleEl.title = song.title;
  trackArtistEl.textContent = song.author || "Trending Tamil Radio";
  if (miniNowPlaying) {
    miniNowPlaying.textContent = song.title.substring(0, 16);
  }
  loadThumbnail(song.id);

  if (ytPlayer && ytPlayerReady && ytPlayer.cueVideoById) {
    ytPlayer.cueVideoById(song.id);
  }
}

async function playSong(song, isUserInitiated = true) {
  if (!song) return;

  if (currentTrack && currentTrack.id !== song.id) {
    historyQueue.push(currentTrack);
    if (historyQueue.length > 15) historyQueue.shift();
  }

  currentTrack = song;
  trackTitleEl.textContent = song.title;
  trackTitleEl.title = song.title;
  trackArtistEl.textContent = song.author || "YouTube Music Stream";
  if (miniNowPlaying) {
    miniNowPlaying.textContent = song.title.substring(0, 16);
  }

  loadThumbnail(song.id);

  if (ytPlayer && ytPlayerReady && ytPlayer.loadVideoById) {
    try {
      ytPlayer.loadVideoById(song.id);
      ytPlayer.playVideo();
      isPlaying = true;
    } catch (e) {
      console.error(e);
    }
  }

  // When a user selects or searches a song, immediately spin up a smart genre radio
  if (isUserInitiated) {
    updateUpNextHint("Loading Radio...");
    fetchRelatedSmartRadio(song);
  } else {
    updateUpNextUI();
  }
}

async function fetchRelatedSmartRadio(song) {
  try {
    const related = await window.notchAPI.getRelatedSongs({
      title: song.title,
      author: song.author,
      currentId: song.id
    });

    if (related && related.length > 0) {
      upcomingQueue = related;
      console.log(`[Smart Radio] Queued ${related.length} songs similar to: ${song.title}`);
    } else {
      // Fallback: refill with fresh trending hits
      const trending = await window.notchAPI.getTrendingSongs();
      upcomingQueue = trending.filter(item => item.id !== song.id);
    }
    updateUpNextUI();
  } catch (err) {
    console.error('Radio fetch error:', err);
  }
}

function updateUpNextUI() {
  if (!upNextHint) return;
  if (upcomingQueue.length > 0) {
    const nextTitle = upcomingQueue[0].title;
    upNextHint.textContent = `Up Next: ${nextTitle.substring(0, 20)}...`;
    upNextHint.title = `Next: ${nextTitle}`;
  } else {
    upNextHint.textContent = `Up Next: Auto Radio`;
  }
}

function updateUpNextHint(text) {
  if (upNextHint) upNextHint.textContent = text;
}

// Play Next Song (Used by ⏭ button & Auto-Play on song end)
async function playNextSong() {
  if (playerStatusBadge) playerStatusBadge.textContent = 'Next Up...';

  if (upcomingQueue.length > 0) {
    const nextSong = upcomingQueue.shift();
    playSong(nextSong, false);

    // If queue is getting low, refill automatically with similar genre songs
    if (upcomingQueue.length < 3 && currentTrack) {
      try {
        const more = await window.notchAPI.getRelatedSongs({
          title: currentTrack.title,
          author: currentTrack.author,
          currentId: currentTrack.id
        });
        if (more && more.length > 0) {
          const existingIds = new Set([currentTrack.id, ...upcomingQueue.map(s => s.id)]);
          const fresh = more.filter(s => !existingIds.has(s.id));
          upcomingQueue.push(...fresh);
        }
      } catch (e) {}
      updateUpNextUI();
    }
  } else {
    // If queue is empty, fetch fresh hits
    const freshHits = await window.notchAPI.getTrendingSongs();
    if (freshHits && freshHits.length > 0) {
      const next = freshHits[0];
      upcomingQueue = freshHits.slice(1);
      playSong(next, false);
    }
  }
}

// Play Previous Song (Used by ⏮ button)
function playPrevSong() {
  if (ytPlayer && ytPlayerReady && ytPlayer.getCurrentTime) {
    const currentTime = ytPlayer.getCurrentTime() || 0;
    if (currentTime > 4) {
      // Replay current song if already played > 4s
      ytPlayer.seekTo(0, true);
      return;
    }
  }

  if (historyQueue.length > 0) {
    const prevSong = historyQueue.pop();
    if (currentTrack) upcomingQueue.unshift(currentTrack);
    playSong(prevSong, false);
  } else if (ytPlayer && ytPlayerReady && ytPlayer.seekTo) {
    ytPlayer.seekTo(0, true);
  }
}

function onPlayerStateChange(event) {
  console.log('[YouTube State]:', event.data);

  if (event.data === YT.PlayerState.PLAYING) {
    isPlaying = true;
    playIcon.classList.add('hidden');
    pauseIcon.classList.remove('hidden');
    miniEqualizer.classList.add('playing');
    albumArt.classList.add('playing');
    if (playerStatusBadge) playerStatusBadge.textContent = 'Playing';
    startProgressTracking();
  } else if (event.data === YT.PlayerState.PAUSED) {
    isPlaying = false;
    playIcon.classList.remove('hidden');
    pauseIcon.classList.add('hidden');
    miniEqualizer.classList.remove('playing');
    albumArt.classList.remove('playing');
    if (playerStatusBadge) playerStatusBadge.textContent = 'Paused';
  } else if (event.data === YT.PlayerState.BUFFERING) {
    if (playerStatusBadge) playerStatusBadge.textContent = 'Loading...';
  } else if (event.data === YT.PlayerState.ENDED) {
    // ----------------------------------------------------
    // 🔥 AUTO-PLAY NEXT SONG ON FINISH!
    // ----------------------------------------------------
    console.log('[Auto-Play] Track finished! Seamlessly playing next related track...');
    if (playerStatusBadge) playerStatusBadge.textContent = 'Next Up...';
    playNextSong();
  }
}

function onPlayerError(event) {
  console.warn('[YouTube Error Code]:', event.data);
  // If video owner disabled embedding (150/101), automatically auto-skip to next track in queue!
  if (event.data === 150 || event.data === 101 || event.data === 100) {
    if (playerStatusBadge) playerStatusBadge.textContent = 'Auto-skipping...';
    console.log('[Auto-Play] Video embed blocked by owner. Auto-skipping to next related hit...');
    setTimeout(() => {
      playNextSong();
    }, 800);
  } else {
    if (playerStatusBadge) playerStatusBadge.textContent = 'Error ' + event.data;
  }
}

function loadThumbnail(videoId) {
  if (ytThumbImg && ytThumbPlaceholder) {
    ytThumbImg.src = `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
    ytThumbImg.onload = () => {
      ytThumbImg.classList.remove('hidden');
      ytThumbPlaceholder.classList.add('hidden');
    };
    ytThumbImg.onerror = () => {
      ytThumbImg.classList.add('hidden');
      ytThumbPlaceholder.classList.remove('hidden');
    };
  }
}

function togglePlay() {
  if (!ytPlayer || !ytPlayerReady) return;
  try {
    if (isPlaying) {
      ytPlayer.pauseVideo();
    } else {
      if (currentTrack) {
        ytPlayer.playVideo();
      } else if (upcomingQueue.length > 0) {
        playNextSong();
      }
    }
  } catch (err) {
    console.error('Toggle error:', err);
  }
}

btnPlay.addEventListener('click', (e) => {
  e.stopPropagation();
  togglePlay();
});

btnPrev.addEventListener('click', (e) => {
  e.stopPropagation();
  playPrevSong();
});

btnNext.addEventListener('click', (e) => {
  e.stopPropagation();
  playNextSong();
});

// Progress Bar & Duration
function startProgressTracking() {
  if (progressInterval) clearInterval(progressInterval);
  progressInterval = setInterval(() => {
    if (ytPlayer && ytPlayerReady && isPlaying) {
      const cur = ytPlayer.getCurrentTime ? (ytPlayer.getCurrentTime() || 0) : 0;
      const dur = ytPlayer.getDuration ? (ytPlayer.getDuration() || 1) : 1;
      const pct = (cur / dur) * 100;

      progressFill.style.width = `${pct}%`;
      currentTimeEl.textContent = formatTime(cur);
      durationTimeEl.textContent = formatTime(dur);
    }
  }, 500);
}

progressBarWrapper.addEventListener('click', (e) => {
  e.stopPropagation();
  if (!ytPlayer || !ytPlayerReady || !ytPlayer.seekTo) return;
  const rect = progressBarWrapper.getBoundingClientRect();
  const clickX = e.clientX - rect.left;
  const ratio = Math.max(0, Math.min(1, clickX / rect.width));
  const dur = ytPlayer.getDuration ? (ytPlayer.getDuration() || 0) : 0;
  ytPlayer.seekTo(ratio * dur, true);
});

function formatTime(secs) {
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

// ----------------------------------------------------
// 3. WINDOWS MASTER SPEAKER VOLUME INTEGRATION
// ----------------------------------------------------
function applyVolumeUI(vol, muted) {
  systemVolume = vol;
  isSystemMuted = muted;

  if (volumeSlider) volumeSlider.value = vol;
  if (volumePctLabel) volumePctLabel.textContent = muted ? 'Muted' : `${vol}%`;

  if (volIconActive && volIconMuted) {
    if (muted || vol === 0) {
      volIconActive.classList.add('hidden');
      volIconMuted.classList.remove('hidden');
    } else {
      volIconActive.classList.remove('hidden');
      volIconMuted.classList.add('hidden');
    }
  }

  const hudVolPct = document.getElementById('hud-vol-pct');
  const hudVolBar = document.getElementById('hud-vol-bar');
  const hudVolLabel = document.getElementById('hud-vol-label');
  if (hudVolPct) hudVolPct.textContent = muted ? 'Muted' : `${vol}%`;
  if (hudVolBar) hudVolBar.style.width = muted ? '0%' : `${vol}%`;
  if (hudVolLabel) hudVolLabel.textContent = muted ? 'Muted' : 'Speaker';
}

async function initSystemVolume() {
  if (window.notchAPI?.getSystemVolume) {
    try {
      const data = await window.notchAPI.getSystemVolume();
      applyVolumeUI(data.volume, data.muted);
    } catch (e) {}
  }
}
initSystemVolume();

let volumeThrottle = null;
volumeSlider.addEventListener('input', (e) => {
  const val = Number(e.target.value);
  applyVolumeUI(val, false);

  clearTimeout(volumeThrottle);
  volumeThrottle = setTimeout(() => {
    if (window.notchAPI?.setSystemVolume) {
      window.notchAPI.setSystemVolume(val);
    }
  }, 50);
});

btnVolumeIcon.addEventListener('click', async (e) => {
  e.stopPropagation();
  if (window.notchAPI?.toggleSystemMute) {
    try {
      const res = await window.notchAPI.toggleSystemMute();
      applyVolumeUI(res.volume, res.muted);
    } catch (err) {}
  }
});

if (window.notchAPI?.onSystemVolumeUpdated) {
  window.notchAPI.onSystemVolumeUpdated((data) => {
    applyVolumeUI(data.volume, data.muted);
  });
}

// ----------------------------------------------------
// 4. YOUTUBE SEARCH & DIRECT LINK PARSER
// ----------------------------------------------------
function extractYouTubeId(url) {
  const regExp = /^.*(youtu\.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
}

async function handleSearch() {
  const query = ytSearchInput.value.trim();
  if (!query) return;

  const directId = extractYouTubeId(query);
  if (directId) {
    playSong({ id: directId, title: "Direct Track" }, true);
    closeSearchDropdown();
    return;
  }

  btnYtSearch.textContent = '...';
  try {
    const results = await window.notchAPI.searchYouTube(query);
    renderSearchResults(results);
  } catch (err) {
    console.error(err);
  } finally {
    btnYtSearch.textContent = 'Find';
  }
}

function renderSearchResults(results) {
  if (!results || results.length === 0) {
    ytResultsDropdown.innerHTML = `<div style="padding: 8px; font-size: 10px; color: rgba(255,255,255,0.4);">No results found</div>`;
    ytResultsDropdown.classList.remove('hidden');
    return;
  }

  ytResultsDropdown.innerHTML = '';
  results.forEach(item => {
    const row = document.createElement('div');
    row.className = 'yt-result-item';
    row.innerHTML = `
      <img src="${item.thumbnail}" alt="thumb">
      <div style="display:flex; flex-direction:column; overflow:hidden; flex:1;">
        <span class="yt-result-title" title="${item.title}">${item.title}</span>
        <span style="font-size:9px; color:rgba(255,255,255,0.45); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${item.author || 'YouTube Music'}</span>
      </div>
    `;
    row.addEventListener('click', (e) => {
      e.stopPropagation();
      playSong(item, true);
      closeSearchDropdown();
    });
    ytResultsDropdown.appendChild(row);
  });
  ytResultsDropdown.classList.remove('hidden');
}

function closeSearchDropdown() {
  ytResultsDropdown.classList.add('hidden');
}

btnYtSearch.addEventListener('click', (e) => {
  e.stopPropagation();
  handleSearch();
});

ytSearchInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    e.stopPropagation();
    handleSearch();
  }
});

stationChips.forEach(chip => {
  chip.addEventListener('click', (e) => {
    e.stopPropagation();
    const query = chip.dataset.search;
    ytSearchInput.value = query;
    triggerSearchAndPlayFirst(query);
  });
});

async function triggerSearchAndPlayFirst(query) {
  try {
    const results = await window.notchAPI.searchYouTube(query);
    if (results && results.length > 0) {
      playSong(results[0], true);
    }
  } catch (e) {}
}

// ----------------------------------------------------
// 5. VISUALIZER CANVAS
// ----------------------------------------------------
function drawVisualizer() {
  visualizerAnimationFrame = requestAnimationFrame(drawVisualizer);
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const barCount = 10;
  const barWidth = 3;
  const gap = 3;

  for (let i = 0; i < barCount; i++) {
    let barHeight = 2;
    if (isPlaying) {
      const time = Date.now() / 140;
      const wave = Math.sin(time + i * 0.8) * Math.cos(time * 0.5 + i);
      barHeight = Math.max(2, Math.abs(wave) * canvas.height * 0.95);
    }

    const x = i * (barWidth + gap);
    const y = canvas.height - barHeight;

    const gradient = ctx.createLinearGradient(0, y, 0, canvas.height);
    gradient.addColorStop(0, '#ff0033');
    gradient.addColorStop(1, '#ff5e3a');

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.roundRect(x, y, barWidth, barHeight, 1.5);
    ctx.fill();
  }
}
drawVisualizer();

// ----------------------------------------------------
// 6. EXPANSION & COLLAPSE LOGIC
// ----------------------------------------------------
function expandNotch() {
  if (isExpanded) return;
  isExpanded = true;
  clearTimeout(collapseTimeout);
  notchContainer.classList.remove('collapsed');
  window.notchAPI.setNotchState({ expanded: true, pinned: isPinned });
}

function collapseNotch() {
  if (!isExpanded || isPinned) return;
  isExpanded = false;
  closeSearchDropdown();
  notchContainer.classList.add('collapsed');
  window.notchAPI.setNotchState({ expanded: false, pinned: false });
}

collapsedView.addEventListener('click', () => {
  expandNotch();
});

notchContainer.addEventListener('mouseenter', () => {
  clearTimeout(collapseTimeout);
  if (!isExpanded) {
    expandNotch();
  }
});

notchContainer.addEventListener('mouseleave', () => {
  if (isExpanded && !isPinned) {
    collapseTimeout = setTimeout(() => {
      collapseNotch();
    }, 400);
  }
});

btnPin.addEventListener('click', (e) => {
  e.stopPropagation();
  isPinned = !isPinned;
  btnPin.classList.toggle('active', isPinned);
  window.notchAPI.setNotchState({ expanded: isExpanded, pinned: isPinned });
});

btnCollapse.addEventListener('click', (e) => {
  e.stopPropagation();
  isPinned = false;
  btnPin.classList.remove('active');
  collapseNotch();
});

btnStyleToggle.addEventListener('click', (e) => {
  e.stopPropagation();
  isIslandMode = !isIslandMode;
  if (isIslandMode) {
    document.body.classList.remove('notch-mode');
    document.body.classList.add('island-mode');
    btnStyleToggle.classList.add('active');
  } else {
    document.body.classList.remove('island-mode');
    document.body.classList.add('notch-mode');
    btnStyleToggle.classList.remove('active');
  }
});

if (window.notchAPI?.onToggleShortcut) {
  window.notchAPI.onToggleShortcut((newExpandedState) => {
    if (newExpandedState) {
      expandNotch();
    } else {
      collapseNotch();
    }
  });
}

// ----------------------------------------------------
// 7. TAB SWITCHING
// ----------------------------------------------------
tabButtons.forEach(btn => {
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    const tabName = btn.dataset.tab;

    tabButtons.forEach(b => b.classList.remove('active'));
    tabContents.forEach(c => c.classList.remove('active'));

    btn.classList.add('active');
    const targetContent = document.getElementById(`tab-${tabName}`);
    if (targetContent) targetContent.classList.add('active');

    if (tabName === 'hud') {
      updateSystemHUD();
    }
  });
});

// ----------------------------------------------------
// 8. MINI CLOCK & BATTERY
// ----------------------------------------------------
function updateClock() {
  const now = new Date();
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const timeStr = `${hours}:${minutes}`;
  
  const miniClock = document.getElementById('mini-clock');
  if (miniClock) miniClock.textContent = timeStr;
}
setInterval(updateClock, 1000);
updateClock();

async function initBattery() {
  if ('getBattery' in navigator) {
    try {
      const battery = await navigator.getBattery();
      const updateBatteryInfo = () => {
        const pct = Math.round(battery.level * 100);
        const charging = battery.charging;

        const miniPct = document.getElementById('mini-battery-pct');
        const miniFill = document.getElementById('mini-battery-fill');
        if (miniPct) miniPct.textContent = `${pct}%`;
        if (miniFill) {
          miniFill.style.width = `${pct}%`;
          miniFill.style.background = charging ? '#0a84ff' : (pct <= 20 ? '#ff453a' : '#30d158');
        }

        const hudPct = document.getElementById('hud-battery-pct');
        const hudBar = document.getElementById('hud-battery-bar');
        const hudStatus = document.getElementById('hud-charging-status');

        if (hudPct) hudPct.textContent = `${pct}%`;
        if (hudBar) {
          hudBar.style.width = `${pct}%`;
          hudBar.style.background = charging ? '#0a84ff' : (pct <= 20 ? '#ff453a' : '#30d158');
        }
        if (hudStatus) {
          hudStatus.textContent = charging ? '⚡ Charging' : 'On Battery';
        }
      };

      updateBatteryInfo();
      battery.addEventListener('levelchange', updateBatteryInfo);
      battery.addEventListener('chargingchange', updateBatteryInfo);
    } catch (e) {}
  }
}
initBattery();

// ----------------------------------------------------
// 9. FILE SHELF (DROP TRAY)
// ----------------------------------------------------
const dropZone = document.getElementById('drop-zone');
const shelfList = document.getElementById('shelf-list');
const shelfBadge = document.getElementById('shelf-badge');
const btnClearShelf = document.getElementById('btn-clear-shelf');

['dragenter', 'dragover'].forEach(name => {
  dropZone.addEventListener(name, (e) => {
    e.preventDefault();
    e.stopPropagation();
    dropZone.classList.add('dragover');
  });
});

['dragleave', 'drop'].forEach(name => {
  dropZone.addEventListener(name, (e) => {
    e.preventDefault();
    e.stopPropagation();
    dropZone.classList.remove('dragover');
  });
});

dropZone.addEventListener('drop', (e) => {
  const files = Array.from(e.dataTransfer.files);
  if (files.length > 0) {
    files.forEach(f => {
      shelfFiles.unshift({
        name: f.name,
        path: f.path,
        size: f.size
      });
    });
    renderShelf();
  }
});

function formatFileSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function renderShelf() {
  shelfList.innerHTML = '';

  if (shelfFiles.length === 0) {
    shelfList.innerHTML = `
      <div class="empty-shelf-placeholder-mini">
        <span>No staged files yet</span>
      </div>
    `;
    shelfBadge.classList.add('hidden');
    return;
  }

  shelfBadge.textContent = shelfFiles.length;
  shelfBadge.classList.remove('hidden');

  shelfFiles.forEach((file, index) => {
    const item = document.createElement('div');
    item.className = 'shelf-item';
    item.innerHTML = `
      <div style="display: flex; flex-direction: column; overflow: hidden;">
        <span class="shelf-file-name" title="${file.path}">${file.name}</span>
        <span class="shelf-file-size">${formatFileSize(file.size)}</span>
      </div>
      <div style="display: flex; gap: 4px;">
        <button class="shelf-action-btn btn-open">Open</button>
        <button class="shelf-action-btn btn-folder">Folder</button>
        <button class="shelf-action-btn btn-remove">✕</button>
      </div>
    `;

    item.querySelector('.btn-open').addEventListener('click', () => {
      window.notchAPI.openPath(file.path);
    });

    item.querySelector('.btn-folder').addEventListener('click', () => {
      window.notchAPI.showInFolder(file.path);
    });

    item.querySelector('.btn-remove').addEventListener('click', () => {
      shelfFiles.splice(index, 1);
      renderShelf();
    });

    shelfList.appendChild(item);
  });
}

btnClearShelf.addEventListener('click', () => {
  shelfFiles = [];
  renderShelf();
});

// ----------------------------------------------------
// 10. SYSTEM HUD
// ----------------------------------------------------
async function updateSystemHUD() {
  if (window.notchAPI?.getSystemInfo) {
    try {
      const info = await window.notchAPI.getSystemInfo();
      const hudRamPct = document.getElementById('hud-ram-pct');
      const hudRamBar = document.getElementById('hud-ram-bar');
      const hudRamText = document.getElementById('hud-ram-text');

      if (hudRamPct) hudRamPct.textContent = `${info.memUsagePercent}%`;
      if (hudRamBar) hudRamBar.style.width = `${info.memUsagePercent}%`;
      if (hudRamText) hudRamText.textContent = `${info.usedMemGB}G / ${info.totalMemGB}G`;
    } catch (e) {}
  }
}
