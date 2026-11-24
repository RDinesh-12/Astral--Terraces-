import {LevelDef, MechanismDef, TileNode} from './types';

export const LEVELS: LevelDef[] = [
  // =========================================================================
  // LEVEL 01 — THE AWAKENING TERRACE (Celestial garden)
  // =========================================================================
  {
    levelNumber: 1,
    name: 'The Awakening Terrace',
    subtitle: 'World I · Celestial Garden',
    difficulty: 'Very Easy',
    themeLabel: 'Celestial Garden',
    objective:
      'Step onto the Mint Rune Plate to raise the sunken lotus bridge, then climb to the Sanctuary Shrine.',
    hint: 'Walk to the glowing Mint Plate on the right terrace, explore the newly revealed left alcove for the Dewdrop Star, then climb the north stairs.',
    mechanicTag: 'Movement & Rune Bridges',
    fitRadius: 12.0,
    startNodeId: 'l1_s0',
    goalNodeId: 'l1_goal',
    defaultCamAngle: 0,
    center: [0, 0.8, -2.5],
    palette: {
      skyTop: '#ebd9e3',
      skyMid: '#d4cce6',
      skyBottom: '#9db8cf',
      fogColor: '#d9cfe5',
      waterColor: '#6988a8',
      accentPrimary: '#95b89e',
      accentSecondary: '#7ebdb6',
    },
    tiles: [
      {id: 'l1_s0', x: 0, y: 0, z: 4, kind: 'stone', pillarHeight: 3.4},
      {id: 'l1_s1', x: 0, y: 0, z: 2, kind: 'stone'},
      {id: 'l1_s2', x: 0, y: 0, z: 0, kind: 'mint', pillarHeight: 3.4},
      {id: 'l1_e1', x: 2, y: 0, z: 0, kind: 'stone'},
      {
        id: 'l1_plate',
        x: 4,
        y: 0,
        z: 0,
        kind: 'plate',
        plateTriggers: ['l1_gate_bridge', 'l1_gate_relic'],
        plateToggle: false,
        pillarHeight: 3.4,
      },
      {
        id: 'l1_w1',
        x: -2,
        y: 0,
        z: 0,
        kind: 'hidden',
        hiddenUntilGroup: 'l1_gate_relic',
      },
      {
        id: 'l1_w2',
        x: -4,
        y: 0,
        z: 0,
        kind: 'mint',
        hiddenUntilGroup: 'l1_gate_relic',
        pillarHeight: 3.4,
      },
      {
        id: 'l1_b1',
        x: 0,
        y: 0,
        z: -2,
        kind: 'hidden',
        hiddenUntilGroup: 'l1_gate_bridge',
      },
      {
        id: 'l1_b2',
        x: 0,
        y: 0,
        z: -4,
        kind: 'hidden',
        hiddenUntilGroup: 'l1_gate_bridge',
      },
      {id: 'l1_st1', x: 0, y: 1, z: -6, kind: 'stair', facingY: 0},
      {id: 'l1_st2', x: 0, y: 2, z: -8, kind: 'stair', facingY: 0},
      {id: 'l1_goal', x: 0, y: 2, z: -10, kind: 'goal', pillarHeight: 4.5},
    ],
    mechanisms: [
      {
        id: 'l1_gate_bridge',
        type: 'gate',
        label: 'Lotus Bridge',
        pivot: [0, 0, -3],
        initialState: 0,
      },
      {
        id: 'l1_gate_relic',
        type: 'gate',
        label: 'Garden Alcove',
        pivot: [-3, 0, 0],
        initialState: 0,
      },
    ],
    perspectiveLinks: [],
    relics: [{id: 'relic_1', nodeId: 'l1_w2', label: 'Dewdrop Star'}],
    props: [
      {id: 'l1_p1', kind: 'planter', position: [-1.45, 0, 4.1], scale: 0.95},
      {id: 'l1_p2', kind: 'planter', position: [1.45, 0, 4.1], scale: 0.85},
      {id: 'l1_p3', kind: 'archway', position: [0, 0, 2], rotationY: 0},
      {id: 'l1_p4', kind: 'lanternPedestal', position: [5.6, -1.2, 2.5]},
      {id: 'l1_p5', kind: 'lanternPedestal', position: [-5.6, -1.2, -3.5]},
      {id: 'l1_p6', kind: 'ruinPillar', position: [4.2, -0.8, -3.2], scale: 0.9},
      {id: 'l1_p7', kind: 'dome', position: [0, 2, -10], rotationY: 0},
    ],
  },

  // =========================================================================
  // LEVEL 02 — THE BROKEN BRIDGE (Floating stone ruins)
  // =========================================================================
  {
    levelNumber: 2,
    name: 'The Broken Bridge',
    subtitle: 'World II · Floating Stone Ruins',
    difficulty: 'Easy',
    themeLabel: 'Floating Ruins',
    objective:
      'Align the rotating stone bridge to connect the approach, visit the East Rune Plate, then bridge northward.',
    hint: 'Click/drag the Coral Astrolabe Crank (or press E / ACT) to connect South->North, ride the bridge by turning it East-West for the Star Relic & Rune Plate, then turn North-South again.',
    mechanicTag: 'Rotating Bridges',
    fitRadius: 13.0,
    startNodeId: 'l2_s0',
    goalNodeId: 'l2_goal',
    defaultCamAngle: 0,
    center: [0, 0.8, -2],
    palette: {
      skyTop: '#ead7de',
      skyMid: '#cbc4e0',
      skyBottom: '#8aa4c9',
      fogColor: '#d1c8e2',
      waterColor: '#5f7aa1',
      accentPrimary: '#e0917a',
      accentSecondary: '#a498cc',
    },
    tiles: [
      {id: 'l2_s0', x: 0, y: 0, z: 6, kind: 'stone', pillarHeight: 3.4},
      {id: 'l2_s1', x: 0, y: 0, z: 4, kind: 'lavender'},
      {id: 'l2_s2', x: 0, y: 0, z: 2, kind: 'stone', pillarHeight: 3.4},
      // Straight 3-tile rotary bridge pivoted at (0,0,-2)
      {
        id: 'l2_rc',
        x: 0,
        y: 0,
        z: 0,
        kind: 'rotary',
        groupId: 'l2_rot_1',
        pillarHeight: 4.0,
      },
      {
        id: 'l2_rw',
        x: -2,
        y: 0,
        z: 0,
        kind: 'rotary',
        groupId: 'l2_rot_1',
      },
      {
        id: 'l2_re',
        x: 2,
        y: 0,
        z: 0,
        kind: 'rotary',
        groupId: 'l2_rot_1',
      },
      // West Relic Ruin
      {id: 'l2_w1', x: -4, y: 0, z: -2, kind: 'mint', pillarHeight: 3.6},
      // East Plate Ruin
      {
        id: 'l2_plate',
        x: 4,
        y: 0,
        z: -2,
        kind: 'plate',
        plateTriggers: ['l2_gate_north'],
        plateToggle: false,
        pillarHeight: 3.6,
      },
      // North Aqueduct Sanctuary
      {
        id: 'l2_n1',
        x: 0,
        y: 0,
        z: -6,
        kind: 'hidden',
        hiddenUntilGroup: 'l2_gate_north',
      },
      {id: 'l2_n2', x: 0, y: 1, z: -8, kind: 'stair', facingY: 0},
      {id: 'l2_n3', x: 0, y: 2, z: -10, kind: 'lavender', pillarHeight: 3.8},
      {id: 'l2_goal', x: 0, y: 2, z: -12, kind: 'goal', pillarHeight: 4.8},
    ],
    mechanisms: [
      {
        id: 'l2_rot_1',
        type: 'rotary',
        label: 'Ruin Span',
        pivot: [0, 0, -2],
        initialState: 0,
        crankPos: [0, 0.7, -2],
        directInteract: true,
      },
      {
        id: 'l2_gate_north',
        type: 'gate',
        label: 'North Aqueduct Span',
        pivot: [0, 0, -6],
        initialState: 0,
      },
    ],
    perspectiveLinks: [],
    relics: [{id: 'relic_2', nodeId: 'l2_w1', label: 'Ruin Compass'}],
    props: [
      {id: 'l2_p1', kind: 'archway', position: [0, 0, 4], rotationY: 0},
      {id: 'l2_p2', kind: 'ruinPillar', position: [-4, 0, -4.2], scale: 1.0},
      {id: 'l2_p3', kind: 'ruinPillar', position: [4, 0, -4.2], scale: 0.85},
      {id: 'l2_p4', kind: 'lanternPedestal', position: [3.8, -1.2, 4.5]},
      {id: 'l2_p5', kind: 'lanternPedestal', position: [-5.5, -1.2, -5.0]},
      {id: 'l2_p6', kind: 'dome', position: [0, 2, -12], rotationY: 0},
    ],
  },

  // =========================================================================
  // LEVEL 03 — THE FORGOTTEN GARDEN (Pastel botanical sanctuary)
  // =========================================================================
  {
    levelNumber: 3,
    name: 'The Forgotten Garden',
    subtitle: 'World III · Botanical Sanctuary',
    difficulty: 'Easy – Moderate',
    themeLabel: 'Botanical Sanctuary',
    objective:
      'Activate both garden Rune Plates in sequence to reveal hidden botanical terraces.',
    hint: 'Visit the East Mint Plate first to unlock the West terrace. Step on the West Plate to reveal both the hidden Blossom Star (south-west) and the North sanctuary stairway.',
    mechanicTag: 'Sequential Plates & Hidden Paths',
    fitRadius: 13.5,
    startNodeId: 'l3_s0',
    goalNodeId: 'l3_goal',
    defaultCamAngle: 0,
    center: [0, 1.0, -3],
    palette: {
      skyTop: '#e8d9e2',
      skyMid: '#cce0dc',
      skyBottom: '#8fb4bd',
      fogColor: '#d0ddd9',
      waterColor: '#5c8596',
      accentPrimary: '#95b89e',
      accentSecondary: '#d998ab',
    },
    tiles: [
      {id: 'l3_s0', x: 0, y: 0, z: 6, kind: 'mint', pillarHeight: 3.4},
      {id: 'l3_s1', x: 0, y: 0, z: 4, kind: 'stone'},
      {id: 'l3_s2', x: 0, y: 0, z: 2, kind: 'stone'},
      {id: 'l3_hub', x: 0, y: 0, z: 0, kind: 'lavender', pillarHeight: 3.8},
      // East Wing -> Plate A
      {id: 'l3_e1', x: 2, y: 0, z: 0, kind: 'stone'},
      {
        id: 'l3_plate_a',
        x: 4,
        y: 0,
        z: 0,
        kind: 'plate',
        plateTriggers: ['l3_gate_west'],
        plateToggle: false,
        pillarHeight: 3.6,
      },
      // West Wing (hidden until Plate A) -> Plate B
      {
        id: 'l3_w1',
        x: -2,
        y: 0,
        z: 0,
        kind: 'hidden',
        hiddenUntilGroup: 'l3_gate_west',
      },
      {
        id: 'l3_w2',
        x: -4,
        y: 0,
        z: 0,
        kind: 'hidden',
        hiddenUntilGroup: 'l3_gate_west',
        pillarHeight: 3.6,
      },
      {
        id: 'l3_plate_b',
        x: -4,
        y: 0,
        z: -2,
        kind: 'plate',
        hiddenUntilGroup: 'l3_gate_west',
        plateTriggers: ['l3_gate_north', 'l3_gate_relic'],
        plateToggle: false,
        pillarHeight: 3.8,
      },
      // South-West Secret Botanical Alcove (hidden until Plate B)
      {
        id: 'l3_sw1',
        x: -4,
        y: 0,
        z: 2,
        kind: 'hidden',
        hiddenUntilGroup: 'l3_gate_relic',
      },
      {
        id: 'l3_sw2',
        x: -4,
        y: 0,
        z: 4,
        kind: 'mint',
        hiddenUntilGroup: 'l3_gate_relic',
        pillarHeight: 3.6,
      },
      // North Ascent (hidden until Plate B)
      {
        id: 'l3_n1',
        x: 0,
        y: 0,
        z: -2,
        kind: 'hidden',
        hiddenUntilGroup: 'l3_gate_north',
      },
      {
        id: 'l3_n2',
        x: 0,
        y: 0,
        z: -4,
        kind: 'hidden',
        hiddenUntilGroup: 'l3_gate_north',
      },
      {id: 'l3_st1', x: 0, y: 1, z: -6, kind: 'stair', facingY: 0},
      {id: 'l3_n3', x: 0, y: 1, z: -8, kind: 'mint', pillarHeight: 4.0},
      {id: 'l3_n4', x: 2, y: 1, z: -8, kind: 'stone'},
      {id: 'l3_st2', x: 2, y: 2, z: -10, kind: 'stair', facingY: 0},
      {id: 'l3_goal', x: 2, y: 2, z: -12, kind: 'goal', pillarHeight: 4.8},
    ],
    mechanisms: [
      {
        id: 'l3_gate_west',
        type: 'gate',
        label: 'West Garden Span',
        pivot: [-3, 0, 0],
        initialState: 0,
      },
      {
        id: 'l3_gate_north',
        type: 'gate',
        label: 'Sanctuary Causeway',
        pivot: [0, 0, -3],
        initialState: 0,
      },
      {
        id: 'l3_gate_relic',
        type: 'gate',
        label: 'Blossom Alcove',
        pivot: [-4, 0, 3],
        initialState: 0,
      },
    ],
    perspectiveLinks: [],
    relics: [{id: 'relic_3', nodeId: 'l3_sw2', label: 'Blossom Star'}],
    props: [
      {id: 'l3_p1', kind: 'planter', position: [-1.55, 0, 6], scale: 0.95},
      {id: 'l3_p2', kind: 'planter', position: [1.55, 0, 6], scale: 0.9},
      {id: 'l3_p3', kind: 'archway', position: [0, 0, 4], rotationY: 0},
      {id: 'l3_p4', kind: 'waterfall', position: [4.2, -0.4, -2.5], scale: 1.0},
      {id: 'l3_p5', kind: 'lanternPedestal', position: [-6.5, -1.2, 1.5]},
      {id: 'l3_p6', kind: 'dome', position: [2, 2, -12], rotationY: 0},
      {id: 'l3_p7', kind: 'colonnade', position: [0, 0, 7.55], rotationY: 0},
    ],
  },

  // =========================================================================
  // LEVEL 04 — THE ASTRAL STAIRWAY (Suspended architectural towers)
  // =========================================================================
  {
    levelNumber: 4,
    name: 'The Astral Stairway',
    subtitle: 'World IV · Suspended Towers',
    difficulty: 'Moderate',
    themeLabel: 'Impossible Geometry',
    objective:
      'Orbit the world to optically unite separated towers, then ascend to the upper Sanctuary.',
    hint: 'Drag the sky or press Q/R to Angle 1 so the central mint pier touches the floating archway. Once across, orbit to Angle 2 to align the upper sky-terrace! Turn the west crank for the Paradox Star.',
    mechanicTag: 'Optical Perspective Illusions',
    fitRadius: 15.0,
    startNodeId: 'w4_s0',
    goalNodeId: 'w4_goal',
    defaultCamAngle: 2,
    center: [1, 2.6, -2],
    palette: {
      skyTop: '#e7d5e8',
      skyMid: '#c6bfe3',
      skyBottom: '#889ec9',
      fogColor: '#cdc4e6',
      waterColor: '#566b96',
      accentPrimary: '#a498cc',
      accentSecondary: '#f2d388',
    },
    tiles: [
      {id: 'w4_s0', x: -4, y: 0, z: 4, kind: 'lavender', pillarHeight: 4.0},
      {id: 'w4_l1', x: -2, y: 0, z: 4, kind: 'stone'},
      {id: 'w4_l2', x: 0, y: 0, z: 4, kind: 'stone', pillarHeight: 4.0},
      {id: 'w4_l3', x: 0, y: 0, z: 2, kind: 'stone'},
      {id: 'w4_l4', x: 0, y: 0, z: 0, kind: 'mint', pillarHeight: 4.2},
      // West Rotary Span at (-4, 0, 0)
      {
        id: 'w4_rc',
        x: 0,
        y: 0,
        z: 0,
        kind: 'rotary',
        groupId: 'w4_rot_west',
        pillarHeight: 4.0,
      },
      {id: 'w4_ra', x: 0, y: 0, z: 2, kind: 'rotary', groupId: 'w4_rot_west'},
      {id: 'w4_rb', x: 2, y: 0, z: 0, kind: 'rotary', groupId: 'w4_rot_west'},
      {id: 'w4_rel', x: -4, y: 0, z: -4, kind: 'mint', pillarHeight: 4.0},
      // Middle Floating Archway (y=4): (6,4,4) aligns cleanly edge-to-edge with (0,0,0) at Angle 0
      {id: 'w4_u0', x: 6, y: 4, z: 4, kind: 'mint'},
      {id: 'w4_u1', x: 6, y: 4, z: 2, kind: 'lavender'},
      {id: 'w4_u2', x: 6, y: 4, z: 0, kind: 'stone', pillarHeight: 5.0},
      {id: 'w4_u3', x: 6, y: 4, z: -2, kind: 'stone'},
      {id: 'w4_u4', x: 6, y: 4, z: -4, kind: 'mint'},
      // Upper Sky Terrace (y=6): (8,6,-8) aligns cleanly edge-to-edge with (6,4,-4) at Angle 1
      {id: 'w4_top0', x: 8, y: 6, z: -8, kind: 'mint'},
      {id: 'w4_top1', x: 8, y: 6, z: -10, kind: 'lavender', pillarHeight: 5.8},
      {id: 'w4_top2', x: 6, y: 6, z: -10, kind: 'stone'},
      {id: 'w4_goal', x: 4, y: 6, z: -10, kind: 'goal', pillarHeight: 6.4},
    ],
    mechanisms: [
      {
        id: 'w4_rot_west',
        type: 'rotary',
        label: 'Garden Crank',
        pivot: [-4, 0, 0],
        initialState: 0,
        crankPos: [-4, 0.7, 0],
        directInteract: true,
      },
    ],
    perspectiveLinks: [
      {
        id: 'w4_plink_1',
        nodeA: 'w4_l4',
        nodeB: 'w4_u0',
        alignedAngles: [0],
        midPos: [3, 2, 2],
      },
      {
        id: 'w4_plink_2',
        nodeA: 'w4_u4',
        nodeB: 'w4_top0',
        alignedAngles: [1],
        midPos: [7, 5, -6],
      },
    ],
    relics: [{id: 'relic_4', nodeId: 'w4_rel', label: 'Paradox Star'}],
    props: [
      {id: 'w4_p1', kind: 'colonnade', position: [-2, 0, 5.4], rotationY: 0},
      {id: 'w4_p2', kind: 'archway', position: [6, 4, 0], rotationY: 0},
      {id: 'w4_p3', kind: 'sundial', position: [1.65, 0, 4], scale: 0.9},
      {id: 'w4_p4', kind: 'lanternPedestal', position: [8.5, -1.2, 5.5]},
      {id: 'w4_p5', kind: 'lanternPedestal', position: [-6.5, -1.2, -3.5]},
      {id: 'w4_p6', kind: 'dome', position: [4, 6, -10], rotationY: 0},
    ],
  },

  // =========================================================================
  // LEVEL 05 — THE CRYSTAL OBSERVATORY (Celestial observatory)
  // =========================================================================
  {
    levelNumber: 5,
    name: 'The Crystal Observatory',
    subtitle: 'World V · Harmonic Prisms',
    difficulty: 'Moderate',
    themeLabel: 'Celestial Observatory',
    objective:
      'Attune the South Crystal to align the central T-bridge, unlock the West Plate, then activate the East Crystal.',
    hint: 'Click/activate the South Prism Crystal (E / ACT) to connect South->West. Step on the West Plate for the Astral Lens & East Span, turn the central Crank so East connects, then trigger the East Crystal!',
    mechanicTag: 'Crystal Switches & T-Bridges',
    fitRadius: 14.0,
    startNodeId: 'l5_s0',
    goalNodeId: 'l5_goal',
    defaultCamAngle: 0,
    center: [0, 1.0, -3],
    palette: {
      skyTop: '#dfd4ea',
      skyMid: '#bfc1e6',
      skyBottom: '#7e9bc9',
      fogColor: '#c8c4e4',
      waterColor: '#4e6794',
      accentPrimary: '#7ebdb6',
      accentSecondary: '#e0917a',
    },
    tiles: [
      {id: 'l5_s0', x: 0, y: 0, z: 4, kind: 'lavender', pillarHeight: 3.6},
      {id: 'l5_s1', x: 0, y: 0, z: 2, kind: 'stone', pillarHeight: 3.6},
      {id: 'l5_s2', x: 2, y: 0, z: 2, kind: 'mint', pillarHeight: 3.6},
      // Central Rotary T-Bridge at (0,0,-2)
      {
        id: 'l5_tc',
        x: 0,
        y: 0,
        z: 0,
        kind: 'rotary',
        groupId: 'l5_rot_main',
        pillarHeight: 4.4,
      },
      {id: 'l5_tw', x: -2, y: 0, z: 0, kind: 'rotary', groupId: 'l5_rot_main'},
      {id: 'l5_te', x: 2, y: 0, z: 0, kind: 'rotary', groupId: 'l5_rot_main'},
      {id: 'l5_ts', x: 0, y: 0, z: 2, kind: 'rotary', groupId: 'l5_rot_main'},
      // West Island + Plate + Relic
      {id: 'l5_w0', x: -4, y: 0, z: -2, kind: 'stone', pillarHeight: 3.8},
      {
        id: 'l5_plate_w',
        x: -4,
        y: 0,
        z: 0,
        kind: 'plate',
        plateTriggers: ['l5_gate_east', 'l5_gate_relic'],
        plateToggle: false,
        pillarHeight: 3.8,
      },
      {
        id: 'l5_wr1',
        x: -4,
        y: 0,
        z: -4,
        kind: 'hidden',
        hiddenUntilGroup: 'l5_gate_relic',
      },
      {
        id: 'l5_wr2',
        x: -4,
        y: 0,
        z: -6,
        kind: 'mint',
        hiddenUntilGroup: 'l5_gate_relic',
        pillarHeight: 3.8,
      },
      // East Observatory Island + Crystal B + Sanctuary Stair
      {
        id: 'l5_e0',
        x: 4,
        y: 0,
        z: -2,
        kind: 'hidden',
        hiddenUntilGroup: 'l5_gate_east',
      },
      {
        id: 'l5_e1',
        x: 4,
        y: 0,
        z: -4,
        kind: 'lavender',
        hiddenUntilGroup: 'l5_gate_east',
        pillarHeight: 3.8,
      },
      {
        id: 'l5_e2',
        x: 4,
        y: 0,
        z: -6,
        kind: 'hidden',
        hiddenUntilGroup: 'l5_gate_sanctuary',
      },
      {id: 'l5_st1', x: 4, y: 1, z: -8, kind: 'stair', facingY: 0},
      {id: 'l5_goal', x: 4, y: 1, z: -10, kind: 'goal', pillarHeight: 4.8},
    ],
    mechanisms: [
      {
        id: 'l5_rot_main',
        type: 'rotary',
        label: 'Observatory Span',
        pivot: [0, 0, -2],
        initialState: 2,
        crankPos: [0, 0.7, -2],
        directInteract: true,
      },
      {
        id: 'l5_crys_a',
        type: 'crystal',
        label: 'South Prism',
        pivot: [3.55, 0, 2],
        initialState: 0,
        crankPos: [3.55, 0.75, 2],
        directInteract: true,
        coupledIds: ['l5_rot_main'],
      },
      {
        id: 'l5_crys_b',
        type: 'crystal',
        label: 'East Prism',
        pivot: [5.65, 0, -4],
        initialState: 0,
        crankPos: [5.65, 0.75, -4],
        directInteract: true,
        coupledIds: ['l5_gate_sanctuary'],
      },
      {
        id: 'l5_gate_east',
        type: 'gate',
        label: 'East Causeway',
        pivot: [4, 0, -3],
        initialState: 0,
      },
      {
        id: 'l5_gate_relic',
        type: 'gate',
        label: 'Starlight Alcove',
        pivot: [-4, 0, -5],
        initialState: 0,
      },
      {
        id: 'l5_gate_sanctuary',
        type: 'gate',
        label: 'Sanctuary Bridge',
        pivot: [4, 0, -6],
        initialState: 0,
      },
    ],
    perspectiveLinks: [],
    relics: [{id: 'relic_5', nodeId: 'l5_wr2', label: 'Astral Lens'}],
    props: [
      {id: 'l5_p1', kind: 'sundial', position: [-1.75, 0, 4], scale: 0.95},
      {id: 'l5_p2', kind: 'obelisk', position: [-6, -0.5, -2], scale: 1.0},
      {id: 'l5_p3', kind: 'archway', position: [4, 0, -4], rotationY: 0},
      {id: 'l5_p4', kind: 'lanternPedestal', position: [5.5, -1.2, 2.5]},
      {id: 'l5_p5', kind: 'lanternPedestal', position: [-6.0, -1.2, 3.0]},
      {id: 'l5_p6', kind: 'dome', position: [4, 1, -10], rotationY: 0},
    ],
  },

  // =========================================================================
  // LEVEL 06 — THE SUNKEN SANCTUARY (Ancient temple above the clouds)
  // =========================================================================
  {
    levelNumber: 6,
    name: 'The Sunken Sanctuary',
    subtitle: 'World VI · Temple Above Clouds',
    difficulty: 'Moderate – Challenging',
    themeLabel: 'Cloud Temple',
    objective:
      'Ride the West Lift to awaken the sunken east bridge, then ascend the East Lift to turn the coupled temple span.',
    hint: 'Step onto the West Peach Lift and press E (or tap its crystal) to rise. Collect the Cloud Pearl and press the upper Plate, then ride back down to cross East and ride the coupled East Lift!',
    mechanicTag: 'Dual Elevators & Coupled Gears',
    fitRadius: 14.0,
    startNodeId: 'l6_s0',
    goalNodeId: 'l6_goal',
    defaultCamAngle: 0,
    center: [0, 2.2, -1],
    palette: {
      skyTop: '#eedbe2',
      skyMid: '#d2c9e6',
      skyBottom: '#93b0cf',
      fogColor: '#d7cde6',
      waterColor: '#617ca3',
      accentPrimary: '#e0917a',
      accentSecondary: '#95b89e',
    },
    tiles: [
      {id: 'l6_s0', x: 0, y: 0, z: 8, kind: 'stone', pillarHeight: 3.4},
      {id: 'l6_s1', x: 0, y: 0, z: 6, kind: 'lavender'},
      {id: 'l6_s2', x: 0, y: 0, z: 4, kind: 'stone', pillarHeight: 3.4},
      // West Elevator (-2, 0, 4) -> (-2, 3, 4)
      {id: 'l6_el1', x: 0, y: 0, z: 0, kind: 'elevator', groupId: 'l6_elev_1'},
      // Upper West Temple (y = 3)
      {id: 'l6_uw1', x: -2, y: 3, z: 2, kind: 'lavender', pillarHeight: 5.0},
      {id: 'l6_uw2', x: -2, y: 3, z: 0, kind: 'stone'},
      {id: 'l6_uw_rel', x: -4, y: 3, z: 0, kind: 'mint', pillarHeight: 5.0},
      {
        id: 'l6_plate_e',
        x: 0,
        y: 3,
        z: 0,
        kind: 'plate',
        plateTriggers: ['l6_gate_east'],
        plateToggle: false,
        pillarHeight: 5.0,
      },
      // Lower East Bridge (hidden until Upper Plate)
      {
        id: 'l6_eb1',
        x: 2,
        y: 0,
        z: 4,
        kind: 'hidden',
        hiddenUntilGroup: 'l6_gate_east',
      },
      {
        id: 'l6_eb2',
        x: 4,
        y: 0,
        z: 4,
        kind: 'hidden',
        hiddenUntilGroup: 'l6_gate_east',
        pillarHeight: 3.4,
      },
      // East Elevator (4, 0, 2) -> (4, 4, 2), coupled with l6_rot_temple!
      {id: 'l6_el2', x: 0, y: 0, z: 0, kind: 'elevator', groupId: 'l6_elev_2'},
      // Upper East Balcony (y = 4)
      {id: 'l6_ue1', x: 4, y: 4, z: 0, kind: 'stone'},
      {id: 'l6_ue2', x: 4, y: 4, z: -2, kind: 'lavender'},
      {id: 'l6_ue3', x: 4, y: 4, z: -4, kind: 'stone', pillarHeight: 5.4},
      // Upper Coupled Rotary Temple Span at (0, 4, -4)
      {id: 'l6_rc', x: 0, y: 0, z: 0, kind: 'rotary', groupId: 'l6_rot_temple'},
      {
        id: 'l6_rw',
        x: -2,
        y: 0,
        z: 0,
        kind: 'rotary',
        groupId: 'l6_rot_temple',
      },
      {
        id: 'l6_re',
        x: 2,
        y: 0,
        z: 0,
        kind: 'rotary',
        groupId: 'l6_rot_temple',
      },
      // Sanctuary Summit
      {id: 'l6_top0', x: -4, y: 4, z: -4, kind: 'mint', pillarHeight: 5.4},
      {id: 'l6_st1', x: -4, y: 5, z: -6, kind: 'stair', facingY: 0},
      {id: 'l6_goal', x: -4, y: 5, z: -8, kind: 'goal', pillarHeight: 6.2},
    ],
    mechanisms: [
      {
        id: 'l6_elev_1',
        type: 'elevator',
        label: 'Cloud Lift',
        pivot: [-2, 0, 4],
        moveOffset: [0, 3, 0],
        initialState: 0,
        crankPos: [-2, 0.7, 4],
        directInteract: true,
      },
      {
        id: 'l6_gate_east',
        type: 'gate',
        label: 'Sunken East Bridge',
        pivot: [3, 0, 4],
        initialState: 0,
      },
      {
        id: 'l6_elev_2',
        type: 'elevator',
        label: 'Temple Lift',
        pivot: [4, 0, 2],
        moveOffset: [0, 4, 0],
        initialState: 0,
        crankPos: [4, 0.7, 2],
        directInteract: true,
        coupledIds: ['l6_rot_temple'],
      },
      {
        id: 'l6_rot_temple',
        type: 'rotary',
        label: 'Sympathetic Span',
        pivot: [0, 4, -4],
        initialState: 1,
        directInteract: false,
      },
    ],
    perspectiveLinks: [],
    relics: [{id: 'relic_6', nodeId: 'l6_uw_rel', label: 'Cloud Pearl'}],
    props: [
      {id: 'l6_p1', kind: 'archway', position: [0, 0, 6], rotationY: 0},
      {id: 'l6_p2', kind: 'waterfall', position: [-5.5, 1.5, -2], scale: 1.1},
      {id: 'l6_p3', kind: 'obelisk', position: [4, 4, -5.75], scale: 0.85},
      {id: 'l6_p4', kind: 'lanternPedestal', position: [6.0, -1.2, 6.0]},
      {id: 'l6_p5', kind: 'lanternPedestal', position: [-6.5, -1.2, -6.0]},
      {id: 'l6_p6', kind: 'dome', position: [-4, 5, -8], rotationY: 0},
    ],
  },

  // =========================================================================
  // LEVEL 07 — THE SHATTERED HORIZON (Fragmented floating architecture)
  // =========================================================================
  {
    levelNumber: 7,
    name: 'The Shattered Horizon',
    subtitle: 'World VII · Fragmented Horizons',
    difficulty: 'Challenging',
    themeLabel: 'Shattered Archipelago',
    objective:
      'Couple two rotating spans, unlock the horizon pier, and align the high perspective bridge.',
    hint: 'Trigger the Start Crystal to swing both bridges into place. Cross to the North-West Plate to unlock the Horizon Pier & South Relic, turn the East Crank so East connects, then inspect Angle 1 (Front-Right) to cross up to the Horizon Shrine!',
    mechanicTag: 'Interdependent Rotations & Perspective',
    fitRadius: 15.0,
    startNodeId: 'l7_s0',
    goalNodeId: 'l7_goal',
    defaultCamAngle: 1,
    center: [1, 1.8, 0],
    palette: {
      skyTop: '#ead4dd',
      skyMid: '#c8bee0',
      skyBottom: '#829bc4',
      fogColor: '#cec3e0',
      waterColor: '#546d99',
      accentPrimary: '#d998ab',
      accentSecondary: '#7ebdb6',
    },
    tiles: [
      {id: 'l7_s0', x: -6, y: 0, z: 2, kind: 'lavender', pillarHeight: 3.6},
      {id: 'l7_s_crys', x: -6, y: 0, z: 4, kind: 'mint', pillarHeight: 3.6},
      // Rotary A at (-2, 0, 2): straight span, initialState = 3 -> rotated once -> 0 (East-West)
      {id: 'l7_ra_c', x: 0, y: 0, z: 0, kind: 'rotary', groupId: 'l7_rot_a', pillarHeight: 4.0},
      {id: 'l7_ra_w', x: -2, y: 0, z: 0, kind: 'rotary', groupId: 'l7_rot_a'},
      {id: 'l7_ra_e', x: 2, y: 0, z: 0, kind: 'rotary', groupId: 'l7_rot_a'},
      // Central Hub
      {id: 'l7_hub', x: 2, y: 0, z: 2, kind: 'stone', pillarHeight: 3.8},
      // South Relic Spur (hidden until Plate B)
      {
        id: 'l7_sr1',
        x: 2,
        y: 0,
        z: 4,
        kind: 'hidden',
        hiddenUntilGroup: 'l7_gate_relic',
      },
      {
        id: 'l7_sr2',
        x: 2,
        y: 0,
        z: 6,
        kind: 'mint',
        hiddenUntilGroup: 'l7_gate_relic',
        pillarHeight: 3.6,
      },
      // Rotary B at (2, 0, -2): L-bridge, initialState = 2 -> crystal shifts to 3 (South+West)
      {id: 'l7_rb_c', x: 0, y: 0, z: 0, kind: 'rotary', groupId: 'l7_rot_b', pillarHeight: 4.2},
      {id: 'l7_rb_n', x: 0, y: 0, z: -2, kind: 'rotary', groupId: 'l7_rot_b'},
      {id: 'l7_rb_e', x: 2, y: 0, z: 0, kind: 'rotary', groupId: 'l7_rot_b'},
      // West Plate B
      {
        id: 'l7_plate_b',
        x: -2,
        y: 0,
        z: -2,
        kind: 'plate',
        plateTriggers: ['l7_gate_relic', 'l7_gate_persp'],
        plateToggle: false,
        pillarHeight: 3.8,
      },
      // East Horizon Pier (hidden until Plate B)
      {
        id: 'l7_p_pier',
        x: 4,
        y: 0,
        z: -4,
        kind: 'hidden',
        hiddenUntilGroup: 'l7_gate_persp',
        pillarHeight: 3.8,
      },
      // Upper Horizon Island (y = 4): (10,4,0) aligns cleanly edge-to-edge with (4,0,-4) at Angle 0!
      {id: 'l7_h0', x: 10, y: 4, z: 0, kind: 'mint'},
      {id: 'l7_h1', x: 10, y: 4, z: -2, kind: 'lavender', pillarHeight: 5.0},
      {id: 'l7_h2', x: 10, y: 4, z: -4, kind: 'stone'},
      {id: 'l7_goal', x: 10, y: 4, z: -6, kind: 'goal', pillarHeight: 5.4},
    ],
    mechanisms: [
      {
        id: 'l7_crys_start',
        type: 'crystal',
        label: 'Twin Resonator',
        pivot: [-7.55, 0, 4],
        initialState: 0,
        crankPos: [-7.55, 0.75, 4],
        directInteract: true,
        coupledIds: ['l7_rot_a', 'l7_rot_b'],
      },
      {
        id: 'l7_rot_a',
        type: 'rotary',
        label: 'West Span',
        pivot: [-2, 0, 2],
        initialState: 3,
        directInteract: false,
      },
      {
        id: 'l7_rot_b',
        type: 'rotary',
        label: 'Horizon Crank',
        pivot: [2, 0, -2],
        initialState: 1,
        crankPos: [2, 0.7, -2],
        directInteract: true,
      },
      {
        id: 'l7_gate_relic',
        type: 'gate',
        label: 'South Shard Alcove',
        pivot: [2, 0, 5],
        initialState: 0,
      },
      {
        id: 'l7_gate_persp',
        type: 'gate',
        label: 'Horizon Pier',
        pivot: [4, 0, -4],
        initialState: 0,
      },
    ],
    perspectiveLinks: [
      {
        id: 'l7_plink_1',
        nodeA: 'l7_p_pier',
        nodeB: 'l7_h0',
        alignedAngles: [0],
        midPos: [7, 2, -2],
      },
    ],
    relics: [{id: 'relic_7', nodeId: 'l7_sr2', label: 'Horizon Shard'}],
    props: [
      {id: 'l7_p1', kind: 'ruinPillar', position: [-6, 0, 0.2], scale: 0.9},
      {id: 'l7_p2', kind: 'archway', position: [10, 4, -4], rotationY: 0},
      {id: 'l7_p3', kind: 'obelisk', position: [11.6, 4, -2], scale: 0.8},
      {id: 'l7_p4', kind: 'lanternPedestal', position: [5.5, -1.2, 5.5]},
      {id: 'l7_p5', kind: 'lanternPedestal', position: [-4.5, -1.2, -5.5]},
      {id: 'l7_p6', kind: 'dome', position: [10, 4, -6], rotationY: 0},
      {id: 'l7_p7', kind: 'planter', position: [3.55, 0, 2], scale: 0.9},
    ],
  },

  // =========================================================================
  // LEVEL 08 — THE CELESTIAL LABYRINTH (Mystical geometric architecture)
  // =========================================================================
  {
    levelNumber: 8,
    name: 'The Celestial Labyrinth',
    subtitle: 'World VIII · Geometric Lattice',
    difficulty: 'Challenging',
    themeLabel: 'Geometric Labyrinth',
    objective:
      'Navigate three overlapping elevations using strategic camera angles and the labyrinth prism.',
    hint: 'Step on the South-East Plate to open the West pier. Orbit to Angle 2 (Front-Left) to ascend onto the Middle Layer. Activate the Labyrinth Prism to reveal the West Star Relic & turn the North bridge, then orbit to Angle 3 (Back-Left) to reach the top!',
    mechanicTag: 'Multi-Layer Optical Labyrinth',
    fitRadius: 16.0,
    startNodeId: 'l8_s0',
    goalNodeId: 'l8_goal',
    defaultCamAngle: 0,
    center: [-1, 2.0, -4],
    palette: {
      skyTop: '#dcd2ec',
      skyMid: '#b9b4de',
      skyBottom: '#7b8fc2',
      fogColor: '#c3bde0',
      waterColor: '#485c8a',
      accentPrimary: '#a498cc',
      accentSecondary: '#7ebdb6',
    },
    tiles: [
      // Lower Layer (y = 0)
      {id: 'l8_s0', x: 0, y: 0, z: 6, kind: 'stone', pillarHeight: 3.4},
      {id: 'l8_s1', x: 0, y: 0, z: 4, kind: 'lavender'},
      {
        id: 'l8_plate_a',
        x: 2,
        y: 0,
        z: 4,
        kind: 'plate',
        plateTriggers: ['l8_gate_1'],
        plateToggle: false,
        pillarHeight: 3.4,
      },
      {
        id: 'l8_w1',
        x: -2,
        y: 0,
        z: 4,
        kind: 'hidden',
        hiddenUntilGroup: 'l8_gate_1',
      },
      {
        id: 'l8_w2',
        x: -4,
        y: 0,
        z: 4,
        kind: 'hidden',
        hiddenUntilGroup: 'l8_gate_1',
        pillarHeight: 3.4,
      },
      {
        id: 'l8_low_p',
        x: -4,
        y: 0,
        z: 2,
        kind: 'mint',
        hiddenUntilGroup: 'l8_gate_1',
        pillarHeight: 3.6,
      },
      // Middle Layer (y = 2): (-2,2,-2) aligns with (-4,0,2) at Angle 1 without overlapping y=0!
      {id: 'l8_m0', x: -2, y: 2, z: -2, kind: 'mint'},
      {id: 'l8_m1', x: 0, y: 2, z: -2, kind: 'stone', pillarHeight: 4.5},
      {id: 'l8_m_crys', x: 2, y: 2, z: -2, kind: 'lavender', pillarHeight: 4.5},
      {
        id: 'l8_mr1',
        x: -4,
        y: 2,
        z: -2,
        kind: 'hidden',
        hiddenUntilGroup: 'l8_gate_relic',
      },
      {
        id: 'l8_mr2',
        x: -6,
        y: 2,
        z: -2,
        kind: 'mint',
        hiddenUntilGroup: 'l8_gate_relic',
        pillarHeight: 4.5,
      },
      {id: 'l8_m2', x: 2, y: 2, z: -4, kind: 'stone', pillarHeight: 4.5},
      // Middle Rotary Bridge at (2, 2, -8), initialState = 0 -> crystal rotates to 1 (North-South)
      {id: 'l8_rc', x: 0, y: 0, z: 0, kind: 'rotary', groupId: 'l8_rot_mid', pillarHeight: 4.5},
      {id: 'l8_rw', x: -2, y: 0, z: 0, kind: 'rotary', groupId: 'l8_rot_mid'},
      {id: 'l8_re', x: 2, y: 0, z: 0, kind: 'rotary', groupId: 'l8_rot_mid'},
      {id: 'l8_m_pier', x: 2, y: 2, z: -12, kind: 'mint', pillarHeight: 4.5},
      // Upper Layer (y = 4): (-2,4,-14) aligns cleanly edge-to-edge with (2,2,-12) at Angle 2!
      {id: 'l8_u0', x: -2, y: 4, z: -14, kind: 'mint'},
      {id: 'l8_u1', x: -4, y: 4, z: -14, kind: 'lavender', pillarHeight: 5.5},
      {id: 'l8_u2', x: -6, y: 4, z: -14, kind: 'stone'},
      {id: 'l8_goal', x: -6, y: 4, z: -16, kind: 'goal', pillarHeight: 5.8},
    ],
    mechanisms: [
      {
        id: 'l8_gate_1',
        type: 'gate',
        label: 'West Causeway',
        pivot: [-3, 0, 4],
        initialState: 0,
      },
      {
        id: 'l8_crys_mid',
        type: 'crystal',
        label: 'Labyrinth Prism',
        pivot: [3.55, 2, -2],
        initialState: 0,
        crankPos: [3.55, 2.75, -2],
        directInteract: true,
        coupledIds: ['l8_gate_relic', 'l8_rot_mid'],
      },
      {
        id: 'l8_gate_relic',
        type: 'gate',
        label: 'West Relic Bridge',
        pivot: [-5, 2, -2],
        initialState: 0,
      },
      {
        id: 'l8_rot_mid',
        type: 'rotary',
        label: 'Lattice Span',
        pivot: [2, 2, -8],
        initialState: 0,
        crankPos: [2, 2.7, -8],
        directInteract: true,
      },
    ],
    perspectiveLinks: [
      {
        id: 'l8_plink_1',
        nodeA: 'l8_low_p',
        nodeB: 'l8_m0',
        alignedAngles: [1],
        midPos: [-3, 1, 0],
      },
      {
        id: 'l8_plink_2',
        nodeA: 'l8_m_pier',
        nodeB: 'l8_u0',
        alignedAngles: [2],
        midPos: [0, 3, -13],
      },
    ],
    relics: [{id: 'relic_8', nodeId: 'l8_mr2', label: 'Labyrinth Star'}],
    props: [
      {id: 'l8_p1', kind: 'colonnade', position: [0, 0, 7.2], rotationY: 0},
      {id: 'l8_p2', kind: 'archway', position: [-4, 4, -14], rotationY: Math.PI / 2},
      {id: 'l8_p3', kind: 'sundial', position: [0, 2, -3.65], scale: 0.8},
      {id: 'l8_p4', kind: 'lanternPedestal', position: [5.5, -1.2, 6.5]},
      {id: 'l8_p5', kind: 'lanternPedestal', position: [-6.5, -1.2, -10.5]},
      {id: 'l8_p6', kind: 'dome', position: [-6, 4, -16], rotationY: 0},
    ],
  },

  // =========================================================================
  // LEVEL 09 — THE LAST CONSTELLATION (Ancient astronomical structures)
  // =========================================================================
  {
    levelNumber: 9,
    name: 'The Last Constellation',
    subtitle: 'World IX · Astronomical Ruins',
    difficulty: 'Very Challenging',
    themeLabel: 'Astronomical Ruins',
    objective:
      'Attune the Outer Crystal, ascend the Astral Lift, unlock the middle terrace, and align the Back-Right perspective.',
    hint: '1) Trigger the West Crystal to connect the East Rotary Span. 2) Walk East & ride the Lift up to y=2. 3) Step on the Plate to collect the North Orion Gem & reveal the South terrace. 4) Orbit to Angle 4 (Back-Right) to climb to y=4, grab the Vega Shard, and reach the Sanctuary!',
    mechanicTag: 'Combined Multi-Stage Citadel',
    fitRadius: 15.5,
    startNodeId: 'l9_s0',
    goalNodeId: 'l9_goal',
    defaultCamAngle: 0,
    center: [-1, 2.8, 0],
    palette: {
      skyTop: '#d9cde8',
      skyMid: '#b5b2dc',
      skyBottom: '#6f84ba',
      fogColor: '#bdb7dc',
      waterColor: '#415585',
      accentPrimary: '#f2d388',
      accentSecondary: '#d998ab',
    },
    tiles: [
      // Outer Ring (y = 0)
      {id: 'l9_s0', x: 0, y: 0, z: 8, kind: 'stone', pillarHeight: 3.6},
      {id: 'l9_s1', x: 0, y: 0, z: 6, kind: 'lavender', pillarHeight: 3.6},
      {id: 'l9_s_crys', x: -2, y: 0, z: 6, kind: 'mint', pillarHeight: 3.6},
      // East Rotary L-Bridge at (4, 0, 6): initialState = 2 -> crystal shifts to 3 (connects (2,0,6) & (4,0,4))
      {id: 'l9_rc', x: 0, y: 0, z: 0, kind: 'rotary', groupId: 'l9_rot_1', pillarHeight: 4.0},
      {id: 'l9_rs', x: 0, y: 0, z: 2, kind: 'rotary', groupId: 'l9_rot_1'},
      {id: 'l9_rw', x: -2, y: 0, z: 0, kind: 'rotary', groupId: 'l9_rot_1'},
      {id: 'l9_e1', x: 4, y: 0, z: 2, kind: 'stone'},
      {id: 'l9_e2', x: 4, y: 0, z: 0, kind: 'lavender', pillarHeight: 3.8},
      // Elevator at (4, 0, -2) -> (4, 2, -2)
      {id: 'l9_el', x: 0, y: 0, z: 0, kind: 'elevator', groupId: 'l9_elev_1'},
      // Middle Constellation (y = 2)
      {id: 'l9_m0', x: 4, y: 2, z: -4, kind: 'stone', pillarHeight: 4.6},
      {id: 'l9_m1', x: 2, y: 2, z: -4, kind: 'stone'},
      {id: 'l9_m2', x: 0, y: 2, z: -4, kind: 'lavender'},
      {
        id: 'l9_plate_a',
        x: -2,
        y: 2,
        z: -4,
        kind: 'plate',
        plateTriggers: ['l9_gate_mid', 'l9_gate_relic1'],
        plateToggle: false,
        pillarHeight: 4.8,
      },
      {
        id: 'l9_mr1',
        x: -2,
        y: 2,
        z: -6,
        kind: 'hidden',
        hiddenUntilGroup: 'l9_gate_relic1',
      },
      {
        id: 'l9_mr2',
        x: 0,
        y: 2,
        z: -6,
        kind: 'mint',
        hiddenUntilGroup: 'l9_gate_relic1',
        pillarHeight: 4.8,
      },
      {
        id: 'l9_mg1',
        x: 0,
        y: 2,
        z: -2,
        kind: 'hidden',
        hiddenUntilGroup: 'l9_gate_mid',
      },
      {
        id: 'l9_mg2',
        x: 0,
        y: 2,
        z: 0,
        kind: 'hidden',
        hiddenUntilGroup: 'l9_gate_mid',
      },
      {
        id: 'l9_mg3',
        x: -2,
        y: 2,
        z: 0,
        kind: 'mint',
        hiddenUntilGroup: 'l9_gate_mid',
        pillarHeight: 4.8,
      },
      // Upper Constellation (y = 4 -> 5): (-6,4,2) aligns cleanly edge-to-edge with (-2,2,0) at Angle 3!
      {id: 'l9_h0', x: -6, y: 4, z: 2, kind: 'mint'},
      {id: 'l9_h1', x: -6, y: 4, z: 0, kind: 'lavender', pillarHeight: 5.5},
      {id: 'l9_h2', x: -6, y: 4, z: -2, kind: 'stone'},
      {id: 'l9_st1', x: -6, y: 5, z: -4, kind: 'stair', facingY: 0},
      {id: 'l9_t0', x: -6, y: 5, z: -6, kind: 'lavender', pillarHeight: 6.0},
      {id: 'l9_t_rel', x: -8, y: 5, z: -6, kind: 'mint', pillarHeight: 6.0},
      {id: 'l9_t1', x: -4, y: 5, z: -6, kind: 'stone'},
      {id: 'l9_goal', x: -2, y: 5, z: -6, kind: 'goal'},
    ],
    mechanisms: [
      {
        id: 'l9_crys_1',
        type: 'crystal',
        label: 'Constellation Prism',
        pivot: [-3.55, 0, 6],
        initialState: 0,
        crankPos: [-3.55, 0.75, 6],
        directInteract: true,
        coupledIds: ['l9_rot_1'],
      },
      {
        id: 'l9_rot_1',
        type: 'rotary',
        label: 'Eastern Quadrant',
        pivot: [4, 0, 6],
        initialState: 2,
        crankPos: [4, 0.7, 6],
        directInteract: true,
      },
      {
        id: 'l9_elev_1',
        type: 'elevator',
        label: 'Astral Lift',
        pivot: [4, 0, -2],
        moveOffset: [0, 2, 0],
        initialState: 0,
        crankPos: [4, 0.7, -2],
        directInteract: true,
      },
      {
        id: 'l9_gate_mid',
        type: 'gate',
        label: 'Starlight Walk',
        pivot: [0, 2, -1],
        initialState: 0,
      },
      {
        id: 'l9_gate_relic1',
        type: 'gate',
        label: 'Orion Alcove',
        pivot: [-1, 2, -6],
        initialState: 0,
      },
    ],
    perspectiveLinks: [
      {
        id: 'l9_plink_1',
        nodeA: 'l9_mg3',
        nodeB: 'l9_h0',
        alignedAngles: [3],
        midPos: [-4, 3, 1],
      },
    ],
    relics: [
      {id: 'relic_9a', nodeId: 'l9_mr2', label: 'Orion Gem'},
      {id: 'relic_9b', nodeId: 'l9_t_rel', label: 'Vega Shard'},
    ],
    props: [
      {id: 'l9_p1', kind: 'sundial', position: [1.65, 0, 8], scale: 0.9},
      {id: 'l9_p2', kind: 'obelisk', position: [5.5, 2, -4], scale: 0.95},
      {id: 'l9_p3', kind: 'archway', position: [-6, 4, 0], rotationY: 0},
      {id: 'l9_p4', kind: 'lanternPedestal', position: [6.2, -1.2, 4.5]},
      {id: 'l9_p5', kind: 'lanternPedestal', position: [-8.5, -1.2, 3.0]},
      {id: 'l9_p6', kind: 'dome', position: [-2, 5, -6], rotationY: 0},
    ],
  },

  // =========================================================================
  // LEVEL 10 — THE ASTRAL CONVERGENCE (Grand celestial sanctuary finale)
  // =========================================================================
  {
    levelNumber: 10,
    name: 'The Astral Convergence',
    subtitle: 'World X · Grand Convergence',
    difficulty: 'Final Challenge',
    themeLabel: 'Grand Celestial Sanctuary',
    objective:
      'Unite every discipline across four rising tiers to ignite the Grand Convergence Shrine.',
    hint: '1) Step on the South Plate. 2) Cross West onto the Astrolabe to awaken the West Prism (unlocks Celestial Core & East Span). 3) Turn the Astrolabe Crank to reach the East Plate, climb the North stairs, and ride the Lift up. 4) Orbit to Angle 2 for the Sky Spire, grab the Convergence Crown, then orbit to Angle 1 for the Zenith Shrine!',
    mechanicTag: 'Grand Convergence Finale',
    fitRadius: 16.5,
    startNodeId: 'l10_s0',
    goalNodeId: 'l10_goal',
    defaultCamAngle: 0,
    center: [-2, 3.6, 0],
    palette: {
      skyTop: '#ebd3df',
      skyMid: '#c4b8e3',
      skyBottom: '#7185bf',
      fogColor: '#c7bce0',
      waterColor: '#3f5282',
      accentPrimary: '#f2d388',
      accentSecondary: '#e0917a',
    },
    tiles: [
      // Stage 1: South Courtyard (y = 0)
      {id: 'l10_s0', x: 0, y: 0, z: 10, kind: 'lavender', pillarHeight: 4.0},
      {id: 'l10_s1', x: 0, y: 0, z: 8, kind: 'stone'},
      {
        id: 'l10_plate_1',
        x: 0,
        y: 0,
        z: 6,
        kind: 'plate',
        plateTriggers: ['l10_gate_entry'],
        plateToggle: false,
        pillarHeight: 4.0,
      },
      {
        id: 'l10_g_entry',
        x: 0,
        y: 0,
        z: 4,
        kind: 'hidden',
        hiddenUntilGroup: 'l10_gate_entry',
      },
      // Stage 2: Central Astrolabe L-Bridge at (0,0,0), initialState=3 -> (-2,0,0) & (0,0,2)
      {id: 'l10_rc', x: 0, y: 0, z: 0, kind: 'rotary', groupId: 'l10_rot_main', pillarHeight: 5.0},
      {id: 'l10_rn', x: 0, y: 0, z: -2, kind: 'rotary', groupId: 'l10_rot_main'},
      {id: 'l10_re', x: 2, y: 0, z: 0, kind: 'rotary', groupId: 'l10_rot_main'},
      // West Plaza + Crystal A + Relic 10a
      {id: 'l10_w0', x: -4, y: 0, z: 0, kind: 'stone', pillarHeight: 4.0},
      {id: 'l10_w_crys', x: -4, y: 0, z: 2, kind: 'mint', pillarHeight: 4.0},
      {
        id: 'l10_wr1',
        x: -4,
        y: 0,
        z: 4,
        kind: 'hidden',
        hiddenUntilGroup: 'l10_gate_relic1',
      },
      {
        id: 'l10_wr2',
        x: -4,
        y: 0,
        z: 6,
        kind: 'mint',
        hiddenUntilGroup: 'l10_gate_relic1',
        pillarHeight: 4.0,
      },
      // East Wing + Plate 2
      {id: 'l10_e0', x: 4, y: 0, z: 0, kind: 'stone', pillarHeight: 4.0},
      {
        id: 'l10_e1',
        x: 4,
        y: 0,
        z: -2,
        kind: 'hidden',
        hiddenUntilGroup: 'l10_gate_east',
      },
      {
        id: 'l10_plate_2',
        x: 4,
        y: 0,
        z: -4,
        kind: 'plate',
        hiddenUntilGroup: 'l10_gate_east',
        plateTriggers: ['l10_gate_stairs'],
        plateToggle: false,
        pillarHeight: 4.0,
      },
      // North Stairway up to Lift
      {
        id: 'l10_n0',
        x: 0,
        y: 0,
        z: -4,
        kind: 'hidden',
        hiddenUntilGroup: 'l10_gate_stairs',
      },
      {id: 'l10_st1', x: 0, y: 1, z: -6, kind: 'stair', facingY: 0},
      {id: 'l10_st2', x: 0, y: 2, z: -8, kind: 'stair', facingY: 0},
      {id: 'l10_n1', x: 0, y: 2, z: -10, kind: 'lavender', pillarHeight: 4.8},
      // Stage 3: Elevator (-2, 2, -10) -> (-2, 4, -10), coupled with l10_gate_upper
      {id: 'l10_el', x: 0, y: 0, z: 0, kind: 'elevator', groupId: 'l10_elev'},
      {
        id: 'l10_u0',
        x: -2,
        y: 4,
        z: -8,
        kind: 'hidden',
        hiddenUntilGroup: 'l10_gate_upper',
      },
      {
        id: 'l10_u1',
        x: -2,
        y: 4,
        z: -6,
        kind: 'hidden',
        hiddenUntilGroup: 'l10_gate_upper',
        pillarHeight: 5.5,
      },
      {
        id: 'l10_u2',
        x: -4,
        y: 4,
        z: -6,
        kind: 'hidden',
        hiddenUntilGroup: 'l10_gate_upper',
      },
      {
        id: 'l10_u_edge',
        x: -6,
        y: 4,
        z: -6,
        kind: 'mint',
        hiddenUntilGroup: 'l10_gate_upper',
      },
      // Stage 4: Sky Spire (y = 6): (-4,6,-10) aligns cleanly edge-to-edge with (-6,4,-6) at Angle 1!
      {id: 'l10_sk0', x: -4, y: 6, z: -10, kind: 'mint'},
      {id: 'l10_sk1', x: -6, y: 6, z: -10, kind: 'lavender', pillarHeight: 6.2},
      {id: 'l10_sk2', x: -6, y: 6, z: -8, kind: 'stone'},
      {id: 'l10_sk3', x: -6, y: 6, z: -6, kind: 'stone'},
      {id: 'l10_sk4', x: -6, y: 6, z: -4, kind: 'lavender', pillarHeight: 6.2},
      {id: 'l10_sk_edge', x: -6, y: 6, z: -2, kind: 'mint'},
      {id: 'l10_sk_rel', x: -8, y: 6, z: -2, kind: 'mint', pillarHeight: 6.2},
      // Zenith Sanctuary (y = 8): (-4,8,2) aligns cleanly edge-to-edge with (-6,6,-2) at Angle 0!
      {id: 'l10_z0', x: -4, y: 8, z: 2, kind: 'mint'},
      {id: 'l10_z1', x: -2, y: 8, z: 2, kind: 'lavender', pillarHeight: 7.4},
      {id: 'l10_goal', x: -2, y: 8, z: 4, kind: 'goal'},
    ],
    mechanisms: [
      {
        id: 'l10_gate_entry',
        type: 'gate',
        label: 'Courtyard Gate',
        pivot: [0, 0, 4],
        initialState: 0,
      },
      {
        id: 'l10_rot_main',
        type: 'rotary',
        label: 'Convergence Astrolabe',
        pivot: [0, 0, 0],
        initialState: 2,
        crankPos: [0, 0.7, 0],
        directInteract: true,
      },
      {
        id: 'l10_crys_west',
        type: 'crystal',
        label: 'West Prism',
        pivot: [-5.55, 0, 2],
        initialState: 0,
        crankPos: [-5.55, 0.75, 2],
        directInteract: true,
        coupledIds: ['l10_gate_east', 'l10_gate_relic1'],
      },
      {
        id: 'l10_gate_relic1',
        type: 'gate',
        label: 'West Starlight Pier',
        pivot: [-4, 0, 5],
        initialState: 0,
      },
      {
        id: 'l10_gate_east',
        type: 'gate',
        label: 'East Causeway',
        pivot: [4, 0, -2],
        initialState: 0,
      },
      {
        id: 'l10_gate_stairs',
        type: 'gate',
        label: 'Observatory Ascent',
        pivot: [0, 0, -4],
        initialState: 0,
      },
      {
        id: 'l10_elev',
        type: 'elevator',
        label: 'Convergence Lift',
        pivot: [-2, 2, -10],
        moveOffset: [0, 2, 0],
        initialState: 0,
        crankPos: [-2, 2.7, -10],
        directInteract: true,
        coupledIds: ['l10_gate_upper'],
      },
      {
        id: 'l10_gate_upper',
        type: 'gate',
        label: 'Upper Terrace',
        pivot: [-3, 4, -6],
        initialState: 0,
      },
    ],
    perspectiveLinks: [
      {
        id: 'l10_plink_1',
        nodeA: 'l10_u_edge',
        nodeB: 'l10_sk0',
        alignedAngles: [1],
        midPos: [-5, 5, -8],
      },
      {
        id: 'l10_plink_2',
        nodeA: 'l10_sk_edge',
        nodeB: 'l10_z0',
        alignedAngles: [0],
        midPos: [-5, 7, 0],
      },
    ],
    relics: [
      {id: 'relic_10a', nodeId: 'l10_wr2', label: 'Celestial Core'},
      {id: 'relic_10b', nodeId: 'l10_sk_rel', label: 'Convergence Crown'},
    ],
    props: [
      {id: 'l10_p1', kind: 'archway', position: [0, 0, 8], rotationY: 0},
      {id: 'l10_p2', kind: 'obelisk', position: [5.5, 0, -4], scale: 1.0},
      {id: 'l10_p3', kind: 'waterfall', position: [-5.5, 0, 0], scale: 1.1},
      {id: 'l10_p4', kind: 'tower', position: [-8.2, 6, -5.5], scale: 0.9},
      {id: 'l10_p5', kind: 'sundial', position: [-4.25, 6, -4], scale: 0.85},
      {id: 'l10_p6', kind: 'lanternPedestal', position: [5.5, -1.2, 7.5]},
      {id: 'l10_p7', kind: 'lanternPedestal', position: [-8.5, -1.2, 5.5]},
      {id: 'l10_p8', kind: 'lanternPedestal', position: [4.0, -1.2, -9.5]},
      {id: 'l10_p9', kind: 'dome', position: [-2, 8, 4], rotationY: 0},
    ],
  },
];

