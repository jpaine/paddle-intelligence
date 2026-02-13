import { NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { db } from "@/src/db";
import { submissions } from "@/src/db/schema";
import { submitSchema } from "@/src/lib/validations";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = submitSchema.safeParse({
      ...body,
      contact_email: body.contact_email || undefined,
      notes: body.notes || undefined,
    });
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const { brand, model, product_url, contact_email, notes } = parsed.data;
    await db.insert(submissions).values({
      id: uuidv4(),
      brand,
      model,
      productUrl: product_url,
      contactEmail: contact_email || null,
      notes: notes || null,
      createdAt: new Date(),
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("Submit error:", e);
    return NextResponse.json(
      { error: "Submission failed" },
      { status: 500 }
    );
  }
}
