import type { Notice, NoticeCategory } from "@tw-comms/shared";
import type { RequestHandler } from "./$types";

function csvEscape(value: string): string {
  return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

/** CSV export button (spec §3.5) — reuses the same escaping rules as
 * formatAuditTrailCsv in @tw-comms/shared, kept local here since the row shape
 * (notices, not approval decisions) is different enough not to force a shared
 * abstraction over two rows that don't actually overlap. */
export const GET: RequestHandler = async ({ locals, url }) => {
  const category = url.searchParams.get("category") as NoticeCategory | null;
  let query = locals.supabase.from("notices").select("*").order("created_at", { ascending: false });
  if (category) query = query.eq("category", category);

  const { data } = await query;
  const notices = (data ?? []) as Notice[];

  const header = ["id", "title", "category", "status", "created_at", "target_count", "mygate_posted"];
  const lines = [header.join(",")];
  for (const n of notices) {
    lines.push(
      [n.id, csvEscape(n.title), n.category, n.status, n.created_at, String(n.target_groups.length), String(n.mygate_posted)].join(",")
    );
  }

  return new Response(lines.join("\n") + "\n", {
    headers: {
      "content-type": "text/csv",
      "content-disposition": `attachment; filename="notices-history.csv"`,
    },
  });
};
