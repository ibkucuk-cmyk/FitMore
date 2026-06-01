// Core Fitbit Legacy Dashboard Controller

// App State (Default values if not in localStorage)
const DEFAULT_STATE = {
  goals: {
    steps: 10000,
    calories: 2200,
    distance: 5.0,
    active: 30
  },
  metrics: {
    steps: 7854,
    caloriesBurned: 1450, // base calories burned before workouts
    distance: 3.4,
    activeMin: 22,
    sleepHours: 7.4,
    sleepScore: 82,
    stressScore: 78,
    stressMood: "Calm & Balanced",
    caffeineMg: 250,
    waterOz: 32,
    foodCalories: 1450
  },
  workouts: [
    { type: "Running", duration: 20, calories: 250, time: "08:15 AM" }
  ],
  caloriesHistory: [
    { date: "May 28", caloriesIn: 1800, caloriesOut: 2000 },
    { date: "May 29", caloriesIn: 2100, caloriesOut: 2200 },
    { date: "May 30", caloriesIn: 1950, caloriesOut: 2150 },
    { date: "May 31", caloriesIn: 2300, caloriesOut: 2400 },
    { date: "Today", caloriesIn: 1450, caloriesOut: 1700 }
  ],
  visibleTiles: {
    sleep: true,
    stress: true,
    caffeine: true,
    food: true,
    workout: true,
    water: true,
    chart: true
  },
  isPro: false
};

let appState = JSON.parse(localStorage.getItem('fitbit_classic_state')) || DEFAULT_STATE;

// Ensure any missing state keys are backfilled automatically
if (!appState.caloriesHistory) {
  appState.caloriesHistory = [
    { date: "May 28", caloriesIn: 1800, caloriesOut: 2000 },
    { date: "May 29", caloriesIn: 2100, caloriesOut: 2200 },
    { date: "May 30", caloriesIn: 1950, caloriesOut: 2150 },
    { date: "May 31", caloriesIn: 2300, caloriesOut: 2400 },
    { date: "Today", caloriesIn: 1450, caloriesOut: 1700 }
  ];
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
    if (appState.googleOAuth) {
      document.getElementById('input-g-client-id').value = appState.googleOAuth.clientId || '';
      document.getElementById('input-g-client-secret').value = appState.googleOAuth.clientSecret || '';
      document.getElementById('input-g-redirect-uri').value = appState.googleOAuth.redirectUri || 'http://localhost:5500';
    }
  });


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

  // Try to sync with Google Health on startup if connected
  if (appState.googleOAuth && appState.googleOAuth.refreshToken) {
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

// 3. Sleep Details & Stages Breakdown Render
function updateSleepUI() {
  const tile = document.getElementById('tile-sleep');
  if (!tile) return;

  const hr = Math.floor(appState.metrics.sleepHours);
  const min = Math.round((appState.metrics.sleepHours - hr) * 60);
  tile.querySelector('.card-body div div').innerText = `${hr}h ${min}m`;
  tile.querySelector('strong').innerText = `${appState.metrics.sleepScore} (Good)`;
}

// 4. Stress management scores UI
function updateStressUI() {
  document.getElementById('stress-score').innerText = appState.metrics.stressScore;
  document.getElementById('stress-status').innerText = appState.metrics.stressMood;
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

  if (!isNaN(hours) && hours > 0) appState.metrics.sleepHours = hours;
  if (!isNaN(score) && score > 0 && score <= 100) appState.metrics.sleepScore = score;

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

// Google OAuth 2.0 Integration & Live Sync Flow
// Google OAuth 2.0 Integration & Live Sync Flow
function openGoogleAuth() {
  const clientId = document.getElementById('input-g-client-id').value.trim();
  const redirectUriVal = document.getElementById('input-g-redirect-uri').value.trim() || 'http://localhost:5500';
  if (!clientId) {
    alert("Please enter your Google Client ID first!");
    return;
  }
  const redirectUri = encodeURIComponent(redirectUriVal);
  // Request active fitness and nutrition scopes
  const scope = encodeURIComponent(
    "https://www.googleapis.com/auth/userinfo.profile " +
    "https://www.googleapis.com/auth/fitness.activity.read " +
    "https://www.googleapis.com/auth/fitness.sleep.read " +
    "https://www.googleapis.com/auth/fitness.nutrition.read"
  );
  
  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=${scope}&access_type=offline&prompt=consent`;
  
  window.open(authUrl, '_blank');
}

async function saveGoogleSetup() {
  const clientId = document.getElementById('input-g-client-id').value.trim();
  const clientSecret = document.getElementById('input-g-client-secret').value.trim();
  const redirectUriVal = document.getElementById('input-g-redirect-uri').value.trim() || 'http://localhost:5500';
  let authInput = document.getElementById('input-g-auth-code').value.trim();
  
  if (!clientId || !clientSecret || !authInput) {
    alert("Please fill in Client ID, Client Secret, and paste the Authorization Code or redirected URL!");
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
    if (data.error) {
      alert("Error exchanging code: " + (data.error_description || data.error));
      return;
    }

    appState.googleOAuth = {
      clientId: clientId,
      clientSecret: clientSecret,
      redirectUri: redirectUriVal,
      accessToken: data.access_token,
      refreshToken: data.refresh_token || (appState.googleOAuth ? appState.googleOAuth.refreshToken : ''),
      tokenExpiry: Date.now() + (data.expires_in * 1000)
    };


    saveState();
    alert("Successfully connected to Google Health! Syncing data...");
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

  console.log("Access token expired or expiring soon. Refreshing...");
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
      console.error("Failed to refresh token: " + data.error);
      return false;
    }

    oauth.accessToken = data.access_token;
    oauth.tokenExpiry = Date.now() + (data.expires_in * 1000);
    saveState();
    return true;
  } catch (err) {
    console.error("Token refresh call failed: ", err);
    return false;
  }
}

async function syncGoogleHealthData() {
  const isValid = await ensureValidAccessToken();
  if (!isValid) return;

  const accessToken = appState.googleOAuth.accessToken;
  const now = Date.now();
  // Get start of today (midnight)
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  try {
    // Fetch aggregated steps count from Google Fitness aggregate endpoint
    const stepsResponse = await fetch('https://www.googleapis.com/fitness/v1/users/me/dataset/aggregate', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        aggregateBy: [{
          dataTypeName: "com.google.step_count.delta",
          dataSourceId: "derived:com.google.step_count.delta:com.google.android.gms:estimated_steps"
        }],
        bucketByTime: { durationMillis: (now - todayStart.getTime()) },
        startTimeMillis: todayStart.getTime(),
        endTimeMillis: now
      })
    });

    const stepsData = await stepsResponse.json();
    if (stepsData.bucket && stepsData.bucket[0] && stepsData.bucket[0].dataset[0].point[0]) {
      const stepVal = stepsData.bucket[0].dataset[0].point[0].value[0].intVal;
      appState.metrics.steps = stepVal;
      appState.metrics.distance = stepVal * 0.00047; // approx miles conversion
      saveState();
      renderDashboard();
    }
  } catch (e) {
    console.error("Error syncing steps: ", e);
  }
}

// Pro Key Verification & Card Gating
function activateProVersion() {
  const key = document.getElementById('input-pro-license-key').value.trim();
  
  // Off-line local key validation algorithm
  // Matches any key starting with "FITMORE-PRO-" with a length > 12 characters (e.g. FITMORE-PRO-2026)
  if (key.toUpperCase().startsWith('FITMORE-PRO-') && key.length > 12) {
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



