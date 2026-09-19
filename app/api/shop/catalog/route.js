import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function GET() {
  try {
    // =========================
    // LẤY DANH MỤC
    // =========================
    const { data: categories, error: categoryError } =
      await supabaseAdmin
        .from("product_categories")
        .select(`
          id,
          name,
          description,
          image_url,
          demo_image_url,
          active,
          parent_id
        `)
        .order("id", { ascending: true });

    if (categoryError) {
      console.error("CATEGORY ERROR:", categoryError);

      return NextResponse.json(
        {
          success: false,
          error: categoryError.message,
        },
        { status: 500 }
      );
    }

    // =========================
    // LẤY SẢN PHẨM
    // =========================
    const { data: products, error: productError } =
      await supabaseAdmin
        .from("products")
        .select(`
          id,
          name,
          description,
          price,
          duration_days,
          active,
          is_active,
          demo_image_url,
          category_id,
          media_type,
          video_url
        `)
        .eq("active", true)
        .eq("is_active", true)
        .order("id", { ascending: true });

    if (productError) {
      console.error("PRODUCT ERROR:", productError);

      return NextResponse.json(
        {
          success: false,
          error: productError.message,
        },
        { status: 500 }
      );
    }

    // =========================
    // TRẢ VỀ CATALOG
    // =========================
    return NextResponse.json({
      success: true,

      categories: categories || [],

      products: products || [],
    });
  } catch (error) {
    console.error("CATALOG API ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        error: error?.message || "Catalog error",
      },
      { status: 500 }
    );
  }
}
