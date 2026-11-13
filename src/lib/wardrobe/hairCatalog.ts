/**
 * src/lib/wardrobe/hairCatalog.ts
 *
 * Dedicated Hairstyle Catalog for NewsStudio virtual broadcast news anchors and creators.
 * Features 18 curated hairstyles (8 Female, 6 Male, 4 Unisex) covering lengths from short pixie
 * to voluminous blowouts, updos, textured coils, and fades.
 *
 * Provides SAM 3.1 tracking tokens, face-preservation prompts, color family taxonomies,
 * interactive color swatches, and 4-panel multi-view technical reference plates against #00FF00 green chroma backdrop.
 */

export type HairGender = "female" | "male" | "unisex";

export type HairCategory =
  | "broadcast_anchor"
  | "executive_sleek"
  | "editorial_gala"
  | "modern_casual"
  | "bold_avantgarde"
  | "textured_curls";

export type HairLength = "short" | "medium" | "long" | "updo";

export type HairTexture = "straight" | "wavy" | "curly" | "coily" | "braided";

export type HairColorFamily = "blonde" | "brunette" | "black" | "red" | "silver" | "platinum";

export type HairColorTechnique =
  | "solid"
  | "ombre"
  | "balayage"
  | "highlights"
  | "money_piece"
  | "shadow_root";

export type HairColorDimension = "subtle" | "medium" | "bold";

export interface HairToneSpec {
  hex: string;
  name: string;
  description: string;
}

export interface HairColorSwatch {
  id: string;
  name: string;
  family: HairColorFamily;
  hex: string;
  promptModifier: string;
  description: string;
  // Phase 3: Advanced Salon Color Science
  rootTone?: HairToneSpec;
  tipTone?: HairToneSpec;
  technique?: HairColorTechnique;
  dimension?: HairColorDimension;
  isDualTone?: boolean;
}

export const SOLID_HAIR_COLOR_SWATCHES: HairColorSwatch[] = [
  {
    id: "warm_honey_blonde",
    name: "Warm Honey Blonde",
    family: "blonde",
    hex: "#E8C07A",
    promptModifier: "warm honey blonde with golden butter ribbons and dimensional sunlit highlights",
    description: "Sun-kissed multi-tonal golden blonde",
    technique: "solid",
    dimension: "subtle",
    isDualTone: false,
    rootTone: { hex: "#E8C07A", name: "Warm Honey Blonde", description: "sun-kissed golden honey blonde" },
    tipTone: { hex: "#E8C07A", name: "Warm Honey Blonde", description: "sun-kissed golden honey blonde" },
  },
  {
    id: "champagne_blonde",
    name: "Champagne Blonde",
    family: "blonde",
    hex: "#E5D3B3",
    promptModifier: "soft neutral champagne blonde with cool cream highlights and delicate luster",
    description: "Soft elegant neutral cream blonde",
    technique: "solid",
    dimension: "subtle",
    isDualTone: false,
    rootTone: { hex: "#E5D3B3", name: "Champagne Blonde", description: "neutral champagne blonde" },
    tipTone: { hex: "#E5D3B3", name: "Champagne Blonde", description: "neutral champagne blonde" },
  },
  {
    id: "platinum_ice",
    name: "Nordic Platinum Ice",
    family: "platinum",
    hex: "#EAEAEA",
    promptModifier: "cool Nordic platinum ice blonde with pale silvery luster and pearlescent shine",
    description: "High-fashion ultra-pale icy platinum",
    technique: "solid",
    dimension: "subtle",
    isDualTone: false,
    rootTone: { hex: "#EAEAEA", name: "Nordic Platinum Ice", description: "cool Nordic platinum ice" },
    tipTone: { hex: "#EAEAEA", name: "Nordic Platinum Ice", description: "cool Nordic platinum ice" },
  },
  {
    id: "midnight_black",
    name: "Midnight Raven Black",
    family: "black",
    hex: "#141416",
    promptModifier: "deep jet raven black with reflective blue-black mirror sheen and rich melanin depth",
    description: "Glossy jet black with cool undertones",
    technique: "solid",
    dimension: "subtle",
    isDualTone: false,
    rootTone: { hex: "#141416", name: "Midnight Raven Black", description: "glossy jet raven black" },
    tipTone: { hex: "#141416", name: "Midnight Raven Black", description: "glossy jet raven black" },
  },
  {
    id: "dark_espresso",
    name: "Dark Espresso",
    family: "black",
    hex: "#241812",
    promptModifier: "rich dark espresso black-brown with velvety depth and subtle dark roast undertones",
    description: "Deep neutral dark chocolate espresso",
    technique: "solid",
    dimension: "subtle",
    isDualTone: false,
    rootTone: { hex: "#241812", name: "Dark Espresso", description: "rich dark espresso black-brown" },
    tipTone: { hex: "#241812", name: "Dark Espresso", description: "rich dark espresso black-brown" },
  },
  {
    id: "caramel_chestnut",
    name: "Caramel Chestnut",
    family: "brunette",
    hex: "#6B4423",
    promptModifier: "warm chestnut brown with luminous golden caramel balayage ribbons",
    description: "Dimensional warm brown with honey caramel highlights",
    technique: "solid",
    dimension: "subtle",
    isDualTone: false,
    rootTone: { hex: "#6B4423", name: "Caramel Chestnut", description: "warm chestnut brown" },
    tipTone: { hex: "#6B4423", name: "Caramel Chestnut", description: "warm chestnut brown" },
  },
  {
    id: "bronze_mocha",
    name: "Bronze Mocha",
    family: "brunette",
    hex: "#8C5E3D",
    promptModifier: "warm bronze mocha with cinnamon babylights and sunlit amber reflections",
    description: "Rich dimensional medium brunette",
    technique: "solid",
    dimension: "subtle",
    isDualTone: false,
    rootTone: { hex: "#8C5E3D", name: "Bronze Mocha", description: "warm bronze mocha" },
    tipTone: { hex: "#8C5E3D", name: "Bronze Mocha", description: "warm bronze mocha" },
  },
  {
    id: "copper_auburn",
    name: "Vibrant Copper Auburn",
    family: "red",
    hex: "#A83E18",
    promptModifier: "vibrant fiery copper auburn with amber reflections and rich warm henna sheen",
    description: "Bold luminous ginger copper red",
    technique: "solid",
    dimension: "subtle",
    isDualTone: false,
    rootTone: { hex: "#A83E18", name: "Vibrant Copper Auburn", description: "vibrant fiery copper auburn" },
    tipTone: { hex: "#A83E18", name: "Vibrant Copper Auburn", description: "vibrant fiery copper auburn" },
  },
  {
    id: "silver_slate",
    name: "Silver Slate Gray",
    family: "silver",
    hex: "#8E979E",
    promptModifier: "distinguished salt-and-pepper silver slate gray with bright metallic silver strands",
    description: "Executive silver and cool gray blend",
    technique: "solid",
    dimension: "subtle",
    isDualTone: false,
    rootTone: { hex: "#8E979E", name: "Silver Slate Gray", description: "distinguished silver slate gray" },
    tipTone: { hex: "#8E979E", name: "Silver Slate Gray", description: "distinguished silver slate gray" },
  },
];

