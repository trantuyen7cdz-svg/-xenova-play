import { NextResponse } from "next/server";
import { supabase } from "../../../../lib/supabase";

export async function GET() {
  try {
    const { data, error } = await supabase
      .from("shop_settings")
      .select("*")
      .eq("id", 1)
      .maybeSingle();

    if (error) {
      console.error("SHOP SETTINGS GET ERROR:", error);

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
      settings: data || {
        id: 1,
        logo_url: null,
        shop_badge: "XENOVA PLAY SHOP",
        shop_title: "Cửa hàng",
        shop_description:
          "Chọn danh mục để xem sản phẩm và mua KEY.",
        banners: [],
      },
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        success: false,
        error: error.message || "Lỗi server",
      },
      { status: 500 }
    );
  }
}
