// spineAvatar.js — Axie Spine rendering via @axieinfinity/mixer + pixi-spine
// Ghost Canvas v2: avatars render into slots on ONE shared PIXI Application
// (spineAvatarManager.js) — a single WebGL context regardless of avatar count.
// The raycaster blits this instance's slot from the shared canvas using the
// 9-arg ctx.drawImage(source-rect) form via this._srcRect.
//
// References:
//   node_modules/@axieinfinity/mixer/README.md (canvas/scale/idle conventions)
//   pipeline/01-architect/pixi-shared-context-spec.md (R2)

import { Assets } from 'pixi.js'
import { Spine, TextureAtlas } from 'pixi-spine'
import { AtlasAttachmentLoader, SkeletonJson } from '@pixi-spine/runtime-3.8'
import {
  initAxieMixer,
  getAxieSpineFromGenes,
  getAxieColorPartShift,
  getVariantAttachmentPath,
} from '@axieinfinity/mixer'
import {
  acquireSlot, acquireSelfSlot, releaseSlot,
  registerInstance, unregisterInstance,
  markDirty, queueFeetScan, getSharedCanvas,
  SLOT_W, SLOT_H,
} from './spineAvatarManager.js'

import GenesData      from '@axieinfinity/mixer/dist/data/axie-2d-v3-stuff-genes.json'
import SamplesData    from '@axieinfinity/mixer/dist/data/axie-2d-v3-stuff-samples.json'
import VariantsData   from '@axieinfinity/mixer/dist/data/axie-2d-v3-stuff-variant.json'
import AnimationsData from '@axieinfinity/mixer/dist/data/axie-2d-v3-stuff-animations.json'

export const AXIE_CONTRACT    = '0x32950db2a7164ae833121501c797d79e7b79d74c'
// Slot dimensions — 800×600 per mixer README; values now sourced from the
// manager so renderer imports keep working unchanged.
export const SPINE_CANVAS_W = SLOT_W
export const SPINE_CANVAS_H = SLOT_H
export const SPINE_CANVAS_SIZE = SPINE_CANVAS_W  // kept for any existing imports
// Slot-relative Y where the Spine origin (ground contact) is placed.
// Fallback for feetFrac until the post-render alpha scan sets _feetY:
//   feetFrac = ((_feetY ?? SPINE_CANVAS_FEET_Y) + 1) / SPINE_CANVAS_H
export const SPINE_CANVAS_FEET_Y = 480

// Spine display scale — 0.6 fills roughly the bottom 2/3 of the 800×600 slot,
// making the character large enough to read at raycaster billboard distances.
// README used 0.3 for web display; raycaster needs the character to fill more.
const SPINE_SCALE = 0.6

// Sky Mavis CDN — CORS is enabled by Sky Mavis for third-party developers
const AXIE_CDN = 'https://axiecdn.axieinfinity.com/mixer-stuffs/v6/'

// ── Mixer singleton ─────────────────────────────────────────────────────────
// initAxieMixer is called once. The 4 JSON data files are bundled by Vite
// as static assets — no runtime network fetch needed for them.
let _mixerReady = false
function _ensureMixer () {
  if (_mixerReady) return
  initAxieMixer(GenesData, SamplesData, VariantsData, AnimationsData)
  _mixerReady = true
}

// ── CDN URL helper ───────────────────────────────────────────────────────────
// Sky Mavis enables CORS on axiecdn.axieinfinity.com for third-party browsers.
// PIXI uses WebGL textures — no 2D-canvas taint risk — so img-proxy is not needed.
function _cdnUrl (cdnRelativePath) {
  return AXIE_CDN + cdnRelativePath
}

// ── Texture list builder ─────────────────────────────────────────────────────
// Verbatim from README getRequiredTextures() — no path filtering.
// Filtering `!path` was skipping attachments whose path defaults to attachmentName,
// causing those parts to be missing/jumbled in the rendered Axie.
// NOTE: with a single shared renderer, Assets.load(url) dedups by URL — parts
// shared across Axies upload to VRAM exactly once (spec S6).
function _getRequiredTextures (skeletonDataAsset, variant) {
  const partColorShift = getAxieColorPartShift(variant)
  const list  = []
  const skinAttachments = skeletonDataAsset.skins[0]?.attachments ?? {}

  for (const slotName in skinAttachments) {
    const skinSlotAttachments = skinAttachments[slotName]
    for (const attachmentName in skinSlotAttachments) {
      // When path is unset in Spine JSON, the runtime uses attachmentName as the key
      const path = skinSlotAttachments[attachmentName].path ?? attachmentName
      const cdnPath = getVariantAttachmentPath(slotName, path, variant, partColorShift)
      list.push({ key: path, url: _cdnUrl(cdnPath) })
    }
  }
  return list
}

