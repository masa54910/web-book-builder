import { NextResponse } from "next/server";
import { authenticateAdminRequest } from "@/lib/server/adminAuth";
import { createOrGetTeacherMaster } from "@/lib/server/sampleBookSnapshots";
export async function POST(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const auth = await authenticateAdminRequest(request); if (!auth.user) return NextResponse.json({ error: "Unauthorized" }, { status: auth.status });
  const { slug } = await params; if (slug !== "teacher") return NextResponse.json({ error: "Not found" }, { status: 404 });
  const master = await createOrGetTeacherMaster(auth.user.id); return NextResponse.json({ id: master.id, editPath: `/dashboard/books/${master.id}/edit` });
}
