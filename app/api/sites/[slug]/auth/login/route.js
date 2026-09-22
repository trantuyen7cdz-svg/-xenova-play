import { NextResponse } from "next/server";

import {
  getWebsiteBySlug,
  loginWebsiteUser,
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
      await loginWebsiteUser({
        website,
        email: body.email,
        password: body.password,
      });

    if (!result.success) {
      return NextResponse.json(
        result,
        { status: 401 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Đăng nhập thành công.",
      user: result.user,
    });
  } catch (error) {
    console.error(
      "WEBSITE LOGIN ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Không thể đăng nhập.",
      },
      { status: 500 }
    );
  }
}
