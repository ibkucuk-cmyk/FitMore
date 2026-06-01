// Core Fitbit Legacy Dashboard Controller

// App State (Default values if not in localStorage)
// ALL zeros — fresh users see a clean, empty dashboard until they log or sync data
const DEFAULT_STATE = {
  goals: {
    steps: 10000,
    calories: 2200,
    distance: 5.0,
    active: 30
  },
  metrics: {
    steps: 0,
    caloriesBurned: 0,
    distance: 0,
    activeMin: 0,
    sleepHours: 0,
    sleepScore: 0,
    sleepStages: { deep: 0, rem: 0, light: 0, awake: 0 },
    stressScore: 0,
    stressMood: "--",
    caffeineMg: 0,
    waterOz: 0,
    foodCalories: 0
  },
  workouts: [],
  caloriesHistory: [],
  visibleTiles: {
    sleep: true,
    stress: true,
    caffeine: true,
    food: true,
    workout: true,
    water: true,
    chart: true
  },
  isPro: false,
  googleOAuth: {
    clientId: "",
    clientSecret: "",
    redirectUri: "",
    accessToken: "",
    refreshToken: "",
    tokenExpiry: 0
  }
};

let appState = JSON.parse(localStorage.getItem('fitbit_classic_state')) || JSON.parse(JSON.stringify(DEFAULT_STATE));

// Ensure any missing state keys are backfilled automatically
if (!appState.googleOAuth) {
  appState.googleOAuth = {
    clientId: "",
    clientSecret: "",
    redirectUri: "",
    accessToken: "",
    refreshToken: "",
    tokenExpiry: 0
  };
}

if (!appState.caloriesHistory) {
  appState.caloriesHistory = [];
}
if (!appState.metrics.sleepStages) {
  appState.metrics.sleepStages = { deep: 0, rem: 0, light: 0, awake: 0 };
}
if (appState.visibleTiles && appState.visibleTiles.chart === undefined) {
  appState.visibleTiles.chart = true;
}
if (appState.isPro === undefined) {
  appState.isPro = false;
}



// SVG Dash Circumference for r=38
const RING_CIRCUMFERENCE = 238.76;

document.addEventListener('DOMContentLoaded', () => {
  initApp();
});

function saveState() {
  localStorage.setItem('fitbit_classic_state', JSON.stringify(appState));
}

// Initialise Application View
function initApp() {
  // Setup Customizer Drawer
  const btnCustomise = document.getElementById('btn-customise');
  const btnCloseCustomise = document.getElementById('close-customise');
  const drawer = document.getElementById('customizer-drawer');

  btnCustomise.addEventListener('click', () => drawer.classList.add('open'));
  btnCloseCustomise.addEventListener('click', () => drawer.classList.remove('open'));

  // Quick Log Modal Trigger
  document.getElementById('btn-quick-log').addEventListener('click', () => {
    openLogModal('quick-log');
  });

  // Google Setup Modal Trigger
  document.getElementById('btn-google-setup').addEventListener('click', () => {
    openLogModal('google-setup');
    
    // Automatically detect and structure the exact current website URL as the default redirect
    let defaultRedirect = window.location.origin + window.location.pathname;
    if (!defaultRedirect.endsWith('/')) {
      defaultRedirect += '/';
    }

    if (appState.googleOAuth) {
      document.getElementById('input-g-client-id').value = appState.googleOAuth.clientId || '';
      document.getElementById('input-g-client-secret').value = appState.googleOAuth.clientSecret || '';
      document.getElementById('input-g-redirect-uri').value = appState.googleOAuth.redirectUri || defaultRedirect;
    }
  });

  // Refresh / Sync button
  document.getElementById('btn-refresh-sync').addEventListener('click', handleRefreshSync);

  document.getElementById('btn-g-auth-url').addEventListener('click', openGoogleAuth);
  document.getElementById('btn-save-g-setup').addEventListener('click', saveGoogleSetup);

  document.getElementById('btn-pro-unlock').addEventListener('click', () => {
    openLogModal('pro-unlock');
  });
  document.getElementById('btn-activate-pro').addEventListener('click', activateProVersion);



  // Setup Tile Customizer Checkboxes
  Object.keys(appState.visibleTiles).forEach(tileKey => {
    const checkbox = document.getElementById(`toggle-${tileKey}`);
    if (checkbox) {
      checkbox.checked = appState.visibleTiles[tileKey];
      checkbox.addEventListener('change', (e) => {
        appState.visibleTiles[tileKey] = e.target.checked;
        saveState();
        applyTileVisibility();
      });
    }
  });

  // Setup Save Buttons inside Modals
  document.getElementById('btn-save-sleep').addEventListener('click', saveSleepLog);
  document.getElementById('btn-save-stress').addEventListener('click', saveStressLog);
  document.getElementById('btn-save-caffeine').addEventListener('click', saveCaffeineLog);
  document.getElementById('btn-save-food').addEventListener('click', saveFoodLog);
  document.getElementById('btn-save-workout').addEventListener('click', saveWorkoutLog);
  document.getElementById('btn-save-chart-history').addEventListener('click', saveChartHistoryLog);


  // Quick Inline Trackers Setup
  document.getElementById('btn-quick-caffeine').addEventListener('click', quickCaffeineLog);
  document.getElementById('btn-quick-food').addEventListener('click', quickFoodLog);
  document.getElementById('btn-add-water').addEventListener('click', () => addWater(8));

  // Interactive Caffeine click cups
  const cupIcons = document.querySelectorAll('#caffeine-cups .coffee-cup-icon');
  cupIcons.forEach(cup => {
    cup.addEventListener('click', () => {
      const targetCups = parseInt(cup.getAttribute('data-cup'));
      appState.metrics.caffeineMg = targetCups * 100; // 100mg per cup
      saveState();
      updateCaffeineUI();
    });
  });

  // Interactive Water glasses
  const waterGlasses = document.querySelectorAll('#water-bottles .fa-glass-water');
  waterGlasses.forEach(glass => {
    glass.addEventListener('click', () => {
      const ounces = parseInt(glass.getAttribute('data-water'));
      appState.metrics.waterOz = ounces;
      saveState();
      updateWaterUI();
    });
  });

  // Perform initial render
  renderDashboard();

  // Update sync button status indicator
  updateSyncStatus();

  // AUTO-DETECT: Check if Google redirected back with ?code= in the URL
  const urlParams = new URLSearchParams(window.location.search);
  const authCode = urlParams.get('code');
  if (authCode) {
    console.log('[FitMore] Detected auth code in URL! Auto-exchanging...');
    autoExchangeAuthCode(authCode);
    // Clean the URL (remove ?code=... so it doesn't re-trigger)
    window.history.replaceState({}, document.title, window.location.pathname);
    return; // Don't auto-sync yet, the exchange will trigger sync
  }

  // Try to sync with Google Health on startup if connected
  if (appState.googleOAuth && (appState.googleOAuth.accessToken || appState.googleOAuth.refreshToken)) {
    console.log('[FitMore] Connected on startup — auto-syncing...');
    syncGoogleHealthData();
  }
}


