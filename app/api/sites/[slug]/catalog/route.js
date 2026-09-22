import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function GET(request, { params }) {
  try {
    const { slug } = await params;

    if (!slug) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing website slug",
        },
        { status: 400 }
      );
    }

    // ==========================================
    // LẤY WEBSITE
    // ==========================================

    const { data: website, error: websiteError } =
      await supabaseAdmin
        .from("websites")
        .select("*")
        .eq("slug", slug)
        .eq("status", "active")
        .maybeSingle();

    if (websiteError) {
      console.error("WEBSITE ERROR:", websiteError);

      return NextResponse.json(
        {
          success: false,
          error: websiteError.message,
        },
        { status: 500 }
      );
    }

    if (!website) {
      return NextResponse.json(
        {
          success: false,
          error: "Website không tồn tại",
        },
        { status: 404 }
      );
    }

    // ==========================================
    // LẤY CATEGORY RIÊNG WEBSITE
    // ==========================================

    const {
      data: categories,
      error: categoryError,
    } = await supabaseAdmin
      .from("website_categories")
      .select("*")
      .eq("website_id", website.id)
      .eq("active", true)
      .order("id", {
        ascending: true,
      });

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

    // ==========================================
    // LẤY PRODUCT RIÊNG WEBSITE
    // ==========================================

    const {
      data: products,
      error: productError,
    } = await supabaseAdmin
      .from("website_products")
      .select("*")
      .eq("website_id", website.id)
      .eq("active", true)
      .order("id", {
        ascending: true,
      });

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

    // ==========================================
    // LẤY STOCK KEY
    //
    // KEY CÒN HÀNG:
    // - user_id IS NULL
    // - sold_at IS NULL
    // - status = available
    //
    // Nếu status trong database của mày đang dùng
    // giá trị khác, phần này sẽ cần đổi theo DB.
    // ==========================================

    const {
      data: websiteKeys,
      error: keysError,
    } = await supabaseAdmin
      .from("website_keys")
      .select(
        "id, website_id, product_id, user_id, order_id, key_code, status, sold_at"
      )
      .eq("website_id", website.id)
      .is("user_id", null)
      .is("sold_at", null)
      .eq("status", "available");

    if (keysError) {
      console.error("WEBSITE STOCK ERROR:", keysError);

      return NextResponse.json(
        {
          success: false,
          error: keysError.message,
        },
        { status: 500 }
      );
    }

    // ==========================================
    // TẠO STOCK MAP
    // ==========================================

    const stockMap = new Map();

    for (const key of websiteKeys || []) {
      const productId = Number(key.product_id);

      if (!Number.isFinite(productId)) {
        continue;
      }

      stockMap.set(
        productId,
        (stockMap.get(productId) || 0) + 1
      );
    }

    // ==========================================
    // GẮN STOCK VÀO PRODUCT
    // ==========================================

    const productsWithStock = (products || []).map(
      (product) => {
        const productId = Number(product.id);

        const stock = Number(
          stockMap.get(productId) || 0
        );

        return {
          ...product,

          stock: stock,
          stock_count: stock,
          available_stock: stock,

          in_stock: stock > 0,

          out_of_stock: stock <= 0,
        };
      }
    );

    // ==========================================
    // CATEGORY MAP
    // ==========================================

    const categoryMap = new Map();

    for (const category of categories || []) {
      categoryMap.set(
        Number(category.id),
        category
      );
    }

    // ==========================================
    // TẠO CATEGORY PATH
    // ==========================================

    function getCategoryPath(categoryId) {
      if (
        categoryId === null ||
        categoryId === undefined
      ) {
        return [];
      }

      const path = [];

      let current = categoryMap.get(
        Number(categoryId)
      );

      let guard = 0;

      while (current && guard < 20) {
        path.unshift({
          id: current.id,
          name: current.name,
          description:
            current.description || null,
          image_url:
            current.image_url || null,
          parent_id:
            current.parent_id || null,
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

      return path;
    }

    // ==========================================
    // GẮN CATEGORY VÀO PRODUCT
    // ==========================================

    const productsWithCategory =
      productsWithStock.map((product) => {
        const categoryPath =
          getCategoryPath(
            product.category_id
          );

        return {
          ...product,

          category:
            categoryPath.length > 0
              ? categoryPath[
                  categoryPath.length - 1
                ]
              : null,

          category_path:
            categoryPath,

          parent_category:
            categoryPath.length > 0
              ? categoryPath[0]
              : null,

          child_category:
            categoryPath.length > 1
              ? categoryPath[
                  categoryPath.length - 1
                ]
              : null,
        };
      });

    // ==========================================
    // CATEGORY STATS
    // ==========================================

    const categoriesWithStats =
      (categories || []).map((category) => {
        const categoryId =
          Number(category.id);

        const children =
          (categories || []).filter(
            (child) =>
              child.parent_id !== null &&
              Number(child.parent_id) ===
                categoryId
          );

        const directProducts =
          productsWithCategory.filter(
            (product) =>
              Number(product.category_id) ===
              categoryId
          );

        const childIds = new Set(
          children.map((child) =>
            Number(child.id)
          )
        );

        const childProducts =
          productsWithCategory.filter(
            (product) =>
              childIds.has(
                Number(product.category_id)
              )
          );

        const directStock =
          directProducts.reduce(
            (total, product) =>
              total +
              Number(
                product.stock_count || 0
              ),
            0
          );

        const childStock =
          childProducts.reduce(
            (total, product) =>
              total +
              Number(
                product.stock_count || 0
              ),
            0
          );

        return {
          ...category,

          children_count:
            children.length,

          direct_product_count:
            directProducts.length,

          product_count:
            directProducts.length +
            childProducts.length,

          stock_count:
            directStock + childStock,

          available_stock:
            directStock + childStock,
        };
      });

    // ==========================================
    // RESPONSE
    // ==========================================

    return NextResponse.json(
      {
        success: true,

        website: {
          id: website.id,
          name: website.name,
          slug: website.slug,
          domain: website.domain,
          logo_url: website.logo_url,
          banner_url: website.banner_url,
          theme: website.theme,

          bank_name:
            website.bank_name,

          bank_account_number:
            website.bank_account_number,

          bank_account_name:
            website.bank_account_name,

          payment_qr_url:
            website.payment_qr_url,

          description:
            website.description,

          settings:
            website.settings || {},
        },

        categories:
          categoriesWithStats,

        products:
          productsWithCategory,

        parent_categories:
          categoriesWithStats.filter(
            (category) =>
              category.parent_id === null ||
              category.parent_id ===
                undefined
          ),

        child_categories:
          categoriesWithStats.filter(
            (category) =>
              category.parent_id !== null &&
              category.parent_id !==
                undefined
          ),

        meta: {
          category_count:
            categoriesWithStats.length,

          product_count:
            productsWithCategory.length,

          total_stock:
            productsWithCategory.reduce(
              (total, product) =>
                total +
                Number(
                  product.stock_count || 0
                ),
              0
            ),

          generated_at:
            new Date().toISOString(),
        },
      },
      {
        status: 200,

        headers: {
          "Cache-Control":
            "no-store, no-cache, must-revalidate",
        },
      }
    );
  } catch (error) {
    console.error(
      "WEBSITE CATALOG ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error?.message ||
          "Không thể tải catalog website",
      },
      {
        status: 500,
      }
    );
  }
}
