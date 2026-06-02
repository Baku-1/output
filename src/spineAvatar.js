// SpineAvatarInstance — Ghost Canvas Render pattern
// Spine runs in an offscreen canvas; raycaster samples pixels from it each frame

export const AXIE_CONTRACT    = '0x32950db2a7164ae833121501c797d79e7b79d74c'
export const SPINE_CANVAS_SIZE = 128

// ── Mixer singleton ──────────────────────────────────────────────
// @axieinfinity/mixer is loaded once; subsequent calls are no-ops.
let _mixerState   = 'idle'  // 'idle' | 'loading' | 'ready' | 'error'
let _mixerPromise = null
let _getAxieSpineFromGenes = null

async function _ensureMixer() {
  if (_mixerState === 'ready')   return true
  if (_mixerState === 'error')   return false
  if (_mixerState === 'loading') return _mixerPromise

  _mixerState   = 'loading'
  _mixerPromise = (async () => {
    try {
      const mod = await import('@axieinfinity/mixer')
      // initAxieMixer loads the 4 bundled binary data files from dist/data/
      await mod.initAxieMixer()
      _getAxieSpineFromGenes = mod.getAxieSpineFromGenes
      _mixerState = 'ready'
      return true
    } catch (e) {
      console.warn('[SpineAvatar] Mixer init failed:', e)
      _mixerState = 'error'
      return false
    }
  })()
  return _mixerPromise
}

// ── SpineAvatarInstance ──────────────────────────────────────────
export class SpineAvatarInstance {
  constructor(canvasSize = SPINE_CANVAS_SIZE) {
    this._size   = canvasSize
    this._canvas = document.createElement('canvas')
    this._canvas.width  = canvasSize
    this._canvas.height = canvasSize
    this._ctx    = this._canvas.getContext('2d')

    /** @type {ImageData|null} — what the raycaster reads each frame */
    this.pixelData = null
    /** @type {boolean} — false until init() completes successfully */
    this.isReady   = false

    this._skeleton  = null
    this._animState = null
    this._renderer  = null
  }

  /**
   * Fetch Axie mixer data for the given genes hex string,
   * build the Spine skeleton, and set this.isReady = true.
   * If anything fails, isReady stays false → raycaster uses procedural silhouette.
   *
   * @param {string} genesHex  — 256-bit hex from Sky Mavis GraphQL
   */
  async init(genesHex) {
    try {
      const mixerOk = await _ensureMixer()
      if (!mixerOk) return

      // Get spine-ready data from the mixer
      const spineData = await _getAxieSpineFromGenes(genesHex)
      if (!spineData) {
        console.warn('[SpineAvatar] getAxieSpineFromGenes returned null for genes:', genesHex)
        return
      }

      // spine-canvas — import the full spine namespace
      const spine = await import('@esotericsoftware/spine-canvas')

      // Build skeleton from mixer output.
      // Mixer returns: { skeletonData, atlas }  where skeletonData is
      // already a spine.SkeletonData instance (or a raw JSON object).
      let skData = spineData.skeletonData

      // If mixer returned raw JSON (not a SkeletonData instance), parse it:
      if (skData && typeof skData === 'object' && !(skData instanceof spine.SkeletonData)) {
        const atlas      = spineData.atlas   // spine.TextureAtlas
        const attLoader  = new spine.AtlasAttachmentLoader(atlas)
        const jsonParser = new spine.SkeletonJson(attLoader)
        skData = jsonParser.readSkeletonData(skData)
      }

      const skeleton   = new spine.Skeleton(skData)
      skeleton.setToSetupPose()
      skeleton.updateWorldTransform()

      const animData   = new spine.AnimationStateData(skData)
      const animState  = new spine.AnimationState(animData)

      // Prefer 'action', fall back to 'idle', then first available
      const animations = skData.animations.map(a => a.name)
      const animName   = animations.includes('action') ? 'action'
                       : animations.includes('idle')   ? 'idle'
                       : animations[0]

      if (!animName) {
        console.warn('[SpineAvatar] No animations found in skeleton')
        return
      }

      animState.setAnimation(0, animName, true)

      // SkeletonRenderer takes a CanvasRenderingContext2D
      this._renderer  = new spine.SkeletonRenderer(this._ctx)
      this._skeleton  = skeleton
      this._animState = animState
      this.isReady    = true

      // Pre-render one frame so pixelData is never null after init
      this.update(0)
    } catch (e) {
      console.warn('[SpineAvatar] init() failed — falling back to static texture:', e)
      this.isReady = false
    }
  }

  /**
   * Advance animation by deltaTime, render to offscreen canvas, refresh this.pixelData.
   * Called once per sprite per frame by the raycaster (not once per column).
   *
   * @param {number} deltaTime — seconds since last frame
   */
  update(deltaTime) {
    if (!this.isReady || !this._skeleton) return

    this._animState.update(deltaTime)
    this._animState.apply(this._skeleton)
    this._skeleton.updateWorldTransform()

    const ctx = this._ctx
    const S   = this._size
    ctx.clearRect(0, 0, S, S)

    ctx.save()
    // Spine world-origin sits at the Axie's feet.
    // Translate to lower-centre of canvas; scale to fit ~90% of height.
    // Spine Y-axis is inverted relative to canvas, so scaleY is negative.
    ctx.translate(S * 0.5, S * 0.88)
    ctx.scale(0.22, -0.22)
    this._renderer.draw(this._skeleton)
    ctx.restore()

    this.pixelData = ctx.getImageData(0, 0, S, S)
  }
}