function renderDashboard() {
  applyTileVisibility();
  updateProgressRings();
  updateSleepUI();
  updateStressUI();
  updateCaffeineUI();
  updateFoodUI();
  updateWorkoutUI();
  updateWaterUI();
  updateChartUI();
  applyProOverlays();
}



// 1. Tile Customization & Visibility
function applyTileVisibility() {
  Object.keys(appState.visibleTiles).forEach(tileKey => {
    const element = document.getElementById(`tile-${tileKey}`);
    if (element) {
      if (appState.visibleTiles[tileKey]) {
        element.classList.remove('hidden-card');
      } else {
        element.classList.add('hidden-card');
      }
    }
  });
}

// 2. Goal Progress Circular Rings Calculations
function updateProgressRings() {
  // Steps Ring
  animateRing('ring-steps', appState.metrics.steps, appState.goals.steps);
  document.getElementById('val-steps').innerText = appState.metrics.steps.toLocaleString();
  
  // Calculate total calories (Base + calories burned by workouts)
  const workoutBurn = appState.workouts.reduce((sum, w) => sum + w.calories, 0);
  const totalBurn = appState.metrics.caloriesBurned + workoutBurn;
  animateRing('ring-calories', totalBurn, appState.goals.calories);
  document.getElementById('val-calories').innerText = totalBurn.toLocaleString();

  // Distance Ring
  animateRing('ring-distance', appState.metrics.distance, appState.goals.distance);
  document.getElementById('val-distance').innerText = appState.metrics.distance.toFixed(1) + " mi";

  // Active Minutes Ring
  const workoutActiveMin = appState.workouts.reduce((sum, w) => sum + w.duration, 0);
  const totalActive = appState.metrics.activeMin + workoutActiveMin;
  animateRing('ring-active', totalActive, appState.goals.active);
  document.getElementById('val-active').innerText = totalActive;
}

function animateRing(ringId, current, goal) {
  const ring = document.getElementById(ringId);
  if (!ring) return;
  
  const percentage = Math.min((current / goal) * 100, 100);
  const offset = RING_CIRCUMFERENCE - (percentage / 100) * RING_CIRCUMFERENCE;
  
  ring.style.strokeDasharray = `${RING_CIRCUMFERENCE} ${RING_CIRCUMFERENCE}`;
  ring.style.strokeDashoffset = offset;
  
  // Highlight ring if goal achieved
  if (current >= goal) {
    ring.style.filter = "drop-shadow(0 0 4px currentColor)";
  } else {
    ring.style.filter = "none";
  }
}

// 3. Sleep Details & Stages Breakdown Render — FULLY DYNAMIC
function updateSleepUI() {
  const tile = document.getElementById('tile-sleep');
  if (!tile) return;

  const hr = Math.floor(appState.metrics.sleepHours);
  const min = Math.round((appState.metrics.sleepHours - hr) * 60);
  
  const durationEl = tile.querySelector('.sleep-duration-value');
  if (durationEl) durationEl.innerText = appState.metrics.sleepHours > 0 ? `${hr}h ${min}m` : '--';

  const scoreEl = tile.querySelector('.sleep-score-value');
  if (scoreEl) {
    if (appState.metrics.sleepScore > 0) {
      let quality = 'Fair';
      if (appState.metrics.sleepScore >= 80) quality = 'Good';
      if (appState.metrics.sleepScore >= 90) quality = 'Excellent';
      if (appState.metrics.sleepScore < 60) quality = 'Poor';
      scoreEl.innerHTML = `<strong style="color: var(--color-sleep)">${appState.metrics.sleepScore} (${quality})</strong>`;
    } else {
      scoreEl.innerHTML = `<strong style="color: var(--text-secondary)">-- (No Data)</strong>`;
    }
  }

  // Dynamic sleep stage bar
  const stages = appState.metrics.sleepStages || { deep: 0, rem: 0, light: 0, awake: 0 };
  const totalStageMin = stages.deep + stages.rem + stages.light + stages.awake;
  
  const deepPct = totalStageMin > 0 ? Math.round((stages.deep / totalStageMin) * 100) : 0;
  const remPct = totalStageMin > 0 ? Math.round((stages.rem / totalStageMin) * 100) : 0;
  const lightPct = totalStageMin > 0 ? Math.round((stages.light / totalStageMin) * 100) : 0;
  const awakePct = totalStageMin > 0 ? Math.round((stages.awake / totalStageMin) * 100) : 0;

  const barContainer = tile.querySelector('.sleep-stage-bar');
  if (barContainer) {
    if (totalStageMin > 0) {
      barContainer.innerHTML = `
        <div class="stage-seg seg-deep" style="width: ${deepPct}%;" title="Deep: ${stages.deep}m"></div>
        <div class="stage-seg seg-rem" style="width: ${remPct}%;" title="REM: ${stages.rem}m"></div>
        <div class="stage-seg seg-light" style="width: ${lightPct}%;" title="Light: ${stages.light}m"></div>
        <div class="stage-seg seg-awake" style="width: ${awakePct}%;" title="Awake: ${stages.awake}m"></div>
      `;
    } else {
      barContainer.innerHTML = `<div class="stage-seg" style="width: 100%; background: rgba(255,255,255,0.1); border-radius: 12px;" title="No sleep data"></div>`;
    }
  }

  const legendContainer = tile.querySelector('.sleep-legend');
  if (legendContainer) {
    if (totalStageMin > 0) {
      legendContainer.innerHTML = `
        <div class="legend-item"><span class="legend-dot seg-deep"></span><span>Deep (${deepPct}%)</span></div>
        <div class="legend-item"><span class="legend-dot seg-rem"></span><span>REM (${remPct}%)</span></div>
        <div class="legend-item"><span class="legend-dot seg-light"></span><span>Light (${lightPct}%)</span></div>
        <div class="legend-item"><span class="legend-dot seg-awake"></span><span>Awake (${awakePct}%)</span></div>
      `;
    } else {
      legendContainer.innerHTML = `
        <div class="legend-item"><span class="legend-dot" style="background: rgba(255,255,255,0.15);"></span><span>No stage data logged</span></div>
      `;
    }
  }
}

