/**
 * scripts/gemini-cli/personaAttires.ts
 *
 * Comprehensive Persona-Specific Wardrobe Catalog.
 * Provides custom, character-tailored outfits (e.g. Blaze's leather/open-belly styles,
 * Ruby's prime-time sweetheart corsets, Storm's techwear, Isabel's Latin anchor elegance,
 * Mateo's tailored suits) and integrates with Prisma DB when available.
 */

import { Persona } from "../../src/lib/tts/personas";
import { PersonaAttire } from "./types";
import { prisma } from "../../src/lib/prisma";
import fs from "fs";
import path from "path";

// ============================================================
// Curated Persona-Specific Wardrobe Presets
// ============================================================
export const PERSONA_SPECIFIC_ATTIRES: Record<string, PersonaAttire[]> = {
  // ------------------------------------------------------------
  // Blaze Wilder (High-octane entertainment, edgy leather, open belly, crop tops)
  // ------------------------------------------------------------
  blaze: [
    {
      id: "blaze_silver_blazer",
      label: "✨ Metallic Silver Cropped Blazer & Black Leather Trousers",
      description: "Metallic silver cropped blazer with notched lapels worn open over a tight black bandeau crop top, high-waisted black leather pants, silver choker necklace.",
      relativePath: "public/avatars/master_blaze_archive/domain_chroma_wall_standing_silver_blazer/blaze_silver_m1_base.jpg",
      personaId: "blaze",
      category: "broadcast",
    },
    {
      id: "blaze_leather_crop_jacket",
      label: "🖤 Cropped Black Leather Biker Jacket & Open-Belly Bandeau",
      description: "Fitted cropped black moto leather jacket with silver zipper hardware worn open over a tight black leather bandeau crop top, bare toned midriff and abs, high-waisted black leather pants, silver choker necklace.",
      relativePath: "public/avatars/master_blaze_archive/chroma_master_poses/blaze_leather_crop_jacket_4in1_multiview_strip.png",
      personaId: "blaze",
      category: "edgy_leather",
    },
    {
      id: "blaze_strapless_peplum_corset",
      label: "✨ Structured Strapless Black Satin Peplum Corset",
      description: "Structured strapless black satin boned corset with flared peplum waist, tailored black trousers, gold choker necklace, revealing bare shoulders and collarbones.",
      relativePath: "public/avatars/master_blaze_archive/blaze_chroma_wall_standing_master.jpg",
      personaId: "blaze",
      category: "broadcast",
    },
    {
      id: "blaze_metallic_bomber_neon_crop",
      label: "⚡ Metallic Silver Bomber Jacket & Neon Pink Crop Top",
      description: "Flashy metallic silver satin bomber jacket left open over a form-fitting neon pink rib-knit crop top, exposed toned abs, sleek black leather trousers, silver hoop earrings.",
      personaId: "blaze",
      category: "edgy_leather",
    },
    {
      id: "blaze_cyberpunk_leather_mesh",
      label: "🌆 Cyberpunk Purple-Lined Leather Jacket & Cutout Top",
      description: "Dark leather jacket with neon purple lining worn open over an asymmetrical cutout black crop top, exposed belly button with subtle piercing, dark distressed denim with silver chain accents.",
      personaId: "blaze",
      category: "edgy_leather",
    },
    {
      id: "blaze_gold_halter_leather_mini",
      label: "🏆 Metallic Gold Halter Top & High-Waist Leather Skirt",
      description: "Sleek metallic liquid gold halter top with tailored fit, paired with a high-waisted black leather skirt with silver zipper accents and chunky silver cuff bracelets.",
      personaId: "blaze",
      category: "gala",
    },
  ],

  // ------------------------------------------------------------
  // Ruby Vance (Prime-time anchor, cobalt sweetheart, corset silhouettes, liquid bronze)
  // ------------------------------------------------------------
  ruby: [
    {
      id: "ruby_cobalt_sweetheart",
      label: "👗 Cobalt Blue Sweetheart Neckline Dress (Ruby Signature)",
      description: "Form-fitting tailored cobalt blue sweetheart neckline dress with gold layered chain necklace, elegant prime-time broadcast silhouette, fitted waist.",
      relativePath: "public/avatars/master_ruby_archive/outfits_and_clean_plates/outfit_01_cobalt_blue_sweetheart_dress.jpg",
      personaId: "ruby",
      category: "broadcast",
    },
    {
      id: "ruby_emerald_wrap",
      label: "✨ Emerald Green Satin Wrap Dress with Gold Belt",
      description: "Emerald green satin wrap dress with subtle gold metallic waist belt, sophisticated v-neckline, premium fabric sheen, delicate gold chain necklace.",
      relativePath: "public/avatars/master_ruby_archive/outfits_and_clean_plates/outfit_03_emerald_wrap_dress.jpg",
      personaId: "ruby",
      category: "broadcast",
    },
    {
      id: "ruby_crimson_blazer",
      label: "🔴 Crimson Red Executive Studio Blazer Suit",
      description: "Tailored crimson red single-button executive blazer with matching trousers, black silk camisole underneath, modern television anchor attire.",
      relativePath: "public/avatars/master_ruby_archive/outfits_and_clean_plates/outfit_02_crimson_plunging_blazer.jpg",
      personaId: "ruby",
      category: "broadcast",
    },
    {
      id: "ruby_burgundy_velvet_corset",
      label: "🍷 Burgundy Velvet Sweetheart Studio Dress",
      description: "Rich deep burgundy velvet sweetheart dress with structured boning, warm studio highlights, elegant prime-time broadcast styling.",
      relativePath: "public/avatars/master_ruby_archive/outfits_and_clean_plates/highlight_burgundy_velvet_corset.jpg",
      personaId: "ruby",
      category: "broadcast",
    },
    {
      id: "ruby_liquid_bronze_gown",
      label: "🏆 Asymmetrical Liquid Bronze Metallic Gown",
      description: "Asymmetrical single-shoulder liquid bronze metallic evening gown with sculpted draping, prime-time gala broadcast attire.",
      relativePath: "public/avatars/master_ruby_archive/outfits_and_clean_plates/distinct_01_oneshoulder_metallic_gown.jpg",
      personaId: "ruby",
      category: "gala",
    },
    {
      id: "ruby_black_lace_corset",
      label: "🌹 Black Lace Structured Corset Bustier",
      description: "Form-fitting black satin corset bustier with delicate floral lace overlay, sweetheart neckline, gold chain pendant.",
      relativePath: "public/avatars/master_ruby_archive/outfits_and_clean_plates/outfit_15_black_lace_corset_bustier.jpg",
      personaId: "ruby",
      category: "broadcast",
    },
    {
      id: "ruby_tuxedo_vest",
      label: "👔 Tailored Tuxedo Waistcoat Vest & Crisp Oxford",
      description: "Fitted tailored black tuxedo waistcoat vest with silk back and satin lapels, crisp white button-down shirt with French cuffs.",
      relativePath: "public/avatars/master_ruby_archive/outfits_and_clean_plates/distinct_02_tuxedo_waistcoat_vest.jpg",
      personaId: "ruby",
      category: "broadcast",
    },
    {
      id: "ruby_keyhole_longsleeve",
      label: "🖤 Midnight Keyhole Long-Sleeve Bodycon Dress",
      description: "Sophisticated midnight black long-sleeve bodycon dress with an elegant teardrop keyhole chest cutout, gold accent bracelet.",
      relativePath: "public/avatars/master_ruby_archive/outfits_and_clean_plates/distinct_03_keyhole_longsleeve_dress.jpg",
      personaId: "ruby",
      category: "broadcast",
    },
    {
      id: "ruby_belted_crossover",
      label: "🎗️ Belted Crossover Wrap Top with Gold Buckle",
      description: "Chic black and ivory crossover wrap blouse with tailored wide-leg trousers, cinched waist with a polished gold rectangular buckle.",
      relativePath: "public/avatars/master_ruby_archive/outfits_and_clean_plates/distinct_04_belted_crossover_wrap_top.jpg",
      personaId: "ruby",
      category: "broadcast",
    },
    {
      id: "ruby_strapless_peplum",
      label: "💎 Structured Strapless Peplum Corset",
      description: "Structured strapless black boned corset with sculpted peplum flared waist, bare shoulders, gold herringbone necklace.",
      relativePath: "public/avatars/master_ruby_archive/outfits_and_clean_plates/distinct_05_strapless_peplum_corset.jpg",
      personaId: "ruby",
      category: "gala",
    },
    {
      id: "ruby_black_plunging_halter",
      label: "🖤 Black Plunging Halter Neckline Top",
      description: "Sleek matte black plunging halter neckline top with tailored studio trousers, minimalist modern television look.",
      relativePath: "public/avatars/master_ruby_archive/outfits_and_clean_plates/highlight_black_plunging_halter.jpg",
      personaId: "ruby",
      category: "broadcast",
    },
    {
      id: "ruby_champagne_plunging_halter",
      label: "🍾 Champagne Satin Plunging Halter Top",
      description: "Lustrous champagne silk satin halter top with deep v-neckline, shimmering studio lighting reflections, delicate gold pendant.",
      relativePath: "public/avatars/master_ruby_archive/outfits_and_clean_plates/highlight_champagne_plunging_halter.jpg",
      personaId: "ruby",
      category: "gala",
    },
    {
      id: "ruby_emerald_satin_cowl",
      label: "🌿 Emerald Satin Cowl Neck Slip Dress",
      description: "Rich emerald green fluid satin slip dress with a draped cowl neckline, delicate spaghetti straps, glowing jewel-tone studio sheen.",
      relativePath: "public/avatars/master_ruby_archive/outfits_and_clean_plates/highlight_emerald_satin_cowl_slip.jpg",
      personaId: "ruby",
      category: "broadcast",
    },
    {
      id: "ruby_midnight_blue_strapless",
      label: "🌌 Midnight Blue Strapless Corset Gown",
      description: "Deep midnight sapphire blue strapless boned corset gown with structured bodice and clean architectural lines, gala special edition.",
      relativePath: "public/avatars/master_ruby_archive/outfits_and_clean_plates/highlight_midnight_blue_strapless.jpg",
      personaId: "ruby",
      category: "gala",
    },
    {
      id: "ruby_ivory_sweetheart_bodycon",
      label: "🤍 Ivory Sweetheart Fitted Bodycon Dress",
      description: "Clean crisp ivory white sweetheart neckline bodycon sheath dress with gold layered chain necklace, pristine morning show styling.",
      relativePath: "public/avatars/master_ruby_archive/outfits_and_clean_plates/outfit_04_ivory_sweetheart_bodycon.jpg",
      personaId: "ruby",
      category: "broadcast",
    },
    {
      id: "ruby_navy_jumpsuit",
      label: "⚓ Tailored Midnight Navy Studio Jumpsuit",
      description: "Fitted midnight navy tailored jumpsuit with sharp lapels, gold waist belt, and rolled cuffs, commanding anchor presence.",
      relativePath: "public/avatars/master_ruby_archive/outfits_and_clean_plates/outfit_05_midnight_navy_jumpsuit.jpg",
      personaId: "ruby",
      category: "broadcast",
    },
    {
      id: "ruby_black_offshoulder",
      label: "🖤 Black Off-Shoulder Sweetheart Evening Dress",
      description: "Elegant black off-the-shoulder evening dress with structured sweetheart bustier, bare collarbones, silver micro-pave necklace.",
      relativePath: "public/avatars/master_ruby_archive/outfits_and_clean_plates/outfit_06_black_offshoulder_sweetheart.jpg",
      personaId: "ruby",
      category: "gala",
    },
    {
      id: "ruby_scarlet_plunging_halter",
      label: "💃 Scarlet Red Plunging Halter Dress",
      description: "Vibrant scarlet red plunging halter dress with open back, bold dramatic anchor presence, gold drop earrings.",
      relativePath: "public/avatars/master_ruby_archive/outfits_and_clean_plates/outfit_10_scarlet_red_plunging_halter.jpg",
      personaId: "ruby",
      category: "broadcast",
    },
    {
      id: "ruby_crimson_cutout_plunge",
      label: "🔴 Crimson Cutout Plunge Studio Dress",
      description: "Deep crimson red dress with geometric chest cutout and structured shoulder line, modern broadcast newsroom fashion.",
      relativePath: "public/avatars/master_ruby_archive/outfits_and_clean_plates/outfit_13_crimson_cutout_plunge_dress.jpg",
      personaId: "ruby",
      category: "broadcast",
    },
    {
      id: "ruby_ivory_satin_halter",
      label: "🕊️ Ivory Satin Plunging Halter Top",
      description: "Fluid ivory white satin halter top with deep crossover neckline and high-waisted black pencil skirt, sophisticated contrast.",
      relativePath: "public/avatars/master_ruby_archive/outfits_and_clean_plates/outfit_14_ivory_satin_plunge_halter.jpg",
      personaId: "ruby",
      category: "broadcast",
    },
    {
      id: "ruby_bronze_metallic_pointing",
      label: "🥉 Metallic Bronze Analytical Studio Outfit",
      description: "Liquid bronze metallic sleeveless top with charcoal tailored trousers, analytical prime-time presentation styling.",
      relativePath: "public/avatars/master_ruby_archive/chroma_master_poses/ruby_05a_bronze_metallic_default_clasped.jpg",
      personaId: "ruby",
      category: "broadcast",
    },
    {
      id: "ruby_crimson_vest_analytical",
      label: "🎯 Crimson Tailored Vest with Gold Accents",
      description: "Sharp tailored crimson red waistcoat vest worn over a black silk base, gold buttons, crisp broadcast journalism posture.",
      relativePath: "public/avatars/master_ruby_archive/chroma_master_poses/ruby_06a_crimson_vest_default_clasped.jpg",
      personaId: "ruby",
      category: "broadcast",
    },
    {
      id: "ruby_emerald_keyhole_gesturing",
      label: "🌲 Deep Emerald Keyhole Presentation Dress",
      description: "Deep emerald green tailored dress with subtle keyhole chest detail, three-quarter sleeves, gold chain belt.",
      relativePath: "public/avatars/master_ruby_archive/chroma_master_poses/ruby_12a_emerald_keyhole_default_clasped.jpg",
      personaId: "ruby",
      category: "broadcast",
    },
    {
      id: "ruby_sapphire_corset_pointing",
      label: "💠 Royal Sapphire Blue Boned Corset",
      description: "Royal sapphire blue structured boned corset top with dark navy studio trousers, dynamic high-saturation color grade.",
      relativePath: "public/avatars/master_ruby_archive/chroma_master_poses/ruby_11a_sapphire_corset_default_clasped.jpg",
      personaId: "ruby",
      category: "broadcast",
    },
  ],


  // ------------------------------------------------------------
  // Storm (Athletic techwear, tactical fitness, cyan accents)
  // ------------------------------------------------------------
  storm: [
    {
      id: "storm_tactical_utility_crop",
      label: "🎽 Tactical Utility Vest & Compression Gym Crop Top",
      description: "Matte black tactical utility vest with silver clip fasteners worn over a fitted charcoal grey compression crop top, exposed athletic abs, dark tactical cargo joggers, fingerless gloves.",
      personaId: "storm",
      category: "sport_fitness",
    },
    {
      id: "storm_neon_cyan_windbreaker",
      label: "⚡ Neon Cyan & Black Techwear Shell Jacket",
      description: "Modern cropped techwear windbreaker in matte black with neon cyan geometric piping, athletic racerback sports bra underneath, high-waisted performance leggings.",
      personaId: "storm",
      category: "techwear",
    },
    {
      id: "storm_field_jacket",
      label: "🔴 High-Visibility Red All-Weather Storm Broadcast Field Jacket",
      description: "High-visibility red all-weather storm broadcast field jacket with waterproof zips over dark grey technical knit and dark tactical pants.",
      relativePath: "public/avatars/master_storm_archive/domain_chroma_wall_standing_storm_field_jacket/storm_storm_field_jacket_01_M1_chroma_stand_base.jpg",
      personaId: "storm",
      category: "broadcast",
    },
  ],

  // ------------------------------------------------------------
  // Isabel (Argentine prime anchor, terracotta linen, tailored double-breasted)
  // ------------------------------------------------------------
  isabel: [
    {
      id: "isabel_terracotta_linen",
      label: "🧥 Terracotta Linen Blazer & Cream Silk Blouse",
      description: "Tailored terracotta Italian linen blazer with notched lapels over a delicate cream silk v-neck blouse, gold hoop earrings, high-waisted ivory trousers.",
      personaId: "isabel",
      category: "broadcast",
    },
    {
      id: "isabel_wine_red_crepe",
      label: "🍷 Wine-Red Tailored Crepe Broadcast Sheath Dress",
      description: "Structured wine-red tailored crepe sheath dress with asymmetric neckline, gold cuff bracelet, sophisticated South American prime-time anchor elegance.",
      personaId: "isabel",
      category: "broadcast",
    },
    {
      id: "isabel_navy_double_breasted",
      label: "⚓ Tailored Navy Double-Breasted Executive Suit",
      description: "Double-breasted dark navy tailored suit blazer with polished brass buttons, crisp white collared shirt underneath, modern broadcast authority.",
      personaId: "isabel",
      category: "broadcast",
    },
    {
      id: "emerald_satin_blazer",
      label: "💚 Emerald Green Peaked Satin Blazer & Gold Pendant",
      description: "Vibrant tailored emerald green satin blazer with peaked lapels over black silk camisole top, layered delicate gold pendant, tailored dark trousers.",
      relativePath: "public/avatars/master_isabel_archive/domain_chroma_wall_standing_emerald_satin_blazer/isabel_emerald_satin_blazer_01_M1_chroma_stand_base.jpg",
      personaId: "isabel",
      category: "broadcast",
    },
  ],

  // ------------------------------------------------------------
  // Mateo (Crisp Oxford, charcoal tailored suit vest, slim tie)
  // ------------------------------------------------------------
  mateo: [
    {
      id: "mateo_oxford_charcoal_vest",
      label: "👔 White Oxford Shirt, Charcoal Vest & Burgundy Tie",
      description: "Crisp pressed white cotton oxford dress shirt with sleeves neatly rolled to mid-forearm, charcoal grey tailored suit vest, slim burgundy silk necktie, silver tie clip.",
      personaId: "mateo",
      category: "broadcast",
    },
    {
      id: "mateo_italian_navy_suit",
      label: "🧥 Slim-Fit Italian Midnight Navy Wool Suit",
      description: "Bespoke Italian midnight navy two-piece wool suit with peak lapels, crisp light blue dress shirt, silver chronograph watch on wrist.",
      personaId: "mateo",
      category: "broadcast",
    },
  ],

  // ------------------------------------------------------------
  // Dr. Aris (Tech/science anchor, cashmere turtleneck, titanium glasses)
  // ------------------------------------------------------------
  aris: [
    {
      id: "aris_cashmere_turtleneck",
      label: "🔬 Black Cashmere Turtleneck & Minimalist Titanium Glasses",
      description: "Fitted fine-knit black cashmere turtleneck, minimalist lightweight titanium rectangular glasses, charcoal wool trousers, sleek Apple Watch.",
      personaId: "aris",
      category: "techwear",
    },
    {
      id: "aris_slate_grey_blazer",
      label: "💼 Slate Grey Tech Executive Blazer & Dark Tee",
      description: "Structured slate grey tech-wool blazer worn over a premium black crewneck tee, minimalist modern Silicon Valley broadcast aesthetic.",
      personaId: "aris",
      category: "broadcast",
    },
    {
      id: "navy_tech_blazer",
      label: "🔬 Navy Tech-Wool Blazer & White Collared Shirt",
      description: "Tailored navy blue tech-wool blazer over crisp white spread-collar dress shirt with open collar, thin titanium rectangular wire spectacles, dark charcoal trousers.",
      relativePath: "public/avatars/master_aris_archive/domain_chroma_wall_standing_navy_tech_blazer/aris_navy_tech_blazer_01_M1_chroma_stand_base.jpg",
      personaId: "aris",
      category: "broadcast",
    },
  ],

  // ------------------------------------------------------------
  // Luna (AI VTuber / Arts & Culture Reporter, velvet tuxedo / cyberpunk streamer)
  // ------------------------------------------------------------
  luna: [
    {
      id: "plum_velvet_tuxedo",
      label: "💜 Sophisticated Deep Plum-Purple Velvet Tuxedo",
      description: "Sophisticated deep plum-purple velvet tuxedo jacket with black satin shawl collar over black silk v-neck blouse and matching trousers.",
      relativePath: "public/avatars/master_luna_archive/domain_chroma_wall_standing_plum_velvet_tuxedo/luna_plum_velvet_tuxedo_01_M1_chroma_stand_base.jpg",
      personaId: "luna",
      category: "broadcast",
    },
    {
      id: "luna_holographic_hoodie",
      label: "🎧 Holographic Cyberpunk Oversized Hoodie & Neon Crop",
      description: "Oversized iridescent holographic jacket with glowing lavender piping worn unzipped over a black crop top, high-waisted pleated tennis skirt, glowing cat-ear headset.",
      personaId: "luna",
      category: "techwear",
    },
    {
      id: "luna_pastel_streamer_outfit",
      label: "🌸 Pastel Lavender Crop Top & Ribbon Choker",
      description: "Pastel lavender short-sleeve crop top with heart cutout, black pleated skirt with chain detail, purple velvet choker with silver star pendant.",
      personaId: "luna",
      category: "casual",
    },
  ],

  // ------------------------------------------------------------
  // Austin (Tech Correspondent, charcoal technical bomber)
  // ------------------------------------------------------------
  austin: [
    {
      id: "charcoal_tech_bomber",
      label: "💼 Matte Charcoal Technical Techwear Bomber Jacket",
      description: "Matte charcoal technical techwear bomber jacket over dark tech-startup crewneck tee and dark technical chinos.",
      relativePath: "public/avatars/master_austin_archive/domain_chroma_wall_standing_charcoal_tech_bomber/austin_charcoal_tech_bomber_01_M1_chroma_stand_base.jpg",
      personaId: "austin",
      category: "techwear",
    },
  ],

  // ------------------------------------------------------------
  // Sofia (AI & Deep Tech Anchor, architectural sapphire asymmetric blazer)
  // ------------------------------------------------------------
  sofia: [
    {
      id: "sapphire_asymmetric_blazer",
      label: "💙 Architectural Royal Sapphire Blue Asymmetric Tailored Blazer",
      description: "Architectural royal sapphire blue tailored asymmetric blazer with clean angled lapels over minimalist black mock-neck top and dark slacks.",
      relativePath: "public/avatars/master_sofia_archive/domain_chroma_wall_standing_sapphire_asymmetric_blazer/sofia_sapphire_asymmetric_blazer_01_M1_chroma_stand_base.jpg",
      personaId: "sofia",
      category: "broadcast",
    },
  ],

  // ------------------------------------------------------------
  // Hawk (Authoritative Senior Political Correspondent, graphite pinstripe suit)
  // ------------------------------------------------------------
  hawk: [
    {
      id: "graphite_pinstripe_suit",
      label: "👔 Sharp Graphite Grey Pinstripe Three-Piece Executive Suit",
      description: "Sharp graphite grey pinstripe three-piece suit with crisp white spread-collar shirt, dark silk tie, and silver tie clip.",
      relativePath: "public/avatars/master_hawk_archive/domain_chroma_wall_standing_graphite_pinstripe_suit/hawk_graphite_pinstripe_suit_01_M1_chroma_stand_base.jpg",
      personaId: "hawk",
      category: "broadcast",
    },
  ],

  // ------------------------------------------------------------
  // Jade (Sophisticated Lifestyle & Wellness Editor, cream cashmere blazer)
  // ------------------------------------------------------------
  jade: [
    {
      id: "cream_cashmere_blazer",
      label: "🤍 Luxurious Cream Ivory Tailored Cashmere Blazer",
      description: "Luxurious cream ivory tailored cashmere blazer over champagne satin silk blouse with delicate gold chain necklace and tailored slacks.",
      relativePath: "public/avatars/master_jade_archive/domain_chroma_wall_standing_cream_cashmere_blazer/jade_cream_cashmere_blazer_01_M1_chroma_stand_base.jpg",
      personaId: "jade",
      category: "broadcast",
    },
  ],

  // ------------------------------------------------------------
  // Connor Hayes (Wall Street closer, high-conversion salesman, crisp dress shirt, NO suit)
  // ------------------------------------------------------------
  connor: [
    {
      id: "connor_white_oxford_dress_shirt",
      label: "👔 Crisp White Oxford Dress Shirt (Salesman, No Suit)",
      description: "Crisp pressed white tailored cotton Oxford dress shirt with open spread collar and sleeves rolled to mid-forearm, no suit, no jacket, flat-front charcoal grey dress trousers, black leather belt with silver buckle, luxury steel chronograph watch.",
      relativePath: "public/avatars/master_connor_archive/domain_chroma_wall_standing_white_oxford_dress_shirt/connor_169_widescreen_01_M1_stand_base.jpg",
      personaId: "connor",
      category: "broadcast",
    },
    {
      id: "connor_sky_blue_dress_shirt",
      label: "👔 Sky Blue Fitted Poplin Dress Shirt (Enterprise Closer, No Suit)",
      description: "Tailored light sky-blue poplin dress shirt with spread collar, top collar button unbuttoned, sleeves rolled to mid-forearm, no suit jacket, tailored dark navy slim slacks, dark brown leather belt.",
      personaId: "connor",
      category: "broadcast",
    },
  ],

  // ------------------------------------------------------------
  // Eli Vance (Cybersecurity & technical solutions sales engineer, dress shirt, NO suit)
  // ------------------------------------------------------------
  eli: [
    {
      id: "eli_slate_tech_sales_shirt",
      label: "👔 Slate Grey Tech Sales Button-Down (Solutions Engineer, No Suit)",
      description: "Fitted slate grey long-sleeve button-down dress shirt with collar open and sleeves rolled up, dark charcoal slim chinos, leather belt, minimalist smartwatch, no suit, no blazer.",
      personaId: "eli",
      category: "techwear",
    },
  ],

  // ------------------------------------------------------------
  // Claire Dubois (International Diplomacy & Foreign Affairs)
  // ------------------------------------------------------------
  claire: [
    {
      id: "midnight_trench_dress",
      label: "🖤 Architectural Midnight Navy Trench Dress",
      description: "Architectural midnight navy double-breasted trench dress with structured waist belt, sharp lapels, mother-of-pearl buttons, and minimalist silver earrings.",
      relativePath: "public/avatars/master_claire_archive/domain_chroma_wall_standing_midnight_trench_dress/claire_midnight_trench_dress_01_M1_chroma_stand_base.jpg",
      personaId: "claire",
      category: "broadcast",
    },
  ],

  // ------------------------------------------------------------
  // Marcos Morales (Investigative Journalism & Field Anchor)
  // ------------------------------------------------------------
  marcos: [
    {
      id: "slate_pinstripe_vest",
      label: "📰 Slate Grey Pinstripe Three-Piece Vest & Blue Shirt",
      description: "Sharp slate grey pinstripe three-piece tailored vest over tailored sky-blue dress shirt with open collar and charcoal trousers.",
      relativePath: "public/avatars/master_marcos_archive/domain_chroma_wall_standing_slate_pinstripe_vest/marcos_slate_pinstripe_vest_01_M1_chroma_stand_base.jpg",
      personaId: "marcos",
      category: "broadcast",
    },
  ],

  // ------------------------------------------------------------
  // Luca Moretti (Architecture & Industrial Design)
  // ------------------------------------------------------------
  luca: [
    {
      id: "espresso_moto_jacket",
      label: "🏎️ Espresso Distressed Calfskin Moto Jacket & Linen Shirt",
      description: "Rich espresso brown distressed calfskin moto jacket with silver hardware over tailored beige linen button-down shirt and dark chinos.",
      relativePath: "public/avatars/master_luca_archive/domain_chroma_wall_standing_espresso_moto_jacket/luca_espresso_moto_jacket_01_M1_chroma_stand_base.jpg",
      personaId: "luca",
      category: "techwear",
    },
  ],

  // ------------------------------------------------------------
  // Kai Lindner (Aerospace & Deep Tech Lead)
  // ------------------------------------------------------------
  kai: [
    {
      id: "cyber_matte_kimono_blazer",
      label: "⚡ Matte Black Collarless Wrap Blazer & Clear Glasses",
      description: "Modern minimalist matte black collarless wrap blazer over charcoal bamboo-cotton crewneck, clear modern acetate frames, dark slim trousers.",
      relativePath: "public/avatars/master_kai_archive/domain_chroma_wall_standing_cyber_matte_kimono_blazer/kai_cyber_matte_kimono_blazer_01_M1_chroma_stand_base.jpg",
      personaId: "kai",
      category: "techwear",
    },
  ],

  // ------------------------------------------------------------
  // Abigail Finch (Meteorology & Earth Science)
  // ------------------------------------------------------------
  abigail: [
    {
      id: "marigold_tailored_blazer",
      label: "☀️ Vibrant Marigold Yellow Tailored Crepe Blazer",
      description: "Vibrant marigold yellow tailored crepe blazer over white pleated georgette blouse with delicate pearl earrings and ivory tailored trousers.",
      relativePath: "public/avatars/master_abigail_archive/domain_chroma_wall_standing_marigold_tailored_blazer/abigail_marigold_tailored_blazer_01_M1_chroma_stand_base.jpg",
      personaId: "abigail",
      category: "broadcast",
    },
  ],

  // ------------------------------------------------------------
  // Adrian Cross (Cybersecurity & Intelligence Analyst)
  // ------------------------------------------------------------
  adrian: [
    {
      id: "obsidian_executive_suit",
      label: "🛡️ Obsidian Black European Two-Button Suit",
      description: "Crisp obsidian black tailored European two-button suit jacket with charcoal micro-check necktie, silver tie clip, and crisp white dress shirt.",
      relativePath: "public/avatars/master_adrian_archive/domain_chroma_wall_standing_obsidian_executive_suit/adrian_obsidian_executive_suit_01_M1_chroma_stand_base.jpg",
      personaId: "adrian",
      category: "broadcast",
    },
  ],

  // ------------------------------------------------------------
  // Layla Mansour (Global Peacekeeping & Humanitarian Affairs)
  // ------------------------------------------------------------
  layla: [
    {
      id: "ivory_crepe_powersuit",
      label: "🕊️ Tailored Ivory Crepe Blazer & Dusty Rose Silk",
      description: "Impeccably tailored ivory crepe blazer with satin shawl lapels over dusty rose silk shell blouse, pearl studs, and tailored ivory trousers.",
      relativePath: "public/avatars/master_layla_archive/domain_chroma_wall_standing_ivory_crepe_powersuit/layla_ivory_crepe_powersuit_01_M1_chroma_stand_base.jpg",
      personaId: "layla",
      category: "broadcast",
    },
  ],

  // ------------------------------------------------------------
  // Everett Sterling (Maritime & Heavy Industry Senior Correspondent)
  // ------------------------------------------------------------
  everett: [
    {
      id: "vintage_donegal_tweed",
      label: "📚 Forest Green Donegal Tweed Blazer & Navy Sweater",
      description: "Classic British forest green and brown Donegal tweed blazer with suede elbow patches over rich navy merino wool v-neck sweater, pale blue oxford shirt, and round wire spectacles.",
      relativePath: "public/avatars/master_everett_archive/domain_chroma_wall_standing_vintage_donegal_tweed/everett_vintage_donegal_tweed_01_M1_chroma_stand_base.jpg",
      personaId: "everett",
      category: "broadcast",
    },
  ],

  // ------------------------------------------------------------
  // Lucia (South American Cultural & Arts Correspondent)
  // ------------------------------------------------------------
  lucia: [
    {
      id: "terracotta_linen_blazer",
      label: "🏺 Terracotta Structured Linen Blazer & Cream Silk",
      description: "A tailored warm terracotta-orange structured linen blazer over an ivory silk camisole top, subtle gold hoop earrings, radiant cultural correspondent poise.",
      relativePath: "public/avatars/master_lucia_archive/domain_chroma_wall_standing_terracotta_linen_blazer/lucia_terracotta_linen_blazer_01_M1_chroma_stand_base.jpg",
      personaId: "lucia",
      category: "broadcast",
    },
  ],

  // ------------------------------------------------------------
  // Jeremiah (Veteran Investigative Journalist & Legal Affairs)
  // ------------------------------------------------------------
  jeremiah: [
    {
      id: "charcoal_wool_vest",
      label: "⚖️ Charcoal Herringbone Wool Waistcoat Vest",
      description: "A classic charcoal grey herringbone wool waistcoat vest with antique bronze pocket watch chain over a crisp white spread-collar dress shirt, loosened silk tie, seasoned investigative poise.",
      relativePath: "public/avatars/master_jeremiah_archive/domain_chroma_wall_standing_charcoal_wool_vest/jeremiah_charcoal_wool_vest_01_M1_chroma_stand_base.jpg",
      personaId: "jeremiah",
      category: "broadcast",
    },
  ],

  // ------------------------------------------------------------
  // Marina (Marine Conservation & Environmental Science)
  // ------------------------------------------------------------
  marina: [
    {
      id: "cerulean_silk_blouse",
      label: "🌊 Ocean Cerulean Blue Tailored Silk Blouse",
      description: "A vibrant ocean cerulean blue tailored silk button-down blouse with mother-of-pearl buttons, tailored navy slacks, delicate silver wave pendant, marine science anchor poise.",
      relativePath: "public/avatars/master_marina_archive/domain_chroma_wall_standing_cerulean_silk_blouse/marina_cerulean_silk_blouse_01_M1_chroma_stand_base.jpg",
      personaId: "marina",
      category: "broadcast",
    },
  ],

  // ------------------------------------------------------------
  // Miles (Silicon Valley Tech Entrepreneur & Future Tech)
  // ------------------------------------------------------------
  miles: [
    {
      id: "graphite_minimalist_overshirt",
      label: "🚀 Graphite Grey Technical Zip Overshirt",
      description: "A modern minimalist matte graphite grey technical zip overshirt worn over a charcoal bamboo-cotton crewneck, dark tapered chinos, tech founder poise.",
      relativePath: "public/avatars/master_miles_archive/domain_chroma_wall_standing_graphite_minimalist_overshirt/miles_graphite_minimalist_overshirt_01_M1_chroma_stand_base.jpg",
      personaId: "miles",
      category: "techwear",
    },
  ],

  // ------------------------------------------------------------
  // Victoria (High-Fashion & Luxury Business Anchor)
  // ------------------------------------------------------------
  victoria: [
    {
      id: "plum_sculpted_blazer",
      label: "✨ Sculpted Deep Plum Crepe Blazer & Satin Shawl",
      description: "A sculpted deep plum-burgundy tailored crepe blazer with black satin shawl lapels, minimalist gold hardware accents, sleek dark updo, prime-time luxury anchor poise.",
      relativePath: "public/avatars/master_victoria_archive/domain_chroma_wall_standing_plum_sculpted_blazer/victoria_plum_sculpted_blazer_01_M1_chroma_stand_base.jpg",
      personaId: "victoria",
      category: "broadcast",
    },
  ],

  // ------------------------------------------------------------
  // Ian (Geopolitical Conflict Analyst)
  // ------------------------------------------------------------
  ian: [
    {
      id: "olive_tactical_blazer",
      label: "🌍 Dark Olive Tactical Wool Blazer & Black Mock-Neck",
      description: "A structured dark olive green tailored wool blazer with clean concealed pockets over a black merino mock-neck top, military and geopolitical precision poise.",
      relativePath: "public/avatars/master_ian_archive/domain_chroma_wall_standing_olive_tactical_blazer/ian_olive_tactical_blazer_01_M1_chroma_stand_base.jpg",
      personaId: "ian",
      category: "broadcast",
    },
  ],

  // ------------------------------------------------------------
  // Valentina (Financial Markets & Crypto Anchor)
  // ------------------------------------------------------------
  valentina: [
    {
      id: "sapphire_peplum_suit",
      label: "📈 Royal Sapphire Blue Peplum Tailored Suit",
      description: "An architectural royal sapphire blue tailored peplum blazer with cinched waist belt over an ivory silk camisole and matching sapphire trousers, Wall Street anchor poise.",
      relativePath: "public/avatars/master_valentina_archive/domain_chroma_wall_standing_sapphire_peplum_suit/valentina_sapphire_peplum_suit_01_M1_chroma_stand_base.jpg",
      personaId: "valentina",
      category: "broadcast",
    },
  ],

  // ------------------------------------------------------------
  // Facundo (Sports & Extreme Athletics Correspondent)
  // ------------------------------------------------------------
  facundo: [
    {
      id: "black_crimson_track_jacket",
      label: "⚡ Matte Black & Crimson Technical Track Jacket",
      description: "A high-performance matte black technical athletic jacket with crimson red chevron accents and high zipped collar, athletic athletic correspondent poise.",
      relativePath: "public/avatars/master_facundo_archive/domain_chroma_wall_standing_black_crimson_track_jacket/facundo_black_crimson_track_jacket_01_M1_chroma_stand_base.jpg",
      personaId: "facundo",
      category: "techwear",
    },
  ],

  // ------------------------------------------------------------
  // Fede (Digital Media & Creator Economy Anchor)
  // ------------------------------------------------------------
  fede: [
    {
      id: "slate_casual_blazer",
      label: "🎙️ Slate Grey Unstructured Knit Blazer & White Tee",
      description: "A tailored slate grey unstructured knit blazer over a crisp heavyweight white crewneck tee, dark slim jeans, youthful digital media anchor poise.",
      relativePath: "public/avatars/master_fede_archive/domain_chroma_wall_standing_slate_casual_blazer/fede_slate_casual_blazer_01_M1_chroma_stand_base.jpg",
      personaId: "fede",
      category: "casual",
    },
  ],

  // ------------------------------------------------------------
  // Taylor (Energy Sector & Renewable Infrastructure)
  // ------------------------------------------------------------
  taylor: [
    {
      id: "forest_green_powersuit",
      label: "🌿 Deep Forest Green Double-Breasted Powersuit",
      description: "A tailored deep forest green double-breasted crepe powersuit with brushed gold buttons over an ivory scoop-neck top, clean modern energy analyst poise.",
      relativePath: "public/avatars/master_taylor_archive/domain_chroma_wall_standing_forest_green_powersuit/taylor_forest_green_powersuit_01_M1_chroma_stand_base.jpg",
      personaId: "taylor",
      category: "broadcast",
    },
  ],
};

