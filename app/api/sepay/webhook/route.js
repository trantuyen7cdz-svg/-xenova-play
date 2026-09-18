import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

function normalizeText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function getWebhookSecret() {
  return process.env.SEPAY_WEBHOOK_SECRET || "";
}

function isAuthorized(request) {
  const secret = getWebhookSecret();

  // Nếu chưa cấu hình secret thì từ chối
  if (!secret) {
    return false;
  }

  const authorization =
    request.headers.get("authorization") || "";

  const xSecret =
    request.headers.get("x-secret-key") || "";

  // Hỗ trợ:
  // Authorization: Apikey YOUR_SECRET
  if (
    authorization.startsWith("Apikey ") &&
    authorization.slice(7) === secret
  ) {
    return true;
  }

  // Hỗ trợ:
  // X-Secret-Key: YOUR_SECRET
  if (xSecret === secret) {
    return true;
  }

  return false;
}

function extractOrderId(content) {
  const text = String(content || "");

  /*
    Hỗ trợ:
    XENOVA 123
    XENOVA123
    XENOVA-123
    XENOVA_123
  */

  const match = text.match(
    /XENOVA[\s_-]*([0-9]+)/i
  );

  if (!match) {
    return null;
  }

  const orderId = Number(match[1]);

  if (!Number.isInteger(orderId) || orderId <= 0) {
    return null;
  }

  return orderId;
}

async function findAvailableKey(productId) {
  const { data, error } = await supabaseAdmin
    .from("keys")
    .select(`
      id,
      key_code,
      product_id,
      status
    `)
    .eq("product_id", productId)
    .eq("status", "available")
    .is("user_id", null)
    .is("order_id", null)
    .order("id", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(
      `Không lấy được kho KEY: ${error.message}`
    );
  }

  return data;
}

async function assignKeyToOrder(order) {
  const product = order.products;

  if (!product) {
    throw new Error(
      "Sản phẩm của đơn hàng không tồn tại"
    );
  }

  const durationDays = Number(
    product.duration_days || 0
  );

  if (durationDays <= 0) {
    throw new Error(
      "Sản phẩm chưa có thời hạn KEY hợp lệ"
    );
  }

  /*
    Thử tối đa 5 lần để tránh trường hợp
    2 đơn cùng lấy một KEY.
  */

  for (let attempt = 0; attempt < 5; attempt++) {
    const availableKey =
      await findAvailableKey(order.product_id);

    if (!availableKey) {
      throw new Error(
        `Kho KEY "${product.name}" đã hết KEY`
      );
    }

    const expiresAt = new Date();

    expiresAt.setDate(
      expiresAt.getDate() + durationDays
    );

    const soldAt = new Date().toISOString();

    const { data: assignedKey, error } =
      await supabaseAdmin
        .from("keys")
        .update({
          user_id: order.user_id,
          order_id: order.id,
          expires_at: expiresAt.toISOString(),
          sold_at: soldAt,
          status: "sold",
        })
        .eq("id", availableKey.id)
        .eq("status", "available")
        .is("user_id", null)
        .is("order_id", null)
        .select(`
          id,
          key_code,
          product_id,
          user_id,
          order_id,
          expires_at,
          sold_at,
          status
        `)
        .maybeSingle();

    if (error) {
      throw new Error(
        `Không thể cấp KEY: ${error.message}`
      );
    }

    /*
      Nếu update thành công thì KEY đã được cấp.
    */

    if (assignedKey) {
      return assignedKey;
    }

    /*
      Nếu assignedKey = null nghĩa là KEY vừa bị
      một request khác lấy mất.
      Thử lại với KEY tiếp theo.
    */
  }

  throw new Error(
    "Không thể lấy KEY trong kho do có giao dịch đồng thời"
  );
}