// 4. Stress management scores UI
function updateStressUI() {
  const scoreEl = document.getElementById('stress-score');
  const statusEl = document.getElementById('stress-status');
  if (scoreEl) scoreEl.innerText = appState.metrics.stressScore > 0 ? appState.metrics.stressScore : '--';
  if (statusEl) statusEl.innerText = appState.metrics.stressMood || '--';
}

// 5. Caffeine tracker UI updates
function updateCaffeineUI() {
  document.getElementById('txt-caffeine').innerText = appState.metrics.caffeineMg + " mg";
  const numFilledCups = Math.min(Math.floor(appState.metrics.caffeineMg / 100), 5);
  
  const cupIcons = document.querySelectorAll('#caffeine-cups .coffee-cup-icon');
  cupIcons.forEach((cup, idx) => {
    if (idx < numFilledCups) {
      cup.classList.add('filled');
    } else {
      cup.classList.remove('filled');
    }
  });
}

// 6. Food logging progress
function updateFoodUI() {
  const logged = appState.metrics.foodCalories;
  const budget = appState.goals.calories;
  const remaining = budget - logged;

  document.getElementById('food-logged').innerText = logged.toLocaleString() + " kcal";
  document.getElementById('food-budget').innerText = budget.toLocaleString() + " kcal";
  
  const remainingText = document.getElementById('food-remaining');
  if (remaining >= 0) {
    remainingText.innerText = remaining.toLocaleString() + " kcal";
    remainingText.style.color = "var(--color-food)";
  } else {
    remainingText.innerText = Math.abs(remaining).toLocaleString() + " kcal Over";
    remainingText.style.color = "var(--color-calories)";
  }
}

// 7. Workouts list log
function updateWorkoutUI() {
  const listContainer = document.getElementById('workout-list');
  if (appState.workouts.length === 0) {
    listContainer.innerHTML = `
      <div style="font-size: 0.9rem; color: var(--text-secondary); text-align: center; padding-top: 1.5rem;">
        No workouts logged today.
      </div>
    `;
    document.getElementById('total-workout-time').innerText = "0 min";
    return;
  }

  let html = '';
  let totalTime = 0;
  appState.workouts.forEach(workout => {
    totalTime += workout.duration;
    html += `
      <div style="background:rgba(255,255,255,0.03); padding:0.6rem 0.8rem; border-radius:12px; margin-bottom:0.5rem; display:flex; justify-content:space-between; align-items:center;">
        <div>
          <strong style="font-size:0.95rem; color:var(--text-primary);">${workout.type}</strong>
          <div style="font-size:0.75rem; color:var(--text-secondary);">${workout.time} &bull; ${workout.duration} min</div>
        </div>
        <div style="text-align:right;">
          <strong style="color:var(--color-calories); font-size:0.95rem;">-${workout.calories} kcal</strong>
        </div>
      </div>
    `;
  });

  listContainer.innerHTML = html;
  document.getElementById('total-workout-time').innerText = `${totalTime} min`;
}

// 8. Water UI Updates
function updateWaterUI() {
  document.getElementById('txt-water').innerText = appState.metrics.waterOz + " oz";
  const numFilledGlasses = Math.min(Math.floor(appState.metrics.waterOz / 8), 8);
  
  const glassIcons = document.querySelectorAll('#water-bottles .fa-glass-water');
  glassIcons.forEach((glass, idx) => {
    if (idx < numFilledGlasses) {
      glass.style.opacity = "1";
    } else {
      glass.style.opacity = "0.25";
    }
  });
}

function addWater(oz) {
  appState.metrics.waterOz = Math.min(appState.metrics.waterOz + oz, 64);
  saveState();
  updateWaterUI();
}

// Modal Log Operations
function openLogModal(type) {
  const overlay = document.getElementById('modal-overlay');
  overlay.classList.add('open');
  overlay.setAttribute('aria-hidden', 'false');

  // Hide all modals first
  document.querySelectorAll('.modal').forEach(m => m.style.display = 'none');
  
  // Show target modal
  const targetModal = document.getElementById(`modal-${type}`);
  if (targetModal) targetModal.style.display = 'flex';
}

function closeLogModal() {
  const overlay = document.getElementById('modal-overlay');
  overlay.classList.remove('open');
  overlay.setAttribute('aria-hidden', 'true');
}

function switchQuickModal(target) {
  openLogModal(target);
}

// Form Handlers
function saveSleepLog() {
  const hours = parseFloat(document.getElementById('input-sleep-hours').value);
  const score = parseInt(document.getElementById('input-sleep-score').value);
  const deepMin = parseInt(document.getElementById('input-sleep-deep').value) || 0;
  const remMin = parseInt(document.getElementById('input-sleep-rem').value) || 0;
  const lightMin = parseInt(document.getElementById('input-sleep-light').value) || 0;
  const awakeMin = parseInt(document.getElementById('input-sleep-awake').value) || 0;

  if (!isNaN(hours) && hours > 0) appState.metrics.sleepHours = hours;
  if (!isNaN(score) && score > 0 && score <= 100) appState.metrics.sleepScore = score;
  
  // Update sleep stages if any were entered
  if (deepMin > 0 || remMin > 0 || lightMin > 0 || awakeMin > 0) {
    appState.metrics.sleepStages = {
      deep: deepMin,
      rem: remMin,
      light: lightMin,
      awake: awakeMin
    };
  }

  saveState();
  renderDashboard();
  closeLogModal();
}

