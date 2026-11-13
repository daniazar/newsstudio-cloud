// src/data/prompt_presets.ts
import promptdexterCategoriesJson from "./promptdexter_categories.json";
import generatedPresetsJson from "./generated_presets.json";

export interface PresetItem {
  title: string;
  desc: string;
  imageDesc?: string;
  videoDesc?: string;
  soundEffects?: string;
  isStudioApproved?: boolean;
  isFullAttire?: boolean;
}

export interface PresetSection {
  sectionName: string;
  items: PresetItem[];
}

export interface PresetCategory {
  subCategoryName: string;
  sections: PresetSection[];
}

export interface CategoriesData {
  medium?: PresetCategory[];
  clothing?: PresetCategory[];
  subject?: PresetCategory[];
  pose?: PresetCategory[];
  indoor?: PresetCategory[];
  nude?: PresetCategory[];
  [key: string]: PresetCategory[] | undefined;
}

// Define custom studio clothing presets
export const STUDIO_CLOTHING_PRESETS: PresetCategory = {
  subCategoryName: "Studio Presets",
  sections: [
    {
      sectionName: "Professional Newsroom Attire",
      items: [
        { title: "Tailored Forest-Green Blazer & Pants", desc: "attire: sharp double-breasted forest-green blazer over a cream silk blouse, paired with matching forest-green dress pants", soundEffects: "papers rustling, distant newsroom chatter, keyboard typing", isStudioApproved: true, isFullAttire: true },
        { title: "Corporate White Shirt & Navy Pencil Skirt", desc: "attire: crisp white button-up collared shirt, tailored navy blue pencil skirt", soundEffects: "papers rustling, distant newsroom chatter", isStudioApproved: true, isFullAttire: true },
        { title: "Minimalist Black Turtleneck, Grey Blazer & Trousers", desc: "attire: minimalist black turtleneck shirt, tailored grey blazer, paired with tailored black slim-fit trousers", isStudioApproved: true, isFullAttire: true },
        { title: "Tweed Blazer & Grey Wool Trousers (Dark Academia)", desc: "attire: classic dark academia brown tweed blazer, cream button-up shirt, paired with charcoal grey wool trousers", isStudioApproved: true, isFullAttire: true },
        { title: "Beige Trench Coat, Black Top & Beige Pants", desc: "attire: chic beige travel trench coat over a black knit top, paired with tailored beige dress pants", isStudioApproved: true, isFullAttire: true },
        { title: "Tailored Navy Suit with Blouse & Trousers", desc: "attire: professional dark navy blue blazer with a light blue silk blouse, paired with matching navy blue trousers", isStudioApproved: true, isFullAttire: true },
        { title: "Burgundy Blazer & Black Pencil Skirt", desc: "attire: sharp burgundy blazer, black collared blouse, charcoal pencil skirt", isStudioApproved: true, isFullAttire: true },
        { title: "Charcoal Grey Dress Pants & Vest", desc: "attire: charcoal grey buttoned suit vest over a crisp white button-up shirt, matching dress pants", isStudioApproved: true, isFullAttire: true }
      ]
    },
    {
      sectionName: "On-Location / Field Attire",
      items: [
        { title: "Cream Wool Sweater & Jeans", desc: "attire: thick knitted cream-colored wool sweater, dark blue jeans", soundEffects: "light wind, distant traffic, outdoor ambience", isStudioApproved: true, isFullAttire: true },
        { title: "Winter Puffer Jacket & Red Knitted Scarf", desc: "attire: thick black puffer jacket with a faux-fur hood, red knitted scarf", soundEffects: "heavy wind, crunching snow", isStudioApproved: true, isFullAttire: false },
        { title: "Vibrant Sundress (Orange and Pink)", desc: "attire: vibrant orange and pink flowy summer sundress, bare shoulders", isStudioApproved: true, isFullAttire: true },
        { title: "Graphic Band Tee & Varsity Jacket", desc: "attire: graphic vintage t-shirt, retro navy blue and white varsity jacket", isStudioApproved: true, isFullAttire: false },
        { title: "Floral Print Sundress & Straw Hat", desc: "attire: light green floral print sundress, straw hat", isStudioApproved: true, isFullAttire: true },
        { title: "Oversized Grey Hoodie & Denim Shorts", desc: "attire: loose-fitting oversized grey hoodie, high-waisted denim shorts, white sneakers", isStudioApproved: true, isFullAttire: true },
        { title: "Athletic Windbreaker & Black Leggings", desc: "attire: athletic wear, dark windbreaker, black leggings, hiking boots", isStudioApproved: true, isFullAttire: true }
      ]
    },
    {
      sectionName: "Creative / Studio Attire",
      items: [
        { title: "Flashy Metallic Silver Bomber Jacket & Pink Crop Top", desc: "attire: flashy metallic silver bomber jacket left open over a tight neon pink crop top, black leather pants", isStudioApproved: true, isFullAttire: true },
        { title: "Dark Leather Jacket with Neon Purple Lining", desc: "attire: dark leather jacket with neon purple linings over a black top", isStudioApproved: true, isFullAttire: false },
        { title: "Elegant Floor-length Sparkling Evening Gown", desc: "attire: elegant floor-length sparkling black evening gown with a high thigh slit", isStudioApproved: true, isFullAttire: true },
        { title: "White Laboratory Coat & Slim-fit Trousers", desc: "attire: clean white laboratory coat, black slim-fit trousers, silver rimmed glasses", isStudioApproved: true, isFullAttire: true },
        { title: "Linen Tunic & Loose Trousers", desc: "attire: flowing, lightweight white linen tunic and matching loose trousers", isStudioApproved: true, isFullAttire: true },
        { title: "Reflective Purple Biker Jacket & Leather Top", desc: "attire: reflective metallic purple biker jacket, black tight leather top", isStudioApproved: true, isFullAttire: false },
        { title: "Glittering Silver Sequined Crop Top", desc: "attire: glittering silver sequined crop top, dark tight pants", isStudioApproved: true, isFullAttire: false },
        { title: "Sleek Dojo Uniform (Black & Red Sash)", desc: "attire: sleek black sleeveless martial arts training uniform with a red sash", isStudioApproved: true, isFullAttire: true },
        { title: "Retro Polka-dot Diner Dress", desc: "attire: red and white polka-dot retro diner dress, vintage hairstyle", isStudioApproved: true, isFullAttire: true }
      ]
    }
  ]
};

