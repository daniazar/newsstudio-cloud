import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { saveCustomPasswordHash, hashPassword } from "@/lib/passwords";
import { withAdminAuth } from "@/lib/apiHandler";

const changePasswordSchema = z.object({
  email: z.string().email(),
  newPassword: z.string().min(4),
});

export const POST = withAdminAuth(async (request: NextRequest) => {
  const body = await request.json();
  const parsed = changePasswordSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Datos de entrada inválidos" }, { status: 400 });
  }

  const { email, newPassword } = parsed.data;

  // Check if user is in our allowed user base
  const allowedEmails = [
    "federico@newsstudio.com",
    "facundo@newsstudio.com",
    "daniel@newsstudio.com",
    "admin@newsstudio.com",
  ];

  if (!allowedEmails.includes(email.toLowerCase())) {
    return NextResponse.json({ error: "Usuario no registrado en la base de datos" }, { status: 404 });
  }

  // Hash and save new password with salted PBKDF2
  const hash = hashPassword(newPassword);
  saveCustomPasswordHash(email, hash);

  return NextResponse.json({
    success: true,
    message: `Contraseña para ${email} actualizada exitosamente.`,
  });
});
