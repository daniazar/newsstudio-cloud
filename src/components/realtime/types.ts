export interface MotionBeat {
  name: string;
  code: string;
  videoUrl: string;
  durationSec: number;
}

export interface PersonaLoopConfig {
  id: string;
  name: string;
  title: string;
  avatarUrl: string;
  idleVideo: string;
  motionBeats: MotionBeat[];
  voiceLang: string;
}

export interface ScriptOption {
  id: string;
  title: string;
  language: string;
  text: string;
  durationSec: number;
}

export interface VoiceOption {
  id: string;
  name: string;
  gender: "female" | "male";
  language: "es" | "en" | "all";
  description: string;
  personaId: string;
  voiceFile: string;
  style: string;
}

export const VOICE_OPTIONS: VoiceOption[] = [
  {
    id: "ruby_female",
    name: "Ruby Vance",
    gender: "female",
    language: "all",
    description: "Lead Prime Time News Anchor (Warm, authoritative, crisp enunciation)",
    personaId: "ruby",
    voiceFile: "ruby.wav",
    style: "Lead Anchor",
  },
  {
    id: "isabel_female",
    name: "Isabel Morales",
    gender: "female",
    language: "es",
    description: "Latin Broadcast Lead (Expressive, clear, warm LATAM cadence)",
    personaId: "isabel",
    voiceFile: "isabel.wav",
    style: "Latin Anchor",
  },
  {
    id: "blaze_female",
    name: "Blaze Sterling",
    gender: "female",
    language: "en",
    description: "Tech & Cyberpunk Specialist (Edgy, energetic, dynamic)",
    personaId: "blaze",
    voiceFile: "blaze.wav",
    style: "Tech Host",
  },
  {
    id: "elena_female",
    name: "Elena Rostova",
    gender: "female",
    language: "all",
    description: "Global Investigative Correspondent (Polished, insightful)",
    personaId: "elena",
    voiceFile: "elena.wav",
    style: "Correspondent",
  },
  {
    id: "sophia_female",
    name: "Sophia Chen",
    gender: "female",
    language: "en",
    description: "AI & Innovation Analyst (Modern, articulate, engaging)",
    personaId: "sophia",
    voiceFile: "sophia.wav",
    style: "Analyst",
  },
  {
    id: "marcus_male",
    name: "Marcus Thorne",
    gender: "male",
    language: "all",
    description: "Senior Prime-Time Anchor (Deep resonance, commanding, authoritative)",
    personaId: "marcus",
    voiceFile: "marcus.wav",
    style: "Senior Anchor",
  },
  {
    id: "diego_male",
    name: "Diego Alvarez",
    gender: "male",
    language: "es",
    description: "Latin Market & Economy Analyst (Professional, confident, rhythmic)",
    personaId: "diego",
    voiceFile: "diego.wav",
    style: "Market Analyst",
  },
  {
    id: "liam_male",
    name: "Liam Hayes",
    gender: "male",
    language: "en",
    description: "Breaking News Field Reporter (Urgent, energetic, fast-paced)",
    personaId: "liam",
    voiceFile: "liam.wav",
    style: "Field Reporter",
  },
  {
    id: "mateo_male",
    name: "Mateo Rossi",
    gender: "male",
    language: "es",
    description: "Latin Financial & Tech Host (Engaging, modern, crisp)",
    personaId: "mateo",
    voiceFile: "mateo.wav",
    style: "Financial Host",
  },
  {
    id: "alexander_male",
    name: "Alexander Wright",
    gender: "male",
    language: "en",
    description: "Executive Broadcast Anchor (Distinguished, calm, resonant)",
    personaId: "alexander",
    voiceFile: "alexander.wav",
    style: "Executive Anchor",
  },
];

