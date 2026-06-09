// spineAvatar.js — Axie Spine rendering via @axieinfinity/mixer + pixi-spine
// Implements the Ghost Canvas pattern: an off-screen PIXI.Application renders the Axie;
// the raycaster reads _canvas pixels and composites them into the 3D scene each frame.
//
// Reference: node_modules/@axieinfinity/mixer/README.md (complete working example)

import { Application, Assets } from 'pixi.js'
import { Spine, TextureAtlas } from 'pixi-spine'
import { AtlasAttachmentLoader, SkeletonJson } from '@pixi-spine/runtime-3.8'
import {
  initAxieMixer,
  getAxieSpineFromGenes,
  getAxieColorPartShift,
  getVariantAttachmentPath,
} from '@axieinfinity/mixer'

import GenesData      from '@axieinfinity/mixer/dist/data/axie-2d-v3-stuff-genes.json'
import SamplesData    from '@axieinfinity/mixer/dist/data/axie-2d-v3-stuff-samples.json'
import VariantsData   from '@axieinfinity/mixer/dist/data/axie-2d-v3-stuff-variant.json'
import AnimationsData from '@axieinfinity/mixer/dist/data/axie-2d-v3-stuff-animations.json'

export const AXIE_CONTRACT    = '0x32950db2a7164ae833121501c797d79e7b79d74c'
// Canvas dimensions — 800×600 per mixer README.
export const SPINE_CANVAS_W = 800
export const SPINE_CANVAS_H = 600
export const SPINE_CANVAS_SIZE = SPINE_CANVAS_W  // kept for any existing imports
// Canvas Y where the Axie's ground-contact point (Spine origin) lands.
// spine.position.y is set to this value below — the renderer derives feetFrac from it:
//   feetFrac = SPINE_CANVAS_FEET_Y / SPINE_CANVAS_H
// Raising it moves feet lower in canvas → character sinks toward the raycaster floor.
export const SPINE_CANVAS_FEET_Y = 480

// Spine display scale — 0.6 fills roughly the bottom 2/3 of the 800×600 canvas,
// making the character large enough to read at raycaster billboard distances.
// README used 0.3 for web display; raycaster needs the character to fill more canvas.
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
  constructor (canvasW = SPINE_CANVAS_W, canvasH = SPINE_CANVAS_H) {
    this._w    = canvasW
    this._h    = canvasH
    this._size = canvasW  // kept for interface compat
    this._canvas  = null     // HTMLCanvasElement — set after successful init()
    this._app     = null     // PIXI.Application
    this._spine   = null     // pixi-spine Spine container
    this.pixelData = null    // kept for interface compat; not used by _drawSpineOverlay
    this.isReady   = false
  }

  /**
   * Build the off-screen PIXI Spine from the given Axie gene hex string.
   * Sets this.isReady = true and exposes this._canvas on success.
   * Silently falls back (isReady stays false) on any failure so the raycaster
   * degrades to GenericSpineAvatarInstance.
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

      // 2. Collect + load all required part textures
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

      // 3. Build pixi-spine skeleton (mirrors README exactly)
      const spineAtlas = new TextureAtlas()
      spineAtlas.addTextureHash(allTextures, false)
      const atlasLoader = new AtlasAttachmentLoader(spineAtlas)
      const jsonParser  = new SkeletonJson(atlasLoader)
      const spineData   = jsonParser.readSkeletonData(skeletonDataAsset)

      // 4. Create off-screen PIXI.Application
      // Dimensions from mixer README working example: 800×600, position(400,400), scale(0.3)
      const cW = this._w, cH = this._h
      const offscreenCanvas = document.createElement('canvas')
      const app = new Application({
        view:                 offscreenCanvas,
        width:                cW,
        height:               cH,
        backgroundAlpha:      0,
        autoStart:            false,
        resolution:           1,
        preserveDrawingBuffer: true,  // required so ctx.drawImage reads WebGL buffer correctly
      })

      // 5. Create Spine container
      // position.x = canvas center; position.y = SPINE_CANVAS_FEET_Y (ground contact).
      // scale = SPINE_SCALE (0.6) — character fills ~60% of canvas height so it renders
      // at readable size in the raycaster billboard. README's 0.3 was for web display.
      const spine = new Spine(spineData)
      spine.autoUpdate = false
      spine.position.set(SPINE_CANVAS_W / 2, SPINE_CANVAS_FEET_Y)
      spine.scale.set(SPINE_SCALE)

      // Disable PIXI event system on off-screen app — prevents "isInteractive is not a function"
      // spam when the mouse moves over the page and PIXI tries to hit-test all registered apps.
      spine.eventMode = 'none'
      app.stage.eventMode = 'none'
      app.stage.interactiveChildren = false

      // 6. Set idle animation (try preferred names in order)
      const availableAnims = spineData.animations.map(a => a.name)
      const chosenAnim = ['action/idle/normal', 'action/idle/random-02', 'idle']
        .find(n => availableAnims.includes(n)) ?? availableAnims[0]
      if (chosenAnim) spine.state.setAnimation(0, chosenAnim, true)

      // 7. Pre-render first frame so _canvas isn't blank on first sample
      // spine.update(dt) is the full SpineBase update: state.update → state.apply →
      // skeleton.updateWorldTransform → slot container setFromMatrix(bone.matrix).
      // Calling the 3 parts manually skips the slot-container loop, leaving all
      // parts (fin, tail, back, starfish) at the spine root instead of their bone positions.
      app.stage.addChild(spine)
      spine.update(0)
      app.render()

      this._app    = app
      this._spine  = spine
      this._canvas = offscreenCanvas
      this.isReady = true

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

      // README values verbatim: 800×600 canvas, position(400,400), scale(0.3)
      const cW = this._w, cH = this._h
      const offscreenCanvas = document.createElement('canvas')
      const app = new Application({
        view: offscreenCanvas, width: cW, height: cH,
        backgroundAlpha: 0, autoStart: false, resolution: 1,
        preserveDrawingBuffer: true,
      })

      const spine = new Spine(spineData)
      spine.autoUpdate = false
      spine.position.set(SPINE_CANVAS_W / 2, SPINE_CANVAS_FEET_Y)
      spine.scale.set(SPINE_SCALE)
      spine.eventMode = 'none'
      app.stage.eventMode = 'none'
      app.stage.interactiveChildren = false

      const anims = spineData.animations.map(a => a.name)
      const anim  = ['action/idle/normal', 'action/idle/random-02', 'idle']
        .find(n => anims.includes(n)) ?? anims[0]
      if (anim) spine.state.setAnimation(0, anim, true)

      app.stage.addChild(spine)
      spine.update(0)
      app.render()

      this._app    = app
      this._spine  = spine
      this._canvas = offscreenCanvas
      this.isReady = true

    } catch (e) {
      console.warn('[SpineAvatar] initFromClassicId() failed:', e)
      this.isReady = false
    }
  }

  /**
   * Advance animation by dt seconds and re-render the off-screen canvas.
   * Called once per sprite per frame by the raycaster (_drawSpineOverlay).
   *
   * @param {number} dt — seconds since last frame
   */
  update (dt) {
    if (!this.isReady || !this._spine || !this._app) return
    // spine.update(dt) is the full SpineBase update cycle:
    //   state.update → state.apply → skeleton.updateWorldTransform
    //   → slot container setFromMatrix(bone.matrix) for every slot
    // The last step is what positions fin/tail/back/starfish at their correct bone offsets.
    // Calling the 3 steps manually was skipping that loop, causing all parts to cluster at root.
    this._spine.update(dt)
    this._app.render()
  }
}