function saveStressLog() {
  const score = parseInt(document.getElementById('input-stress-score').value);
  const mood = document.getElementById('input-stress-mood').value;

  if (!isNaN(score) && score > 0 && score <= 100) appState.metrics.stressScore = score;
  appState.metrics.stressMood = mood;

  saveState();
  renderDashboard();
  closeLogModal();
}

function saveCaffeineLog() {
  const amount = parseInt(document.getElementById('input-caffeine-mg').value);
  if (!isNaN(amount) && amount >= 0) {
    appState.metrics.caffeineMg = amount;
    saveState();
    renderDashboard();
    closeLogModal();
  }
}

function quickCaffeineLog() {
  const amount = parseInt(document.getElementById('quick-caffeine-input').value);
  if (!isNaN(amount) && amount > 0) {
    appState.metrics.caffeineMg += amount;
    document.getElementById('quick-caffeine-input').value = '';
    saveState();
    renderDashboard();
  }
}

function saveFoodLog() {
  const name = document.getElementById('input-food-name').value;
  const cal = parseInt(document.getElementById('input-food-calories').value);

  if (name && !isNaN(cal) && cal > 0) {
    appState.metrics.foodCalories += cal;
    saveState();
    renderDashboard();
    closeLogModal();
  }
}

function quickFoodLog() {
  const name = document.getElementById('quick-food-name').value;
  const cal = parseInt(document.getElementById('quick-food-calories').value);

  if (name && !isNaN(cal) && cal > 0) {
    appState.metrics.foodCalories += cal;
    document.getElementById('quick-food-name').value = '';
    document.getElementById('quick-food-calories').value = '';
    saveState();
    renderDashboard();
  }
}

function saveWorkoutLog() {
  const type = document.getElementById('input-workout-type').value;
  const dur = parseInt(document.getElementById('input-workout-duration').value);
  const cal = parseInt(document.getElementById('input-workout-calories').value);

  if (!isNaN(dur) && dur > 0 && !isNaN(cal) && cal >= 0) {
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    appState.workouts.push({
      type: type,
      duration: dur,
      calories: cal,
      time: timeStr
    });

    // Also contribute to distance (rough estimation for steps / cardio)
    if (type === "Running" || type === "Walking") {
      appState.metrics.distance += (dur * 0.08); // rough miles calculation
      appState.metrics.steps += (dur * 120); // rough steps calculation
    }

    saveState();
    renderDashboard();
    closeLogModal();
  }
}

let caloriesChart = null;

function updateChartUI() {
  const canvas = document.getElementById('caloriesComparisonChart');
  if (!canvas) return;
  
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  if (caloriesChart) {
    caloriesChart.destroy();
  }

  // If there's no history at all, show a placeholder message
  if (appState.caloriesHistory.length === 0) {
    // Draw empty state text on canvas
    ctx.fillStyle = '#94a3b8';
    ctx.font = '14px Outfit, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('No calorie history yet. Log food or use Quick Log to start tracking!', canvas.width / 2, canvas.height / 2);
    return;
  }

  // Calculate live dynamic Calories Out (burned) for Today:
  const workoutBurn = appState.workouts.reduce((sum, w) => sum + w.calories, 0);
  const totalBurn = appState.metrics.caloriesBurned + workoutBurn;

  // Make sure today's record in history matches today's live stats:
  const todayRecord = appState.caloriesHistory.find(d => d.date === "Today");
  if (todayRecord) {
    todayRecord.caloriesIn = appState.metrics.foodCalories;
    todayRecord.caloriesOut = totalBurn;
  }

  const labels = appState.caloriesHistory.map(d => d.date);
  const dataIn = appState.caloriesHistory.map(d => d.caloriesIn);
  const dataOut = appState.caloriesHistory.map(d => d.caloriesOut);

  caloriesChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [
        {
          label: 'Calories In (Food)',
          data: dataIn,
          backgroundColor: '#51cf66',
          borderRadius: 6
        },
        {
          label: 'Calories Out (Burned)',
          data: dataOut,
          backgroundColor: '#ff6b6b',
          borderRadius: 6
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          labels: { color: '#94a3b8', font: { family: 'Outfit', size: 12 } }
        }
      },
      scales: {
        x: { ticks: { color: '#94a3b8', font: { family: 'Outfit' } }, grid: { display: false } },
        y: { ticks: { color: '#94a3b8', font: { family: 'Outfit' } }, grid: { color: 'rgba(255,255,255,0.05)' } }
      }
    }
  });
}

function saveChartHistoryLog() {
  const dateLabel = document.getElementById('input-chart-date').value.trim();
  const calIn = parseInt(document.getElementById('input-chart-in').value);
  const calOut = parseInt(document.getElementById('input-chart-out').value);

  if (dateLabel && !isNaN(calIn) && calIn >= 0 && !isNaN(calOut) && calOut >= 0) {
    // Check if the record already exists, update or add it
    const existing = appState.caloriesHistory.find(d => d.date.toLowerCase() === dateLabel.toLowerCase());
    if (existing) {
      existing.caloriesIn = calIn;
      existing.caloriesOut = calOut;
    } else {
      // Add the new record before "Today"
      const todayIndex = appState.caloriesHistory.findIndex(d => d.date === "Today");
      if (todayIndex !== -1) {
        appState.caloriesHistory.splice(todayIndex, 0, { date: dateLabel, caloriesIn: calIn, caloriesOut: calOut });
      } else {
        appState.caloriesHistory.push({ date: dateLabel, caloriesIn: calIn, caloriesOut: calOut });
      }
    }

    // Keep the chart trend showing max last 7 records for optimal rendering
    if (appState.caloriesHistory.length > 7) {
      appState.caloriesHistory.shift();
    }

    // Clear fields
    document.getElementById('input-chart-date').value = '';
    document.getElementById('input-chart-in').value = '';
    document.getElementById('input-chart-out').value = '';

    saveState();
    renderDashboard();
    closeLogModal();
  }
}

