import { NextRequest, NextResponse } from "next/server";
import { parseProductCsv } from "@/lib/ecommerce/parsers/csvParser";
import { withTenantAuth } from "@/lib/apiHandler";
import { RateLimitTiers } from "@/lib/security/rateLimit";

const MAX_CSV_SIZE_BYTES = 10 * 1024 * 1024; // 10MB max CSV size

export const POST = withTenantAuth(
  async (req: NextRequest) => {
    try {
      let csvText = "";

      const contentType = req.headers.get("content-type") || "";

      if (contentType.includes("multipart/form-data")) {
        const formData = await req.formData();
        const file = formData.get("file");

        if (!file || typeof file === "string") {
          return NextResponse.json(
            { success: false, error: "No CSV file uploaded in 'file' field." },
            { status: 400 }
          );
        }

        const fileBlob = file as Blob;
        if (fileBlob.size > MAX_CSV_SIZE_BYTES) {
          return NextResponse.json(
            { success: false, error: "CSV file exceeds 10MB maximum size limit." },
            { status: 413 }
          );
        }
        csvText = await fileBlob.text();
      } else {
        const body = await req.json();
        csvText = body.csvText || "";
        if (Buffer.byteLength(csvText, "utf8") > MAX_CSV_SIZE_BYTES) {
          return NextResponse.json(
            { success: false, error: "CSV payload exceeds 10MB maximum size limit." },
            { status: 413 }
          );
        }
      }

      if (!csvText || !csvText.trim()) {
        return NextResponse.json(
          { success: false, error: "CSV content is empty." },
          { status: 400 }
        );
      }

      const result = parseProductCsv(csvText);

      if (result.products.length === 0) {
        return NextResponse.json(
          {
            success: false,
            error: "Could not parse any valid products from the CSV file.",
            warnings: result.warnings,
          },
          { status: 422 }
        );
      }

      return NextResponse.json({
        success: true,
        format: result.format,
        formatLabel: result.formatLabel,
        totalProducts: result.totalProducts,
        products: result.products,
      });
    } catch (err: unknown) {
      console.error("CSV upload processing error:", err);
      const message = err instanceof Error ? err.message : String(err);
      return NextResponse.json(
        { success: false, error: `Failed to process CSV catalog: ${message}` },
        { status: 500 }
      );
    }
  },
  { rateLimit: RateLimitTiers.UPLOADS }
);