// Define all adult / glamour presets
export const NUDE_SHEER_PRESETS_LIST: PresetCategory[] = [
  {
    subCategoryName: "Nude - Groin Style",
    sections: [
      {
        sectionName: "Groin & Pubic Base Styling",
        items: [
          { title: "Clean-Shaven (Smooth Slit)", desc: "fully detailed shaved groin area, smooth clean-shaven pubic region, realistic soft pink vulva cleft anatomy" },
          { title: "Landing Strip", desc: "fully detailed groin area, landing strip pubic hair style, realistic vulva cleft anatomy" },
          { title: "Natural (Hairy Bush)", desc: "fully detailed groin area, natural full pubic hair bush, realistic vulva cleft anatomy" },
          { title: "Short Trimmed Triangle", desc: "fully detailed groin area, short trimmed triangle of pubic hair, realistic vulva cleft anatomy" },
          { title: "Shaved Heart Shape", desc: "fully detailed groin area, small neat shaved heart shape of pubic hair, realistic vulva cleft anatomy" },
          { title: "Male (Circumcised)", desc: "groin style: realistic male anatomy, a circumcised shaft with a defined glans, the base of the member starts at the groin and grows from there, organically and firmly connected to the pubic mound, scrotum hanging below, smooth pelvic skin" },
          { title: "Male (Uncircumcised)", desc: "groin style: realistic male anatomy, an uncircumcised penis with skin covering the head, the base of the dick starts at the groin and grows from there, organically and firmly connected to the pubic area, scrotum hanging below" },
          { title: "Male (Hairy)", desc: "groin style: realistic male anatomy, hairy groin area, the base of the member starts at the groin and grows from there, organically and firmly connected to the pubic mound, with testicles hanging below" },
          { title: "Futanari Intersex Anatomy", desc: "groin style: futanari anatomy, a single penis shaft attached to the pubic mound directly above a detailed soft pink vulva cleft, testicles hanging underneath" },
          { title: "Futanari (Double Shafts)", desc: "groin style: futanari anatomy, two side-by-side penis shafts attached to the pubic mound directly above a detailed soft pink vulva cleft, testicles hanging underneath" },
          { title: "Futanari (Tentacle Shaft)", desc: "groin style: futanari fantasy anatomy, a ribbed purple tentacle penis attached to the pubic mound directly above a detailed vulva cleft, testicles hanging underneath" },
          { title: "TS Transgender Female (Pre-Op Penis)", desc: "groin style: TS transgender female pre-op anatomy, smooth feminine pubic mound with a single penis shaft and scrotum" },
          { title: "TS Transgender Female (Tucked)", desc: "groin style: TS transgender female tucked anatomy, smooth feminine pelvic mound with intimate member tucked neatly between smooth thighs" },
          { title: "TS Shemale / Ladyboy (Clean-Shaven)", desc: "groin style: TS shemale ladyboy anatomy, clean-shaven smooth feminine pubic mound with a penis shaft and testicles" },
          { title: "TS Trans Woman (Post-Op Neovulva)", desc: "groin style: TS transgender female post-op neovulva anatomy, fully detailed realistic surgical neovulva cleft, smooth feminine pubic mound" },
          { title: "Hermaphrodite Genitalia", desc: "groin style: hermaphrodite anatomy, fully developed male penis and testicles sitting directly alongside a fully detailed realistic female vulva cleft" },
          { title: "Intersex Blended Anatomy", desc: "groin style: intersex anatomy, realistic blending of male and female intimate areas, clear anatomical features" }
        ]
      }
    ]
  },
  {
    subCategoryName: "Nude - Genital Size & Length",
    sections: [
      {
        sectionName: "Clitoris & Labia Proportions",
        items: [
          { title: "Petite Clitoris", desc: "groin detail: delicate petite clitoris hidden under the hood" },
          { title: "Prominent Enlarged Clitoris", desc: "groin detail: prominent enlarged sensitive clitoris protruding slightly" },
          { title: "Swollen Labia Majora", desc: "groin detail: thick swollen labia majora, puffy outer lips" },
          { title: "Soft Exposed Labia Minora", desc: "groin detail: soft thin labia minora extending slightly past the outer lips" }
        ]
      },
      {
        sectionName: "Penis & Futanari Shaft Dimensions",
        items: [
          { title: "Compact 4-inch Shaft", desc: "groin detail: 4-inch penis shaft, scrotum hanging below" },
          { title: "Standard 6-inch Shaft", desc: "groin detail: average 6-inch penis shaft with clean definition" },
          { title: "Large 8-inch Shaft", desc: "groin detail: large 8-inch penis shaft with prominent glans and visible veins" },
          { title: "Extra-Thick 9-inch Shaft", desc: "groin detail: extremely thick and long 9-inch penis shaft, heavy scrotum" },
          { title: "Hyper-Developed 10-inch Shaft", desc: "groin detail: massive hyper-developed 10-inch penis shaft, throbbing veins" }
        ]
      }
    ]
  },
  {
    subCategoryName: "Nude - Genital Fluids & States",
    sections: [
      {
        sectionName: "Erection States & Action",
        items: [
          { title: "Hard Erect Shaft", desc: "groin detail: hard rigid erect penis shaft extending outward and pointing upward" },
          { title: "Soft Flaccid Shaft", desc: "groin detail: soft flaccid penis shaft hanging naturally" },
          { title: "Throbbing Bulging Veins", desc: "groin detail: hyper-erect shaft with detailed bulging and throbbing veins along the skin" }
        ]
      },
      {
        sectionName: "Fluids, Wetness & Piercings",
        items: [
          { title: "Dripping Pre-cum Bead", desc: "groin detail: glistening bead of clear glossy pre-cum balanced on the tip of the glans head" },
          { title: "Semen-Covered Shaft", desc: "groin detail: shaft covered in sticky white semen fluid dripping down to the vulva" },
          { title: "Creamy Vulva Overflow", desc: "groin detail: detailed vulva overflowing with creamy white fluids coating the inner thighs" },
          { title: "Wet Glistening Vulva", desc: "groin detail: glistening wetness and lubrication coating the soft pink inner labia cleft" },
          { title: "Prince Albert Ring Piercing", desc: "jewelry: heavy silver Prince Albert ring piercing vertically through the glans" },
          { title: "Christina Genital Piercing", desc: "jewelry: silver christina genital piercing sitting at the top of the vulva cleft" },
          { title: "Labia Minora Hoop Piercings", desc: "jewelry: multiple tiny silver hoop rings pierced along the labia minora" }
        ]
      }
    ]
  },
  {
    subCategoryName: "Nude - Breast Shapes & Sizes",
    sections: [
      {
        sectionName: "Breast Proportions",
        items: [
          { title: "Voluptuous Large Breasts (DD)", desc: "voluptuous natural breasts, DD cup size, rounded full structure" },
          { title: "Giant Breasts (DDD)", desc: "extremely large voluptuous DDD cup breasts, heavy weight" },
          { title: "Natural Teardrop Breasts", desc: "natural teardrop-shaped breasts, soft sloping structure" },
          { title: "Firm Round Implants", desc: "firm perfectly round breast implants, high projection" },
          { title: "Small Perky Breasts", desc: "small perky A-cup breasts, firm self-supporting structure" },
          { title: "Average Symmetrical Breasts", desc: "symmetrical natural average-sized C-cup breasts, soft rounded structure" },
          { title: "Heavy Sagging Breasts", desc: "heavy sagging natural breasts resting on the torso" },
          { title: "Wide-Set Breasts", desc: "symmetrical wide-set breasts, natural sloping cleavage" },
          { title: "Extra Large Gigantic Breasts (38H)", desc: "body detail: extremely large gigantic breasts (size 38H), massive spherical bust causing severe skin tension, extreme cleavage, heavy sagging under weight" },
          { title: "Colossal Hyper-Gigantic Breasts (44J)", desc: "body detail: colossal hyper-gigantic breasts (size 44J), massive overflowing soft round bust, extreme cleavage skin crease" }
        ]
      }
    ]
  },
  {
    subCategoryName: "Nude - Nipple & Areola details",
    sections: [
      {
        sectionName: "Nipple Variations & Details",
        items: [
          { title: "Pert & Erect Nipples", desc: "prominent erect nipples, highly detailed skin texture" },
          { title: "Puffy Pink Areolas", desc: "puffy pink areolas, soft edges, erect center" },
          { title: "Large & Dark Nipples", desc: "large dark brown erect nipples with wide bumpy areolas" },
          { title: "Small Dark Brown Areolas", desc: "small dark brown tight areolas, pert nipples" },
          { title: "Inverted Delicate Nipples", desc: "delicate inverted nipples recessed into soft pink areolas" },
          { title: "Elongated Thick Nipples", desc: "elongated thick erect nipples, highly defined" },
          { title: "Tiny Flat Nipples", desc: "tiny flat nipples on smooth pale areolas" },
          { title: "Rose-Tinted Areolas", desc: "rose-tinted soft pink areolas, delicate texture" },
          { title: "Areolas with heavy suck marks", desc: "breast detail: prominent areolas with red circular hickey suck marks and bruising" }
        ]
      }
    ]
  },
  {
    subCategoryName: "Nude - Body Curves & Thighs",
    sections: [
      {
        sectionName: "Body Build & Proportions",
        items: [
          { title: "Wide Childbearing Hips", desc: "wide curvy childbearing hips, dramatic waist-to-hip ratio" },
          { title: "Thick Rubenesque Thighs", desc: "thick voluptuous thighs, soft skin, full curves" },
          { title: "Bubble Butt (Round & Full)", desc: "prominent round bubble butt, full spherical shape, wide curvy hips" },
          { title: "Firm Athletic Glutes", desc: "toned athletic buttocks, firm muscles, tight athletic hips" },
          { title: "Hourglass Figure", desc: "classic slim hourglass figure, narrow waist, voluptuous bust and hips" },
          { title: "Slender Runner's Body", desc: "slender runner's body, lean muscles, flat stomach, definition" },
          { title: "Muscular Ripped Abs", desc: "strong muscular toned body, ripped six-pack abs, defined oblique lines" },
          { title: "Soft Chubby Tummy", desc: "soft chubby tummy, rounded belly, voluptuous love handles" },
          { title: "Extremely Narrow Corset Waist", desc: "body detail: extremely narrow tiny waist resembling tight corset training, dramatic hourglass silhouette" },
          { title: "Soft Fleshy Love Handles", desc: "body detail: soft fleshy love handles on hips, plump curves" }
        ]
      }
    ]
  },
  {
    subCategoryName: "Nude - Tan Lines & Skin Texturing",
    sections: [
      {
        sectionName: "Tan Lines, Markings & Skin Details",
        items: [
          { title: "Bikini Tan Lines", desc: "visible bikini tan lines, sun-kissed skin contrast" },
          { title: "Monokini Tan Lines", desc: "dramatic monokini cutout tan lines on hips and torso" },
          { title: "Seamless Tan-Free Skin", desc: "completely seamless even-toned tan-free skin" },
          { title: "Glowing Body Oil Sheen", desc: "glistening sheen of light body oil on chest, torso and legs" },
          { title: "Light Goosebumps", desc: "light goosebumps texturing the skin of arms and bare legs" },
          { title: "Soft Hip Stretch Marks", desc: "soft faint natural stretch marks on hips and buttocks" },
          { title: "Porcelain Complexion", desc: "smooth pale porcelain skin complexion" },
          { title: "Freckled Shoulders", desc: "scattered natural freckles on shoulders, chest, and bridge of nose" },
          { title: "Wet Water Droplets", desc: "water droplets glistening on bare skin, wet skin" },
          { title: "Glistening Sweat Sheen", desc: "skin detail: heavy glistening sweat sheen coating the forehead, neck, chest, and torso" },
          { title: "Faint Red Spanking Welts", desc: "skin detail: faint red spanking welts and finger marks on the buttocks skin, BDSM detail" },
          { title: "Collar Red Chafing Marks", desc: "skin detail: slight red chafing and pressure marks around the neck from a tight collar" },
          { title: "Intimate Rope Marks", desc: "skin detail: detailed indentations and red rope burn marks wrapping around the chest and thighs from shibari ropes" }
        ]
      }
    ]
  },
  {
    subCategoryName: "Nude - Fantasy & Extreme Anatomy",
    sections: [
      {
        sectionName: "Fantasy Modifiers & Details",
        items: [
          { title: "Dick Nipples", desc: "fantasy anatomy: erect micro-penises in place of nipples on both breasts, realistic shaft and glans details, clear placement" },
          { title: "Vulva Nipples", desc: "fantasy anatomy: small realistic pink vulva clefts in place of nipples on both breasts, soft labia detail" },
          { title: "Nipple Tongues", desc: "fantasy anatomy: tiny pink tongues sticking out from the tip of each nipple" },
          { title: "Quadruple Breasts (Four)", desc: "fantasy anatomy: four symmetrical breasts arranged vertically on chest, two upper voluptuous breasts and two lower perky breasts" },
          { title: "Demon / Succubus Tail", desc: "accessory: a long slender black demon tail with a pointed spade tip wrapping around her thigh, fantasy accessory" },
          { title: "Elf / Pointed Ears", desc: "facial feature: long elegant pointed elf ears, delicate cartilage ridges" },
          { title: "Succubus Wings", desc: "fantasy accessory: large leathery black succubus wings extending from her back, folded" },
          { title: "Cat Ears (Nekomimi)", desc: "fantasy feature: fuzzy animal cat ears on top of head, blending into head hair" },
          { title: "Demon Horns", desc: "fantasy feature: twin glossy black curved demon horns protruding from forehead" }
        ]
      }
    ]
  },
  {
    subCategoryName: "Bondage - Sex Toys & Chastity",
    sections: [
      {
        sectionName: "Adult Toys & Inserts",
        items: [
          { title: "Double-ended Dildo", desc: "accessory: a thick double-ended purple silicone dildo inserted between the thighs, realistic texture" },
          { title: "Vibrating Bullet Insert", desc: "accessory: a small silver bullet vibrator with a thin wire inserted inside her vulva, glistening wetness" },
          { title: "Glass / Acrylic Dildo", desc: "accessory: a clear transparent glass dildo inserted, reflecting studio light" },
          { title: "Tentacle Dildo", desc: "accessory: a textured green tentacle-shaped dildo inserted, BDSM toy" },
          { title: "Suction Cup mounted Dildo", desc: "accessory: a large black suction-cup dildo mounted on the floor, glistening shaft" },
          { title: "Inflatable Anal Plug", desc: "accessory: an inflatable black rubber anal plug inserted, pulsing skin tension at the rectum entrance" },
          { title: "Stainless Steel Clitoral Weight", desc: "jewelry: a heavy stainless steel clitoral clamp with a dangling steel weight bead" },
          { title: "Pink Silicone Butt Plug (Fox Tail)", desc: "accessory: a pink silicone butt plug inserted, long fluffy brown fox tail attachment hanging between the thighs" },
          { title: "Glass Anal Beads", desc: "accessory: a string of clear glass anal beads inserted, detailed glistening glass bead ridges" }
        ]
      },
      {
        sectionName: "Chastity Locks",
        items: [
          { title: "Female Chastity Belt", desc: "accessory: wearing a polished steel BDSM female chastity belt, padlock lock on the front shield, locking straps wrapping around the hips" },
          { title: "Male Chastity Cage", desc: "accessory: wearing a small silver metal male BDSM chastity cage on the penis, small brass padlock at the base" },
          { title: "Leather Chastity Harness", desc: "accessory: a thick black leather BDSM chastity harness covering the groin, locked metal buckle" },
          { title: "Spiked Chastity Cage", desc: "accessory: a plastic spiked male chastity cage, locking pin" }
        ]
      }
    ]
  },
  {
    subCategoryName: "Nude - Piercings, Chains & Weighted Chains",
    sections: [
      {
        sectionName: "Weighted Piercings & Heavy Chains",
        items: [
          { title: "Weighted Nipple Chains", desc: "jewelry: heavy steel weights and dangling chain links hanging from both nipple rings, pulling the nipples downwards" },
          { title: "Weighted Clitoral Hood Chain", desc: "jewelry: silver vertical clitoral hood (VCH) piercing with a dangling fine chain ending in a small brass padlock weight" },
          { title: "Weighted Prince Albert Chain (Male)", desc: "jewelry: a heavy silver Prince Albert genital ring piercing with a thick steel bead and a short hanging chain holding a metal padlock weight" },
          { title: "Areola Clamps with Chains & Weights", desc: "jewelry: adjustable steel areola clamps with long dangling chains connected to a heavy lead ball weight" },
          { title: "Labia Clamps with Chains & Weights", desc: "jewelry: silver BDSM labia clamps with tiny chains connected to a small hanging steel weight between the thighs" },
          { title: "Weighted Nipple Clamps (100g Steel)", desc: "jewelry: silver steel BDSM nipple clamps attached to both breasts, holding a thick dangling metal chain connected to a heavy 100g spherical iron weight hanging down" },
          { title: "Heavy Padlock Hanging from Areola", desc: "jewelry: areola clamps attached, holding a thick chrome chain and a heavy master padlock weighing down the breast tissue" }
        ]
      },
      {
        sectionName: "Harness & Body Chains",
        items: [
          { title: "Heavy Gold Nipple-to-Navel Chain", desc: "jewelry: heavy chunky gold chain connecting both nipple rings to the navel ring" },
          { title: "Double-Strand Silver Nipple-to-Navel Chain", desc: "jewelry: double-stranded fine silver chain connecting nipple rings to navel" },
          { title: "Spiked Collar Nipple-to-Choker Chains", desc: "jewelry: thin steel chains connecting nipple rings to a spiked leather collar choker with a tiny hanging padlock at the throat" },
          { title: "Triple-Strand Nipple-to-Nipple Chain", desc: "jewelry: triple-stranded silver chain connecting nipple piercings together across the chest with tiny hanging steel beads" },
          { title: "Beaded Pearl Groin-to-Waist Harness", desc: "jewelry: delicate body harness made of white pearls and gold chains wrapping from waist to groin" },
          { title: "Hanging Coin Intimate Groin Chain", desc: "jewelry: gold intimate groin chain with tiny hanging gold coins resting on the pubic area" },
          { title: "Emerald Gemstone Belly Chain", desc: "jewelry: layered gold belly chain set with small green emerald gemstones wrapping around waist" },
          { title: "Tight Steel Body Chain Harness", desc: "jewelry: intricate spiderweb harness made of thin steel chain links wrapping tightly around her throat, shoulders, breasts, and stomach" }
        ]
      }
    ]
  },
  {
    subCategoryName: "Bondage - Milking & Stimulation Devices",
    sections: [
      {
        sectionName: "Milking Machines & Electro stimulators",
        items: [
          { title: "Electric Breast Milker", desc: "accessory: electric breast pump milking device attached to her breasts, motorized suction cups pulsing rhythmically, extracting machine" },
          { title: "TENS Unit Electro-Play Pads", desc: "accessory: TENS unit electric shock pads attached to both nipples, thin cables running to a digital control box with glowing blue LED screen, BDSM electro-play device" },
          { title: "Male Automatic Milking Machine", desc: "accessory: a high-tech automatic silicone milking cup sleeve attached to the penis, clear suction tubes connected to a digital collector machine, semen extractor" },
          { title: "Electric Vaginal/Clitoral Pump", desc: "accessory: automatic electric vacuum suction pump cylinder covering the vulva cleft, digital pressure gauge, visible skin swelling" },
          { title: "Electric Wand Vibrator (Hitachi)", desc: "accessory: a heavy white electric wand vibrator pressed firmly against her clitoris, head vibrating intensely, BDSM stimulation" },
          { title: "Electric vibrating Butt Plug", desc: "accessory: remote-controlled electric vibrating steel butt plug inserted, glistening rectal entrance" },
          { title: "Electric Nipple Suckers", desc: "accessory: twin motorized electric suction cups attached to both nipples, vibrating intensely, visible swelling" },
          { title: "Breast Suction Cups (Manual)", desc: "accessory: clear acrylic suction cups covering both breasts, visible skin swelling, BDSM device" },
          { title: "Clitoral Vacuum Suction (Manual)", desc: "accessory: a pink clitoral vacuum stimulator device placed over the vulva cleft, glistening wet skin" }
        ]
      }
    ]
  },
  {
    subCategoryName: "Nude - Interactive Poses & Actions",
    sections: [
      {
        sectionName: "Softcore Poses",
        items: [
          { title: "Hair Threading", desc: "pose: standing, fingers threading through her hair, looking seductively at the camera, parted lips" },
          { title: "Shower Wet Look", desc: "pose: standing under a gentle stream of shower water, water dripping down her face and chest, wet hair, closed eyes" },
          { title: "Knees pulled up", desc: "pose: sitting on a bed with her knees pulled up to her chest, chin resting on her knees, bare shoulders, looking into the distance" },
          { title: "Collar Pull", desc: "pose: looking at the camera, using index finger to pull down the collar of her shirt to reveal her collarbone and upper chest" }
        ]
      },
      {
        sectionName: "Semi-Explicit Poses",
        items: [
          { title: "Cleavage display", desc: "pose: standing with hands on her hips, bare chest, arched back, pushing her breasts forward, confident eye contact" },
          { title: "Touching over lace", desc: "pose: sitting, hands rubbing her inner thighs and pubic area over sheer lace panties, eyes closed in ecstasy" },
          { title: "All Fours Arched", desc: "pose: kneeling on all fours on a bed, arched back, chest lowered, buttocks pushed upwards towards the camera" }
        ]
      },
      {
        sectionName: "Explicit Poses & Actions",
        items: [
          { title: "Groin Spreading", desc: "pose: lying on a white sheet, using her fingers to gently spread her vulva cleft open towards the camera, detailed close-up, realistic labia anatomy" },
          { title: "Intimate Masturbation", desc: "pose: sitting on a bed, one hand gently massaging her breasts, the other hand fingers touching her vulva cleft, closed eyes, expression of pleasure" },
          { title: "Finger Insertion", desc: "pose: lying down, fingers of one hand fully inserted into her wet glistening vulva cleft, spreading the labia minora open, detailed anatomical rendering" },
          { title: "Thrusting Dildo", desc: "pose: straddling a realistic silicone dildo, thrusting down, glistening wetness, visible insertion depth, open-mouthed pleasure expression" },
          { title: "Bending Over (Rear View)", desc: "pose: bending forward, looking back over her shoulder at the camera, hands resting on her knees, prominent display of her buttocks and groin cleft from behind" },
          { title: "Anal Play / Insertion", desc: "pose: kneeling in a doggy-style position, one hand holding her buttocks cheeks spread wide apart, revealing a chrome anal plug inserted into her rectum, detailed anatomy" },
          { title: "Finger Sucking", desc: "pose: close-up, sucking on two of her own fingers, saliva sheen on lips, wet tongue wrapped around her fingers, seductive eye contact" },
          { title: "Semen Splatter", desc: "pose: sitting, white sticky semen fluid spraying and splattering across her face, chest, and bare breasts, glistening skin" },
          { title: "Double Insertion", desc: "pose: lying on back, a vibrator inserted into her vulva and a chrome plug inserted into her rectum, detailed pelvic anatomy, wet glistening skin" },
          { title: "Riding Cowgirl position", desc: "pose: straddling her partner, riding cowgirl position, hips arched, head thrown back, hands resting on her partner's chest, chest glistening" },
          { title: "Doggy Style Intercourse", desc: "pose: kneeling on all fours, doggy style position, partner thrusting from behind, detailed groin contact, wet glistening skin" },
          { title: "Missionary Position", desc: "pose: lying on back, missionary position, legs pinned up to her shoulders, partner holding her waist, passionate eye contact" },
          { title: "Facing Camera Blowjob", desc: "pose: kneeling, facing camera, lips wrapped tightly around the shaft of a large erect penis, wet glistening saliva dripping from chin, messy hair" },
          { title: "Spitting Semen fluid", desc: "pose: close-up, spitting sticky white semen fluid from mouth, saliva and white fluids dripping down from parted lips and chin" },
          { title: "Full Climax Orgasm", desc: "pose: body arched in intense climax, eyes rolled back, mouth open in a silent cry of pleasure, chest sweating, skin glistening" }
        ]
      }
    ]
  },
  {
    subCategoryName: "Nude - Multi-Persona Interactions",
    sections: [
      {
        sectionName: "Erotic/Restraint Multi-Subject Actions",
        items: [
          { title: "Embrace & Caress", desc: "pose: two female models embracing, one model caressing the other's bare back and waist, soft-focus studio lighting" },
          { title: "Whisper & Collarbone touch", desc: "pose: one female model whispering into another female model's ear, lips brushing the earlobe, hand resting on her bare collarbone, soft cinematic shadows" },
          { title: "Breast Massage from Behind", desc: "pose: two female models, one sitting behind the other and gently cupping and massaging the front model's breasts from behind, dramatic key lighting" },
          { title: "Neck Kissing", desc: "pose: one female model kissing the side of another model's neck, holding her jawline gently, bare shoulders, intimate cinematic grading" },
          { title: "Blindfolding Action", desc: "pose: one model standing behind another model, gently placing a black satin blindfold over her eyes, soft-focus studio background" },
          { title: "Collar & Leash Holding Stance", desc: "pose: one dominant model standing, holding the steel leash chain attached to a leather posture collar worn by a kneeling model on the floor, looking at the camera" },
          { title: "Spanking over Lap", desc: "pose: one model lying face-down across the lap of a dominant model who is holding a leather paddle ready to spank, BDSM studio theme" },
          { title: "Active Shibari Tying", desc: "pose: one model standing, wrapping natural hemp rope around the chest of another kneeling model to tie a shibari harness, active bondage process" },
          { title: "Double Masturbation", desc: "pose: two female subjects lying side-by-side on a bed, caressing each other's intimate areas, fingers touching, eyes closed in ecstasy" },
          { title: "Scissoring / Tribadism grinding", desc: "pose: two female models engaged in scissoring, interlocked groin-to-groin, grinding hips together, wet skin contact, intimate embrace" },
          { title: "Threesome Explicit Intercourse", desc: "pose: three-way intercourse with two female subjects and one male partner, explicit BDSM positions, multi-persona action" },
          { title: "Forced Deepthroat deep action", desc: "pose: one submissive model kneeling, dominant hands holding the back of her head, forced deepthroat action, open-mouthed facial expression" },
          { title: "Double Penetration action", desc: "pose: one female model, simultaneous vaginal and anal double penetration by two male partners, explicit groin anatomy, wet glistening skin" },
          { title: "Dominant Whip Spanking", desc: "pose: dominant partner holding a leather crop/whip, submissive partner bound on all fours on a leather table, BDSM dungeon theme" },
          { title: "Face Sitting smothering", desc: "pose: one model sitting directly on the face of another lying partner, detailed mouth-to-groin contact, legs straddled wide" },
          { title: "Mutual 69 Position (Cunnilingus)", desc: "pose: two female models in mutual oral cunnilingus 69 position on a bed, hips locked, wet glistening skin, close-up details" },
          { title: "Strap-on Doggy Style Penetration", desc: "pose: one female model wearing a leather harness and strap-on dildo, penetrating another model kneeling doggy style, hips arched" },
          { title: "Mutual Finger Insertion", desc: "pose: two female models facing each other on a bed, simultaneously inserting fingers into each other's vulva cleft, intimate smile, eye contact" },
          { title: "Dominant Footjob Stance", desc: "pose: submissive partner kneeling, dominant partner standing and rubbing her bare feet and legs against the submissive's groin, look of superiority" },
          { title: "Suspension Shibari Tying Process", desc: "pose: dominant partner standing on a platform, wrapping thick hemp ropes around a suspended model's chest and thighs, tightening knot, active bondage" },
          { title: "Leash-walk on All Fours", desc: "pose: dominant partner standing, holding two metal leash chains attached to posture collars worn by two models crawling on all fours on a leather rug" },
          { title: "Mutual Nipple Licking / Breast Play", desc: "pose: two female models, one licking and sucking the other's nipple while caressing her breast, eyes closed, intimate embrace, wet glistening skin" },
          { title: "Vaginal Licking (Cunnilingus)", desc: "pose: one female model kneeling on a bed, head buried between another model's legs, actively licking her vulva cleft, fingers holding her thighs open, wet tongue detail" },
          { title: "Bondage Tickling (Feather duster)", desc: "pose: one model bound spread-eagle to a frame, dominant partner using a feather duster to tickle her bare feet and ribs, laughing expression, BDSM play" },
          { title: "Whipped Back Caress", desc: "pose: dominant partner gently tracing fingers over the red lash welts on a kneeling submissive model's back, comforting interaction, BDSM aftercare" },
          { title: "Semen Swallowing close-up", desc: "pose: close-up of a model swallowing white semen fluid directly from her partner's erect shaft, wet lips, saliva stream" },
          { title: "Strap-on Riding Position", desc: "pose: one female model wearing a leather harness and strap-on, partner sitting on her lap riding the strap-on dildo, holding shoulders, intense pleasure expression" },
          { title: "Oil-slicked Body Grinding", desc: "pose: two female models completely nude and coated in body oil, bodies pressed tightly together, grinding chest-to-chest and hip-to-hip, glossy skin" },
          { title: "Spit Roasting (Explicit Threesome)", desc: "pose: explicit three-way intercourse, one female model receiving a blowjob from front partner while another partner penetrates her vaginally from behind" },
          { title: "Spit Exchange / Saliva Drool", desc: "pose: dominant partner leaning over lying submissive model, spitting a glistening string of saliva directly into her open mouth, wet lips" },
          { title: "Foot Worship / Feet Licking", desc: "pose: submissive partner kneeling, kissing and licking the bare feet and toes of a dominant partner sitting on a chair, submissive posture" },
          { title: "Forced Eye Contact", desc: "pose: dominant partner holding the submissive model's chin firmly, forcing her to look up into their eyes during passionate action" },
          { title: "Hair Pulling during Oral", desc: "pose: dominant partner's hands gripping the model's long hair tightly from behind, pulling back her head during oral action" },
          { title: "Double Strap-on Penetration", desc: "pose: two female models wearing leather harnesses with strap-ons, simultaneously penetrating a third submissive model from front and back" },
          { title: "Face Slapping (Gentle BDSM)", desc: "pose: dominant partner gently slapping the cheek of a kneeling submissive model, submissive's face slightly turned, closed eyes, submissive expression" },
          { title: "Deepthroat Gagging (Tearing Eyes)", desc: "pose: model deepthroating partner's erect shaft, eyes tearing up from gag reflex, wet glistening saliva, hand gripping partner's thigh, open mouth" },
          { title: "Leather Crop Spanking", desc: "pose: dominant partner raising a leather crop/paddle over the bare buttocks of a bound submissive model on all fours on a leather table" },
          { title: "Standing Fingering action", desc: "pose: two female models standing close, bodies pressed together, hands reached down fingering each other's glistening vulva clefts, passionate kiss" },
          { title: "Leash Pulling (Head Tilted Back)", desc: "pose: submissive partner kneeling, leather collar around neck, dominant partner pulling hard on the metal leash chain, tilting her head back, submissive expression" },
          { title: "Suspended Shibari Spanking", desc: "pose: model suspended in mid-air by hemp shibari ropes, dominant partner standing beside her using a leather paddle to spank her thighs, visible skin tension" },
          { title: "Standing Oral 69 position", desc: "pose: explicit standing 69 oral sex, one model lifting and holding the other upside down, mutual oral cunnilingus, wet glistening skin" },
          { title: "Double Dildo Body Grinding", desc: "pose: two female models completely nude, sharing a strapless double-ended dildo inserted, grinding hips together, eyes closed in pleasure" },
          { title: "Spanking over Knee (Lap)", desc: "pose: submissive model draped face-down over the dominant partner's lap, dominant partner spanking her bare buttocks with a wide leather paddle, red skin marks" },
          { title: "Face Sitting (Muff Smothering)", desc: "pose: one female model sitting on the face of another model lying flat on a bed, smothering her mouth and nose with her wet vulva cleft, bottom model's hands holding her hips" },
          { title: "Oral & Anal Play Threesome", desc: "pose: explicit three-way action, one female model receiving cunnilingus from front partner while another partner fingers her rectum from behind" },
          { title: "Dual-Spanking (Two Models)", desc: "pose: two submissive models kneeling side-by-side, dominant partner standing behind them holding a leather paddle in each hand ready to spank, BDSM theme" },
          { title: "Oil-slicked Breast Grinding", desc: "pose: two female models completely nude and coated in body oil, bare breasts pressed tightly and grinding together, glossy wet skin, closed eyes" },
          { title: "Face Slapping & Spit Exchange", desc: "pose: dominant partner gently slapping the cheek of a kneeling submissive model and spitting a thread of saliva into her open mouth, wet skin, BDSM play" },
          { title: "Forced Eye Contact during Oral", desc: "pose: submissive partner kneeling, performing oral sex, dominant partner firmly holding her chin to force direct eye contact" },
          { title: "Leash-walk on All Fours (Dual Crawl)", desc: "pose: dominant partner standing, holding two metal leash chains attached to collars worn by two submissive models crawling on all fours, BDSM play" },
          { title: "Flogger Thigh Spanking (BDSM)", desc: "pose: dominant partner using a soft leather flogger on a bound submissive model's thighs, blindfolded, body arched, BDSM play" },
          { title: "Semen Facial close-up", desc: "pose: close-up of a model's face covered in white semen fluid running down her cheeks and chin, mouth slightly open, glistening skin" },
          { title: "Strap-on Doggy Style (Facing Mirror)", desc: "pose: one female model wearing a leather harness and strap-on, penetrating partner kneeling doggy style in front of a mirror, looking at reflection, arched hips" },
          { title: "Breast Play & Nipple Pinching", desc: "pose: two female models, one standing behind another and pinching her nipples while kissing her shoulder, intimate studio lighting" },
          { title: "Harness & Leash Walk (Outdoor BDSM)", desc: "pose: dominant partner walking two submissive models wearing leather body harnesses and collars on leashes in a secluded forest clearing" },
          { title: "Mutual Masturbation (Oil-slicked)", desc: "pose: two models lying face-to-face on a leather sheet, completely coated in oil, rubbing and masturbating each other's groins, deep eye contact" }
        ]
      }
    ]
  },
  {
    subCategoryName: "Nude - Attires",
    sections: [
      {
        sectionName: "Transparency & Exposure Presets",
        items: [
          { title: "Topless / Bare Chest", desc: "attire: topless, bare chest and torso" },
          { title: "Completely Nude Body", desc: "attire: completely nude body, bare skin" },
          { title: "Sheer See-Through Lace Cover-Up", desc: "attire: wearing only a sheer, see-through lace cover-up open at the front, bare breasts" },
          { title: "Transparent Thin White Tank Top (Wet)", desc: "attire: wearing only a wet, transparent thin white tank top, bare skin visible underneath" },
          { title: "Sheer Emerald Green Silk Scarf", desc: "attire: draped in a sheer emerald green silk scarf across her waist, bare chest" },
          { title: "Leather Bondage Harness", desc: "attire: wearing a black leather bondage body harness wrapping around her chest, shoulders, and waist" },
          { title: "Red Shibari Ropes", desc: "attire: wrapped in traditional red shibari ropes across her chest and torso" },
          { title: "Glossy Latex Catsuit", desc: "attire: wearing a tight glossy black latex catsuit, open crotch, exposed breasts, bondage suit" },
          { title: "Hemp Rope Harness", desc: "attire: intricate hemp rope body harness wrapping around chest, torso, and groin in tight knots, shibari style" },
          { title: "Leather Hogtie Strap", desc: "attire: bound in a black leather hogtie strap connecting her neck collar to her ankle cuffs behind her back, bondage attire" },
          { title: "Suspending Shibari Ropes", desc: "attire: wrapped in suspension shibari rope harness with steel rings, bound securely, shibari suspension" },
          { title: "Leather Hogtie Harness", desc: "attire: bound in a black leather hogtie body harness connecting wrists to ankles behind her back with metal snaps, bondage restraint" },
          { title: "Leather Arm-binder Harness", desc: "attire: bound in a black leather arm-binder harness locking her arms tightly behind her back, bondage gear" },
          { title: "Catsuit with Crotch Zipper", desc: "attire: wearing a tight glossy black latex catsuit, metallic zippers on the chest and crotch, exposed breasts, bondage suit" },
          { title: "Leather Spreader Bar Harness", desc: "attire: bound in a black leather body harness connected to a steel spreader bar between her thighs, bondage harness" },
          { title: "Rigid Steel Armbinder", desc: "attire: bound in a rigid black steel armbinder locking her arms tightly bound behind her back, bondage restraints" },
          { title: "Micro String Bikini", desc: "attire: wearing an ultra-tiny micro string bikini, minimal skin coverage" },
          { title: "Transparent Mesh Crop Top", desc: "attire: wearing a sheer transparent black mesh crop top, bare breasts visible underneath" },
          { title: "Wet Clinging White T-Shirt", desc: "attire: wearing a wet clinging white t-shirt, completely see-through, nipples visible" },
          { title: "Completely Unbuttoned Silk Shirt", desc: "attire: wearing a completely unbuttoned silk dress shirt draping off shoulders, bare chest and torso" },
          { title: "Crotchless Lace Underwear", desc: "attire: wearing crotchless black lace underwear, exposed vulva cleft" },
          { title: "Open-front Cardigan (No Bra)", desc: "attire: wearing an open-front knit cardigan left wide open with no bra, bare chest and breasts" },
          { title: "Crotchless Red Lace Bodysuit", desc: "attire: wearing a tight red lace bodysuit with a crotchless opening and open breasts, fully exposed groin cleft and nipples" },
          { title: "Suspender Belt & Stockings", desc: "attire: wearing a black lace suspender belt, sheer black thigh-high stockings, completely bare pelvic and groin area" },
          { title: "Naked Frilly Maid Apron", desc: "attire: wearing only a frilly white maid apron, completely open back and bare sides, exposed breasts and bare skin underneath" },
          { title: "Sheer Fishnet Body Stocking", desc: "attire: wearing a sheer black fishnet body stocking covering the entire body, completely exposed bare breasts and groin cleft visible underneath" },
          { title: "French Maid (Open Chest)", desc: "attire: wearing a French maid uniform dress with a large chest cut-out, fully exposing her breasts and nipples" },
          { title: "Underboob Crop Top", desc: "attire: wearing a tight black cropped top exposing the lower half of her breasts and bare midriff" },
          { title: "Loose Sideboob Tank Top (No Bra)", desc: "attire: wearing a loose white tank top with wide armholes, exposing bare sideboob and side chest, no bra" }
        ]
      }
    ]
  }
];

