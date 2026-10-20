import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import mammoth from "mammoth";
import { PDFParse } from "pdf-parse";
import { requireAuthUser } from "@/lib/auth-server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST(req: NextRequest) {
  try {
    const { user, errorResponse } = await requireAuthUser();
    if (errorResponse) return errorResponse;

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const category = (formData.get("category") as string) || "Paket_Bimbel";
    let title = (formData.get("title") as string) || "";

    if (!file) {
      return NextResponse.json(
        { error: "File dokumen wajib diunggah (PDF, DOCX, TXT, MD)" },
        { status: 400 }
      );
    }

    const fileName = file.name;
    const extension = fileName.split(".").pop()?.toLowerCase();

    if (!["pdf", "docx", "txt", "md"].includes(extension || "")) {
      return NextResponse.json(
        { error: "Format file tidak didukung. Harap unggah file PDF, DOCX, TXT, atau MD." },
        { status: 400 }
      );
    }

    // Set default title if empty
    if (!title.trim()) {
      title = fileName.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ");
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    let extractedText = "";

    if (extension === "docx") {
      const result = await mammoth.extractRawText({ buffer });
      extractedText = result.value || "";
    } else if (extension === "pdf") {
      const parser = new PDFParse({ data: buffer });
      const textResult = await parser.getText();
      extractedText = textResult.text || "";
      await parser.destroy();
    } else {
      // txt or md
      extractedText = buffer.toString("utf-8");
    }

    // Clean up excessive whitespace
    const cleanContent = extractedText
      .replace(/\r\n/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim();

    if (!cleanContent) {
      return NextResponse.json(
        { error: "Dokumen kosong atau tidak ada teks yang dapat diekstrak dari file ini." },
        { status: 400 }
      );
    }

    // Save to Knowledge Base table scoped to this user
    const doc = await prisma.knowledgeDocument.create({
      data: {
        userId: user!.id,
        title: title.trim(),
        category,
        content: cleanContent,
      },
    });

    const wordCount = cleanContent.split(/\s+/).length;

    return NextResponse.json({
      success: true,
      document: doc,
      fileName,
      wordCount,
      snippet: cleanContent.substring(0, 200) + (cleanContent.length > 200 ? "..." : ""),
    });
  } catch (error: any) {
    console.error("[Upload Knowledge Error]", error);
    return NextResponse.json(
      { error: error.message || "Gagal memproses dan mengekstrak dokumen." },
      { status: 500 }
    );
  }
}