export const SALON_DUAL_TONE_PRESETS: HairColorSwatch[] = [
  {
    id: "espresso_honey_balayage",
    name: "Espresso Melt to Warm Honey Balayage",
    family: "brunette",
    hex: "#241812",
    technique: "balayage",
    dimension: "medium",
    isDualTone: true,
    rootTone: {
      hex: "#241812",
      name: "Dark Espresso",
      description: "deep dark roast espresso root melt",
    },
    tipTone: {
      hex: "#E8C07A",
      name: "Warm Honey Blonde",
      description: "sun-kissed golden honey blonde ribbons",
    },
    promptModifier:
      "hand-painted warm honey blonde balayage ribbons sweeping over a rich dark espresso root melt, seamless micro-gradation, luminous hair fiber luster, and dimensional depth",
    description: "Seamless dark espresso root melting into warm sun-kissed honey blonde balayage ribbons.",
  },
  {
    id: "raven_burgundy_ombre",
    name: "Raven Black with Burgundy Ombré",
    family: "red",
    hex: "#141416",
    technique: "ombre",
    dimension: "bold",
    isDualTone: true,
    rootTone: {
      hex: "#141416",
      name: "Midnight Raven Black",
      description: "deep jet raven black root",
    },
    tipTone: {
      hex: "#72152B",
      name: "Deep Burgundy Wine",
      description: "luminous velvet burgundy red tips",
    },
    promptModifier:
      "horizontal gradient ombré transitioning softly from midnight raven black roots through mid-lengths into vivid velvet burgundy wine ends with smooth tonal diffusion",
    description: "Dramatic high-contrast ombré from raven black root to vibrant deep burgundy wine ends.",
  },
  {
    id: "platinum_slate_shadow_root",
    name: "Platinum Ash with Slate Shadow Root",
    family: "platinum",
    hex: "#3A3E45",
    technique: "shadow_root",
    dimension: "medium",
    isDualTone: true,
    rootTone: {
      hex: "#3A3E45",
      name: "Slate Shadow",
      description: "cool smoky charcoal slate shadow root",
    },
    tipTone: {
      hex: "#EAEAEA",
      name: "Nordic Platinum Ice",
      description: "cool reflective icy platinum blonde",
    },
    promptModifier:
      "modern salon shadow root with cool slate gray charcoal melt fading seamlessly into luminous icy Nordic platinum blonde lengths",
    description: "Editorial icy platinum blonde anchored by a soft smoky slate shadow root.",
  },
  {
    id: "caramel_golden_money_piece",
    name: "Caramel Chestnut with Golden Blonde Money Piece",
    family: "brunette",
    hex: "#6B4423",
    technique: "money_piece",
    dimension: "bold",
    isDualTone: true,
    rootTone: {
      hex: "#6B4423",
      name: "Caramel Chestnut",
      description: "warm dimensional chestnut brown base",
    },
    tipTone: {
      hex: "#F3D079",
      name: "Golden Blonde",
      description: "radiant sunlit golden blonde face-framing ribbons",
    },
    promptModifier:
      "high-contrast golden blonde face-framing money piece ribbons framing the face, contrasted against a rich warm caramel chestnut base with salon foil placement",
    description: "Bold sunlit golden blonde face-framing accents set against warm caramel chestnut.",
  },
  {
    id: "rose_gold_auburn_balayage",
    name: "Rose Gold Balayage on Deep Auburn",
    family: "red",
    hex: "#6E261D",
    technique: "balayage",
    dimension: "subtle",
    isDualTone: true,
    rootTone: {
      hex: "#6E261D",
      name: "Deep Auburn",
      description: "rich fiery mahogany auburn root base",
    },
    tipTone: {
      hex: "#D48B80",
      name: "Metallic Rose Gold",
      description: "delicate iridescent pink-gold reflective ribbons",
    },
    promptModifier:
      "delicate rose gold balayage ribbons painted across a deep mahogany auburn base, shimmering metallic luster, soft tonal warmth, and smooth transitions",
    description: "Subtle pearlescent rose gold balayage hand-painted through deep fiery auburn.",
  },
  {
    id: "bronze_golden_highlights",
    name: "Bronze Mocha with Golden Babylights",
    family: "brunette",
    hex: "#5C3A21",
    technique: "highlights",
    dimension: "medium",
    isDualTone: true,
    rootTone: {
      hex: "#5C3A21",
      name: "Bronze Mocha",
      description: "rich dimensional mocha base",
    },
    tipTone: {
      hex: "#E5C178",
      name: "Sunlit Babylights",
      description: "micro-fine golden babylights",
    },
    promptModifier:
      "woven salon foil highlights with micro-fine sunlit golden babylights interspersed throughout a dimensional bronze mocha base, high-gloss reflection",
    description: "Multi-dimensional golden babylights woven seamlessly through deep bronze mocha.",
  },
];

export const HAIR_COLOR_SWATCHES: HairColorSwatch[] = [
  ...SOLID_HAIR_COLOR_SWATCHES,
  ...SALON_DUAL_TONE_PRESETS,
];

export interface HairStyleItem {
  id: string;
  name: string;
  gender: HairGender;
  category: HairCategory;
  hairColor: string;
  colorFamily: HairColorFamily;
  hairLength: HairLength;
  hairTexture: HairTexture;
  prompt: string;
  samPrompt: string;
  facePreservePrompt: string;
  imageUrl: string;
  description: string;
  cleanGenPrompt: string;
}

