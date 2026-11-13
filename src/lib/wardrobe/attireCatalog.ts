/**
 * Comprehensive 60-Attire Wardrobe Catalog for NewsStudio (20 Female, 20 Male, 20 Unisex)
 * Multi-view 4-panel generic plates on pure green chroma wall (#00FF00)
 * Clean ghost-mannequin photography with zero text / banners.
 */

export type AttireGender = "female" | "male" | "unisex";

export type AttireCategory =
  | "broadcast"
  | "gala"
  | "edgy"
  | "casual"
  | "techwear"
  | "executive";

export interface AttireItem {
  id: string;
  name: string;
  gender: AttireGender;
  category: AttireCategory;
  prompt: string;
  samPrompt: string;
  imageUrl: string;
  description: string;
  cleanGenPrompt: string;
}

export const ATTIRE_CATALOG_60: AttireItem[] = [
  // ==========================================
  // 🎙️ FEMALE ATTIRES (20)
  // ==========================================
  {
    id: "fem_01_crimson_sheath",
    name: "Crimson Red Asymmetric Sheath",
    gender: "female",
    category: "broadcast",
    prompt:
      "Structured crimson-red tailored crepe sheath dress with architectural asymmetric neckline and polished gold waist buckle",
    samPrompt: "clothing, dress, sheath dress, belt",
    imageUrl: "/assets/wardrobe/generic/fem_01_crimson_sheath.jpg",
    description: "Architectural neckline, body-sculpted crepe weave with gold buckle accent.",
    cleanGenPrompt:
      "A professional fashion multi-view technical reference plate showing a women's dress displayed on an invisible 3D ghost mannequin (NO human head, NO face, NO plastic mannequin skin, only the tailored floating clothing itself). The image is divided into 4 clean vertical subpanels side-by-side against a seamless solid green chroma wall studio backdrop (#00FF00 green screen): Panel 1 (left): Full Front View of a structured crimson-red tailored crepe sheath dress with architectural asymmetric neckline and gold waist buckle. Panel 2: Left Side Profile View showing the sleek tailored silhouette. Panel 3: Rear Back View showing the clean back zipper and darts. Panel 4 (right): Detailed macro close-up of the gold waist buckle, fabric crepe weave, and matching gold cuff bracelet. Ultra-photorealistic fabric textures, studio lighting with crisp rim light separating the clothing from the green screen, commercial catalog quality, sharp focus. IMPORTANT: Absolutely NO text, NO labels, NO words, NO captions, NO banners, clean pure photography only.",
  },
  {
    id: "fem_02_cobalt_sweetheart",
    name: "Royal Cobalt Blue Sweetheart Gown",
    gender: "female",
    category: "gala",
    prompt:
      "Form-fitting royal cobalt blue sweetheart neckline evening gown with delicate gold chain belt and fluid drape",
    samPrompt: "clothing, dress, evening gown, belt",
    imageUrl: "/assets/wardrobe/generic/fem_02_cobalt_sweetheart.jpg",
    description: "Regal cobalt blue evening gown with sweetheart bodice and delicate chain accent.",
    cleanGenPrompt:
      "A professional fashion multi-view technical reference plate showing a women's evening gown displayed on an invisible 3D ghost mannequin (NO human head, NO face, NO plastic mannequin skin, only the tailored floating clothing itself). The image is divided into 4 clean vertical subpanels side-by-side against a seamless solid green chroma wall studio backdrop (#00FF00 green screen): Panel 1 (left): Full Front View of a royal cobalt blue sweetheart neckline floor-length evening gown with a delicate gold chain belt. Panel 2: Left Side Profile View showing the slender evening gown silhouette. Panel 3: Rear Back View showing the elegant back neckline and fluid skirt drape. Panel 4 (right): Detailed macro close-up of the gold chain links, bodice stitching, and royal blue silk crepe weave. Ultra-photorealistic fabric textures, studio lighting with crisp rim light separating the clothing from the green screen, commercial catalog quality, sharp focus. IMPORTANT: Absolutely NO text, NO labels, NO words, NO captions, NO banners, clean pure photography only.",
  },
  {
    id: "fem_03_emerald_satin_wrap",
    name: "Emerald Green Satin Wrap Dress",
    gender: "female",
    category: "broadcast",
    prompt:
      "Flowing emerald green liquid satin wrap dress with subtle v-neck, gold belt cinch, and fluid elegant drape",
    samPrompt: "clothing, dress, wrap dress, satin dress, belt",
    imageUrl: "/assets/wardrobe/generic/fem_03_emerald_satin_wrap.jpg",
    description: "Lustrous emerald green liquid satin with flattering crossover wrap and gold accent.",
    cleanGenPrompt:
      "A professional fashion multi-view technical reference plate showing a women's wrap dress displayed on an invisible 3D ghost mannequin (NO human head, NO face, NO plastic mannequin skin, only the tailored floating clothing itself). The image is divided into 4 clean vertical subpanels side-by-side against a seamless solid green chroma wall studio backdrop (#00FF00 green screen): Panel 1 (left): Full Front View of a flowing emerald green liquid satin crossover wrap dress with gold belt cinch. Panel 2: Left Side Profile View showing fluid liquid satin drape. Panel 3: Rear Back View showing the gathered shoulder yoke and smooth satin back. Panel 4 (right): Detailed macro close-up of the liquid satin sheen, tie knot, and gold cinch hardware. Ultra-photorealistic fabric textures, studio lighting with crisp rim light separating the clothing from the green screen, commercial catalog quality, sharp focus. IMPORTANT: Absolutely NO text, NO labels, NO words, NO captions, NO banners, clean pure photography only.",
  },
  {
    id: "fem_04_prime_executive_blazer",
    name: "Executive Navy Double-Breasted Pantsuit",
    gender: "female",
    category: "broadcast",
    prompt:
      "Structured double-breasted navy blue wool crepe blazer with peaked lapels, gold crest buttons, crisp white silk camisole, and matching tailored navy blue straight-leg trousers",
    samPrompt: "clothing, suit, blazer, jacket, camisole, trousers, pants, buttons",
    imageUrl: "/assets/wardrobe/generic/fem_04_prime_executive_blazer.jpg",
    description: "Prime-time broadcast authority navy wool crepe double-breasted blazer suit with matching trousers.",
    cleanGenPrompt:
      "A professional fashion multi-view technical reference plate showing a women's executive pantsuit displayed on an invisible 3D ghost mannequin (NO human head, NO face, NO plastic mannequin skin, only the tailored floating clothing itself). The outfit is whole and complete with both top and bottom garments: tailored double-breasted navy blue wool crepe blazer with peak lapels, gold crest buttons, white silk camisole, and matching tailored navy wool straight-leg trousers. The image is divided into 4 clean vertical subpanels side-by-side against a seamless solid green chroma wall studio backdrop (#00FF00 green screen): Panel 1 (left): Full Front View of the complete navy pantsuit with blazer, camisole, and straight trousers. Panel 2: Left Side Profile View showing tailored waist taper and crisp trouser crease. Panel 3: Rear Back View showing dual blazer side vents and clean trouser back seat. Panel 4 (right): Single seamless vertical macro close-up of embossed gold crest buttons and navy wool crepe twill weave. Ultra-photorealistic fabric textures, studio lighting with crisp rim light separating the clothing from the green screen, commercial catalog quality, sharp focus. IMPORTANT: Absolutely NO text, NO labels, NO numbers, NO words, NO captions, NO banners, clean pure photography only.",
  },
  {
    id: "fem_05_ivory_peplum_suit",
    name: "Ivory Crepe Peplum & Pencil Skirt Suit",
    gender: "female",
    category: "executive",
    prompt:
      "Tailored ivory white crepe peplum jacket with slender waist belt and matching knee-length pencil skirt",
    samPrompt: "clothing, suit, jacket, peplum, skirt",
    imageUrl: "/assets/wardrobe/generic/fem_05_ivory_peplum_suit.jpg",
    description: "Statuesque executive silhouette in ivory crepe with architectural peplum flare.",
    cleanGenPrompt:
      "A professional fashion multi-view technical reference plate showing a women's peplum suit displayed on an invisible 3D ghost mannequin (NO human head, NO face, NO plastic mannequin skin, only the tailored floating clothing itself). The image is divided into 4 clean vertical subpanels side-by-side against a seamless solid green chroma wall studio backdrop (#00FF00 green screen): Panel 1 (left): Full Front View of a tailored ivory white crepe peplum jacket with slender belt and matching knee-length pencil skirt. Panel 2: Left Side Profile View showing sculpted peplum waist flare. Panel 3: Rear Back View showing tailored spine seam and skirt kick pleat. Panel 4 (right): Detailed macro close-up of mother-of-pearl buttons and crisp matte ivory crepe weave. Ultra-photorealistic fabric textures, studio lighting with crisp rim light separating the clothing from the green screen, commercial catalog quality, sharp focus. IMPORTANT: Absolutely NO text, NO labels, NO words, NO captions, NO banners, clean pure photography only.",
  },
  {
    id: "fem_06_plum_velvet_sheath",
    name: "Deep Plum Velvet Cocktail Sheath",
    gender: "female",
    category: "gala",
    prompt:
      "Luxe deep plum burgundy velvet cocktail sheath dress with structured square neckline and subtle side slit",
    samPrompt: "clothing, dress, velvet dress, sheath",
    imageUrl: "/assets/wardrobe/generic/fem_06_plum_velvet_sheath.jpg",
    description: "Rich jewel-toned velvet with architectural square neckline and luminous nap.",
    cleanGenPrompt:
      "A professional fashion multi-view technical reference plate showing a women's velvet dress displayed on an invisible 3D ghost mannequin (NO human head, NO face, NO plastic mannequin skin, only the tailored floating clothing itself). The image is divided into 4 clean vertical subpanels side-by-side against a seamless solid green chroma wall studio backdrop (#00FF00 green screen): Panel 1 (left): Full Front View of a rich deep plum velvet sheath dress with architectural square neckline. Panel 2: Left Side Profile View showing fitted silhouette and clean side seam. Panel 3: Rear Back View showing elegant low back cut and hidden zipper. Panel 4 (right): Detailed macro close-up of the luminous velvet pile reflections and seam finish. Ultra-photorealistic fabric textures, studio lighting with crisp rim light separating the clothing from the green screen, commercial catalog quality, sharp focus. IMPORTANT: Absolutely NO text, NO labels, NO words, NO captions, NO banners, clean pure photography only.",
  },
  {
    id: "fem_07_pastel_rose_pantsuit",
    name: "Pastel Rose Pink Peak-Lapel Pantsuit",
    gender: "female",
    category: "executive",
    prompt:
      "Contemporary pastel blush rose pink tailored pantsuit with wide peak lapels, horn buttons, and straight-leg trousers",
    samPrompt: "clothing, suit, blazer, trousers, jacket",
    imageUrl: "/assets/wardrobe/generic/fem_07_pastel_rose_pantsuit.jpg",
    description: "Modern power tailoring in soft blush rose wool-silk blend.",
    cleanGenPrompt:
      "A professional fashion multi-view technical reference plate showing a women's tailored pantsuit displayed on an invisible 3D ghost mannequin (NO human head, NO face, NO plastic mannequin skin, only the tailored floating clothing itself). The image is divided into 4 clean vertical subpanels side-by-side against a seamless solid green chroma wall studio backdrop (#00FF00 green screen): Panel 1 (left): Full Front View of a double-breasted pastel blush rose pink wool-silk blazer and matching straight-leg trousers. Panel 2: Left Side Profile View showing sharp trouser crease and jacket drape. Panel 3: Rear Back View showing dual vents and clean shoulder slope. Panel 4 (right): Detailed macro close-up of blonde horn buttons, fine twill weave, and silk lapel roll. Ultra-photorealistic fabric textures, studio lighting with crisp rim light separating the clothing from the green screen, commercial catalog quality, sharp focus. IMPORTANT: Absolutely NO text, NO labels, NO words, NO captions, NO banners, clean pure photography only.",
  },
  {
    id: "fem_08_sapphire_keyhole_dress",
    name: "Sapphire Blue Column Keyhole Dress",
    gender: "female",
    category: "broadcast",
    prompt:
      "Tailored sapphire blue long-sleeve crepe column dress with an elegant geometric teardrop keyhole neckline and gold cuff detail",
    samPrompt: "clothing, dress, column dress, keyhole dress",
    imageUrl: "/assets/wardrobe/generic/fem_08_sapphire_keyhole_dress.jpg",
    description: "High-definition broadcast blue with architectural teardrop keyhole detail.",
    cleanGenPrompt:
      "A professional fashion multi-view technical reference plate showing a women's column dress displayed on an invisible 3D ghost mannequin (NO human head, NO face, NO plastic mannequin skin, only the tailored floating clothing itself). The image is divided into 4 clean vertical subpanels side-by-side against a seamless solid green chroma wall studio backdrop (#00FF00 green screen): Panel 1 (left): Full Front View of a sapphire blue long-sleeve tailored column dress with geometric keyhole neckline. Panel 2: Left Side Profile View showing long fitted sleeves and slim column silhouette. Panel 3: Rear Back View showing concealed center zipper and walking vent. Panel 4 (right): Detailed macro close-up of the keyhole neckline border, gold sleeve button, and sapphire crepe weave. Ultra-photorealistic fabric textures, studio lighting with crisp rim light separating the clothing from the green screen, commercial catalog quality, sharp focus. IMPORTANT: Absolutely NO text, NO labels, NO words, NO captions, NO banners, clean pure photography only.",
  },
  {
    id: "fem_09_canary_tweed_jacket",
    name: "Canary Yellow Bouclé Tweed Jacket Suit",
    gender: "female",
    category: "broadcast",
    prompt:
      "Vibrant canary yellow textured bouclé tweed jacket with braided pearl-and-gold trim, white silk blouse, and tailored pencil skirt",
    samPrompt: "clothing, jacket, tweed jacket, skirt, blouse",
    imageUrl: "/assets/wardrobe/generic/fem_09_canary_tweed_jacket.jpg",
    description: "High-energy morning broadcast tweed in vivid canary yellow with braided trim.",
    cleanGenPrompt:
      "A professional fashion multi-view technical reference plate showing a women's tweed jacket and skirt displayed on an invisible 3D ghost mannequin (NO human head, NO face, NO plastic mannequin skin, only the tailored floating clothing itself). The image is divided into 4 clean vertical subpanels side-by-side against a seamless solid green chroma wall studio backdrop (#00FF00 green screen): Panel 1 (left): Full Front View of a collarless canary yellow bouclé tweed jacket with pearl trim and matching pencil skirt. Panel 2: Left Side Profile View showing cropped jacket proportion and skirt line. Panel 3: Rear Back View showing clean back panel and centered skirt zipper. Panel 4 (right): Detailed macro close-up of the nubby bouclé tweed yarn, braided trim, and pearl buttons. Ultra-photorealistic fabric textures, studio lighting with crisp rim light separating the clothing from the green screen, commercial catalog quality, sharp focus. IMPORTANT: Absolutely NO text, NO labels, NO words, NO captions, NO banners, clean pure photography only.",
  },
  {
    id: "fem_10_burgundy_tuxedo_dress",
    name: "Burgundy Wine Double-Breasted Tuxedo Dress",
    gender: "female",
    category: "gala",
    prompt:
      "Structured burgundy wine wool crepe double-breasted tuxedo dress with contrasting black silk satin peak lapels and satin covered buttons",
    samPrompt: "clothing, dress, tuxedo dress, blazer dress",
    imageUrl: "/assets/wardrobe/generic/fem_10_burgundy_tuxedo_dress.jpg",
    description: "Power-glamour evening hybrid tuxedo dress in deep wine with black satin lapels.",
    cleanGenPrompt:
      "A professional fashion multi-view technical reference plate showing a women's tuxedo dress displayed on an invisible 3D ghost mannequin (NO human head, NO face, NO plastic mannequin skin, only the tailored floating clothing itself). The image is divided into 4 clean vertical subpanels side-by-side against a seamless solid green chroma wall studio backdrop (#00FF00 green screen): Panel 1 (left): Full Front View of a tailored double-breasted burgundy wine crepe tuxedo dress with black satin peak lapels and buttons. Panel 2: Left Side Profile View showing structured padded shoulder and tailored waist cinch. Panel 3: Rear Back View showing tailored princess seams and smooth wrap hemline. Panel 4 (right): Detailed macro close-up of black silk satin lapel edge, burgundy wool texture, and satin-covered buttons. Ultra-photorealistic fabric textures, studio lighting with crisp rim light separating the clothing from the green screen, commercial catalog quality, sharp focus. IMPORTANT: Absolutely NO text, NO labels, NO words, NO captions, NO banners, clean pure photography only.",
  },
  {
    id: "fem_11_champagne_silk_blouse",
    name: "Champagne Charmeuse Tie-Neck Blouse & Trousers",
    gender: "female",
    category: "executive",
    prompt:
      "Lustrous champagne gold silk charmeuse pussy-bow tie-neck blouse with billowing sleeves, tucked into high-waisted charcoal wool trousers",
    samPrompt: "clothing, blouse, shirt, silk blouse, trousers, pants",
    imageUrl: "/assets/wardrobe/generic/fem_11_champagne_silk_blouse.jpg",
    description: "Flowing liquid champagne silk charmeuse with dramatic tie-neck and charcoal trousers.",
    cleanGenPrompt:
      "A professional fashion multi-view technical reference plate showing a women's silk blouse and trousers displayed on an invisible 3D ghost mannequin (NO human head, NO face, NO plastic mannequin skin, only the tailored floating clothing itself). The image is divided into 4 clean vertical subpanels side-by-side against a seamless solid green chroma wall studio backdrop (#00FF00 green screen): Panel 1 (left): Full Front View of a liquid champagne silk charmeuse tie-neck blouse with high-waisted charcoal trousers. Panel 2: Left Side Profile View showing billowing silk sleeves and French cuffs. Panel 3: Rear Back View showing gathered back collar drape and tailored trouser pockets. Panel 4 (right): Detailed macro close-up of tied silk bow knot, pearl cufflink, and iridescent silk weave. Ultra-photorealistic fabric textures, studio lighting with crisp rim light separating the clothing from the green screen, commercial catalog quality, sharp focus. IMPORTANT: Absolutely NO text, NO labels, NO words, NO captions, NO banners, clean pure photography only.",
  },
  {
    id: "fem_12_scarlet_halter_gown",
    name: "Scarlet Red Architectural Halter Gala Gown",
    gender: "female",
    category: "gala",
    prompt:
      "Sculptural scarlet red stretch-crepe halter-neck floor-length gala gown with cutaway shoulders and sleek trumpet flare",
    samPrompt: "clothing, dress, gown, halter gown",
    imageUrl: "/assets/wardrobe/generic/fem_12_scarlet_halter_gown.jpg",
    description: "Dramatic red-carpet halter silhouette in rich scarlet stretch crepe.",
    cleanGenPrompt:
      "A professional fashion multi-view technical reference plate showing a women's halter gala gown displayed on an invisible 3D ghost mannequin (NO human head, NO face, NO plastic mannequin skin, only the tailored floating clothing itself). The image is divided into 4 clean vertical subpanels side-by-side against a seamless solid green chroma wall studio backdrop (#00FF00 green screen): Panel 1 (left): Full Front View of a scarlet red halter-neck evening gown with cutaway shoulders and trumpet hem. Panel 2: Left Side Profile View showing sculpted hip curve and fluid skirt flare. Panel 3: Rear Back View showing dramatic open-back halter straps and hidden zip. Panel 4 (right): Detailed macro close-up of scarlet stretch crepe texture, neckline gold hardware clasp, and clean edge stitching. Ultra-photorealistic fabric textures, studio lighting with crisp rim light separating the clothing from the green screen, commercial catalog quality, sharp focus. IMPORTANT: Absolutely NO text, NO labels, NO words, NO captions, NO banners, clean pure photography only.",
  },
  {
    id: "fem_13_amethyst_crossover_top",
    name: "Amethyst Purple Belted Crossover Top & Pants",
    gender: "female",
    category: "broadcast",
    prompt:
      "Deep amethyst royal purple tailored crossover wrap top with structured elbow-length sleeves, gold buckle belt, and slim black cigarette pants",
    samPrompt: "clothing, top, wrap top, belt, pants, trousers",
    imageUrl: "/assets/wardrobe/generic/fem_13_amethyst_crossover_top.jpg",
    description: "Regal jewel-tone amethyst wrap top with tailored waist belt and cigarette trousers.",
    cleanGenPrompt:
      "A professional fashion multi-view technical reference plate showing a women's crossover top and pants displayed on an invisible 3D ghost mannequin (NO human head, NO face, NO plastic mannequin skin, only the tailored floating clothing itself). The image is divided into 4 clean vertical subpanels side-by-side against a seamless solid green chroma wall studio backdrop (#00FF00 green screen): Panel 1 (left): Full Front View of a deep amethyst purple belted crossover top and black cigarette pants. Panel 2: Left Side Profile View showing structured elbow-length sleeve cuffs and belt profile. Panel 3: Rear Back View showing smooth back bodice with centered seam and tailored trouser line. Panel 4 (right): Detailed macro close-up of the gold geometric belt buckle, amethyst crepe fabric, and clean neckline stitch. Ultra-photorealistic fabric textures, studio lighting with crisp rim light separating the clothing from the green screen, commercial catalog quality, sharp focus. IMPORTANT: Absolutely NO text, NO labels, NO words, NO captions, NO banners, clean pure photography only.",
  },
  {
    id: "fem_14_arctic_white_pantsuit",
    name: "Monochrome Arctic White Shawl-Collar Pantsuit",
    gender: "female",
    category: "executive",
    prompt:
      "Pristine monochrome arctic white single-breasted wool pantsuit with sleek shawl collar, silver bar closure, and wide-leg fluid trousers",
    samPrompt: "clothing, suit, blazer, trousers, white suit",
    imageUrl: "/assets/wardrobe/generic/fem_14_arctic_white_pantsuit.jpg",
    description: "Futuristic editorial power suit in pristine all-white with architectural shawl lapel.",
    cleanGenPrompt:
      "A professional fashion multi-view technical reference plate showing a women's white pantsuit displayed on an invisible 3D ghost mannequin (NO human head, NO face, NO plastic mannequin skin, only the tailored floating clothing itself). The image is divided into 4 clean vertical subpanels side-by-side against a seamless solid green chroma wall studio backdrop (#00FF00 green screen): Panel 1 (left): Full Front View of a monochrome arctic white shawl-collar blazer and matching wide-leg trousers. Panel 2: Left Side Profile View showing sweeping wide-leg trouser drape and sleek jacket profile. Panel 3: Rear Back View showing seamless shawl collar back and tailored waistline. Panel 4 (right): Detailed macro close-up of brushed silver bar closure, white wool-twill texture, and clean pocket welts. Ultra-photorealistic fabric textures, studio lighting with crisp rim light separating the clothing from the green screen, commercial catalog quality, sharp focus. IMPORTANT: Absolutely NO text, NO labels, NO words, NO captions, NO banners, clean pure photography only.",
  },
  {
    id: "fem_15_midnight_lace_cocktail",
    name: "Midnight Black Corded Lace Cocktail Sheath",
    gender: "female",
    category: "gala",
    prompt:
      "Intricate midnight black floral corded lace cocktail sheath dress over a nude silk bodice underlay, with scalloped boatneck and cap sleeves",
    samPrompt: "clothing, dress, lace dress, cocktail dress",
    imageUrl: "/assets/wardrobe/generic/fem_15_midnight_lace_cocktail.jpg",
    description: "High-elegance floral corded lace over nude silk lining with scalloped eyelash edges.",
    cleanGenPrompt:
      "A professional fashion multi-view technical reference plate showing a women's lace cocktail dress displayed on an invisible 3D ghost mannequin (NO human head, NO face, NO plastic mannequin skin, only the tailored floating clothing itself). The image is divided into 4 clean vertical subpanels side-by-side against a seamless solid green chroma wall studio backdrop (#00FF00 green screen): Panel 1 (left): Full Front View of a midnight black corded floral lace sheath dress with nude silk underlay. Panel 2: Left Side Profile View showing scalloped cap sleeves and knee-length lace hem. Panel 3: Rear Back View showing sheer lace back yoke and covered buttons. Panel 4 (right): Detailed macro close-up of the raised corded lace floral pattern and delicate eyelash trim. Ultra-photorealistic fabric textures, studio lighting with crisp rim light separating the clothing from the green screen, commercial catalog quality, sharp focus. IMPORTANT: Absolutely NO text, NO labels, NO words, NO captions, NO banners, clean pure photography only.",
  },
  {
    id: "fem_16_terracotta_linen_jumpsuit",
    name: "Terracotta Rust Tailored Linen Jumpsuit",
    gender: "female",
    category: "casual",
    prompt:
      "Bespoke terracotta rust washed linen tailored jumpsuit with notched lapel collar, cuffed short sleeves, tortoiseshell ring belt, and wide cropped legs",
    samPrompt: "clothing, jumpsuit, linen jumpsuit, belt",
    imageUrl: "/assets/wardrobe/generic/fem_16_terracotta_linen_jumpsuit.jpg",
    description: "Effortless warm-weather investigative reporting jumpsuit in rich terracotta linen.",
    cleanGenPrompt:
      "A professional fashion multi-view technical reference plate showing a women's linen jumpsuit displayed on an invisible 3D ghost mannequin (NO human head, NO face, NO plastic mannequin skin, only the tailored floating clothing itself). The image is divided into 4 clean vertical subpanels side-by-side against a seamless solid green chroma wall studio backdrop (#00FF00 green screen): Panel 1 (left): Full Front View of a terracotta rust linen tailored jumpsuit with notched collar and tortoiseshell belt. Panel 2: Left Side Profile View showing wide cropped leg drape and cuffed sleeve profile. Panel 3: Rear Back View showing tailored back yoke and patch pockets. Panel 4 (right): Detailed macro close-up of natural linen yarn slubs, tortoiseshell ring buckle, and horn buttons. Ultra-photorealistic fabric textures, studio lighting with crisp rim light separating the clothing from the green screen, commercial catalog quality, sharp focus. IMPORTANT: Absolutely NO text, NO labels, NO words, NO captions, NO banners, clean pure photography only.",
  },
  {
    id: "fem_17_teal_waterfall_drape",
    name: "Ocean Teal Asymmetric Waterfall Drape Dress",
    gender: "female",
    category: "broadcast",
    prompt:
      "Vivid ocean teal blue-green heavy jersey dress with sculptural one-shoulder waterfall drape, fitted midi skirt, and metallic silver cuff accent",
    samPrompt: "clothing, dress, drape dress, jersey dress",
    imageUrl: "/assets/wardrobe/generic/fem_17_teal_waterfall_drape.jpg",
    description: "Dynamic broadcast ocean teal with sculptural one-shoulder fluid waterfall drape.",
    cleanGenPrompt:
      "A professional fashion multi-view technical reference plate showing a women's drape dress displayed on an invisible 3D ghost mannequin (NO human head, NO face, NO plastic mannequin skin, only the tailored floating clothing itself). The image is divided into 4 clean vertical subpanels side-by-side against a seamless solid green chroma wall studio backdrop (#00FF00 green screen): Panel 1 (left): Full Front View of an ocean teal heavy jersey dress with one-shoulder waterfall cascade drape. Panel 2: Left Side Profile View showing the asymmetric side drape and fitted skirt. Panel 3: Rear Back View showing smooth back bodice with diagonal shoulder seam. Panel 4 (right): Detailed macro close-up of teal jersey fabric gathers and polished silver cuff hardware. Ultra-photorealistic fabric textures, studio lighting with crisp rim light separating the clothing from the green screen, commercial catalog quality, sharp focus. IMPORTANT: Absolutely NO text, NO labels, NO words, NO captions, NO banners, clean pure photography only.",
  },
  {
    id: "fem_18_gold_sequin_gala_jacket",
    name: "Liquid Gold Sequin Gala Smoking Jacket",
    gender: "female",
    category: "gala",
    prompt:
      "Showstopping liquid pale gold micro-sequin smoking jacket with contrasting black silk lapels, worn over a black silk camisole and tailored black trousers",
    samPrompt: "clothing, jacket, blazer, sequin jacket, trousers",
    imageUrl: "/assets/wardrobe/generic/fem_18_gold_sequin_gala_jacket.jpg",
    description: "New Year & Gala celebration statement micro-sequin jacket with luminous gold shimmer.",
    cleanGenPrompt:
      "A professional fashion multi-view technical reference plate showing a women's sequin jacket and trousers displayed on an invisible 3D ghost mannequin (NO human head, NO face, NO plastic mannequin skin, only the tailored floating clothing itself). The image is divided into 4 clean vertical subpanels side-by-side against a seamless solid green chroma wall studio backdrop (#00FF00 green screen): Panel 1 (left): Full Front View of a pale liquid gold micro-sequin smoking jacket with black satin lapels and black trousers. Panel 2: Left Side Profile View showing the glittering sequin sleeve and tailored trouser line. Panel 3: Rear Back View showing full sequin back panel and satin collar roll. Panel 4 (right): Detailed macro close-up of interlocking pale gold micro-sequins reflecting studio lights. Ultra-photorealistic fabric textures, studio lighting with crisp rim light separating the clothing from the green screen, commercial catalog quality, sharp focus. IMPORTANT: Absolutely NO text, NO labels, NO words, NO captions, NO banners, clean pure photography only.",
  },
  {
    id: "fem_19_houndstooth_skirt_suit",
    name: "Black & White Micro-Houndstooth Skirt Suit",
    gender: "female",
    category: "broadcast",
    prompt:
      "Graphic black and ivory white micro-houndstooth wool cropped jacket with black velvet trim collar, ornate silver buttons, and matching high-waisted A-line skirt",
    samPrompt: "clothing, suit, jacket, houndstooth, skirt",
    imageUrl: "/assets/wardrobe/generic/fem_19_houndstooth_skirt_suit.jpg",
    description: "Timeless Parisian broadcast sophistication in crisp optical micro-houndstooth.",
    cleanGenPrompt:
      "A professional fashion multi-view technical reference plate showing a women's houndstooth suit displayed on an invisible 3D ghost mannequin (NO human head, NO face, NO plastic mannequin skin, only the tailored floating clothing itself). The image is divided into 4 clean vertical subpanels side-by-side against a seamless solid green chroma wall studio backdrop (#00FF00 green screen): Panel 1 (left): Full Front View of a black and white micro-houndstooth cropped jacket and matching A-line skirt. Panel 2: Left Side Profile View showing cropped jacket proportion and skirt flare. Panel 3: Rear Back View showing matched houndstooth pattern alignment across seams. Panel 4 (right): Detailed macro close-up of intricate woven houndstooth check, black velvet collar piping, and ornate silver buttons. Ultra-photorealistic fabric textures, studio lighting with crisp rim light separating the clothing from the green screen, commercial catalog quality, sharp focus. IMPORTANT: Absolutely NO text, NO labels, NO words, NO captions, NO banners, clean pure photography only.",
  },
  {
    id: "fem_20_coral_cape_dress",
    name: "Vibrant Coral Architectural Cape Shift Dress",
    gender: "female",
    category: "broadcast",
    prompt:
      "Striking vibrant coral pink tailored shift dress with architectural split cape-sleeves that cascade past the elbows, featuring a clean boat neckline and gold brooch",
    samPrompt: "clothing, dress, cape dress, shift dress",
    imageUrl: "/assets/wardrobe/generic/fem_20_coral_cape_dress.jpg",
    description: "Prime-time visual standout in vivid coral with sweeping architectural cape-sleeves.",
    cleanGenPrompt:
      "A professional fashion multi-view technical reference plate showing a women's cape dress displayed on an invisible 3D ghost mannequin (NO human head, NO face, NO plastic mannequin skin, only the tailored floating clothing itself). The image is divided into 4 clean vertical subpanels side-by-side against a seamless solid green chroma wall studio backdrop (#00FF00 green screen): Panel 1 (left): Full Front View of a vibrant coral pink shift dress with architectural split cape-sleeves and gold brooch. Panel 2: Left Side Profile View showing dramatic cape sleeve slit and fluid side profile. Panel 3: Rear Back View showing flowing cape drape across shoulders and back zipper. Panel 4 (right): Detailed macro close-up of coral crepe texture, clean hem borders, and polished gold modernist brooch. Ultra-photorealistic fabric textures, studio lighting with crisp rim light separating the clothing from the green screen, commercial catalog quality, sharp focus. IMPORTANT: Absolutely NO text, NO labels, NO words, NO captions, NO banners, clean pure photography only.",
  },

  // ==========================================
  // 👔 MALE ATTIRES (20)
  // ==========================================
  {
    id: "male_01_charcoal_suit",
    name: "Charcoal Grey Executive Wool Suit",
    gender: "male",
    category: "broadcast",
    prompt:
      "Tailored charcoal grey wool 2-piece business suit jacket, crisp white dress shirt, and rich navy silk tie with white pocket square",
    samPrompt: "clothing, suit, jacket, shirt, tie, pocket square, trousers",
    imageUrl: "/assets/wardrobe/generic/male_01_charcoal_suit.jpg",
    description: "Definitive broadcast authority 2-piece wool suit with navy silk tie and pocket square.",
    cleanGenPrompt:
      "A professional fashion multi-view technical reference plate showing a men's business suit displayed on an invisible 3D ghost mannequin (NO human head, NO face, NO plastic mannequin skin, only the tailored floating clothing itself). The image is divided into 4 clean vertical subpanels side-by-side against a seamless solid green chroma wall studio backdrop (#00FF00 green screen): Panel 1 (left): Full Front View of a tailored charcoal grey wool 2-piece suit jacket, trousers, crisp white dress shirt, and navy silk tie. Panel 2: Left Side Profile View showing jacket drape and sleeve pitch. Panel 3: Rear Back View showing the double vents and structured shoulder line. Panel 4 (right): Detailed macro close-up of the notched lapel, white pocket square, horn buttons, and navy silk tie texture. Ultra-photorealistic fabric textures, studio lighting with crisp rim light separating the clothing from the green screen, commercial catalog quality, sharp focus. IMPORTANT: Absolutely NO text, NO labels, NO words, NO captions, NO banners, clean pure photography only.",
  },
  {
    id: "male_02_midnight_navy_pinstripe",
    name: "Midnight Navy Pinstripe 3-Piece Suit",
    gender: "male",
    category: "executive",
    prompt:
      "Impeccably tailored midnight navy chalk pinstripe 3-piece suit with matching 5-button vest, burgundy silk tie, and silver tie clip",
    samPrompt: "clothing, suit, jacket, vest, waistcoat, shirt, tie, trousers",
    imageUrl: "/assets/wardrobe/generic/male_02_midnight_navy_pinstripe.jpg",
    description: "Classic Wall Street & Prime-time 3-piece suit with chalk pinstripes and vest.",
    cleanGenPrompt:
      "A professional fashion multi-view technical reference plate showing a men's 3-piece pinstripe suit displayed on an invisible 3D ghost mannequin (NO human head, NO face, NO plastic mannequin skin, only the tailored floating clothing itself). The image is divided into 4 clean vertical subpanels side-by-side against a seamless solid green chroma wall studio backdrop (#00FF00 green screen): Panel 1 (left): Full Front View of a midnight navy chalk pinstripe 3-piece suit, tailored 5-button vest, crisp shirt, and burgundy silk tie. Panel 2: Left Side Profile View showing vest silhouette and sharp trouser crease. Panel 3: Rear Back View showing dual jacket vents and adjustable buckle on satin vest back. Panel 4 (right): Detailed macro close-up of chalk pinstripe weave, silver tie bar, and silk jacquard tie knot. Ultra-photorealistic fabric textures, studio lighting with crisp rim light separating the clothing from the green screen, commercial catalog quality, sharp focus. IMPORTANT: Absolutely NO text, NO labels, NO words, NO captions, NO banners, clean pure photography only.",
  },
  {
    id: "male_03_black_velvet_tuxedo",
    name: "Midnight Black Velvet Shawl Tuxedo",
    gender: "male",
    category: "gala",
    prompt:
      "High-fashion tailored black velvet smoking tuxedo jacket with black silk satin shawl lapels, pleated white tuxedo shirt, and black bow tie",
    samPrompt: "clothing, tuxedo, dinner jacket, velvet jacket, bow tie, shirt, trousers",
    imageUrl: "/assets/wardrobe/generic/male_03_black_velvet_tuxedo.jpg",
    description: "Evening gala statement tuxedo in plush black velvet with satin shawl collar.",
    cleanGenPrompt:
      "A professional fashion multi-view technical reference plate showing a men's velvet tuxedo displayed on an invisible 3D ghost mannequin (NO human head, NO face, NO plastic mannequin skin, only the tailored floating clothing itself). The image is divided into 4 clean vertical subpanels side-by-side against a seamless solid green chroma wall studio backdrop (#00FF00 green screen): Panel 1 (left): Full Front View of a midnight black velvet smoking tuxedo jacket, silk satin shawl lapels, pleated tuxedo shirt, black bow tie, and black tuxedo trousers. Panel 2: Left Side Profile View showing sweeping shawl collar roll and satin side braid on trousers. Panel 3: Rear Back View showing single center vent and plush velvet sheen. Panel 4 (right): Detailed macro close-up of black satin shawl lapel, silk grosgrain bow tie, and onyx shirt studs. Ultra-photorealistic fabric textures, studio lighting with crisp rim light separating the clothing from the green screen, commercial catalog quality, sharp focus. IMPORTANT: Absolutely NO text, NO labels, NO words, NO captions, NO banners, clean pure photography only.",
  },
  {
    id: "male_04_oxford_tweed_blazer",
    name: "Oxford Houndstooth Tweed Sports Jacket",
    gender: "male",
    category: "casual",
    prompt:
      "Heritage brown and charcoal houndstooth wool tweed sports jacket with suede elbow patches, light blue chambray shirt, and knitted tie",
    samPrompt: "clothing, blazer, sports jacket, jacket, shirt, tie, trousers",
    imageUrl: "/assets/wardrobe/generic/male_04_oxford_tweed_blazer.jpg",
    description: "Intellectual academia and investigative journalism tweed blazer with elbow patches.",
    cleanGenPrompt:
      "A professional fashion multi-view technical reference plate showing a men's tweed sports jacket and trousers displayed on an invisible 3D ghost mannequin (NO human head, NO face, NO plastic mannequin skin, only the tailored floating clothing itself). The image is divided into 4 clean vertical subpanels side-by-side against a seamless solid green chroma wall studio backdrop (#00FF00 green screen): Panel 1 (left): Full Front View of a brown and charcoal houndstooth tweed sports jacket, blue chambray shirt, brown knit tie, and khaki trousers. Panel 2: Left Side Profile View showing chestnut brown suede elbow patch detail. Panel 3: Rear Back View showing center hook vent and structured tweed shoulder yoke. Panel 4 (right): Detailed macro close-up of woven suede elbow patch, leather knot buttons, and textured knit tie. Ultra-photorealistic fabric textures, studio lighting with crisp rim light separating the clothing from the green screen, commercial catalog quality, sharp focus. IMPORTANT: Absolutely NO text, NO labels, NO words, NO captions, NO banners, clean pure photography only.",
  },
  {
    id: "male_05_royal_blue_suit",
    name: "Royal Blue Modern Slim-Fit Suit",
    gender: "male",
    category: "broadcast",
    prompt:
      "Vibrant modern royal blue slim-fit suit jacket with narrow notch lapels, crisp spread-collar white shirt, and silver textured skinny tie",
    samPrompt: "clothing, suit, jacket, shirt, tie, trousers",
    imageUrl: "/assets/wardrobe/generic/male_05_royal_blue_suit.jpg",
    description: "High-contrast dynamic broadcast suit in vivid royal blue with silver tie.",
    cleanGenPrompt:
      "A professional fashion multi-view technical reference plate showing a men's royal blue slim-fit suit displayed on an invisible 3D ghost mannequin (NO human head, NO face, NO plastic mannequin skin, only the tailored floating clothing itself). The image is divided into 4 clean vertical subpanels side-by-side against a seamless solid green chroma wall studio backdrop (#00FF00 green screen): Panel 1 (left): Full Front View of a vibrant royal blue slim-fit suit jacket, trousers, white spread-collar shirt, and silver skinny tie. Panel 2: Left Side Profile View showing slim tapered waist cut and narrow sleeve profile. Panel 3: Rear Back View showing double vents and modern tapered jacket skirt. Panel 4 (right): Detailed macro close-up of textured silver micro-weave tie, iridescent buttons, and royal blue wool weave. Ultra-photorealistic fabric textures, studio lighting with crisp rim light separating the clothing from the green screen, commercial catalog quality, sharp focus. IMPORTANT: Absolutely NO text, NO labels, NO words, NO captions, NO banners, clean pure photography only.",
  },
  {
    id: "male_06_steel_grey_double_breasted",
    name: "Steel Grey Double-Breasted Peak Suit",
    gender: "male",
    category: "executive",
    prompt:
      "Architectural steel grey 6x2 double-breasted suit jacket with exaggerated broad peak lapels, black silk tie, and silver geometric cufflinks",
    samPrompt: "clothing, suit, jacket, double breasted, shirt, tie, trousers",
    imageUrl: "/assets/wardrobe/generic/male_06_steel_grey_double_breasted.jpg",
    description: "Architectural European tailoring with dramatic wide peak lapels and steel grey wool.",
    cleanGenPrompt:
      "A professional fashion multi-view technical reference plate showing a men's double-breasted suit displayed on an invisible 3D ghost mannequin (NO human head, NO face, NO plastic mannequin skin, only the tailored floating clothing itself). The image is divided into 4 clean vertical subpanels side-by-side against a seamless solid green chroma wall studio backdrop (#00FF00 green screen): Panel 1 (left): Full Front View of a 6-button double-breasted steel grey wool suit jacket, matching trousers, white shirt, and black silk tie. Panel 2: Left Side Profile View showing broad peak lapel roll and structured chest canvas. Panel 3: Rear Back View showing dual side vents and authoritative shoulder slope. Panel 4 (right): Detailed macro close-up of brushed steel cufflinks, wide peak lapel stitching, and black silk tie knot. Ultra-photorealistic fabric textures, studio lighting with crisp rim light separating the clothing from the green screen, commercial catalog quality, sharp focus. IMPORTANT: Absolutely NO text, NO labels, NO words, NO captions, NO banners, clean pure photography only.",
  },
  {
    id: "male_07_burgundy_dinner_jacket",
    name: "Burgundy Jacquard Evening Dinner Jacket",
    gender: "male",
    category: "gala",
    prompt:
      "Deep wine burgundy floral jacquard dinner jacket with contrasting black silk satin peak lapels, black tuxedo shirt, and black satin bow tie",
    samPrompt: "clothing, dinner jacket, blazer, bow tie, shirt, tuxedo",
    imageUrl: "/assets/wardrobe/generic/male_07_burgundy_dinner_jacket.jpg",
    description: "Regal evening red-carpet look with subtle woven floral jacquard pattern.",
    cleanGenPrompt:
      "A professional fashion multi-view technical reference plate showing a men's jacquard dinner jacket displayed on an invisible 3D ghost mannequin (NO human head, NO face, NO plastic mannequin skin, only the tailored floating clothing itself). The image is divided into 4 clean vertical subpanels side-by-side against a seamless solid green chroma wall studio backdrop (#00FF00 green screen): Panel 1 (left): Full Front View of a deep wine burgundy floral jacquard dinner jacket with black satin peak lapels, black shirt, bow tie, and black trousers. Panel 2: Left Side Profile View showing the shimmering jacquard fabric pattern under studio light. Panel 3: Rear Back View showing clean tuxedo back line and side satin piping. Panel 4 (right): Detailed macro close-up of the woven floral jacquard relief and black silk satin lapel edge. Ultra-photorealistic fabric textures, studio lighting with crisp rim light separating the clothing from the green screen, commercial catalog quality, sharp focus. IMPORTANT: Absolutely NO text, NO labels, NO words, NO captions, NO banners, clean pure photography only.",
  },
  {
    id: "male_08_sand_italian_linen_suit",
    name: "Sand Italian Linen Summer Suit",
    gender: "male",
    category: "casual",
    prompt:
      "Effortless sand tan Italian linen 2-piece suit with relaxed open-collar crisp white linen shirt and brown woven leather belt",
    samPrompt: "clothing, suit, linen suit, jacket, shirt, trousers",
    imageUrl: "/assets/wardrobe/generic/male_08_sand_italian_linen_suit.jpg",
    description: "Mediterranean summer sophistication in unconstructed sand-colored Italian linen.",
    cleanGenPrompt:
      "A professional fashion multi-view technical reference plate showing a men's linen suit displayed on an invisible 3D ghost mannequin (NO human head, NO face, NO plastic mannequin skin, only the tailored floating clothing itself). The image is divided into 4 clean vertical subpanels side-by-side against a seamless solid green chroma wall studio backdrop (#00FF00 green screen): Panel 1 (left): Full Front View of a sand-colored Italian linen suit jacket, matching linen trousers, and open-collar white linen shirt. Panel 2: Left Side Profile View showing natural linen sleeve creasing and relaxed jacket drape. Panel 3: Rear Back View showing unlined lightweight jacket back with double vents. Panel 4 (right): Detailed macro close-up of woven linen texture, mother-of-pearl buttons, and braided brown leather belt. Ultra-photorealistic fabric textures, studio lighting with crisp rim light separating the clothing from the green screen, commercial catalog quality, sharp focus. IMPORTANT: Absolutely NO text, NO labels, NO words, NO captions, NO banners, clean pure photography only.",
  },
  {
    id: "male_09_slate_blue_windowpane",
    name: "Slate Blue Windowpane Wool Suit",
    gender: "male",
    category: "broadcast",
    prompt:
      "Bespoke slate blue wool suit with subtle caramel windowpane grid check, white spread-collar shirt, and burnt orange silk knit tie",
    samPrompt: "clothing, suit, jacket, check suit, shirt, tie, trousers",
    imageUrl: "/assets/wardrobe/generic/male_09_slate_blue_windowpane.jpg",
    description: "Modern television anchor authority in slate blue with graphic windowpane check.",
    cleanGenPrompt:
      "A professional fashion multi-view technical reference plate showing a men's windowpane suit displayed on an invisible 3D ghost mannequin (NO human head, NO face, NO plastic mannequin skin, only the tailored floating clothing itself). The image is divided into 4 clean vertical subpanels side-by-side against a seamless solid green chroma wall studio backdrop (#00FF00 green screen): Panel 1 (left): Full Front View of a slate blue wool suit with caramel windowpane check, white shirt, and burnt orange knit tie. Panel 2: Left Side Profile View showing pattern matching across sleeves and jacket torso. Panel 3: Rear Back View showing dual vents with precise horizontal check alignment. Panel 4 (right): Detailed macro close-up of windowpane grid line, burnt orange textured knit tie, and horn buttons. Ultra-photorealistic fabric textures, studio lighting with crisp rim light separating the clothing from the green screen, commercial catalog quality, sharp focus. IMPORTANT: Absolutely NO text, NO labels, NO words, NO captions, NO banners, clean pure photography only.",
  },
  {
    id: "male_10_classic_black_tie_tuxedo",
    name: "Classic Black Tie Peak-Lapel Tuxedo",
    gender: "male",
    category: "gala",
    prompt:
      "Traditional midnight black barathea wool tuxedo with silk grosgrain peak lapels, pleated bib tuxedo shirt, black grosgrain bow tie, and silk cummerbund",
    samPrompt: "clothing, tuxedo, dinner suit, bow tie, cummerbund, shirt",
    imageUrl: "/assets/wardrobe/generic/male_10_classic_black_tie_tuxedo.jpg",
    description: "The gold standard of formal black-tie elegance in pure black barathea wool.",
    cleanGenPrompt:
      "A professional fashion multi-view technical reference plate showing a men's formal tuxedo displayed on an invisible 3D ghost mannequin (NO human head, NO face, NO plastic mannequin skin, only the tailored floating clothing itself). The image is divided into 4 clean vertical subpanels side-by-side against a seamless solid green chroma wall studio backdrop (#00FF00 green screen): Panel 1 (left): Full Front View of a classic black peak-lapel tuxedo, pleated bib shirt, black bow tie, silk cummerbund, and trousers. Panel 2: Left Side Profile View showing single silk side stripe on trousers and structured shoulder canvas. Panel 3: Rear Back View showing ventless classic formal jacket back. Panel 4 (right): Detailed macro close-up of ribbed grosgrain lapel facing, pleated tuxedo shirt bib, and mother-of-pearl studs. Ultra-photorealistic fabric textures, studio lighting with crisp rim light separating the clothing from the green screen, commercial catalog quality, sharp focus. IMPORTANT: Absolutely NO text, NO labels, NO words, NO captions, NO banners, clean pure photography only.",
  },
  {
    id: "male_11_camel_wool_overcoat_suit",
    name: "Camel Hair Overcoat & Charcoal Suit",
    gender: "male",
    category: "executive",
    prompt:
      "Tailored double-breasted camel hair knee-length overcoat worn layered over a charcoal grey two-piece suit and burgundy silk scarf",
    samPrompt: "clothing, coat, overcoat, suit, jacket, scarf",
    imageUrl: "/assets/wardrobe/generic/male_11_camel_wool_overcoat_suit.jpg",
    description: "Commanding outdoor broadcast executive look with luxurious camel hair topcoat.",
    cleanGenPrompt:
      "A professional fashion multi-view technical reference plate showing a men's overcoat and suit displayed on an invisible 3D ghost mannequin (NO human head, NO face, NO plastic mannequin skin, only the tailored floating clothing itself). The image is divided into 4 clean vertical subpanels side-by-side against a seamless solid green chroma wall studio backdrop (#00FF00 green screen): Panel 1 (left): Full Front View of a camel hair double-breasted overcoat over charcoal suit, shirt, tie, and folded burgundy silk scarf. Panel 2: Left Side Profile View showing substantial overcoat volume and sleeve layer. Panel 3: Rear Back View showing center back deep pleat and buttoned half-belt. Panel 4 (right): Detailed macro close-up of plush camel hair pile, marbled horn buttons, and burgundy silk scarf pattern. Ultra-photorealistic fabric textures, studio lighting with crisp rim light separating the clothing from the green screen, commercial catalog quality, sharp focus. IMPORTANT: Absolutely NO text, NO labels, NO words, NO captions, NO banners, clean pure photography only.",
  },
  {
    id: "male_12_emerald_velvet_smoking_jacket",
    name: "Emerald Green Velvet Smoking Jacket",
    gender: "male",
    category: "gala",
    prompt:
      "Luxurious dark emerald green cotton velvet smoking jacket with black quilted satin shawl collar, frogging closure, and tailored black trousers",
    samPrompt: "clothing, jacket, smoking jacket, velvet jacket, trousers",
    imageUrl: "/assets/wardrobe/generic/male_12_emerald_velvet_smoking_jacket.jpg",
    description: "Aristocratic evening glamour in dark emerald velvet with quilted satin collar.",
    cleanGenPrompt:
      "A professional fashion multi-view technical reference plate showing a men's smoking jacket displayed on an invisible 3D ghost mannequin (NO human head, NO face, NO plastic mannequin skin, only the tailored floating clothing itself). The image is divided into 4 clean vertical subpanels side-by-side against a seamless solid green chroma wall studio backdrop (#00FF00 green screen): Panel 1 (left): Full Front View of a dark emerald green velvet smoking jacket with quilted black satin collar, frogging clasp, and black trousers. Panel 2: Left Side Profile View showing turnback quilted satin cuffs and rich velvet nap. Panel 3: Rear Back View showing plush green velvet back with gentle waist suppression. Panel 4 (right): Detailed macro close-up of diamond-quilted black satin, braided frogging toggle, and rich emerald velvet. Ultra-photorealistic fabric textures, studio lighting with crisp rim light separating the clothing from the green screen, commercial catalog quality, sharp focus. IMPORTANT: Absolutely NO text, NO labels, NO words, NO captions, NO banners, clean pure photography only.",
  },
  {
    id: "male_13_hunter_green_suit",
    name: "Hunter Forest Green Wool Suit",
    gender: "male",
    category: "broadcast",
    prompt:
      "Modern tailored deep hunter forest green wool suit with notched lapels, crisp ecru dress shirt, and black silk knit tie with gold tie bar",
    samPrompt: "clothing, suit, jacket, green suit, shirt, tie, trousers",
    imageUrl: "/assets/wardrobe/generic/male_13_hunter_green_suit.jpg",
    description: "Contemporary earth-tone broadcast authority in tailored forest green wool.",
    cleanGenPrompt:
      "A professional fashion multi-view technical reference plate showing a men's forest green suit displayed on an invisible 3D ghost mannequin (NO human head, NO face, NO plastic mannequin skin, only the tailored floating clothing itself). The image is divided into 4 clean vertical subpanels side-by-side against a seamless solid green chroma wall studio backdrop (#00FF00 green screen): Panel 1 (left): Full Front View of a deep hunter green 2-piece suit, ecru dress shirt, black knit tie, and gold tie bar. Panel 2: Left Side Profile View showing tailored sleeve pitch and trouser drape. Panel 3: Rear Back View showing double vents and clean shoulder structure. Panel 4 (right): Detailed macro close-up of hunter green wool twill, gold tie clip, and textured black knit tie. Ultra-photorealistic fabric textures, studio lighting with crisp rim light separating the clothing from the green screen, commercial catalog quality, sharp focus. IMPORTANT: Absolutely NO text, NO labels, NO words, NO captions, NO banners, clean pure photography only.",
  },
  {
    id: "male_14_espresso_brown_flannel",
    name: "Espresso Brown Wool Flannel Suit",
    gender: "male",
    category: "executive",
    prompt:
      "Rich espresso brown woolen flannel 2-piece suit with chalk horn buttons, cream spread-collar shirt, and navy-and-gold striped rep tie",
    samPrompt: "clothing, suit, jacket, flannel suit, shirt, tie, trousers",
    imageUrl: "/assets/wardrobe/generic/male_14_espresso_brown_flannel.jpg",
    description: "Rich autumn sartorial warmth in heavy espresso woolen flannel.",
    cleanGenPrompt:
      "A professional fashion multi-view technical reference plate showing a men's brown flannel suit displayed on an invisible 3D ghost mannequin (NO human head, NO face, NO plastic mannequin skin, only the tailored floating clothing itself). The image is divided into 4 clean vertical subpanels side-by-side against a seamless solid green chroma wall studio backdrop (#00FF00 green screen): Panel 1 (left): Full Front View of an espresso brown flannel suit jacket, trousers, cream dress shirt, and navy-and-gold striped tie. Panel 2: Left Side Profile View showing brushed flannel texture and structured shoulder silhouette. Panel 3: Rear Back View showing classic dual vents and tailored back drape. Panel 4 (right): Detailed macro close-up of fuzzy flannel nap, horn buttons, and striped silk rep tie weave. Ultra-photorealistic fabric textures, studio lighting with crisp rim light separating the clothing from the green screen, commercial catalog quality, sharp focus. IMPORTANT: Absolutely NO text, NO labels, NO words, NO captions, NO banners, clean pure photography only.",
  },
  {
    id: "male_15_silver_grey_sharkskin",
    name: "Silver Grey Sharkskin Modern Suit",
    gender: "male",
    category: "broadcast",
    prompt:
      "Luminous silver grey sharkskin wool-mohair 2-piece suit with pick-stitched notch lapels, pale lavender shirt, and deep violet silk tie",
    samPrompt: "clothing, suit, jacket, sharkskin, shirt, tie, trousers",
    imageUrl: "/assets/wardrobe/generic/male_15_silver_grey_sharkskin.jpg",
    description: "Sleek high-tech modern sheen in two-tone silver grey sharkskin weave.",
    cleanGenPrompt:
      "A professional fashion multi-view technical reference plate showing a men's sharkskin suit displayed on an invisible 3D ghost mannequin (NO human head, NO face, NO plastic mannequin skin, only the tailored floating clothing itself). The image is divided into 4 clean vertical subpanels side-by-side against a seamless solid green chroma wall studio backdrop (#00FF00 green screen): Panel 1 (left): Full Front View of a silver grey sharkskin suit jacket, trousers, pale lavender shirt, and deep violet silk tie. Panel 2: Left Side Profile View showing dynamic metallic luster of the sharkskin under directional light. Panel 3: Rear Back View showing double vents and streamlined back cut. Panel 4 (right): Detailed macro close-up of the two-tone sharkskin twill weave, pick-stitching, and rich violet silk tie. Ultra-photorealistic fabric textures, studio lighting with crisp rim light separating the clothing from the green screen, commercial catalog quality, sharp focus. IMPORTANT: Absolutely NO text, NO labels, NO words, NO captions, NO banners, clean pure photography only.",
  },
  {
    id: "male_16_navy_blazer_brass_buttons",
    name: "Traditional Navy Club Blazer & Khakis",
    gender: "male",
    category: "casual",
    prompt:
      "Classic hopsack navy blue club blazer with embossed heraldic brass buttons, light blue Oxford cloth button-down shirt, rep striped tie, and tailored stone khakis",
    samPrompt: "clothing, blazer, jacket, club blazer, shirt, tie, khakis",
    imageUrl: "/assets/wardrobe/generic/male_16_navy_blazer_brass_buttons.jpg",
    description: "The quintessential American broadcast staple: navy hopsack blazer with brass buttons.",
    cleanGenPrompt:
      "A professional fashion multi-view technical reference plate showing a men's club blazer and khakis displayed on an invisible 3D ghost mannequin (NO human head, NO face, NO plastic mannequin skin, only the tailored floating clothing itself). The image is divided into 4 clean vertical subpanels side-by-side against a seamless solid green chroma wall studio backdrop (#00FF00 green screen): Panel 1 (left): Full Front View of a navy hopsack blazer with brass buttons, blue Oxford shirt, rep tie, and stone khaki trousers. Panel 2: Left Side Profile View showing patch pockets with flaps and 4 brass cuff buttons. Panel 3: Rear Back View showing center hook vent and classic natural shoulder line. Panel 4 (right): Detailed macro close-up of embossed brass heraldic buttons, Oxford cloth texture, and striped rep tie knot. Ultra-photorealistic fabric textures, studio lighting with crisp rim light separating the clothing from the green screen, commercial catalog quality, sharp focus. IMPORTANT: Absolutely NO text, NO labels, NO words, NO captions, NO banners, clean pure photography only.",
  },
  {
    id: "male_17_micro_check_investigative_jacket",
    name: "Olive Micro-Check Field Sports Jacket",
    gender: "male",
    category: "casual",
    prompt:
      "Rugged tailored olive and charcoal micro-check wool sports jacket with leather buttons, dark indigo chambray shirt, and dark charcoal wool trousers",
    samPrompt: "clothing, jacket, sports jacket, blazer, shirt, trousers",
    imageUrl: "/assets/wardrobe/generic/male_17_micro_check_investigative_jacket.jpg",
    description: "On-location investigative correspondent sports jacket in rugged olive check.",
    cleanGenPrompt:
      "A professional fashion multi-view technical reference plate showing a men's field sports jacket displayed on an invisible 3D ghost mannequin (NO human head, NO face, NO plastic mannequin skin, only the tailored floating clothing itself). The image is divided into 4 clean vertical subpanels side-by-side against a seamless solid green chroma wall studio backdrop (#00FF00 green screen): Panel 1 (left): Full Front View of an olive and charcoal micro-check sports jacket, indigo chambray shirt, and charcoal wool trousers. Panel 2: Left Side Profile View showing bellowed field patch pockets and throat latch detail. Panel 3: Rear Back View showing bi-swing action shoulder pleats for movement. Panel 4 (right): Detailed macro close-up of woven leather buttons, micro-check wool pattern, and denim chambray weave. Ultra-photorealistic fabric textures, studio lighting with crisp rim light separating the clothing from the green screen, commercial catalog quality, sharp focus. IMPORTANT: Absolutely NO text, NO labels, NO words, NO captions, NO banners, clean pure photography only.",
  },
  {
    id: "male_18_plum_silk_blend_suit",
    name: "Deep Plum Wool-Silk Evening Suit",
    gender: "male",
    category: "gala",
    prompt:
      "Sophisticated deep plum wine wool-silk blend 2-piece suit with black satin peak lapels, black dress shirt, and black silk skinny tie",
    samPrompt: "clothing, suit, jacket, plum suit, shirt, tie, trousers",
    imageUrl: "/assets/wardrobe/generic/male_18_plum_silk_blend_suit.jpg",
    description: "Contemporary red-carpet evening suit in luminous deep plum wool-silk.",
    cleanGenPrompt:
      "A professional fashion multi-view technical reference plate showing a men's plum evening suit displayed on an invisible 3D ghost mannequin (NO human head, NO face, NO plastic mannequin skin, only the tailored floating clothing itself). The image is divided into 4 clean vertical subpanels side-by-side against a seamless solid green chroma wall studio backdrop (#00FF00 green screen): Panel 1 (left): Full Front View of a deep plum wool-silk suit jacket, matching trousers, black dress shirt, and black silk tie. Panel 2: Left Side Profile View showing glowing plum sheen and slim tailored trousers. Panel 3: Rear Back View showing dual side vents and contoured back seam. Panel 4 (right): Detailed macro close-up of deep plum fabric sheen, black satin lapel piping, and black silk necktie. Ultra-photorealistic fabric textures, studio lighting with crisp rim light separating the clothing from the green screen, commercial catalog quality, sharp focus. IMPORTANT: Absolutely NO text, NO labels, NO words, NO captions, NO banners, clean pure photography only.",
  },
  {
    id: "male_19_monochrome_all_black_suit",
    name: "Monochrome All-Black Modern Minimalist Suit",
    gender: "male",
    category: "techwear",
    prompt:
      "Sleek minimalist all-black wool-stretch 2-piece suit with slim notch lapels, matte black dress shirt, matte black silk slim tie, and matte black trousers",
    samPrompt: "clothing, suit, jacket, black suit, shirt, tie, trousers",
    imageUrl: "/assets/wardrobe/generic/male_19_monochrome_all_black_suit.jpg",
    description: "Stealth Silicon Valley tech titan look in tonal architectural matte black.",
    cleanGenPrompt:
      "A professional fashion multi-view technical reference plate showing a men's all-black suit displayed on an invisible 3D ghost mannequin (NO human head, NO face, NO plastic mannequin skin, only the tailored floating clothing itself). The image is divided into 4 clean vertical subpanels side-by-side against a seamless solid green chroma wall studio backdrop (#00FF00 green screen): Panel 1 (left): Full Front View of an architectural monochrome all-black suit, matte black shirt, black slim tie, and black trousers. Panel 2: Left Side Profile View showing ultra-clean minimalist lines and concealed cuff buttons. Panel 3: Rear Back View showing clean ventless silhouette and precise shoulder line. Panel 4 (right): Detailed macro close-up of subtle contrast between matte wool jacket, cotton poplin shirt, and silk tie textures. Ultra-photorealistic fabric textures, studio lighting with crisp rim light separating the clothing from the green screen, commercial catalog quality, sharp focus. IMPORTANT: Absolutely NO text, NO labels, NO words, NO captions, NO banners, clean pure photography only.",
  },
  {
    id: "male_20_grandmaster_white_dinner_jacket",
    name: "Ivory White Tropical Wool Dinner Jacket",
    gender: "male",
    category: "gala",
    prompt:
      "Commanding ivory white tropical wool 1-button dinner jacket with silk grosgrain shawl collar, black tuxedo trousers, pleated tuxedo shirt, and black satin bow tie",
    samPrompt: "clothing, dinner jacket, white jacket, tuxedo, bow tie, trousers",
    imageUrl: "/assets/wardrobe/generic/male_20_grandmaster_white_dinner_jacket.jpg",
    description: "Classic Monte Carlo gala white dinner jacket with contrasting black bow tie and trousers.",
    cleanGenPrompt:
      "A professional fashion multi-view technical reference plate showing a men's white dinner jacket displayed on an invisible 3D ghost mannequin (NO human head, NO face, NO plastic mannequin skin, only the tailored floating clothing itself). The image is divided into 4 clean vertical subpanels side-by-side against a seamless solid green chroma wall studio backdrop (#00FF00 green screen): Panel 1 (left): Full Front View of an ivory white shawl-collar dinner jacket, black tuxedo trousers, pleated white shirt, and black bow tie. Panel 2: Left Side Profile View showing continuous ivory shawl lapel roll and black trouser braid. Panel 3: Rear Back View showing clean single vent ivory wool back. Panel 4 (right): Detailed macro close-up of ivory tropical wool weave, silk grosgrain shawl edge, and black satin bow tie. Ultra-photorealistic fabric textures, studio lighting with crisp rim light separating the clothing from the green screen, commercial catalog quality, sharp focus. IMPORTANT: Absolutely NO text, NO labels, NO words, NO captions, NO banners, clean pure photography only.",
  },
  {
    id: "male_21_oxford_buttondown_chinos",
    name: "Classic Blue Oxford Button-Down & Chinos",
    gender: "male",
    category: "casual",
    prompt:
      "Classic light blue Oxford cotton button-down shirt with rolled sleeves, open collar, dark brown leather belt, and tailored stone-beige pleated chinos",
    samPrompt: "clothing, shirt, button-down shirt, trousers, chinos, pants, belt",
    imageUrl: "/assets/wardrobe/generic/male_21_oxford_buttondown_chinos.jpg",
    description: "Smart-casual rolled-sleeve light blue Oxford button-down with tailored pleated stone chinos.",
    cleanGenPrompt:
      "A professional fashion multi-view technical reference plate showing a men's casual outfit displayed on an invisible 3D ghost mannequin (NO human head, NO face, NO plastic mannequin skin, only the tailored floating clothing itself). The outfit is whole and complete with both top and bottom garments: a tailored light blue Oxford cotton button-down shirt with neatly rolled sleeves to the forearms, open collar, dark brown leather belt, and tailored stone-beige pleated chinos. The image is divided into 4 clean vertical subpanels side-by-side against a seamless solid green chroma wall studio backdrop (#00FF00 green screen): Panel 1 (left): Full Front View of the complete outfit with light blue Oxford shirt tucked into stone beige chinos with brown leather belt. Panel 2: Left Side Profile View showing the rolled sleeve cuffs and slim tapered chino crease. Panel 3: Rear Back View showing the shirt box pleat, rear yoke, and clean chino back pockets. Panel 4 (right): Single seamless vertical macro close-up of mother-of-pearl buttons, Oxford cotton basketweave texture, and brass belt buckle. Ultra-photorealistic fabric textures, studio lighting with crisp rim light separating the clothing from the green screen, commercial catalog quality, sharp focus. IMPORTANT: Absolutely NO text, NO labels, NO numbers, NO words, NO captions, NO banners, clean pure photography only.",
  },
  {
    id: "male_22_chambray_workshirt_trousers",
    name: "Indigo Chambray Button-Down & Charcoal Slacks",
    gender: "male",
    category: "casual",
    prompt:
      "Washed indigo blue chambray long-sleeve button-down shirt with dual flap chest pockets, rich chestnut leather belt, and tailored charcoal grey flat-front trousers",
    samPrompt: "clothing, shirt, chambray shirt, trousers, slacks, pants, belt",
    imageUrl: "/assets/wardrobe/generic/male_22_chambray_workshirt_trousers.jpg",
    description: "Modern artisanal casual tailored indigo chambray shirt with charcoal wool trousers.",
    cleanGenPrompt:
      "A professional fashion multi-view technical reference plate showing a men's casual outfit displayed on an invisible 3D ghost mannequin (NO human head, NO face, NO plastic mannequin skin, only the tailored floating clothing itself). The outfit is whole and complete with both top and bottom garments: a washed indigo blue chambray long-sleeve button-down shirt with dual flap chest pockets, buttoned cuffs, a rich chestnut brown leather belt, and tailored charcoal grey flat-front wool-blend trousers. The image is divided into 4 clean vertical subpanels side-by-side against a seamless solid green chroma wall studio backdrop (#00FF00 green screen): Panel 1 (left): Full Front View of the complete outfit with indigo chambray shirt tucked into charcoal trousers with brown leather belt. Panel 2: Left Side Profile View showing long sleeves, chest pocket profile, and straight trouser silhouette. Panel 3: Rear Back View showing the back shirt shoulder yoke, center pleat, and tailored back of the charcoal trousers. Panel 4 (right): Single seamless vertical macro close-up of white contrast stitching on the indigo chambray pocket, marbled horn buttons, and aged brass belt buckle. Ultra-photorealistic fabric textures, studio lighting with crisp rim light separating the clothing from the green screen, commercial catalog quality, sharp focus. IMPORTANT: Absolutely NO text, NO labels, NO numbers, NO words, NO captions, NO banners, clean pure photography only.",
  },
  {
    id: "male_23_linen_camp_collar_trousers",
    name: "Sand Linen Camp-Collar Shirt & Cream Trousers",
    gender: "male",
    category: "casual",
    prompt:
      "Relaxed sand-tan breathable linen camp-collar short-sleeve shirt with open notch collar, braided brown leather belt, and relaxed cream white linen-blend trousers",
    samPrompt: "clothing, shirt, linen shirt, camp collar, trousers, pants, belt",
    imageUrl: "/assets/wardrobe/generic/male_23_linen_camp_collar_trousers.jpg",
    description: "Mediterranean summer relaxed sophistication in breathable sand linen camp collar shirt with cream trousers.",
    cleanGenPrompt:
      "A professional fashion multi-view technical reference plate showing a men's relaxed summer outfit displayed on an invisible 3D ghost mannequin (NO human head, NO face, NO plastic mannequin skin, only the tailored floating clothing itself). The outfit is whole and complete with both top and bottom garments: a relaxed sand-tan breathable linen camp-collar short-sleeve shirt with an open notch collar and straight hem, braided woven brown leather belt, and relaxed-fit tailored cream white linen-blend trousers. The image is divided into 4 clean vertical subpanels side-by-side against a seamless solid green chroma wall studio backdrop (#00FF00 green screen): Panel 1 (left): Full Front View of the complete outfit with sand linen camp-collar shirt worn untucked or loosely tucked over cream linen trousers with braided belt visible. Panel 2: Left Side Profile View showing short sleeve drape, relaxed torso silhouette, and flowing linen trouser drape. Panel 3: Rear Back View showing the clean camp shirt shoulder yoke, straight hem, and tailored rear pockets of cream trousers. Panel 4 (right): Single seamless vertical macro close-up of natural slubby linen weave texture, real mother-of-pearl buttons, and braided brown leather belt weave. Ultra-photorealistic fabric textures, studio lighting with crisp rim light separating the clothing from the green screen, commercial catalog quality, sharp focus. IMPORTANT: Absolutely NO text, NO labels, NO numbers, NO words, NO captions, NO banners, clean pure photography only.",
  },
  {
    id: "male_24_knit_polo_chinos",
    name: "Forest Green Knit Polo & Camel Chinos",
    gender: "male",
    category: "casual",
    prompt:
      "Tailored fine-gauge forest green merino wool knit polo shirt with ribbed collar, brass buckle leather belt, and tailored camel-tan pleated chinos",
    samPrompt: "clothing, shirt, polo shirt, knit polo, trousers, chinos, pants, belt",
    imageUrl: "/assets/wardrobe/generic/male_24_knit_polo_chinos.jpg",
    description: "Smart-casual fine-gauge forest green merino knit polo with tailored camel pleated chinos.",
    cleanGenPrompt:
      "A professional fashion multi-view technical reference plate showing a men's smart-casual outfit displayed on an invisible 3D ghost mannequin (NO human head, NO face, NO plastic mannequin skin, only the tailored floating clothing itself). The outfit is whole and complete with both top and bottom garments: a tailored fine-gauge forest green merino wool knit polo shirt with a structured ribbed collar, three-button placket, short sleeves with ribbed bands, an aged brass buckle dark brown leather belt, and tailored camel-tan pleated cotton chinos. The image is divided into 4 clean vertical subpanels side-by-side against a seamless solid green chroma wall studio backdrop (#00FF00 green screen): Panel 1 (left): Full Front View of the complete outfit with forest green knit polo tucked into camel-tan chinos with brown leather belt. Panel 2: Left Side Profile View showing short ribbed sleeve band, slim torso silhouette, and clean tapered chino crease. Panel 3: Rear Back View showing the clean knit polo back panel and tailored rear welt pockets of the chinos. Panel 4 (right): Single seamless vertical macro close-up of fine-gauge forest green merino knit texture, mother-of-pearl buttons on the polo placket, and dark brown leather belt edge. Ultra-photorealistic fabric textures, studio lighting with crisp rim light separating the clothing from the green screen, commercial catalog quality, sharp focus. IMPORTANT: Absolutely NO text, NO labels, NO numbers, NO words, NO captions, NO banners, clean pure photography only.",
  },
  {
    id: "male_25_smart_casual_poplin_shirt",
    name: "Crisp White Poplin Shirt & Espresso Slacks",
    gender: "male",
    category: "executive",
    prompt:
      "Pristine crisp white cotton poplin dress shirt with open semi-spread collar, French cuffs with silver links, dark brown dress belt, and tailored espresso brown wool trousers",
    samPrompt: "clothing, shirt, dress shirt, poplin shirt, trousers, slacks, pants, belt",
    imageUrl: "/assets/wardrobe/generic/male_25_smart_casual_poplin_shirt.jpg",
    description: "Executive open-collar white poplin dress shirt with tailored espresso brown trousers and silver cufflinks.",
    cleanGenPrompt:
      "A professional fashion multi-view technical reference plate showing a men's sophisticated smart-casual dress shirt outfit displayed on an invisible 3D ghost mannequin (NO human head, NO face, NO plastic mannequin skin, only the tailored floating clothing itself). The outfit is whole and complete with both top and bottom garments: a pristine crisp white cotton poplin long-sleeve dress shirt with a structured semi-spread collar worn open (unbuttoned top collar, no tie), French cuffs with sleek silver cufflinks, a dark chocolate brown leather dress belt, and tailored espresso brown wool trousers with sharp front creases. The image is divided into 4 clean vertical subpanels side-by-side against a seamless solid green chroma wall studio backdrop (#00FF00 green screen): Panel 1 (left): Full Front View of the complete outfit with crisp white poplin shirt tucked into espresso brown trousers with leather belt. Panel 2: Left Side Profile View showing long sleeves with French cuff and cufflink detail, and sharp vertical trouser crease. Panel 3: Rear Back View showing the tailored back darting of the white shirt and clean welt pockets of the espresso trousers. Panel 4 (right): Single seamless vertical macro close-up of open spread collar stitching, brushed silver cufflink, and fine espresso brown wool weave. Ultra-photorealistic fabric textures, studio lighting with crisp rim light separating the clothing from the green screen, commercial catalog quality, sharp focus. IMPORTANT: Absolutely NO text, NO labels, NO numbers, NO words, NO captions, NO banners, clean pure photography only.",
  },
  {
    id: "male_26_utilitarian_field_shirt_cargo",
    name: "Olive Utility Field Shirt & Slate Cargo Slacks",
    gender: "male",
    category: "casual",
    prompt:
      "Rugged tailored olive green cotton twill long-sleeve field shirt with gusseted chest flap pockets and epaulets, webbed utility belt, and dark slate grey tailored cargo trousers",
    samPrompt: "clothing, shirt, field shirt, utility shirt, trousers, cargo pants, pants, belt",
    imageUrl: "/assets/wardrobe/generic/male_26_utilitarian_field_shirt_cargo.jpg",
    description: "Rugged on-assignment olive utility field shirt with tailored slate grey cargo slacks.",
    cleanGenPrompt:
      "A professional fashion multi-view technical reference plate showing a men's rugged utility outfit displayed on an invisible 3D ghost mannequin (NO human head, NO face, NO plastic mannequin skin, only the tailored floating clothing itself). The outfit is whole and complete with both top and bottom garments: a rugged tailored olive green cotton twill long-sleeve field shirt with gusseted chest flap pockets and shoulder epaulets, sleeves buttoned at the cuffs, a dark olive canvas utility belt with matte black buckle, and dark slate grey tailored slim cargo trousers with low-profile side thigh flap pockets. The image is divided into 4 clean vertical subpanels side-by-side against a seamless solid green chroma wall studio backdrop (#00FF00 green screen): Panel 1 (left): Full Front View of the complete outfit with olive utility shirt tucked into dark slate cargo trousers with utility belt. Panel 2: Left Side Profile View showing long sleeves, chest pocket bellow, and low-profile cargo pocket on the trouser thigh. Panel 3: Rear Back View showing the back shoulder yoke with ventilation pleat and rear flap pockets on trousers. Panel 4 (right): Single seamless vertical macro close-up of heavy olive twill weave, matte horn utility buttons, and reinforced cargo pocket bar-tack stitching. Ultra-photorealistic fabric textures, studio lighting with crisp rim light separating the clothing from the green screen, commercial catalog quality, sharp focus. IMPORTANT: Absolutely NO text, NO labels, NO numbers, NO words, NO captions, NO banners, clean pure photography only.",
  },
  {
    id: "male_27_cable_knit_sweater_shirt_slacks",
    name: "Oatmeal Cable-Knit Sweater & Navy Slacks",
    gender: "male",
    category: "casual",
    prompt:
      "Luxurious oatmeal cream wool cable-knit crewneck sweater layered over light blue collared dress shirt, dark brown leather belt, and dark navy blue tailored wool trousers",
    samPrompt: "clothing, sweater, cable knit, shirt, collar, trousers, slacks, pants, belt",
    imageUrl: "/assets/wardrobe/generic/male_27_cable_knit_sweater_shirt_slacks.jpg",
    description: "Refined smart-casual chunky oatmeal cable-knit sweater layered over collared shirt with navy wool trousers.",
    cleanGenPrompt:
      "A professional fashion multi-view technical reference plate showing a men's layered smart-casual autumn outfit displayed on an invisible 3D ghost mannequin (NO human head, NO face, NO plastic mannequin skin, only the tailored floating clothing itself). The outfit is whole and complete with both top and bottom garments: a chunky oatmeal-cream wool-cashmere cable-knit crewneck sweater worn layered over a light blue collared dress shirt (with the neat collar tips visible at the neck and cuffs peeking out at wrists), a dark brown leather belt, and tailored dark navy blue wool dress slacks with sharp front creases. The image is divided into 4 clean vertical subpanels side-by-side against a seamless solid green chroma wall studio backdrop (#00FF00 green screen): Panel 1 (left): Full Front View of the complete outfit with oatmeal cable-knit sweater layered over light blue shirt collar, navy wool slacks, and brown belt. Panel 2: Left Side Profile View showing rich 3D cable-knit texture profile and straight tailored trouser silhouette. Panel 3: Rear Back View showing the continuous cable-knit pattern across the back and clean rear trouser cut. Panel 4 (right): Single seamless vertical macro close-up of interlocking cable-knit stitches, soft merino wool fibers, and light blue Oxford shirt collar tip. Ultra-photorealistic fabric textures, studio lighting with crisp rim light separating the clothing from the green screen, commercial catalog quality, sharp focus. IMPORTANT: Absolutely NO text, NO labels, NO numbers, NO words, NO captions, NO banners, clean pure photography only.",
  },

  // ==========================================
  // 🧥 UNISEX ATTIRES (20) — Whole Ensembles (Top + Bottom)
  // ==========================================
  {
    id: "uni_01_classic_trench_coat",
    name: "Classic Beige Gabardine Trench & Charcoal Trousers",
    gender: "unisex",
    category: "executive",
    prompt:
      "Heritage double-breasted beige cotton gabardine trench coat belted at the waist, layered over a crisp collared shirt and tailored charcoal wool trousers",
    samPrompt: "clothing, trench coat, coat, jacket, belt, trousers, pants",
    imageUrl: "/assets/wardrobe/generic/uni_01_classic_trench_coat.jpg",
    description: "Iconic investigative journalist trench coat ensemble with tailored charcoal trousers.",
    cleanGenPrompt:
      "A professional fashion multi-view technical reference plate showing a complete unisex trench coat outfit displayed on an invisible 3D ghost mannequin (NO human head, NO face, NO plastic mannequin skin, only the tailored floating clothing itself). The outfit is whole and complete with both top and bottom garments: a double-breasted beige cotton gabardine trench coat belted at the waist, crisp collared shirt, and matching tailored charcoal wool trousers. The image is divided into 4 clean vertical subpanels side-by-side against a seamless solid green chroma wall studio backdrop (#00FF00 green screen): Panel 1 (left): Full Front View of the complete trench coat outfit with belted waist, storm flap, horn buttons, and straight charcoal trousers. Panel 2: Left Side Profile View showing sleeve straps with buckles and clean trouser crease. Panel 3: Rear Back View showing storm shield yoke, deep center pleat, and tailored trouser back. Panel 4 (right): Single seamless vertical macro close-up of tortoiseshell buckle, brass D-rings, and waterproof gabardine twill weave. Ultra-photorealistic fabric textures, studio lighting with crisp rim light separating the clothing from the green screen, commercial catalog quality, sharp focus. IMPORTANT: Absolutely NO text, NO labels, NO numbers, NO words, NO captions, NO banners, clean pure photography only.",
  },
  {
    id: "uni_02_black_moto_leather",
    name: "Matte Black Moto Leather & Waxed Moto Pants",
    gender: "unisex",
    category: "edgy",
    prompt:
      "Premium heavy-duty matte black cowhide leather biker jacket with asymmetric silver chrome zippers, snap lapels, and waist belt, paired with matching slim-fit black moto trousers with ribbed articulated knee panels",
    samPrompt: "clothing, jacket, leather jacket, biker jacket, trousers, pants, jeans",
    imageUrl: "/assets/wardrobe/generic/uni_02_black_moto_leather.jpg",
    description: "Rebellious high-energy whole moto outfit with heavy chrome zippers and ribbed moto trousers.",
    cleanGenPrompt:
      "A professional fashion multi-view technical reference plate showing a complete unisex leather moto outfit displayed on an invisible 3D ghost mannequin (NO human head, NO face, NO plastic mannequin skin, only the tailored floating clothing itself). The outfit is whole and complete with both top and bottom garments: a matte black cowhide leather biker jacket with asymmetric chrome zippers and belt, paired with matching slim-fit black moto trousers with ribbed knee panels. The image is divided into 4 clean vertical subpanels side-by-side against a seamless solid green chroma wall studio backdrop (#00FF00 green screen): Panel 1 (left): Full Front View of the complete moto outfit with black leather jacket and matching black moto trousers. Panel 2: Left Side Profile View showing zippered sleeve cuffs and articulated knee panels. Panel 3: Rear Back View showing bi-swing jacket shoulder pleats and clean back trouser pockets. Panel 4 (right): Single seamless vertical macro close-up of heavy silver YKK zippers, chrome snap hardware, and pebbled leather grain. Ultra-photorealistic fabric textures, studio lighting with crisp rim light separating the clothing from the green screen, commercial catalog quality, sharp focus. IMPORTANT: Absolutely NO text, NO labels, NO numbers, NO words, NO captions, NO banners, clean pure photography only.",
  },
  {
    id: "uni_03_tactical_tech_bomber",
    name: "Weatherproof Tactical Tech Bomber & Cargo Pants",
    gender: "unisex",
    category: "techwear",
    prompt:
      "Dark charcoal matte technical windbreaker jacket with waterproof taped seams, FIDLOCK magnetic chest buckle, paired with matching dark charcoal technical cargo pants with modular utility pockets",
    samPrompt: "clothing, jacket, bomber, cargo pants, trousers, techwear",
    imageUrl: "/assets/wardrobe/generic/uni_03_tactical_tech_bomber.jpg",
    description: "Futuristic tech journalism whole ensemble with waterproof ripstop nylon jacket and modular cargo pants.",
    cleanGenPrompt:
      "A professional fashion multi-view technical reference plate showing a complete unisex techwear outfit displayed on an invisible 3D ghost mannequin (NO human head, NO face, NO plastic mannequin skin, only the tailored floating clothing itself). The outfit is whole and complete with both top and bottom garments: a dark charcoal matte tech jacket with FIDLOCK magnetic strap and matching technical cargo trousers with zippered pockets. The image is divided into 4 clean vertical subpanels side-by-side against a seamless solid green chroma wall studio backdrop (#00FF00 green screen): Panel 1 (left): Full Front View of the complete tactical tech outfit with jacket and modular cargo pants. Panel 2: Left Side Profile View showing sleeve utility pocket and articulated cargo leg bellows. Panel 3: Rear Back View showing modular sling strap and reinforced trouser seat. Panel 4 (right): Single seamless vertical macro close-up of matte black magnetic buckle, rubberized zipper pulls, and ripstop grid texture. Ultra-photorealistic fabric textures, studio lighting with crisp rim light separating the clothing from the green screen, commercial catalog quality, sharp focus. IMPORTANT: Absolutely NO text, NO labels, NO numbers, NO words, NO captions, NO banners, clean pure photography only.",
  },
  {
    id: "uni_04_cashmere_chunky_knit",
    name: "Mustard Chunky Cashmere Knit & Wool Trousers",
    gender: "unisex",
    category: "casual",
    prompt:
      "Cozy oversized mustard yellow chunky cable-knit cashmere sweater worn over a crisp white collared shirt, paired with tailored relaxed-fit dark grey wool flannel trousers",
    samPrompt: "clothing, sweater, knit, knitwear, shirt, trousers, pants",
    imageUrl: "/assets/wardrobe/generic/uni_04_cashmere_chunky_knit.jpg",
    description: "Warm, accessible morning talk-show whole ensemble with chunky mustard knit and tailored flannel trousers.",
    cleanGenPrompt:
      "A professional fashion multi-view technical reference plate showing a complete unisex knitwear outfit displayed on an invisible 3D ghost mannequin (NO human head, NO face, NO plastic mannequin skin, only the tailored floating clothing itself). The outfit is whole and complete with both top and bottom garments: an oversized mustard yellow chunky cable-knit cashmere sweater layered over a white shirt, paired with dark grey tailored wool trousers. The image is divided into 4 clean vertical subpanels side-by-side against a seamless solid green chroma wall studio backdrop (#00FF00 green screen): Panel 1 (left): Full Front View of the complete outfit with mustard cable sweater, white collar, and dark grey trousers. Panel 2: Left Side Profile View showing thick ribbed cuffs and relaxed trouser silhouette. Panel 3: Rear Back View showing continuous braided cable back and tailored trouser pockets. Panel 4 (right): Single seamless vertical macro close-up of heavy-gauge twisted cashmere yarn and flannel trouser fabric. Ultra-photorealistic fabric textures, studio lighting with crisp rim light separating the clothing from the green screen, commercial catalog quality, sharp focus. IMPORTANT: Absolutely NO text, NO labels, NO numbers, NO words, NO captions, NO banners, clean pure photography only.",
  },
  {
    id: "uni_05_minimal_ribbed_turtleneck",
    name: "Architectural Black Turtleneck & Minimalist Pants",
    gender: "unisex",
    category: "techwear",
    prompt:
      "Sleek architectural matte black fine-ribbed merino wool turtleneck sweater paired with matching tailored minimalist black flat-front trousers",
    samPrompt: "clothing, turtleneck, sweater, trousers, pants, black trousers",
    imageUrl: "/assets/wardrobe/generic/uni_05_minimal_ribbed_turtleneck.jpg",
    description: "Silicon Valley tech visionary whole minimalist ensemble in architectural matte black merino wool and flat-front trousers.",
    cleanGenPrompt:
      "A professional fashion multi-view technical reference plate showing a complete unisex minimalist outfit displayed on an invisible 3D ghost mannequin (NO human head, NO face, NO plastic mannequin skin, only the tailored floating clothing itself). The outfit is whole and complete with both top and bottom garments: a seamless matte black fine-ribbed merino wool turtleneck sweater paired with tailored black flat-front trousers. The image is divided into 4 clean vertical subpanels side-by-side against a seamless solid green chroma wall studio backdrop (#00FF00 green screen): Panel 1 (left): Full Front View of the complete all-black minimalist outfit with ribbed turtleneck and straight tailored trousers. Panel 2: Left Side Profile View showing sculpted neck fold, tapered sleeve, and clean trouser leg line. Panel 3: Rear Back View showing vertical ribbed spine lines and tailored trouser back. Panel 4 (right): Single seamless vertical macro close-up of fine 18-gauge merino wool ribbing and matte trouser waist finish. Ultra-photorealistic fabric textures, studio lighting with crisp rim light separating the clothing from the green screen, commercial catalog quality, sharp focus. IMPORTANT: Absolutely NO text, NO labels, NO numbers, NO words, NO captions, NO banners, clean pure photography only.",
  },
  {
    id: "uni_06_cyber_neon_bomber",
    name: "Cyber Neon-Trim Bomber & Techwear Joggers",
    gender: "unisex",
    category: "edgy",
    prompt:
      "Futuristic gunmetal metallic nylon bomber jacket with glowing ultraviolet purple neon interior lining, paired with matching black technical jogger trousers with reflective neon piping and FIDLOCK ankle cuffs",
    samPrompt: "clothing, bomber, jacket, cyberpunk, streetwear, joggers, pants",
    imageUrl: "/assets/wardrobe/generic/uni_06_cyber_neon_bomber.jpg",
    description: "Esports & AI futuristic whole outfit with reflective gunmetal bomber and neon-piped tech joggers.",
    cleanGenPrompt:
      "A professional fashion multi-view technical reference plate showing a complete unisex cyberpunk streetwear outfit displayed on an invisible 3D ghost mannequin (NO human head, NO face, NO plastic mannequin skin, only the tailored floating clothing itself). The outfit is whole and complete with both top and bottom garments: a gunmetal metallic nylon bomber with glowing ultraviolet purple lining, paired with black technical jogger pants with reflective neon accents. The image is divided into 4 clean vertical subpanels side-by-side against a seamless solid green chroma wall studio backdrop (#00FF00 green screen): Panel 1 (left): Full Front View of the complete cyberpunk outfit with metallic bomber and matching tech joggers. Panel 2: Left Side Profile View showing iridescent shoulder panel and articulated jogger knee seams. Panel 3: Rear Back View showing reflective back piping and tapered ankle cuffs. Panel 4 (right): Single seamless vertical macro close-up of glowing ultraviolet neon lining and ripstop nylon texture. Ultra-photorealistic fabric textures, studio lighting with crisp rim light separating the clothing from the green screen, commercial catalog quality, sharp focus. IMPORTANT: Absolutely NO text, NO labels, NO numbers, NO words, NO captions, NO banners, clean pure photography only.",
  },
  {
    id: "uni_07_oversized_slouchy_blazer",
    name: "Relaxed Charcoal Slouchy Blazer & Wide Pants",
    gender: "unisex",
    category: "casual",
    prompt:
      "Contemporary oversized charcoal grey wool blazer with exaggerated dropped shoulders, low two-button closure, paired with matching relaxed wide-leg charcoal pleated wool trousers",
    samPrompt: "clothing, suit, blazer, jacket, oversized blazer, trousers, wide leg pants",
    imageUrl: "/assets/wardrobe/generic/uni_07_oversized_slouchy_blazer.jpg",
    description: "Effortless high-fashion Scandinavian tailoring in relaxed oversized charcoal wool suit with wide-leg trousers.",
    cleanGenPrompt:
      "A professional fashion multi-view technical reference plate showing a complete unisex relaxed suit displayed on an invisible 3D ghost mannequin (NO human head, NO face, NO plastic mannequin skin, only the tailored floating clothing itself). The outfit is whole and complete with both top and bottom garments: an oversized charcoal grey wool blazer paired with matching wide-leg pleated wool trousers. The image is divided into 4 clean vertical subpanels side-by-side against a seamless solid green chroma wall studio backdrop (#00FF00 green screen): Panel 1 (left): Full Front View of the complete relaxed suit with oversized blazer and wide-leg trousers. Panel 2: Left Side Profile View showing generous boxy drape and sweeping trouser volume. Panel 3: Rear Back View showing clean wide jacket back and tailored trouser seat. Panel 4 (right): Single seamless vertical macro close-up of matte horn buttons, charcoal wool flannel weave, and deep trouser pleats. Ultra-photorealistic fabric textures, studio lighting with crisp rim light separating the clothing from the green screen, commercial catalog quality, sharp focus. IMPORTANT: Absolutely NO text, NO labels, NO numbers, NO words, NO captions, NO banners, clean pure photography only.",
  },
  {
    id: "uni_08_heritage_denim_jacket",
    name: "Heavyweight Selvedge Denim Trucker & Jeans",
    gender: "unisex",
    category: "casual",
    prompt:
      "Classic heavyweight 14oz washed indigo selvedge denim trucker jacket with plush sherpa fleece collar, paired with matching washed indigo selvedge denim jeans with contrast amber stitching",
    samPrompt: "clothing, jacket, denim jacket, jeans, denim, trucker jacket",
    imageUrl: "/assets/wardrobe/generic/uni_08_heritage_denim_jacket.jpg",
    description: "Authentic Americana complete denim ensemble with sherpa-collar trucker jacket and selvedge jeans.",
    cleanGenPrompt:
      "A professional fashion multi-view technical reference plate showing a complete unisex denim outfit displayed on an invisible 3D ghost mannequin (NO human head, NO face, NO plastic mannequin skin, only the tailored floating clothing itself). The outfit is whole and complete with both top and bottom garments: a washed indigo denim trucker jacket with cream sherpa collar, paired with matching indigo selvedge denim jeans. The image is divided into 4 clean vertical subpanels side-by-side against a seamless solid green chroma wall studio backdrop (#00FF00 green screen): Panel 1 (left): Full Front View of the complete denim outfit with trucker jacket and straight-leg jeans. Panel 2: Left Side Profile View showing copper rivets, waist tabs, and selvedge jean outseam. Panel 3: Rear Back View showing classic denim back yoke and rear jean pockets. Panel 4 (right): Single seamless vertical macro close-up of embossed brass buttons, amber twin-needle stitching, and textured 14oz denim twill. Ultra-photorealistic fabric textures, studio lighting with crisp rim light separating the clothing from the green screen, commercial catalog quality, sharp focus. IMPORTANT: Absolutely NO text, NO labels, NO numbers, NO words, NO captions, NO banners, clean pure photography only.",
  },
  {
    id: "uni_09_stealth_utility_vest",
    name: "Modular Tactical Utility Vest & Cargo Pants",
    gender: "unisex",
    category: "techwear",
    prompt:
      "Tactical matte black Cordura utility vest layered over a dark grey compression top, paired with matching tactical black ripstop cargo trousers with modular leg straps",
    samPrompt: "clothing, vest, utility vest, tactical vest, cargo pants, trousers",
    imageUrl: "/assets/wardrobe/generic/uni_09_stealth_utility_vest.jpg",
    description: "Cyber and investigative field journalism whole tactical outfit with modular webbed vest and cargo trousers.",
    cleanGenPrompt:
      "A professional fashion multi-view technical reference plate showing a complete unisex tactical utility outfit displayed on an invisible 3D ghost mannequin (NO human head, NO face, NO plastic mannequin skin, only the tailored floating clothing itself). The outfit is whole and complete with both top and bottom garments: a matte black tactical utility vest over a dark grey long-sleeve, paired with tactical black ripstop cargo trousers. The image is divided into 4 clean vertical subpanels side-by-side against a seamless solid green chroma wall studio backdrop (#00FF00 green screen): Panel 1 (left): Full Front View of the complete tactical outfit with multi-pocket vest and cargo pants. Panel 2: Left Side Profile View showing side release buckles, carabiners, and leg cargo bellows. Panel 3: Rear Back View showing large rear vest pouch and reinforced cargo trouser seat. Panel 4 (right): Single seamless vertical macro close-up of Cordura nylon weave, matte black D-rings, and heavy nylon webbing. Ultra-photorealistic fabric textures, studio lighting with crisp rim light separating the clothing from the green screen, commercial catalog quality, sharp focus. IMPORTANT: Absolutely NO text, NO labels, NO numbers, NO words, NO captions, NO banners, clean pure photography only.",
  },
  {
    id: "uni_10_hooded_parka_storm",
    name: "Arctic Storm Olive Fishtail Parka & Field Pants",
    gender: "unisex",
    category: "casual",
    prompt:
      "Weather-resistant matte olive drab cotton-nylon fishtail parka with high funnel storm collar, drawstring waist, paired with matching olive drab weatherproof field trousers",
    samPrompt: "clothing, parka, coat, jacket, field pants, trousers, outerwear",
    imageUrl: "/assets/wardrobe/generic/uni_10_hooded_parka_storm.jpg",
    description: "Extreme weather correspondent whole field outfit in military-grade olive cotton-nylon with fishtail coat and field pants.",
    cleanGenPrompt:
      "A professional fashion multi-view technical reference plate showing a complete unisex extreme weather outfit displayed on an invisible 3D ghost mannequin (NO human head, NO face, NO plastic mannequin skin, only the tailored floating clothing itself). The outfit is whole and complete with both top and bottom garments: an olive drab fishtail parka with storm collar, paired with matching olive field trousers. The image is divided into 4 clean vertical subpanels side-by-side against a seamless solid green chroma wall studio backdrop (#00FF00 green screen): Panel 1 (left): Full Front View of the complete storm outfit with olive parka and matching field trousers. Panel 2: Left Side Profile View showing parka drape, waist drawstring, and straight field pants. Panel 3: Rear Back View showing classic split fishtail hem and reinforced trouser seat. Panel 4 (right): Single seamless vertical macro close-up of heavy brass two-way zipper, leather drawstring cord stoppers, and water-repellent shell. Ultra-photorealistic fabric textures, studio lighting with crisp rim light separating the clothing from the green screen, commercial catalog quality, sharp focus. IMPORTANT: Absolutely NO text, NO labels, NO numbers, NO words, NO captions, NO banners, clean pure photography only.",
  },
  {
    id: "uni_11_cream_fisherman_sweater",
    name: "Cream Fisherman Cable Cardigan & Navy Trousers",
    gender: "unisex",
    category: "casual",
    prompt:
      "Heritage heavyweight natural cream wool Aran fisherman cardigan with shawl collar and leather buttons, paired with tailored navy blue wool-blend trousers",
    samPrompt: "clothing, sweater, cardigan, knitwear, trousers, pants",
    imageUrl: "/assets/wardrobe/generic/uni_11_cream_fisherman_sweater.jpg",
    description: "Classic coastal reporting whole outfit in unbleached cream wool Aran cardigan and tailored navy trousers.",
    cleanGenPrompt:
      "A professional fashion multi-view technical reference plate showing a complete unisex knitwear outfit displayed on an invisible 3D ghost mannequin (NO human head, NO face, NO plastic mannequin skin, only the tailored floating clothing itself). The outfit is whole and complete with both top and bottom garments: a natural cream wool shawl-collar cable cardigan with leather buttons, paired with tailored navy blue trousers. The image is divided into 4 clean vertical subpanels side-by-side against a seamless solid green chroma wall studio backdrop (#00FF00 green screen): Panel 1 (left): Full Front View of the complete outfit with cream cable cardigan and tailored navy trousers. Panel 2: Left Side Profile View showing thick ribbed cuffs and crisp trouser crease. Panel 3: Rear Back View showing full lattice cable patterns across back panel and clean trouser back. Panel 4 (right): Single seamless vertical macro close-up of woven leather knot buttons and three-dimensional wool cable stitches. Ultra-photorealistic fabric textures, studio lighting with crisp rim light separating the clothing from the green screen, commercial catalog quality, sharp focus. IMPORTANT: Absolutely NO text, NO labels, NO numbers, NO words, NO captions, NO banners, clean pure photography only.",
  },
  {
    id: "uni_12_japanese_noragi_kimono_jacket",
    name: "Indigo Sashiko Noragi Jacket & Hakama Trousers",
    gender: "unisex",
    category: "casual",
    prompt:
      "Artisanal deep indigo Japanese sashiko stitched noragi jacket with crossover tie front, paired with matching deep indigo cropped hakama-style pleated trousers",
    samPrompt: "clothing, jacket, noragi, kimono jacket, trousers, pants",
    imageUrl: "/assets/wardrobe/generic/uni_12_japanese_noragi_kimono_jacket.jpg",
    description: "Art and culture correspondent whole artisanal outfit in indigo sashiko noragi jacket and cropped hakama trousers.",
    cleanGenPrompt:
      "A professional fashion multi-view technical reference plate showing a complete unisex artisanal outfit displayed on an invisible 3D ghost mannequin (NO human head, NO face, NO plastic mannequin skin, only the tailored floating clothing itself). The outfit is whole and complete with both top and bottom garments: an indigo sashiko noragi crossover jacket with tie cords, paired with matching indigo cropped pleated trousers. The image is divided into 4 clean vertical subpanels side-by-side against a seamless solid green chroma wall studio backdrop (#00FF00 green screen): Panel 1 (left): Full Front View of the complete outfit with sashiko noragi jacket and wide cropped trousers. Panel 2: Left Side Profile View showing wide kimono sleeves and pleated trouser silhouette. Panel 3: Rear Back View showing geometric white sashiko back embroidery and clean trouser lines. Panel 4 (right): Single seamless vertical macro close-up of textured rice-grain sashiko stitching on deep indigo cotton. Ultra-photorealistic fabric textures, studio lighting with crisp rim light separating the clothing from the green screen, commercial catalog quality, sharp focus. IMPORTANT: Absolutely NO text, NO labels, NO numbers, NO words, NO captions, NO banners, clean pure photography only.",
  },
  {
    id: "uni_13_varsity_letterman_jacket",
    name: "Collegiate Varsity Jacket & Flannel Trousers",
    gender: "unisex",
    category: "casual",
    prompt:
      "Navy blue melton wool varsity jacket with cream leather sleeves and striped knit collar, paired with tailored cream wool-flannel trousers with navy side piping",
    samPrompt: "clothing, jacket, varsity jacket, trousers, pants",
    imageUrl: "/assets/wardrobe/generic/uni_13_varsity_letterman_jacket.jpg",
    description: "Youth culture and sports broadcast whole ensemble with wool-leather varsity jacket and matching piped trousers.",
    cleanGenPrompt:
      "A professional fashion multi-view technical reference plate showing a complete unisex collegiate varsity outfit displayed on an invisible 3D ghost mannequin (NO human head, NO face, NO plastic mannequin skin, only the tailored floating clothing itself). The outfit is whole and complete with both top and bottom garments: a navy wool varsity jacket with cream leather sleeves, paired with cream wool-flannel trousers with navy side stripe. The image is divided into 4 clean vertical subpanels side-by-side against a seamless solid green chroma wall studio backdrop (#00FF00 green screen): Panel 1 (left): Full Front View of the complete varsity outfit with jacket and tailored trousers. Panel 2: Left Side Profile View showing leather sleeve profile and piped trouser outseam. Panel 3: Rear Back View showing navy wool back, striped waistband, and clean trouser seat. Panel 4 (right): Single seamless vertical macro close-up of enameled snap buttons, pebbled leather sleeve, and wool flannel texture. Ultra-photorealistic fabric textures, studio lighting with crisp rim light separating the clothing from the green screen, commercial catalog quality, sharp focus. IMPORTANT: Absolutely NO text, NO labels, NO numbers, NO words, NO captions, NO banners, clean pure photography only.",
  },
  {
    id: "uni_14_shearling_aviator_jacket",
    name: "B-3 Leather Aviator Shearling & Wool Trousers",
    gender: "unisex",
    category: "edgy",
    prompt:
      "Distressed vintage brown leather B-3 aviator jacket with plush cream shearling fur collar, paired with heavy charcoal wool-blend trousers and leather belt",
    samPrompt: "clothing, jacket, aviator jacket, shearling, trousers, pants",
    imageUrl: "/assets/wardrobe/generic/uni_14_shearling_aviator_jacket.jpg",
    description: "Rugged high-altitude aviation whole outfit with heavy shearling B-3 jacket and charcoal wool trousers.",
    cleanGenPrompt:
      "A professional fashion multi-view technical reference plate showing a complete unisex winter flight outfit displayed on an invisible 3D ghost mannequin (NO human head, NO face, NO plastic mannequin skin, only the tailored floating clothing itself). The outfit is whole and complete with both top and bottom garments: a distressed brown leather B-3 flight jacket with cream shearling lining, paired with heavy charcoal wool trousers. The image is divided into 4 clean vertical subpanels side-by-side against a seamless solid green chroma wall studio backdrop (#00FF00 green screen): Panel 1 (left): Full Front View of the complete aviator outfit with shearling jacket and charcoal trousers. Panel 2: Left Side Profile View showing brass waist buckles, turned shearling cuffs, and straight trouser cut. Panel 3: Rear Back View showing reinforced leather seam taping and clean trouser back. Panel 4 (right): Single seamless vertical macro close-up of thick curly cream shearling wool, brass buckles, and aged patina leather. Ultra-photorealistic fabric textures, studio lighting with crisp rim light separating the clothing from the green screen, commercial catalog quality, sharp focus. IMPORTANT: Absolutely NO text, NO labels, NO numbers, NO words, NO captions, NO banners, clean pure photography only.",
  },
  {
    id: "uni_15_techwear_anorak_poncho",
    name: "Waterproof Black Anorak & Articulated Pants",
    gender: "unisex",
    category: "techwear",
    prompt:
      "Matte black technical storm anorak pullover with waterproof chest pocket and taped seams, paired with matching black articulated techwear trousers with zippered ankle gussets",
    samPrompt: "clothing, anorak, jacket, poncho, techwear, trousers, pants",
    imageUrl: "/assets/wardrobe/generic/uni_15_techwear_anorak_poncho.jpg",
    description: "Cyberpunk urban tech whole ensemble with waterproof anorak pullover and articulated technical trousers.",
    cleanGenPrompt:
      "A professional fashion multi-view technical reference plate showing a complete unisex techwear storm outfit displayed on an invisible 3D ghost mannequin (NO human head, NO face, NO plastic mannequin skin, only the tailored floating clothing itself). The outfit is whole and complete with both top and bottom garments: a matte black waterproof anorak pullover with storm hood, paired with matching black articulated techwear trousers. The image is divided into 4 clean vertical subpanels side-by-side against a seamless solid green chroma wall studio backdrop (#00FF00 green screen): Panel 1 (left): Full Front View of the complete techwear storm outfit with anorak and articulated trousers. Panel 2: Left Side Profile View showing ergonomic sleeve pleats and zippered trouser gussets. Panel 3: Rear Back View showing drop-tail jacket hem and reinforced trouser seat. Panel 4 (right): Single seamless vertical macro close-up of waterproof polyurethane zips and micro-ripstop fabric grid. Ultra-photorealistic fabric textures, studio lighting with crisp rim light separating the clothing from the green screen, commercial catalog quality, sharp focus. IMPORTANT: Absolutely NO text, NO labels, NO numbers, NO words, NO captions, NO banners, clean pure photography only.",
  },
  {
    id: "uni_16_grandpa_argyle_cardigan",
    name: "Argyle Wool Cardigan & Corduroy Trousers",
    gender: "unisex",
    category: "casual",
    prompt:
      "Retro forest green, burgundy, and mustard yellow diamond argyle pattern lambswool V-neck cardigan, paired with tailored warm brown wide-wale corduroy trousers",
    samPrompt: "clothing, sweater, cardigan, knitwear, corduroy, trousers, pants",
    imageUrl: "/assets/wardrobe/generic/uni_16_grandpa_argyle_cardigan.jpg",
    description: "Intelligent cozy retro journalism whole outfit with rich diamond argyle cardigan and warm corduroy trousers.",
    cleanGenPrompt:
      "A professional fashion multi-view technical reference plate showing a complete unisex retro academic outfit displayed on an invisible 3D ghost mannequin (NO human head, NO face, NO plastic mannequin skin, only the tailored floating clothing itself). The outfit is whole and complete with both top and bottom garments: a forest green and burgundy diamond argyle V-neck cardigan with tortoiseshell buttons, paired with tailored brown corduroy trousers. The image is divided into 4 clean vertical subpanels side-by-side against a seamless solid green chroma wall studio backdrop (#00FF00 green screen): Panel 1 (left): Full Front View of the complete outfit with argyle cardigan and corduroy trousers. Panel 2: Left Side Profile View showing ribbed cuffs, front cardigan pockets, and straight corduroy leg. Panel 3: Rear Back View showing solid green wool back and tailored trouser waist. Panel 4 (right): Single seamless vertical macro close-up of fuzzy lambswool fibers, tortoiseshell buttons, and corduroy rib ridges. Ultra-photorealistic fabric textures, studio lighting with crisp rim light separating the clothing from the green screen, commercial catalog quality, sharp focus. IMPORTANT: Absolutely NO text, NO labels, NO numbers, NO words, NO captions, NO banners, clean pure photography only.",
  },
  {
    id: "uni_17_military_m65_field_jacket",
    name: "Olive Drab M-65 Field Jacket & Cargo Trousers",
    gender: "unisex",
    category: "casual",
    prompt:
      "Authentic olive drab vintage M-65 military field jacket with quad cargo pockets, paired with matching rugged olive drab sateen military field trousers",
    samPrompt: "clothing, jacket, field jacket, military jacket, cargo pants, trousers",
    imageUrl: "/assets/wardrobe/generic/uni_17_military_m65_field_jacket.jpg",
    description: "War correspondent essential whole field uniform in rugged olive nyco sateen with jacket and field trousers.",
    cleanGenPrompt:
      "A professional fashion multi-view technical reference plate showing a complete unisex military field outfit displayed on an invisible 3D ghost mannequin (NO human head, NO face, NO plastic mannequin skin, only the tailored floating clothing itself). The outfit is whole and complete with both top and bottom garments: an olive drab M-65 field jacket with four cargo pockets and epaulets, paired with matching olive sateen field trousers. The image is divided into 4 clean vertical subpanels side-by-side against a seamless solid green chroma wall studio backdrop (#00FF00 green screen): Panel 1 (left): Full Front View of the complete military field outfit with M-65 jacket and field trousers. Panel 2: Left Side Profile View showing storm cuff flaps and cargo pocket bellows. Panel 3: Rear Back View showing bi-swing action shoulder pleats and reinforced trouser seat. Panel 4 (right): Single seamless vertical macro close-up of heavy brass talon zipper, snap fasteners, and rugged sateen weave. Ultra-photorealistic fabric textures, studio lighting with crisp rim light separating the clothing from the green screen, commercial catalog quality, sharp focus. IMPORTANT: Absolutely NO text, NO labels, NO numbers, NO words, NO captions, NO banners, clean pure photography only.",
  },
  {
    id: "uni_18_liquid_silver_foil_puffer",
    name: "Silver Metallic Chrome Puffer & Tech Trousers",
    gender: "unisex",
    category: "edgy",
    prompt:
      "Futuristic cropped liquid metallic silver chrome foil hooded puffer jacket, paired with matching matte black insulated technical trousers with chrome zip accents",
    samPrompt: "clothing, jacket, puffer, down jacket, tech pants, trousers",
    imageUrl: "/assets/wardrobe/generic/uni_18_liquid_silver_foil_puffer.jpg",
    description: "Striking high-gloss metallic chrome puffer whole outfit with matte black insulated technical pants.",
    cleanGenPrompt:
      "A professional fashion multi-view technical reference plate showing a complete unisex futuristic outerwear outfit displayed on an invisible 3D ghost mannequin (NO human head, NO face, NO plastic mannequin skin, only the tailored floating clothing itself). The outfit is whole and complete with both top and bottom garments: a high-gloss liquid silver chrome metallic puffer jacket paired with matte black technical trousers. The image is divided into 4 clean vertical subpanels side-by-side against a seamless solid green chroma wall studio backdrop (#00FF00 green screen): Panel 1 (left): Full Front View of the complete futuristic outfit with silver puffer jacket and black tech trousers. Panel 2: Left Side Profile View showing voluminous down baffles and tapered trouser profile. Panel 3: Rear Back View showing quilted horizontal puffer chambers and clean trouser back. Panel 4 (right): Single seamless vertical macro close-up of reflective chrome foil fabric, rubberized zip pull, and matte trouser texture. Ultra-photorealistic fabric textures, studio lighting with crisp rim light separating the clothing from the green screen, commercial catalog quality, sharp focus. IMPORTANT: Absolutely NO text, NO labels, NO numbers, NO words, NO captions, NO banners, clean pure photography only.",
  },
  {
    id: "uni_19_casual_corduroy_overshirt",
    name: "Rust Corduroy Overshirt & Raw Indigo Jeans",
    gender: "unisex",
    category: "casual",
    prompt:
      "Warm rust brown heavyweight wide-wale cotton corduroy overshirt jacket with dual chest flap pockets, paired with dark raw indigo denim jeans with brass rivets",
    samPrompt: "clothing, shirt, jacket, overshirt, corduroy, jeans, denim",
    imageUrl: "/assets/wardrobe/generic/uni_19_casual_corduroy_overshirt.jpg",
    description: "Approachable lifestyle and local community news whole outfit in rust corduroy overshirt and raw indigo jeans.",
    cleanGenPrompt:
      "A professional fashion multi-view technical reference plate showing a complete unisex casual lifestyle outfit displayed on an invisible 3D ghost mannequin (NO human head, NO face, NO plastic mannequin skin, only the tailored floating clothing itself). The outfit is whole and complete with both top and bottom garments: a rust brown wide-wale corduroy overshirt paired with dark raw indigo denim jeans. The image is divided into 4 clean vertical subpanels side-by-side against a seamless solid green chroma wall studio backdrop (#00FF00 green screen): Panel 1 (left): Full Front View of the complete outfit with corduroy overshirt and straight-leg indigo jeans. Panel 2: Left Side Profile View showing buttoned barrel cuffs and classic denim jean silhouette. Panel 3: Rear Back View showing straight boxy back shirt yoke and rear jean pockets. Panel 4 (right): Single seamless vertical macro close-up of thick velvety corduroy wales, horn buttons, and raw denim selvedge. Ultra-photorealistic fabric textures, studio lighting with crisp rim light separating the clothing from the green screen, commercial catalog quality, sharp focus. IMPORTANT: Absolutely NO text, NO labels, NO numbers, NO words, NO captions, NO banners, clean pure photography only.",
  },
  {
    id: "uni_20_steampunk_tailored_frock",
    name: "Neo-Victorian Damask Frock & Pinstripe Trousers",
    gender: "unisex",
    category: "edgy",
    prompt:
      "Dramatic neo-Victorian charcoal damask tailored long frock coat with velvet stand-up mandarin collar, antique brass filigree buttons, paired with matching charcoal pinstripe tailored trousers",
    samPrompt: "clothing, coat, frock coat, jacket, damask coat, trousers, pants",
    imageUrl: "/assets/wardrobe/generic/uni_20_steampunk_tailored_frock.jpg",
    description: "Theatrical historical and culture retrospective whole ensemble with ornate damask frock coat and pinstripe trousers.",
    cleanGenPrompt:
      "A professional fashion multi-view technical reference plate showing a complete unisex neo-Victorian tailored outfit displayed on an invisible 3D ghost mannequin (NO human head, NO face, NO plastic mannequin skin, only the tailored floating clothing itself). The outfit is whole and complete with both top and bottom garments: a charcoal damask frock coat with mandarin collar and brass buttons, paired with charcoal pinstripe tailored trousers. The image is divided into 4 clean vertical subpanels side-by-side against a seamless solid green chroma wall studio backdrop (#00FF00 green screen): Panel 1 (left): Full Front View of the complete frock coat outfit with damask coat and pinstripe trousers. Panel 2: Left Side Profile View showing tailored waist curve, rear flared skirt, and trouser crease. Panel 3: Rear Back View showing twin back coat pleats with waist buttons and tailored trouser seat. Panel 4 (right): Single seamless vertical macro close-up of woven floral damask jacquard, antique brass buttons, and velvet collar. Ultra-photorealistic fabric textures, studio lighting with crisp rim light separating the clothing from the green screen, commercial catalog quality, sharp focus. IMPORTANT: Absolutely NO text, NO labels, NO numbers, NO words, NO captions, NO banners, clean pure photography only.",
  },
];

/**
 * Filter attires based on persona gender:
 * - If persona is "female", return Female + Unisex attires
 * - If persona is "male", return Male + Unisex attires
 * - Otherwise, return All attires
 */
export function getAttiresForPersonaGender(
  gender?: string | null,
  categoryFilter: string = "all"
): AttireItem[] {
  let items = ATTIRE_CATALOG_60;

  if (gender === "female") {
    items = items.filter((a) => a.gender === "female" || a.gender === "unisex");
  } else if (gender === "male") {
    items = items.filter((a) => a.gender === "male" || a.gender === "unisex");
  }

  if (categoryFilter && categoryFilter !== "all") {
    items = items.filter((a) => a.category === categoryFilter);
  }

  return items;
}