// =========================================================================
// GRAPH & SPATIAL MATH HELPERS
// =========================================================================

export interface WorldNodePos {
  node: TileNode;
  wx: number;
  wy: number;
  wz: number;
  active: boolean;
}

/**
 * Computes exact world coordinates and active state for every tile in a level,
 * matching Three.js's Y-axis rotation convention (`rotation.y = state * PI/2`).
 */
export function evaluateLevelNodes(
  level: LevelDef,
  mechStates: Record<string, number>,
): Map<string, WorldNodePos> {
  const mechMap = new Map<string, MechanismDef>();
  for (const m of level.mechanisms) {
    mechMap.set(m.id, m);
  }

  const result = new Map<string, WorldNodePos>();
  for (const node of level.tiles) {
    let active = true;
    if (node.hiddenUntilGroup) {
      const gateState = mechStates[node.hiddenUntilGroup] ?? 0;
      active = gateState % 2 === 1;
    }

    let wx = node.x;
    let wy = node.y;
    let wz = node.z;

    if (node.groupId) {
      const mech = mechMap.get(node.groupId);
      if (mech) {
        const st = mechStates[mech.id] ?? mech.initialState;
        if (mech.type === 'rotary') {
          const theta = (((st % 4) + 4) % 4) * (Math.PI / 2);
          const cos = Math.cos(theta);
          const sin = Math.sin(theta);
          wx = mech.pivot[0] + (node.x * cos + node.z * sin);
          wy = mech.pivot[1] + node.y;
          wz = mech.pivot[2] + (-node.x * sin + node.z * cos);
        } else if (mech.type === 'elevator') {
          const isRaised = st % 2 === 1;
          const off = mech.moveOffset ?? [0, 0, 0];
          wx = mech.pivot[0] + node.x + (isRaised ? off[0] : 0);
          wy = mech.pivot[1] + node.y + (isRaised ? off[1] : 0);
          wz = mech.pivot[2] + node.z + (isRaised ? off[2] : 0);
        }
      }
    }

    result.set(node.id, {node, wx, wy, wz, active});
  }
  return result;
}

