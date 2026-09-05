import { NextResponse } from "next/server";

import { processEmbeddingJobs } from "@/lib/embeddings/worker";
import { getServerEnv } from "@/lib/env";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

/**
 * The embedding indexing worker. Triggered by Vercel Cron (see vercel.json,
 * which fires a GET request), never by a browser: nothing here is scoped to a
 * signed-in user, because it processes every user's queue in one run.
 *
 * `CRON_SECRET` is what stands between this route and anyone who requests its
 * public URL — without it, a stranger could run the vault's OpenAI bill up
 * indefinitely. Unset is treated as "not configured", not "open": the route
 * refuses every request rather than running unprotected.
 */
export async function GET(request: Request) {
  const { CRON_SECRET } = getServerEnv();

  if (!CRON_SECRET) {
    return NextResponse.json(
      { error: "CRON_SECRET não está configurado neste ambiente." },
      { status: 503 },
    );
  }

  if (request.headers.get("authorization") !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  try {
    const supabase = createSupabaseServiceClient();
    const result = await processEmbeddingJobs(supabase);

    return NextResponse.json(result);
  } catch (error) {
    console.error("[jobs/embeddings] unexpected failure:", error);

    return NextResponse.json({ error: "Falha inesperada ao processar a fila de embeddings." }, { status: 500 });
  }
}
