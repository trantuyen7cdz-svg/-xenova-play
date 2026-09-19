import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/*
==================================================
SỬA LỖI TIẾNG VIỆT BỊ KIỂU:

PHáº¦N Má»€M
CÃ¡c loáº¡i KEY
KEY 1 NGÃ€Y

THÀNH:

PHẦN MỀM
Các loại KEY
KEY 1 NGÀY
==================================================
*/

function fixVietnamese(value) {
  if (typeof value !== "string") {
    return value;
  }

  // Chỉ sửa khi chuỗi có dấu hiệu bị mojibake
  const looksBroken =
    value.includes("Ã") ||
    value.includes("Â") ||
    value.includes("áº") ||
    value.includes("á»") ||
    value.includes("á»") ||
    value.includes("â") ||
    value.includes("Ä") ||
    value.includes("Å") ||
    value.includes("Æ") ||
    value.includes("ð");

  if (!looksBroken) {
    return value;
  }

  try {
    const fixed = Buffer
      .from(value, "latin1")
      .toString("utf8");

    // Chỉ dùng kết quả nếu nó hợp lệ
    if (
      fixed &&
      !fixed.includes("�") &&
      fixed !== value
    ) {
      return fixed;
    }
  } catch (error) {
    console.error("FIX UTF8 ERROR:", error);
  }

  return value;
}

/*
==================================================
SỬA TOÀN BỘ OBJECT ĐỆ QUY
==================================================
*/

function fixObject(value) {
  if (typeof value === "string") {
    return fixVietnamese(value);
  }

  if (Array.isArray(value)) {
    return value.map((item) =>
      fixObject(item)
    );
  }

  if (
    value &&
    typeof value === "object"
  ) {
    const result = {};

    for (const [key, item] of Object.entries(value)) {
      result[key] = fixObject(item);
    }

    return result;
  }

  return value;
}

/*
==================================================
GET
==================================================
*/

export async function GET() {
  try {
    /*
    ==============================================
    CATEGORY
    ==============================================
    */

    const {
      data: categories,
      error: categoryError,
    } = await supabaseAdmin
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
        "CATEGORY ERROR:",
        categoryError
      );

      return NextResponse.json(
        {
          success: false,
          error: categoryError.message,
        },
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

    /*
    ==============================================
    PRODUCTS
    ==============================================
    */

    const {
      data: products,
      error: productError,
    } = await supabaseAdmin
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
        "PRODUCT ERROR:",
        productError
      );

      return NextResponse.json(
        {
          success: false,
          error: productError.message,
        },
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

    /*
    ==============================================
    CATEGORY MAP
    ==============================================
    */

    const categoryMap = new Map();

    for (const category of categories || []) {
      categoryMap.set(
        Number(category.id),
        category
      );
    }

    /*
    ==============================================
    CATEGORY PATH

    Ví dụ:

    KEY
    └── ANDROID

    =>

    [
      KEY,
      ANDROID
    ]
    ==============================================
    */

    function getCategoryPath(categoryId) {
      if (
        categoryId === null ||
        categoryId === undefined
      ) {
        return [];
      }

      const path = [];

      let current =
        categoryMap.get(
          Number(categoryId)
        );

      let guard = 0;

      while (
        current &&
        guard < 20
      ) {
        path.unshift({
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

        current =
          categoryMap.get(
            Number(current.parent_id)
          );

        guard++;
      }

      return path;
    }

    /*
    ==============================================
    GẮN CATEGORY VÀO PRODUCT
    ==============================================
    */

    const productsWithCategory =
      (products || []).map(
        (product) => {
          const categoryPath =
            getCategoryPath(
              product.category_id
            );

          return {
            ...product,

            category:
              categoryPath.length
                ? categoryPath[
                    categoryPath.length - 1
                  ]
                : null,

            category_path:
              categoryPath,

            parent_category:
              categoryPath.length
                ? categoryPath[0]
                : null,

            child_category:
              categoryPath.length > 1
                ? categoryPath[
                    categoryPath.length - 1
                  ]
                : null,
          };
        }
      );

    /*
    ==============================================
    RESPONSE
    ==============================================
    */

    const responseData = {
      success: true,

      categories:
        categories || [],

      products:
        productsWithCategory,

      meta: {
        category_count:
          (categories || []).length,

        product_count:
          productsWithCategory.length,

        generated_at:
          new Date().toISOString(),
      },
    };

    /*
    ==============================================
    QUAN TRỌNG:
    SỬA MOJIBAKE NGAY TRƯỚC KHI TRẢ JSON
    ==============================================
    */

    const fixedResponse =
      fixObject(responseData);

    return new NextResponse(
      JSON.stringify(fixedResponse),
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
      "SHOP CATALOG ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error?.message ||
          "Không thể tải catalog",
      },
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
