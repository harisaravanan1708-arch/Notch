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
let playbackWatchdog = null;
let isResolvingFallback = false;
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

  if (ytPlayer && ytPlayerReady && ytPlayer.cueVideoById) {
    ytPlayer.cueVideoById(song.id);
  }
}

async function playSong(song, isUserInitiated = false) {
  if (!song) return;

  if (playbackWatchdog) {
    clearTimeout(playbackWatchdog);
    playbackWatchdog = null;
  }

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

  if (ytPlayer && ytPlayerReady && ytPlayer.loadVideoById) {
    try {
      ytPlayer.loadVideoById(song.id);
      ytPlayer.playVideo();
      isPlaying = true;
    } catch (e) {
      console.error(e);
    }
  }

  // Safety Watchdog: If a song is blocked by copyright/embed restrictions and gets stuck without firing event
  const targetId = song.id;
  playbackWatchdog = setTimeout(() => {
    if (currentTrack && currentTrack.id === targetId && !isPlaying) {
      const curDur = ytPlayer && ytPlayer.getDuration ? ytPlayer.getDuration() : 0;
      if (curDur <= 1 && !fallbackAttempted.has(targetId)) {
        console.warn(`[Watchdog] Song "${song.title}" (${targetId}) stalled on load, finding alternative audio stream...`);
        handleRestrictedPlayback(targetId);
      }
    }
  }, 3500);

  // If user searched a new song, reset queue with that song's suggestions
  if (isUserInitiated) {
    upcomingQueue = [];
    await appendSuggestionsForTrack(song.id);
  } else {
    // Only append more if upcomingQueue is running low (< 5 songs)
    // NEVER overwrite existing queue — this prevents the 2-3 song back-and-forth loop!
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

  // Filter out any songs in upcomingQueue that were already played
  upcomingQueue = upcomingQueue.filter(s => !playedSongIds.has(s.id));

  if (upcomingQueue.length > 0) {
    const nextSong = upcomingQueue.shift();
    playSong(nextSong, false);
  } else if (currentTrack) {
    // Queue is empty: fetch fresh suggestions for the current song
    await appendSuggestionsForTrack(currentTrack.id);
    if (upcomingQueue.length > 0) {
      const nextSong = upcomingQueue.shift();
      playSong(nextSong, false);
      return;
    }

    // Fallback: fetch today's trending songs, filtering out played
    const trending = await window.notchAPI.getTrendingSongs();
    const unplayed = (trending || []).filter(s => !playedSongIds.has(s.id));
    if (unplayed.length > 0) {
      const next = unplayed[0];
      upcomingQueue = unplayed.slice(1);
      playSong(next, false);
    } else {
      // If entire catalog was played, clear played set to allow fresh loop
      playedSongIds.clear();
      if (trending && trending.length > 0) {
        playSong(trending[0], false);
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

  if (historyQueue.length > 0) {
    const prevSong = historyQueue.pop();
    if (currentTrack) upcomingQueue.unshift(currentTrack);
    playSong(prevSong, false);
  } else if (ytPlayer && ytPlayerReady && ytPlayer.seekTo) {
    ytPlayer.seekTo(0, true);
  }
}

// Handle YouTube restricted / blocked embeds (Error 150 / 101 / 100)
async function handleRestrictedPlayback(failedVideoId) {
  if (isResolvingFallback) return;
  if (!currentTrack) return;

  fallbackAttempted.add(failedVideoId);
  isResolvingFallback = true;

  if (playerStatusBadge) playerStatusBadge.textContent = 'Resolving Audio...';
  console.log(`[Playback Recovery] Resolving alternative audio stream for: "${currentTrack.title}"`);

  try {
    const rawTitle = currentTrack.title || '';
    const cleanQuery = rawTitle
      .replace(/[\[\(].*?[\]\)]/g, '')
      .replace(/official\s+(music\s+)?video/gi, '')
      .replace(/video\s+song/gi, '')
      .trim();

    const candidates = await window.notchAPI.getFallbackAudio(`${cleanQuery} ${currentTrack.author || ''}`);
    const validCandidate = (candidates || []).find(c => 
      c.id !== failedVideoId && 
      !fallbackAttempted.has(c.id) &&
      !playedSongIds.has(c.id)
    );

    if (validCandidate) {
      console.log(`[Playback Recovery] Found embeddable stream: "${validCandidate.title}" (${validCandidate.id})`);
      if (playerStatusBadge) playerStatusBadge.textContent = 'Audio Stream';

      // Keep original title so user knows their requested song is playing
      currentTrack.id = validCandidate.id;
      playedSongIds.add(validCandidate.id);
      loadThumbnail(validCandidate.id);

      if (ytPlayer && ytPlayerReady && ytPlayer.loadVideoById) {
        ytPlayer.loadVideoById(validCandidate.id);
        ytPlayer.playVideo();
        isPlaying = true;
      }
      isResolvingFallback = false;
      return;
    }
  } catch (err) {
    console.error('[Playback Recovery Error]:', err);
  }

  isResolvingFallback = false;

  // If no alternative found or fallback also failed, auto advance to next song smoothly
  isPlaying = false;
  playIcon.classList.remove('hidden');
  pauseIcon.classList.add('hidden');
  miniEqualizer.classList.remove('playing');
  albumArt.classList.remove('playing');

  if (playerStatusBadge) playerStatusBadge.textContent = 'Restricted - Next...';
  console.warn('[Playback Recovery] No playable audio found for this song. Automatically advancing to next track.');

  setTimeout(() => {
    playNextSong();
  }, 1200);
}

function onPlayerStateChange(event) {
  console.log('[YouTube State]:', event.data);

  if (event.data === YT.PlayerState.PLAYING) {
    if (playbackWatchdog) {
      clearTimeout(playbackWatchdog);
      playbackWatchdog = null;
    }
    isPlaying = true;
    playIcon.classList.add('hidden');
    pauseIcon.classList.remove('hidden');
    miniEqualizer.classList.add('playing');
    albumArt.classList.add('playing');
    if (playerStatusBadge && playerStatusBadge.textContent !== 'Audio Stream') {
      playerStatusBadge.textContent = 'Playing';
    }
    startProgressTracking();
  } else if (event.data === YT.PlayerState.PAUSED) {
    isPlaying = false;
    playIcon.classList.remove('hidden');
    pauseIcon.classList.add('hidden');
    miniEqualizer.classList.remove('playing');
    albumArt.classList.remove('playing');
    if (playerStatusBadge && !isResolvingFallback) {
      playerStatusBadge.textContent = 'Paused';
    }
  } else if (event.data === YT.PlayerState.BUFFERING) {
    if (playerStatusBadge && !isResolvingFallback) {
      playerStatusBadge.textContent = 'Loading...';
    }
  } else if (event.data === YT.PlayerState.ENDED) {
    console.log('[YouTube Player] Song ended. Playing next suggested song one by one...');
    playNextSong();
  }
}

function onPlayerError(event) {
  const errCode = event.data;
  console.warn('[YouTube Error Code]:', errCode, 'Track:', currentTrack?.title);

  if (playbackWatchdog) {
    clearTimeout(playbackWatchdog);
    playbackWatchdog = null;
  }

  // Error codes:
  // 150 / 101: Embedding disabled by video owner (VEVO / Music Labels)
  // 100: Video not found or private
  // 2 / 5: Invalid parameter or HTML5 playback failure
  if (errCode === 150 || errCode === 101 || errCode === 100 || errCode === 2 || errCode === 5) {
    const trackId = currentTrack ? currentTrack.id : null;
    if (trackId && !fallbackAttempted.has(trackId)) {
      handleRestrictedPlayback(trackId);
      return;
    }
  }

  isPlaying = false;
  playIcon.classList.remove('hidden');
  pauseIcon.classList.add('hidden');
  miniEqualizer.classList.remove('playing');
  albumArt.classList.remove('playing');

  if (playerStatusBadge) {
    if (errCode === 150 || errCode === 101) {
      playerStatusBadge.textContent = 'Restricted by Label';
    } else {
      playerStatusBadge.textContent = 'Paused';
    }
  }

  if (errCode === 150 || errCode === 101 || errCode === 100) {
    setTimeout(() => {
      playNextSong();
    }, 1200);
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
        const dur = ytPlayer.getDuration ? (ytPlayer.getDuration() || 0) : 0;
        if (dur <= 1 && fallbackAttempted.has(currentTrack.id)) {
          if (playerStatusBadge) playerStatusBadge.textContent = 'Playing Next...';
          playNextSong();
          return;
        }
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

    // 1. Left Icon Squircle with Badge Dot
    const leftCol = document.createElement('div');
    leftCol.className = 'glass-card-left';
    leftCol.innerHTML = `
      <div class="icon-squircle ${styleInfo.squircleClass}">
        <span class="squircle-glyph">${styleInfo.glyph}</span>
        <span class="squircle-badge-dot ${styleInfo.badgeClass}">${styleInfo.badge}</span>
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
    subtitleEl.className = `alert-card-subtitle ${styleInfo.subClass}`;
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

  notifPopupBanner.className = `glass-popup-card ${styleInfo.cardClass}`;

  const popupSquircle = document.getElementById('popup-squircle');
  const popupGlyph = document.getElementById('popup-glyph');
  const popupBadgeDot = document.getElementById('popup-badge-dot');
  const popupSubIcon = document.getElementById('popup-sub-icon');
  const popupSubText = document.getElementById('popup-sub-text');
  const popupTime = document.getElementById('popup-time');

  if (popupSquircle) popupSquircle.className = `icon-squircle ${styleInfo.squircleClass}`;
  if (popupGlyph) popupGlyph.textContent = styleInfo.glyph;
  if (popupBadgeDot) {
    popupBadgeDot.className = `squircle-badge-dot ${styleInfo.badgeClass}`;
    popupBadgeDot.textContent = styleInfo.badge;
  }
  if (popupTitle) popupTitle.textContent = notif.title || notif.app || 'New Notification';
  if (popupBody) popupBody.className = `alert-card-subtitle ${styleInfo.subClass}`;
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
        id: 'sample-' + Date.now(),
        app: 'storefront',
        title: 'Fix tax rounding at checkout',
        body: 'Allow bash?',
        time: Date.now() - 59000
      },
      {
        id: 'sample-' + Date.now() + '-2',
        app: 'api',
        title: 'Rate limits for the public API',
        body: 'Finished just now',
        time: Date.now() - 14000
      },
      {
        id: 'sample-' + Date.now() + '-3',
        app: 'notchpixel',
        title: 'Redesign the agents tab',
        body: 'Editing IslandIslandIslandAgents.cs',
        time: Date.now() - 240000
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

  if (islandSquircle) islandSquircle.className = `icon-squircle ${styleInfo.squircleClass}`;
  if (islandGlyph) islandGlyph.textContent = styleInfo.glyph;
  if (islandBadgeDot) {
    islandBadgeDot.className = `squircle-badge-dot ${styleInfo.badgeClass}`;
    islandBadgeDot.textContent = styleInfo.badge;
  }
  if (islandTitle) islandTitle.textContent = notif.title || notif.app || 'Alert';
  if (islandBody) islandBody.className = `alert-card-subtitle ${styleInfo.subClass}`;
  if (islandSubIcon) islandSubIcon.textContent = styleInfo.subIcon;
  if (islandSubText) islandSubText.textContent = notif.body || 'Alert received';
  if (islandTime) islandTime.textContent = timeAgo(notif.time);
  if (islandApp) islandApp.innerHTML = `📁 ${notif.app || 'system'}`;

  // Morph notch into compact Dynamic Island alert capsule
  notchContainer.classList.remove('collapsed', 'amber', 'emerald', 'cyan');
  notchContainer.classList.add('alert-island-mode', styleInfo.cardClass);

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

function renderClipboardList() {
  if (!clipsItemsList) return;

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