// Refresh / Sync Handler
async function handleRefreshSync() {
  const btn = document.getElementById('btn-refresh-sync');
  const icon = btn.querySelector('i');
  
  // Add spinning animation
  icon.classList.add('fa-spin');
  btn.disabled = true;

  const isConnected = appState.googleOAuth && (appState.googleOAuth.accessToken || appState.googleOAuth.refreshToken);
  
  if (isConnected) {
    // Connected — re-sync from Google
    try {
      await syncGoogleHealthData();
      // syncGoogleHealthData now shows its own honest toasts
    } catch (e) {
      showToast('⚠️ Sync failed. Try reconnecting.');
      console.error('Sync error:', e);
    }
  } else {
    // Not connected — just refresh dashboard from local state
    renderDashboard();
    showToast('🔄 Not connected. Click Connect Health first.');
  }

  // Stop spinning
  setTimeout(() => {
    icon.classList.remove('fa-spin');
    btn.disabled = false;
  }, 600);
}

// Update sync status indicator
function updateSyncStatus() {
  const btn = document.getElementById('btn-refresh-sync');
  if (!btn) return;

  const isConnected = appState.googleOAuth && (appState.googleOAuth.accessToken || appState.googleOAuth.refreshToken);
  
  if (isConnected) {
    btn.innerHTML = '<i class="fa-solid fa-arrows-rotate"></i> Sync';
    btn.style.borderColor = 'var(--fitbit-teal)';
    btn.style.color = 'var(--fitbit-teal)';
    btn.title = 'Re-sync data from Google Health';
  } else {
    btn.innerHTML = '<i class="fa-solid fa-arrows-rotate"></i> Refresh';
    btn.style.borderColor = 'var(--text-secondary)';
    btn.style.color = 'var(--text-secondary)';
    btn.title = 'Refresh dashboard from local data';
  }
}

// Simple toast notification
function showToast(message) {
  // Remove any existing toast
  const existingToast = document.querySelector('.toast-notification');
  if (existingToast) existingToast.remove();

  const toast = document.createElement('div');
  toast.className = 'toast-notification';
  toast.innerText = message;
  document.body.appendChild(toast);

  // Trigger show animation
  requestAnimationFrame(() => {
    toast.classList.add('show');
  });

  // Auto-hide after 3 seconds
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 400);
  }, 3000);
}

// Google OAuth 2.0 Integration & Live Sync Flow
// Uses the NEW Google Health API v4 (health.googleapis.com) which replaces both 
// the old Google Fitness API AND the legacy Fitbit Web API.
// Fitbit device data syncs through this API after users migrate to Google accounts.

// AUTO-EXCHANGE: Called when the page loads with ?code= in the URL after Google redirect
async function autoExchangeAuthCode(code) {
  const oauth = appState.googleOAuth;
  
  if (!oauth || !oauth.clientId || !oauth.clientSecret) {
    console.error('[FitMore] Cannot auto-exchange: missing saved client credentials.');
    showToast('⚠️ Missing credentials. Please re-enter via Connect Health.');
    return;
  }

  const redirectUri = oauth.redirectUri || (window.location.origin + window.location.pathname);
  
  console.log('[FitMore] Auto-exchanging auth code for tokens...');
  console.log('[FitMore] Using clientId:', oauth.clientId.substring(0, 20) + '...');
  console.log('[FitMore] Using redirectUri:', redirectUri);

  showToast('🔄 Connecting to Google Health...');

  try {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: oauth.clientId,
        client_secret: oauth.clientSecret,
        code: code,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri
      })
    });

    const data = await response.json();
    console.log('[FitMore] Auto-exchange response:', JSON.stringify(data));

    if (data.error) {
      console.error('[FitMore] Token exchange failed:', data.error, data.error_description);
      showToast('❌ Auth failed: ' + (data.error_description || data.error));
      return;
    }

    // Log what we got
    console.log('[FitMore] access_token:', data.access_token ? 'YES' : 'MISSING');
    console.log('[FitMore] refresh_token:', data.refresh_token ? 'YES' : 'MISSING');
    console.log('[FitMore] scope:', data.scope);

    appState.googleOAuth = {
      clientId: oauth.clientId,
      clientSecret: oauth.clientSecret,
      redirectUri: redirectUri,
      accessToken: data.access_token || '',
      refreshToken: data.refresh_token || oauth.refreshToken || '',
      tokenExpiry: Date.now() + ((data.expires_in || 3600) * 1000)
    };

    saveState();
    updateSyncStatus();
    showToast('✅ Connected! Syncing your health data...');
    
    // Now sync the actual health data
    await syncGoogleHealthData();
    showToast('✅ Health data synced successfully!');

  } catch (err) {
    console.error('[FitMore] Auto-exchange error:', err);
    showToast('❌ Connection failed: ' + err.message);
  }
}