export const HAIRSTYLE_PRESETS_LIST: PresetCategory[] = [
  {
    subCategoryName: "Hair Style",
    sections: [
      {
        sectionName: "Braids & Twists Styles",
        items: [
          { title: "Double Dutch Braids", desc: "hairstyle: double Dutch braids running down both sides of her head" },
          { title: "French Braids", desc: "hairstyle: classic neat French braids" },
          { title: "Cornrows", desc: "hairstyle: tight cornrow braids styling" },
          { title: "Fishtail Braid", desc: "hairstyle: elegant fishtail braid draped over one shoulder" },
          { title: "Messy Side Braid", desc: "hairstyle: loose messy side braid" },
          { title: "Halo Braid", desc: "hairstyle: beautiful halo crown braid wrapping around her head" },
          { title: "Twin Braided Pigtails", desc: "hairstyle: twin braided pigtails with cute ribbon ties" },
          { title: "Waterfall Braid", desc: "hairstyle: flowing waterfall braid look" },
          { title: "High Ponytail Braid", desc: "hairstyle: high ponytail styled into a thick neat braid" },
          { title: "Dreadlocks", desc: "hairstyle: long textured dreadlocks styled into a bun" },
          { title: "Boxer Braids", desc: "hairstyle: tight boxer braids running down the back" },
          { title: "Micro-Braids", desc: "hairstyle: hundreds of tiny micro-braids falling loose" },
          { title: "Box Braids", desc: "hairstyle: thick box braids styled over one shoulder" },
          { title: "Rope Twists", desc: "hairstyle: tight two-strand rope twists" },
          { title: "Passion Twists", desc: "hairstyle: bouncy textured passion twists" },
          { title: "Senegalese Twists", desc: "hairstyle: long sleek Senegalese twists" },
          { title: "Crown Twists", desc: "hairstyle: elegant twists pinned into a crown" },
          { title: "Bubble Braids", desc: "hairstyle: twin bubble braids with tiny elastic ties" },
          { title: "Pull-Through Braids", desc: "hairstyle: voluminous pull-through braid style" },
          { title: "Dutch Crown Braid", desc: "hairstyle: thick Dutch crown braid wrapping around the head" },
          { title: "Multi-Strand Braid", desc: "hairstyle: intricate five-strand braid draped over shoulder" },
          { title: "Side-Swept French Braid", desc: "hairstyle: romantic side-swept French braid" },
          { title: "Side-Pinned Braids", desc: "hairstyle: hair pinned to the side with micro-braids" },
          { title: "Viking Braids", desc: "hairstyle: spiky warrior-style Viking braids with shaved sides" },
          { title: "Celtic Braids", desc: "hairstyle: looping Celtic knots braided into the back" },
          { title: "Boho-Chic Braids", desc: "hairstyle: messy boho braids with tiny flowers" },
          { title: "Five-Strand Braid", desc: "hairstyle: wide flat five-strand braid" },
          { title: "Loose Fishtail Pigtails", desc: "hairstyle: twin messy fishtail pigtails" },
          { title: "Braided Space Buns", desc: "hairstyle: twin space buns styled with underlying braids" },
          { title: "Cornrows with Beads", desc: "hairstyle: neat cornrows adorned with wooden beads at the tips" },
          { title: "Feed-In Braids", desc: "hairstyle: sleek feed-in braids running back" },
          { title: "Knotless Braids", desc: "hairstyle: long lightweight knotless box braids" },
          { title: "Jumbo Braids", desc: "hairstyle: thick jumbo braids styled back" },
          { title: "Fulani Braids", desc: "hairstyle: Fulani braids with a center braid and side beads" },
          { title: "Goddess Braids", desc: "hairstyle: thick goddess braids pinned up" },
          { title: "Lemonade Braids", desc: "hairstyle: side-swept lemonade braids falling past shoulder" },
          { title: "Micro-Twists", desc: "hairstyle: tiny micro-twists styled into a half-up bun" },
          { title: "Yarn Braids", desc: "hairstyle: colorful yarn braids" },
          { title: "Faux Locs Twists", desc: "hairstyle: textured faux locs styled long" },
          { title: "Dreadlock Twists", desc: "hairstyle: two-strand dreadlock twists hanging freely" },
          { title: "Cornrow Mohawk", desc: "hairstyle: cornrows braided upwards into a mohawk design" },
          { title: "Crown-Braided Half-Up", desc: "hairstyle: half-up crown braid with loose waves below" },
          { title: "Corset Braided Back", desc: "hairstyle: braids laced like a corset in the back" },
          { title: "Double Fishtail Buns", desc: "hairstyle: twin buns styled from fishtail braids" },
          { title: "Triple Braid Ponytail", desc: "hairstyle: three braids merging into a high ponytail" },
          { title: "Herringbone Braid", desc: "hairstyle: tight neat herringbone braid" },
          { title: "Side Rope-Braids", desc: "hairstyle: side rope-braids framing the face" },
          { title: "Wrap-around Halo Twist", desc: "hairstyle: romantic wrap-around halo twist" }
        ]
      },
      {
        sectionName: "Short & Medium Haircuts",
        items: [
          { title: "Short Pixie Cut", desc: "hairstyle: short pixie cut" },
          { title: "Shoulder-length Bob Cut", desc: "hairstyle: shoulder-length bob cut" },
          { title: "Undercut Bob", desc: "hairstyle: sleek bob haircut with a shaved undercut on one side" },
          { title: "Asymmetrical Pixie", desc: "hairstyle: edgy asymmetrical pixie cut with longer side bangs" },
          { title: "Shaved Sides Pixie", desc: "hairstyle: bold pixie cut with closely shaved sides" },
          { title: "Long Pixie with Side Bangs", desc: "hairstyle: soft long pixie cut with swept bangs" },
          { title: "Layered Bob", desc: "hairstyle: textured layered bob haircut" },
          { title: "Blunt Chin-Length Bob", desc: "hairstyle: razor-sharp blunt chin-length bob" },
          { title: "Messy Shaggy Bob", desc: "hairstyle: messy shaggy bob with choppy layers" },
          { title: "Texturized Lob", desc: "hairstyle: texturized long bob falling to the collarbone" },
          { title: "French Bob with Bangs", desc: "hairstyle: chic French bob with short blunt bangs" },
          { title: "Pageboy Cut", desc: "hairstyle: retro pageboy haircut" },
          { title: "Bowl Cut", desc: "hairstyle: modern sleek bowl cut" },
          { title: "Classic Wedge Cut", desc: "hairstyle: classic wedge bob haircut" },
          { title: "Soft Wolf Cut", desc: "hairstyle: trendy soft wolf cut with wispy layers" },
          { title: "Shaggy Mullet", desc: "hairstyle: retro shaggy mullet haircut" },
          { title: "Micro-Bob", desc: "hairstyle: ultra-short micro-bob hitting the cheekbones" },
          { title: "Inverted Stacked Bob", desc: "hairstyle: inverted stacked bob cut" },
          { title: "A-Line Bob", desc: "hairstyle: classic A-line bob longer in the front" },
          { title: "Curly Pixie", desc: "hairstyle: bouncy curly pixie cut" },
          { title: "Curly Bob", desc: "hairstyle: voluminous curly bob haircut" },
          { title: "Vintage Finger Waves Bob", desc: "hairstyle: classic 1920s finger waves bob" },
          { title: "Slicked-Back Short Hair", desc: "hairstyle: sleek slicked-back short crop" },
          { title: "Messy Bedhead Crop", desc: "hairstyle: texturized messy bedhead crop" },
          { title: "Side-Swept Crop", desc: "hairstyle: short cropped hair swept to the side" },
          { title: "Curtain Bangs Lob", desc: "hairstyle: long bob with soft curtain bangs" },
          { title: "Classic Shag", desc: "hairstyle: classic texturized shaggy haircut" },
          { title: "Textured Shag", desc: "hairstyle: heavily layered textured shag" },
          { title: "Wispy Layered Medium Cut", desc: "hairstyle: wispy layered medium-length hair" },
          { title: "Blunt Shoulder-Length Cut", desc: "hairstyle: clean blunt shoulder-length haircut" },
          { title: "Choppy Collarbone Lob", desc: "hairstyle: choppy lob haircut resting on the collarbone" },
          { title: "Vintage Pageboy Bob", desc: "hairstyle: retro-styled pageboy bob" },
          { title: "Feather-Layered Bob", desc: "hairstyle: feather-layered bob haircut" },
          { title: "Razor-Cut Pixie", desc: "hairstyle: sharp razor-cut pixie" },
          { title: "Spiky Pixie", desc: "hairstyle: texturized spiky pixie crop" },
          { title: "Disconnected Undercut Crop", desc: "hairstyle: crop haircut with a disconnected undercut" },
          { title: "Side-Shaved Buzzcut", desc: "hairstyle: buzzcut with artistic side-shaved patterns" },
          { title: "Tapered Curly Crop", desc: "hairstyle: tapered curly crop haircut" },
          { title: "Asymmetrical Lob", desc: "hairstyle: trendy asymmetrical long bob" },
          { title: "Messy Texturized Shag", desc: "hairstyle: messy texturized shaggy medium cut" },
          { title: "Curly Shoulder-Length Shag", desc: "hairstyle: curly shoulder-length shag with bangs" },
          { title: "Piecey Textured Lob", desc: "hairstyle: piecey textured long bob" },
          { title: "Dynamic Layered Bob", desc: "hairstyle: dynamic bouncy layered bob" }
        ]
      },
      {
        sectionName: "Long & Voluminous Styles",
        items: [
          { title: "Long Wavy Cascading", desc: "hairstyle: long wavy hair cascading down shoulders" },
          { title: "Long Straight with Bangs", desc: "hairstyle: long straight hair with bangs" },
          { title: "Beach Waves", desc: "hairstyle: messy texturized beachy waves" },
          { title: "Hollywood Waves", desc: "hairstyle: vintage glamorous Hollywood waves" },
          { title: "Sleek Glass Hair", desc: "hairstyle: ultra-straight sleek glass long hair" },
          { title: "Soft Curtain Bangs Layers", desc: "hairstyle: long layers with soft curtain bangs" },
          { title: "Voluminous Blowout", desc: "hairstyle: bouncy voluminous blowout hairstyle" },
          { title: "Retro 90s Blowout", desc: "hairstyle: retro 90s style fluffy blowout layers" },
          { title: "Heavy Face-Framing Layers", desc: "hairstyle: long hair with heavy face-framing layers" },
          { title: "Long Spiral Curls", desc: "hairstyle: long spiral curls with high volume" },
          { title: "Crimped Mermaid Waves", desc: "hairstyle: long crimped mermaid waves" },
          { title: "Retro Vintage Finger Waves", desc: "hairstyle: long hair styled in retro finger waves" },
          { title: "Fluffy Brushed-Out Curls", desc: "hairstyle: fluffy brushed-out curls" },
          { title: "Tight Ringlets", desc: "hairstyle: long hair styled in tight ringlets" },
          { title: "Deep Side Part Long Hair", desc: "hairstyle: deep side part long hair cascading over shoulder" },
          { title: "Center Part Straight Long", desc: "hairstyle: classic middle part sleek straight long hair" },
          { title: "Wind-Swept Long Layers", desc: "hairstyle: wind-swept layered long hair" },
          { title: "Layered Bouncy Curls", desc: "hairstyle: bouncy layered long curls" },
          { title: "Long Wavy Beach Waves", desc: "hairstyle: long natural beachy waves" },
          { title: "Retro Dynamic Flip Out", desc: "hairstyle: long layers with retro flipped-out ends" },
          { title: "Bombshell Layers", desc: "hairstyle: high-volume long bombshell layers" },
          { title: "Long Crimped Hair", desc: "hairstyle: long crimped hair falling past waist" },
          { title: "Sleek Waist-Length Straight", desc: "hairstyle: sleek waist-length straight hair" },
          { title: "Long Layered Shag", desc: "hairstyle: long layered shaggy haircut with bangs" },
          { title: "Curly Curtain Bangs", desc: "hairstyle: long curly hair with curly curtain bangs" },
          { title: "Messy Texturized Waves", desc: "hairstyle: messy texturized long waves" },
          { title: "Curly Crown Volume", desc: "hairstyle: long curly hair with high crown volume" },
          { title: "Long Coiled Spring Curls", desc: "hairstyle: long coiled spring curls" },
          { title: "Soft Wispy Layered Long", desc: "hairstyle: soft wispy layered long hair" },
          { title: "Side-Swept Long Waves", desc: "hairstyle: classic side-swept long waves" },
          { title: "Layered Side-Part Blowout", desc: "hairstyle: bouncy layered side-part blowout" },
          { title: "Brushed-Back Long Waves", desc: "hairstyle: sleek brushed-back long waves" },
          { title: "Dynamic Layered Waves", desc: "hairstyle: dynamic layered bouncy waves" },
          { title: "Voluminous Spiral Ringlets", desc: "hairstyle: voluminous spiral ringlets" },
          { title: "Soft Flowing Mermaid Waves", desc: "hairstyle: soft flowing mermaid waves" },
          { title: "Vintage 70s Shag", desc: "hairstyle: retro 70s shag with feathered layers" },
          { title: "Middle-Part Waist-Length Waves", desc: "hairstyle: sleek middle-part waist-length waves" },
          { title: "Texturized Messy Long Shag", desc: "hairstyle: texturized messy long shag" },
          { title: "Bouncy Feather-Layered Long", desc: "hairstyle: bouncy feather-layered long hair" },
          { title: "Long Waves with Wispy Bangs", desc: "hairstyle: long layered waves with wispy bangs" },
          { title: "Long Straight Glass Hair", desc: "hairstyle: long straight glass hair" },
          { title: "Thick Curly Locks", desc: "hairstyle: thick curly locks falling to the waist" },
          { title: "Bouncy Curly Layers", desc: "hairstyle: bouncy curly layers" }
        ]
      },
      {
        sectionName: "Ponytails, Buns & Updos",
        items: [
          { title: "Elegant High Bun", desc: "hairstyle: elegant high bun" },
          { title: "Neat Ponytail", desc: "hairstyle: neat ponytail" },
          { title: "Messy Top Knot Bun", desc: "hairstyle: messy top knot bun" },
          { title: "Space Bun Pigtails", desc: "hairstyle: playful twin space buns on top of her head" },
          { title: "Half-Up Half-Down Bow", desc: "hairstyle: half-up half-down hairstyle tied with a neat bow" },
          { title: "Sleek High Ponytail", desc: "hairstyle: sleek high ponytail wrapped at base" },
          { title: "Bubble Ponytail", desc: "hairstyle: long bubble ponytail" },
          { title: "Braided Wrap Ponytail", desc: "hairstyle: high ponytail with a braided wrap" },
          { title: "Messy Low Bun", desc: "hairstyle: messy low bun with loose strands" },
          { title: "Sleek Low Bun", desc: "hairstyle: sleek middle-part low bun" },
          { title: "Double Space Buns", desc: "hairstyle: twin space buns styled on high sides" },
          { title: "High Ballerina Bun", desc: "hairstyle: high sleek ballerina bun" },
          { title: "Loose Chignon Updo", desc: "hairstyle: romantic loose chignon updo" },
          { title: "Messy Half-Up Top Knot", desc: "hairstyle: messy half-up top knot with loose waves" },
          { title: "Braided Half-Up Crown", desc: "hairstyle: half-up style with a braided crown twist" },
          { title: "Gibson Tuck Updo", desc: "hairstyle: vintage Gibson tuck updo" },
          { title: "French Twist Updo", desc: "hairstyle: elegant classic French twist updo" },
          { title: "High Puff Afro Updo", desc: "hairstyle: high puff natural afro updo" },
          { title: "Messy Pineapple Updo", desc: "hairstyle: messy curly pineapple updo" },
          { title: "Side-Swept Low Ponytail", desc: "hairstyle: side-swept low ponytail" },
          { title: "Low Bubble Ponytail", desc: "hairstyle: low bubble ponytail" },
          { title: "Double High Pigtails", desc: "hairstyle: high double pigtails" },
          { title: "Messy Twin Pigtails", desc: "hairstyle: messy twin pigtails with loose bangs" },
          { title: "Braided Side Bun", desc: "hairstyle: side bun with braided detailing" },
          { title: "Braided High Bun", desc: "hairstyle: high bun wrapped in a thick braid" },
          { title: "Chignon with Wispy Pieces", desc: "hairstyle: elegant chignon updo with wispy pieces framing face" },
          { title: "Messy Low Ponytail", desc: "hairstyle: messy texturized low ponytail" },
          { title: "Sleek Low Ponytail", desc: "hairstyle: sleek middle-part low ponytail" },
          { title: "Double Dutch Braided Buns", desc: "hairstyle: twin buns styled from double Dutch braids" },
          { title: "Wrapped High Ponytail", desc: "hairstyle: wrapped high ponytail" },
          { title: "Twisted Half-Up Bun", desc: "hairstyle: twisted half-up bun" },
          { title: "Messy Side Ponytail", desc: "hairstyle: messy side ponytail" },
          { title: "Low Messy Chignon", desc: "hairstyle: low messy chignon updo" },
          { title: "Braided Rosette Updo", desc: "hairstyle: intricate braided rosette updo" },
          { title: "Bubble Pigtails", desc: "hairstyle: twin bubble pigtails" },
          { title: "Triple Bun Mohawk", desc: "hairstyle: three buns lined up into a mohawk" },
          { title: "High Puff Ponytail", desc: "hairstyle: high puff ponytail" },
          { title: "Twisted Banana Clip Updo", desc: "hairstyle: twisted banana clip updo" },
          { title: "Slicked-Back High Ponytail", desc: "hairstyle: slicked-back high ponytail" },
          { title: "Messy Loop Bun", desc: "hairstyle: messy loop bun" },
          { title: "Crown Twisted Updo", desc: "hairstyle: crown twisted updo" },
          { title: "Double Low Buns", desc: "hairstyle: twin low buns" },
          { title: "High Spiky Messy Bun", desc: "hairstyle: high spiky messy bun" },
          { title: "Sleek High Chignon", desc: "hairstyle: sleek high chignon updo" },
          { title: "Braided Crown Low Bun", desc: "hairstyle: braided crown low bun" }
        ]
      }
    ]
  },
  {
    subCategoryName: "Hair Color",
    sections: [
      {
        sectionName: "Standard Hair Colors",
        items: [
          { title: "Platinum Blonde", desc: "hair color: platinum blonde hair" },
          { title: "Vibrant Copper-Red", desc: "hair color: vibrant copper-red hair" },
          { title: "Deep Espresso Black", desc: "hair color: deep espresso black hair" },
          { title: "Warm Chestnut Brown", desc: "hair color: warm chestnut brown hair" },
          { title: "Pastel Pink", desc: "hair color: pastel pink hair" },
          { title: "Silver Gray", desc: "hair color: silver gray hair" },
          { title: "Golden Blonde", desc: "hair color: golden blonde hair" },
          { title: "Honey Blonde", desc: "hair color: honey blonde hair" },
          { title: "Ash Blonde", desc: "hair color: ash blonde hair" },
          { title: "Dark Chocolate Brown", desc: "hair color: dark chocolate brown hair" },
          { title: "Auburn Red", desc: "hair color: rich auburn red hair" },
          { title: "Ginger Red", desc: "hair color: bright ginger red hair" }
        ]
      },
      {
        sectionName: "Premium Colors & Highlights",
        items: [
          { title: "Rose Gold Metallic", desc: "hair color: metallic rose gold hair" },
          { title: "Pastel Lavender", desc: "hair color: pastel lavender purple hair" },
          { title: "Neon Emerald Green", desc: "hair color: bright neon emerald green hair" },
          { title: "Sunset Orange", desc: "hair color: vibrant sunset orange hair" },
          { title: "Burgundy Wine", desc: "hair color: deep burgundy wine red hair" },
          { title: "Chocolate Cherry", desc: "hair color: dark chocolate cherry red hair" },
          { title: "Strawberry Blonde", desc: "hair color: warm strawberry blonde hair" },
          { title: "Honey Balayage", desc: "hair color: warm honey balayage hair highlights" },
          { title: "Caramel Highlights", desc: "hair color: dark brown hair with warm caramel highlights" },
          { title: "Ash Brown Ombre", desc: "hair color: ash brown to silver ombre hair color" },
          { title: "Deep Indigo Blue", desc: "hair color: deep indigo blue hair" },
          { title: "Violet Purple", desc: "hair color: bright violet purple hair" },
          { title: "Jet Black Blue Sheen", desc: "hair color: jet black hair with a glossy blue sheen" },
          { title: "Neon Pink Highlights", desc: "hair color: dark hair with bright neon pink highlights" },
          { title: "Peacock Teal", desc: "hair color: vibrant peacock teal green hair" },
          { title: "Dark Forest Green", desc: "hair color: dark forest green hair" },
          { title: "Bright Neon Yellow", desc: "hair color: bright neon yellow hair" },
          { title: "Neon Orange Dip-Dye", desc: "hair color: hair with neon orange dip-dye tips" },
          { title: "Pastel Peach Balayage", desc: "hair color: soft pastel peach balayage hair" },
          { title: "Pink Roots Blonde", desc: "hair color: platinum blonde hair with pastel pink roots" },
          { title: "Ash Blonde Balayage", desc: "hair color: modern ash blonde balayage highlights" },
          { title: "Caramel Balayage", desc: "hair color: chocolate brown hair with caramel balayage" },
          { title: "Chestnut Gold Highlights", desc: "hair color: chestnut brown hair with sparkling gold highlights" },
          { title: "Copper Gold Highlights", desc: "hair color: copper red hair with gold highlights" },
          { title: "Deep Plum Purple", desc: "hair color: deep plum purple hair" },
          { title: "Pastel Lilac Ombre", desc: "hair color: pastel lilac to silver ombre hair" },
          { title: "Cotton Candy Pink", desc: "hair color: bright cotton candy pink hair" },
          { title: "Cobalt Blue", desc: "hair color: vibrant cobalt blue hair" },
          { title: "Holographic Pastel", desc: "hair color: holographic pastel rainbow hair dye" },
          { title: "Oil Slick Highlights", desc: "hair color: oil slick hair highlights on dark hair" },
          { title: "Rainbow Prism", desc: "hair color: rainbow prism streaks in hair" },
          { title: "Split Black White", desc: "hair color: split dye hair, half-black half-white hair" },
          { title: "Silver-Blue Ombre", desc: "hair color: silver-blue ombre hair color" },
          { title: "Deep Mahogany Brown", desc: "hair color: deep mahogany brown hair" },
          { title: "Honey-Blonde Highlights", desc: "hair color: honey-blonde highlights on light brown hair" },
          { title: "Vanilla-Blonde Balayage", desc: "hair color: vanilla-blonde balayage highlights" },
          { title: "Dark Charcoal Gray", desc: "hair color: dark charcoal gray hair" }
        ]
      }
    ]
  }
];

