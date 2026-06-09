(() => {
  const log     = document.getElementById('event-log');
  const stream  = document.getElementById('event-stream');
  const input   = document.getElementById('cmd-input');
  const submit  = document.getElementById('cmd-submit');
  const charOverlay = document.getElementById('character-overlay');
  const charDock = document.getElementById('character-dock');
  const charDockTitle = document.getElementById('character-dock-title');
  const charDockSubtitle = document.getElementById('character-dock-subtitle');
  const charDockOpen = document.getElementById('character-dock-open');
  const charModal = document.getElementById('character-modal');
  const charModalName = document.getElementById('character-name');
  const charModalJob = document.getElementById('character-job');
  const charModalSubmit = document.getElementById('character-create');
  const charModalStatus = document.getElementById('character-modal-status');

  const CHARACTER_STORAGE_KEY = 'softrpg.characterId';
  let currentCharacter = null;
  let currentCrisis = null;
  let isCharacterDocked = false;
  let refreshTimer = null;
  let pendingCommand = null;

  // ── Event log helpers ──────────────────────────────────────
  function appendEvent(text, type = '') {
    const line = document.createElement('div');
    line.className = 'event-line' + (type ? ' ' + type : '');
    line.textContent = text;
    log.appendChild(line);
    stream.scrollTop = stream.scrollHeight;
  }

  // ── Server-Sent Events ─────────────────────────────────────
  const sse = new EventSource('/api/events');

  sse.addEventListener('message', (e) => {
    try {
      const data = JSON.parse(e.data);
      const text = data.text ?? e.data;
      if (pendingCommand && data.type === 'system' && text === `[cmd] ${pendingCommand}`) {
        pendingCommand = null;
        return;
      }
      appendEvent(text, data.type ?? '');
    } catch {
      appendEvent(e.data);
    }
  });

  sse.addEventListener('error', () => {
    appendEvent('Connection lost — reconnecting…', 'error');
  });

  // ── Command input ──────────────────────────────────────────
  async function sendCommand() {
    const text = input.value.trim();
    if (!text) return;
    pendingCommand = text;
    appendEvent('> ' + text, 'player');
    input.value = '';

    try {
      const characterId = localStorage.getItem(CHARACTER_STORAGE_KEY);
      const res = await fetch('/api/command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command: text, characterId }),
      });
      const data = await res.json();
      if (data.response) appendEvent(data.response, 'ai');
      if (data.error)    appendEvent(data.error, 'error');

      if (data.stamina && currentCharacter) {
        currentCharacter.stamina = data.stamina;
      }

      if (data.level !== undefined && currentCharacter) {
        currentCharacter.level = data.level;
        currentCharacter.experience = data.experience;
      }

      if (data.incident !== undefined && currentCharacter) {
        currentCharacter.currentIncident = data.incident;
        setIncidents(data.incident);
      }

      if (currentCharacter && (data.stamina || data.level !== undefined || data.incident !== undefined)) {
        renderCharacterOverlay(currentCharacter);
      }

      if (data.crisis) {
        currentCrisis = data.crisis;
        setCrisis(currentCrisis);
      }
    } catch (err) {
      appendEvent('Request failed: ' + err.message, 'error');
    }
  }

  submit.addEventListener('click', sendCommand);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') sendCommand();
  });

  function setWorldPlaceholder(title, sub) {
    const titleEl = document.getElementById('world-placeholder-title');
    const subEl = document.getElementById('world-placeholder-sub');
    if (titleEl) titleEl.textContent = title;
    if (subEl) subEl.textContent = sub;
  }

  function showCharacterModal() {
    if (!charModal) return;
    charModal.classList.remove('hidden');
    if (charModalStatus) charModalStatus.textContent = '';
    if (charModalName) charModalName.value = '';
    if (charModalJob) charModalJob.value = '';
    window.setTimeout(() => charModalName?.focus(), 50);
  }

  function hideCharacterModal() {
    if (!charModal) return;
    charModal.classList.add('hidden');
  }

  function setCharacterStatus(message, isError = false) {
    if (!charModalStatus) return;
    charModalStatus.textContent = message;
    charModalStatus.style.color = isError ? '#e06c75' : '';
  }

  function renderCharacterDock(character) {
    if (!charDock || !charDockTitle || !charDockSubtitle || !character) return;
    charDockTitle.textContent = character.name;
    charDockSubtitle.textContent = character.jobTitle;
  }

  function showCharacterOverlay() {
    if (!charOverlay) return;
    charOverlay.classList.remove('hidden');
    charDock?.classList.add('hidden');
    isCharacterDocked = false;
  }

  function showCharacterDock() {
    if (!charDock) return;
    charOverlay?.classList.add('hidden');
    charDock.classList.remove('hidden');
    isCharacterDocked = true;
  }

  function toggleCharacterDock() {
    if (!currentCharacter) return;
    if (isCharacterDocked) {
      showCharacterOverlay();
    } else {
      showCharacterDock();
    }
  }

  function renderCharacterOverlay(character) {
    if (!charOverlay || !character) return;
    currentCharacter = character;
    renderCharacterDock(character);
    showCharacterOverlay();

    // Display the character's active incident in the right column
    if (character.currentIncident) {
      setIncidents(character.currentIncident);
    }

    const strengths = (character.stats?.strengths || []).map((item) => `<li>${item}</li>`).join('');
    const weaknesses = (character.stats?.weaknesses || []).map((item) => `<li>${item}</li>`).join('');
    const items = (character.starterItems || []).map((item) => `
      <li><strong>[${item.key}]</strong> ${item.name}${item.description ? ` — ${item.description}` : ''}</li>
    `).join('');

    const staminaCurrent = character.stamina?.current ?? 0;
    const staminaMax = character.stamina?.max ?? 0;
    const staminaPercent = staminaMax ? Math.round((staminaCurrent / staminaMax) * 100) : 0;

    const level = character.level ?? 1;
    const experience = character.experience ?? 0;
    const experiencePercent = Math.round((experience / 1000) * 100);

    charOverlay.innerHTML = `
      <div class="character-card">
        <div class="character-card-header">
          <div>
            <div class="character-card-title">${character.name}</div>
            <div class="character-card-subtitle">${character.jobTitle} • Level ${level}</div>
          </div>
          <div class="character-card-controls">
            <button id="character-overlay-toggle" class="character-action-button" type="button" aria-label="Minimize character sheet">—</button>
          </div>
        </div>

        <div class="character-section experience-section">
          <strong>Experience</strong>
          <p>${experience}/1000</p>
          <div class="experience-bar-wrap">
            <div class="experience-bar" style="width: ${experiencePercent}%;"></div>
          </div>
        </div>

        <div class="character-section stamina-section">
          <strong>Stamina</strong>
          <p>${staminaCurrent}/${staminaMax} remaining</p>
          <div class="stamina-bar-wrap">
            <div class="stamina-bar" style="width: ${staminaPercent}%;"></div>
          </div>
        </div>

        <div class="character-section">
          <strong>Personality</strong>
          <p>${character.personality || 'A freshly generated tech adventurer.'}</p>
        </div>

        <div class="character-section">
          <strong>Strengths</strong>
          <ul class="character-list">${strengths}</ul>
        </div>

        <div class="character-section">
          <strong>Weaknesses</strong>
          <ul class="character-list">${weaknesses}</ul>
        </div>

        <div class="character-section">
          <strong>Starting items</strong>
          <ul class="character-list">${items}</ul>
        </div>
      </div>
    `;

    const toggleButton = document.getElementById('character-overlay-toggle');
    if (toggleButton) {
      toggleButton.addEventListener('click', toggleCharacterDock);
    }
  }

  async function refreshCrisisState() {
    try {
      const res = await fetch('/api/crisis');
      if (!res.ok) return;
      const crisis = await res.json();
      currentCrisis = crisis;
      setCrisis(currentCrisis);
    } catch {
      // ignore refresh errors
    }
  }

  async function startCharacterRefresh() {
    if (refreshTimer) return;
    refreshTimer = window.setInterval(() => {
      refreshCharacterState();
      refreshCrisisState();
    }, 15_000);
    await refreshCrisisState();
  }

  async function refreshCharacterState() {
    const characterId = localStorage.getItem(CHARACTER_STORAGE_KEY);
    if (!characterId) return;

    try {
      const res = await fetch(`/api/characters/${encodeURIComponent(characterId)}`);
      if (!res.ok) return;
      const character = await res.json();
      currentCharacter = character;
      renderCharacterOverlay(character);
    } catch {
      // ignore refresh failures
    }
  }

  async function createCharacter() {
    if (!charModalName || !charModalJob) return;

    const name = charModalName.value.trim();
    const jobTitle = charModalJob.value.trim();

    if (!name || !jobTitle) {
      setCharacterStatus('Please enter both a name and a job title.', true);
      return;
    }

    setCharacterStatus('Generating your character…');
    charModalSubmit.disabled = true;

    try {
      const res = await fetch('/api/characters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, jobTitle }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Unable to create character.');
      }

      localStorage.setItem(CHARACTER_STORAGE_KEY, data.id);
      hideCharacterModal();
      renderCharacterOverlay(data);
      setWorldPlaceholder(`Welcome back, ${data.name}`, data.jobTitle);
      await startCharacterRefresh();
    } catch (err) {
      setCharacterStatus(err.message || 'Character creation failed.', true);
    } finally {
      charModalSubmit.disabled = false;
    }
  }

  async function loadCharacter() {
    const storedId = localStorage.getItem(CHARACTER_STORAGE_KEY);
    if (storedId) {
      try {
        const res = await fetch(`/api/characters/${encodeURIComponent(storedId)}`);
        if (res.ok) {
          const character = await res.json();
          renderCharacterOverlay(character);
          setWorldPlaceholder(`Welcome back, ${character.name}`, character.jobTitle);
          await startCharacterRefresh();
          return;
        }
      } catch {
        // fall through to modal
      }
    }
    showCharacterModal();
  }

  charModalSubmit.addEventListener('click', createCharacter);
  charModal.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') createCharacter();
  });

  charDockOpen?.addEventListener('click', toggleCharacterDock);
  refreshCrisisState();  loadCharacter();

  // ── Status dashboard ───────────────────────────────────────

  const METRICS = {
    serverHealth: { label: 'Server Health', inverted: false },
    techDebt:     { label: 'Technical Debt', inverted: true  },
    reliability:  { label: 'Reliability',   inverted: false },
    velocity:     { label: 'Velocity',      inverted: false },
  };

  function level(pct, inverted) {
    const effective = inverted ? pct : pct;
    if (inverted) {
      if (effective >= 75) return 'critical';
      if (effective >= 40) return 'warning';
      return 'ok';
    }
    if (effective <= 25) return 'critical';
    if (effective <= 55) return 'warning';
    return 'ok';
  }

  function updateMetric(key, pct) {
    const bar   = document.querySelector(`.stat-bar[data-key="${key}"]`);
    const value = document.querySelector(`.stat-value[data-key="${key}"]`);
    const badge = document.querySelector(`.stat-badge[data-key="${key}"]`);
    if (!bar) return;

    const l = level(pct, METRICS[key].inverted);
    bar.style.width = pct + '%';
    bar.setAttribute('data-level', l);
    value.textContent = pct + '%';
    badge.textContent = l.toUpperCase();
    badge.setAttribute('data-level', l);
  }

  function setIncidents(incident) {
    const list  = document.getElementById('incident-list');
    const count = document.getElementById('incident-count');
    list.innerHTML = '';

    if (!incident) {
      count.textContent = '0';
      count.classList.remove('has-incidents');
      const empty = document.createElement('li');
      empty.className = 'incident-empty';
      empty.textContent = 'No active incidents';
      list.appendChild(empty);
      return;
    }

    count.textContent = '1';
    count.classList.add('has-incidents');

    const li = document.createElement('li');
    li.className = 'incident-item';
    
    const sev = document.createElement('span');
    sev.className = 'incident-sev p3';
    
    const txt = document.createElement('span');
    txt.className = 'incident-text';
    txt.innerHTML = `<strong>${incident.title}</strong><br><small>${incident.description}</small>`;
    
    const hint = document.createElement('div');
    hint.style.marginTop = '8px';
    hint.style.fontSize = '12px';
    hint.style.color = 'var(--text-dim)';
    hint.innerHTML = 'Use: <code>/incident your solution</code>';
    
    li.append(sev, txt);
    li.appendChild(hint);
    list.appendChild(li);
  }

  // ── Crisis tracker ────────────────────────────────────────
  function setCrisis(crisis) {
    const badge   = document.getElementById('crisis-status-badge');
    const name    = document.getElementById('crisis-name');
    const desc    = document.getElementById('crisis-description');
    const sevBar  = document.getElementById('crisis-severity-bar');
    const sevVal  = document.getElementById('crisis-severity-val');
    const solvedBar = document.getElementById('crisis-solved-bar');
    const solvedVal = document.getElementById('crisis-solved-val');
    const timBar  = document.getElementById('crisis-timer-bar');
    const timVal  = document.getElementById('crisis-timer-val');
    const tags    = document.getElementById('crisis-tags');

    if (!crisis) {
      badge.textContent = 'NONE';
      badge.className = 'tracker-status-badge';
      name.textContent = 'No active crisis';
      desc.textContent = 'Awaiting the first incident.';
      sevBar.style.width = '0%'; sevVal.textContent = '—';
      solvedBar.style.width = '0%'; solvedVal.textContent = '0%';
      timBar.style.width = '0%'; timVal.textContent = '—';
      tags.innerHTML = '';
      return;
    }

    badge.textContent = crisis.status || 'ACTIVE';
    badge.className = 'tracker-status-badge active';
    name.textContent = crisis.title || crisis.name || 'Unknown crisis';
    desc.textContent = crisis.description || '';

    const sev = crisis.severity ?? 0;
    sevBar.style.width = sev + '%';
    sevBar.setAttribute('data-level', sev >= 75 ? 'critical' : sev >= 40 ? 'warning' : 'ok');
    sevVal.textContent = sev + '%';

    const solved = crisis.percentageSolved ?? 0;
    solvedBar.style.width = solved + '%';
    solvedVal.textContent = solved + '%';

    const tim = crisis.timeRemaining ?? 100;
    timBar.style.width = tim + '%';
    timVal.textContent = crisis.timeLabel || tim + '%';

    tags.innerHTML = (crisis.tags || []).map(t =>
      `<span class="tracker-tag">${t}</span>`).join('');
  }

  // ── World Boss tracker ───────────────────────────────────
  function setBoss(boss) {
    const badge   = document.getElementById('boss-status-badge');
    const name    = document.getElementById('boss-name');
    const hpBar   = document.getElementById('boss-hp-bar');
    const hpVal   = document.getElementById('boss-hp-val');
    const rageBar = document.getElementById('boss-rage-bar');
    const rageVal = document.getElementById('boss-rage-val');
    const tags    = document.getElementById('boss-tags');

    if (!boss || !boss.active) {
      badge.textContent = 'DORMANT';
      badge.className = 'tracker-status-badge';
      name.textContent = 'No active world boss';
      hpBar.style.width = '0%';   hpVal.textContent = '—';
      rageBar.style.width = '0%'; rageVal.textContent = '—';
      tags.innerHTML = '';
      return;
    }

    badge.textContent = boss.status || 'ACTIVE';
    badge.className = 'tracker-status-badge active';
    name.textContent = boss.name || 'Unknown boss';

    const hp = boss.hp ?? 100;
    hpBar.style.width = hp + '%';
    hpBar.setAttribute('data-level', hp <= 25 ? 'critical' : hp <= 55 ? 'warning' : 'ok');
    hpVal.textContent = hp + '%';

    const rage = boss.rage ?? 0;
    rageBar.style.width = rage + '%';
    rageBar.setAttribute('data-level', rage >= 75 ? 'critical' : rage >= 40 ? 'warning' : 'ok');
    rageVal.textContent = rage + '%';

    tags.innerHTML = (boss.tags || []).map(t =>
      `<span class="tracker-tag">${t}</span>`).join('');
  }

  // Handle world-status SSE events
  sse.addEventListener('world-status', (e) => {
    try {
      const data = JSON.parse(e.data);
      if (data.metrics) {
        for (const [key, pct] of Object.entries(data.metrics)) updateMetric(key, pct);
      }
      if (data.crisis    !== undefined) setCrisis(data.crisis);
      if (data.boss      !== undefined) setBoss(data.boss);
    } catch { /* ignore malformed */ }
  });

  // Seed with placeholder values until the server sends real data
  updateMetric('serverHealth', 82);
  updateMetric('techDebt',     47);
  updateMetric('reliability',  91);
  updateMetric('velocity',     60);
  setIncidents(null);
  setCrisis(null);
  setBoss(null);

  // ── Boot message ───────────────────────────────────────────
  appendEvent('SoftRPG initialised.', 'system');
})();
