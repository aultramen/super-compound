import { greeting } from "../../../lib/services/greeting.ts";

export function GET(request: Request): Response {
  const name = new URL(request.url).searchParams.get("name") ?? "";
  try {
    return Response.json({ message: greeting(name) });
  } catch (error) {
    if (!(error instanceof RangeError)) throw error;
    return Response.json(
      { error: "Name must contain 1 to 50 characters." },
      { status: 422 },
    );
  }
}