export const TATTOO_JEWELRY_PRESETS_LIST: PresetCategory[] = [
  {
    subCategoryName: "Tattoos",
    sections: [
      {
        sectionName: "Tattoo Placements & Designs",
        items: [
          { title: "Floral Sleeve (Left Arm)", desc: "tattoo: elegant floral sleeve tattoo on left arm" },
          { title: "Butterfly (Collarbone)", desc: "tattoo: small delicate butterfly tattoo on collarbone" },
          { title: "Tribal Design (Back)", desc: "tattoo: intricate tribal design tattoo across back" },
          { title: "Minimalist Heart (Wrist)", desc: "tattoo: small minimalist heart tattoo on wrist" },
          { title: "Watercolor Art (Shoulder)", desc: "tattoo: artistic watercolor tattoo on shoulder" },
          { title: "Full Back Japanese Dragon", desc: "tattoo: large traditional Japanese dragon tattoo covering her entire back with waves and cherry blossoms" },
          { title: "Geometric Mandalas (Thighs)", desc: "tattoo: symmetrical geometric mandala tattoos on both outer thighs" },
          { title: "Underbreast Chandelier", desc: "tattoo: elegant black ink chandelier tattoo directly under both breasts, wrapping along the lower curves" },
          { title: "Bioluminescent Pink Runes", desc: "tattoo: glowing bioluminescent neon pink runes and symbols etched along her collarbones and stomach" },
          { title: "Yakuza Irezumi Bodysuit", desc: "tattoo: full body Yakuza irezumi bodysuit tattoo, leaving only the center chest and face bare" }
        ]
      }
    ]
  },
  {
    subCategoryName: "Jewelry",
    sections: [
      {
        sectionName: "Accessories & Jewelry",
        items: [
          { title: "Delicate Gold Chain", desc: "jewelry: wearing a delicate gold chain necklace" },
          { title: "Pearl Drop Earrings", desc: "jewelry: wearing elegant pearl drop earrings" },
          { title: "Luxury Wristwatch", desc: "jewelry: wearing a classic luxury wristwatch" },
          { title: "Simple Silver Band Ring", desc: "jewelry: wearing a simple silver band ring" },
          { title: "Gold Collar Choker", desc: "jewelry: wearing a bold gold collar choker necklace" },
          { title: "Thin Gold Anklet", desc: "jewelry: wearing a thin gold chain anklet on her left ankle" },
          { title: "Silver Toe Rings", desc: "jewelry: wearing simple silver toe rings on both feet" },
          { title: "Thick Heavy Gold Chain", desc: "jewelry: wearing a thick heavy gold chain link necklace" },
          { title: "Layered Gold Necklaces", desc: "jewelry: wearing multiple layered thin gold chain necklaces" },
          { title: "Leather Collar Choker", desc: "jewelry: wearing a tight black leather collar choker with a small silver ring" },
          { title: "Nose Ring Piercing", desc: "piercing: small gold nose ring piercing on nostril" },
          { title: "Septum Horseshoe", desc: "piercing: silver septum horseshoe piercing" },
          { title: "Helix Cartilage Piercings", desc: "piercing: multiple silver helix ear cartilage piercings" },
          { title: "Gold Ear Cuff", desc: "jewelry: elegant gold ear cuff wrapping around the upper ear cartilage" },
          { title: "Silver Waist Chain", desc: "jewelry: a delicate silver waist chain sitting low on her hips" },
          { title: "Crystal Thigh Chain", desc: "jewelry: a sparkling crystal thigh chain wrapped around her upper thigh" }
        ]
      }
    ]
  }
];

