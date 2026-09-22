import { NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabaseAdmin";

import {
  getWebsiteBySlug,
  getWebsiteSession,
} from "@/lib/websiteAuth";

export const dynamic = "force-dynamic";

/*
=========================================
GET /api/sites/[slug]/keys

Kho KEY RIÊNG của từng website.

Không dùng:
  - Supabase Auth
  - bảng keys cũ
  - auth.uid()

Dùng:
  - website_users
  - website_sessions
  - website_keys
  - website_products
=========================================
*/

export async function GET(
  request,
  { params }
) {
  try {
    const slug = params?.slug;

    if (!slug) {
      return NextResponse.json(
        {
          success: false,
          error: "Thiếu slug website.",
        },
        {
          status: 400,
        }
      );
    }

    /*
    =========================================
    1. TÌM WEBSITE
    =========================================
    */

    const website =
      await getWebsiteBySlug(slug);

    if (!website) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Website không tồn tại hoặc đã bị tắt.",
        },
        {
          status: 404,
        }
      );
    }

    /*
    =========================================
    2. KIỂM TRA SESSION
    =========================================
    */

    const session =
      await getWebsiteSession(website);

    if (!session?.user) {
      return NextResponse.json(
        {
          success: false,
          error: "Bạn chưa đăng nhập.",
        },
        {
          status: 401,
        }
      );
    }

    /*
    =========================================
    3. LẤY KEY CỦA ĐÚNG WEBSITE + USER
    =========================================

    Đây là phần quan trọng.

    Ví dụ:

    Shop A:
      website_id = A
      user_id = 123

    Shop B:
      website_id = B
      user_id = 123

    Hai kho KEY hoàn toàn tách nhau.
    */

    const {
      data: keyRows,
      error: keyError,
    } = await supabaseAdmin
      .from("website_keys")
      .select(
        `
        id,
        website_id,
        product_id,
        user_id,
        order_id,
        key_code,
        status,
        expires_at,
        sold_at,
        created_at
        `
      )
      .eq(
        "website_id",
        website.id
      )
      .eq(
        "user_id",
        session.user.id
      )
      .order(
        "created_at",
        {
          ascending: false,
        }
      );

    if (keyError) {
      console.error(
        "WEBSITE KEYS QUERY ERROR:",
        keyError
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "Không thể tải kho KEY.",
          details:
            keyError.message,
        },
        {
          status: 500,
        }
      );
    }

    const rows =
      Array.isArray(keyRows)
        ? keyRows
        : [];

    /*
    =========================================
    4. LẤY THÔNG TIN SẢN PHẨM
    =========================================

    Không dùng relation của Supabase
    để tránh phụ thuộc tên foreign-key
    trong database.
    */

    const productIds = [
      ...new Set(
        rows
          .map(
            (item) =>
              item.product_id
          )
          .filter(
            (id) =>
              id !== null &&
              id !== undefined
          )
      ),
    ];

    let productMap = {};

    if (productIds.length > 0) {
      const {
        data: products,
        error: productError,
      } = await supabaseAdmin
        .from("website_products")
        .select(
          `
          id,
          name,
          image_url,
          duration_days
          `
        )
        .eq(
          "website_id",
          website.id
        )
        .in(
          "id",
          productIds
        );

      if (productError) {
        console.error(
          "WEBSITE PRODUCTS QUERY ERROR:",
          productError
        );
      } else {
        productMap =
          Object.fromEntries(
            (products || []).map(
              (product) => [
                String(product.id),
                product,
              ]
            )
          );
      }
    }

    /*
    =========================================
    5. FORMAT DỮ LIỆU TRẢ VỀ
    =========================================
    */

    const keys = rows.map(
      (item) => {
        const product =
          productMap[
            String(
              item.product_id
            )
          ] || null;

        return {
          id: item.id,

          website_id:
            item.website_id,

          product_id:
            item.product_id,

          user_id:
            item.user_id,

          order_id:
            item.order_id,

          key_code:
            item.key_code,

          status:
            item.status,

          expires_at:
            item.expires_at,

          sold_at:
            item.sold_at,

          created_at:
            item.created_at,

          product_name:
            product?.name ||
            "Sản phẩm",

          product: product
            ? {
                id: product.id,

                name:
                  product.name,

                image_url:
                  product.image_url,

                duration_days:
                  product.duration_days,
              }
            : null,
        };
      }
    );

    /*
    =========================================
    6. RESPONSE
    =========================================
    */

    return NextResponse.json(
      {
        success: true,

        website: {
          id: website.id,
          name: website.name,
          slug: website.slug,
        },

        user: {
          id: session.user.id,
          username:
            session.user.username,
          email:
            session.user.email,
        },

        keys,

        count: keys.length,
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
      "WEBSITE KEYS API ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error?.message ||
          "Lỗi máy chủ.",
      },
      {
        status: 500,
      }
    );
  }
}