/**
 * Returns adjacency map of currently traversable node IDs.
 */
export function buildWalkableGraph(
  level: LevelDef,
  nodePositions: Map<string, WorldNodePos>,
  camAngle: number,
  perspectiveLocked = true,
): Map<string, string[]> {
  const adj = new Map<string, string[]>();
  const activeList: WorldNodePos[] = [];
  for (const entry of nodePositions.values()) {
    if (entry.active) {
      activeList.push(entry);
      adj.set(entry.node.id, []);
    }
  }

  const addEdge = (a: string, b: string) => {
    const listA = adj.get(a);
    const listB = adj.get(b);
    if (listA && !listA.includes(b)) listA.push(b);
    if (listB && !listB.includes(a)) listB.push(a);
  };

  for (let i = 0; i < activeList.length; i++) {
    const a = activeList[i];
    for (let j = i + 1; j < activeList.length; j++) {
      const b = activeList[j];
      const dx = Math.abs(a.wx - b.wx);
      const dz = Math.abs(a.wz - b.wz);
      const dy = Math.abs(a.wy - b.wy);

      const isCardinalStep =
        (dx < 0.3 && Math.abs(dz - 2.0) < 0.3) ||
        (dz < 0.3 && Math.abs(dx - 2.0) < 0.3);

      if (isCardinalStep && dy <= 1.08) {
        addEdge(a.node.id, b.node.id);
      }
    }

    if (a.node.explicitLinks) {
      for (const targetId of a.node.explicitLinks) {
        if (adj.has(targetId)) addEdge(a.node.id, targetId);
      }
    }
  }

  if (perspectiveLocked) {
    for (const pl of level.perspectiveLinks) {
      if (pl.alignedAngles.includes(camAngle)) {
        if (adj.has(pl.nodeA) && adj.has(pl.nodeB)) {
          addEdge(pl.nodeA, pl.nodeB);
        }
      }
    }
  }

  return adj;
}

