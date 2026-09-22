import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}

function getAccessToken(request) {
  const auth = request.headers.get("authorization") || "";

  if (!auth.toLowerCase().startsWith("bearer ")) {
    return null;
  }

  return auth.slice(7).trim();
}

async function getWebsiteAndAdmin(request, slug) {
  const token = getAccessToken(request);

  if (!token) {
    return {
      error: "UNAUTHORIZED",
      status: 401,
    };
  }

  const supabaseAdmin = getSupabaseAdmin();

  // Xác thực user bằng access token
  const {
    data: { user },
    error: userError,
  } = await supabaseAdmin.auth.getUser(token);

  if (userError || !user) {
    return {
      error: "UNAUTHORIZED",
      status: 401,
    };
  }

  // Lấy website theo slug
  const { data: website, error: websiteError } = await supabaseAdmin
    .from("websites")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();

  if (websiteError) {
    console.error("Website lookup error:", websiteError);

    return {
      error: "Không thể tải website",
      status: 500,
    };
  }

  if (!website) {
    return {
      error: "Website không tồn tại",
      status: 404,
    };
  }

  // Kiểm tra user có phải admin của ĐÚNG website này hay không
  const { data: websiteAdmin, error: adminError } = await supabaseAdmin
    .from("website_admins")
    .select("id, website_id, user_id, email, role, active")
    .eq("website_id", website.id)
    .eq("user_id", user.id)
    .eq("active", true)
    .maybeSingle();

  if (adminError) {
    console.error("Website admin lookup error:", adminError);

    return {
      error: "Không thể kiểm tra quyền quản trị",
      status: 500,
    };
  }

  if (!websiteAdmin) {
    return {
      error: "Bạn không có quyền quản trị website này",
      status: 403,
    };
  }

  return {
    supabaseAdmin,
    user,
    website,
    websiteAdmin,
  };
}

/* =========================================================
   GET
   Danh sách đơn hàng của RIÊNG website hiện tại
   ========================================================= */
export async function GET(request, { params }) {
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

    const auth = await getWebsiteAndAdmin(request, slug);

    if (auth.error) {
      return NextResponse.json(
        {
          ok: false,
          error: auth.error,
        },
        { status: auth.status }
      );
    }

    const { supabaseAdmin, website } = auth;

    const { searchParams } = new URL(request.url);

    const status = searchParams.get("status");
    const search = searchParams.get("search");
    const limitParam = Number(searchParams.get("limit") || 100);

    const limit = Math.min(
      Math.max(Number.isFinite(limitParam) ? limitParam : 100, 1),
      500
    );

    // QUAN TRỌNG:
    // Luôn bắt buộc website_id = website.id
    let query = supabaseAdmin
      .from("website_orders")
      .select("*")
      .eq("website_id", website.id)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (status && status !== "all") {
      query = query.eq("status", status);
    }

    if (search) {
      const safeSearch = search
        .trim()
        .replace(/[%(),]/g, " ");

      if (safeSearch) {
        query = query.or(
          `customer_name.ilike.%${safeSearch}%,customer_email.ilike.%${safeSearch}%,customer_phone.ilike.%${safeSearch}%,product_name.ilike.%${safeSearch}%,note.ilike.%${safeSearch}%`
        );
      }
    }

    const { data: orders, error } = await query;

    if (error) {
      console.error("Get website orders error:", error);

      return NextResponse.json(
        {
          ok: false,
          error: error.message || "Không thể tải đơn hàng",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      website: {
        id: website.id,
        name: website.name,
        slug: website.slug,
      },
      orders: orders || [],
    });
  } catch (error) {
    console.error("GET admin website orders error:", error);

    return NextResponse.json(
      {
        ok: false,
        error: "Lỗi máy chủ",
      },
      { status: 500 }
    );
  }
}

/* =========================================================
   PATCH
   Sửa đơn hàng của RIÊNG website hiện tại
   ========================================================= */
