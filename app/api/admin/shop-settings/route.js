import { NextResponse } from "next/server";
import { supabase } from "../../../../lib/supabase";

async function getCurrentUser() {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return null;
  }

  return user;
}

async function isAdmin(user) {
  if (!user) return false;

  /*
   * Hỗ trợ nhiều kiểu hệ thống Admin đang có.
   *
   * Nếu profiles có role = admin thì dùng role.
   */

  const { data: profile } = await supabase
    .from("profiles")
    .select("role,is_admin")
    .eq("id", user.id)
    .maybeSingle();

  if (
    profile?.role === "admin" ||
    profile?.role === "ADMIN" ||
    profile?.is_admin === true
  ) {
    return true;
  }

  /*
   * Nếu project của bạn đang xác định Admin
   * bằng email, thêm email Admin vào đây.
   *
   * Ví dụ:
   *
   * const ADMIN_EMAILS = [
   *   "email-cua-ban@gmail.com"
   * ];
   *
   * return ADMIN_EMAILS.includes(
   *   user.email?.toLowerCase()
   * );
   */

  return false;
}

export async function GET() {
  try {
    const user = await getCurrentUser();

    if (!(await isAdmin(user))) {
      return NextResponse.json(
        {
          success: false,
          error: "Không có quyền Admin.",
        },
        { status: 403 }
      );
    }

    const { data, error } = await supabase
      .from("shop_settings")
      .select("*")
      .eq("id", 1)
      .maybeSingle();

    if (error) {
      return NextResponse.json(
        {
          success: false,
          error: error.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      settings: data,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Lỗi server",
      },
      { status: 500 }
    );
  }
}

export async function PUT(request) {
  try {
    const user = await getCurrentUser();

    if (!(await isAdmin(user))) {
      return NextResponse.json(
        {
          success: false,
          error: "Không có quyền Admin.",
        },
        { status: 403 }
      );
    }

    const body = await request.json();

    const logo_url =
      typeof body.logo_url === "string"
        ? body.logo_url.trim()
        : null;

    const shop_badge =
      typeof body.shop_badge === "string"
        ? body.shop_badge.trim()
        : "XENOVA PLAY SHOP";

    const shop_title =
      typeof body.shop_title === "string"
        ? body.shop_title.trim()
        : "Cửa hàng";

    const shop_description =
      typeof body.shop_description === "string"
        ? body.shop_description.trim()
        : "Chọn danh mục để xem sản phẩm và mua KEY.";

    let banners = [];

    if (Array.isArray(body.banners)) {
      banners = body.banners
        .filter(
          (item) =>
            item &&
            typeof item.image_url === "string" &&
            item.image_url.trim()
        )
        .map((item, index) => ({
          id:
            item.id ||
            `banner-${Date.now()}-${index}`,

          image_url: item.image_url.trim(),

          title:
            typeof item.title === "string"
              ? item.title.trim()
              : "",

          enabled:
            item.enabled !== false,

          order:
            Number.isFinite(Number(item.order))
              ? Number(item.order)
              : index,
        }))
        .sort((a, b) => a.order - b.order);
    }

    const { data, error } = await supabase
      .from("shop_settings")
      .upsert(
        {
          id: 1,
          logo_url: logo_url || null,
          shop_badge,
          shop_title,
          shop_description,
          banners,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "id",
        }
      )
      .select("*")
      .single();

    if (error) {
      console.error(
        "SHOP SETTINGS SAVE ERROR:",
        error
      );

      return NextResponse.json(
        {
          success: false,
          error: error.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      settings: data,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        success: false,
        error: error.message || "Không thể lưu",
      },
      { status: 500 }
    );
  }
}
