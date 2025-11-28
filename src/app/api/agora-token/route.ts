import { NextRequest, NextResponse } from "next/server";
import { RtcTokenBuilder, RtcRole } from "agora-token";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const channel = searchParams.get("channel");
    const uid = searchParams.get("uid");
    const roleParam = searchParams.get("role");

    if (!channel || !uid || !roleParam) {
      return NextResponse.json(
        { error: "Missing required parameters: channel, uid, role" },
        { status: 400 }
      );
    }

    const appId = process.env.AGORA_APP_ID;
    const appCertificate = process.env.AGORA_APP_CERTIFICATE;

    if (!appId || !appCertificate) {
      console.error("Agora credentials not configured");
      return NextResponse.json(
        { error: "Agora credentials not configured" },
        { status: 500 }
      );
    }

    // Determinar el rol
    const role = roleParam === "host" ? RtcRole.PUBLISHER : RtcRole.SUBSCRIBER;

    // Tiempo de expiración (1 hora desde ahora)
    const expirationTimeInSeconds = 3600;
    const currentTimestamp = Math.floor(Date.now() / 1000);
    const privilegeExpiredTs = currentTimestamp + expirationTimeInSeconds;

    // Generar el token
    const token = RtcTokenBuilder.buildTokenWithUid(
      appId,
      appCertificate,
      channel,
      Number(uid),
      role,
      privilegeExpiredTs,
      privilegeExpiredTs
    );

    return NextResponse.json({
      token,
      appId,
      channel,
      uid: Number(uid),
      role: roleParam,
      expiresAt: privilegeExpiredTs,
    });
  } catch (error: any) {
    console.error("Error generating Agora token:", error);
    return NextResponse.json(
      { error: "Failed to generate token", details: error.message },
      { status: 500 }
    );
  }
}