export const BDSM_POSES_LIST: PresetCategory[] = [
  {
    subCategoryName: "Bondage Poses",
    sections: [
      {
        sectionName: "Restrained & Bound Positions",
        items: [
          { title: "Spread-Eagle Bound Pose", desc: "pose: spread-eagle pose with wrists and ankles bound by leather straps to a dark cross" },
          { title: "Kneeling Bound Pose", desc: "pose: kneeling pose with hands bound behind her back by leather cuffs" },
          { title: "Suspended Shibari Pose", desc: "pose: suspended in mid-air by red shibari ropes in a bound pose" },
          { title: "Spreader Bar Pose", desc: "pose: spread-eagle position with legs held wide apart by a metal BDSM spreader bar attached to leather ankle cuffs" },
          { title: "Bound Wrist Cuffs", desc: "pose: standing pose with wrists cuffed together in front by a short heavy metal chain" },
          { title: "Hogtie Restraint Pose", desc: "pose: hogtied pose with wrists and ankles bound tightly together behind her back with thick hemp ropes, bondage pose" },
          { title: "Suspended Off Ground Pose", desc: "pose: suspended off the ground with ankles and wrists bound by leather suspension cuffs, bondage pose" },
          { title: "Armbinder Standing Pose", desc: "pose: standing, arms bound securely behind back in a tight black leather armbinder, chest pushed forward, looking at the camera" },
          { title: "Wooden Pillory Restraint", desc: "pose: head and wrists locked inside a heavy wooden BDSM pillory neck restraint, looking forward with submission" },
          { title: "Bound to Chair (Restrained)", desc: "pose: sitting bound to a heavy wooden chair, wrists cuffed to the armrests, ankles bound to the chair legs, leather collar around neck" },
          { title: "Frogtie Bound Position", desc: "pose: lying on back in a frogtie position, knees pulled up wide towards chest, bound securely by tight red shibari ropes" },
          { title: "Flogger Marks on Back", desc: "pose: kneeling on all fours, back completely exposed showing faint red lash stripes from a flogger, submissive posture" }
        ]
      }
    ]
  }
];

export const CATEGORY_METADATA = [
  { id: "medium", name: "Medium", icon: "🎨" },
  { id: "subject", name: "Subject", icon: "👤" },
  { id: "clothing", name: "Clothing", icon: "👔" },
  { id: "pose", name: "Pose", icon: "🧍" },
  { id: "indoor", name: "Indoor", icon: "🏠" },
  { id: "outdoor", name: "Outdoor", icon: "🌳" },
  { id: "camera", name: "Camera", icon: "📷" },
  { id: "lighting", name: "Lighting", icon: "💡" },
  { id: "processing", name: "Processing", icon: "⚙️" },
  { id: "others", name: "Others", icon: "🌟" }
];

export interface PresenterAnchor {
  id: string;
  name: string;
  description: string;
  avatarUrl: string;
  slug: string;
  visualBodyPrompt?: string;
}

import { PERSONAS, getPersonaPhysicalBase } from "@/lib/tts/personas";

export const PRESENTERS: PresenterAnchor[] = [
  ...PERSONAS.map((p) => ({
    id: p.id,
    name: `${p.name} (${p.title})`,
    slug: p.id,
    description: getPersonaPhysicalBase(p),
    avatarUrl: p.avatarUrl,
  })),
  {
    id: "scratch",
    name: "Custom (From Scratch)",
    slug: "custom_persona",
    description: "",
    avatarUrl: "/avatars/default_new.png",
  },
];

