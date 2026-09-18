import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from("keys")
      .select("product_id,status")
      .not("product_id", "is", null);

    if (error) {
      console.error("STOCK LOAD ERROR:", error);

      return NextResponse.json(
        {
          success: false,
          message: "Không thể tải tồn kho.",
        },
        { status: 500 }
      );
    }

    const stock = {};

    for (const row of data || []) {
      if (row.status !== "available") continue;

      const productId = String(row.product_id);

      stock[productId] =
        Number(stock[productId] || 0) + 1;
    }

    return NextResponse.json({
      success: true,
      stock,
    });
  } catch (error) {
    console.error("STOCK API ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Lỗi server.",
      },
      { status: 500 }
    );
  }
}
