export function formatDate(date: Temporal.Instant) {
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(Number(date.epochMilliseconds)));
}
