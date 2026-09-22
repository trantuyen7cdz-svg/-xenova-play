import { NextResponse } from "next/server";

import {
  createWebsiteUser,
  getWebsiteBySlug,
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
            "Website không tồn tại hoặc đang tắt.",
        },
        { status: 404 }
      );
    }

    const body =
      await request.json();

    const result =
      await createWebsiteUser({
        websiteId: website.id,
        username: body.username,
        email: body.email,
        password: body.password,
      });

    if (!result.success) {
      return NextResponse.json(
        result,
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message:
          "Đăng ký tài khoản thành công.",
        user: result.user,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error(
      "WEBSITE REGISTER ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Không thể đăng ký tài khoản.",
      },
      { status: 500 }
    );
  }
}
