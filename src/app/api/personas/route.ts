import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireTenant } from "@/lib/tenant";
import { parseListParams, listResponse } from "@/lib/pagination";
import { saveCustomPersona, type Persona } from "@/lib/tts/personas";

export async function GET(req: NextRequest) {
  const t = await requireTenant();
  if (!t.ok) return t.response;
  const { orgId } = t.tenant;

  try {
    const url = new URL(req.url);
    const { page, limit, skip, take, q } = parseListParams(url.searchParams);
    const gender = url.searchParams.get("gender");
    const lang = url.searchParams.get("lang") || url.searchParams.get("language");
    const type = url.searchParams.get("type");
    const status = url.searchParams.get("status");
    const sortBy = url.searchParams.get("sortBy") || "name";
    const isLite = url.searchParams.get("lite") === "true";

    const andConditions: Record<string, unknown>[] = [];

    // Tenant scope / Persona type
    if (type === "system") {
      andConditions.push({ isSystemPersona: true });
    } else if (type === "custom") {
      andConditions.push({ companyId: orgId, isSystemPersona: false });
    } else {
      andConditions.push({ OR: [{ companyId: orgId }, { isSystemPersona: true }] });
    }

    if (gender && gender !== "all") {
      andConditions.push({ gender: { equals: gender } });
    }

    if (lang && lang !== "all") {
      andConditions.push({ language: { equals: lang } });
    }

    if (status === "active") {
      andConditions.push({ isActive: true });
    } else if (status === "inactive") {
      andConditions.push({ isActive: false });
    }

    if (q) {
      andConditions.push({
        OR: [
          { name: { contains: q } },
          { role: { contains: q } },
          { slug: { contains: q } },
        ],
      });
    }

    const where = andConditions.length > 0 ? { AND: andConditions } : {};

    const orderBy: Record<string, "asc" | "desc"> =
      sortBy === "createdAt" ? { createdAt: "desc" } : { name: "asc" };

    const personasPromise = isLite
      ? prisma.persona.findMany({
          where,
          select: {
            id: true,
            slug: true,
            name: true,
            role: true,
            gender: true,
            language: true,
            avatarType: true,
            isActive: true,
            isSystemPersona: true,
            createdAt: true,
            updatedAt: true,
            avatars: {
              select: {
                id: true,
                url: true,
                storageKey: true,
                frameType: true,
                isDefault: true,
              },
            },
            voices: {
              select: {
                id: true,
                label: true,
                isDefault: true,
                language: true,
                duration: true,
              },
            },
          },
          orderBy,
          skip,
          take,
        })
      : prisma.persona.findMany({
          where,
          include: { avatars: true, voices: true },
          orderBy,
          skip,
          take,
        });

    const [personas, total] = await Promise.all([
      personasPromise,
      prisma.persona.count({ where }),
    ]);

    const response = NextResponse.json({ ...listResponse(personas, total, page, limit), personas });
    response.headers.set("Cache-Control", "private, max-age=15, stale-while-revalidate=60");
    return response;
  } catch (error) {
    return NextResponse.json(
      { error: "Error al listar personas: " + String(error) },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  const t = await requireTenant();
  if (!t.ok) return t.response;
  const { orgId } = t.tenant;

  try {
    const body = await req.json();
    const { slug, name, role, gender, language, description, systemPrompt, bio, visualPrompt, visualPromptNeutral, voiceParams, avatarType } = body;

    if (!slug || !name || !role) {
      return NextResponse.json(
        { error: "Faltan campos obligatorios: slug, name, role" },
        { status: 400 }
      );
    }

    // Check if slug is unique
    const existing = await prisma.persona.findUnique({
      where: { slug },
    });

    if (existing) {
      return NextResponse.json(
        { error: "El identificador (slug) ya existe. Elija otro." },
        { status: 400 }
      );
    }

    // Default voice params if not specified
    const defaultParams = {
      exaggeration: 0.55,
      cfgWeight: 0.65,
      temperature: 0.8,
      speed: 1.0,
      pitchShift: 0,
      maxNewTokens: 1200,
      chunkSize: 200,
    };

    const normalizedSlug = slug.toLowerCase().replace(/[^a-z0-9-_]/g, "");

    const persona = await prisma.persona.create({
      data: {
        companyId: orgId,
        slug: normalizedSlug,
        name,
        role,
        gender: gender || "male",
        language: language || "en",
        description: description || "",
        systemPrompt: systemPrompt || "",
        bio: bio || "",
        visualPrompt: visualPrompt || "",
        visualPromptNeutral: visualPromptNeutral || "",
        voiceParams: voiceParams || JSON.stringify(defaultParams),
        avatarType: avatarType || "static_image",
        isActive: true,
        isSystemPersona: false, // Custom personas created via UI are never system
      },
    });

    try {
      saveCustomPersona({
        id: normalizedSlug,
        name,
        title: role,
        description: description || "",
        bio: bio || "",
        systemPrompt: systemPrompt || "",
        traits: {
          age: 32,
          heightCm: 175,
          heightFeet: "5'9\"",
          weightKg: 58,
          weightLbs: 128,
          skinTone: "Fair skin tone",
          hair: "Styled hair",
          face: "Natural facial features",
          build: "Athletic frame",
          defaultAttire: visualPrompt || "Tailored broadcast suit",
          defaultBackground: "Newsroom studio",
          defaultLighting: "Studio lighting",
        },
        avatarUrl: `/avatars/${normalizedSlug}.png`,
        voiceFile: `${normalizedSlug}.wav`,
        language: (language || "en") as Persona["language"],
        gender: (gender || "male") as Persona["gender"],
        params: defaultParams,
      });
    } catch (saveErr) {
      console.warn("Could not save to customPersonas.json:", saveErr);
    }

    return NextResponse.json(persona);
  } catch (error) {
    return NextResponse.json(
      { error: "Error al crear persona: " + String(error) },
      { status: 500 }
    );
  }
}
