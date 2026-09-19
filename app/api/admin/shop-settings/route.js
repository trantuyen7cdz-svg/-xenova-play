import { NextResponse } from "next/server";
import { supabase } from "../../../../lib/supabase";

async function checkAdmin(request) {
  const authHeader =
    request.headers.get("authorization");

  if (!authHeader?.startsWith("Bearer ")) {
    return {
      ok: false,
      status: 401,
      error: "Chưa nhận được phiên đăng nhập.",
    };
  }

  const token = authHeader
    .replace("Bearer ", "")
    .trim();

  if (!token) {
    return {
      ok: false,
      status: 401,
      error: "Token đăng nhập không hợp lệ.",
    };
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser(token);

  if (userError || !user) {
    return {
      ok: false,
      status: 401,
      error:
        "Phiên đăng nhập đã hết hạn. Hãy đăng nhập lại.",
    };
  }

  /*
   * BẢNG PROFILES CỦA BẠN CHỈ DÙNG ROLE
   * KHÔNG DÙNG is_admin
   */
  const {
    data: profile,
    error: profileError,
  } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    return {
      ok: false,
      status: 500,
      error: profileError.message,
    };
  }

  const isAdmin =
    String(profile?.role || "").toLowerCase() ===
    "admin";

  if (!isAdmin) {
    return {
      ok: false,
      status: 403,
      error: "Bạn không có quyền Admin.",
    };
  }

  return {
    ok: true,
    user,
  };
}

function normalizeBanners(banners) {
  if (!Array.isArray(banners)) {
    return [];
  }

  return banners
    .map((banner, index) => ({
      id:
        banner?.id ||
        `banner-${Date.now()}-${index}`,

      image_url: String(
        banner?.image_url || ""
      ).trim(),

      title: String(
        banner?.title || ""
      ).trim(),

      enabled:
        banner?.enabled !== false,

      order:
        Number.isFinite(
          Number(banner?.order)
        )
          ? Number(banner.order)
          : index,
    }))
    .filter(
      (banner) => banner.image_url
    )
    .sort(
      (a, b) =>
        Number(a.order) -
        Number(b.order)
    )
    .map((banner, index) => ({
      ...banner,
      order: index,
    }));
}

export async function GET(request) {
  const auth =
    await checkAdmin(request);

  if (!auth.ok) {
    return NextResponse.json(
      {
        success: false,
        error: auth.error,
      },
      { status: auth.status }
    );
  }

  const {
    data,
    error,
  } = await supabase
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
    settings:
      data || {
        id: 1,
        logo_url: "",
        shop_badge: "",
        shop_title: "",
        shop_description: "",
        banners: [],
      },
  });
}

export async function PUT(request) {
  const auth =
    await checkAdmin(request);

  if (!auth.ok) {
    return NextResponse.json(
      {
        success: false,
        error: auth.error,
      },
      { status: auth.status }
    );
  }

  try {
    const body =
      await request.json();

    const banners =
      normalizeBanners(
        body?.banners
      );

    const {
      data,
      error,
    } = await supabase
      .from("shop_settings")
      .upsert(
        {
          id: 1,

          /*
           * Không còn sử dụng
           * badge/title/description
           */
          logo_url: String(
            body?.logo_url || ""
          ).trim(),

          shop_badge: "",

          shop_title: "",

          shop_description: "",

          banners,

          updated_at:
            new Date().toISOString(),
        },
        {
          onConflict: "id",
        }
      )
      .select()
      .single();

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
        error:
          error?.message ||
          "Không thể lưu cài đặt.",
      },
      { status: 500 }
    );
  }
}
