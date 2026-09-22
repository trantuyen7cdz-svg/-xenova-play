import { cookies } from "next/headers";
import {
  createHash,
  randomBytes,
  scryptSync,
  timingSafeEqual,
} from "crypto";

import { supabaseAdmin } from "./supabaseAdmin";

const SESSION_DAYS = 30;
const PASSWORD_KEYLEN = 64;

function getCookieName(websiteId) {
  return `website_session_${websiteId}`;
}

function hashToken(token) {
  return createHash("sha256")
    .update(token)
    .digest("hex");
}

function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");

  const derived = scryptSync(
    password,
    salt,
    PASSWORD_KEYLEN
  ).toString("hex");

  return `scrypt:v1:${salt}:${derived}`;
}

function verifyPassword(password, storedHash) {
  try {
    const parts = storedHash.split(":");

    if (parts.length !== 4) {
      return false;
    }

    const [
      algorithm,
      version,
      salt,
      storedDerived,
    ] = parts;

    if (
      algorithm !== "scrypt" ||
      version !== "v1" ||
      !salt ||
      !storedDerived
    ) {
      return false;
    }

    const derived = scryptSync(
      password,
      salt,
      PASSWORD_KEYLEN
    ).toString("hex");

    const a = Buffer.from(
      derived,
      "hex"
    );

    const b = Buffer.from(
      storedDerived,
      "hex"
    );

    if (a.length !== b.length) {
      return false;
    }

    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export async function getWebsiteBySlug(slug) {
  if (!slug) {
    return null;
  }

  const { data, error } =
    await supabaseAdmin
      .from("websites")
      .select(
        `
          id,
          name,
          slug,
          status,
          logo_url,
          banner_url,
          theme,
          description,
          settings,
          bank_name,
          bank_account_number,
          bank_account_name,
          payment_qr_url
        `
      )
      .eq("slug", slug)
      .eq("status", "active")
      .maybeSingle();

  if (error) {
    console.error(
      "GET WEBSITE ERROR:",
      error
    );

    return null;
  }

  return data || null;
}

export async function createWebsiteUser({
  websiteId,
  username,
  email,
  password,
}) {
  const cleanUsername =
    String(username || "").trim();

  const cleanEmail =
    String(email || "")
      .trim()
      .toLowerCase();

  if (!websiteId) {
    return {
      success: false,
      message: "Website không hợp lệ.",
    };
  }

  if (
    cleanUsername.length < 3 ||
    cleanUsername.length > 40
  ) {
    return {
      success: false,
      message:
        "Tên tài khoản phải từ 3 đến 40 ký tự.",
    };
  }

  if (
    !cleanEmail ||
    !cleanEmail.includes("@")
  ) {
    return {
      success: false,
      message: "Email không hợp lệ.",
    };
  }

  if (
    typeof password !== "string" ||
    password.length < 6
  ) {
    return {
      success: false,
      message:
        "Mật khẩu phải có ít nhất 6 ký tự.",
    };
  }

  const {
    data: emailExists,
    error: emailError,
  } = await supabaseAdmin
    .from("website_users")
    .select("id")
    .eq("website_id", websiteId)
    .ilike("email", cleanEmail)
    .maybeSingle();

  if (emailError) {
    console.error(
      "CHECK WEBSITE EMAIL ERROR:",
      emailError
    );

    return {
      success: false,
      message:
        "Không thể kiểm tra email.",
    };
  }

  if (emailExists) {
    return {
      success: false,
      message:
        "Email này đã được đăng ký trên website.",
    };
  }

  const {
    data: usernameExists,
    error: usernameError,
  } = await supabaseAdmin
    .from("website_users")
    .select("id")
    .eq("website_id", websiteId)
    .ilike("username", cleanUsername)
    .maybeSingle();

  if (usernameError) {
    console.error(
      "CHECK WEBSITE USERNAME ERROR:",
      usernameError
    );

    return {
      success: false,
      message:
        "Không thể kiểm tra tên tài khoản.",
    };
  }

  if (usernameExists) {
    return {
      success: false,
      message:
        "Tên tài khoản này đã được sử dụng.",
    };
  }

  const passwordHash =
    hashPassword(password);

  const {
    data: user,
    error,
  } = await supabaseAdmin
    .from("website_users")
    .insert({
      website_id: websiteId,
      username: cleanUsername,
      email: cleanEmail,
      password_hash: passwordHash,
      role: "user",
      active: true,
    })
    .select(
      "id, website_id, username, email, role, active, created_at"
    )
    .single();

  if (error) {
    console.error(
      "CREATE WEBSITE USER ERROR:",
      error
    );

    if (error.code === "23505") {
      return {
        success: false,
        message:
          "Email hoặc tên tài khoản đã tồn tại.",
      };
    }

    return {
      success: false,
      message:
        "Không thể tạo tài khoản.",
    };
  }

  return {
    success: true,
    user,
  };
}

export async function loginWebsiteUser({
  website,
  email,
  password,
}) {
  const cleanEmail =
    String(email || "")
      .trim()
      .toLowerCase();

  if (!website?.id) {
    return {
      success: false,
      message:
        "Website không hợp lệ.",
    };
  }

  if (!cleanEmail || !password) {
    return {
      success: false,
      message:
        "Vui lòng nhập đầy đủ thông tin.",
    };
  }

  const {
    data: user,
    error,
  } = await supabaseAdmin
    .from("website_users")
    .select(
      "id, website_id, username, email, password_hash, role, active"
    )
    .eq("website_id", website.id)
    .ilike("email", cleanEmail)
    .maybeSingle();

  if (error) {
    console.error(
      "WEBSITE LOGIN QUERY ERROR:",
      error
    );

    return {
      success: false,
      message:
        "Không thể đăng nhập.",
    };
  }

  if (!user) {
    return {
      success: false,
      message:
        "Email hoặc mật khẩu không đúng.",
    };
  }

  if (!user.active) {
    return {
      success: false,
      message:
        "Tài khoản đã bị khóa.",
    };
  }

  if (
    !verifyPassword(
      password,
      user.password_hash
    )
  ) {
    return {
      success: false,
      message:
        "Email hoặc mật khẩu không đúng.",
    };
  }

  const rawToken =
    randomBytes(32).toString("base64url");

  const tokenHash =
    hashToken(rawToken);

  const expiresAt =
    new Date(
      Date.now() +
        SESSION_DAYS *
          24 *
          60 *
          60 *
          1000
    ).toISOString();

  const {
    error: sessionError,
  } = await supabaseAdmin
    .from("website_sessions")
    .insert({
      session_token_hash: tokenHash,
      website_id: website.id,
      user_id: user.id,
      expires_at: expiresAt,
    });

  if (sessionError) {
    console.error(
      "CREATE WEBSITE SESSION ERROR:",
      sessionError
    );

    return {
      success: false,
      message:
        "Không thể tạo phiên đăng nhập.",
    };
  }

  const cookieStore = await cookies();

  cookieStore.set({
    name: getCookieName(website.id),
    value: rawToken,
    httpOnly: true,
    secure:
      process.env.NODE_ENV ===
      "production",
    sameSite: "lax",
    path: `/sites/${website.slug}`,
    expires: new Date(expiresAt),
  });

  return {
    success: true,
    user: {
      id: user.id,
      website_id: user.website_id,
      username: user.username,
      email: user.email,
      role: user.role,
    },
  };
}

export async function getWebsiteSession(
  website
) {
  if (!website?.id) {
    return null;
  }

  const cookieStore =
    await cookies();

  const cookie =
    cookieStore.get(
      getCookieName(website.id)
    );

  if (!cookie?.value) {
    return null;
  }

  const tokenHash =
    hashToken(cookie.value);

  const {
    data: session,
    error,
  } = await supabaseAdmin
    .from("website_sessions")
    .select(
      `
        id,
        website_id,
        user_id,
        expires_at,
        website_users (
          id,
          website_id,
          username,
          email,
          role,
          active
        )
      `
    )
    .eq(
      "session_token_hash",
      tokenHash
    )
    .eq(
      "website_id",
      website.id
    )
    .maybeSingle();

  if (error || !session) {
    return null;
  }

  if (
    new Date(session.expires_at)
      .getTime() <= Date.now()
  ) {
    await supabaseAdmin
      .from("website_sessions")
      .delete()
      .eq(
        "id",
        session.id
      );

    return null;
  }

  const user =
    Array.isArray(
      session.website_users
    )
      ? session.website_users[0]
      : session.website_users;

  if (!user) {
    return null;
  }

  if (
    user.website_id !== website.id ||
    !user.active
  ) {
    return null;
  }

  return {
    sessionId: session.id,
    websiteId: session.website_id,
    userId: session.user_id,
    expiresAt: session.expires_at,
    user,
  };
}

export async function logoutWebsiteUser(
  website
) {
  if (!website?.id) {
    return;
  }

  const cookieStore =
    await cookies();

  const cookie =
    cookieStore.get(
      getCookieName(website.id)
    );

  if (cookie?.value) {
    const tokenHash =
      hashToken(cookie.value);

    await supabaseAdmin
      .from("website_sessions")
      .delete()
      .eq(
        "session_token_hash",
        tokenHash
      )
      .eq(
        "website_id",
        website.id
      );
  }

  cookieStore.set({
    name: getCookieName(website.id),
    value: "",
    httpOnly: true,
    secure:
      process.env.NODE_ENV ===
      "production",
    sameSite: "lax",
    path: `/sites/${website.slug}`,
    expires: new Date(0),
  });
}