export const LORA_ADAPTERS = [
  { name: "flux-lenovo-ultrareal.safetensors", label: "Lenovo Ultrareal / Photo Realism", strength: 0.9, enabled: false, type: "image", engine: "flux" },
  { name: "flux-sex-nudes-other-fun-stuff-snofs.safetensors", label: "SNOFS / Intimate Detail Enhancer", strength: 0.8, enabled: false, type: "image", engine: "flux" },
  { name: "flux-krea2-klein.safetensors", label: "Krea2 Klein / Photorealistic Nudes", strength: 0.8, enabled: false, type: "image", engine: "flux" },
  { name: "flux-saggy-breasts.safetensors", label: "Natural Saggy Breasts / Gravity Enhancer", strength: 0.8, enabled: false, type: "image", engine: "flux" },
  { name: "flux-macromastia-clothed.safetensors", label: "Macromastia Clothed / Large Breast Enhancer", strength: 0.7, enabled: false, type: "image", engine: "flux" },
  { name: "wan-lip-bite.safetensors", label: "Wan 2.1 Lip Bite / Expression Enhancer", strength: 0.65, enabled: false, type: "video", engine: "wan" },
  { name: "wan-solo-dildo.safetensors", label: "Wan 2.1 Solo Dildo Insertion", strength: 0.75, enabled: false, type: "video", engine: "wan" },
  { name: "ltx-solo-dildo.safetensors", label: "LTX Video Solo Dildo Insertion", strength: 0.75, enabled: false, type: "video", engine: "ltx" },
  { name: "aidmaNSFWunlock-FLUX-V0.2.safetensors", label: "NSFW Unlock / Anatomy Base", strength: 1.0, enabled: false, type: "image", engine: "flux" },
  { name: "flux-skin-detailer.safetensors", label: "Realistic Skin & Male Detailer", strength: 0.8, enabled: false, type: "image", engine: "flux" },
  { name: "flux-female-anatomy.safetensors", label: "Female Breast & Body Enhancer", strength: 0.8, enabled: false, type: "image", engine: "flux" },
  { name: "futanari-bulge.safetensors", label: "Detailed Intimate Genitals (Futanari)", strength: 0.8, enabled: false, type: "image", engine: "flux" },
  { name: "super-realism.safetensors", label: "Super Realism Detailer", strength: 0.8, enabled: false, type: "image", engine: "flux" },
  { name: "flux-detailer.safetensors", label: "Flux Detailer / Sharpness", strength: 0.8, enabled: false, type: "image", engine: "flux" },
  { name: "krea2_Enhancer.safetensors", label: "Krea2 Enhancer / Quality Detailer", strength: 0.85, enabled: false, type: "image", engine: "flux" },
  { name: "secret-sauce-krea2.safetensors", label: "Secret Sauce Krea2 / Uncensor", strength: 0.8, enabled: false, type: "image", engine: "flux" },
  { name: "hmcum-krea2.safetensors", label: "HMCUM / Cum Detailer (Krea2)", strength: 0.8, enabled: false, type: "image", engine: "flux" },
  { name: "fake-breasts-krea2.safetensors", label: "Fake Breasts & Bimbo Tits (Krea2)", strength: 0.75, enabled: false, type: "image", engine: "flux" },
  { name: "penis-size-slider-krea2.safetensors", label: "Penis Size Slider (Krea2)", strength: 0.8, enabled: false, type: "image", engine: "flux" },
  { name: "krea2-latex.safetensors", label: "Latex Outfit Detailer (Krea2)", strength: 0.8, enabled: false, type: "image", engine: "flux" },
  { name: "penis-state-krea2.safetensors", label: "Penis State (Erect/Flaccid) (Krea2)", strength: 0.8, enabled: false, type: "image", engine: "flux" },
  { name: "hucow-milking.safetensors", label: "Hucow Milking (ZIT/Wan/Flux)", strength: 0.8, enabled: false, type: "both", engine: "both" },
  { name: "Realistic_studio_zimage_epoch_10.safetensors", label: "Realistic Skin & Face (ZIT)", strength: 0.6, enabled: false, type: "image", engine: "flux" },
  { name: "facial-cumshot-krea2.safetensors", label: "Facial Cumshot (Krea2)", strength: 0.8, enabled: false, type: "image", engine: "flux" },
  { name: "handsfree-blowjob-krea2.safetensors", label: "Handsfree Blowjob (Krea2)", strength: 0.85, enabled: false, type: "image", engine: "flux" },
  { name: "krea2-aio-nsfw.safetensors", label: "Krea2 AIO NSFW LoRA", strength: 0.8, enabled: false, type: "image", engine: "flux" },
  { name: "ltx-better-motion.safetensors", label: "LTX Better Motion (LTX 2.5)", strength: 0.85, enabled: true, type: "video", engine: "ltx" },
  { name: "ltx-soft-enhance.safetensors", label: "LTX Soft Detail Enhance (LTX 2.5)", strength: 0.8, enabled: false, type: "video", engine: "ltx" },
  { name: "wan-dr34ml4y-nsfw.safetensors", label: "DR34ML4Y AIO NSFW (Wan 2.2)", strength: 0.8, enabled: false, type: "video", engine: "wan" },
  { name: "wan-cowgirl.safetensors", label: "Wan 2.2 Cowgirl & Reverse Cowgirl", strength: 0.8, enabled: false, type: "video", engine: "wan" },
  { name: "wan-smoothmix.safetensors", label: "Wan 2.2 SmoothMix Animations", strength: 0.8, enabled: false, type: "video", engine: "wan" },
  { name: "wan-seductive-turns.safetensors", label: "Wan 2.2 Seductive Turns", strength: 0.8, enabled: false, type: "video", engine: "wan" },
  { name: "wan-big-splash.safetensors", label: "Wan 2.2 Big Splash", strength: 0.85, enabled: false, type: "video", engine: "wan" },
  { name: "wan-bouncy-bends.safetensors", label: "Wan 2.2 Bouncy Forward Bends", strength: 0.8, enabled: false, type: "video", engine: "wan" },
  { name: "ltx-synth-pussy.safetensors", label: "Synth Pussy (LTX 2.5)", strength: 0.8, enabled: false, type: "video", engine: "ltx" },
  { name: "ltx-penile-praxis.safetensors", label: "Penile Praxis General NSFW (LTX 2.5)", strength: 0.8, enabled: false, type: "video", engine: "ltx" },
  { name: "ltx-stomach-bulge.safetensors", label: "Stomach Bulge (LTX 2.5)", strength: 0.8, enabled: false, type: "video", engine: "ltx" },
  { name: "ltx-riding-pov.safetensors", label: "Riding POV (LTX 2.5)", strength: 0.8, enabled: false, type: "video", engine: "ltx" },
  { name: "ltx-futa-cumshot.safetensors", label: "Futa Masturbation Cumshot (LTX 2.5)", strength: 0.8, enabled: false, type: "video", engine: "ltx" },
  { name: "ltx-cowgirl-futa-ride.safetensors", label: "Cowgirl & Futa Ride (LTX 2.5)", strength: 0.8, enabled: false, type: "video", engine: "ltx" },
  { name: "ltx-penis-sulphur.safetensors", label: "Sulphur Penis (LTX 2.5)", strength: 0.9, enabled: false, type: "video", engine: "ltx" },
  { name: "ltx-sexgod-handjobs.safetensors", label: "SexGod Handjobs (LTX 2.5)", strength: 0.8, enabled: false, type: "video", engine: "ltx" },
  { name: "ltx-creampie-animation.safetensors", label: "Creampie Animation (LTX 2.5)", strength: 0.8, enabled: false, type: "video", engine: "ltx" },
  { name: "ltx-bouncy-walk.safetensors", label: "Bouncy Walk (LTX 2.5)", strength: 0.8, enabled: false, type: "video", engine: "ltx" },
  { name: "ltx-bouncing-boobs.safetensors", label: "Bouncing Boobs (LTX 2.5)", strength: 0.8, enabled: false, type: "video", engine: "ltx" },
  { name: "ltx-nsfw-body-physics.safetensors", label: "NSFW Body Physics Motion (LTX 2.5)", strength: 0.8, enabled: false, type: "video", engine: "ltx" },
  { name: "flux-4-play-nsfw.safetensors", label: "Flux 4 Play AIO NSFW (FLUX)", strength: 0.8, enabled: false, type: "image", engine: "flux" },
  { name: "wan-perfect-fingering.safetensors", label: "Perfect Fingering (Wan 2.2)", strength: 0.8, enabled: false, type: "video", engine: "wan" },
  { name: "wan-futa-cumshot.safetensors", label: "Futa Cumshot (Wan 2.2)", strength: 0.8, enabled: false, type: "video", engine: "wan" },
  { name: "wan-f4c3spl4sh.safetensors", label: "F4C3SPL4SH Cumshot (Wan 2.2)", strength: 0.9, enabled: false, type: "video", engine: "wan" },
  { name: "wan-bouncing-boobs.safetensors", label: "Bouncing Boobs (Wan 2.2)", strength: 0.8, enabled: false, type: "video", engine: "wan" },
  { name: "wan-cum-facial.safetensors", label: "Cum/Facial (Wan 2.2)", strength: 0.9, enabled: false, type: "video", engine: "wan" },
  { name: "wan-pov-titfuck.safetensors", label: "POV Paizuri/Titfuck (Wan 2.2)", strength: 0.8, enabled: false, type: "video", engine: "wan" },
  { name: "wan-breast-play.safetensors", label: "Breast Play (Wan 2.2)", strength: 0.8, enabled: false, type: "video", engine: "wan" },
  { name: "wan-deepthroat.safetensors", label: "Deepthroat (Wan 2.2)", strength: 0.8, enabled: false, type: "video", engine: "wan" },
  { name: "wan-ultimate-deepthroat.safetensors", label: "Ultimate Deepthroat (Wan 2.2)", strength: 0.9, enabled: false, type: "video", engine: "wan" },
  { name: "wan-doggy-style.safetensors", label: "Doggy Style Sex (Wan 2.2)", strength: 0.8, enabled: false, type: "video", engine: "wan" },
  { name: "ltx-deepthroat.safetensors", label: "Deepthroat (LTX 2.5)", strength: 0.8, enabled: false, type: "video", engine: "ltx" },
  { name: "ltx-fingering-dildo.safetensors", label: "Fingering/Dildo (LTX 2.5)", strength: 0.9, enabled: false, type: "video", engine: "ltx" },
  { name: "ltx-real-orgasm.safetensors", label: "Real Orgasm (LTX 2.5)", strength: 0.9, enabled: false, type: "video", engine: "ltx" },
  { name: "ltx-reasoning.safetensors", label: "Video Reasoning (LTX 2.5)", strength: 0.9, enabled: false, type: "video", engine: "ltx" },
  { name: "ltx-better-physics.safetensors", label: "Better Physics (LTX 2.5)", strength: 0.9, enabled: false, type: "video", engine: "ltx" },
  { name: "ltx-better-nsfw-motion.safetensors", label: "Better NSFW Motion (LTX 2.5)", strength: 0.9, enabled: false, type: "video", engine: "ltx" },
  { name: "ltx-joyshot-cumshot.safetensors", label: "Joyshot Cumshot (LTX 2.5)", strength: 0.9, enabled: false, type: "video", engine: "ltx" },
  { name: "ltx-epic-cumshots.safetensors", label: "Epic Cumshots (LTX 2.5)", strength: 0.9, enabled: false, type: "video", engine: "ltx" },
  { name: "ltx-anal-insertion.safetensors", label: "Anal Insertion (LTX 2.5)", strength: 0.8, enabled: false, type: "video", engine: "ltx" },
  { name: "instagramification-krea2.safetensors", label: "Amateur Instagramification (Krea2)", strength: 0.8, enabled: false, type: "image", engine: "flux" },
  { name: "nsfw-v4-krea2.safetensors", label: "NSFW V4 Uncensored (Krea2)", strength: 0.8, enabled: false, type: "image", engine: "flux" },
  { name: "thot-shot-skye-krea2.safetensors", label: "Thot Shot Skye (Krea2)", strength: 0.8, enabled: false, type: "image", engine: "flux" },
  { name: "realistic-slider-krea2.safetensors", label: "Realistic Slider (Krea2)", strength: 0.8, enabled: false, type: "image", engine: "flux" },
  { name: "femboy-krea2.safetensors", label: "Trans Femboy (Krea2)", strength: 0.8, enabled: false, type: "image", engine: "flux" },
  { name: "pornmaster-detail-slider-krea2.safetensors", label: "PornMaster Detail Slider (Krea2)", strength: 1.0, enabled: false, type: "image", engine: "flux" },
  { name: "pornmaster-uncensored-krea2.safetensors", label: "PornMaster Uncensored (Krea2)", strength: 0.8, enabled: false, type: "image", engine: "flux" },
  { name: "krea2-large-penis.safetensors", label: "Large Erect Penis (Krea2)", strength: 0.8, enabled: false, type: "image", engine: "flux" },
  { name: "krea2-bigger-glans.safetensors", label: "Penis Bigger Glans (Krea2)", strength: 0.8, enabled: false, type: "image", engine: "flux" },
  { name: "krea2-mystic-xxx.safetensors", label: "Krea 2 Mystic XXX", strength: 0.8, enabled: false, type: "image", engine: "flux" },
  { name: "krea2-futanari-anatomy.safetensors", label: "Futanari Penis Anatomy (Krea2)", strength: 0.8, enabled: false, type: "image", engine: "flux" },
  { name: "krea2-penis.safetensors", label: "Penis LoRA (Krea2)", strength: 0.8, enabled: false, type: "image", engine: "flux" },
  { name: "krea2-anal-helper.safetensors", label: "Anal Helper (Krea2)", strength: 0.8, enabled: false, type: "image", engine: "flux" },
  { name: "krea2-filter-bypass.safetensors", label: "Filter Bypass (Krea2)", strength: 0.8, enabled: false, type: "image", engine: "flux" },
  { name: "krea2-big-ass-hips.safetensors", label: "Big Ass & Hips (Krea2)", strength: 0.8, enabled: false, type: "image", engine: "flux" },
  { name: "krea2-body-weight-slider.safetensors", label: "Body Weight Slider (Krea2)", strength: 0.8, enabled: false, type: "image", engine: "flux" },
  { name: "krea2-metal-bondage.safetensors", label: "Metal Bondage Frame (Krea2)", strength: 0.8, enabled: false, type: "image", engine: "flux" },
  { name: "krea2-realistic-snapshot.safetensors", label: "Realistic Snapshot (Krea2)", strength: 0.8, enabled: false, type: "image", engine: "flux" },
  { name: "krea2-seed-variance-enhancer.safetensors", label: "Seed Variance Enhancer (Krea2)", strength: 0.8, enabled: false, type: "image", engine: "flux" },
  { name: "krea2-boob-grabbing.safetensors", label: "Mega Boob Grabbing (Krea2)", strength: 0.8, enabled: false, type: "image", engine: "flux" },
  { name: "krea2-facegrid.safetensors", label: "FaceGrid 18-Angles (Krea2)", strength: 0.7, enabled: false, type: "image", engine: "flux" },
  { name: "krea2-hard-nipples.safetensors", label: "Hard Erect Nipples (Krea2)", strength: 0.85, enabled: false, type: "image", engine: "flux" },
  { name: "krea2-instagram-influencer.safetensors", label: "Instagram Influencers (Krea2)", strength: 0.8, enabled: false, type: "image", engine: "flux" },
  { name: "krea2-rawgirl-spicy.safetensors", label: "Raw Girl Spicy (Krea2)", strength: 0.8, enabled: false, type: "image", engine: "flux" },
  { name: "krea2-phone-photography.safetensors", label: "Phone Photography 2000-2025 (Krea2)", strength: 0.8, enabled: false, type: "image", engine: "flux" },
  { name: "flux-klein-cumshot-slider.safetensors", label: "Cumshot Slider (Flux/ZIT)", strength: 0.8, enabled: false, type: "image", engine: "flux" },
  { name: "flux-aging-slider.safetensors", label: "BSS Aging Slider (Flux/ZIT)", strength: 0.8, enabled: false, type: "image", engine: "flux" },
  { name: "flux-pornmaster-asian-beauty.safetensors", label: "Pornmaster Asian Beauty (Flux)", strength: 0.8, enabled: false, type: "image", engine: "flux" },
  { name: "flux-sexgod-doggystyle.safetensors", label: "Sexgod Doggystyle (Flux/ZIT)", strength: 0.8, enabled: false, type: "image", engine: "flux" },
  { name: "flux-amateur-photography.safetensors", label: "Amateur Photography (Flux)", strength: 0.8, enabled: false, type: "image", engine: "flux" },
  { name: "flux-betternudes.safetensors", label: "Photoreal Betternudes (Flux)", strength: 0.8, enabled: false, type: "image", engine: "flux" },
  { name: "flux-airport-crush.safetensors", label: "Airport Crush (Flux)", strength: 0.8, enabled: false, type: "image", engine: "flux" },
  { name: "flux-2000s-analog-core.safetensors", label: "2000s Analog Core (Flux)", strength: 0.85, enabled: false, type: "image", engine: "flux" },
  { name: "flux-ankle-grab-missionary.safetensors", label: "Ankle Grab Missionary (Flux)", strength: 0.8, enabled: false, type: "image", engine: "flux" },
  { name: "flux-vintage-lingerie.safetensors", label: "Boudoirtime Vintage Lingerie (Flux)", strength: 0.85, enabled: false, type: "image", engine: "flux" },
  { name: "krea2-reverse-cowgirl-anal.safetensors", label: "Reverse Cowgirl Anal Full Nelson (Krea2)", strength: 0.8, enabled: false, type: "image", engine: "flux" },
  { name: "ltx-smooth-60fps.safetensors", label: "LTX 2.5 60 FPS Smooth Motion", strength: 0.85, enabled: false, type: "video", engine: "ltx" },
  { name: "ltx-ultimate-deepthroat.safetensors", label: "Ultimate Deepthroat & NSFW (LTX 2.5)", strength: 0.85, enabled: false, type: "video", engine: "ltx" },
  { name: "ltx-rogue-missionary.safetensors", label: "Rogue AI Missionary/Cowgirl (LTX 2.5)", strength: 0.8, enabled: false, type: "video", engine: "ltx" },
  { name: "ltx-anal-play.safetensors", label: "Anal Play (LTX 2.5)", strength: 0.8, enabled: false, type: "video", engine: "ltx" },
  { name: "ltx-3d-animations.safetensors", label: "3D Animations NSFW (LTX 2.5)", strength: 0.8, enabled: false, type: "video", engine: "ltx" },
  { name: "ltx-behind-facing-cam.safetensors", label: "Sex from Behind Facing Cam (LTX 2.5)", strength: 0.8, enabled: false, type: "video", engine: "ltx" },
  { name: "ltx-paizuri-thrust.safetensors", label: "POV Paizuri/Titfuck Thrusting (LTX 2.5)", strength: 0.8, enabled: false, type: "video", engine: "ltx" },
  { name: "ltx-creampie-cum-early.safetensors", label: "Creampie Cum Animation Early (LTX 2.5)", strength: 0.8, enabled: false, type: "video", engine: "ltx" },
  { name: "ltx-fingering.safetensors", label: "Fingering LoRA (LTX 2.5)", strength: 0.85, enabled: false, type: "video", engine: "ltx" },
  { name: "ltx-sexgod-female-nudity.safetensors", label: "Sexgod Female Nudity (LTX 2.5)", strength: 0.8, enabled: false, type: "video", engine: "ltx" },
  { name: "ltx-sexgod-hairy.safetensors", label: "Sexgod Hairy Girls (LTX 2.5)", strength: 0.8, enabled: false, type: "video", engine: "ltx" },
  { name: "ltx-sexgod-breast-massage.safetensors", label: "Sexgod Breast Massage (LTX 2.5)", strength: 0.8, enabled: false, type: "video", engine: "ltx" },
  { name: "ltx-better-breasts-motion.safetensors", label: "Better Breasts Motion & Jiggle (LTX 2.5)", strength: 0.8, enabled: false, type: "video", engine: "ltx" },
  { name: "ltx-pussyjob-sulphur.safetensors", label: "Pussyjob (LTX 2.5 Sulphur)", strength: 0.8, enabled: false, type: "video", engine: "ltx" },
  { name: "wan-hits-face.safetensors", label: "Anything Hits the Face (Wan 2.2)", strength: 0.8, enabled: false, type: "video", engine: "wan" },
  { name: "wan-slop-bounce.safetensors", label: "Slop Bounce I2V (Wan 2.2)", strength: 0.8, enabled: false, type: "video", engine: "wan" },
  { name: "wan-double-handy-bj.safetensors", label: "Doublesinglehandy Blowjob (Wan 2.2)", strength: 0.8, enabled: false, type: "video", engine: "wan" },
  { name: "wan-slop-twerk.safetensors", label: "Slop Twerk I2V (Wan 2.2)", strength: 0.8, enabled: false, type: "video", engine: "wan" },
  { name: "wan-mating-press.safetensors", label: "Mating Press I2V (Wan 2.2)", strength: 0.8, enabled: false, type: "video", engine: "wan" },
  { name: "", label: "Custom LoRA Adapter", strength: 0.8, enabled: false, isCustom: true, type: "both", engine: "both" }
];

