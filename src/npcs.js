// ═══════════════════════════════════════════════════════════════
// npcs.js — NPC character registry and world placement
// The Outlet — WebZone 001
//
// To add a new NPC anywhere in the mall:
//   1. Define its character in NPC_CHARACTERS (appearance + personality)
//   2. Push a placement entry into NPCS with the world x,y position
//
// Multiple instances of the same character (e.g. Rebo in every wing)
// share the same texture and system prompt — just add placement entries.
// ═══════════════════════════════════════════════════════════════

// ── NPC Characters ────────────────────────────────────────────
// One entry per character type. Defines look, voice, personality.
export const NPC_CHARACTERS = {

  rebo: {
    name:    'Rebo',
    title:   'Mall Security · The Outlet',
    // Dominant color used for minimap dot and name tag accent
    color:   [20, 70, 200],   // navy blue

    greeting: `Hey! Welcome to The Outlet — I'm Rebo, mall security. ` +
              `I know every store in this place. What are you looking for?`,

    // System prompt injected into the LLM for every Rebo conversation
    systemPrompt:
      `You are Rebo, mall security for The Outlet — the world's first WebZone game mall. ` +
      `You are friendly, a little gruff in a lovable way, and you know every store by heart. ` +
      `The Outlet is a 3D explorable environment built with a DDA raycaster and real-time multiplayer. ` +
      `\n\nMall layout:\n` +
      `- LOBBY (south entrance) → MAIN HALL → FOOD COURT → three wings\n` +
      `- BATTLE WING (north): Axie Infinity, Gods Unchained — PvP and card games\n` +
      `- RPG WING (west): Illuvium, Big Time — adventure and open world\n` +
      `- STRATEGY WING (east): The Sandbox, Star Atlas — building and space strategy\n` +
      `- MAIN HALL: Decentraland, Splinterlands\n` +
      `\nControls: W/S forward/back, A/D strafe, Q/E turn, mouse look, F to interact.\n` +
      `Keep responses short — 1-2 sentences. Speak like a friendly mall cop, not a chatbot.`,
  },

}

// ── NPC World Placements ──────────────────────────────────────
// Each entry places one NPC instance at a world coordinate.
// characterId references a key in NPC_CHARACTERS above.
// Add more entries to place Rebo (or other NPCs) anywhere.

export const NPCS = [

  // Rebo #1 — Lobby post (left/west side)
  {
    id:          'rebo-lobby',
    characterId: 'rebo',
    x:           16.0,
    y:           53.0,
  },

  // ── Future placements (uncomment to deploy) ────────────────
  // { id: 'rebo-food-court', characterId: 'rebo', x: 21.5, y: 29.0 },
  // { id: 'rebo-battle',     characterId: 'rebo', x: 21.5, y: 12.0 },
  // { id: 'rebo-rpg',        characterId: 'rebo', x:  5.0, y: 28.0 },
  // { id: 'rebo-strategy',   characterId: 'rebo', x: 38.0, y: 28.0 },

]
