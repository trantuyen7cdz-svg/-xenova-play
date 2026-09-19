import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Missing Supabase environment variables");
}

const supabaseAdmin = createClient(
  supabaseUrl,
  serviceRoleKey
);

export async function GET() {
  try {
    // ==========================================
    // LẤY DANH MỤC
    // ==========================================

    const { data: categories, error: categoryError } =
      await supabaseAdmin
        .from("product_categories")
        .select(
          `
          id,
          name,
          description,
          image_url,
          demo_image_url,
          active,
          parent_id,
          created_at,
          updated_at
          `
        )
        .eq("active", true)
        .order("id", {
          ascending: true,
        });

    if (categoryError) {
      console.error(
        "SHOP CATALOG CATEGORY ERROR:",
        categoryError
      );

      return new NextResponse(
        JSON.stringify({
          success: false,
          error: categoryError.message,
        }),
        {
          status: 500,
          headers: {
            "Content-Type":
              "application/json; charset=utf-8",
            "Cache-Control":
              "no-store, no-cache, must-revalidate",
          },
        }
      );
    }

    // ==========================================
    // LẤY SẢN PHẨM
    // ==========================================

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
        .order("id", {
          ascending: true,
        });

    if (productError) {
      console.error(
        "SHOP CATALOG PRODUCT ERROR:",
        productError
      );

      return new NextResponse(
        JSON.stringify({
          success: false,
          error: productError.message,
        }),
        {
          status: 500,
          headers: {
            "Content-Type":
              "application/json; charset=utf-8",
            "Cache-Control":
              "no-store, no-cache, must-revalidate",
          },
        }
      );
    }

    // ==========================================
    // TẠO MAP CATEGORY
    // ==========================================

    const categoryMap = new Map();

    for (const category of categories || []) {
      categoryMap.set(
        Number(category.id),
        category
      );
    }

    // ==========================================
    // LẤY ĐƯỜNG DẪN CATEGORY
    //
    // Ví dụ:
    //
    // KEY
    //  └── ANDROID
    //
    // sẽ trả:
    //
    // [
    //   KEY,
    //   ANDROID
    // ]
    // ==========================================

    function getCategoryPath(categoryId) {
      if (
        categoryId === null ||
        categoryId === undefined
      ) {
        return [];
      }

      const result = [];

      let current = categoryMap.get(
        Number(categoryId)
      );

      let guard = 0;

      while (current && guard < 20) {
        result.unshift({
          id: current.id,
          name: current.name,
          parent_id:
            current.parent_id ?? null,
        });

        if (
          current.parent_id === null ||
          current.parent_id === undefined
        ) {
          break;
        }

        current = categoryMap.get(
          Number(current.parent_id)
        );

        guard++;
      }

      return result;
    }

    // ==========================================
    // GẮN CATEGORY VÀO PRODUCT
    // ==========================================

    const productsWithCategory =
      (products || []).map((product) => {
        const categoryPath =
          getCategoryPath(product.category_id);

        const parentCategory =
          categoryPath.length > 0
            ? categoryPath[0]
            : null;

        const childCategory =
          categoryPath.length > 1
            ? categoryPath[
                categoryPath.length - 1
              ]
            : null;

        return {
          ...product,

          category:
            categoryPath.length > 0
              ? categoryPath[
                  categoryPath.length - 1
                ]
              : null,

          category_path: categoryPath,

          parent_category:
            parentCategory,

          child_category:
            childCategory,
        };
      });

    // ==========================================
    // RESPONSE
    // ==========================================

    const responseData = {
      success: true,

      categories: categories || [],

      products: productsWithCategory,

      meta: {
        category_count:
          (categories || []).length,

        product_count:
          productsWithCategory.length,

        generated_at:
          new Date().toISOString(),
      },
    };

    return new NextResponse(
      JSON.stringify(responseData),
      {
        status: 200,

        headers: {
          "Content-Type":
            "application/json; charset=utf-8",

          "Cache-Control":
            "no-store, no-cache, must-revalidate, proxy-revalidate",

          Pragma: "no-cache",

          Expires: "0",
        },
      }
    );
  } catch (error) {
    console.error(
      "SHOP CATALOG UNEXPECTED ERROR:",
      error
    );

    return new NextResponse(
      JSON.stringify({
        success: false,
        error:
          error?.message ||
          "Không thể tải danh mục cửa hàng",
      }),
      {
        status: 500,
        headers: {
          "Content-Type":
            "application/json; charset=utf-8",

          "Cache-Control":
            "no-store",
        },
      }
    );
  }
}
