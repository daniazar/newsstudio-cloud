import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAllRegistryUsers, saveRegistryUser, deleteRegistryUser, RegistryUser, hashPassword } from "@/lib/passwords";
import { withAdminAuth } from "@/lib/apiHandler";

const createUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(2),
  password: z.string().min(4),
  role: z.enum(["admin", "editor"]).default("editor"),
});

const updateUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(2),
  role: z.enum(["admin", "editor"]),
  isActive: z.boolean(),
  password: z.string().min(4).optional(),
});

// 1. GET: List all users
export const GET = withAdminAuth(async () => {
  const users = getAllRegistryUsers();
  // Strip password hashes for security in transmission
  const safeUsers = users.map((u) => ({
    id: u.id,
    email: u.email,
    name: u.name,
    role: u.role,
    isActive: u.isActive,
    createdAt: u.createdAt,
  }));
  return NextResponse.json(safeUsers);
});

// 2. POST: Create a new user
export const POST = withAdminAuth(async (request: NextRequest) => {
  const body = await request.json();
  const parsed = createUserSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Datos de entrada inválidos" }, { status: 400 });
  }

  const { email, name, password, role } = parsed.data;

  // Check if email already exists
  const users = getAllRegistryUsers();
  if (users.some(u => u.email.toLowerCase() === email.toLowerCase())) {
    return NextResponse.json({ error: "El correo electrónico ya está registrado." }, { status: 409 });
  }

  const passwordHash = hashPassword(password);
  const newUser: RegistryUser = {
    id: `user-${Math.random().toString(36).substring(2, 11)}`,
    email: email.toLowerCase(),
    name,
    passwordHash,
    isActive: true,
    role,
    createdAt: new Date().toISOString(),
  };

  saveRegistryUser(newUser);

  return NextResponse.json({
    success: true,
    message: `Usuario ${name} creado con éxito.`,
  });
});

// 3. PUT: Update a user's details
export const PUT = withAdminAuth(async (request: NextRequest, { admin }) => {
  const body = await request.json();
  const parsed = updateUserSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Datos de entrada inválidos" }, { status: 400 });
  }

  const { email, name, role, isActive, password } = parsed.data;

  const users = getAllRegistryUsers();
  const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());

  if (!user) {
    return NextResponse.json({ error: "Usuario no encontrado." }, { status: 404 });
  }

  // Safety: Prevent active user from disabling themselves!
  if (admin.email?.toLowerCase() === email.toLowerCase() && !isActive) {
    return NextResponse.json({ error: "No puedes deshabilitar tu propia cuenta activa." }, { status: 400 });
  }

  // Update fields
  user.name = name;
  user.role = role;
  user.isActive = isActive;
  
  if (password && password.trim().length >= 4) {
    user.passwordHash = hashPassword(password);
  }

  saveRegistryUser(user);

  return NextResponse.json({
    success: true,
    message: `Usuario ${name} actualizado con éxito.`,
  });
});

// 4. DELETE: Delete a user
export const DELETE = withAdminAuth(async (request: NextRequest, { admin }) => {
  const { searchParams } = new URL(request.url);
  const email = searchParams.get("email");

  if (!email) {
    return NextResponse.json({ error: "Correo electrónico faltante" }, { status: 400 });
  }

  // Safety: Prevent user from deleting themselves
  if (admin.email?.toLowerCase() === email.toLowerCase()) {
    return NextResponse.json({ error: "No puedes eliminar tu propia cuenta activa." }, { status: 400 });
  }

  const deleted = deleteRegistryUser(email);
  if (!deleted) {
    return NextResponse.json({ error: "Usuario no encontrado." }, { status: 404 });
  }

  return NextResponse.json({
    success: true,
    message: "Usuario eliminado exitosamente.",
  });
});