export const PREGENERATED_SCRIPTS: ScriptOption[] = [
  {
    id: "es_2min_special",
    title: "⏱️ Edición Especial 2 Minutos (Español)",
    language: "Spanish (LATAM / Rioplatense)",
    text: "¡Muy buenas noches a todos! Bienvenidos a esta edición especial en vivo de NewsStudio, transmitiendo de manera ininterrumpida con nuestra nueva tecnología de avatares sintéticos neuronales en tiempo real a sesenta cuadros por segundo. Hoy tenemos un programa repleto de información crucial sobre los mercados internacionales, la innovación tecnológica y los acontecimientos más trascendentes de la jornada. En primer lugar, los principales índices bursátiles de Wall Street y las plazas europeas han registrado ganancias récord impulsadas por el sector de semiconductores y computación cuántica. Los analistas financieros destacan una suba acumulada superior al cuatro por ciento en los activos tecnológicos líderes. Por otra parte, en el plano internacional, varias potencias globales han firmado un histórico acuerdo marco para la regulación ética y la soberanía de modelos de inteligencia artificial de última generación, garantizando la transparencia y la ciberseguridad en infraestructuras críticas. Asimismo, en el ámbito de la ciencia, nuevos desarrollos en energía de fusión nuclear han logrado superar la barrera de confinamiento magnético durante más de dos horas continuas en laboratorios experimentales, abriendo las puertas hacia una transición energética limpia y sustentable. Quédense con nosotros para seguir repasando el minuto a minuto de las noticias más destacadas del día. Les agradecemos como siempre su compañía y preferencia informativa. ¡Continuamos con más información en directo!",
    durationSec: 120.0,
  },
  {
    id: "en_2min_special",
    title: "⏱️ Global Special Broadcast 2-Min (English)",
    language: "English (US Prime Time)",
    text: "Good evening, and welcome to this live prime-time special edition of NewsStudio, broadcasting continuously with our next-generation neural synthetic anchor pipeline operating in real time at sixty frames per second. Today we bring you comprehensive coverage of the global financial markets, breakthrough frontier technologies, and major international developments unfolding around the clock. Leading our coverage tonight, global equity markets have achieved historic all-time highs, propelled by unprecedented demand across the semiconductor and enterprise AI infrastructure sectors. Major indices closed up over three point eight percent, reflecting strong institutional investor confidence. Meanwhile, international delegates from over thirty nations have convened to ratify a groundbreaking framework establishing universal security benchmarks for autonomous AI systems and planetary data governance. In science and innovation, researchers have announced a milestone in clean energy generation, sustaining high-yield magnetic fusion reactions in continuous stable equilibrium for over two hours. We will continue tracking these stories and delivering real-time updates as events develop. Thank you for joining NewsStudio for this special broadcast. Stay tuned for our upcoming expert analysis and market wrap-up.",
    durationSec: 115.0,
  },
  {
    id: "es_breaking",
    title: "Último Momento (Español)",
    language: "Spanish (Arg / LATAM)",
    text: "Último Momento: Importantes avances en inteligencia artificial autónoma impulsan una jornada histórica en los mercados internacionales.",
    durationSec: 5.6,
  },
  {
    id: "es_market",
    title: "Mercados & Finanzas (Español)",
    language: "Spanish (LATAM)",
    text: "Mercados Globales: Los sectores de tecnología y semiconductores lideran el rally alcista con una suba acumulada del tres punto ocho por ciento.",
    durationSec: 5.6,
  },
  {
    id: "es_tech",
    title: "Innovación & Futuro (Español)",
    language: "Spanish (Rioplatense)",
    text: "Tecnología: NewsStudio presenta su nuevo motor de avatares sintéticos con sincronización labial neuronal en tiempo real a sesenta cuadros por segundo.",
    durationSec: 5.8,
  },
  {
    id: "en_breaking",
    title: "Breaking News (English)",
    language: "English (US)",
    text: "Breaking News: Global tech indices have hit an all-time high today, led by autonomous AI newsroom breakthroughs and quantum compute acceleration.",
    durationSec: 5.2,
  },
];

