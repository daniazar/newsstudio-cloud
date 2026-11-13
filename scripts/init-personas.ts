import { prisma } from "../src/lib/prisma";
import { PERSONAS, getPersonaBroadcastPrompt, getPersonaNeutralHeadshotPrompt, getPersonaNudeBase } from "../src/lib/tts/personas";
import fs from "fs";
import path from "path";

// System personas are owned by the default (owner) organization but are globally visible.
const DEFAULT_ORG_ID = process.env.DEFAULT_ORG_ID || "org_default_tenant";

function getStyleGuidelines(name: string, title: string, gender: string): string {
  const role = title.toLowerCase();
  const isFemale = gender.toLowerCase() === "female";

  if (role.includes("anchor") || role.includes("news")) {
    return isFemale
      ? "Sharp, formal double-breasted blazers in solid primary or dark colors (navy, forest green, burgundy), crisp white under-blouse. Elegant, well-groomed hair (bob, straight cut, or neat wave). Clean professional makeup with subtle lipstick and eyes, small stud earrings. Formal and authoritative."
      : "Classic tailored business suit in charcoal, navy, or black. Crisp white or light-blue collared dress shirt with a neat silk tie. Clean-cut, short styled hair, and a clean-shaven or well-trimmed facial beard. Authoritative and professional news-anchor look.";
  }

  if (role.includes("correspondent") || role.includes("reporter") || role.includes("field")) {
    return isFemale
      ? "Structured, weather-proof outdoor jackets, smart casual zip-up hoodies, or a clean wool coat over a collared shirt. Durable, practical hairstyle (ponytail or neat bob). Natural, fresh outdoor-ready makeup, minimal or no jewelry. Practical, active reporter look."
      : "Structured weather-proof field jacket, smart casual zip-up utility jacket, or structured trench coat. Neat collared shirt or casual knit sweater. Durable windproof hairstyle, natural grooming. Ready-for-action field reporter attire.";
  }

  if (role.includes("sports") || role.includes("sports-caster")) {
    return isFemale
      ? "Athletic polo shirt with dynamic accent lines, fitted sporty zip-up track jacket, or high-collar active pullover. Energized, practical ponytail or sporty bob hair. Light, sweat-proof natural makeup. Minimalist accessories. Energetic, active look."
      : "Structured athletic polo shirt, clean sports zip-up jacket, or fitted smart-casual blazer over a high-quality t-shirt. Short sporty styled hair, clean-cut facial hair. Energetic and approachable sports commentator styling.";
  }

  if (role.includes("entertainment") || role.includes("gossip") || role.includes("pop") || role.includes("culture") || role.includes("gossip-host")) {
    return isFemale
      ? "Flashy metallic bomber jackets, colorful casual chic attire, trendy crop tops under open stylish jackets, or fashion-forward jumpsuits. Creative, voluminous hairstyles (curls, braids, or high ponytail). Vibrant, expressive makeup with glossy lips and defined eyes. Bold, trendy earrings or necklaces. Chic, expressive, and fun."
      : "Trendy denim or leather jacket, colorful casual blazer over a graphic t-shirt, or a stylish open-button shirt. Fashion-forward hairstyle, groomed or slightly styled stubble. Expressive, modern accessories like a watch or silver chain. Trendy, charismatic entertainment host styling.";
  }

  return isFemale
    ? "Elegant smart-casual business wear (chic blazer, structured blouse). Styled, neat hair. Natural professional makeup, minimal classic jewelry. Approachable and professional."
    : "Smart-casual business wear (structured blazer over a button-up shirt, or clean polo). Neat, combed hairstyle, clean-cut facial grooming. Approachable and professional.";
}

