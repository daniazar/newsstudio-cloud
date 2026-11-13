import { prisma } from "../src/lib/prisma";
import fs from "fs";
import path from "path";

// Import static presets statically
import {
  STUDIO_CLOTHING_PRESETS,
  NUDE_SHEER_PRESETS_LIST,
  STUDIO_SCENARIOS_PRESETS,
  STUDIO_ACTIONS_PRESETS
} from "../src/data/prompt_presets";
const GENERATED_FILE = path.join(__dirname, "../src/data/generated_presets.json");

interface PresetItem {
  title: string;
  desc: string;
  imageDesc?: string;
  videoDesc?: string;
}

function classifyGeneratedItem(item: PresetItem, defaultCategory: string) {
  const desc = item.desc.trim().toLowerCase();
  
  let category = defaultCategory;
  if (desc.startsWith("attire:")) {
    category = "attire";
  } else if (desc.startsWith("scenario:")) {
    category = "scenarios";
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
                   desc.includes("plug") ||
                   desc.includes("cuff");
    if (isNSFW) {
      category = "nudeSheer";
    } else {
      category = "actions";
    }
  }

  let subCategory = "";
  let subSubCategory = "";

  if (category === "attire") {
    subCategory = "Expanded Wardrobe";
    if (desc.includes("latex") || desc.includes("pvc") || desc.includes("catsuit") || desc.includes("harness")) {
      subSubCategory = "Latex & Alt Gear";
    } else if (desc.includes("velvet") || desc.includes("silk") || desc.includes("gown") || desc.includes("blazer") || desc.includes("tweed")) {
      subSubCategory = "Studio & Formal Wear";
    } else if (desc.includes("jeans") || desc.includes("sweater") || desc.includes("hoodie") || desc.includes("puffer")) {
      subSubCategory = "Casual & On-Location";
    } else {
      subSubCategory = "General Wardrobe";
    }
  } else if (category === "nudeSheer") {
    subCategory = "Expanded Intimate Poses";
    if (desc.includes("bondage") || desc.includes("shibari") || desc.includes("bound") || desc.includes("cuffed") || desc.includes("tie") || desc.includes("rope") || desc.includes("restraint") || desc.includes("collar") || desc.includes("leash")) {
      subSubCategory = "Bondage & Restraints";
    } else if (desc.includes("areola") || desc.includes("clamp") || desc.includes("spank") || desc.includes("butt plug") || desc.includes("chastity") || desc.includes("plug") || desc.includes("gag")) {
      subSubCategory = "Sensory & Fetish";
    } else if (desc.includes("futanari") || desc.includes("intersex") || desc.includes("penis") || desc.includes("vulva") || desc.includes("groin") || desc.includes("pelvic")) {
      subSubCategory = "Intimate Intercourse";
    } else if (desc.includes("kiss") || desc.includes("massage") || desc.includes("embrace") || desc.includes("hug") || desc.includes("touch") || desc.includes("holding")) {
      subSubCategory = "Soft Touch & Closeness";
    } else {
      subSubCategory = "Physical Positioning";
    }
  } else if (category === "scenarios") {
    subCategory = "Expanded Studio Sets";
    if (desc.includes("control panel") || desc.includes("control room") || desc.includes("editor") || desc.includes("monitors") || desc.includes("server")) {
      subSubCategory = "Control Room & Tech";
    } else if (desc.includes("desk") || desc.includes("chair") || desc.includes("table")) {
      subSubCategory = "Anchor Desk Sets";
    } else if (desc.includes("green screen") || desc.includes("weather") || desc.includes("radar")) {
      subSubCategory = "Chroma Key & Weather";
    } else {
      subSubCategory = "General Backdrops";
    }
  } else {
    subCategory = "Expanded Anchor Gestures";
    if (desc.includes("laptop") || desc.includes("computer") || desc.includes("keyboard") || desc.includes("typing") || desc.includes("tablet")) {
      subSubCategory = "Tech Interaction";
    } else if (desc.includes("papers") || desc.includes("script") || desc.includes("notes") || desc.includes("reading") || desc.includes("shuffle")) {
      subSubCategory = "Document Shuffling";
    } else if (desc.includes("mic") || desc.includes("earpiece") || desc.includes("headset")) {
      subSubCategory = "Audio Equipment Adjustment";
    } else if (desc.includes("pointing") || desc.includes("pointing to") || desc.includes("pointing at") || desc.includes("board")) {
      subSubCategory = "Active Gesturing";
    } else {
      subSubCategory = "Speaking & Anchor Poses";
    }
  }

  return { category, subCategory, subSubCategory };
}