export const HAIR_CATALOG: HairStyleItem[] = [
  // ==========================================
  // 🎙️ FEMALE HAIRSTYLES (8)
  // ==========================================
  {
    id: "fem_hair_01_honey_blonde_lob",
    name: "Honey Blonde Structured Blunt Lob",
    gender: "female",
    category: "broadcast_anchor",
    hairColor: "warm honey blonde with golden butter highlights",
    colorFamily: "blonde",
    hairLength: "medium",
    hairTexture: "straight",
    prompt:
      "Precision blunt shoulder-length lob haircut in rich warm honey blonde with subtle dimension, sleek side part, and crisp clean ends hitting right at the collarbone",
    samPrompt: "hair, hairstyle, bangs, strands, locks, scalp, hairline, lob",
    facePreservePrompt: "face, eyes, eyebrows, nose, mouth, lips, cheeks, chin, jawline",
    imageUrl: "/assets/hairstyles/generic/fem_hair_01_honey_blonde_lob.jpg",
    description: "Executive collarbone-length blunt lob in multi-tonal honey blonde with clean side part.",
    cleanGenPrompt:
      "A professional salon technical 4-panel multi-view hairstyle reference plate showing a women's hairstyle displayed on an invisible 3D ghost mannequin head (NO human eyes, NO nose, NO lips, NO plastic mannequin skin, only the styled floating hair itself). The hairstyle is a precision blunt shoulder-length lob in warm honey blonde with golden highlights. The image is divided into 4 clean vertical subpanels side-by-side against a seamless solid green chroma wall studio backdrop (#00FF00 green screen): Panel 1 (left): Full Front View showing the sleek side parting and collarbone blunt edge. Panel 2: Left Side Profile View showing ear coverage and clean angular forward slant. Panel 3: Rear Back View showing the razor-sharp horizontal baseline cut at the nape. Panel 4 (right): Macro close-up of glossy silky hair strands, highlighting multi-dimensional honey and butter-blonde tones. Ultra-photorealistic hair physics, studio rim lighting, sharp focus, 8k photo. IMPORTANT: Absolutely NO text, NO labels, NO words, NO captions, NO banners, clean pure photography only.",
  },
  {
    id: "fem_hair_02_midnight_black_pixie",
    name: "Midnight Raven Asymmetric Pixie",
    gender: "female",
    category: "bold_avantgarde",
    hairColor: "glossy jet raven black with blue-black sheen",
    colorFamily: "black",
    hairLength: "short",
    hairTexture: "straight",
    prompt:
      "Edgy razor-textured asymmetric pixie crop in glossy jet raven black with elongated sweeping side fringe and closely tapered nape",
    samPrompt: "hair, hairstyle, bangs, strands, locks, scalp, hairline, pixie, fringe",
    facePreservePrompt: "face, eyes, eyebrows, nose, mouth, lips, cheeks, chin, jawline",
    imageUrl: "/assets/hairstyles/generic/fem_hair_02_midnight_black_pixie.jpg",
    description: "Sleek architectural asymmetric pixie cut with sweeping side fringe in jet black.",
    cleanGenPrompt:
      "A professional salon technical 4-panel multi-view hairstyle reference plate showing a women's hairstyle displayed on an invisible 3D ghost mannequin head (NO human eyes, NO nose, NO lips, NO plastic mannequin skin, only the styled floating hair itself). The hairstyle is an edgy razor-textured asymmetric pixie cut in glossy jet raven black with elongated side-swept fringe. The image is divided into 4 clean vertical subpanels side-by-side against a seamless solid green chroma wall studio backdrop (#00FF00 green screen): Panel 1 (left): Full Front View showing sweeping side bangs across brow line. Panel 2: Left Side Profile View showing precision tapered temple fade and feathered ear cutout. Panel 3: Rear Back View showing tight clean nape taper. Panel 4 (right): Macro close-up of razor-cut feathered hair tips and reflective blue-black sheen under studio light. Ultra-photorealistic hair physics, studio rim lighting, sharp focus, 8k photo. IMPORTANT: Absolutely NO text, NO labels, NO words, NO captions, NO banners, clean pure photography only.",
  },
  {
    id: "fem_hair_03_caramel_voluminous_blowout",
    name: "Caramel Chestnut Voluminous Studio Blowout",
    gender: "female",
    category: "broadcast_anchor",
    hairColor: "rich chestnut brown with warm caramel balayage",
    colorFamily: "brunette",
    hairLength: "long",
    hairTexture: "wavy",
    prompt:
      "Prime-time broadcast voluminous 90s supermodel blowout with cascading bouncy silk waves, center part, and face-framing curtain layers in rich caramel chestnut",
    samPrompt: "hair, hairstyle, bangs, strands, locks, scalp, hairline, waves, curls, blowout",
    facePreservePrompt: "face, eyes, eyebrows, nose, mouth, lips, cheeks, chin, jawline",
    imageUrl: "/assets/hairstyles/generic/fem_hair_03_caramel_voluminous_blowout.jpg",
    description: "High-volume studio blowout with cascading silk waves and face-framing layers.",
    cleanGenPrompt:
      "A professional salon technical 4-panel multi-view hairstyle reference plate showing a women's hairstyle displayed on an invisible 3D ghost mannequin head (NO human eyes, NO nose, NO lips, NO plastic mannequin skin, only the styled floating hair itself). The hairstyle is a voluminous 90s broadcast blowout with cascading bouncy waves in rich caramel chestnut. The image is divided into 4 clean vertical subpanels side-by-side against a seamless solid green chroma wall studio backdrop (#00FF00 green screen): Panel 1 (left): Full Front View with bouncy curtain layers framing the face. Panel 2: Left Side Profile View showing crown root lift and flowing side curls. Panel 3: Rear Back View showing cascading layered V-cut waves. Panel 4 (right): Macro close-up of soft velvet curls, individual hair fibers, and dimensional caramel balayage ribbons. Ultra-photorealistic hair physics, studio rim lighting, sharp focus, 8k photo. IMPORTANT: Absolutely NO text, NO labels, NO words, NO captions, NO banners, clean pure photography only.",
  },
  {
    id: "fem_hair_04_platinum_sleek_high_ponytail",
    name: "Platinum Ice Sleek High Ponytail",
    gender: "female",
    category: "editorial_gala",
    hairColor: "cool platinum ice blonde",
    colorFamily: "platinum",
    hairLength: "updo",
    hairTexture: "straight",
    prompt:
      "High-fashion snatched high ponytail in icy platinum blonde, mirror-smooth scalp tension, wrapped hair band closure, and ultra-straight waist-length cascading tail",
    samPrompt: "hair, hairstyle, ponytail, scalp, hairline, strands, updo",
    facePreservePrompt: "face, eyes, eyebrows, nose, mouth, lips, cheeks, chin, jawline",
    imageUrl: "/assets/hairstyles/generic/fem_hair_04_platinum_sleek_high_ponytail.jpg",
    description: "Snatched ultra-sleek high ponytail in platinum ice with mirror-smooth finish.",
    cleanGenPrompt:
      "A professional salon technical 4-panel multi-view hairstyle reference plate showing a women's hairstyle displayed on a subtle translucent green mannequin head contour against a solid green chroma studio wall (#00FF00 green screen). The hairstyle is a snatched high ponytail in icy platinum blonde with ultra-smooth scalp tension and a cascading straight tail. The image is divided into exactly 4 clean vertical subpanels side-by-side (1 single horizontal row with 4 equal vertical columns from left to right): Panel 1 (far left column): Full Front View showing sleek pulled-back hairline and the top crest of the high ponytail rising above the crown, ponytail falls behind the head (NO hair hanging in front of the face), subtle green mannequin head contour, NO human face. Panel 2 (second column): Left Side Profile View showing the high 45-degree angle sweep and straight platinum ponytail falling straight down the back. Panel 3 (third column): Rear Back View showing tight back nape tension and flowing straight platinum tail. Panel 4 (far right column): Macro close-up of the hair-wrapped elastic base, reflective platinum sheen, and glass-like hair strands. Ultra-photorealistic hair physics, studio rim lighting separating hair from green screen, sharp 8k focus. IMPORTANT: Exactly 4 vertical columns side by side in a single horizontal row. Absolutely NO text, NO labels, NO words.",
  },
  {
    id: "fem_hair_05_copper_hollywood_waves",
    name: "Vibrant Copper Retro Hollywood S-Waves",
    gender: "female",
    category: "editorial_gala",
    hairColor: "vibrant fiery copper red with amber gloss",
    colorFamily: "red",
    hairLength: "long",
    hairTexture: "wavy",
    prompt:
      "Sculpted vintage Old Hollywood high-gloss S-waves in fiery copper red, deep sculpted side part, and brush-out finger-wave ridges over one shoulder",
    samPrompt: "hair, hairstyle, waves, curls, scalp, hairline, strands, locks",
    facePreservePrompt: "face, eyes, eyebrows, nose, mouth, lips, cheeks, chin, jawline",
    imageUrl: "/assets/hairstyles/generic/fem_hair_05_copper_hollywood_waves.jpg",
    description: "Vintage sculpted Hollywood glamour S-waves in high-gloss fiery copper red.",
    cleanGenPrompt:
      "A professional salon technical 4-panel multi-view hairstyle reference plate showing a women's hairstyle displayed on an invisible 3D ghost mannequin head (NO human eyes, NO nose, NO lips, NO plastic mannequin skin, only the styled floating hair itself). The hairstyle is sculpted Old Hollywood vintage S-waves in vibrant fiery copper red. The image is divided into 4 clean vertical subpanels side-by-side against a seamless solid green chroma wall studio backdrop (#00FF00 green screen): Panel 1 (left): Full Front View showing deep side part and uniform sculpted wave ridges. Panel 2: Left Side Profile View showing rhythmic wave peaks and glossy curl bounce. Panel 3: Rear Back View showing smooth back crown transition into wave cadence. Panel 4 (right): Macro close-up of glossy copper hair cuticles reflecting studio key lights with glass-like luster. Ultra-photorealistic hair physics, studio rim lighting, sharp focus, 8k photo. IMPORTANT: Absolutely NO text, NO labels, NO words, NO captions, NO banners, clean pure photography only.",
  },
  {
    id: "fem_hair_06_champagne_french_bob",
    name: "Champagne Blonde French Bob & Micro-Bangs",
    gender: "female",
    category: "modern_casual",
    hairColor: "light champagne beige blonde with cool undertones",
    colorFamily: "blonde",
    hairLength: "short",
    hairTexture: "straight",
    prompt:
      "Chic Parisian jawline French bob in light champagne beige blonde with wispy eyebrow-skimming micro-bangs and subtle beveled ends",
    samPrompt: "hair, hairstyle, bob, bangs, fringe, scalp, hairline",
    facePreservePrompt: "face, eyes, eyebrows, nose, mouth, lips, cheeks, chin, jawline",
    imageUrl: "/assets/hairstyles/generic/fem_hair_06_champagne_french_bob.jpg",
    description: "Jawline French bob with textured micro-bangs in luminous champagne blonde.",
    cleanGenPrompt:
      "A professional salon technical 4-panel multi-view hairstyle reference plate showing a women's hairstyle displayed on an invisible 3D ghost mannequin head (NO human eyes, NO nose, NO lips, NO plastic mannequin skin, only the styled floating hair itself). The hairstyle is a chic Parisian jawline French bob with micro-bangs in champagne blonde. The image is divided into 4 clean vertical subpanels side-by-side against a seamless solid green chroma wall studio backdrop (#00FF00 green screen): Panel 1 (left): Full Front View showing blunt jaw-grazing line and textured fringe. Panel 2: Left Side Profile View showing curved chin angle and soft cheek tuck. Panel 3: Rear Back View showing graduated stacked nape curve. Panel 4 (right): Macro close-up of airy feather bangs and silky champagne hair strands. Ultra-photorealistic hair physics, studio rim lighting, sharp focus, 8k photo. IMPORTANT: Absolutely NO text, NO labels, NO words, NO captions, NO banners, clean pure photography only.",
  },
  {
    id: "fem_hair_07_espresso_box_braids",
    name: "Espresso Top-Knot Box Braids with Gold Accents",
    gender: "female",
    category: "textured_curls",
    hairColor: "deep espresso black with metallic gold twine wraps",
    colorFamily: "black",
    hairLength: "updo",
    hairTexture: "braided",
    prompt:
      "Statuesque sculptural high crown bun crafted from waist-length square-parted box braids in rich espresso black with interspersed metallic gold thread wraps",
    samPrompt: "hair, hairstyle, braids, box braids, bun, updo, scalp, parting",
    facePreservePrompt: "face, eyes, eyebrows, nose, mouth, lips, cheeks, chin, jawline",
    imageUrl: "/assets/hairstyles/generic/fem_hair_07_espresso_box_braids.jpg",
    description: "Sculpted high crown bun of neat box braids with metallic gold thread accents.",
    cleanGenPrompt:
      "A professional salon technical 4-panel multi-view hairstyle reference plate showing a women's hairstyle displayed on an invisible 3D ghost mannequin head (NO human eyes, NO nose, NO lips, NO plastic mannequin skin, only the styled floating hair itself). The hairstyle is a sculptural high crown bun of geometric box braids in deep espresso black with gold thread wraps. The image is divided into 4 clean vertical subpanels side-by-side against a seamless solid green chroma wall studio backdrop (#00FF00 green screen): Panel 1 (left): Full Front View showing clean geometric scalp grid parting and towering bun. Panel 2: Left Side Profile View showing sculpted bun height and swooped edge detailing. Panel 3: Rear Back View showing symmetrical triangle partings leading to top knot. Panel 4 (right): Macro close-up of tight 3-strand braid weave, gold metallic twine wraps, and glistening edge pomade. Ultra-photorealistic hair physics, studio rim lighting, sharp focus, 8k photo. IMPORTANT: Absolutely NO text, NO labels, NO words, NO captions, NO banners, clean pure photography only.",
  },
  {
    id: "fem_hair_08_bronze_curly_shag",
    name: "Sunlit Bronze Defined Curly Shag",
    gender: "female",
    category: "textured_curls",
    hairColor: "warm bronze mocha with cinnamon babylights",
    colorFamily: "brunette",
    hairLength: "medium",
    hairTexture: "curly",
    prompt:
      "Voluminous medium-length curly shag haircut in warm bronze mocha, bouncy spring coils, round silhouette, and curly eye-grazing bangs",
    samPrompt: "hair, hairstyle, curls, coils, bangs, scalp, hairline, shag",
    facePreservePrompt: "face, eyes, eyebrows, nose, mouth, lips, cheeks, chin, jawline",
    imageUrl: "/assets/hairstyles/generic/fem_hair_08_bronze_curly_shag.jpg",
    description: "Bouncy 3B/3C defined curly shag with eye-skimming ringlet bangs in warm bronze.",
    cleanGenPrompt:
      "A professional salon technical 4-panel multi-view hairstyle reference plate showing a women's hairstyle displayed on an invisible 3D ghost mannequin head (NO human eyes, NO nose, NO lips, NO plastic mannequin skin, only the styled floating hair itself). The hairstyle is a medium defined curly shag in warm bronze mocha with bouncy corkscrew ringlets. The image is divided into 4 clean vertical subpanels side-by-side against a seamless solid green chroma wall studio backdrop (#00FF00 green screen): Panel 1 (left): Full Front View with bouncy curl fringe and rounded volume. Panel 2: Left Side Profile View showing dimensional curly layers and crown height. Panel 3: Rear Back View showing cascading ringlet canopy over nape. Panel 4 (right): Macro close-up of hydrated high-definition corkscrew spirals with cinnamon highlights. Ultra-photorealistic hair physics, studio rim lighting, sharp focus, 8k photo. IMPORTANT: Absolutely NO text, NO labels, NO words, NO captions, NO banners, clean pure photography only.",
  },

  // ==========================================
  // 👔 MALE HAIRSTYLES (6)
  // ==========================================
  {
    id: "male_hair_01_charcoal_executive_fade",
    name: "Executive Side-Part Low Skin Fade",
    gender: "male",
    category: "executive_sleek",
    hairColor: "charcoal black with subtle natural graying temples",
    colorFamily: "black",
    hairLength: "short",
    hairTexture: "straight",
    prompt:
      "Distinguished executive men's side-part haircut with razor-sharp hard part, comb-over pomade shine, and seamless low skin fade tapering into clean sideburns",
    samPrompt: "hair, hairstyle, fade, side part, scalp, hairline, temples",
    facePreservePrompt: "face, eyes, eyebrows, nose, mouth, lips, cheeks, chin, jawline, beard",
    imageUrl: "/assets/hairstyles/generic/male_hair_01_charcoal_executive_fade.jpg",
    description: "Classic broadcast anchor side-part comb-over with clean low skin fade taper.",
    cleanGenPrompt:
      "A professional salon technical 4-panel multi-view hairstyle reference plate showing a men's hairstyle displayed on an invisible 3D ghost mannequin head (NO human eyes, NO nose, NO lips, NO human skin, NO human face, only the styled floating hair itself against solid green chroma). The hairstyle is an executive side-part comb-over with razor hard part and low skin fade in charcoal black. The image is divided into 4 clean vertical subpanels side-by-side (single horizontal row of 4 equal vertical columns from left to right) against a seamless solid green chroma wall studio backdrop (#00FF00 green screen): Panel 1 (far left column): Full Front View showing crisp razor side part, comb lines, and clean hairline, floating in green space with empty translucent green interior, NO face, NO eyes, NO skin. Panel 2 (second column): Left Side Profile View showing seamless gradient skin fade from temple to ear. Panel 3 (third column): Rear Back View showing squared tapered neckline. Panel 4 (far right column): Macro close-up of pomade texture, comb teeth track marks, and natural charcoal hair strand fibers. Ultra-photorealistic hair physics, studio rim lighting, sharp focus, 8k photo. IMPORTANT: Exactly 4 vertical columns side by side. Absolutely NO text, NO labels, NO words, NO human facial features, NO eyes, NO nose, NO mouth.",
  },
  {
    id: "male_hair_02_honey_pompadour",
    name: "Modern Textured Pompadour with Mid Drop Fade",
    gender: "male",
    category: "broadcast_anchor",
    hairColor: "warm chestnut brown with golden honey quiff highlights",
    colorFamily: "brunette",
    hairLength: "short",
    hairTexture: "straight",
    prompt:
      "Voluminous contemporary men's textured pompadour brushed upward and back, matte clay hold, with mid drop fade and sharp temple line-up",
    samPrompt: "hair, hairstyle, pompadour, quiff, fade, scalp, hairline",
    facePreservePrompt: "face, eyes, eyebrows, nose, mouth, lips, cheeks, chin, jawline, beard",
    imageUrl: "/assets/hairstyles/generic/male_hair_02_honey_pompadour.jpg",
    description: "Textured high-volume pompadour with matte finish and sharp drop fade.",
    cleanGenPrompt:
      "A professional barber technical 4-panel multi-view hairstyle reference plate showing a men's hairstyle displayed on an invisible 3D ghost mannequin head (NO human eyes, NO nose, NO lips, NO plastic mannequin skin, only the styled floating hair itself). The hairstyle is a modern textured pompadour in warm chestnut with mid drop fade. The image is divided into 4 clean vertical subpanels side-by-side against a seamless solid green chroma wall studio backdrop (#00FF00 green screen): Panel 1 (left): Full Front View showing swept-back volume and crisp edge line-up. Panel 2: Left Side Profile View showing arc of the pompadour quiff and dropping fade curve. Panel 3: Rear Back View showing clean rounded taper. Panel 4 (right): Macro close-up of matte clay texture, strand separation, and golden honey highlights. Ultra-photorealistic hair physics, studio rim lighting, sharp focus, 8k photo. IMPORTANT: Absolutely NO text, NO labels, NO words, NO captions, NO banners, clean pure photography only.",
  },
  {
    id: "male_hair_03_slate_quiff",
    name: "Silver Slate Classic Broadcast Quiff",
    gender: "male",
    category: "broadcast_anchor",
    hairColor: "salt and pepper silver slate gray",
    colorFamily: "silver",
    hairLength: "short",
    hairTexture: "straight",
    prompt:
      "Authoritative mature anchor hairstyle with silver slate textured quiff brushed back from forehead, natural scissor-cut sides, and softly blended sideburns",
    samPrompt: "hair, hairstyle, quiff, scalp, hairline, temples",
    facePreservePrompt: "face, eyes, eyebrows, nose, mouth, lips, cheeks, chin, jawline, beard",
    imageUrl: "/assets/hairstyles/generic/male_hair_03_slate_quiff.jpg",
    description: "Distinguished senior correspondent scissor-cut quiff in salt-and-pepper silver.",
    cleanGenPrompt:
      "A professional barber technical 4-panel multi-view hairstyle reference plate showing a men's hairstyle displayed on an invisible 3D ghost mannequin head (NO human eyes, NO nose, NO lips, NO plastic mannequin skin, only the styled floating hair itself). The hairstyle is a silver slate scissor-cut quiff with natural tapered sides. The image is divided into 4 clean vertical subpanels side-by-side against a seamless solid green chroma wall studio backdrop (#00FF00 green screen): Panel 1 (left): Full Front View showing lifted silver quiff and distinguished hairline. Panel 2: Left Side Profile View showing natural scissor-over-comb gradient. Panel 3: Rear Back View showing soft natural tapered neckline. Panel 4 (right): Macro close-up of individual silver and charcoal hair strands with natural matte finish. Ultra-photorealistic hair physics, studio rim lighting, sharp focus, 8k photo. IMPORTANT: Absolutely NO text, NO labels, NO words, NO captions, NO banners, clean pure photography only.",
  },
  {
    id: "male_hair_04_espresso_buzz_cut",
    name: "Crisp Geometric Line-Up High Fade Buzz",
    gender: "male",
    category: "executive_sleek",
    hairColor: "deep raven black",
    colorFamily: "black",
    hairLength: "short",
    hairTexture: "coily",
    prompt:
      "Ultra-clean short #1 buzz cut in deep raven black with laser-straight geometric forehead line-up and high bald skin fade",
    samPrompt: "hair, hairstyle, buzz cut, line up, fade, scalp, hairline",
    facePreservePrompt: "face, eyes, eyebrows, nose, mouth, lips, cheeks, chin, jawline, beard",
    imageUrl: "/assets/hairstyles/generic/male_hair_04_espresso_buzz_cut.jpg",
    description: "Precision razor geometric line-up buzz cut with high skin fade.",
    cleanGenPrompt:
      "A professional barber technical 4-panel multi-view men's hairstyle reference plate showing a short buzz cut hairstyle displayed on a subtle translucent green mannequin head contour against a solid green chroma studio wall (#00FF00 green screen). The hairstyle is a precision geometric line-up high fade buzz cut in deep espresso black with micro texture. The image is divided into exactly 4 clean vertical subpanels side-by-side (1 single horizontal row with 4 equal vertical columns from left to right): Panel 1 (far left column): Full Front View showing razor-sharp horizontal hairline line-up and 90-degree temporal corners, on a subtle translucent green head silhouette, NO human flesh skin, NO eyes, NO nose, NO lips. Panel 2 (second column): Left Side Profile View showing the high skin drop fade and razor-sharp temple arch. Panel 3 (third column): Rear Back View showing seamless high skin fade into nape. Panel 4 (far right column): Macro close-up of dark espresso buzz cut follicle density and laser-straight line-up edge. Ultra-photorealistic hair physics, studio rim lighting separating hair from green screen, sharp 8k focus. IMPORTANT: Exactly 4 vertical columns side by side in a single horizontal row. Absolutely NO text, NO labels, NO words, NO human flesh skin.",
  },
  {
    id: "male_hair_05_caramel_wavy_flow",
    name: "Dark Caramel Medium Scissor Flow",
    gender: "male",
    category: "modern_casual",
    hairColor: "dark caramel brown with sun-bleached amber tips",
    colorFamily: "brunette",
    hairLength: "medium",
    hairTexture: "wavy",
    prompt:
      "Relaxed medium-length men's wavy flow haircut, tucked casually behind the ears, with soft curtain part and natural movement in dark caramel brown",
    samPrompt: "hair, hairstyle, waves, flow, strands, locks, scalp, hairline",
    facePreservePrompt: "face, eyes, eyebrows, nose, mouth, lips, cheeks, chin, jawline, beard",
    imageUrl: "/assets/hairstyles/generic/male_hair_05_caramel_wavy_flow.jpg",
    description: "Effortless medium-length wavy flow tucked behind ears in dark caramel brown.",
    cleanGenPrompt:
      "A professional salon technical 4-panel multi-view hairstyle reference plate showing a men's hairstyle displayed on an invisible 3D ghost mannequin head (NO human eyes, NO nose, NO lips, NO plastic mannequin skin, only the styled floating hair itself). The hairstyle is a relaxed medium wavy flow in dark caramel brown. The image is divided into 4 clean vertical subpanels side-by-side against a seamless solid green chroma wall studio backdrop (#00FF00 green screen): Panel 1 (left): Full Front View showing loose curtain parting and hair tucked behind ears. Panel 2: Left Side Profile View showing relaxed collar-length waves. Panel 3: Rear Back View showing soft layered drape across upper neck. Panel 4 (right): Macro close-up of loose wave texture, amber tips, and healthy natural hair sheen. Ultra-photorealistic hair physics, studio rim lighting, sharp focus, 8k photo. IMPORTANT: Absolutely NO text, NO labels, NO words, NO captions, NO banners, clean pure photography only.",
  },
  {
    id: "male_hair_06_raven_slicked_back",
    name: "Classic Italian Gloss Slicked-Back Undercut",
    gender: "male",
    category: "executive_sleek",
    hairColor: "jet raven black with high-shine pomade gloss",
    colorFamily: "black",
    hairLength: "short",
    hairTexture: "straight",
    prompt:
      "Commanding classic Italian slicked-back hairstyle with disconnected undercut sides, high-shine water-based pomade, and combed-back crown volume",
    samPrompt: "hair, hairstyle, slicked back, undercut, scalp, hairline",
    facePreservePrompt: "face, eyes, eyebrows, nose, mouth, lips, cheeks, chin, jawline, beard",
    imageUrl: "/assets/hairstyles/generic/male_hair_06_raven_slicked_back.jpg",
    description: "High-shine Italian slicked-back comb with disconnected undercut in jet black.",
    cleanGenPrompt:
      "A professional barber technical 4-panel multi-view hairstyle reference plate showing a men's hairstyle displayed on an invisible 3D ghost mannequin head (NO human eyes, NO nose, NO lips, NO plastic mannequin skin, only the styled floating hair itself). The hairstyle is a high-shine slicked-back undercut in jet raven black. The image is divided into 4 clean vertical subpanels side-by-side against a seamless solid green chroma wall studio backdrop (#00FF00 green screen): Panel 1 (left): Full Front View showing sleek combed-back hairline and refined temple line. Panel 2: Left Side Profile View showing sharp disconnected undercut line and backward flow. Panel 3: Rear Back View showing tight shaved back with sleek top overhang. Panel 4 (right): Macro close-up of comb ridges in glistening pomade and deep black luster. Ultra-photorealistic hair physics, studio rim lighting, sharp focus, 8k photo. IMPORTANT: Absolutely NO text, NO labels, NO words, NO captions, NO banners, clean pure photography only.",
  },

  // ==========================================
  // 🧥 UNISEX HAIRSTYLES (4)
  // ==========================================
  {
    id: "uni_hair_01_platinum_cyber_undercut",
    name: "Platinum Ice Cyberpunk Disconnected Undercut",
    gender: "unisex",
    category: "bold_avantgarde",
    hairColor: "pure icy platinum white",
    colorFamily: "platinum",
    hairLength: "short",
    hairTexture: "straight",
    prompt:
      "Futuristic gender-neutral disconnected undercut with textured platinum ice fringe swept forward and micro-clipped dark shadow root fade",
    samPrompt: "hair, hairstyle, undercut, fringe, scalp, hairline",
    facePreservePrompt: "face, eyes, eyebrows, nose, mouth, lips, cheeks, chin, jawline",
    imageUrl: "/assets/hairstyles/generic/uni_hair_01_platinum_cyber_undercut.jpg",
    description: "Edgy cyber-inspired platinum undercut with forward textured fringe.",
    cleanGenPrompt:
      "A professional salon technical 4-panel multi-view hairstyle reference plate showing a unisex hairstyle displayed on an invisible 3D ghost mannequin head (NO human eyes, NO nose, NO lips, NO plastic mannequin skin, only the styled floating hair itself). The hairstyle is a cyberpunk platinum ice undercut with forward fringe. The image is divided into 4 clean vertical subpanels side-by-side against a seamless solid green chroma wall studio backdrop (#00FF00 green screen): Panel 1 (left): Full Front View showing textured jagged bangs and sharp shadow-root temples. Panel 2: Left Side Profile View showing extreme disconnected buzz fade below long platinum top. Panel 3: Rear Back View showing clean vertical neckline fade. Panel 4 (right): Macro close-up of icy white hair cuticles and textured clay separation. Ultra-photorealistic hair physics, studio rim lighting, sharp focus, 8k photo. IMPORTANT: Absolutely NO text, NO labels, NO words, NO captions, NO banners, clean pure photography only.",
  },
  {
    id: "uni_hair_02_jet_black_wolf_cut",
    name: "Tokyo Shaggy Layered Wolf Cut",
    gender: "unisex",
    category: "modern_casual",
    hairColor: "soft midnight black with subtle graphite highlights",
    colorFamily: "black",
    hairLength: "medium",
    hairTexture: "wavy",
    prompt:
      "Trendy unisex Tokyo shaggy wolf cut with choppy razored crown layers, wispy curtain bangs, and feathered neck-length mullet-inspired drape",
    samPrompt: "hair, hairstyle, wolf cut, bangs, layers, strands, locks, scalp, hairline",
    facePreservePrompt: "face, eyes, eyebrows, nose, mouth, lips, cheeks, chin, jawline",
    imageUrl: "/assets/hairstyles/generic/uni_hair_02_jet_black_wolf_cut.jpg",
    description: "Layered Tokyo wolf cut with wispy curtain bangs and choppy textured volume.",
    cleanGenPrompt:
      "A professional salon technical 4-panel multi-view hairstyle reference plate showing a unisex hairstyle displayed on a subtle translucent green mannequin head contour against a solid green chroma studio wall (#00FF00 green screen). The hairstyle is a modern Tokyo shaggy wolf cut in jet black with razor-textured choppy layers, wispy curtain bangs, and feathered mullet nape length. The image is divided into exactly 4 clean vertical subpanels side-by-side (1 single horizontal row with 4 equal vertical columns from left to right): Panel 1 (far left column): Full Front View showing choppy curtain bangs and face-framing shaggy layers on a subtle green mannequin contour, NO human face. Panel 2 (second column): Left Side Profile View showing progressive tiered choppy layers and ear clearance. Panel 3 (third column): Rear Back View showing tiered feathered volume cascading down the neck. Panel 4 (far right column): Macro close-up of razor-feathered hair tips, texture separation, and glossy raven-black sheen. Ultra-photorealistic hair physics, studio rim lighting separating hair from green screen, sharp 8k focus. IMPORTANT: Absolutely NO text, NO labels, NO words, NO subtitles, NO captions at the bottom or anywhere in the image. Pure photography only.",
  },
  {
    id: "uni_hair_03_golden_afro_coils",
    name: "Spherical Golden Honey Afro Coils",
    gender: "unisex",
    category: "textured_curls",
    hairColor: "rich dark espresso base with sunlit golden honey glazed tips",
    colorFamily: "brunette",
    hairLength: "medium",
    hairTexture: "coily",
    prompt:
      "Perfect symmetrical spherical afro halo of tight 4A/4B spring coils with dimensional golden honey halo tipping and clean shape definition",
    samPrompt: "hair, hairstyle, afro, coils, curls, scalp, hairline",
    facePreservePrompt: "face, eyes, eyebrows, nose, mouth, lips, cheeks, chin, jawline",
    imageUrl: "/assets/hairstyles/generic/uni_hair_03_golden_afro_coils.jpg",
    description: "Sculpted spherical afro halo with high-definition coils and golden honey tips.",
    cleanGenPrompt:
      "A professional salon technical 4-panel multi-view hairstyle reference plate showing a unisex hairstyle displayed on a subtle translucent green mannequin head contour against a solid green chroma studio wall (#00FF00 green screen). The hairstyle is spherical golden honey afro coils with defined 4A/4B corkscrew coil texture in rich amber brunette with honey highlights. The image is divided into exactly 4 clean vertical subpanels side-by-side (1 single horizontal row with 4 equal vertical columns from left to right): Panel 1 (far left column): Full Front View of the rounded golden afro coils framing the forehead with subtle green mannequin contour, NO human face. Panel 2 (second column): Left Side Profile View showing the spherical coil volume and temple ear line. Panel 3 (third column): Rear Back View showing the full rounded crown volume and clean back taper. Panel 4 (far right column): Macro close-up of hydrated golden-honey corkscrew ringlets, moisture sheen, and coiled texture fibers. Ultra-photorealistic hair physics, studio rim lighting separating hair from green screen, sharp 8k focus. IMPORTANT: Exactly 4 vertical columns side by side in a single horizontal row, NOT 2 rows, NOT multiple rows. Absolutely NO text, NO labels, NO words, NO captions.",
  },
  {
    id: "uni_hair_04_chestnut_top_knot",
    name: "Samurai Sleek Top Knot & Razor Undercut",
    gender: "unisex",
    category: "editorial_gala",
    hairColor: "deep chestnut brown with warm mahogany undertones",
    colorFamily: "brunette",
    hairLength: "updo",
    hairTexture: "straight",
    prompt:
      "Traditional meets modern sleek samurai top knot looped tightly on the crown with clean razor-shaved undercut temples and nape",
    samPrompt: "hair, hairstyle, top knot, bun, undercut, scalp, hairline",
    facePreservePrompt: "face, eyes, eyebrows, nose, mouth, lips, cheeks, chin, jawline",
    imageUrl: "/assets/hairstyles/generic/uni_hair_04_chestnut_top_knot.jpg",
    description: "Sleek crown top knot with clean razor-shaved undercut in deep chestnut.",
    cleanGenPrompt:
      "A professional salon technical 4-panel multi-view hairstyle reference plate showing a unisex hairstyle displayed on an invisible 3D ghost mannequin head (NO human eyes, NO nose, NO lips, NO plastic mannequin skin, only the styled floating hair itself). The hairstyle is a sleek samurai top knot in deep chestnut with razor undercut. The image is divided into 4 clean vertical subpanels side-by-side against a seamless solid green chroma wall studio backdrop (#00FF00 green screen): Panel 1 (left): Full Front View showing taut pulled-back hairline and top knot loop. Panel 2: Left Side Profile View showing high-contrast sharp undercut border. Panel 3: Rear Back View showing razor-clean back nape leading to top knot gathering. Panel 4 (right): Macro close-up of taut hair tension, hair tie knot, and polished chestnut luster. Ultra-photorealistic hair physics, studio rim lighting, sharp focus, 8k photo. IMPORTANT: Absolutely NO text, NO labels, NO words, NO captions, NO banners, clean pure photography only.",
  },
];