export const SKIN_TONE_OPTIONS = [
  { label: "Caucasian / Fair", value: "fair Caucasian skin" },
  { label: "Latina / Olive", value: "Latina olive skin" },
  { label: "Black / African", value: "dark brown skin" },
  { label: "East Asian", value: "smooth pale skin" },
  { label: "South Asian", value: "warm brown skin" },
  { label: "Middle Eastern", value: "olive-tanned skin" },
  { label: "Pale / Freckled", value: "pale skin with light freckles" },
  { label: "Ebony", value: "rich dark ebony skin" }
];

export const BODY_BUILD_OPTIONS = [
  { label: "Slim / Slender", value: "slim slender figure" },
  { label: "Athletic / Toned", value: "fit athletic build" },
  { label: "Muscular / Fit", value: "strong muscular toned body" },
  { label: "Curvy / Hourglass", value: "curvy hourglass figure" },
  { label: "Voluptuous", value: "voluptuous full-figured body" },
  { label: "Average", value: "average proportioned build" }
];

export const HAIRSTYLE_OPTIONS = [
  { label: "Long Wavy", value: "long wavy cascading" },
  { label: "Pixie Cut", value: "short pixie cut" },
  { label: "Bob Cut", value: "shoulder-length bob cut" },
  { label: "Ponytail", value: "neat high ponytail" },
  { label: "Straight with Bangs", value: "long straight hair with blunt bangs" },
  { label: "Messy Bun", value: "messy top knot bun" },
  { label: "Dreadlocks", value: "long textured dreadlocks" },
  { label: "Bald / Shaved", value: "fully shaved bald head" },
  { label: "Double Dutch Braids", value: "double Dutch braids running down both sides of her head" },
  { label: "French Braids", value: "classic neat French braids" },
  { label: "Cornrows", value: "tight cornrow braids styling" },
  { label: "Fishtail Braid", value: "elegant fishtail braid draped over one shoulder" },
  { label: "Messy Side Braid", value: "loose messy side braid" },
  { label: "Halo Braid", value: "beautiful halo crown braid wrapping around her head" },
  { label: "Twin Braided Pigtails", value: "twin braided pigtails with cute ribbon ties" },
  { label: "Waterfall Braid", value: "flowing waterfall braid look" },
  { label: "High Ponytail Braid", value: "high ponytail styled into a thick neat braid" },
  { label: "Afro Haircut", value: "large voluminous natural afro hair" },
  { label: "Buzz Cut", value: "very short buzzed haircut" },
  { label: "Undercut Bob", value: "sleek bob haircut with a shaved undercut on one side" },
  { label: "Beach Waves", value: "messy texturized beachy waves" },
  { label: "Space Bun Pigtails", value: "playful twin space buns on top of her head" },
  { label: "Half-Up Half-Down Bow", value: "half-up half-down hairstyle tied with a neat bow" }
];

export const HAIR_COLOR_OPTIONS = [
  { label: "Vibrant Copper-Red", value: "vibrant copper-red" },
  { label: "Platinum Blonde", value: "platinum blonde" },
  { label: "Warm Chestnut Brown", value: "warm chestnut brown" },
  { label: "Deep Espresso Black", value: "deep espresso black" },
  { label: "Silver Gray", value: "silver gray" },
  { label: "Pastel Pink", value: "pastel pink" },
  { label: "Golden Blonde", value: "golden blonde" }
];

export const EYE_COLOR_OPTIONS = [
  { label: "Green", value: "bright green" },
  { label: "Blue", value: "ice blue" },
  { label: "Brown", value: "dark brown" },
  { label: "Hazel", value: "hazel" },
  { label: "Amber", value: "amber" },
  { label: "Purple", value: "purple" }
];

export const FACIAL_FEATURE_OPTIONS = [
  { label: "Sharp jawline", value: "sharp defined jawline" },
  { label: "High cheekbones", value: "elegant high cheekbones" },
  { label: "Dimples", value: "soft cheek dimples" },
  { label: "Freckles", value: "freckles across the bridge of nose" },
  { label: "Beauty mark", value: "small natural beauty mark on cheek" }
];

export const STUDIO_ACTIONS_PRESETS: PresetCategory = {
  subCategoryName: "Studio Actions & Furniture",
  sections: [
    {
      sectionName: "Furniture Actions",
      items: [
        { title: "Sitting on a desk", desc: "pose: sitting on the edge of a polished wooden studio desk, looking at the camera" },
        { title: "Sitting on a chair", desc: "pose: sitting upright on a modern ergonomic office chair behind a desk" },
        { title: "Laying on bed", desc: "pose: laying down relaxed on a clean neatly made studio bed with white sheets" },
        { title: "Laying on a couch", desc: "pose: laying comfortably on a leather studio couch, head supported by an armrest" },
        { title: "In front of the computer", desc: "pose: sitting in front of a computer, looking at the screen, hands on keyboard" }
      ]
    },
    {
      sectionName: "Anchor & Reporter Actions",
      items: [
        { title: "Reading news", desc: "pose: sitting at a news anchor desk, reading from a teleprompter, looking at the camera" },
        { title: "Reading notes at stand", desc: "pose: standing at a wooden lecture stand reading paper notes, looking down slightly" },
        { title: "Taking notes", desc: "pose: sitting at a desk actively taking notes with a pen on a notepad" },
        { title: "Aligning papers", desc: "pose: sitting at a news desk, hands aligning a stack of paper sheets neatly" },
        { title: "Holding a microphone", desc: "pose: standing, holding a black news microphone with a logo cube close to the mouth" }
      ]
    },
    {
      sectionName: "Interacting & Presenting",
      items: [
        { title: "Looking at the camera", desc: "pose: looking directly into the camera lens, speaking clearly, engaging expression" },
        { title: "Pointing at display screen", desc: "pose: standing, pointing at a large wall-mounted news display graphic screen" },
        { title: "Gesticulating during speech", desc: "pose: sitting, gesticulating naturally with hands while speaking, head motion" }
      ]
    }
  ]
};

export const STUDIO_SCENARIOS_PRESETS: PresetCategory = {
  subCategoryName: "Studio Scenarios",
  sections: [
    {
      sectionName: "Newsroom & Set Environments",
      items: [
        { title: "High-Tech Newsroom Set", desc: "environment: high-tech news broadcast studio control room background with glowing monitors and server racks" },
        { title: "Studio Desk Backdrop", desc: "environment: professional news studio set with a large curved desk and blurred background lights" },
        { title: "Weather Graphic Screen", desc: "environment: standing in front of a large digital weather map screen with green and blue radar overlays" },
        { title: "Late Night Lounge Set", desc: "environment: cozy late-night talk show studio set with a sofa, desk lamp, and city skyline window background" }
      ]
    },
    {
      sectionName: "On-Location & Field Scenarios",
      items: [
        { title: "Press Briefing Room", desc: "environment: press conference hall with a podium, microphones, and a blue media backdrop" },
        { title: "Live Field Backdrop (City)", desc: "environment: standing outdoors in a busy city center, blurred traffic and buildings behind" },
        { title: "Live Field Backdrop (Nature)", desc: "environment: standing outdoors, green trees and distant mountains, natural lighting" }
      ]
    }
  ]
};

export interface FullPreset {
  name: string;
  description: string;
  attire?: string;
  action: string;
  scenario: string;
  medium?: string;
  lighting?: string;
  color?: string;
  videoPrompt?: string;
  soundEffects?: string;
  category?: string;
}

