// ═══════════════════════════════════════════════════════════════
// splashEvents.js — one-shot & cooldown splash popups
// Extracted from main.js (Phase 5, mechanical). DOM/timers private;
// main's update loop calls the maybe*/dismiss* API.
// ═══════════════════════════════════════════════════════════════
import { ZONE_SPLASH } from './map.js'
import { panelOpen } from './uiPanelState.js'

// ── Tutorial splash — one-shot "TUTORIALS" hint ────────────────
let _tutorialSplashShown  = false
let _tutorialSplashEl     = null
let _tutorialSplashTimer  = null
let _tutorialSplashActive = false

function _ensureTutorialSplash() {
  if (_tutorialSplashEl) return _tutorialSplashEl
  const el = document.createElement('div')
  el.id = 'tutorial-splash'
  const heading  = document.createElement('div'); heading.id = 'ts-heading'
  const subtitle = document.createElement('div'); subtitle.id = 'ts-subtitle'
  heading.textContent  = 'TUTORIALS'
  subtitle.textContent = 'Five interactive guides ahead  →'
  el.appendChild(heading); el.appendChild(subtitle)
  document.body.appendChild(el)
  el.addEventListener('click', dismissTutorialSplash)
  _tutorialSplashEl = el
  return el
}

// One-shot trigger on entering the TUTORIAL zone. The shown flag is
// consumed even when suppressed by an open panel (original behavior).
export function maybeShowTutorialSplash(zoneId) {
  if (_tutorialSplashShown || zoneId !== 'TUTORIAL') return
  _tutorialSplashShown = true
  if (panelOpen()) return   // don't overlay a modal that's already open
  const el = _ensureTutorialSplash()
  el.classList.add('on')
  _tutorialSplashActive = true
  clearTimeout(_tutorialSplashTimer)
  _tutorialSplashTimer = setTimeout(dismissTutorialSplash, 4000)
}

export function isTutorialSplashActive() { return _tutorialSplashActive }

export function dismissTutorialSplash() {
  _tutorialSplashEl?.classList.remove('on')
  _tutorialSplashActive = false
  clearTimeout(_tutorialSplashTimer)
  _tutorialSplashTimer = null
}

// ═══════════════════════════════════════════════════════════════
// ZONE-ENTRY SPLASH — 5s hall announcement (spec R2 amendment 1)
// ═══════════════════════════════════════════════════════════════
const ZONE_SPLASH_MS       = 5000
const ZONE_SPLASH_COOLDOWN = 2 * 60 * 60 * 1000   // 2h per-zone re-show
const _zoneSplashLast = {}   // zone.id → Date.now() last shown
let _zoneSplashEl    = null
let _zoneSplashTimer = null
let _welcomeShown    = false

function _ensureZoneSplash() {
  if (_zoneSplashEl) return _zoneSplashEl
  const el = document.createElement('div')
  el.id = 'zone-splash'
  const title = document.createElement('div'); title.id = 'zs-title'
  const sub   = document.createElement('div'); sub.id = 'zs-sub'
  el.appendChild(title); el.appendChild(sub)
  document.body.appendChild(el)
  el.addEventListener('click', _dismissZoneSplash)
  _zoneSplashEl = el
  return el
}

function _showZoneSplash(cfg) {
  const el = _ensureZoneSplash()
  el.classList.remove('welcome')
  document.getElementById('zs-title').textContent = cfg.title
  document.getElementById('zs-sub').textContent   = cfg.sub
  el.classList.add('on')
  clearTimeout(_zoneSplashTimer)
  _zoneSplashTimer = setTimeout(_dismissZoneSplash, ZONE_SPLASH_MS)
}

// Movement-gated by the caller; cooldown/panel/tutorial gating internal.
export function maybeZoneSplash(zoneId) {
  const cfg = ZONE_SPLASH[zoneId]
  const nowMs = Date.now()
  if (cfg && nowMs - (_zoneSplashLast[zoneId] ?? -Infinity) > ZONE_SPLASH_COOLDOWN
          && !panelOpen() && !_tutorialSplashActive) {
    _zoneSplashLast[zoneId] = nowMs
    _showZoneSplash(cfg)
  }
}

// Welcome splash — THE OUTLET logo treatment, once per session on spawn
export function showWelcomeSplashOnce() {
  if (_welcomeShown) return
  _welcomeShown = true
  const el = _ensureZoneSplash()
  el.classList.add('welcome')
  const title = document.getElementById('zs-title')
  title.textContent = ''
  const the = document.createElement('span'); the.className = 'zs-the'; the.textContent = 'THE '
  const out = document.createElement('span'); out.className = 'zs-out'; out.textContent = 'OUTLET'
  title.appendChild(the); title.appendChild(out)
  document.getElementById('zs-sub').textContent = 'WebZone 001 · Welcome to the mall'
  el.classList.add('on')
  clearTimeout(_zoneSplashTimer)
  _zoneSplashTimer = setTimeout(_dismissZoneSplash, ZONE_SPLASH_MS)
}

function _dismissZoneSplash() {
  _zoneSplashEl?.classList.remove('on')
  clearTimeout(_zoneSplashTimer)
  _zoneSplashTimer = null
}
