import { NextResponse } from "next/server";
import { supabase } from "../../../../lib/supabase";

const DEFAULT_SETTINGS = {
  id: 1,
  logo_url: "",
  shop_badge: "XENOVA PLAY SHOP",
  shop_title: "Cửa hàng",
  shop_description:
    "Chọn danh mục để xem sản phẩm và mua KEY.",
  banners: [],
};

export async function GET() {
  try {
    const { data, error } =
      await supabase
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
      settings: {
        ...DEFAULT_SETTINGS,
        ...(data || {}),
        banners: Array.isArray(
          data?.banners
        )
          ? data.banners
          : [],
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error.message ||
          "Server error",
      },
      { status: 500 }
    );
  }
}