// ── SpineAvatarInstance ──────────────────────────────────────────────────────
export class SpineAvatarInstance {
  /**
   * @param {object}  opts
   * @param {boolean} opts.isSelf — local player avatar; acquires reserved slot 0
   */
  constructor ({ isSelf = false } = {}) {
    this._isSelf   = isSelf
    this.isSpine   = true
    this._canvas   = null     // SHARED canvas (manager's) — set after init
    this._srcRect  = null     // { x, y, w, h } slot region in the shared canvas
    this._slot     = null     // slot index, or null
    this._spine    = null     // pixi-spine Spine container
    this._feetY    = undefined // slot-relative ground row; set by _scanFeet
    this._destroyed = false
    this.pixelData = null     // kept for interface compat; unused
    this.isReady   = false
  }

  /**
   * Acquire a slot, mount the spine, pose frame 0, queue the feet scan.
   * Returns false when slots are exhausted or this instance was destroyed
   * mid-init — caller falls back to GenericSpineAvatarInstance.
   */
  _attach (spine) {
    const slot = this._isSelf
      ? acquireSelfSlot(spine, SPINE_CANVAS_FEET_Y)
      : acquireSlot(spine, SPINE_CANVAS_FEET_Y)

    if (!slot || this._destroyed) {
      if (slot) releaseSlot(slot.index)
      spine.destroy({ children: true })
      return false
    }

    this._slot    = slot.index
    this._srcRect = { x: slot.x, y: slot.y, w: SLOT_W, h: SLOT_H }
    this._spine   = spine
    this._canvas  = getSharedCanvas()

    spine.update(0)       // pose first frame so the slot isn't blank
    markDirty()
    queueFeetScan(this)   // same-task alpha scan after the next renderAll()
    registerInstance(this)
    this.isReady = true
    return true
  }

  /**
   * Build the Spine from the given Axie gene hex string.
   * Sets this.isReady = true on success. Silently falls back (isReady stays
   * false) on any failure so the caller degrades to GenericSpineAvatarInstance.
   *
   * @param {string} genesHex — 512-bit hex from Sky Mavis GraphQL
   */
  async init (genesHex) {
    try {
      _ensureMixer()

      // 1. Generate Spine skeleton data from genes
      const result = getAxieSpineFromGenes(genesHex, new Map(), false)
      if (!result || result.error || !result.skeletonDataAsset) {
        console.warn('[SpineAvatar] getAxieSpineFromGenes failed:', result?.error, 'genes:', genesHex)
        return
      }
      const { skeletonDataAsset, variant } = result

      // 2. Collect + load all required part textures (shared Assets cache)
      const texList = _getRequiredTextures(skeletonDataAsset, variant)
      const allTextures = {}
      await Promise.all(texList.map(async ({ key, url }) => {
        if (!key || !url) return
        try {
          allTextures[key] = await Assets.load(url)
        } catch (e) {
          console.warn('[SpineAvatar] texture load failed:', key, e.message)
        }
      }))
      if (this._destroyed) return   // destroyed while textures were loading

      // 3. Build pixi-spine skeleton (mirrors README exactly)
      const spineAtlas = new TextureAtlas()
      spineAtlas.addTextureHash(allTextures, false)
      const atlasLoader = new AtlasAttachmentLoader(spineAtlas)
      const jsonParser  = new SkeletonJson(atlasLoader)
      const spineData   = jsonParser.readSkeletonData(skeletonDataAsset)

      // 4. Create the Spine container — NO per-avatar Application (Ghost Canvas v2)
      const spine = new Spine(spineData)
      spine.autoUpdate = false
      spine.scale.set(SPINE_SCALE)
      spine.eventMode = 'none'

      // 5. Idle animation (try preferred names in order)
      const availableAnims = spineData.animations.map(a => a.name)
      const chosenAnim = ['action/idle/normal', 'action/idle/random-02', 'idle']
        .find(n => availableAnims.includes(n)) ?? availableAnims[0]
      if (chosenAnim) spine.state.setAnimation(0, chosenAnim, true)

      // 6. Mount into a shared-canvas slot
      this._attach(spine)

    } catch (e) {
      console.warn('[SpineAvatar] init() failed — raycaster will use GenericSpineAvatarInstance:', e)
      this.isReady = false
    }
  }

