import { NextResponse } from "next/server";

// Categorie-beheer via database is vervangen door modules.ts als bron van waarheid.
export async function PATCH() {
  return NextResponse.json({ error: "Categorieën worden beheerd via modules.ts" }, { status: 410 });
}

export async function DELETE() {
  return NextResponse.json({ error: "Categorieën worden beheerd via modules.ts" }, { status: 410 });
}
