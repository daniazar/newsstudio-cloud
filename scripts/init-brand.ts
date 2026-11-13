import { prisma } from "../src/lib/prisma";

const DEFAULT_ORG_ID = process.env.DEFAULT_ORG_ID || "org_default_tenant";

const DEFAULT_BRAND = {
  name: "Ruby Studio",
  handle: "rubystudio",
  toneOfVoice: "Professional, energetic, and trustworthy news delivery.",
  titleTemplate: "{title} | Ruby Studio News",
  descriptionTemplate: "{summary}\n\nBrought to you by Ruby Studio.",
  primaryColor: "#E0115F", // ruby
  secondaryColor: "#1A1A2E",
  captionStyle: "bold-centered",
  preferredMusicMood: "news",
  hashtagBank: "#news #rubystudio #breakingnews",
  autoPublish: false,
  isActive: true,
};

async function main() {
  console.log("🚀 Starting Ruby Studio brand initialization...");

  await prisma.company.upsert({
    where: { id: DEFAULT_ORG_ID },
    update: {},
    create: { id: DEFAULT_ORG_ID, name: "Default Organization", tier: "enterprise" },
  });

  // Brand has no unique constraint on name/handle, so guard by handle for idempotency.
  let brand = await prisma.brand.findFirst({
    where: { handle: DEFAULT_BRAND.handle },
  });

  if (brand) {
    brand = await prisma.brand.update({
      where: { id: brand.id },
      data: DEFAULT_BRAND,
    });
    console.log(`♻️  Updated existing brand "${brand.name}" (${brand.id}).`);
  } else {
    brand = await prisma.brand.create({ data: { ...DEFAULT_BRAND, companyId: DEFAULT_ORG_ID } });
    console.log(`✨ Created brand "${brand.name}" (${brand.id}).`);
  }

  // Attach all system personas so the brand is usable out of the box.
  const systemPersonas = await prisma.persona.findMany({
    where: { isSystemPersona: true, isActive: true },
    select: { id: true },
  });

  if (systemPersonas.length > 0) {
    await prisma.brand.update({
      where: { id: brand.id },
      data: {
        personas: {
          connect: systemPersonas.map((p) => ({ id: p.id })),
        },
      },
    });
    console.log(`🔗 Linked ${systemPersonas.length} system personas to "${brand.name}".`);
  } else {
    console.warn("⚠️ No system personas found — run scripts/init-personas.ts first.");
  }

  console.log(`✅ Initialization completed successfully.`);
}

main()
  .catch((e) => {
    console.error("❌ Error executing initialization:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