// ============================================================
// Universal Broadcast Attire Presets (For all other personas)
// ============================================================
export const UNIVERSAL_BROADCAST_ATTIRES: PersonaAttire[] = [
  {
    id: "classic_navy_blazer_suit",
    label: "🧥 Classic Navy Double-Breasted Studio Blazer",
    description: "Crisp navy blue double-breasted tailored news anchor suit blazer with gold buttons, crisp white collared silk blouse underneath.",
    category: "broadcast",
  },
  {
    id: "charcoal_executive_suit",
    label: "👔 Charcoal Grey Executive Two-Piece Suit",
    description: "Tailored charcoal grey single-button studio blazer with matching trousers, pressed white dress shirt, minimalist silver jewelry.",
    category: "broadcast",
  },
  {
    id: "crimson_anchor_suit",
    label: "🔴 Crimson Red Tailored Studio Suit",
    description: "Tailored crimson red single-button executive blazer with matching trousers, black silk camisole underneath, modern television anchor attire.",
    category: "broadcast",
  },
  {
    id: "ivory_white_sheath",
    label: "🤍 Ivory White Structured Studio Sheath Dress",
    description: "Crisp ivory white structured sheath dress with gold cuff bracelets, modern anchor elegance.",
    category: "broadcast",
  },
  {
    id: "black_cashmere_turtleneck",
    label: "💼 Minimalist Black Cashmere Turtleneck (Tech Lead)",
    description: "Fitted fine-knit black cashmere turtleneck, minimalist silver watch on wrist, sleek contemporary tech executive style.",
    category: "techwear",
  },
];