/**
 * Find a hairstyle item by ID with fallback.
 */
export function getHairstyleById(id: string): HairStyleItem | undefined {
  return HAIR_CATALOG.find((h) => h.id === id);
}

/**
 * Filter hairstyles by gender suitability.
 */
export function getHairstylesByGender(gender: HairGender | "all" | "auto", personaGender?: string): HairStyleItem[] {
  if (gender === "all") return HAIR_CATALOG;
  const target = gender === "auto" ? (personaGender || "female") : gender;
  return HAIR_CATALOG.filter((h) => h.gender === target || h.gender === "unisex");
}

/**
 * Filter hairstyles by color family.
 */
export function getHairstylesByColorFamily(family: HairColorFamily | "all"): HairStyleItem[] {
  if (family === "all") return HAIR_CATALOG;
  return HAIR_CATALOG.filter((h) => h.colorFamily === family);
}

/**
 * Retrieve a specific hair color swatch by ID.
 */
export function getColorSwatchById(id: string): HairColorSwatch | undefined {
  return HAIR_COLOR_SWATCHES.find((s) => s.id === id);
}

/**
 * Strips color prefixes to return the pure structural haircut name.
 */
export function getHairstyleCutName(hair: HairStyleItem): string {
  const colorPrefixes = [
    /^Honey Blonde\s+/i,
    /^Midnight Raven\s+/i,
    /^Caramel Chestnut\s+/i,
    /^Platinum Ice\s+/i,
    /^Vibrant Copper\s+/i,
    /^Champagne Blonde\s+/i,
    /^Espresso\s+/i,
    /^Bronze Mocha\s+/i,
    /^Charcoal\s+/i,
    /^Slate Gray\s+/i,
    /^Warm Chestnut\s+/i,
    /^Dark Espresso\s+/i,
    /^Cyber Silver\s+/i,
    /^Smoky Obsidian\s+/i,
    /^Golden Honey\s+/i,
    /^Bronze Roast\s+/i,
  ];

  let cutName = hair.name;
  for (const regex of colorPrefixes) {
    cutName = cutName.replace(regex, "");
  }
  return cutName.trim();
}

