import { NextResponse } from "next/server";

import {
  getWebsiteBySlug,
  logoutWebsiteUser,
} from "@/lib/websiteAuth";

export const dynamic = "force-dynamic";

export async function POST(request, { params }) {
  try {
    const { slug } = await params;

    const website =
      await getWebsiteBySlug(slug);

    if (!website) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Website không tồn tại.",
        },
        { status: 404 }
      );
    }

    await logoutWebsiteUser(website);

    return NextResponse.json({
      success: true,
      message: "Đã đăng xuất.",
    });
  } catch (error) {
    console.error(
      "WEBSITE LOGOUT ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Không thể đăng xuất.",
      },
      { status: 500 }
    );
  }
}
