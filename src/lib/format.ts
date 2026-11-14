const dateTime = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" });
const dateOnly = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" });

export const formatDateTime = (iso: string | Date) => dateTime.format(new Date(iso));
export const formatDate = (iso: string | Date) => dateOnly.format(new Date(iso));
