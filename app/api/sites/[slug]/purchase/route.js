import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import {
  getWebsiteBySlug,
  getWebsiteSession,
} from "@/lib/websiteAuth";

export const dynamic = "force-dynamic";

export async function POST(request, { params }) {
  try {
    const { slug } = await params;

    if (!slug) {
      return NextResponse.json(
        {
          ok: false,
          error: "Thiếu slug website",
        },
        { status: 400 }
      );
    }

    /*
     * 1. Lấy website theo slug
     */
    const website = await getWebsiteBySlug(slug);

    if (!website) {
      return NextResponse.json(
        {
          ok: false,
          error: "Website không tồn tại",
        },
        { status: 404 }
      );
    }

    /*
     * 2. Kiểm tra website đang hoạt động
     */
    if (website.status !== "active") {
      return NextResponse.json(
        {
          ok: false,
          error: "Website hiện không hoạt động",
        },
        { status: 403 }
      );
    }

    /*
     * 3. Lấy session website riêng
     *
     * Không dùng Supabase Auth ở đây.
     */
    const session = await getWebsiteSession(website);

    if (!session) {
      return NextResponse.json(
        {
          ok: false,
          error: "Bạn chưa đăng nhập",
        },
        { status: 401 }
      );
    }

    /*
     * 4. Đảm bảo session thuộc đúng website
     */
    if (
      session.websiteId !== website.id
    ) {
      return NextResponse.json(
        {
          ok: false,
          error: "Phiên đăng nhập không hợp lệ",
        },
        { status: 401 }
      );
    }

    /*
     * 5. Đọc dữ liệu gửi lên
     */
    let body;

    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        {
          ok: false,
          error: "Dữ liệu gửi lên không hợp lệ",
        },
        { status: 400 }
      );
    }

    const productId = Number(
      body?.product_id
    );

    const quantity = Number(
      body?.quantity || 1
    );

    /*
     * 6. Validate product
     */
    if (
      !Number.isInteger(productId) ||
      productId <= 0
    ) {
      return NextResponse.json(
        {
          ok: false,
          error: "Sản phẩm không hợp lệ",
        },
        { status: 400 }
      );
    }

    /*
     * 7. Validate quantity
     */
    if (
      !Number.isInteger(quantity) ||
      quantity < 1 ||
      quantity > 100
    ) {
      return NextResponse.json(
        {
          ok: false,
          error: "Số lượng không hợp lệ",
        },
        { status: 400 }
      );
    }

    /*
     * 8. Kiểm tra product trước khi gọi RPC
     *
     * RPC vẫn kiểm tra lại lần nữa.
     * Đây chỉ là validation để trả lỗi rõ ràng.
     */
    const {
      data: product,
      error: productError,
    } = await supabaseAdmin
      .from("website_products")
      .select(`
        id,
        website_id,
        category_id,
        name,
        description,
        price,
        duration_days,
        image_url,
        active
      `)
      .eq("id", productId)
      .eq("website_id", website.id)
      .eq("active", true)
      .maybeSingle();

    if (productError) {
      console.error(
        "PURCHASE PRODUCT LOOKUP ERROR:",
        productError
      );

      return NextResponse.json(
        {
          ok: false,
          error: "Không thể kiểm tra sản phẩm",
        },
        { status: 500 }
      );
    }

    if (!product) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Sản phẩm không tồn tại hoặc đã ngừng bán",
        },
        { status: 404 }
      );
    }

    /*
     * 9. Gọi RPC mua KEY
     *
     * user_id lấy từ session phía server.
     * Client không được tự truyền user_id.
     */
    const {
      data,
      error: purchaseError,
    } = await supabaseAdmin.rpc(
      "purchase_website_keys",
      {
        p_website_id: website.id,
        p_user_id: session.userId,
        p_product_id: productId,
        p_quantity: quantity,
      }
    );

    if (purchaseError) {
      console.error(
        "PURCHASE WEBSITE KEY RPC ERROR:",
        purchaseError
      );

      return NextResponse.json(
        {
          ok: false,
          error:
            purchaseError.message ||
            "Không thể mua KEY",
        },
        { status: 500 }
      );
    }

    /*
     * RPC luôn trả JSON.
     */
    if (!data) {
      return NextResponse.json(
        {
          ok: false,
          error: "Không nhận được kết quả mua KEY",
        },
        { status: 500 }
      );
    }

    /*
     * 10. RPC báo lỗi nghiệp vụ
     */
    if (!data.ok) {
      const statusCode =
        data.status ===
        "insufficient_balance"
          ? 400
          : data.status ===
              "out_of_stock"
            ? 409
            : data.status ===
                "product_not_found"
              ? 404
              : data.status ===
                  "invalid_quantity"
                ? 400
                : 400;

      return NextResponse.json(
        {
          ok: false,
          status: data.status,
          error:
            data.message ||
            "Không thể mua KEY",
          balance: data.balance,
          required: data.required,
          missing: data.missing,
          requested: data.requested,
          available: data.available,
        },
        { status: statusCode }
      );
    }

    /*
     * 11. Thành công
     */
    return NextResponse.json(
      {
        ok: true,
        status: data.status,

        website: {
          id: website.id,
          name: website.name,
          slug: website.slug,
        },

        order: {
          id: data.order_id,
          product_id: data.product_id,
          product_name:
            data.product_name,
          quantity: data.quantity,
          unit_price:
            data.unit_price,
          total_amount:
            data.total_amount,
          status: data.status,
        },

        keys: data.keys || [],

        key_value:
          data.key_value || "",

        wallet: {
          balance_before:
            data.balance_before,
          balance_after:
            data.balance_after,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error(
      "PURCHASE WEBSITE KEY ERROR:",
      error
    );

    return NextResponse.json(
      {
        ok: false,
        error: "Lỗi máy chủ",
      },
      { status: 500 }
    );
  }
}