/**
 * Finds shortest walkable path via BFS from startId to targetId.
 */
export function findPathBFS(
  adj: Map<string, string[]>,
  startId: string,
  targetId: string,
): string[] | null {
  if (startId === targetId) return [startId];
  if (!adj.has(startId) || !adj.has(targetId)) return null;

  const queue: string[] = [startId];
  const parent = new Map<string, string | null>();
  parent.set(startId, null);

  let head = 0;
  while (head < queue.length) {
    const curr = queue[head++];
    if (curr === targetId) {
      const path: string[] = [];
      let p: string | null = curr;
      while (p !== null) {
        path.push(p);
        p = parent.get(p) ?? null;
      }
      path.reverse();
      return path;
    }
    const neighbors = adj.get(curr) ?? [];
    for (const next of neighbors) {
      if (!parent.has(next)) {
        parent.set(next, curr);
        queue.push(next);
      }
    }
  }
  return null;
}

/**
 * Computes exact optical seam midpoint pairs (edgeA on surface A, edgeB on surface B)
 * so crossing a perspective illusion transition projects seamlessly along the isometric view ray
 * without clipping inside adjacent stone blocks.
 */
export function computeOpticalSeamEdges(
  ax: number,
  ay: number,
  az: number,
  bx: number,
  by: number,
  bz: number,
  camAngle: number,
): {
  isOptical: boolean;
  edgeA: [number, number, number];
  edgeB: [number, number, number];
} {
  const dx = bx - ax;
  const dy = by - ay;
  const dz = bz - az;

  if (Math.abs(dy) <= 1.2) {
    return {
      isOptical: false,
      edgeA: [(ax + bx) * 0.5, (ay + by) * 0.5, (az + bz) * 0.5],
      edgeB: [(ax + bx) * 0.5, (ay + by) * 0.5, (az + bz) * 0.5],
    };
  }

  // Camera ray direction sign (sx, +1, sz) per CAM_ANGLES index 0..3
  const sx = camAngle === 0 || camAngle === 1 ? 1 : -1;
  const sz = camAngle === 0 || camAngle === 3 ? 1 : -1;

  const rayX = dy * sx;
  const rayZ = dy * sz;

  const stepX = dx - rayX;
  const stepZ = dz - rayZ;

  return {
    isOptical: true,
    edgeA: [ax + stepX * 0.5, ay, az + stepZ * 0.5],
    edgeB: [bx - stepX * 0.5, by, bz - stepZ * 0.5],
  };
}