/**
 * Returns a CSS background string for swatch badges (supports linear-gradients for dual-tones).
 */
export function getSwatchCssBackground(swatch?: HairColorSwatch | null): string {
  if (!swatch) {
    return "transparent";
  }
  if (swatch.isDualTone && swatch.rootTone && swatch.tipTone) {
    switch (swatch.technique) {
      case "ombre":
        return `linear-gradient(180deg, ${swatch.rootTone.hex} 0%, ${swatch.rootTone.hex} 35%, ${swatch.tipTone.hex} 80%, ${swatch.tipTone.hex} 100%)`;
      case "shadow_root":
        return `linear-gradient(180deg, ${swatch.rootTone.hex} 0%, ${swatch.rootTone.hex} 20%, ${swatch.tipTone.hex} 50%, ${swatch.tipTone.hex} 100%)`;
      case "money_piece":
        return `linear-gradient(90deg, ${swatch.tipTone.hex} 0%, ${swatch.tipTone.hex} 30%, ${swatch.rootTone.hex} 35%, ${swatch.rootTone.hex} 100%)`;
      case "highlights":
        return `repeating-linear-gradient(90deg, ${swatch.rootTone.hex} 0px, ${swatch.rootTone.hex} 8px, ${swatch.tipTone.hex} 8px, ${swatch.tipTone.hex} 14px)`;
      case "balayage":
      default:
        return `linear-gradient(135deg, ${swatch.rootTone.hex} 0%, ${swatch.rootTone.hex} 40%, ${swatch.tipTone.hex} 75%, ${swatch.tipTone.hex} 100%)`;
    }
  }
  return swatch.hex || "transparent";
}

