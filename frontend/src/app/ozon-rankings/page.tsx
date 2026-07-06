import { redirect } from "next/navigation";

type SearchParams = Record<string, string | string[] | undefined>;

function buildQueryString(searchParams: SearchParams): string {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(searchParams)) {
    if (typeof value === "string") {
      query.set(key, value);
    } else if (Array.isArray(value)) {
      value.forEach((entry) => query.append(key, entry));
    }
  }
  const qs = query.toString();
  return qs ? `?${qs}` : "";
}

export default function OzonRankingsRedirectPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  redirect(`/ozon-assistant/rankings${buildQueryString(searchParams)}`);
}