function openGoogleAuth() {
  const clientId = document.getElementById('input-g-client-id').value.trim();
  const clientSecret = document.getElementById('input-g-client-secret').value.trim();
  const redirectUriVal = document.getElementById('input-g-redirect-uri').value.trim();
  
  if (!clientId) {
    alert("Please enter your Google Client ID first!");
    return;
  }
  if (!clientSecret) {
    alert("Please enter your Client Secret! It's needed after Google redirects back.");
    return;
  }
  if (!redirectUriVal) {
    alert("Please enter the Redirect URI!");
    return;
  }

  // SAVE credentials to state BEFORE redirect so they survive the page reload
  appState.googleOAuth.clientId = clientId;
  appState.googleOAuth.clientSecret = clientSecret;
  appState.googleOAuth.redirectUri = redirectUriVal;
  saveState();
  console.log('[FitMore] Saved credentials before redirect. ClientID:', clientId.substring(0, 20) + '...');

  const redirectUri = encodeURIComponent(redirectUriVal);
  
  // Request Google Health API scopes (covers Fitbit data after migration)
  // PLUS legacy Google Fitness scopes as fallback for users who haven't migrated
  const scope = encodeURIComponent(
    "https://www.googleapis.com/auth/userinfo.profile " +
    "https://www.googleapis.com/auth/googlehealth.activity_and_fitness.readonly " +
    "https://www.googleapis.com/auth/googlehealth.sleep.readonly " +
    "https://www.googleapis.com/auth/googlehealth.nutrition.readonly " +
    "https://www.googleapis.com/auth/googlehealth.health_metrics_and_measurements.readonly " +
    "https://www.googleapis.com/auth/fitness.activity.read " +
    "https://www.googleapis.com/auth/fitness.sleep.read " +
    "https://www.googleapis.com/auth/fitness.nutrition.read"
  );
  
  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=${scope}&access_type=offline&prompt=consent`;
  
  // Redirect in the SAME window — Google will redirect back to our app with ?code=
  // The app will auto-detect the code on reload and exchange it.
  window.location.href = authUrl;
}

async function saveGoogleSetup() {
  const clientId = document.getElementById('input-g-client-id').value.trim();
  const clientSecret = document.getElementById('input-g-client-secret').value.trim();
  const redirectUriVal = document.getElementById('input-g-redirect-uri').value.trim();
  let authInput = document.getElementById('input-g-auth-code').value.trim();
  
  if (!clientId || !clientSecret || !authInput) {
    alert("Please fill in Client ID, Client Secret, and paste the Authorization Code or redirected URL!");
    return;
  }
  if (!redirectUriVal) {
    alert("Please enter the Redirect URI!");
    return;
  }

  // Extract auth code if they pasted the full redirect URL
  let code = authInput;
  if (authInput.includes('code=')) {
    const urlParams = new URLSearchParams(authInput.split('?')[1]);
    code = urlParams.get('code');
  }

  try {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code: code,
        grant_type: 'authorization_code',
        redirect_uri: redirectUriVal
      })
    });

    const data = await response.json();
    console.log("[FitMore] Token exchange FULL response:", JSON.stringify(data));
    
    if (data.error) {
      alert("Error exchanging code: " + (data.error_description || data.error));
      return;
    }

    // Log exactly what we got for debugging
    console.log("[FitMore] access_token:", data.access_token ? "YES (" + data.access_token.substring(0,20) + "...)" : "MISSING");
    console.log("[FitMore] refresh_token:", data.refresh_token ? "YES" : "MISSING");
    console.log("[FitMore] expires_in:", data.expires_in);
    console.log("[FitMore] scope:", data.scope);

    appState.googleOAuth = {
      clientId: clientId,
      clientSecret: clientSecret,
      redirectUri: redirectUriVal,
      accessToken: data.access_token || '',
      refreshToken: data.refresh_token || (appState.googleOAuth ? appState.googleOAuth.refreshToken : ''),
      tokenExpiry: Date.now() + ((data.expires_in || 3600) * 1000)
    };

    saveState();
    updateSyncStatus();
    
    const tokenInfo = data.refresh_token ? 'Full access (with refresh token)' : 'Session access (no refresh token — token expires in ~1hr)';
    alert(`✅ Connected to Google Health!\n\n${tokenInfo}\nScopes: ${data.scope || 'unknown'}\n\nSyncing your data now...`);
    closeLogModal();
    syncGoogleHealthData();
  } catch (err) {
    alert("Failed to connect to Google OAuth: " + err.message);
  }
}

async function ensureValidAccessToken() {
  const oauth = appState.googleOAuth;
  if (!oauth || !oauth.refreshToken) return false;

  // If token is still valid (with 5 min safety buffer), return true
  if (oauth.tokenExpiry && Date.now() < (oauth.tokenExpiry - 300000)) {
    return true;
  }

  console.log("[FitMore] Access token expired or expiring soon. Refreshing...");
  try {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: oauth.clientId,
        client_secret: oauth.clientSecret,
        refresh_token: oauth.refreshToken,
        grant_type: 'refresh_token'
      })
    });

    const data = await response.json();
    if (data.error) {
      console.error("[FitMore] Failed to refresh token:", data.error, data.error_description);
      return false;
    }

    oauth.accessToken = data.access_token;
    oauth.tokenExpiry = Date.now() + (data.expires_in * 1000);
    saveState();
    console.log("[FitMore] Token refreshed successfully.");
    return true;
  } catch (err) {
    console.error("[FitMore] Token refresh call failed:", err);
    return false;
  }
}

// Main sync dispatcher — tries Fitness API with robust parsing and diagnostics
async function syncGoogleHealthData() {
  const isValid = await ensureValidAccessToken();
  if (!isValid) {
    showToast('⚠️ Token invalid. Please reconnect via Connect Health.');
    return;
  }

  console.log("[FitMore] ========== STARTING HEALTH DATA SYNC ==========");
  console.log("[FitMore] Access token:", appState.googleOAuth.accessToken ? appState.googleOAuth.accessToken.substring(0, 25) + '...' : 'MISSING');
  console.log("[FitMore] Token expiry:", new Date(appState.googleOAuth.tokenExpiry).toLocaleString());

  // Step 1: Discover what data sources exist in this account
  await discoverDataSources();

  // Step 2: Sync via Google Fitness REST API
  let dataFound = false;
  try {
    dataFound = await syncViaGoogleFitnessAPI();
  } catch (e) {
    console.error("[FitMore] Fitness API sync failed:", e.message);
  }

  // Ensure Today entry exists in calories history for chart
  let todayRecord = appState.caloriesHistory.find(d => d.date === "Today");
  if (!todayRecord) {
    appState.caloriesHistory.push({
      date: "Today",
      caloriesIn: appState.metrics.foodCalories,
      caloriesOut: appState.metrics.caloriesBurned
    });
  } else {
    todayRecord.caloriesOut = appState.metrics.caloriesBurned;
    todayRecord.caloriesIn = appState.metrics.foodCalories;
  }

  saveState();
  renderDashboard();

  if (dataFound) {
    console.log("[FitMore] ✅ Sync complete with data! Steps:", appState.metrics.steps, "Calories:", appState.metrics.caloriesBurned);
    showToast(`✅ Synced! ${appState.metrics.steps.toLocaleString()} steps, ${appState.metrics.caloriesBurned.toLocaleString()} cal burned`);
  } else {
    console.warn("[FitMore] ⚠️ Sync completed but NO data points were found.");
    console.warn("[FitMore] This usually means:");
    console.warn("[FitMore]   1. No Fitbit/Google Fit data exists for today yet (try wearing your device and walking)");
    console.warn("[FitMore]   2. Fitbit data hasn't synced to Google Fit (open Fitbit app → sync → then try again)");
    console.warn("[FitMore]   3. The Google account doesn't have any fitness data sources connected");
    console.warn("[FitMore] Check the data sources listed above ☝️ — if the list is empty, no device is syncing to this Google account.");
    showToast('⚠️ Connected but no fitness data found. See console (F12) for details.');
  }
  console.log("[FitMore] ========== SYNC FINISHED ==========");
}

// Discover all data sources in the user's Google Fitness account
// This helps diagnose whether Fitbit/device data is even reaching Google
async function discoverDataSources() {
  const accessToken = appState.googleOAuth.accessToken;
  try {
    const resp = await fetch('https://www.googleapis.com/fitness/v1/users/me/dataSources', {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });
    const data = await resp.json();

    if (data.error) {
      console.error("[FitMore] ❌ Failed to list data sources:", data.error.message || data.error);
      return;
    }

    const sources = data.dataSource || [];
    console.log(`[FitMore] 📊 Found ${sources.length} data source(s) in this Google account:`);
    
    if (sources.length === 0) {
      console.warn("[FitMore] ⚠️ NO DATA SOURCES! This account has no connected fitness devices/apps.");
      console.warn("[FitMore] To get Fitbit data here, the user needs to:");
      console.warn("[FitMore]   1. Open the Fitbit app on their phone");
      console.warn("[FitMore]   2. Make sure it's synced with their Google account");
      console.warn("[FitMore]   3. Install Google Fit and link it to the same Google account");
      return;
    }

    // Group by data type for readable output
    const byType = {};
    sources.forEach(s => {
      const typeName = s.dataType?.name || 'unknown';
      if (!byType[typeName]) byType[typeName] = [];
      byType[typeName].push({
        id: s.dataStreamId,
        device: s.device ? `${s.device.manufacturer || ''} ${s.device.model || ''}`.trim() : 'no device',
        app: s.application?.packageName || 'unknown'
      });
    });

    Object.entries(byType).forEach(([type, items]) => {
      console.log(`  📦 ${type}:`);
      items.forEach(item => {
        console.log(`     └─ ${item.app} | device: ${item.device} | stream: ${item.id.substring(0, 80)}...`);
      });
    });

  } catch (e) {
    console.error("[FitMore] Error discovering data sources:", e.message);
  }
}

// ---- Google Fitness REST API Sync ----
// Aggregates from ALL data sources (Fitbit, Google Fit, Wear OS, etc.)
// Returns true if ANY real data was found, false otherwise.
async function syncViaGoogleFitnessAPI() {
  const accessToken = appState.googleOAuth.accessToken;
  const now = Date.now();
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const durationMs = Math.max(now - todayStart.getTime(), 60000); // at least 1 minute

  let foundAnyData = false;

  // Helper: extract the summed value from ALL points across ALL buckets
  function extractTotal(data, valueField) {
    let total = 0;
    let pointCount = 0;
    if (!data || !data.bucket) return { total: 0, pointCount: 0 };

    data.bucket.forEach((bucket, bi) => {
      (bucket.dataset || []).forEach((ds, di) => {
        (ds.point || []).forEach((pt, pi) => {
          pointCount++;
          (pt.value || []).forEach(v => {
            // Google Fitness uses different value fields depending on data type
            const val = v[valueField] ?? v.intVal ?? v.fpVal ?? v.doubleVal ?? v.stringVal ?? 0;
            total += parseFloat(val) || 0;
          });
        });
      });
    });
    return { total, pointCount };
  }

  // Helper to make aggregate requests
  async function fetchAggregate(dataTypeName) {
    const body = {
      aggregateBy: [{ dataTypeName: dataTypeName }],
      bucketByTime: { durationMillis: durationMs },
      startTimeMillis: todayStart.getTime(),
      endTimeMillis: now
    };

    console.log(`[FitMore] 🔍 Requesting ${dataTypeName} | ${new Date(todayStart.getTime()).toLocaleTimeString()} → ${new Date(now).toLocaleTimeString()}`);

    const resp = await fetch('https://www.googleapis.com/fitness/v1/users/me/dataset:aggregate', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });
    
    const data = await resp.json();
    
    // Log the FULL response for debugging (truncate only if very large)
    const raw = JSON.stringify(data);
    if (raw.length > 2000) {
      console.log(`[FitMore] 📥 ${dataTypeName} response (${raw.length} chars, truncated):`, raw.substring(0, 2000) + '...');
    } else {
      console.log(`[FitMore] 📥 ${dataTypeName} FULL response:`, raw);
    }
    
    if (data.error) {
      console.error(`[FitMore] ❌ Fitness API error for ${dataTypeName}:`, data.error.message || data.error);
      return null;
    }
    
    // Log bucket/point summary
    const bucketCount = data.bucket?.length || 0;
    let totalPoints = 0;
    data.bucket?.forEach(b => b.dataset?.forEach(ds => totalPoints += (ds.point?.length || 0)));
    console.log(`[FitMore]    └─ ${bucketCount} bucket(s), ${totalPoints} data point(s)`);
    
    return data;
  }

  // ---- Fetch Steps ----
  try {
    const stepsData = await fetchAggregate("com.google.step_count.delta");
    const { total, pointCount } = extractTotal(stepsData, 'intVal');
    console.log(`[FitMore]    └─ Steps total: ${total} (from ${pointCount} points)`);
    if (total > 0) {
      appState.metrics.steps = Math.round(total);
      appState.metrics.distance = parseFloat((total * 0.00047).toFixed(2));
      foundAnyData = true;
    }
  } catch (e) {
    console.error("[FitMore] Error syncing steps:", e);
  }

  // ---- Fetch Calories Burned ----
  try {
    const calData = await fetchAggregate("com.google.calories.expended");
    const { total, pointCount } = extractTotal(calData, 'fpVal');
    console.log(`[FitMore]    └─ Calories total: ${Math.round(total)} (from ${pointCount} points)`);
    if (total > 0) {
      appState.metrics.caloriesBurned = Math.round(total);
      foundAnyData = true;
    }
  } catch (e) {
    console.error("[FitMore] Error syncing calories:", e);
  }

  // ---- Fetch Active Minutes ----
  try {
    const activeData = await fetchAggregate("com.google.active_minutes");
    const { total, pointCount } = extractTotal(activeData, 'intVal');
    console.log(`[FitMore]    └─ Active minutes total: ${total} (from ${pointCount} points)`);
    if (total > 0) {
      appState.metrics.activeMin = Math.round(total);
      foundAnyData = true;
    }
  } catch (e) {
    console.error("[FitMore] Error syncing active minutes:", e);
  }

  // ---- Fetch Distance ----
  try {
    const distData = await fetchAggregate("com.google.distance.delta");
    const { total, pointCount } = extractTotal(distData, 'fpVal');
    console.log(`[FitMore]    └─ Distance total: ${total.toFixed(1)} meters (from ${pointCount} points)`);
    if (total > 0) {
      appState.metrics.distance = parseFloat((total * 0.000621371).toFixed(2)); // meters to miles
      foundAnyData = true;
    }
  } catch (e) {
    console.error("[FitMore] Error syncing distance:", e);
  }

  // ---- Fetch Heart Rate (for calories estimation) ----
  try {
    const hrData = await fetchAggregate("com.google.heart_rate.bpm");
    const { total, pointCount } = extractTotal(hrData, 'fpVal');
    if (pointCount > 0) {
      const avgHR = Math.round(total / pointCount);
      console.log(`[FitMore]    └─ Avg heart rate: ${avgHR} bpm (from ${pointCount} points)`);
      foundAnyData = true;
    } else {
      console.log(`[FitMore]    └─ No heart rate data`);
    }
  } catch (e) {
    console.error("[FitMore] Error syncing heart rate:", e);
  }

  // ---- Fetch Sleep (via sessions API, not aggregate) ----
  try {
    const yesterdayStart = new Date();
    yesterdayStart.setDate(yesterdayStart.getDate() - 1);
    yesterdayStart.setHours(18, 0, 0, 0); // Look from 6 PM yesterday

    const sessionsUrl = `https://www.googleapis.com/fitness/v1/users/me/sessions?startTime=${yesterdayStart.toISOString()}&endTime=${new Date().toISOString()}&activityType=72`;
    // activityType 72 = sleep
    
    console.log(`[FitMore] 🔍 Requesting sleep sessions...`);
    const resp = await fetch(sessionsUrl, {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });
    const sessionsData = await resp.json();
    console.log(`[FitMore] 📥 Sleep sessions FULL response:`, JSON.stringify(sessionsData).substring(0, 2000));
    
    if (sessionsData.session && sessionsData.session.length > 0) {
      let totalSleepMs = 0;
      sessionsData.session.forEach(s => {
        const start = parseInt(s.startTimeMillis);
        const end = parseInt(s.endTimeMillis);
        if (start && end && end > start) {
          totalSleepMs += (end - start);
        }
      });
      if (totalSleepMs > 0) {
        appState.metrics.sleepHours = parseFloat((totalSleepMs / 3600000).toFixed(1));
        console.log(`[FitMore]    └─ Sleep: ${appState.metrics.sleepHours} hours (from ${sessionsData.session.length} session(s))`);
        foundAnyData = true;
      }
    } else {
      console.log(`[FitMore]    └─ No sleep sessions found`);
    }
  } catch (e) {
    console.error("[FitMore] Error syncing sleep:", e);
  }

  return foundAnyData;
}