/**
 * Compiles an executive salon formula badge description for UI display and inpainting metadata.
 */
export function compileSalonFormulaBadge(swatch?: HairColorSwatch | null): string {
  if (!swatch) {
    return "Salon Formula: Natural Stock Hairstyle";
  }
  if (!swatch.isDualTone || swatch.technique === "solid" || !swatch.technique) {
    return `Salon Formula: Solid ${swatch.name || "Dye"}`;
  }

  const rootName = swatch.rootTone?.name || "Root Tone";
  const tipName = swatch.tipTone?.name || "Tip Tone";
  const dimensionPrefix =
    swatch.dimension === "subtle"
      ? "Soft"
      : swatch.dimension === "bold"
      ? "High-Contrast"
      : "Dimensional";

  switch (swatch.technique) {
    case "balayage":
      return `Salon Formula: ${dimensionPrefix} Balayage with ${rootName} Root & ${tipName} Tips`;
    case "ombre":
      return `Salon Formula: ${dimensionPrefix} Ombré from ${rootName} Root to ${tipName} Ends`;
    case "highlights":
      return `Salon Formula: ${dimensionPrefix} Highlights with ${rootName} Base & ${tipName} Ribbons`;
    case "money_piece":
      return `Salon Formula: ${dimensionPrefix} Money Piece with ${rootName} Base & ${tipName} Face Frames`;
    case "shadow_root":
      return `Salon Formula: ${dimensionPrefix} Shadow Root with ${rootName} Melt & ${tipName} Lengths`;
    default:
      return `Salon Formula: ${dimensionPrefix} ${swatch.name || "Custom Dual-Tone"}`;
  }
}