export const PERSONA_CONFIGS: PersonaLoopConfig[] = [
  {
    id: "ruby_pingpong_10state",
    name: "Ruby (10-State Ping-Pong Master)",
    title: "Domain 3: Seamless 4K Ping-Pong Action Suite",
    avatarUrl: "/avatars/ruby.png",
    idleVideo: "/assets/action_loops/ruby_pingpong/ruby_idle.mp4",
    motionBeats: [
      {
        name: "Motion Beat 1: Intro Welcoming",
        code: "RUBY_INTRO",
        videoUrl: "/assets/action_loops/ruby_pingpong/ruby_intro_welcome_synced.mp4",
        durationSec: 4.27,
      },
      {
        name: "Motion Beat 2: Emphasis Head Nod",
        code: "RUBY_NOD",
        videoUrl: "/assets/action_loops/ruby_pingpong/ruby_emphasis_nod_synced.mp4",
        durationSec: 4.27,
      },
      {
        name: "Motion Beat 3: Breaking Alert",
        code: "RUBY_ALERT",
        videoUrl: "/assets/action_loops/ruby_pingpong/ruby_breaking_alert_synced.mp4",
        durationSec: 4.27,
      },
      {
        name: "Motion Beat 4: Listen Head Tilt",
        code: "RUBY_LISTEN",
        videoUrl: "/assets/action_loops/ruby_pingpong/ruby_listen_tilt_synced.mp4",
        durationSec: 4.27,
      },
      {
        name: "Motion Beat 5: Look Down at Notes",
        code: "RUBY_NOTES",
        videoUrl: "/assets/action_loops/ruby_pingpong/ruby_look_down_notes_synced.mp4",
        durationSec: 4.27,
      },
      {
        name: "Motion Beat 6: Deep Thought Analyst",
        code: "RUBY_ANALYST",
        videoUrl: "/assets/action_loops/ruby_pingpong/ruby_deep_thought_analyst_synced.mp4",
        durationSec: 4.27,
      },
      {
        name: "Motion Beat 7: Point Graphic Left",
        code: "RUBY_GESTURE_LEFT",
        videoUrl: "/assets/action_loops/ruby_pingpong/ruby_gesture_left_synced.mp4",
        durationSec: 4.27,
      },
      {
        name: "Motion Beat 8: Point Graphic Right",
        code: "RUBY_GESTURE_RIGHT",
        videoUrl: "/assets/action_loops/ruby_pingpong/ruby_gesture_right_synced.mp4",
        durationSec: 4.27,
      },
      {
        name: "Motion Beat 9: Signoff Outro",
        code: "RUBY_SIGNOFF",
        videoUrl: "/assets/action_loops/ruby_pingpong/ruby_signoff_outro_synced.mp4",
        durationSec: 4.27,
      },
    ],
    voiceLang: "Studio 10-State Matrix (4.27s 60fps Loops)",
  },
  {
    id: "ruby_burgundy_veo",
    name: "Ruby Vance (Burgundy Velvet Corset - Veo 3.1)",
    title: "Domain 3: 37-Clip Full-Mesh Chroma Action Matrix",
    avatarUrl: "/avatars/master_ruby_archive/domain_chroma_wall_standing_burgundy_velvet_corset/ruby_chroma_wall_standing_burgundy_velvet_corset_01_M1_chroma_stand_base.jpg",
    idleVideo: "/assets/action_loops/veo/ruby_burgundy/ruby_burgundy_M1_loop_v1.mp4",
    motionBeats: [
      {
        name: "M1: Clasped Hands Neutral Base",
        code: "M1_LOOP_V1",
        videoUrl: "/assets/action_loops/veo/ruby_burgundy/ruby_burgundy_M1_loop_v1.mp4",
        durationSec: 7.71,
      },
      {
        name: "M2: Raised Right Hand Presentation",
        code: "M2_LOOP_V1",
        videoUrl: "/assets/action_loops/veo/ruby_burgundy/ruby_burgundy_M2_loop_v1.mp4",
        durationSec: 7.71,
      },
      {
        name: "M3: Open Two Hands Welcoming",
        code: "M3_LOOP_V1",
        videoUrl: "/assets/action_loops/veo/ruby_burgundy/ruby_burgundy_M3_loop_v1.mp4",
        durationSec: 8.0,
      },
      {
        name: "M4: Separated Arms Relaxed",
        code: "M4_LOOP_V1",
        videoUrl: "/assets/action_loops/veo/ruby_burgundy/ruby_burgundy_M4_loop_v1.mp4",
        durationSec: 8.0,
      },
      {
        name: "M5: Three-Quarter Side Perspective",
        code: "M5_LOOP_V1",
        videoUrl: "/assets/action_loops/veo/ruby_burgundy/ruby_burgundy_M5_loop_v1.mp4",
        durationSec: 8.0,
      },
      {
        name: "Dynamic: Attentive Forward Lean",
        code: "M1_DYNAMIC_LEAN",
        videoUrl: "/assets/action_loops/veo/ruby_burgundy/ruby_burgundy_M1_dynamic_v1.mp4",
        durationSec: 8.0,
      },
      {
        name: "Dynamic: Torso Rotation & Emphasis",
        code: "M2_DYNAMIC_ROTATE",
        videoUrl: "/assets/action_loops/veo/ruby_burgundy/ruby_burgundy_M2_dynamic_v1.mp4",
        durationSec: 8.0,
      },
      {
        name: "Dynamic: Open Hands Conversational Lean",
        code: "M3_DYNAMIC_OPEN",
        videoUrl: "/assets/action_loops/veo/ruby_burgundy/ruby_burgundy_M3_dynamic_v1.mp4",
        durationSec: 8.0,
      },
      {
        name: "Dynamic: Poised Conversational Sway",
        code: "M4_DYNAMIC_SWAY",
        videoUrl: "/assets/action_loops/veo/ruby_burgundy/ruby_burgundy_M4_dynamic_v1.mp4",
        durationSec: 8.0,
      },
      {
        name: "Dynamic: Side Stance Camera Engagement",
        code: "M5_DYNAMIC_ENGAGE",
        videoUrl: "/assets/action_loops/veo/ruby_burgundy/ruby_burgundy_M5_dynamic_v1.mp4",
        durationSec: 8.0,
      },
      {
        name: "Natural: Auburn Hair Ear Tuck",
        code: "M1_HAIR_ADJUST",
        videoUrl: "/assets/action_loops/veo/ruby_burgundy/ruby_burgundy_M1_hair_adjust_v1.mp4",
        durationSec: 8.0,
      },
      {
        name: "Natural: Hair Shoulder Brush",
        code: "M4_HAIR_BRUSH",
        videoUrl: "/assets/action_loops/veo/ruby_burgundy/ruby_burgundy_M4_hair_adjust_v1.mp4",
        durationSec: 8.0,
      },
      {
        name: "Transition: M1 to M2 (Raise Hand)",
        code: "T1_TO_2",
        videoUrl: "/assets/action_loops/veo/ruby_burgundy/ruby_burgundy_T1_to_2.mp4",
        durationSec: 8.0,
      },
      {
        name: "Transition: M2 to M1 (Lower Hand)",
        code: "T2_TO_1",
        videoUrl: "/assets/action_loops/veo/ruby_burgundy/ruby_burgundy_T2_to_1.mp4",
        durationSec: 8.0,
      },
      {
        name: "Transition: M1 to M3 (Open Hands)",
        code: "T1_TO_3",
        videoUrl: "/assets/action_loops/veo/ruby_burgundy/ruby_burgundy_T1_to_3.mp4",
        durationSec: 8.0,
      },
      {
        name: "Transition: M3 to M1 (Close Hands)",
        code: "T3_TO_1",
        videoUrl: "/assets/action_loops/veo/ruby_burgundy/ruby_burgundy_T3_to_1.mp4",
        durationSec: 8.0,
      },
      {
        name: "Transition: M1 to M5 (Side Turn)",
        code: "T1_TO_5",
        videoUrl: "/assets/action_loops/veo/ruby_burgundy/ruby_burgundy_T1_to_5.mp4",
        durationSec: 7.67,
      },
    ],
    voiceLang: "Burgundy Velvet Corset (37-Clip Full Mesh)",
  },
  {
    id: "ruby_studio",
    name: "Ruby (Studio Desk)",
    title: "Domain 1: Newsroom Studio Desk",
    avatarUrl: "/avatars/ruby.png",
    idleVideo: "/assets/demo_realtime/ruby_studio_idle.mp4",
    motionBeats: [
      {
        name: "Motion Beat 1: Explanatory Right Hand",
        code: "P02_RAISED_EXPLANATORY",
        videoUrl: "/assets/demo_realtime/ruby_studio_beat1_synced.mp4",
        durationSec: 4.0,
      },
      {
        name: "Motion Beat 2: Welcoming Gestures",
        code: "P03_OPEN_TWO_HANDS",
        videoUrl: "/assets/demo_realtime/ruby_studio_beat2_synced.mp4",
        durationSec: 4.0,
      },
    ],
    voiceLang: "English (US) / Spanish (LATAM)",
  },
  {
    id: "ruby_chroma",
    name: "Ruby (Chroma Key)",
    title: "Domain 3: Full Chroma Green Studio",
    avatarUrl: "/avatars/ruby.png",
    idleVideo: "/assets/demo_realtime/ruby_chroma_idle.mp4",
    motionBeats: [
      {
        name: "Motion Beat 1: Explanatory Right Hand",
        code: "P02_RAISED_EXPLANATORY",
        videoUrl: "/assets/demo_realtime/ruby_chroma_beat1_synced.mp4",
        durationSec: 4.0,
      },
      {
        name: "Motion Beat 2: Welcoming Open Arms",
        code: "P03_OPEN_TWO_HANDS",
        videoUrl: "/assets/demo_realtime/ruby_chroma_beat2_synced.mp4",
        durationSec: 4.0,
      },
    ],
    voiceLang: "English (US) / Spanish (LATAM)",
  },
  {
    id: "blaze_cyberpunk",
    name: "Blaze (Cyberpunk)",
    title: "Domain 3: Neon Chroma Studio",
    avatarUrl: "/avatars/blaze.png",
    idleVideo: "/assets/demo_realtime/blaze_chroma_idle.mp4",
    motionBeats: [
      {
        name: "Motion Beat 1: Explanatory Right Hand",
        code: "P02_RAISED_EXPLANATORY",
        videoUrl: "/assets/demo_realtime/blaze_beat1_synced.mp4",
        durationSec: 4.0,
      },
      {
        name: "Motion Beat 2: Welcoming Gestures",
        code: "P03_OPEN_TWO_HANDS",
        videoUrl: "/assets/demo_realtime/blaze_beat2_synced.mp4",
        durationSec: 4.0,
      },
    ],
    voiceLang: "English (US)",
  },
  {
    id: "blaze_silver_minimax",
    name: "Blaze (Silver Bomber - MiniMax H3)",
    title: "Domain 3: Chroma Wall Action Suite (MiniMax H3)",
    avatarUrl: "/avatars/master_blaze_archive/domain_chroma_wall_standing_silver_bomber_neon_crop/01_M1_chroma_stand_base.jpg",
    idleVideo: "/assets/action_loops/silver_bomber/minimax_h3/m1_neutral_stand_loop.mp4",
    motionBeats: [
      {
        name: "Motion Beat 1: Raised Right Hand",
        code: "P02_RAISED_EXPLANATORY",
        videoUrl: "/assets/action_loops/silver_bomber/minimax_h3/m2_raised_hand_gesture_loop_synced.mp4",
        durationSec: 4.0,
      },
      {
        name: "Motion Beat 2: Open Both Hands",
        code: "P03_OPEN_TWO_HANDS",
        videoUrl: "/assets/action_loops/silver_bomber/minimax_h3/m3_open_two_hands_loop_synced.mp4",
        durationSec: 4.0,
      },
      {
        name: "Motion Beat 3: Relaxed Stance",
        code: "P04_SEPARATED_NEUTRAL",
        videoUrl: "/assets/action_loops/silver_bomber/minimax_h3/m4_relaxed_stance_loop_synced.mp4",
        durationSec: 4.0,
      },
      {
        name: "Motion Beat 4: 3/4 Angled Turn",
        code: "P05_SIDE_PERSPECTIVE_TURN",
        videoUrl: "/assets/action_loops/silver_bomber/minimax_h3/m5_angled_turn_loop.mp4",
        durationSec: 4.0,
      },
    ],
    voiceLang: "Metallic Silver Bomber & Neon Crop Top",
  },
  {
    id: "blaze_silver_veo",
    name: "Blaze (Silver Bomber - Google Veo)",
    title: "Domain 3: Chroma Wall Action Suite (Google Veo)",
    avatarUrl: "/avatars/master_blaze_archive/domain_chroma_wall_standing_silver_bomber_neon_crop/01_M1_chroma_stand_base.jpg",
    idleVideo: "/assets/action_loops/silver_bomber/google_veo/m1_neutral_stand_loop.mp4",
    motionBeats: [
      {
        name: "Motion Beat 1: Raised Right Hand",
        code: "P02_RAISED_EXPLANATORY",
        videoUrl: "/assets/action_loops/silver_bomber/google_veo/m2_raised_hand_gesture_loop_synced.mp4",
        durationSec: 4.0,
      },
      {
        name: "Motion Beat 2: Open Both Hands",
        code: "P03_OPEN_TWO_HANDS",
        videoUrl: "/assets/action_loops/silver_bomber/google_veo/m3_open_two_hands_loop_synced.mp4",
        durationSec: 4.0,
      },
      {
        name: "Motion Beat 3: Relaxed Stance",
        code: "P04_SEPARATED_NEUTRAL",
        videoUrl: "/assets/action_loops/silver_bomber/google_veo/m4_relaxed_stance_loop.mp4",
        durationSec: 4.0,
      },
      {
        name: "Motion Beat 4: 3/4 Angled Turn",
        code: "P05_SIDE_PERSPECTIVE_TURN",
        videoUrl: "/assets/action_loops/silver_bomber/google_veo/m5_angled_turn_loop.mp4",
        durationSec: 4.0,
      },
    ],
    voiceLang: "Metallic Silver Bomber & Neon Crop Top",
  },
  {
    id: "blaze_silver_hunyuan",
    name: "Blaze (Silver Bomber - Hunyuan 1.5)",
    title: "Domain 3: Chroma Wall Action Suite (Hunyuan 1.5)",
    avatarUrl: "/avatars/master_blaze_archive/domain_chroma_wall_standing_silver_bomber_neon_crop/01_M1_chroma_stand_base.jpg",
    idleVideo: "/assets/action_loops/silver_bomber/hunyuan_15/m1_neutral_stand_loop.mp4",
    motionBeats: [
      {
        name: "Motion Beat 1: Raised Right Hand",
        code: "P02_RAISED_EXPLANATORY",
        videoUrl: "/assets/action_loops/silver_bomber/hunyuan_15/m2_raised_hand_gesture_loop_synced.mp4",
        durationSec: 4.0,
      },
      {
        name: "Motion Beat 2: Open Both Hands",
        code: "P03_OPEN_TWO_HANDS",
        videoUrl: "/assets/action_loops/silver_bomber/hunyuan_15/m3_open_two_hands_loop_synced.mp4",
        durationSec: 4.0,
      },
      {
        name: "Motion Beat 3: Relaxed Stance",
        code: "P04_SEPARATED_NEUTRAL",
        videoUrl: "/assets/action_loops/silver_bomber/hunyuan_15/m4_relaxed_stance_loop.mp4",
        durationSec: 4.0,
      },
      {
        name: "Motion Beat 4: 3/4 Angled Turn",
        code: "P05_SIDE_PERSPECTIVE_TURN",
        videoUrl: "/assets/action_loops/silver_bomber/hunyuan_15/m5_angled_turn_loop.mp4",
        durationSec: 4.0,
      },
    ],
    voiceLang: "Metallic Silver Bomber & Neon Crop Top",
  },
  {
    id: "isabel",
    name: "Isabel (Spanish News)",
    title: "Domain 3: Latin Broadcast Suite",
    avatarUrl: "/avatars/isabel.png",
    idleVideo: "/assets/demo_realtime/ruby_chroma_idle.mp4",
    motionBeats: [
      {
        name: "Motion Beat 1: Spanish Lead Anchor",
        code: "P02_LATAM_LEAD",
        videoUrl: "/assets/demo_realtime/ruby_chroma_synced_es.mp4",
        durationSec: 4.0,
      },
      {
        name: "Motion Beat 2: Welcoming Gestures",
        code: "P03_OPEN_TWO_HANDS",
        videoUrl: "/assets/demo_realtime/ruby_chroma_beat2_synced.mp4",
        durationSec: 4.0,
      },
    ],
    voiceLang: "Spanish (LATAM)",
  },
];