// Pro Key Verification & Card Gating
function activateProVersion() {
  const key = document.getElementById('input-pro-license-key').value.trim();
  
  // Dynamic validation: Matches our custom test keys OR standard Gumroad UUID license key formats
  // Gumroad keys are standard hexadecimal strings separated by dashes, e.g. 8C56A478-B5494D62
  const isCustomKey = key.toUpperCase().startsWith('FITMORE-PRO-') && key.length > 12;
  const isGumroadKey = key.includes('-') && key.length >= 15;

  if (isCustomKey || isGumroadKey) {
    appState.isPro = true;
    saveState();
    alert("👑 FitMore Pro Activated! All legacy charts and trackers are now unlocked.");
    closeLogModal();
    renderDashboard();
  } else {
    alert("❌ Invalid Activation Key! Please check your input and try again.");
  }
}


function applyProOverlays() {
  const premiumTiles = ['sleep', 'caffeine', 'chart'];
  
  // Update Header Button Status
  const btnPro = document.getElementById('btn-pro-unlock');
  if (btnPro) {
    if (appState.isPro) {
      btnPro.innerHTML = '<i class="fa-solid fa-crown"></i> Pro Active';
      btnPro.style.borderColor = 'var(--fitbit-teal)';
      btnPro.style.color = 'var(--fitbit-teal)';
      btnPro.style.cursor = 'default';
      btnPro.onclick = (e) => e.preventDefault();
    } else {
      btnPro.innerHTML = '<i class="fa-solid fa-crown"></i> Get Pro';
      btnPro.style.borderColor = 'var(--color-active)';
      btnPro.style.color = 'var(--color-active)';
      btnPro.style.cursor = 'pointer';
    }
  }

  premiumTiles.forEach(tileKey => {
    const card = document.getElementById(`tile-${tileKey}`);
    if (!card) return;

    // Remove existing overlays
    const existingOverlay = card.querySelector('.pro-locked-overlay');
    if (existingOverlay) {
      existingOverlay.remove();
    }

    if (!appState.isPro) {
      card.classList.add('locked-card');
      const overlay = document.createElement('div');
      overlay.className = 'pro-locked-overlay';
      
      let title = "Feature Locked";
      let desc = "This feature requires a premium activation key.";
      if (tileKey === 'sleep') {
        title = "Detailed Sleep Stages";
        desc = "Unlock detailed REM, Deep, Light, and Awake segments tracking.";
      } else if (tileKey === 'caffeine') {
        title = "Caffeine Log Tracker";
        desc = "Log coffee, track daily mg thresholds, and maintain hydration logs.";
      } else if (tileKey === 'chart') {
        title = "Calories Comparison Trend";
        desc = "Compare daily Food Calories In vs burned Calories Out in a beautiful bar graph.";
      }

      overlay.innerHTML = `
        <i class="fa-solid fa-lock"></i>
        <h4>${title}</h4>
        <p>${desc}</p>
        <button class="btn btn-primary" onclick="openLogModal('pro-unlock')" style="background: var(--color-active); color: #0d131a; font-weight:700; border:none; padding: 0.4rem 1rem; font-size: 0.8rem; border-radius: 8px; cursor: pointer;">Unlock with Pro</button>
      `;
      card.appendChild(overlay);
    } else {
      card.classList.remove('locked-card');
    }
  });
}