async function main() {
  console.log("🧹 Clearing existing database presets...");
  await prisma.visualPreset.deleteMany();

  const presetsToInsert: any[] = [];
  const ENRICHED_FILE = path.join(__dirname, "../src/data/enriched_presets.json");

  if (fs.existsSync(ENRICHED_FILE)) {
    console.log("💎 Found enriched_presets.json cache. Seeding visual presets directly from cache...");
    const cached = JSON.parse(fs.readFileSync(ENRICHED_FILE, "utf-8"));
    
    // Create maps of static attire to lookup their studio approved / full attire values
    const attireMap = new Map<string, { isStudioApproved?: boolean; isFullAttire?: boolean }>();
    STUDIO_CLOTHING_PRESETS.sections.forEach(sec => {
      sec.items.forEach(it => {
        attireMap.set(it.title, { isStudioApproved: it.isStudioApproved, isFullAttire: it.isFullAttire });
      });
    });

    presetsToInsert.push(...cached.map((item: any) => {
      const isAttire = item.category === "attire";
      const staticProps = isAttire ? attireMap.get(item.name) : undefined;
      return {
        ...item,
        isStudioApproved: staticProps?.isStudioApproved ?? item.isStudioApproved ?? false,
        isFullAttire: staticProps?.isFullAttire ?? item.isFullAttire ?? false
      };
    }));
  } else {
    console.log("ℹ️ No enriched_presets.json found. Building presets from prompt_presets.ts & generated_presets.json...");

  // ==========================================
  // 1. Process Static Attire Presets
  // ==========================================
  const attireCat = STUDIO_CLOTHING_PRESETS;
  attireCat.sections.forEach(section => {
    section.items.forEach(item => {
      presetsToInsert.push({
        name: item.title,
        desc: item.desc,
        imageDesc: item.imageDesc || null,
        videoDesc: item.videoDesc || null,
        category: "attire",
        subCategory: attireCat.subCategoryName,
        subSubCategory: section.sectionName,
        isCustom: false,
        isStudioApproved: item.isStudioApproved ?? false,
        isFullAttire: item.isFullAttire ?? false
      });
    });
  });

  // ==========================================
  // 2. Process Static Nude/Sheer Presets
  // ==========================================
  NUDE_SHEER_PRESETS_LIST.forEach(subCat => {
    subCat.sections.forEach(section => {
      section.items.forEach(item => {
        presetsToInsert.push({
          name: item.title,
          desc: item.desc,
          imageDesc: item.imageDesc || null,
          videoDesc: item.videoDesc || null,
          category: "nudeSheer",
          subCategory: subCat.subCategoryName,
          subSubCategory: section.sectionName,
          isCustom: false
        });
      });
    });
  });

  // ==========================================
  // 3. Process Static Scenarios Presets
  // ==========================================
  const scenarioCat = STUDIO_SCENARIOS_PRESETS;
  scenarioCat.sections.forEach(section => {
    section.items.forEach(item => {
      presetsToInsert.push({
        name: item.title,
        desc: item.desc,
        imageDesc: item.imageDesc || null,
        videoDesc: item.videoDesc || null,
        category: "scenarios",
        subCategory: scenarioCat.subCategoryName,
        subSubCategory: section.sectionName,
        isCustom: false
      });
    });
  });

  // ==========================================
  // 4. Process Static Actions Presets
  // ==========================================
  const actionCat = STUDIO_ACTIONS_PRESETS;
  actionCat.sections.forEach(section => {
    section.items.forEach(item => {
      presetsToInsert.push({
        name: item.title,
        desc: item.desc,
        imageDesc: item.imageDesc || null,
        videoDesc: item.videoDesc || null,
        category: "actions",
        subCategory: actionCat.subCategoryName,
        subSubCategory: section.sectionName,
        isCustom: false
      });
    });
  });

  console.log(`✅ Loaded ${presetsToInsert.length} static presets.`);

  // ==========================================
  // 5. Load and process Generated Presets JSON
  // ==========================================
  if (fs.existsSync(GENERATED_FILE)) {
    try {
      const generated = JSON.parse(fs.readFileSync(GENERATED_FILE, "utf-8"));
      const allGenerated: Array<{ item: PresetItem; defaultCat: string }> = [];

      if (generated.attire) {
        generated.attire.forEach((item: PresetItem) => allGenerated.push({ item, defaultCat: "attire" }));
      }
      if (generated.nudeSheer) {
        generated.nudeSheer.forEach((item: PresetItem) => allGenerated.push({ item, defaultCat: "nudeSheer" }));
      }
      if (generated.scenarios) {
        generated.scenarios.forEach((item: PresetItem) => allGenerated.push({ item, defaultCat: "scenarios" }));
      }
      if (generated.actions) {
        generated.actions.forEach((item: PresetItem) => allGenerated.push({ item, defaultCat: "actions" }));
      }

      console.log(`Processing ${allGenerated.length} generated presets...`);

      allGenerated.forEach(({ item, defaultCat }) => {
        if (!item || !item.desc || !item.title) return;
        const { category, subCategory, subSubCategory } = classifyGeneratedItem(item, defaultCat);
        
        // Skip duplicate names in the insert array to avoid confusion
        presetsToInsert.push({
          name: item.title,
          desc: item.desc,
          imageDesc: item.imageDesc || null,
          videoDesc: item.videoDesc || null,
          category,
          subCategory,
          subSubCategory,
          isCustom: false
        });
      });
    } catch (e) {
      console.error("Error reading generated file:", e);
    }
  } else {
    console.warn("No generated file found, skipping generated seed.");
  }
  }

  // ==========================================
  // 6. Bulk Insert to Database
  // ==========================================
  console.log(`🚀 Bulk-inserting ${presetsToInsert.length} presets to SQLite database...`);
  
  // Create in chunks of 500 to prevent SQLite variable limit error
  const chunkSize = 500;
  let inserted = 0;
  for (let i = 0; i < presetsToInsert.length; i += chunkSize) {
    const chunk = presetsToInsert.slice(i, i + chunkSize);
    await prisma.visualPreset.createMany({
      data: chunk
    });
    inserted += chunk.length;
    console.log(`   - Inserted ${inserted}/${presetsToInsert.length}`);
  }

  console.log("\n🎉 Database Seeding Completed Successfully!");
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