  /**
   * Load classic (pre-origins) Axie Spine data directly from Sky Mavis asset CDN.
   * No API key or genes required — uses pre-baked atlas/json/png at:
   *   https://assets.axieinfinity.com/axies/{axieId}/axie/axie.{atlas|json|png}
   *
   * Fallback when getAxieGenes() returns null or init() fails.
   *
   * @param {string|number} axieId — Axie token ID
   */
  async initFromClassicId (axieId) {
    try {
      const base = `https://assets.axieinfinity.com/axies/${axieId}/axie/axie`

      // Load atlas text, skeleton JSON, and texture in parallel
      const [atlasText, skeletonJson, texture] = await Promise.all([
        fetch(base + '.atlas').then(r => { if (!r.ok) throw new Error('atlas ' + r.status); return r.text() }),
        fetch(base + '.json').then(r => { if (!r.ok) throw new Error('json ' + r.status); return r.json() }),
        Assets.load(base + '.png'),
      ])
      if (this._destroyed) return

      // TextureAtlas may call the completion callback synchronously (during constructor)
      // before the outer atlasRef assignment completes. Deferring via microtask ensures
      // atlasRef is assigned before resolve() fires.
      let atlasRef
      const atlas = await new Promise((resolve, reject) => {
        try {
          atlasRef = new TextureAtlas(atlasText, (_path, loader) => {
            // Provide the pre-loaded texture for every page in the atlas
            loader(texture)
          }, () => {
            Promise.resolve().then(() => resolve(atlasRef))
          })
        } catch (e) { reject(e) }
      })

      const atlasLoader = new AtlasAttachmentLoader(atlas)
      const parser      = new SkeletonJson(atlasLoader)
      const spineData   = parser.readSkeletonData(skeletonJson)

      const spine = new Spine(spineData)
      spine.autoUpdate = false
      spine.scale.set(SPINE_SCALE)
      spine.eventMode = 'none'

      const anims = spineData.animations.map(a => a.name)
      const anim  = ['action/idle/normal', 'action/idle/random-02', 'idle']
        .find(n => anims.includes(n)) ?? anims[0]
      if (anim) spine.state.setAnimation(0, anim, true)

      this._attach(spine)

    } catch (e) {
      console.warn('[SpineAvatar] initFromClassicId() failed:', e)
      this.isReady = false
    }
  }

  /**
   * Advance animation by dt seconds. Does NOT render — the manager renders all
   * slots in ONE app.render() per frame (renderAll(), driven by renderFrame).
   *
   * @param {number} dt — seconds since last frame
   */
  update (dt) {
    if (!this.isReady || !this._spine) return
    // spine.update(dt) is the full SpineBase update cycle:
    //   state.update → state.apply → skeleton.updateWorldTransform
    //   → slot container setFromMatrix(bone.matrix) for every slot
    // The last step is what positions fin/tail/back/starfish at their bone offsets.
    this._spine.update(dt)
    markDirty()
  }

  /**
   * Release the slot and destroy the Spine. Terminal — instance cannot be
   * reused. Safe to call multiple times and on never-readied instances.
   * Wired at: multiplayer prune, avatar-change replacement, self avatar swap,
   * and between avatarCache fallback attempts.
   */
  destroy () {
    if (this._destroyed) return
    this._destroyed = true
    this.isReady = false
    unregisterInstance(this)
    if (this._slot !== null) { releaseSlot(this._slot); this._slot = null }
    this._spine?.destroy({ children: true })
    this._spine   = null
    this._canvas  = null
    this._srcRect = null
  }

  /** v1 context-loss policy: mark not-ready; re-init happens on the next
   *  avatar-change / prune cycle (Khronos HandlingContextLost, best effort). */
  _onContextRestored () {
    this.isReady = false
  }

  /**
   * Bottom-up alpha scan of THIS instance's slot region for the lowest visible
   * pixel row (slot-relative). Runs inside renderAll() in the same task as
   * app.render() — required because preserveDrawingBuffer is false.
   * The renderer anchors feetFrac = (_feetY + 1) / SPINE_CANVAS_H to the floor.
   */
  _scanFeet (glCanvas) {
    try {
      const r = this._srcRect
      const tmp = document.createElement('canvas')
      tmp.width = r.w; tmp.height = r.h
      const c = tmp.getContext('2d')
      c.drawImage(glCanvas, r.x, r.y, r.w, r.h, 0, 0, r.w, r.h)
      const d = c.getImageData(0, 0, r.w, r.h).data
      for (let y = r.h - 1; y >= 0; y--) {
        const row = y * r.w
        for (let x = 0; x < r.w; x++) {
          if (d[(row + x) * 4 + 3] > 16) { this._feetY = y; return }
        }
      }
      this._feetY = SPINE_CANVAS_FEET_Y
    } catch (e) {
      console.warn('[SpineAvatar] feet scan failed, using SPINE_CANVAS_FEET_Y:', e)
      this._feetY = SPINE_CANVAS_FEET_Y
    }
  }
}
