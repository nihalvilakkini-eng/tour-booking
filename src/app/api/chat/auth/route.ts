import { NextRequest, NextResponse } from "next/server";
import { getRequestUser } from "@/lib/request-user";
import { createAblyTokenRequest } from "@/lib/ably-server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get("token")?.value;
    const user = await getRequestUser(token);

    if (!user) {
      return NextResponse.json(
        { success: false, message: "Authentication required" },
        { status: 401 }
      );
    }

    const tokenRequest = await createAblyTokenRequest(user.userId);
    return NextResponse.json(tokenRequest);
  } catch (error) {
    console.error("Ably token auth error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to generate Ably auth token" },
      { status: 500 }
    );
  }
}