// ============================================================
// Dynamic Attire Resolver (Combines Persona Catalog + DB records)
// ============================================================
export async function getAttiresForPersona(persona: Persona): Promise<PersonaAttire[]> {
  const pId = persona.id.toLowerCase();
  const specific = PERSONA_SPECIFIC_ATTIRES[pId] || [];

  // Default persona trait attire as a choice
  const defaultTraitAttire: PersonaAttire | null = persona.traits.defaultAttire ? {
    id: `${pId}_default_trait`,
    label: `⭐ Default Character Attire: ${persona.traits.defaultAttire.slice(0, 45)}...`,
    description: persona.traits.defaultAttire,
    personaId: pId,
    category: "broadcast",
  } : null;

  // Try querying Prisma for custom PersonaMasterImage attires if available
  let dbAttires: PersonaAttire[] = [];
  try {
    const masterImages = await prisma.personaMasterImage.findMany({
      where: { persona: { slug: pId } },
      take: 10,
    });

    dbAttires = masterImages.map((m) => ({
      id: `db_${m.id}`,
      label: `🗄️ Database Master: ${m.attire}`,
      description: m.promptUsed || m.attire,
      relativePath: m.storageKey ? `public/${m.storageKey.replace(/^\//, "")}` : undefined,
      personaId: pId,
      category: "broadcast" as const,
    }));
  } catch {
    // Database query is optional/non-blocking
  }

  const combined = [
    ...specific,
    ...(defaultTraitAttire ? [defaultTraitAttire] : []),
    ...dbAttires,
    ...UNIVERSAL_BROADCAST_ATTIRES,
  ];

  // Deduplicate by ID
  const seen = new Set<string>();
  return combined.filter((a) => {
    if (seen.has(a.id)) return false;
    seen.add(a.id);
    return true;
  });
}

