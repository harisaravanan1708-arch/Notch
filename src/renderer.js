// State variables
let isExpanded = false;
let isPinned = false;
let isIslandMode = false;
let shelfFiles = [];
let collapseTimeout = null;

// YouTube Music State & Loop-Free Queue Engine
let ytPlayer = null;
let ytPlayerReady = false;
let isPlaying = false;
let currentTrack = null;
let upcomingQueue = [];
let historyQueue = [];
let playedSongIds = new Set(); // Prevents repeating same 2-3 songs!
let fallbackAttempted = new Set(); // Tracks failed/restricted video IDs
let consecutiveErrorSkips = 0; // Prevents infinite loop while allowing smooth skip of restricted tracks
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

// System Notifications Elements & State
let systemNotifications = [];
let unreadNotifCount = 0;
let popupHideTimeout = null;
const notifBadge = document.getElementById('notif-badge');
const notifCountPill = document.getElementById('notif-count-pill');
const notifItemsList = document.getElementById('notif-items-list');
const btnClearNotifs = document.getElementById('btn-clear-notifs');
const btnTestNotif = document.getElementById('btn-test-notif');
const notifPopupBanner = document.getElementById('notif-popup-banner');
const popupApp = document.getElementById('popup-app');
const popupTitle = document.getElementById('popup-title');
const popupBody = document.getElementById('popup-body');
const btnDismissPopup = document.getElementById('btn-dismiss-popup');