/**
 * Compiles negative prompt tokens specifically engineered to prevent salon coloring artifacts:
 * Color banding, harsh demarcation lines, muddy saturation, patchy bleach spots, and zebra-striping.
 */
export function compileSalonNegativePrompt(swatch?: HairColorSwatch | null): string {
  const baseNegatives = [
    "color banding",
    "harsh demarcation lines",
    "muddy saturation",
    "patchy bleach spots",
    "unnatural stripe artifacts",
    "zebra stripe hair",
    "discolored hair bleed",
    "blocky hair color transition",
    "patchy hair color",
    "uneven dye spots",
  ];

  if (!swatch?.isDualTone || swatch.technique === "solid" || !swatch.technique) {
    return baseNegatives.join(", ");
  }

  const techniqueNegatives: string[] = [];
  if (swatch.technique === "balayage" || swatch.technique === "ombre") {
    techniqueNegatives.push(
      "hard horizontal cut line",
      "abrupt color break",
      "dip-dye line",
      "uneven saturation blotches",
      "sharp color boundary"
    );
  } else if (swatch.technique === "highlights" || swatch.technique === "money_piece") {
    techniqueNegatives.push(
      "chunky skunk stripes",
      "bleach bleeding onto roots",
      "unblended foil streaks",
      "asymmetrical blotchy highlights"
    );
  } else if (swatch.technique === "shadow_root") {
    techniqueNegatives.push(
      "overgrown dark root line",
      "uneven regrowth line",
      "harsh root boundary",
      "jagged dark scalp crown line"
    );
  }

  return [...baseNegatives, ...techniqueNegatives].join(", ");
}

