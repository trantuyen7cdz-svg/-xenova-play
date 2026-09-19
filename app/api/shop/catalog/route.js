import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function GET() {
  try {
    const { data: categories, error: categoryError } =
      await supabaseAdmin
        .from("product_categories")
        .select(
          "id,name,description,image_url,demo_image_url,active,parent_id,created_at,updated_at"
        )
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

    const { data: products, error: productError } =
      await supabaseAdmin
        .from("products")
        .select(
          `
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
          video_url,
          created_at
        `
        )
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

    /*
      Tạo thêm thông tin đường dẫn danh mục:

      KEY
        └── ANDROID

      ACC GAME
        └── FREE FIRE

      để frontend không phải tự truy vấn lại database.
    */

    const categoryMap = new Map();

    for (const category of categories || []) {
      categoryMap.set(Number(category.id), category);
    }

    function getCategoryPath(categoryId) {
      if (!categoryId) return [];

      const result = [];
      let current = categoryMap.get(Number(categoryId));

      let guard = 0;

      while (current && guard < 20) {
        result.unshift({
          id: current.id,
          name: current.name,
          parent_id: current.parent_id ?? null,
        });

        if (!current.parent_id) break;

        current = categoryMap.get(Number(current.parent_id));
        guard++;
      }

      return result;
    }

    const productsWithCategory = (products || []).map((product) => {
      const categoryPath = getCategoryPath(product.category_id);

      return {
        ...product,

        category: categoryPath.length
          ? categoryPath[categoryPath.length - 1]
          : null,

        category_path: categoryPath,

        parent_category:
          categoryPath.length > 0 ? categoryPath[0] : null,

        child_category:
          categoryPath.length > 1
            ? categoryPath[categoryPath.length - 1]
            : null,
      };
    });

    return NextResponse.json({
      success: true,

      categories: categories || [],

      products: productsWithCategory,
    });
  } catch (error) {
    console.error("CATALOG API ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        error: error?.message || "Lỗi server",
      },
      { status: 500 }
    );
  }
}
