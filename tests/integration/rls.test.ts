import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

/**
 * Row Level Security, exercised through the real stack.
 *
 * The unit tests elsewhere cover pure functions. This file covers the thing
 * none of them can: that a signed-in user talking to the actual PostgREST
 * endpoint, with the same client the application uses, cannot reach another
 * user's rows.
 *
 * The policies were verified directly in Postgres when the schema was written.
 * What this adds is the layer above them — the grants, the API, and the
 * possibility that application code reaches the database some other way.
 *
 * ## Running it
 *
 * Needs two accounts on a Supabase project whose migrations are applied. Put
 * their credentials in `.env.test.local` (git-ignored):
 *
 *     TEST_SUPABASE_URL=...
 *     TEST_SUPABASE_ANON_KEY=...
 *     TEST_USER_A_EMAIL=...
 *     TEST_USER_A_PASSWORD=...
 *     TEST_USER_B_EMAIL=...
 *     TEST_USER_B_PASSWORD=...
 *
 * Without them the suite skips rather than fails, so `npm test` stays green for
 * anyone who has not set up a test project.
 */

const config = {
  url: process.env.TEST_SUPABASE_URL,
  anonKey: process.env.TEST_SUPABASE_ANON_KEY,
  aEmail: process.env.TEST_USER_A_EMAIL,
  aPassword: process.env.TEST_USER_A_PASSWORD,
  bEmail: process.env.TEST_USER_B_EMAIL,
  bPassword: process.env.TEST_USER_B_PASSWORD,
};

const isConfigured = Object.values(config).every(Boolean);

async function signIn(email: string, password: string): Promise<SupabaseClient> {
  const client = createClient(config.url!, config.anonKey!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { error } = await client.auth.signInWithPassword({ email, password });

  if (error) {
    throw new Error(`Não foi possível autenticar ${email}: ${error.message}`);
  }

  return client;
}

describe.skipIf(!isConfigured)("Row Level Security (integração)", () => {
  let alice: SupabaseClient;
  let bob: SupabaseClient;
  let aliceId: string;
  let bobId: string;
  let aliceKnowledgeId: string;

  beforeAll(async () => {
    alice = await signIn(config.aEmail!, config.aPassword!);
    bob = await signIn(config.bEmail!, config.bPassword!);

    aliceId = (await alice.auth.getUser()).data.user!.id;
    bobId = (await bob.auth.getUser()).data.user!.id;

    const { data, error } = await alice
      .from("knowledge")
      .insert({
        user_id: aliceId,
        title: "Segredo da Alice",
        summary: "Não deve ser visível para ninguém além dela.",
        content_text: "conteudo confidencial",
        status: "active",
      })
      .select("id")
      .single();

    if (error || !data) {
      throw new Error(`Falha ao preparar o registro de teste: ${error?.message}`);
    }

    aliceKnowledgeId = data.id;
  }, 30_000);

  afterAll(async () => {
    if (aliceKnowledgeId) {
      await alice.from("knowledge").delete().eq("id", aliceKnowledgeId);
    }
  });

  it("the two accounts really are different users", () => {
    // Guards against a misconfigured .env.test.local pointing both at the same
    // account, which would make every assertion below pass for the wrong reason.
    expect(aliceId).not.toBe(bobId);
  });

  it("lets the owner read their own record", () => {
    expect(aliceKnowledgeId).toBeTruthy();
  });

  it("hides the record from another user's listing", async () => {
    const { data, error } = await bob.from("knowledge").select("id, title");

    expect(error).toBeNull();
    expect(data?.some((row) => row.id === aliceKnowledgeId)).toBe(false);
  });

  it("returns nothing when another user asks for the record by id", async () => {
    // The id is guessable in principle; RLS is what makes knowing it useless.
    const { data, error } = await bob
      .from("knowledge")
      .select("id")
      .eq("id", aliceKnowledgeId)
      .maybeSingle();

    expect(error).toBeNull();
    expect(data).toBeNull();
  });

  it("does not let another user update the record", async () => {
    const { data, error } = await bob
      .from("knowledge")
      .update({ title: "Sequestrado" })
      .eq("id", aliceKnowledgeId)
      .select("id");

    // RLS filters the row out rather than raising, so the proof is that nothing
    // was touched — and that the title is unchanged afterwards.
    expect(error).toBeNull();
    expect(data).toEqual([]);

    const { data: after } = await alice
      .from("knowledge")
      .select("title")
      .eq("id", aliceKnowledgeId)
      .single();

    expect(after?.title).toBe("Segredo da Alice");
  });

  it("does not let another user delete the record", async () => {
    const { data, error } = await bob
      .from("knowledge")
      .delete()
      .eq("id", aliceKnowledgeId)
      .select("id");

    expect(error).toBeNull();
    expect(data).toEqual([]);

    const { data: after } = await alice
      .from("knowledge")
      .select("id")
      .eq("id", aliceKnowledgeId)
      .maybeSingle();

    expect(after?.id).toBe(aliceKnowledgeId);
  });

  it("rejects an insert that claims another user as the owner", async () => {
    const { error } = await bob.from("knowledge").insert({
      user_id: aliceId,
      title: "Forjado",
    });

    // The RLS WITH CHECK clause refuses this outright, unlike the silent
    // filtering above.
    expect(error).not.toBeNull();
  });

  it("scopes the dashboard aggregates to the caller", async () => {
    // `dashboard_summary()` is SECURITY INVOKER precisely so this holds. A
    // DEFINER version would count the whole table and report it to everyone.
    const { data: bobSummary, error } = await bob.rpc("dashboard_summary");

    expect(error).toBeNull();

    const { data: aliceSummary } = await alice.rpc("dashboard_summary");

    const aliceTotal = (aliceSummary as { knowledge_total: number }).knowledge_total;
    const bobTotal = (bobSummary as { knowledge_total: number }).knowledge_total;

    expect(aliceTotal).toBeGreaterThanOrEqual(1);
    expect(bobTotal).toBe(0);
  });

  it("hides another user's profile", async () => {
    const { data } = await bob.from("profiles").select("id");

    expect(data?.every((row) => row.id === bobId)).toBe(true);
  });

  it("refuses to let a client write embeddings", async () => {
    // Read-only by policy: an attacker-controlled vector would let someone
    // poison their own RAG context, and the browser has no reason to make one.
    const { error } = await bob.from("embeddings").insert({
      user_id: bobId,
      owner_type: "knowledge",
      owner_id: aliceKnowledgeId,
      content: "x",
      model: "test",
      embedding: JSON.stringify(Array.from({ length: 1536 }, () => 0)),
    });

    expect(error).not.toBeNull();
  });
});