export async function PATCH(request, { params }) {
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

    const auth = await getWebsiteAndAdmin(request, slug);

    if (auth.error) {
      return NextResponse.json(
        {
          ok: false,
          error: auth.error,
        },
        { status: auth.status }
      );
    }

    const { supabaseAdmin, website } = auth;

    let body;

    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        {
          ok: false,
          error: "Dữ liệu JSON không hợp lệ",
        },
        { status: 400 }
      );
    }

    const orderId = body?.id;

    if (!orderId) {
      return NextResponse.json(
        {
          ok: false,
          error: "Thiếu ID đơn hàng",
        },
        { status: 400 }
      );
    }

    /*
     * Được phép cập nhật:
     * - status
     * - key_value
     * - note
     * - customer_name
     * - customer_email
     * - customer_phone
     */

    const updates = {};

    if (body.status !== undefined) {
      const allowedStatuses = [
        "pending",
        "paid",
        "processing",
        "completed",
        "cancelled",
        "refunded",
      ];

      if (!allowedStatuses.includes(body.status)) {
        return NextResponse.json(
          {
            ok: false,
            error: "Trạng thái đơn hàng không hợp lệ",
          },
          { status: 400 }
        );
      }

      updates.status = body.status;
    }

    if (body.key_value !== undefined) {
      updates.key_value =
        body.key_value === null
          ? null
          : String(body.key_value).trim();
    }

    if (body.note !== undefined) {
      updates.note =
        body.note === null
          ? null
          : String(body.note);
    }

    if (body.customer_name !== undefined) {
      updates.customer_name =
        body.customer_name === null
          ? null
          : String(body.customer_name).trim();
    }

    if (body.customer_email !== undefined) {
      updates.customer_email =
        body.customer_email === null
          ? null
          : String(body.customer_email).trim();
    }

    if (body.customer_phone !== undefined) {
      updates.customer_phone =
        body.customer_phone === null
          ? null
          : String(body.customer_phone).trim();
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        {
          ok: false,
          error: "Không có dữ liệu cần cập nhật",
        },
        { status: 400 }
      );
    }

    /*
     * QUAN TRỌNG:
     * Update chỉ được phép khi:
     * order.id = orderId
     * VÀ
     * order.website_id = website.id
     *
     * Vì vậy Admin A không thể lấy ID đơn của Website B
     * rồi PATCH nó.
     */
    const { data: updatedOrder, error: updateError } =
      await supabaseAdmin
        .from("website_orders")
        .update(updates)
        .eq("id", orderId)
        .eq("website_id", website.id)
        .select("*")
        .maybeSingle();

    if (updateError) {
      console.error("Update website order error:", updateError);

      return NextResponse.json(
        {
          ok: false,
          error: updateError.message || "Không thể cập nhật đơn hàng",
        },
        { status: 500 }
      );
    }

    if (!updatedOrder) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Không tìm thấy đơn hàng hoặc đơn hàng không thuộc website này",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      ok: true,
      message: "Đã cập nhật đơn hàng",
      order: updatedOrder,
    });
  } catch (error) {
    console.error("PATCH admin website order error:", error);

    return NextResponse.json(
      {
        ok: false,
        error: "Lỗi máy chủ",
      },
      { status: 500 }
    );
  }
}

/* =========================================================
   DELETE
   Xóa đơn hàng của RIÊNG website hiện tại
   ========================================================= */
export async function DELETE(request, { params }) {
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

    const auth = await getWebsiteAndAdmin(request, slug);

    if (auth.error) {
      return NextResponse.json(
        {
          ok: false,
          error: auth.error,
        },
        { status: auth.status }
      );
    }

    const { supabaseAdmin, website } = auth;

    let body = {};

    try {
      body = await request.json();
    } catch {
      // Cho phép DELETE bằng query ?id=
    }

    const requestUrl = new URL(request.url);

    const orderId =
      body?.id ||
      requestUrl.searchParams.get("id");

    if (!orderId) {
      return NextResponse.json(
        {
          ok: false,
          error: "Thiếu ID đơn hàng",
        },
        { status: 400 }
      );
    }

    /*
     * QUAN TRỌNG:
     * Chỉ xóa khi đơn hàng thuộc ĐÚNG website hiện tại.
     */
    const { data: deletedOrder, error: deleteError } =
      await supabaseAdmin
        .from("website_orders")
        .delete()
        .eq("id", orderId)
        .eq("website_id", website.id)
        .select("*")
        .maybeSingle();

    if (deleteError) {
      console.error("Delete website order error:", deleteError);

      return NextResponse.json(
        {
          ok: false,
          error: deleteError.message || "Không thể xóa đơn hàng",
        },
        { status: 500 }
      );
    }

    if (!deletedOrder) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Không tìm thấy đơn hàng hoặc đơn hàng không thuộc website này",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      ok: true,
      message: "Đã xóa đơn hàng",
      order: deletedOrder,
    });
  } catch (error) {
    console.error("DELETE admin website order error:", error);

    return NextResponse.json(
      {
        ok: false,
        error: "Lỗi máy chủ",
      },
      { status: 500 }
    );
  }
}
