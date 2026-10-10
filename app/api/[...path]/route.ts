import { ZodError } from "zod";
import { ApiError } from "@/lib/auth";
import { handleApi } from "@/lib/api-service";
export const dynamic = "force-dynamic";
async function handler(
  request: Request,
  { params }: { params: Promise<{ path: string[] }> },
) {
  try {
    const { path } = await params;
    return Response.json(await handleApi(request, path), {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (e) {
    const status =
      e instanceof ApiError ? e.status : e instanceof ZodError ? 400 : 503;
    return Response.json(
      {
        code: e instanceof ApiError ? e.code : undefined,
        retryAfterSeconds:
          e instanceof ApiError ? e.retryAfterSeconds : undefined,
        error:
          e instanceof ZodError
            ? e.issues[0]?.message
            : e instanceof ApiError
              ? e.message
              : "Service unavailable. Check server configuration and try again.",
      },
      { status, headers: { "Cache-Control": "private, no-store" } },
    );
  }
}
export const GET = handler,
  POST = handler,
  PATCH = handler,
  DELETE = handler;