/**
 * Compiles a rich salon-grade prompt modifier for custom dual-tone specifications.
 */
export function compileHairColorPromptModifier(params: {
  technique: HairColorTechnique;
  dimension: HairColorDimension;
  rootTone: HairToneSpec;
  tipTone: HairToneSpec;
}): string {
  const { technique, dimension, rootTone, tipTone } = params;
  const intensityClause =
    dimension === "subtle"
      ? "soft, whisper-delicate tonal gradation with subtle contrast"
      : dimension === "bold"
      ? "vibrant high-contrast editorial demarcation with bold tonal drama"
      : "natural salon-balanced multi-dimensional contrast";

  switch (technique) {
    case "balayage":
      return `hand-painted ${tipTone.name} (${tipTone.hex}) balayage ribbons painted organically over a rich ${rootTone.name} (${rootTone.hex}) root melt, seamless micro-gradation, luminous hair fiber luster, and ${intensityClause}`;
    case "ombre":
      return `seamless horizontal gradient ombré transitioning softly from ${rootTone.name} (${rootTone.hex}) roots through mid-lengths into vivid ${tipTone.name} (${tipTone.hex}) tips, smooth tonal diffusion with ${intensityClause}`;
    case "highlights":
      return `multi-dimensional salon foil-woven highlights with fine ${tipTone.name} (${tipTone.hex}) ribbons distributed evenly throughout a ${rootTone.name} (${rootTone.hex}) base, high-luster reflective sheen and ${intensityClause}`;
    case "money_piece":
      return `striking ${tipTone.name} (${tipTone.hex}) face-framing money piece ribbons framing the face, contrasted against a deep ${rootTone.name} (${rootTone.hex}) foundational base with clean salon foil placement and ${intensityClause}`;
    case "shadow_root":
      return `modern salon shadow root with smoky ${rootTone.name} (${rootTone.hex}) melt fading seamlessly into radiant ${tipTone.name} (${tipTone.hex}) mid-lengths and ends, soft organic root blur and ${intensityClause}`;
    case "solid":
    default:
      return `pure uniform ${rootTone.name} (${rootTone.hex}) salon dye with glossy reflective luster and rich single-process depth`;
  }
}

/**
 * Constructs a custom dual-tone HairColorSwatch from user-selected tones and salon technique.
 */
export function createCustomDualToneSwatch(params: {
  technique: HairColorTechnique;
  dimension: HairColorDimension;
  rootTone: HairToneSpec;
  tipTone: HairToneSpec;
  id?: string;
  name?: string;
  family?: HairColorFamily;
}): HairColorSwatch {
  const { technique, dimension, rootTone, tipTone } = params;
  const normalizeHex = (rawHex: string): string => {
    const trimmed = (rawHex || "#000000").trim();
    const withHash = trimmed.startsWith("#") ? trimmed : `#${trimmed}`;
    return withHash.toUpperCase();
  };

  const normalizedRootTone: HairToneSpec = {
    ...rootTone,
    hex: normalizeHex(rootTone.hex),
  };
  const normalizedTipTone: HairToneSpec = {
    ...tipTone,
    hex: normalizeHex(tipTone.hex),
  };

  const id = params.id || `custom_${technique}_${Date.now()}`;
  const techLabel =
    technique === "balayage"
      ? "Balayage"
      : technique === "ombre"
      ? "Ombré"
      : technique === "highlights"
      ? "Highlights"
      : technique === "money_piece"
      ? "Money Piece"
      : technique === "shadow_root"
      ? "Shadow Root"
      : "Solid";

  const name = params.name || `${normalizedRootTone.name} to ${normalizedTipTone.name} ${techLabel}`;
  const promptModifier = compileHairColorPromptModifier({
    technique,
    dimension,
    rootTone: normalizedRootTone,
    tipTone: normalizedTipTone,
  });
  const formula = compileSalonFormulaBadge({
    id,
    name,
    family: params.family || "brunette",
    hex: normalizedRootTone.hex,
    promptModifier,
    description: "",
    rootTone: normalizedRootTone,
    tipTone: normalizedTipTone,
    technique,
    dimension,
    isDualTone: technique !== "solid",
  });

  return {
    id,
    name,
    family: params.family || "brunette",
    hex: normalizedRootTone.hex,
    promptModifier,
    description: `${formula}. Hand-formulated salon custom dual-tone specification.`,
    rootTone: normalizedRootTone,
    tipTone: normalizedTipTone,
    technique,
    dimension,
    isDualTone: technique !== "solid",
  };
}

/**
 * Formats a hairstyle item with an optional dynamic color swatch.
 * Resolves title, description, and prompt modifier without color token clashes.
 * Phase 3: Supports dual-tone swatches, salon formulas, and anti-banding negative prompts.
 */
export function formatHairstyleWithSwatch(
  hair: HairStyleItem,
  swatch?: HairColorSwatch | null
): {
  displayName: string;
  displayDescription: string;
  promptModifier: string;
  resolvedPrompt: string;
  salonFormula?: string;
  negativePrompt?: string;
  technique?: HairColorTechnique;
} {
  const cutName = getHairstyleCutName(hair);
  if (!swatch) {
    return {
      displayName: hair.name,
      displayDescription: hair.description,
      promptModifier: hair.hairColor,
      resolvedPrompt: `${hair.prompt} (hair color: ${hair.hairColor})`,
      salonFormula: undefined,
      negativePrompt: undefined,
      technique: "solid",
    };
  }

  const formulaBadge = compileSalonFormulaBadge(swatch);
  const negativeTokens = compileSalonNegativePrompt(swatch);

  const displayName = `${swatch.name} ${cutName}`;
  const displayDescription = swatch.isDualTone
    ? `${cutName} styled with ${formulaBadge} (${swatch.promptModifier}). ${hair.description}`
    : `${cutName} dyed in ${swatch.name} (${swatch.promptModifier}). ${hair.description}`;
  const promptModifier = swatch.promptModifier;

  let basePrompt = hair.prompt;
  const colorAdjectives = [
    /\bin\s+(rich\s+)?(warm\s+)?honey\s+blonde(\s+with\s+[a-z\s]+)?/gi,
    /\bin\s+glossy\s+jet\s+raven\s+black(\s+with\s+[a-z\s]+)?/gi,
    /\bin\s+(rich\s+)?caramel\s+chestnut/gi,
    /\bin\s+icy\s+platinum\s+blonde/gi,
    /\bin\s+(fiery\s+)?copper\s+red(\s+with\s+[a-z\s]+)?/gi,
    /\bin\s+light\s+champagne\s+beige\s+blonde/gi,
    /\bin\s+deep\s+espresso\s+black/gi,
    /\bin\s+dimensional\s+bronze\s+mocha/gi,
    /\bin\s+charcoal\s+black-brown/gi,
    /\bin\s+distinguished\s+slate\s+gray/gi,
    /\bin\s+deep\s+chestnut/gi,
  ];

  for (const regex of colorAdjectives) {
    basePrompt = basePrompt.replace(regex, "");
  }

  const resolvedPrompt = swatch.isDualTone
    ? `${basePrompt.trim()} styled with salon-grade ${swatch.promptModifier}, seamless root-to-tip micro-gradation, overriding reference picture color with pure ${swatch.name}`
    : `${basePrompt.trim()} dyed in vivid ${swatch.promptModifier}, overriding reference picture color with pure ${swatch.name}`;

  return {
    displayName,
    displayDescription,
    promptModifier,
    resolvedPrompt,
    salonFormula: formulaBadge,
    negativePrompt: negativeTokens,
    technique: swatch.technique || "solid",
  };
}
