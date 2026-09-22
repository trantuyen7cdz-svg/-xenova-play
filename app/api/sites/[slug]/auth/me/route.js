import { NextResponse } from "next/server";

import {
  getWebsiteBySlug,
  getWebsiteSession,
} from "@/lib/websiteAuth";

export const dynamic = "force-dynamic";

export async function GET(request, { params }) {
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

    const session =
      await getWebsiteSession(website);

    if (!session) {
      return NextResponse.json(
        {
          success: false,
          authenticated: false,
          user: null,
        },
        { status: 401 }
      );
    }

    return NextResponse.json({
      success: true,
      authenticated: true,
      user: session.user,
      expires_at: session.expiresAt,
    });
  } catch (error) {
    console.error(
      "WEBSITE ME ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        authenticated: false,
        user: null,
      },
      { status: 500 }
    );
  }
}