async function main() {
  console.log("🚀 Starting NewsStudio Personas initialization...");

  await prisma.company.upsert({
    where: { id: DEFAULT_ORG_ID },
    update: {},
    create: { id: DEFAULT_ORG_ID, name: "Default Organization", tier: "enterprise" },
  });

  // Scan for actual voices on disk if folders exist
  const voicesDirs = [
    path.resolve("./public/presets/voices"),
    path.resolve("./public/voices"),
  ];
  const availableVoices = new Set<string>();
  for (const vDir of voicesDirs) {
    if (fs.existsSync(vDir)) {
      try {
        const files = fs.readdirSync(vDir);
        files.forEach((f) => {
          if (f.endsWith(".wav")) availableVoices.add(f.toLowerCase());
        });
      } catch (e) {
        console.warn(`⚠️ Could not scan voice directory: ${vDir}`);
      }
    }
  }
  console.log(`📁 Modern-TTS voice presets scanned. ${availableVoices.size} voices found.`);

  // Scan for actual avatars on disk if folder exists
  const avatarsDir = path.resolve("./public/avatars");
  const availableAvatars = new Set<string>();
  if (fs.existsSync(avatarsDir)) {
    try {
      const files = fs.readdirSync(avatarsDir);
      files.forEach((f) => {
        if (f.endsWith(".png") || f.endsWith(".jpg") || f.endsWith(".jpeg")) {
          availableAvatars.add(f.toLowerCase());
        }
      });
      console.log(`📁 Avatars folder scanned. ${availableAvatars.size} images found.`);
    } catch (e) {
      console.warn("⚠️ Could not scan the avatars folder.");
    }
  }

  let seededCount = 0;

  for (const p of PERSONAS) {
    const styleRules = getStyleGuidelines(p.name, p.title, p.gender);

    // 1. Seed or update Persona record
    const persona = await prisma.persona.upsert({
      where: { slug: p.id },
      update: {
        name: p.name,
        role: p.title,
        gender: p.gender,
        language: p.language,
        description: p.description,
        bio: p.bio,
        systemPrompt: p.systemPrompt,
        visualPrompt: getPersonaBroadcastPrompt(p),
        visualPromptNeutral: getPersonaNeutralHeadshotPrompt(p),
        visualBodyPrompt: getPersonaNudeBase(p),
        voiceParams: JSON.stringify(p.params),
        avatarType: p.avatars && p.avatars.length > 0 ? "static_image" : "static_image",
        styleGuidelines: styleRules,
        isSystemPersona: true,
        isActive: true,
      },
      create: {
        companyId: DEFAULT_ORG_ID,
        slug: p.id,
        name: p.name,
        role: p.title,
        gender: p.gender,
        language: p.language,
        description: p.description,
        bio: p.bio,
        systemPrompt: p.systemPrompt,
        visualPrompt: getPersonaBroadcastPrompt(p),
        visualPromptNeutral: getPersonaNeutralHeadshotPrompt(p),
        visualBodyPrompt: getPersonaNudeBase(p),
        voiceParams: JSON.stringify(p.params),
        avatarType: "static_image",
        styleGuidelines: styleRules,
        isSystemPersona: true,
        isActive: true,
      },
    });

    // 2. Seed Default Avatar
    const avatarFilename = path.basename(p.avatarUrl).toLowerCase();
    const avatarKey = `avatars/${avatarFilename}`;
    
    // Check if avatar already exists for this persona
    const existingAvatar = await prisma.personaAvatar.findFirst({
      where: {
        personaId: persona.id,
        url: p.avatarUrl,
      },
    });

    if (!existingAvatar) {
      const dbAvatar = await prisma.personaAvatar.create({
        data: {
          companyId: DEFAULT_ORG_ID,
          personaId: persona.id,
          label: `${p.name} Default Portrait`,
          url: p.avatarUrl,
          storageKey: avatarKey,
          frameType: "portrait",
          isDefault: true,
        },
      });
      
      // Update Persona's defaultAvatarId
      await prisma.persona.update({
        where: { id: persona.id },
        data: { defaultAvatarId: dbAvatar.id },
      });
    }

    // 3. Seed Default Voice & Pre-Cached Latent Embedding
    const personaVoicePath = `voices/${p.id}.wav`;
    const personaEmbeddingPath = `embeddings/${p.id}.pt`;

    const existingVoice = await prisma.personaVoice.findFirst({
      where: {
        personaId: persona.id,
      },
    });

    if (!existingVoice) {
      await prisma.personaVoice.create({
        data: {
          companyId: DEFAULT_ORG_ID,
          personaId: persona.id,
          label: `${p.name} Primary Voice (${p.id}.wav)`,
          audioPath: personaVoicePath,
          storageKey: personaVoicePath,
          embeddingPath: personaEmbeddingPath,
          embeddingStorageKey: personaEmbeddingPath,
          isDefault: true,
          language: p.language,
          duration: 4.5,
        },
      });
    } else {
      await prisma.personaVoice.update({
        where: { id: existingVoice.id },
        data: {
          audioPath: personaVoicePath,
          storageKey: personaVoicePath,
          embeddingPath: personaEmbeddingPath,
          embeddingStorageKey: personaEmbeddingPath,
          duration: 4.5,
        },
      });
    }


    seededCount++;
  }

  console.log(`✅ Initialization completed successfully. Seeded/updated ${seededCount} Personas in the Database.`);
}

main()
  .catch((e) => {
    console.error("❌ Error executing initialization:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