// Dynamic Island Alert Elements
let islandDismissTimeout = null;
const alertIslandView = document.getElementById('alert-island-view');
const islandSquircle = document.getElementById('island-squircle');
const islandGlyph = document.getElementById('island-glyph');
const islandBadgeDot = document.getElementById('island-badge-dot');
const islandTitle = document.getElementById('island-title');
const islandBody = document.getElementById('island-body');
const islandSubIcon = document.getElementById('island-sub-icon');
const islandSubText = document.getElementById('island-sub-text');
const islandTime = document.getElementById('island-time');
const islandApp = document.getElementById('island-app');
const btnDismissIsland = document.getElementById('btn-dismiss-island');

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
      playedSongIds.add(initialSong.id);
      appendSuggestionsForTrack(initialSong.id);
      initialTrendingLoaded = true;
    }
  } catch (err) {
    console.error('Initial trending error:', err);
  }

  ytPlayer = new YT.Player('yt-player', {
    height: '80',
    width: '140',
    videoId: initialSong ? initialSong.id : '',
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
      prepareSongUI(chosen);
      playedSongIds.add(chosen.id);
      appendSuggestionsForTrack(chosen.id);
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
  if (playerStatusBadge) {
    playerStatusBadge.textContent = 'Paused';
  }

  if (ytPlayer && ytPlayerReady && ytPlayer.cueVideoById) {
    ytPlayer.cueVideoById(song.id);
  }
}

async function playSong(song, isUserInitiated = false) {
  if (!song) return;

  // Reset progress UI initially so 0:01 isn't falsely shown
  if (currentTimeEl) currentTimeEl.textContent = '0:00';
  if (durationTimeEl) durationTimeEl.textContent = '0:00';
  if (progressFill) progressFill.style.width = '0%';

  // Mark as played so this song is never re-queued or looped
  playedSongIds.add(song.id);

  if (currentTrack && currentTrack.id !== song.id) {
    historyQueue.push(currentTrack);
    if (historyQueue.length > 30) historyQueue.shift();
  }

  currentTrack = song;
  trackTitleEl.textContent = song.title;
  trackTitleEl.title = song.title;
  trackArtistEl.textContent = song.author || "YouTube Music Stream";
  if (miniNowPlaying) {
    miniNowPlaying.textContent = song.title.substring(0, 16);
  }

  loadThumbnail(song.id);

  if (playerStatusBadge) playerStatusBadge.textContent = 'Loading...';
  isPlaying = true;
  if (playIcon) playIcon.classList.add('hidden');
  if (pauseIcon) pauseIcon.classList.remove('hidden');

  if (ytPlayer && ytPlayerReady && ytPlayer.loadVideoById) {
    try {
      ytPlayer.loadVideoById(song.id);
      ytPlayer.playVideo();
    } catch (e) {
      console.error(e);
    }
  }

  // If user searched a new song, reset queue with that song's suggestions
  if (isUserInitiated) {
    upcomingQueue = [];
    await appendSuggestionsForTrack(song.id);
  } else {
    // Only append more if upcomingQueue is running low (< 5 songs)
    if (upcomingQueue.length < 5) {
      appendSuggestionsForTrack(song.id);
    }
  }
}

async function appendSuggestionsForTrack(videoId) {
  try {
    const suggested = await window.notchAPI.getYtMix(videoId);
    if (suggested && suggested.length > 0) {
      const existingQueueIds = new Set(upcomingQueue.map(s => s.id));
      // Strictly exclude current song, already played songs, and songs already in upcomingQueue
      const freshTracks = suggested.filter(s => 
        s.id !== videoId && 
        !playedSongIds.has(s.id) && 
        !existingQueueIds.has(s.id)
      );

      upcomingQueue.push(...freshTracks);
      console.log(`[Queue Manager] Appended ${freshTracks.length} fresh unplayed tracks. Queue size: ${upcomingQueue.length}`);
    }
  } catch (err) {
    console.error('Error appending suggestions:', err);
  }
}

// Play Next Song (Used by ⏭ button & on song finish to play one by one)
async function playNextSong() {
  if (playerStatusBadge) playerStatusBadge.textContent = 'Playing';

  // Filter out any songs in upcomingQueue that were already played or failed
  upcomingQueue = upcomingQueue.filter(s => !playedSongIds.has(s.id) && !fallbackAttempted.has(s.id));

  if (upcomingQueue.length > 0) {
    const nextSong = upcomingQueue.shift();
    playSong(nextSong, false);
  } else if (currentTrack) {
    // Queue is empty: fetch fresh suggestions for the current song
    await appendSuggestionsForTrack(currentTrack.id);
    // Ensure fresh suggestions are cleaned
    upcomingQueue = upcomingQueue.filter(s => !playedSongIds.has(s.id) && !fallbackAttempted.has(s.id));
    if (upcomingQueue.length > 0) {
      const nextSong = upcomingQueue.shift();
      playSong(nextSong, false);
      return;
    }

    // Fallback: fetch today's trending songs, filtering out played and restricted
    const trending = await window.notchAPI.getTrendingSongs();
    const unplayed = (trending || []).filter(s => !playedSongIds.has(s.id) && !fallbackAttempted.has(s.id));
    if (unplayed.length > 0) {
      const next = unplayed[0];
      upcomingQueue = unplayed.slice(1);
      playSong(next, false);
    } else {
      // If entire catalog was played, clear played set to allow fresh loop
      playedSongIds.clear();
      if (trending && trending.length > 0) {
        const cleanPool = trending.filter(s => !fallbackAttempted.has(s.id));
        if (cleanPool.length > 0) {
          playSong(cleanPool[0], false);
        }
      }
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

  // Filter history from restricted tracks
  historyQueue = historyQueue.filter(s => !fallbackAttempted.has(s.id));

  if (historyQueue.length > 0) {
    const prevSong = historyQueue.pop();
    if (currentTrack && !fallbackAttempted.has(currentTrack.id)) {
      upcomingQueue.unshift(currentTrack);
    }
    playSong(prevSong, false);
  } else if (ytPlayer && ytPlayerReady && ytPlayer.seekTo) {
    ytPlayer.seekTo(0, true);
  }
}

function onPlayerStateChange(event) {
  console.log('[YouTube State]:', event.data);

  if (event.data === YT.PlayerState.PLAYING) {
    consecutiveErrorSkips = 0; // Reset skip count on successful playback
    isPlaying = true;
    playIcon.classList.add('hidden');
    pauseIcon.classList.remove('hidden');
    miniEqualizer.classList.add('playing');
    albumArt.classList.add('playing');
    if (playerStatusBadge) {
      playerStatusBadge.textContent = 'Playing';
    }
    startProgressTracking();
  } else if (event.data === YT.PlayerState.PAUSED) {
    isPlaying = false;
    playIcon.classList.remove('hidden');
    pauseIcon.classList.add('hidden');
    miniEqualizer.classList.remove('playing');
    albumArt.classList.remove('playing');
    if (playerStatusBadge) {
      playerStatusBadge.textContent = 'Paused';
    }
  } else if (event.data === YT.PlayerState.BUFFERING) {
    if (playerStatusBadge) {
      playerStatusBadge.textContent = 'Loading...';
    }
  } else if (event.data === YT.PlayerState.ENDED) {
    console.log('[YouTube Player] Song ended normally. Playing next song...');
    playNextSong();
  }
}

function onPlayerError(event) {
  const errCode = event.data;
  console.warn('[YouTube Error Code]:', errCode, 'Track:', currentTrack?.title);

  const trackId = currentTrack ? currentTrack.id : null;
  if (trackId) {
    fallbackAttempted.add(trackId);
    upcomingQueue = upcomingQueue.filter(s => s.id !== trackId);
  }

  // Error codes:
  // 150 / 101: Embedding disabled by video owner (VEVO / Music Labels)
  // 100: Video not found or private
  // 2 / 5: Invalid parameter
  if (errCode === 150 || errCode === 101 || errCode === 100 || errCode === 2 || errCode === 5) {
    if (consecutiveErrorSkips < 4) {
      consecutiveErrorSkips++;
      console.warn(`[Player] Track "${currentTrack?.title}" is embed-restricted (${errCode}). Skipping to next playable track (attempt ${consecutiveErrorSkips}/4)...`);
      playNextSong();
      return;
    }
  }

  // If 4 consecutive songs failed, halt safely and show Paused
  consecutiveErrorSkips = 0;
  isPlaying = false;
  playIcon.classList.remove('hidden');
  pauseIcon.classList.add('hidden');
  miniEqualizer.classList.remove('playing');
  albumArt.classList.remove('playing');
  if (playerStatusBadge) {
    playerStatusBadge.textContent = 'Paused';
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
  consecutiveErrorSkips = 0;
  playPrevSong();
});

btnNext.addEventListener('click', (e) => {
  e.stopPropagation();
  consecutiveErrorSkips = 0;
  playNextSong();
});

// Progress Bar & Duration
function startProgressTracking() {
  if (progressInterval) clearInterval(progressInterval);
  progressInterval = setInterval(() => {
    if (ytPlayer && ytPlayerReady && isPlaying) {
      const cur = ytPlayer.getCurrentTime ? (ytPlayer.getCurrentTime() || 0) : 0;
      const dur = ytPlayer.getDuration ? (ytPlayer.getDuration() || 0) : 0;
      const pct = dur > 0 ? (cur / dur) * 100 : 0;

      progressFill.style.width = `${pct}%`;
      currentTimeEl.textContent = formatTime(cur);
      durationTimeEl.textContent = dur > 0 ? formatTime(dur) : '0:00';
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
    if (results && results.length > 0) {
      renderSearchResults(results);
    }
  } catch (err) {
    console.error(err);
  } finally {
    btnYtSearch.textContent = 'Find';
  }
}

// Live suggestions as user types (Strictly 2 song suggestions like YouTube Music)
let searchDebounceTimer = null;
ytSearchInput.addEventListener('input', (e) => {
  const text = e.target.value.trim();
  clearTimeout(searchDebounceTimer);

  if (text.length < 2) {
    closeSearchDropdown();
    return;
  }

  searchDebounceTimer = setTimeout(async () => {
    try {
      const results = await window.notchAPI.searchYouTube(text);
      if (results && results.length > 0) {
        renderSearchResults(results);
      } else {
        closeSearchDropdown();
      }
    } catch (err) {}
  }, 220);
});

function renderSearchResults(results) {
  if (!results || results.length === 0) {
    closeSearchDropdown();
    return;
  }

  // Exactly 2 suggestions matching search text, just like YouTube Music
  const suggestions = results.slice(0, 2);

  ytResultsDropdown.innerHTML = '';
  suggestions.forEach(item => {
    const row = document.createElement('div');
    row.className = 'yt-result-item';
    row.innerHTML = `
      <img src="${item.thumbnail}" alt="thumb">
      <div style="display:flex; flex-direction:column; overflow:hidden; flex:1;">
        <span class="yt-result-title" title="${item.title}">${item.title}</span>
        <span style="font-size:9px; color:rgba(255,255,255,0.5); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${item.author || 'YouTube Music'}</span>
      </div>
      <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" style="opacity:0.6; margin-left:6px; flex-shrink:0;"><polygon points="5 3 19 12 5 21 5 3"/></svg>
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

// Close search dropdown on click outside
document.addEventListener('click', (e) => {
  if (!e.target.closest('.yt-search-wrapper')) {
    closeSearchDropdown();
  }
});

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
  if (!isExpanded) return; // Save CPU & battery while collapsed
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
  if (typeof islandDismissTimeout !== 'undefined') clearTimeout(islandDismissTimeout);
  notchContainer.classList.remove('alert-island-mode', 'amber', 'emerald', 'cyan');
  
  // 1. Instantly give room to the transparent window bounds
  window.notchAPI.setNotchState({ expanded: true, isAlert: false, pinned: isPinned });

  // 2. Trigger the GPU-accelerated Apple spring expand
  requestAnimationFrame(() => {
    notchContainer.classList.remove('collapsed');
  });
}

function collapseNotch() {
  if (!isExpanded || isPinned) return;
  isExpanded = false;
  closeSearchDropdown();
  if (typeof islandDismissTimeout !== 'undefined') clearTimeout(islandDismissTimeout);

  // 1. Smoothly slide up into the top screen bezel
  notchContainer.classList.add('collapsed');

  // 2. Shrink native OS window bounds AFTER the CSS slide-up transition finishes
  clearTimeout(collapseTimeout);
  collapseTimeout = setTimeout(() => {
    if (!isExpanded && !isPinned) {
      notchContainer.classList.remove('alert-island-mode', 'amber', 'emerald', 'cyan');
      window.notchAPI.setNotchState({ expanded: false, isAlert: false, pinned: false });
    }
  }, 280);
}

if (collapsedView) {
  collapsedView.addEventListener('click', () => {
    expandNotch();
  });
}

notchContainer.addEventListener('mouseenter', () => {
  clearTimeout(collapseTimeout);
  // Never expand full notch while in compact Dynamic Island alert mode!
  if (notchContainer.classList.contains('alert-island-mode')) {
    return;
  }
  if (!isExpanded) {
    expandNotch();
  }
});

notchContainer.addEventListener('mouseleave', () => {
  // Never auto-collapse while in compact Dynamic Island alert mode!
  if (notchContainer.classList.contains('alert-island-mode')) {
    return;
  }
  if (isExpanded && !isPinned) {
    clearTimeout(collapseTimeout);
    collapseTimeout = setTimeout(() => {
      collapseNotch();
    }, 200);
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

if (window.notchAPI?.onTriggerExpand) {
  window.notchAPI.onTriggerExpand(() => {
    expandNotch();
  });
}

// ----------------------------------------------------
// 7. TAB SWITCHING
// ----------------------------------------------------
tabButtons.forEach(btn => {
  btn.addEventListener('click', async (e) => {
    e.stopPropagation();
    const tabName = btn.dataset.tab;

    tabButtons.forEach(b => b.classList.remove('active'));
    tabContents.forEach(c => c.classList.remove('active'));

    btn.classList.add('active');
    const targetContent = document.getElementById(`tab-${tabName}`);
    if (targetContent) targetContent.classList.add('active');

    if (tabName === 'hud') {
      updateSystemHUD();
    } else if (tabName === 'clips') {
      if (window.notchAPI?.getClipboardHistory) {
        try {
          const fresh = await window.notchAPI.getClipboardHistory();
          if (Array.isArray(fresh)) {
            clipboardItems = fresh;
            renderClipboardList();
          }
        } catch (err) {}
      }
    } else if (tabName === 'notifications') {
      unreadNotifCount = 0;
      if (notifBadge) notifBadge.classList.add('hidden');
      if (window.notchAPI?.getNotifications) {
        try {
          const fresh = await window.notchAPI.getNotifications();
          if (fresh && Array.isArray(fresh)) {
            systemNotifications = fresh;
            systemNotifications.sort((a, b) => b.time - a.time);
          }
        } catch (err) {}
      }
      renderNotificationList();
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
        const hudStatus = document.getElementById('hud-charging-status');

        if (hudPct) hudPct.textContent = `${pct}%`;
        if (hudStatus) {
          hudStatus.textContent = charging ? '⚡ CHARGING' : 'ON BATTERY';
        }
        for (let i = 1; i <= 4; i++) {
          const cell = document.getElementById(`bat-cell-${i}`);
          if (cell) {
            if (pct >= (i * 25 - 15)) {
              cell.classList.add('active');
            } else {
              cell.classList.remove('active');
            }
          }
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
// 10. SYSTEM HUD (SCI-FI GAMING CONSOLE TELEMETRY)
// ----------------------------------------------------
async function updateSystemHUD() {
  if (window.notchAPI?.getSystemInfo) {
    try {
      const info = await window.notchAPI.getSystemInfo();

      // 1. Holographic Radar center readout (CPU Load & Clock Speed)
      const hudCpuPct = document.getElementById('hud-cpu-pct');
      const hudCpuGhz = document.getElementById('hud-cpu-ghz');
      if (hudCpuPct) hudCpuPct.textContent = `${info.cpuUsagePercent || 13}%`;
      if (hudCpuGhz) hudCpuGhz.textContent = `${info.cpuSpeedGHz || '3.40'} GHz`;

      // 2. Task Manager Performance specs (RAM Usage & Composition)
      const hudRamPct = document.getElementById('hud-ram-pct');
      const hudRamBar = document.getElementById('hud-ram-bar');
      const hudRamText = document.getElementById('hud-ram-text');

      if (hudRamPct) {
        hudRamPct.textContent = `${info.memUsagePercent}%`;
        hudRamPct.style.color = info.memUsagePercent > 85 ? '#f59e0b' : '#ffffff';
      }
      if (hudRamBar) hudRamBar.style.width = `${info.memUsagePercent}%`;
      if (hudRamText) hudRamText.textContent = `${info.usedMemGB} / ${info.totalMemGB} GB`;

      // 3. Disk & Hardware details
      const hudDiskText = document.getElementById('hud-disk-text');
      const hudDiskBar = document.getElementById('hud-disk-bar');
      if (hudDiskText) hudDiskText.textContent = `SSD NVMe (${info.diskUsagePercent || 85}%)`;
      if (hudDiskBar) hudDiskBar.style.width = `${info.diskUsagePercent || 85}%`;

      // 4. System Uptime
      const hudUptimeVal = document.getElementById('hud-uptime-val');
      if (hudUptimeVal) hudUptimeVal.textContent = `UP: ${info.uptimeHours}h`;
    } catch (e) {}
  }
}

// Keep live telemetry ticking when HUD tab is open
setInterval(() => {
  const hudTab = document.getElementById('tab-hud');
  if (hudTab && hudTab.classList.contains('active')) {
    updateSystemHUD();
  }
}, 2500);

// ========================================================
// 11. SYSTEM NOTIFICATIONS CONTROLLER (GLASS STYLE)
// ========================================================
let currentAlertFilter = 'all';
const pillCountNeeds = document.getElementById('pill-count-needs');
const pillCountWorking = document.getElementById('pill-count-working');
const pillCountDone = document.getElementById('pill-count-done');
const alertsCounter = document.getElementById('alerts-counter');

function categorizeNotification(notif) {
  const combined = ((notif.title || '') + ' ' + (notif.body || '')).toLowerCase();

  // 1. Done (Success / Completed / Finished)
  if (combined.includes('finish') || combined.includes('done') || combined.includes('complete') || combined.includes('success') || combined.includes('connected')) {
    return {
      type: 'done',
      glyph: '✱',
      badge: '✓',
      subIcon: '✓',
      subClass: 'emerald',
      cardClass: 'emerald',
      squircleClass: 'emerald',
      badgeClass: 'emerald'
    };
  }

  // 2. Needs you (Attention / Warning / Low memory / Error / Allow / Action)
  if (combined.includes('low') || combined.includes('error') || combined.includes('fail') || combined.includes('warning') || combined.includes('allow') || combined.includes('need') || combined.includes('action') || combined.includes('alert') || combined.includes('update') || combined.includes('tax') || combined.includes('checkout')) {
    return {
      type: 'needs_you',
      glyph: '>_',
      badge: '!',
      subIcon: '🔔',
      subClass: 'amber',
      cardClass: 'amber',
      squircleClass: 'amber',
      badgeClass: 'amber'
    };
  }

  // 3. Working (Active / In progress)
  return {
    type: 'working',
    glyph: '●',
    badge: '•',
    subIcon: '⚡',
    subClass: 'cyan',
    cardClass: 'cyan',
    squircleClass: 'cyan',
    badgeClass: 'cyan'
  };
}

function getAppLogoHtml(appName, title, body) {
  const norm = `${appName || ''} ${title || ''} ${body || ''}`.toLowerCase();

  // 1. Antigravity
  if (norm.includes('antigravity')) {
    return '<img src="assets/app-icons/antigravity.png" class="app-logo-img" alt="Antigravity">';
  }

  // 2. Notch Dude
  if (norm.includes('notch dude') || norm.includes('notch')) {
    return '<img src="assets/logo.gif" class="app-logo-img" alt="Notch Dude">';
  }

  // 3. Microsoft Defender / Windows Security
  if (norm.includes('defender') || norm.includes('windows security') || norm.includes('security') || norm.includes('antivirus') || norm.includes('threat')) {
    return `
      <svg class="app-logo-svg" viewBox="0 0 24 24" fill="none">
        <path d="M12 2L4 5V11.5C4 16.5 7.5 21 12 22C16.5 21 20 16.5 20 11.5V5L12 2Z" fill="url(#defGrad)" stroke="#60a5fa" stroke-width="1.2"/>
        <path d="M7.5 11.5L10.5 14.5L16.5 8.5" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        <defs>
          <linearGradient id="defGrad" x1="4" y1="2" x2="20" y2="22" gradientUnits="userSpaceOnUse">
            <stop stop-color="#1d4ed8"/>
            <stop offset="1" stop-color="#0284c7"/>
          </linearGradient>
        </defs>
      </svg>
    `;
  }

  // 4. Power & Battery / Charger
  if (norm.includes('battery') || norm.includes('power') || norm.includes('plug') || norm.includes('energy')) {
    return `
      <svg class="app-logo-svg" viewBox="0 0 24 24" fill="none">
        <rect x="2" y="6" width="16" height="12" rx="2.5" stroke="#38bdf8" stroke-width="1.6" fill="rgba(56, 189, 248, 0.15)"/>
        <rect x="4.5" y="8.5" width="8" height="7" rx="1.2" fill="#38bdf8"/>
        <path d="M20.5 10V14" stroke="#38bdf8" stroke-width="1.8" stroke-linecap="round"/>
        <path d="M10 8L7.5 12H10.5L9 16" stroke="#ffffff" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    `;
  }

  // 5. OpenVPN / VPN
  if (norm.includes('openvpn') || norm.includes('vpn') || norm.includes('wireguard')) {
    return `
      <svg class="app-logo-svg" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="10" fill="#ea580c"/>
        <circle cx="12" cy="10" r="3.2" fill="#ffffff"/>
        <path d="M9.5 12.5L12 17L14.5 12.5" fill="#ffffff"/>
        <circle cx="12" cy="10" r="1.4" fill="#ea580c"/>
      </svg>
    `;
  }

  // 6. Microsoft Edge
  if (norm.includes('edge') || norm.includes('microsoft edge')) {
    return `
      <svg class="app-logo-svg" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="10" fill="url(#edgeGrad)"/>
        <path d="M12 4C7.58 4 4 7.58 4 12C4 16.42 7.58 20 12 20C15.5 20 18.5 17.7 19.5 14.5C18 16 15.5 16.5 13.5 15.5C11.5 14.5 10.5 12.5 11.5 10.5C12.5 8.5 14.5 7.5 17 8C15.6 5.5 12.5 4 12 4Z" fill="#ffffff" fill-opacity="0.95"/>
        <defs>
          <linearGradient id="edgeGrad" x1="4" y1="4" x2="20" y2="20" gradientUnits="userSpaceOnUse">
            <stop stop-color="#0284c7"/>
            <stop offset="1" stop-color="#10b981"/>
          </linearGradient>
        </defs>
      </svg>
    `;
  }

  // 7. Google Chrome
  if (norm.includes('chrome')) {
    return `
      <svg class="app-logo-svg" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="4.2" fill="#ffffff"/>
        <circle cx="12" cy="12" r="3" fill="#1a73e8"/>
        <path d="M12 2C8.3 2 5.1 4 3.4 7L7.8 14.5C8.3 11.2 11.1 8.6 14.6 8.6H21C19.1 4.7 15.8 2 12 2Z" fill="#ea4335"/>
        <path d="M21.9 9.3H13.2C14.7 10.2 15.6 11.8 15.6 13.7C15.6 14.7 15.3 15.6 14.7 16.4L18.4 22.8C20.6 20.3 22 17 22 13.3C22 11.9 21.6 10.5 21.9 9.3Z" fill="#fbbc04"/>
        <path d="M12 22C14.6 22 17 21 18.8 19.4L14.4 11.9C13.9 14.6 11.6 16.7 8.8 16.7C7.6 16.7 6.5 16.3 5.6 15.6L2.1 21.7C4.8 23.8 8.2 25 12 22Z" fill="#34a853"/>
      </svg>
    `;
  }

  // 8. Visual Studio Code / Code
  if (norm.includes('visual studio') || norm.includes('vscode') || norm.includes('code')) {
    return `
      <svg class="app-logo-svg" viewBox="0 0 24 24" fill="none">
        <path d="M17.5 2L6.5 10.5L2 7V17L6.5 13.5L17.5 22L22 19.8V4.2L17.5 2Z" fill="#007acc"/>
        <path d="M17.5 2L8.5 9.5L17.5 17V2Z" fill="#38bdf8"/>
        <path d="M17.5 17L8.5 9.5L6.5 10.5L17.5 22V17Z" fill="#0284c7"/>
        <path d="M2 7L6.5 10.5L2 14V7Z" fill="#0369a1"/>
      </svg>
    `;
  }

  // 9. Discord
  if (norm.includes('discord')) {
    return `
      <svg class="app-logo-svg" viewBox="0 0 24 24" fill="#5865F2">
        <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.929 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.894.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
      </svg>
    `;
  }

  // 10. Slack
  if (norm.includes('slack')) {
    return `
      <svg class="app-logo-svg" viewBox="0 0 24 24">
        <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313z" fill="#E01E5A"/>
        <path d="M8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312z" fill="#36C5F0"/>
        <path d="M18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312z" fill="#2EB67D"/>
        <path d="M15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zM15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z" fill="#ECB22E"/>
      </svg>
    `;
  }

  // 11. WhatsApp
  if (norm.includes('whatsapp')) {
    return `
      <svg class="app-logo-svg" viewBox="0 0 24 24" fill="#25D366">
        <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91C2.13 13.66 2.59 15.36 3.45 16.86L2.05 22L7.3 20.62C8.75 21.41 10.38 21.83 12.04 21.83C17.5 21.83 21.95 17.38 21.95 11.92C21.95 9.27 20.92 6.78 19.05 4.91C17.18 3.03 14.69 2 12.04 2M12.04 3.67C14.25 3.67 16.31 4.53 17.87 6.09C19.42 7.65 20.28 9.72 20.28 11.92C20.28 16.46 16.58 20.16 12.04 20.16C10.67 20.16 9.33 19.8 8.16 19.11L7.88 18.94L4.76 19.76L5.59 16.71L5.4 16.4C4.65 15.2 4.25 13.58 4.25 11.91C4.25 7.37 7.95 3.67 12.04 3.67M9.22 7.42C9.04 7.42 8.75 7.49 8.5 7.76C8.25 8.03 7.55 8.68 7.55 10C7.55 11.32 8.52 12.6 8.65 12.77C8.78 12.94 10.5 15.75 13.2 16.82C15.46 17.71 15.92 17.54 16.4 17.5C16.88 17.45 17.96 16.86 18.18 16.23C18.4 15.6 18.4 15.06 18.34 14.95C18.28 14.84 18.13 14.77 17.9 14.66C17.67 14.54 16.55 13.99 16.34 13.92C16.14 13.84 15.99 13.8 15.84 14.03C15.69 14.25 15.26 14.77 15.13 14.92C15 15.06 14.87 15.08 14.64 14.97C14.41 14.85 13.68 14.61 12.81 13.84C12.13 13.24 11.67 12.5 11.54 12.27C11.41 12.04 11.53 11.92 11.64 11.81C11.74 11.71 11.87 11.54 11.98 11.41C12.1 11.28 12.14 11.19 12.21 11.04C12.29 10.89 12.25 10.76 12.19 10.65C12.13 10.54 11.69 9.45 11.5 9C11.33 8.56 11.15 8.62 11.01 8.61C10.88 8.61 10.73 8.6 10.58 8.6C10.43 8.6 10.18 8.65 9.97 8.89C9.76 9.12 9.22 9.63 9.22 10.65"/>
      </svg>
    `;
  }

  // 12. Telegram
  if (norm.includes('telegram')) {
    return `
      <svg class="app-logo-svg" viewBox="0 0 24 24" fill="#2AABEE">
        <circle cx="12" cy="12" r="10"/>
        <path d="M17.5 7.5L6.5 11.7L9.8 13.4L14.8 9.9L10.8 14.2L10.5 16.5L12.5 14.8L15.3 16.8L17.5 7.5Z" fill="#ffffff"/>
      </svg>
    `;
  }

  // 13. Spotify
  if (norm.includes('spotify')) {
    return `
      <svg class="app-logo-svg" viewBox="0 0 24 24" fill="#1DB954">
        <circle cx="12" cy="12" r="10"/>
        <path d="M16.5 15.5C16.3 15.8 15.9 15.9 15.6 15.7C13.4 14.4 10.5 14.1 6.8 15C6.4 15.1 6.1 14.8 6 14.5C5.9 14.1 6.2 13.8 6.5 13.7C10.5 12.8 13.8 13.1 16.3 14.6C16.6 14.8 16.7 15.2 16.5 15.5ZM17.6 12.6C17.3 13 16.8 13.1 16.4 12.9C13.9 11.3 10.1 10.9 6.8 11.9C6.3 12 5.9 11.7 5.7 11.3C5.6 10.8 5.8 10.4 6.3 10.2C10.1 9.1 14.3 9.5 17.2 11.3C17.5 11.5 17.7 12 17.6 12.6ZM17.7 9.6C14.7 7.8 9.7 7.6 6.8 8.5C6.3 8.7 5.8 8.4 5.6 7.9C5.4 7.4 5.8 6.9 6.2 6.7C9.7 5.7 15.2 5.8 18.7 7.9C19.1 8.1 19.3 8.7 19 9.1C18.8 9.5 18.2 9.7 17.7 9.6Z" fill="#000000"/>
      </svg>
    `;
  }

  // 14. YouTube / YT Music
  if (norm.includes('youtube') || norm.includes('yt music') || norm.includes('yt')) {
    return `
      <svg class="app-logo-svg" viewBox="0 0 24 24">
        <rect x="2" y="5" width="20" height="14" rx="4" fill="#FF0000"/>
        <polygon points="10,8.5 16,12 10,15.5" fill="#FFFFFF"/>
      </svg>
    `;
  }

  // 15. GitHub
  if (norm.includes('github') || norm.includes('git')) {
    return `
      <svg class="app-logo-svg" viewBox="0 0 24 24" fill="#FFFFFF">
        <path fill-rule="evenodd" clip-rule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/>
      </svg>
    `;
  }

  // 16. Terminal / Console / PowerShell / CMD
  if (norm.includes('terminal') || norm.includes('powershell') || norm.includes('cmd') || norm.includes('bash')) {
    return `
      <svg class="app-logo-svg" viewBox="0 0 24 24" fill="none">
        <rect x="2" y="4" width="20" height="16" rx="3" fill="#1e1e1e" stroke="rgba(255,255,255,0.25)" stroke-width="1.2"/>
        <path d="M6 9L10 12L6 15" stroke="#4ade80" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M12 15H17" stroke="#ffffff" stroke-width="1.8" stroke-linecap="round"/>
      </svg>
    `;
  }

  // 17. Windows / System / Settings
  if (norm.includes('windows') || norm.includes('system') || norm.includes('settings')) {
    return `
      <svg class="app-logo-svg" viewBox="0 0 24 24" fill="#0078D4">
        <path d="M3 3H10.5V10.5H3V3Z"/>
        <path d="M12 3H21V10.5H12V3Z"/>
        <path d="M3 12H10.5V21H3V12Z"/>
        <path d="M12 12H21V21H12V12Z"/>
      </svg>
    `;
  }

  // Default: Sleek Luxury Frosted Glass App Icon
  return `
    <svg class="app-logo-svg" viewBox="0 0 24 24" fill="none">
      <rect x="3" y="3" width="18" height="18" rx="5" stroke="rgba(255,255,255,0.35)" stroke-width="1.4" fill="rgba(255,255,255,0.06)"/>
      <path d="M12 8V12L15 14" stroke="#ffffff" stroke-width="1.6" stroke-linecap="round"/>
      <circle cx="12" cy="12" r="7" stroke="rgba(255,255,255,0.2)" stroke-width="1"/>
    </svg>
  `;
}

function timeAgo(ms) {
  if (!ms) return 'Just now';
  const diff = Date.now() - ms;
  if (diff <= 1000) return 'Just now';
  const secs = Math.floor(diff / 1000);
  if (secs < 60) return `${Math.max(1, secs)}s`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

function renderNotificationList() {
  if (!notifItemsList) return;

  const needsCount = systemNotifications.filter(n => categorizeNotification(n).type === 'needs_you').length;
  const workingCount = systemNotifications.filter(n => categorizeNotification(n).type === 'working').length;
  const doneCount = systemNotifications.filter(n => categorizeNotification(n).type === 'done').length;

  if (pillCountNeeds) pillCountNeeds.textContent = `${needsCount} needs you`;
  if (pillCountWorking) pillCountWorking.textContent = `${workingCount} working`;
  if (pillCountDone) pillCountDone.textContent = `${doneCount} done`;

  let filtered = systemNotifications;
  if (currentAlertFilter === 'needs_you') {
    filtered = systemNotifications.filter(n => categorizeNotification(n).type === 'needs_you');
  } else if (currentAlertFilter === 'working') {
    filtered = systemNotifications.filter(n => categorizeNotification(n).type === 'working');
  } else if (currentAlertFilter === 'done') {
    filtered = systemNotifications.filter(n => categorizeNotification(n).type === 'done');
  }

  if (alertsCounter) {
    const shown = Math.min(filtered.length, 3);
    alertsCounter.textContent = filtered.length > 0 ? `1-${shown} of ${filtered.length}` : '0 of 0';
  }

  if (filtered.length === 0) {
    notifItemsList.innerHTML = `
      <div class="notif-empty-state">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.35)" stroke-width="1.8"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>
        <span>No alerts in this category</span>
      </div>
    `;
    return;
  }

  notifItemsList.innerHTML = '';
  filtered.forEach(notif => {
    const styleInfo = categorizeNotification(notif);

    const card = document.createElement('div');
    card.className = `glass-alert-card ${styleInfo.cardClass}`;
    card.dataset.id = notif.id;

    // 1. Left Icon Squircle with Exact App Logo
    const leftCol = document.createElement('div');
    leftCol.className = 'glass-card-left';
    leftCol.innerHTML = `
      <div class="icon-squircle">
        <div class="app-logo-wrap">${getAppLogoHtml(notif.app, notif.title, notif.body)}</div>
      </div>
    `;

    // 2. Center Title & Subtitle
    const centerCol = document.createElement('div');
    centerCol.className = 'glass-card-center';

    const titleEl = document.createElement('div');
    titleEl.className = 'alert-card-title';
    titleEl.textContent = notif.title || notif.app || 'Alert';
    titleEl.title = notif.title || '';

    const subtitleEl = document.createElement('div');
    subtitleEl.className = 'alert-card-subtitle';
    subtitleEl.innerHTML = `<span class="sub-icon">${styleInfo.subIcon}</span> <span class="sub-text">${notif.body || 'Finished just now'}</span>`;

    centerCol.appendChild(titleEl);
    centerCol.appendChild(subtitleEl);

    // 3. Right Time & Folder/App Tag
    const rightCol = document.createElement('div');
    rightCol.className = 'glass-card-right';

    const timeEl = document.createElement('span');
    timeEl.className = 'alert-time-tag';
    timeEl.textContent = timeAgo(notif.time);

    const folderEl = document.createElement('span');
    folderEl.className = 'alert-folder-tag';
    folderEl.innerHTML = `📁 ${notif.app || 'system'}`;
    folderEl.title = notif.app || '';

    rightCol.appendChild(timeEl);
    rightCol.appendChild(folderEl);

    // 4. Dismiss Button
    const btnDismiss = document.createElement('button');
    btnDismiss.className = 'glass-card-dismiss-btn';
    btnDismiss.innerHTML = '&times;';
    btnDismiss.title = 'Dismiss';
    btnDismiss.addEventListener('click', (e) => {
      e.stopPropagation();
      dismissNotification(notif.id);
    });

    card.appendChild(leftCol);
    card.appendChild(centerCol);
    card.appendChild(rightCol);
    card.appendChild(btnDismiss);

    notifItemsList.appendChild(card);
  });
}

async function dismissNotification(id) {
  systemNotifications = systemNotifications.filter(n => String(n.id) !== String(id));
  renderNotificationList();
  if (window.notchAPI?.dismissNotification) {
    try {
      await window.notchAPI.dismissNotification(id);
    } catch (e) {}
  }
}

function showNotificationPopup(notif) {
  if (!notifPopupBanner) return;

  const styleInfo = categorizeNotification(notif);

  notifPopupBanner.className = 'glass-popup-card';

  const popupSquircle = document.getElementById('popup-squircle');
  const popupSubIcon = document.getElementById('popup-sub-icon');
  const popupSubText = document.getElementById('popup-sub-text');
  const popupTime = document.getElementById('popup-time');

  if (popupSquircle) {
    popupSquircle.className = 'icon-squircle';
    popupSquircle.innerHTML = `<div class="app-logo-wrap">${getAppLogoHtml(notif.app, notif.title, notif.body)}</div>`;
  }
  if (popupTitle) popupTitle.textContent = notif.title || notif.app || 'New Notification';
  if (popupBody) popupBody.className = 'alert-card-subtitle';
  if (popupSubIcon) popupSubIcon.textContent = styleInfo.subIcon;
  if (popupSubText) popupSubText.textContent = notif.body || 'Alert received';
  if (popupTime) popupTime.textContent = timeAgo(notif.time);
  if (popupApp) popupApp.innerHTML = `📁 ${notif.app || 'system'}`;

  notifPopupBanner.classList.remove('hidden');

  if (popupHideTimeout) clearTimeout(popupHideTimeout);
  popupHideTimeout = setTimeout(() => {
    notifPopupBanner.classList.add('hidden');
  }, 4800);
}

// Filter pills interaction
const filterPills = document.querySelectorAll('.status-filter-pill');
filterPills.forEach(pill => {
  pill.addEventListener('click', (e) => {
    e.stopPropagation();
    const filter = pill.dataset.filter;
    if (currentAlertFilter === filter) {
      currentAlertFilter = 'all';
      filterPills.forEach(p => p.classList.remove('active'));
    } else {
      currentAlertFilter = filter;
      filterPills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
    }
    renderNotificationList();
  });
});

if (btnDismissPopup) {
  btnDismissPopup.addEventListener('click', (e) => {
    e.stopPropagation();
    if (notifPopupBanner) notifPopupBanner.classList.add('hidden');
  });
}

if (btnClearNotifs) {
  btnClearNotifs.addEventListener('click', async (e) => {
    e.stopPropagation();
    systemNotifications = [];
    unreadNotifCount = 0;
    if (notifBadge) notifBadge.classList.add('hidden');
    renderNotificationList();
    if (window.notchAPI?.clearNotifications) {
      await window.notchAPI.clearNotifications();
    }
  });
}

let testIndex = 0;
if (btnTestNotif) {
  btnTestNotif.addEventListener('click', (e) => {
    e.stopPropagation();
    const testSamples = [
      {
        id: 'sample-' + Date.now() + '-1',
        app: 'Antigravity',
        title: 'Antigravity',
        body: 'Agent finished: Windows Dynamic Island Implementation',
        time: Date.now() - 20000
      },
      {
        id: 'sample-' + Date.now() + '-2',
        app: 'Windows Security',
        title: 'Microsoft Defender summary',
        body: 'Microsoft Defender Antivirus did not find any threats',
        time: Date.now() - 12000
      },
      {
        id: 'sample-' + Date.now() + '-3',
        app: 'Power & Battery',
        title: 'Your battery is low',
        body: 'You should plug in your device.',
        time: Date.now() - 60000
      },
      {
        id: 'sample-' + Date.now() + '-4',
        app: 'OpenVPN Connect',
        title: 'OpenVPN Connect',
        body: 'CONNECTED to secure corporate gateway',
        time: Date.now() - 120000
      },
      {
        id: 'sample-' + Date.now() + '-5',
        app: 'Google Chrome',
        title: 'Google Chrome',
        body: 'Download complete: archive_backup.zip',
        time: Date.now() - 180000
      }
    ];

    const chosen = testSamples[testIndex % testSamples.length];
    testIndex++;
    systemNotifications.unshift(chosen);
    renderNotificationList();
    showNotificationPopup(chosen);
  });
}

async function initNotifications() {
  if (window.notchAPI?.getNotifications) {
    try {
      const initial = await window.notchAPI.getNotifications();
      if (initial && Array.isArray(initial)) {
        systemNotifications = initial;
        systemNotifications.sort((a, b) => b.time - a.time);
        renderNotificationList();
      }
    } catch (e) {
      console.error('Failed to load initial notifications:', e);
    }
  }

  if (window.notchAPI?.onNotificationReceived) {
    window.notchAPI.onNotificationReceived((newNotifs) => {
      if (newNotifs && Array.isArray(newNotifs)) {
        let hasNew = false;
        for (const item of newNotifs) {
          if (!systemNotifications.some(n => String(n.id) === String(item.id))) {
            systemNotifications.push(item);
            unreadNotifCount++;
            hasNew = true;
          }
        }
        if (hasNew || systemNotifications.length > 0) {
          systemNotifications.sort((a, b) => b.time - a.time);
          if (unreadNotifCount > 0 && notifBadge) {
            notifBadge.textContent = unreadNotifCount;
            notifBadge.classList.remove('hidden');
          }
          renderNotificationList();
        }
      }
    });
  }

  if (window.notchAPI?.onNotificationPopup) {
    window.notchAPI.onNotificationPopup((latestNotif) => {
      // Suppressed: Never pop up banner inside the notch
    });
  }

  if (window.notchAPI?.onAlertIsland) {
    window.notchAPI.onAlertIsland((notif) => {
      showAlertIsland(notif);
    });
  }

  if (window.notchAPI?.onAutoCollapse) {
    window.notchAPI.onAutoCollapse(() => {
      if (!isPinned && !notchContainer.classList.contains('alert-island-mode')) {
        collapseNotch();
      }
    });
  }
}

// ----------------------------------------------------
// DYNAMIC ISLAND COMPACT ALERT CONTROLLER
// ----------------------------------------------------
let currentIslandNotifId = null;

function showAlertIsland(notif) {
  if (!alertIslandView || !notchContainer) return;
  currentIslandNotifId = notif ? notif.id : null;

  const styleInfo = categorizeNotification(notif);

  if (islandSquircle) {
    islandSquircle.className = 'icon-squircle';
    islandSquircle.innerHTML = `<div class="app-logo-wrap">${getAppLogoHtml(notif.app, notif.title, notif.body)}</div>`;
  }
  if (islandTitle) islandTitle.textContent = notif.title || notif.app || 'Alert';
  if (islandBody) islandBody.className = 'alert-card-subtitle';
  if (islandSubIcon) islandSubIcon.textContent = styleInfo.subIcon;
  if (islandSubText) islandSubText.textContent = notif.body || 'Alert received';
  if (islandTime) islandTime.textContent = timeAgo(notif.time);
  if (islandApp) islandApp.innerHTML = `📁 ${notif.app || 'system'}`;

  // Morph notch into compact Dynamic Island alert capsule (pure frosted glass)
  notchContainer.classList.remove('collapsed', 'amber', 'emerald', 'cyan');
  notchContainer.classList.add('alert-island-mode');

  // Auto-dismiss after 5.5s if untouched
  clearTimeout(islandDismissTimeout);
  islandDismissTimeout = setTimeout(() => {
    dismissAlertIsland();
  }, 5500);
}

function dismissAlertIsland() {
  clearTimeout(islandDismissTimeout);
  if (!notchContainer.classList.contains('alert-island-mode')) return;

  // Spring slide up into top bezel
  notchContainer.classList.add('collapsed');
  setTimeout(() => {
    notchContainer.classList.remove('alert-island-mode', 'amber', 'emerald', 'cyan');
    window.notchAPI.setNotchState({ expanded: false, isAlert: false, pinned: false });
  }, 260);
}

if (alertIslandView) {
  // Pause dismiss timer when user hovers on alert
  alertIslandView.addEventListener('mouseenter', () => {
    clearTimeout(islandDismissTimeout);
  });

  // Resume dismiss timer when cursor leaves alert
  alertIslandView.addEventListener('mouseleave', () => {
    if (notchContainer.classList.contains('alert-island-mode')) {
      clearTimeout(islandDismissTimeout);
      islandDismissTimeout = setTimeout(() => {
        dismissAlertIsland();
      }, 1500);
    }
  });

  // Clicking anywhere on the island alert expands smoothly to full Notch on Alerts tab
  alertIslandView.addEventListener('click', (e) => {
    if (e.target && e.target.id === 'btn-dismiss-island') return;
    clearTimeout(islandDismissTimeout);
    notchContainer.classList.remove('alert-island-mode', 'amber', 'emerald', 'cyan');
    expandNotch();
    const notifTabBtn = document.querySelector('.tab-btn[data-tab="notifications"]');
    if (notifTabBtn) notifTabBtn.click();
  });
}

if (btnDismissIsland) {
  btnDismissIsland.addEventListener('click', (e) => {
    e.stopPropagation();
    if (currentIslandNotifId && window.notchAPI?.dismissNotification) {
      window.notchAPI.dismissNotification(currentIslandNotifId);
    }
    dismissAlertIsland();
  });
}

// Click on popup banner to switch directly to alerts tab
if (notifPopupBanner) {
  notifPopupBanner.addEventListener('click', (e) => {
    if (e.target && e.target.id === 'btn-dismiss-popup') return;
    const notifTabBtn = document.querySelector('.tab-btn[data-tab="notifications"]');
    if (notifTabBtn) notifTabBtn.click();
    notifPopupBanner.classList.add('hidden');
  });
}

initNotifications();

// ====================================================
// 10. REAL-TIME WINDOWS CLIPBOARD HISTORY CONTROLLER
// ====================================================
let clipboardItems = [];
let clipSearchQuery = '';
let toastTimeout = null;

const clipsItemsList = document.getElementById('clips-items-list');
const clipsEmptyState = document.getElementById('clips-empty-state');
const clipsCounter = document.getElementById('clips-counter');
const clipsBadge = document.getElementById('clips-badge');
const clipsSearchInput = document.getElementById('clips-search-input');
const btnClearClips = document.getElementById('btn-clear-clips');
const clipboardToast = document.getElementById('clipboard-toast');

function showClipboardToast(message = 'Copied to clipboard!') {
  if (!clipboardToast) return;
  const span = clipboardToast.querySelector('span');
  if (span) span.textContent = message;
  clipboardToast.classList.remove('hidden');

  if (toastTimeout) clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => {
    clipboardToast.classList.add('hidden');
  }, 1800);
}

const CLIP_EXPIRY_MS = 20 * 60 * 60 * 1000; // 20 hours auto-expiry

function renderClipboardList() {
  if (!clipsItemsList) return;

  // Auto-prune any clip older than 20 hours
  const now = Date.now();
  clipboardItems = clipboardItems.filter(c => c && c.time && (now - c.time) < CLIP_EXPIRY_MS);

  const filtered = clipboardItems.filter(item => {
    if (!clipSearchQuery) return true;
    return (item.text || '').toLowerCase().includes(clipSearchQuery.toLowerCase());
  });

  // Update counter and badge
  if (clipsCounter) {
    clipsCounter.textContent = `${clipboardItems.length} ${clipboardItems.length === 1 ? 'clip' : 'clips'}`;
  }
  if (clipsBadge) {
    if (clipboardItems.length > 0) {
      clipsBadge.textContent = clipboardItems.length > 99 ? '99+' : clipboardItems.length;
      clipsBadge.classList.remove('hidden');
    } else {
      clipsBadge.classList.add('hidden');
    }
  }

  if (filtered.length === 0) {
    clipsItemsList.innerHTML = '';
    if (clipsEmptyState) clipsEmptyState.classList.remove('hidden');
    return;
  }

  if (clipsEmptyState) clipsEmptyState.classList.add('hidden');
  clipsItemsList.innerHTML = '';

  filtered.forEach(item => {
    const card = document.createElement('div');
    card.className = 'clip-card';
    card.dataset.id = item.id;

    // Left icon
    const leftCol = document.createElement('div');
    leftCol.className = 'clip-card-left';
    leftCol.innerHTML = `
      <div class="clip-icon-box">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/></svg>
      </div>
    `;

    // Center body
    const bodyCol = document.createElement('div');
    bodyCol.className = 'clip-card-body';

    const snippet = document.createElement('div');
    snippet.className = 'clip-text-snippet';
    snippet.textContent = item.text || '';

    const metaRow = document.createElement('div');
    metaRow.className = 'clip-meta-row';
    const linesText = item.lines > 1 ? `${item.lines} lines` : '1 line';
    metaRow.innerHTML = `
      <span class="clip-meta-tag">🕒 ${timeAgo(item.time)}</span>
      <span class="clip-meta-tag">•</span>
      <span class="clip-meta-tag">${item.charCount || (item.text ? item.text.length : 0)} chars</span>
      <span class="clip-meta-tag">•</span>
      <span class="clip-meta-tag">${linesText}</span>
    `;

    bodyCol.appendChild(snippet);
    bodyCol.appendChild(metaRow);

    // Right hover action pill with tooltips
    const actionsCol = document.createElement('div');
    actionsCol.className = 'clip-hover-actions';
    actionsCol.innerHTML = `
      <button class="clip-action-btn copy-btn" title="Copy to clipboard">
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
        <span class="action-tooltip">Copy</span>
      </button>
      <button class="clip-action-btn delete-btn" title="Delete this clip">
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
        <span class="action-tooltip">Delete</span>
      </button>
    `;

    // Click anywhere on card or copy button -> Copies to clipboard
    card.addEventListener('click', async (e) => {
      const deleteBtn = e.target.closest('.delete-btn');
      if (deleteBtn) {
        e.stopPropagation();
        await deleteClip(item.id);
        return;
      }
      await copyClip(item.text);
    });

    // Copy button explicit click
    const copyBtn = actionsCol.querySelector('.copy-btn');
    if (copyBtn) {
      copyBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        await copyClip(item.text);
      });
    }

    card.appendChild(leftCol);
    card.appendChild(bodyCol);
    card.appendChild(actionsCol);

    clipsItemsList.appendChild(card);
  });
}

async function copyClip(text) {
  if (!text) return;
  try {
    if (window.notchAPI?.copyToClipboard) {
      await window.notchAPI.copyToClipboard(text);
    } else {
      await navigator.clipboard.writeText(text);
    }
    showClipboardToast('✓ Copied to clipboard!');
  } catch (err) {
    showClipboardToast('Failed to copy');
  }
}

async function deleteClip(id) {
  clipboardItems = clipboardItems.filter(c => c.id !== id);
  renderClipboardList();
  if (window.notchAPI?.deleteClipboardItem) {
    try {
      await window.notchAPI.deleteClipboardItem(id);
    } catch (err) {}
  }
}

async function clearAllClips() {
  if (clipboardItems.length === 0) return;
  clipboardItems = [];
  renderClipboardList();
  if (window.notchAPI?.clearClipboardHistory) {
    try {
      await window.notchAPI.clearClipboardHistory();
    } catch (err) {}
  }
  showClipboardToast('Clipboard cleared');
}

// Search filter
if (clipsSearchInput) {
  clipsSearchInput.addEventListener('input', (e) => {
    clipSearchQuery = e.target.value.trim();
    renderClipboardList();
  });
}

// Clear all button
if (btnClearClips) {
  btnClearClips.addEventListener('click', (e) => {
    e.stopPropagation();
    clearAllClips();
  });
}

// Real-time listener from Electron main process
if (window.notchAPI?.onClipboardUpdated) {
  window.notchAPI.onClipboardUpdated((items) => {
    if (Array.isArray(items)) {
      clipboardItems = items;
      renderClipboardList();
    }
  });
}

// Initial fetch on app start
async function initClipboardHistory() {
  if (window.notchAPI?.getClipboardHistory) {
    try {
      const items = await window.notchAPI.getClipboardHistory();
      if (Array.isArray(items)) {
        clipboardItems = items;
        renderClipboardList();
      }
    } catch (err) {}
  }
}

initClipboardHistory();
