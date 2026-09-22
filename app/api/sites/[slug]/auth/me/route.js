import { NextResponse } from "next/server";

import {
  getWebsiteBySlug,
  getWebsiteSession,
} from "@/lib/websiteAuth";

export const dynamic = "force-dynamic";

export async function GET(request, { params }) {
  try {
    const { slug } = await params;

    if (!slug) {
      return NextResponse.json(
        {
          success: false,
          message: "Thiếu slug website.",
        },
        { status: 400 }
      );
    }

    const website = await getWebsiteBySlug(slug);

    if (!website) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Website không tồn tại hoặc đang tắt.",
        },
        { status: 404 }
      );
    }

    const session = await getWebsiteSession(website);

    if (!session) {
      return NextResponse.json(
        {
          success: false,
          message: "Bạn chưa đăng nhập.",
        },
        { status: 401 }
      );
    }

    if (
      session.websiteId !== website.id ||
      session.userId !== session.user?.id
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Phiên đăng nhập không hợp lệ.",
        },
        { status: 401 }
      );
    }

    return NextResponse.json({
      success: true,
      user: {
        id: session.user.id,
        website_id: session.user.website_id,
        username: session.user.username,
        email: session.user.email,
        role: session.user.role,
        active: session.user.active,
      },
      website: {
        id: website.id,
        name: website.name,
        slug: website.slug,
      },
    });
  } catch (error) {
    console.error(
      "WEBSITE AUTH ME ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          error?.message || "Lỗi server.",
      },
      { status: 500 }
    );
  }
}