export async function POST(request) {
  try {
    /*
      ================================
      1. XÁC THỰC WEBHOOK
      ================================
    */

    if (!isAuthorized(request)) {
      return NextResponse.json(
        {
          success: false,
          message: "Unauthorized",
        },
        { status: 401 }
      );
    }

    /*
      ================================
      2. ĐỌC PAYLOAD
      ================================
    */

    const body = await request.json();

    console.log(
      "SEPAY WEBHOOK:",
      JSON.stringify(body)
    );

    const transactionId = String(
      body.id || ""
    ).trim();

    const gateway = String(
      body.gateway || ""
    ).trim();

    const transferType = String(
      body.transferType || ""
    ).trim().toLowerCase();

    const content = String(
      body.content ||
        body.description ||
        ""
    ).trim();

    const transferAmount = Number(
      body.transferAmount || 0
    );

    /*
      ================================
      3. KIỂM TRA GIAO DỊCH
      ================================
    */

    if (!transactionId) {
      return NextResponse.json(
        {
          success: false,
          message: "Thiếu transaction id",
        },
        { status: 400 }
      );
    }

    if (
      normalizeText(gateway) !==
      normalizeText("Vietcombank")
    ) {
      return NextResponse.json({
        success: true,
        ignored: true,
        message: "Không phải Vietcombank",
      });
    }

    if (transferType !== "in") {
      return NextResponse.json({
        success: true,
        ignored: true,
        message: "Không phải giao dịch tiền vào",
      });
    }

    if (
      !Number.isFinite(transferAmount) ||
      transferAmount <= 0
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Số tiền giao dịch không hợp lệ",
        },
        { status: 400 }
      );
    }

    /*
      ================================
      4. TÌM ORDER ID
      ================================
    */

    const orderId =
      extractOrderId(content);

    if (!orderId) {
      return NextResponse.json({
        success: true,
        ignored: true,
        message:
          "Không tìm thấy mã XENOVA trong nội dung",
      });
    }

    /*
      ================================
      5. KIỂM TRA GIAO DỊCH ĐÃ XỬ LÝ
      ================================
    */

    const {
      data: existingTransaction,
      error: existingTransactionError,
    } = await supabaseAdmin
      .from("orders")
      .select(`
        id,
        status,
        transaction_id
      `)
      .eq(
        "transaction_id",
        transactionId
      )
      .maybeSingle();

    if (existingTransactionError) {
      console.error(
        existingTransactionError
      );

      return NextResponse.json(
        {
          success: false,
          message:
            "Không kiểm tra được giao dịch cũ",
        },
        { status: 500 }
      );
    }

    if (existingTransaction) {
      return NextResponse.json({
        success: true,
        duplicate: true,
        message:
          "Giao dịch đã được xử lý trước đó",
        order_id: existingTransaction.id,
      });
    }

    /*
      ================================
      6. LẤY ĐƠN HÀNG
      ================================
    */

    const {
      data: order,
      error: orderError,
    } = await supabaseAdmin
      .from("orders")
      .select(`
        id,
        user_id,
        product_id,
        amount,
        status,
        transaction_id,
        products (
          id,
          name,
          price,
          duration_days
        )
      `)
      .eq("id", orderId)
      .maybeSingle();

    if (orderError) {
      console.error(orderError);

      return NextResponse.json(
        {
          success: false,
          message:
            "Không lấy được đơn hàng",
        },
        { status: 500 }
      );
    }

    if (!order) {
      return NextResponse.json({
        success: true,
        ignored: true,
        message:
          `Không tìm thấy đơn #${orderId}`,
      });
    }

    /*
      ================================
      7. KIỂM TRA ĐƠN ĐÃ THANH TOÁN
      ================================
    */

    if (
      order.status === "paid" ||
      order.status === "completed"
    ) {
      return NextResponse.json({
        success: true,
        already_paid: true,
        message:
          "Đơn hàng đã được thanh toán",
        order_id: order.id,
      });
    }

    /*
      ================================
      8. KIỂM TRA SỐ TIỀN
      ================================
    */

    const orderAmount = Number(
      order.amount || 0
    );

    if (
      orderAmount <= 0 ||
      transferAmount < orderAmount
    ) {
      return NextResponse.json({
        success: true,
        ignored: true,
        message:
          `Sai số tiền. Đơn yêu cầu ${orderAmount}, giao dịch ${transferAmount}`,
        order_id: order.id,
      });
    }

    /*
      ================================
      9. GHI NHẬN GIAO DỊCH
      ================================
    */

    const {
      data: updatedOrder,
      error: updatePaymentError,
    } = await supabaseAdmin
      .from("orders")
      .update({
        status: "paid",
        transaction_id: transactionId,
        updated_at:
          new Date().toISOString(),
      })
      .eq("id", order.id)
      .eq("status", "pending")
      .is("transaction_id", null)
      .select(`
        id,
        user_id,
        product_id,
        amount,
        status,
        transaction_id,
        products (
          id,
          name,
          price,
          duration_days
        )
      `)
      .maybeSingle();

    if (updatePaymentError) {
      /*
        Nếu lỗi unique transaction_id do webhook
        chạy đồng thời thì coi như đã xử lý.
      */

      if (
        updatePaymentError.code ===
        "23505"
      ) {
        return NextResponse.json({
          success: true,
          duplicate: true,
          message:
            "Giao dịch đang được xử lý",
        });
      }

      console.error(
        updatePaymentError
      );

      return NextResponse.json(
        {
          success: false,
          message:
            "Không thể cập nhật trạng thái thanh toán",
        },
        { status: 500 }
      );
    }

    /*
      Một request khác có thể vừa xử lý đơn.
    */

    if (!updatedOrder) {
      const {
        data: currentOrder,
      } = await supabaseAdmin
        .from("orders")
        .select(`
          id,
          status,
          transaction_id
        `)
        .eq("id", order.id)
        .maybeSingle();

      if (
        currentOrder?.status === "paid"
      ) {
        return NextResponse.json({
          success: true,
          already_paid: true,
          message:
            "Đơn đã được xử lý bởi request khác",
          order_id: order.id,
        });
      }

      return NextResponse.json(
        {
          success: false,
          message:
            "Không thể xác nhận thanh toán",
        },
        { status: 409 }
      );
    }

    /*
      ================================
      10. TỰ ĐỘNG CẤP KEY
      ================================
    */

    let assignedKey;

    try {
      assignedKey =
        await assignKeyToOrder(
          updatedOrder
        );
    } catch (keyError) {
      console.error(
        "AUTO KEY ERROR:",
        keyError
      );

      /*
        Tiền đã xác nhận nhưng kho KEY hết.
        Giữ order = paid để admin xử lý sau,
        không đánh dấu thất bại thanh toán.
      */

      return NextResponse.json(
        {
          success: false,
          paid: true,
          key_issued: false,
          order_id: order.id,
          message:
            keyError.message ||
            "Đã nhận tiền nhưng chưa thể cấp KEY",
        },
        { status: 500 }
      );
    }

    /*
      ================================
      11. HOÀN TẤT
      ================================
    */

    return NextResponse.json({
      success: true,
      paid: true,
      key_issued: true,
      order_id: order.id,
      transaction_id: transactionId,
      key: assignedKey.key_code,
      expires_at:
        assignedKey.expires_at,
      message:
        "Thanh toán thành công và đã tự động cấp KEY",
    });
  } catch (error) {
    console.error(
      "SEPAY WEBHOOK ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message: "Lỗi server",
      },
      { status: 500 }
    );
  }
}