export const STUDIO_FULL_PRESETS: FullPreset[] = [
  {
    name: "News Anchor Desk",
    description: "Anchor sitting at news desk, professional attire (random), studio desk backdrop",
    action: "pose: sitting behind a glossy curved news_desk broadcast anchor desk, reading from a teleprompter, hands resting on papers, looking directly into the camera",
    scenario: "environment: professional television broadcast studio set, massive glossy curved news_desk anchor desk with built-in blue LED light strips, high-tech glowing LED video wall displaying world news maps and charts, overhead broadcast studio lighting grid, tv_studio soundstage",
    medium: "This is an editorial broadcast photograph, shot on 85mm lens, sharp focus, cinematic studio color grading",
    lighting: "Rembrandt lighting, soft side light, professional TV studio key light",
    color: "cinematic color grading, professional broadcast TV colors",
    category: "Professional Newsroom",
    videoPrompt: "At 0s: sitting at the news anchor desk looking down at papers in hand. At 2s: places the papers on the desk, arranging them carefully. At 4s: looks directly into the camera, smiling, and continues speaking with professional hand gestures.",
    soundEffects: "papers rustling, distant newsroom chatter, keyboard typing"
  },
  {
    name: "Field Reporter",
    description: "Reporter standing with a microphone in front of a busy city backdrop, attire (random)",
    action: "pose: standing, holding a black news microphone with a logo cube close to the mouth",
    scenario: "environment: professional outdoor news broadcast location in a bustling city center plaza, blurred city skyline, news camera crew rig and broadcast van visible in soft focus background",
    medium: "This is a spontaneous candid photograph, with natural motion blur",
    lighting: "natural daylight, bright sun, soft fill flash",
    color: "realistic documentary style colors, standard news broadcast grade",
    category: "Field Reporting",
    videoPrompt: "At 0s: standing on location holding the microphone at chest level, looking slightly off-camera. At 2s: raises hand to gesture while looking directly into the camera lens. At 4s: continues speaking with animated expressions as the background traffic moves behind.",
    soundEffects: "light wind, distant traffic, outdoor ambience, cars passing by"
  },
  {
    name: "Evening Talk Show",
    description: "Relaxed talk show setting, warm lighting, comfortable lounge chair.",
    action: "pose: sitting confidently in a modern studio guest armchair, relaxed posture, looking directly into the camera",
    scenario: "environment: high-end evening talk show broadcast studio set, sleek modern studio interview chairs, warm ambient studio lighting, glowing LED city skyline backdrop wall, professional television studio soundstage environment",
    medium: "This is a high-end cinematic photograph, shot on anamorphic lens, 85mm",
    lighting: "warm golden ambient lighting, rim light from neon signs, soft front fill",
    color: "rich cinematic colors, deep warm shadows, glowing highlights",
    videoPrompt: "At 0s: sitting relaxed in a lounge chair, organic posture shifting. At 2s: leans forward slightly, subtle shoulder movements, engaging directly with the camera. At 4s: natural head tilting, smiles warmly while continuing to speak with expressive occasional hand gestures."
  },
  {
    name: "Weather Forecaster",
    description: "Standing in front of a green screen or large digital map.",
    action: "pose: standing sideways pointing towards a digital background map, turning head to face the camera",
    scenario: "environment: high-tech TV weather forecasting studio set, giant wall-sized digital weather map screen with glowing radar overlays, professional newsroom studio lighting grid overhead",
    medium: "This is an editorial-style photograph, 35mm lens, sharp focus on subject",
    lighting: "bright even studio lighting, zero shadows on background, crisp highlights",
    color: "high contrast vibrant broadcast colors, clean whites",
    videoPrompt: "At 0s: standing next to a large digital screen, organic posture shifting, looking off-camera at the map. At 2s: turns smoothly to face the camera, natural head tilting, gesturing towards the screen. At 4s: continues speaking with subtle shoulder movements and professional hand gestures."
  },
  {
    name: "Breaking News Alert",
    description: "High tension standing shot in front of a dynamic newsroom.",
    action: "pose: standing with hands clasped in front, serious expression, looking urgently at the camera",
    scenario: "environment: intense breaking news television studio set, glowing red digital 'BREAKING NEWS' video wall ticker, active newsroom studio background with professional broadcast cameras and monitors",
    medium: "This is a dramatic high-definition photograph, cinematic depth of field",
    lighting: "dramatic side lighting, cool blue ambient light mixed with red alert highlights",
    color: "cinematic color grading, desaturated blues, intense reds",
    videoPrompt: "At 0s: standing urgently in the newsroom, serious expression, organic posture shifting. At 2s: leans in slightly, subtle shoulder movements, emphasizing the severity of the news. At 4s: natural head tilting, maintains intense eye contact while speaking with occasional firm hand gestures."
  },
  {
    name: "Weather Presenter",
    description: "Presenter in front of weather map screen, pointing at graphics, attire (random)",
    action: "pose: standing, pointing at a large wall-mounted news display graphic screen",
    scenario: "environment: television broadcast weather studio set, standing in front of a giant high-res interactive weather radar wall display, bright TV studio softbox lighting",
    medium: "This is a model shoot photo, with clean backdrops, directional key light",
    lighting: "even studio lighting, bright high-key lighting",
    color: "vibrant broadcast colors, clean digital overlay integration",
    videoPrompt: "At 0s: standing in front of the weather map screen, pointing at the radar graphics. At 2s: sweeps arm across the screen to follow a storm front trajectory. At 4s: turns back to the camera, gesturing with open hands while explaining the forecast."
  },
  {
    name: "Late Night Host",
    description: "Host sitting at a desk with furniture in a studio, looking at camera, attire (random)",
    action: "pose: sitting behind a polished wooden television studio host desk, looking at the camera",
    scenario: "environment: high-end late night talk show TV studio set, polished dark wood broadcast desk, sleek studio guest seats, glowing metropolitan skyline studio backdrop wall, professional television production set",
    medium: "This is a cinematic portrait still, with Rembrandt-style lighting, rich filmic grades and dramatic contrast",
    lighting: "moody late-night studio lighting, warm tungsten desk lamp glow",
    color: "rich warm filmic grade, deep shadows, cinematic style",
    videoPrompt: "At 0s: sitting on the edge of the polished wooden desk, smiling warmly at the camera. At 2s: gestures dynamically with one hand while telling a monologue joke. At 4s: chuckles slightly, shifts weight, and points toward the studio band."
  },
  {
    name: "Tech Segment Reviewer",
    description: "Presenter sitting in front of a computer, holding a mic/taking notes, attire (random)",
    action: "pose: sitting at a sleek tech news studio desk in front of glowing computer displays, hands on keyboard",
    scenario: "environment: high-tech tech news broadcast studio control room set, sleek glass studio tech desk, wall of glowing server racks, video monitoring wall displays, futuristic blue LED accent lighting",
    medium: "This is a cinematic film still, with widescreen aspect, dramatic framing and color-graded mood lighting",
    lighting: "cool blue LED accent lighting, glow from monitor screens",
    color: "cool futuristic color grade, tech review aesthetics",
    videoPrompt: "At 0s: sitting in front of the computer monitor, typing on the keyboard. At 2s: pauses typing, turns head toward the camera, and holds up a small electronic device. At 4s: points at the device's screen, describing its features with an engaged expression."
  },
  {
    name: "Morning Talk Show",
    description: "Cozy morning show setting, bright warm morning light, mug on desk, attire (random)",
    action: "pose: sitting relaxed in a contemporary studio armchairs, gesturing warm welcome, friendly smile",
    scenario: "environment: sunlit morning television broadcast studio set, sleek contemporary studio armchairs, low glass studio coffee table, bright studio softbox lights, blurred sunlit studio window backdrop",
    medium: "This is a clean lifestyle photograph, soft focus background",
    lighting: "soft diffused bright morning sunlight, warm ambient fill lights",
    color: "warm pastel color palette, soft bright tones",
    videoPrompt: "At 0s: sitting relaxed on the cozy lounge chair, holding a warm coffee mug in lap. At 2s: sets the mug on the coffee table and leans forward. At 4s: gestures with both hands in a warm welcoming greeting to the viewer."
  },
  {
    name: "Breaking News Broadcast",
    description: "Presenter standing on alert in front of flashing red alert screens, attire (random)",
    action: "pose: standing, intense focused expression, gesturing dynamically with hands, looking directly at the camera",
    scenario: "environment: high-energy TV news broadcast studio set, flashing red alert video walls with bold 'BREAKING NEWS' typography, professional studio camera crane and newsroom monitors in soft focus background",
    medium: "This is a dramatic documentary-style photojournalism still, sharp focus, high contrast",
    lighting: "dramatic high-contrast key light, red backlights, rim light",
    color: "highly saturated red and blue accents, high contrast",
    videoPrompt: "At 0s: standing alert in front of the red alert screens, delivering news with a serious, intense expression. At 2s: raises a hand to emphasize a critical update, looking directly into the camera. At 4s: continues speaking, nodding slightly to convey gravity."
  },
  {
    name: "Financial Market Update",
    description: "Presenter standing next to dynamic stock charts and financial tickers, attire (random)",
    action: "pose: standing, holding an electronic tablet in one hand, pointing at a line graph on the wall display with the other",
    scenario: "environment: Wall Street financial television news studio set, giant transparent glass video screens displaying live stock market charts, green and red stock ticker displays scrolling on background studio walls",
    medium: "This is a corporate editorial photograph, sharp details, clean professional composition",
    lighting: "clean corporate neutral lighting, bright key lights, soft blue accents",
    color: "cool professional color palette, vibrant blue and green chart colors",
    videoPrompt: "At 0s: standing next to the stock chart screen, holding the electronic tablet in one hand. At 2s: taps the tablet screen, causing a chart to update, and points at a rising line graph. At 4s: turns back to face the camera, summarizing the market trends."
  },
  {
    name: "Press Briefing",
    description: "Presenter standing behind a podium with a microphone array, attire (random)",
    action: "pose: standing at a wooden press briefing podium, hands resting on the edges, speaking with authority, looking at audience",
    scenario: "environment: official press briefing auditorium hall, heavy wooden press podium mounted with broadcast microphone array, press conference backdrop with flags, soft focus camera flashlights in foreground",
    medium: "This is a press photography still, shallow depth of field, sharp focus on subject",
    lighting: "bright press-conference floodlights, overhead key lights, subtle flash highlights",
    color: "natural balanced press conference colors, clean corporate tones",
    videoPrompt: "At 0s: standing at the briefing podium, speaking with authority to the audience. At 2s: gestures with one hand to answer a question, looking toward the left. At 4s: shifts gaze back center, leaning slightly on the podium, continuing the statement."
  },
  {
    name: "Investigative Journalist",
    description: "Moody investigative set, red strings connecting photos on a corkboard behind presenter, attire (random)",
    action: "pose: standing three-quarter profile, holding a magnifying glass or a folder of documents, looking contemplative",
    scenario: "environment: investigative journalism studio office set, wall-sized case evidence board with documents, photos, map sections connected by red strings, dramatic studio spotlighting",
    medium: "This is a dark cinematic film still, moody atmosphere, sharp focus on subject, grainy texture",
    lighting: "moody dramatic spotlight, single overhead lamp cast, deep shadows",
    color: "desaturated moody color palette, high contrast shadows, noir aesthetic",
    videoPrompt: "At 0s: standing in the dim office, looking contemplatively at a document in hand. At 2s: walks slowly toward the corkboard wall, tracing a red connection string with a finger. At 4s: turns head back toward the camera with a serious, thoughtful look."
  },
  {
    name: "Sports Anchor Desk",
    description: "Presenter sitting at a sports broadcast desk, dynamic graphics background, attire (random)",
    action: "pose: sitting behind a curved sports desk, leaning forward enthusiastically, gesturing, bright friendly smile",
    scenario: "environment: energetic sports television news broadcast set, glossy curved sports anchor desk, high-contrast video wall displays showing athletic stadium lights and dynamic sports motion graphics",
    medium: "This is a clean broadcast style photograph, glossy surfaces",
    lighting: "bright energetic three-point lighting, neon blue and orange fill lights",
    color: "highly saturated vibrant sports broadcast colors",
    videoPrompt: "At 0s: sitting behind the sports desk, smiling enthusiastically at the camera. At 2s: gestures dynamically with both hands, describing a dramatic play. At 4s: leans forward, hands clasped on the desk, delivering a high-energy commentary."
  },
  {
    name: "Entertainment Tonight Show",
    description: "Presenter standing on a celebrity red carpet news stage, attire (random)",
    action: "pose: standing, posing elegantly with hands on hips, broad confident smile, looking directly at the camera",
    scenario: "environment: glamour entertainment news TV studio set, sparkling gold and purple LED backdrop walls, glowing studio stage floor, professional broadcast spotlights",
    medium: "This is a high-fashion editorial photograph, glamorous composition",
    lighting: "glamour beauty lighting, soft ring light reflections, bright spotlights",
    color: "warm golden and purple tones, rich glossy finish",
    videoPrompt: "At 0s: standing center stage, posing elegantly with hands on hips, smiling confidently. At 2s: waves slightly to the side cameras and changes pose. At 4s: turns back to the center camera, continuing to speak with expressive gestures."
  },
  {
    name: "Cybersecurity Report Room",
    description: "Presenter in front of terminal code matrices and server racks, attire (random)",
    action: "pose: standing, holding a tech stylus pointing towards a floating holographic grid display, serious focused face",
    scenario: "environment: dark cyber operations broadcast studio room set, green code streams scrolling on wall monitors, glowing server chassis rack stacks, futuristic interface display panels",
    medium: "This is a cinematic cyberpunk still, detailed textures",
    lighting: "cool matrix green rim lighting, neon key glow from monitors",
    color: "high contrast dark green and black color palette, technological sci-fi grade",
    videoPrompt: "At 0s: standing next to server racks, holding the tech stylus near the chest. At 2s: raises stylus to point toward a floating holographic display, tapping the interface. At 4s: looks directly back at the camera with a serious, focused expression."
  },
  {
    name: "Global Summit Correspondent",
    description: "Presenter reporting from a international summit, flags of many nations behind, attire (random)",
    action: "pose: standing, holding a thin headset microphone wire, speaking clearly and professionally",
    scenario: "environment: international summit press center hall, line of colorful world flag displays, professional TV news broadcast stage with bright overhead studio floodlights",
    medium: "This is a photojournalism press photo, clean editorial framing",
    lighting: "natural daylight, bright sun, soft fill flash",
    color: "balanced colors, realistic press coverage tone",
    videoPrompt: "At 0s: standing in the summit hall, speaking clearly while holding the headset microphone wire. At 2s: gestures with one hand toward the flags of nations behind. At 4s: continues speaking with professional nods, looking directly at the camera."
  },
  {
    name: "Science & Health Laboratory",
    description: "Presenter standing in a clean science lab set with microscopes, attire (random)",
    action: "pose: standing near a lab workbench, adjusting a microscope or looking at a glass beaker, professional calm expression",
    scenario: "environment: state-of-the-art medical science broadcast lab set, clean laboratory workbench with glassware and microscopes, blurred futuristic DNA helix holographic display",
    medium: "This is a clean commercial style photograph, sharp high-fidelity focus",
    lighting: "bright sterile white light, soft ambient blue fill lights",
    color: "clean white and clinical teal color palette",
    videoPrompt: "At 0s: standing near the laboratory bench, looking down at a glass beaker. At 2s: raises a chemical beaker to inspect it, then shifts gaze toward a microscope. At 4s: looks toward the camera, explaining the lab findings with a calm professional expression."
  }
];

export function getRandomStudioAttire(): string {
  // Get attire options from Professional Newsroom Attire section
  const section = STUDIO_CLOTHING_PRESETS.sections.find(s => s.sectionName === "Professional Newsroom Attire");
  const items = section ? section.items : STUDIO_CLOTHING_PRESETS.sections[0].items;
  const randIdx = Math.floor(Math.random() * items.length);
  return items[randIdx].desc;
}

export function getMergedCategories(categoriesOriginal?: CategoriesData, exposedEnabled: boolean = true) {
  if (!categoriesOriginal) {
    categoriesOriginal = promptdexterCategoriesJson as unknown as CategoriesData;
  }

  // Deep clone to avoid mutating original source
  const categoriesData: CategoriesData = categoriesOriginal ? JSON.parse(JSON.stringify(categoriesOriginal)) : {};

  if (categoriesData && categoriesData.medium) {
    const photoSub = categoriesData.medium.find((sub: PresetCategory) => sub.subCategoryName === "photography");
    if (photoSub && photoSub.sections) {
      photoSub.sections = photoSub.sections.map((sec: PresetSection) => {
        if (sec.items) {
          sec.items = sec.items.filter((item: PresetItem) => {
            const titleLower = item.title.toLowerCase();
            return !["street", "night photography", "landscape", "sports", "aerial / drone", "underwater", "neon night", "travel", "cityscape"].includes(titleLower);
          });
        }
        return sec;
      });
    }
  }

  categoriesData.nude = [];

  if (categoriesData && categoriesData.clothing) {
    if (exposedEnabled) {
      for (let i = NUDE_SHEER_PRESETS_LIST.length - 1; i >= 0; i--) {
        const sub = NUDE_SHEER_PRESETS_LIST[i];
        const lowerName = sub.subCategoryName.toLowerCase();
        if (lowerName.includes("poses & actions") || lowerName.includes("multi-persona interactions")) {
          if (categoriesData.pose) {
            categoriesData.pose.unshift(sub);
          }
          if (categoriesData.nude) {
            categoriesData.nude.unshift(sub);
          }
        } else {
          if (categoriesData.nude) {
            categoriesData.nude.unshift(sub);
          }
        }
      }
    }
    categoriesData.clothing.unshift(STUDIO_CLOTHING_PRESETS);
  }

  if (categoriesData && categoriesData.subject) {
    for (let i = TATTOO_JEWELRY_PRESETS_LIST.length - 1; i >= 0; i--) {
      categoriesData.subject.unshift(TATTOO_JEWELRY_PRESETS_LIST[i]);
    }
    for (let i = HAIRSTYLE_PRESETS_LIST.length - 1; i >= 0; i--) {
      categoriesData.subject.unshift(HAIRSTYLE_PRESETS_LIST[i]);
    }
  }

  if (categoriesData && categoriesData.pose) {
    categoriesData.pose.unshift(STUDIO_ACTIONS_PRESETS);
    if (exposedEnabled) {
      for (let i = BDSM_POSES_LIST.length - 1; i >= 0; i--) {
        categoriesData.pose.unshift(BDSM_POSES_LIST[i]);
      }
    }
  }

  if (categoriesData && categoriesData.indoor) {
    categoriesData.indoor.unshift(STUDIO_SCENARIOS_PRESETS);
  }

  return categoriesData;
}

// Dynamically load generated presets and classify them into correct category objects statically on import
try {
  const generatedData = generatedPresetsJson as unknown as {
    attire?: PresetItem[];
    nudeSheer?: PresetItem[];
    scenarios?: PresetItem[];
    actions?: PresetItem[];
  };
  
  const allItems: PresetItem[] = [];
  if (generatedData.attire) allItems.push(...generatedData.attire);
  if (generatedData.nudeSheer) allItems.push(...generatedData.nudeSheer);
  if (generatedData.scenarios) allItems.push(...generatedData.scenarios);
  if (generatedData.actions) allItems.push(...generatedData.actions);

  const attireList: PresetItem[] = [];
  const nudeSheerList: PresetItem[] = [];
  const scenarioList: PresetItem[] = [];
  const actionList: PresetItem[] = [];

  for (const item of allItems) {
    if (!item || !item.desc) continue;
    const desc = item.desc.trim().toLowerCase();
    if (desc.startsWith("attire:")) {
      attireList.push(item);
    } else if (desc.startsWith("scenario:")) {
      scenarioList.push(item);
    } else if (desc.startsWith("pose:")) {
      const isNSFW = desc.includes("model a") || 
                     desc.includes("model b") || 
                     desc.includes("groin") || 
                     desc.includes("thigh") || 
                     desc.includes("nude") || 
                     desc.includes("breast") || 
                     desc.includes("pelvic") || 
                     desc.includes("areola") || 
                     desc.includes("bondage") || 
                     desc.includes("buttocks") || 
                     desc.includes("labia") || 
                     desc.includes("cleft") ||
                     desc.includes("gag") ||
                     desc.includes("strap") ||
                     desc.includes("harness") ||
                     desc.includes("plug");
      if (isNSFW) {
        nudeSheerList.push(item);
      } else {
        actionList.push(item);
      }
    }
  }

  if (attireList.length > 0) {
    STUDIO_CLOTHING_PRESETS.sections.push({
      sectionName: "Expanded Wardrobe Collection",
      items: attireList
    });
  }

  if (nudeSheerList.length > 0) {
    const multiPersonaCat = NUDE_SHEER_PRESETS_LIST.find(
      cat => cat.subCategoryName === "Nude - Multi-Persona Interactions"
    );
    if (multiPersonaCat) {
      multiPersonaCat.sections.push({
        sectionName: "Expanded Interactions Collection",
        items: nudeSheerList
      });
    }
  }

  if (scenarioList.length > 0) {
    STUDIO_SCENARIOS_PRESETS.sections.push({
      sectionName: "Expanded Scenarios Collection",
      items: scenarioList
    });
  }

  if (actionList.length > 0) {
    STUDIO_ACTIONS_PRESETS.sections.push({
      sectionName: "Expanded Actions Collection",
      items: actionList
    });
  }
} catch {
  // If file doesn't exist yet or is empty
}
