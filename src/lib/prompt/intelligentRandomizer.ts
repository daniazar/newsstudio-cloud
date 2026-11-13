import { prisma } from "../prisma";

export async function getRandomizedAttire(options?: { studioApprovedOnly?: boolean; professionalOnly?: boolean }): Promise<string> {
  const { studioApprovedOnly = false, professionalOnly = false } = options || {};
  const attires = await prisma.visualPreset.findMany({
    where: {
      category: "attire",
      ...(studioApprovedOnly ? { isStudioApproved: true } : {}),
      ...(professionalOnly ? { subSubCategory: "Professional Newsroom Attire" } : {})
    }
  });

  if (attires.length === 0) return "wearing a default professional outfit";

  // Separate into full body, tops, bottoms, accessories based on subCategory or keywords
  const fullBody = attires.filter(a => a.isFullAttire || a.subCategory?.toLowerCase().includes("dress") || a.desc.toLowerCase().includes("gown") || a.desc.toLowerCase().includes("suit"));
  const tops = attires.filter(a => !a.isFullAttire && (a.desc.toLowerCase().includes("shirt") || a.desc.toLowerCase().includes("blouse") || a.desc.toLowerCase().includes("top") || a.desc.toLowerCase().includes("blazer") || a.desc.toLowerCase().includes("sweater") || a.desc.toLowerCase().includes("jacket")));
  const bottoms = attires.filter(a => !a.isFullAttire && (a.desc.toLowerCase().includes("pants") || a.desc.toLowerCase().includes("skirt") || a.desc.toLowerCase().includes("trousers") || a.desc.toLowerCase().includes("jeans") || a.desc.toLowerCase().includes("shorts")));
  
  // Accessories should strictly exclude any items classified as main clothing (full body, tops, bottoms)
  const accessories = attires.filter(a => {
    const isMainClothing = fullBody.some(f => f.id === a.id) || tops.some(t => t.id === a.id) || bottoms.some(b => b.id === a.id);
    if (isMainClothing) return false;
    return a.subCategory?.toLowerCase().includes("accessory") || a.desc.toLowerCase().includes("glasses") || a.desc.toLowerCase().includes("necklace") || a.desc.toLowerCase().includes("hat");
  });

  let finalAttire = "";
  
  // Decide whether to use a Full Body outfit or a Top + Bottom combination
  if (Math.random() > 0.5 && fullBody.length > 0) {
    const randomFull = fullBody[Math.floor(Math.random() * fullBody.length)];
    finalAttire = randomFull.desc;
  } else if (tops.length > 0 && bottoms.length > 0) {
    const randomTop = tops[Math.floor(Math.random() * tops.length)];
    const randomBottom = bottoms[Math.floor(Math.random() * bottoms.length)];
    // Extract the raw description by removing prefixes if any (e.g. "attire: ")
    const topClean = randomTop.desc.replace(/^attire:\s*/i, "");
    const bottomClean = randomBottom.desc.replace(/^attire:\s*/i, "");
    finalAttire = `wearing ${topClean} and ${bottomClean}`;
  } else {
    // Fallback if top/bottom arrays are empty
    const randomAny = attires[Math.floor(Math.random() * attires.length)];
    finalAttire = randomAny.desc;
  }

  // 15% chance to add an accessory
  if (Math.random() < 0.15 && accessories.length > 0) {
    const randomAcc = accessories[Math.floor(Math.random() * accessories.length)];
    const accClean = randomAcc.desc.replace(/^attire:\s*/i, "");
    finalAttire += `, styled with ${accClean}`;
  }

  return finalAttire.replace(/^attire:\s*/i, "");
}