export const getPersonaAttires = getAttiresForPersona;

// ============================================================
// Helper: Resolve Persona Avatar Path
// ============================================================
export function resolvePersonaAvatarPath(persona: Persona): string {
  const pId = persona.id.toLowerCase();
  const candidates = [
    path.join(process.cwd(), "public", "avatars", `${pId}.png`),
    path.join(process.cwd(), "public", "avatars", `${pId}.jpg`),
    path.join(process.cwd(), "public", "avatars", `${pId}.jpeg`),
    path.join(process.cwd(), "public", "avatars", `${pId}.webp`),
    persona.avatarUrl ? path.join(process.cwd(), "public", persona.avatarUrl.replace(/^\//, "")) : "",
    path.join(process.cwd(), "public", "avatars", `master_${pId}_archive`, `${pId}_master_anchor.png`),
    path.join(process.cwd(), "public", "avatars", `master_${pId}_archive`, `${pId}_master.png`),
    path.join(process.cwd(), "public", "avatars", `master_${pId}`, `${pId}_master_anchor.png`),
    path.join(process.cwd(), "public", "avatars", `${pId}_ref.png`),
    path.join(process.cwd(), "public", "avatars", `${pId}_ref.jpg`),
  ];

  for (const candidate of candidates) {
    if (candidate && fs.existsSync(candidate)) {
      return path.resolve(candidate);
    }
  }

  return "";
}

export function resolvePersonaBodyRefPath(persona: Persona): string | null {
  const pId = persona.id.toLowerCase();
  const candidates = [
    path.join(process.cwd(), "public", "avatars", `${pId}_body_ref.png`),
    path.join(process.cwd(), "public", "avatars", `${pId}_uncensored_body_ref.png`),
    path.join(process.cwd(), "public", "avatars", `${pId}_ref.png`),
    path.join(process.cwd(), "public", "avatars", `${pId}.png`),
    path.join(process.cwd(), "public", "avatars", `${pId}.jpg`),
  ];

  for (const candidate of candidates) {
    if (candidate && fs.existsSync(candidate)) {
      return path.resolve(candidate);
    }
  }

  return null;
}


