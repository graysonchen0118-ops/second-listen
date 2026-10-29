const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const MON = MONTHS.map((m) => m.slice(0, 3));
const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export const money = (n: number, cents = true) =>
  "$" + n.toLocaleString("en-US", { minimumFractionDigits: cents ? 2 : 0, maximumFractionDigits: cents ? 2 : 0 });

export const compact = (n: number) => (n >= 10000 ? (n / 1000).toFixed(n >= 100000 ? 0 : 1) + "k" : n.toLocaleString("en-US"));

function parts(day: string) {
  const [y, m, d] = day.split("-").map(Number);
  return { y, m, d };
}

/** weekday from a YYYY-MM-DD, computed without the local time zone */
export function weekday(day: string) {
  const { y, m, d } = parts(day);
  return WEEKDAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
}

export const longDate = (day: string) => {
  const { m, d } = parts(day);
  return `${MONTHS[m - 1]} ${d}`;
};
export const shortDate = (day: string) => {
  const { m, d } = parts(day);
  return `${MON[m - 1]} ${d}`;
};
export const fullDate = (day: string) => `${weekday(day)}, ${longDate(day)}`;

export function clock(minute: number) {
  const h = Math.floor(minute / 60) % 24;
  const mm = minute % 60;
  const ap = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(mm).padStart(2, "0")} ${ap}`;
}

export const dur = (sec: number) => `${Math.floor(sec / 60)}:${String(Math.round(sec % 60)).padStart(2, "0")}`;

export function addDays(day: string, n: number) {
  const { y, m, d } = parts(day);
  const t = new Date(Date.UTC(y, m - 1, d + n));
  return `${t.getUTCFullYear()}-${String(t.getUTCMonth() + 1).padStart(2, "0")}-${String(t.getUTCDate()).padStart(2, "0")}`;
}

export const ordinal = (n: number) => {
  const words = ["", "first", "second", "third", "fourth", "fifth", "sixth", "seventh", "eighth", "ninth", "tenth", "eleventh", "twelfth", "thirteenth", "fourteenth", "fifteenth", "sixteenth", "seventeenth", "eighteenth", "nineteenth", "twentieth"];
  if (n <= 20) return words[n];
  if (n === 30) return "thirtieth";
  return "twenty-" + words[n - 20];
};

export const pct = (a: number, b: number) => (b === 0 ? 0 : Math.round((a / b) * 100));
