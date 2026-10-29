import { rng, int, pick, chance, type R } from "../rand";
import { addDays, longDate, money, ordinal } from "../format";
import type { Channel, CheckId, Conversation, CueType, Mark, MyReview, Outcome, PayTerms, Turn, VendorScore } from "./types";

export const TODAY = "2026-10-29";
export const YESTERDAY = "2026-10-28";
export const DAY_BEFORE = "2026-10-27";

export const CREDITORS = [
  { name: "Lakeshore Medical Group", kind: "Medical" },
  { name: "Cedar Valley Hospital", kind: "Hospital" },
  { name: "Summit Card Services", kind: "Credit card" },
  { name: "Midwest Auto Finance", kind: "Auto deficiency" },
  { name: "Prairie Electric Co-op", kind: "Utility" },
  { name: "Northgate Wireless", kind: "Wireless" },
  { name: "Bayview Dental", kind: "Dental" },
  { name: "Keystone Personal Loans", kind: "Personal loan" },
] as const;

const FIRST = ["Tanya", "Marcus", "Denise", "Carlos", "Brittany", "Kevin", "Angela", "Luis", "Crystal", "Terrence", "Heather", "Jamal", "Rosa", "Dustin", "Keisha", "Brandon", "Monica", "Andre", "Lacey", "Victor", "Shonda", "Travis", "Gloria", "Derek", "Yolanda", "Cody", "Patrice", "Ramon", "Amber", "Curtis", "Leticia", "Wesley", "Tamika", "Garrett", "Irene", "Malik", "Sheila", "Hector", "Jolene", "Dwayne"];
const LAST = ["Whitaker", "Mendoza", "Okafor", "Brennan", "Delgado", "Hollis", "Pruitt", "Castillo", "Boone", "Washington", "Sandoval", "Kowalski", "Gentry", "Ferrell", "Navarro", "Tate", "Lindqvist", "Harmon", "Vasquez", "McBride", "Stroud", "Iverson", "Pham", "Rutledge", "Banks", "Carrasco", "Doyle", "Ellison", "Fontaine", "Greer"];
const STATES = ["TX", "OH", "FL", "GA", "IL", "MO", "TN", "AZ", "NC", "MI", "PA", "OK", "AL", "IN", "KY", "WI", "LA", "SC", "AR", "MS"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export const CHECKS: { id: CheckId; label: string; hint: string }[] = [
  { id: "recording", label: "Recording or saving notice given", hint: "Said at the start, before any account detail." },
  { id: "identity", label: "Identity verified before account details", hint: "Name, date of birth and last four, before the balance or creditor is named." },
  { id: "disclosure", label: "Debt collector disclosure given", hint: "Given after verification, before the balance." },
  { id: "cues", label: "Hardship, dispute and legal cues recognized", hint: "Including the ones said in passing, without the key word." },
  { id: "readback", label: "Payment terms read back and confirmed", hint: "Amount, date and card, confirmed by the consumer." },
  { id: "account", label: "Account record matches the conversation", hint: "Checked against what the consumer said, not against the bot summary." },
  { id: "tone", label: "Tone fit for the consumer's situation", hint: "No pressure after a stress signal, no talking over." },
];

export const CUE_LABEL: Record<CueType, string> = {
  hardship: "Hardship",
  dispute: "Dispute",
  cease: "Cease request",
  attorney: "Attorney",
  bankruptcy: "Bankruptcy",
  military: "Active-duty military",
};

interface CueSpec {
  type: CueType;
  line: string;
  phrase: string;
  handled: boolean;
}

interface Spec {
  id: string;
  who?: { name: string; state: string };
  channel: Channel;
  day: string;
  minute: number;
  outcome: Outcome;
  cue?: CueSpec;
  identityEarly?: boolean;
  noDisclosure?: boolean;
  noReadback?: boolean;
  /** account record differs from what was said: days moved on the date, or a different amount */
  recordDateShift?: number;
  recordAmount?: number;
  silence?: number;
  pay?: { day: number; count?: number; amount?: number };
  creditor?: number;
  balance?: number;
  vendor?: Partial<VendorScore>;
  review?: Partial<MyReview>;
  tone?: Mark;
  release?: string;
}

/* ------------------------------------------------------------------ */
/* the conversations the morning is built around                       */
/* ------------------------------------------------------------------ */

const FEATURED: Spec[] = [
  {
    id: "CH-30418",
    who: { name: "Tanya Whitaker", state: "OH" },
    channel: "chat",
    day: YESTERDAY,
    minute: 23 * 60 + 12,
    outcome: "plan",
    creditor: 1,
    balance: 1842.6,
    pay: { day: 20, count: 12 },
    cue: { type: "hardship", line: "i've been out of work since july but i want to get this handled before it gets worse", phrase: "out of work since july", handled: false },
    vendor: { verdict: "pass", score: 96, note: "Verified, disclosure given, plan set up and read back. Pass." },
  },
  {
    id: "VC-58213",
    channel: "voice",
    day: YESTERDAY,
    minute: 18 * 60 + 47,
    outcome: "plan",
    creditor: 3,
    balance: 4310,
    pay: { day: 12, count: 18 },
    cue: { type: "hardship", line: "My hours got cut at the plant back in September, so things have been tight. What's the smallest I can do?", phrase: "My hours got cut at the plant", handled: false },
    tone: "miss",
    vendor: { verdict: "pass", score: 94, note: "Script followed, smallest plan offered, terms confirmed. Pass." },
  },
  {
    id: "VC-58240",
    channel: "voice",
    day: YESTERDAY,
    minute: 12 * 60 + 31,
    outcome: "payment",
    creditor: 0,
    balance: 386.2,
    pay: { day: 2 },
    cue: { type: "dispute", line: "Honestly I thought my insurance covered that visit. But fine, I just want it off my credit.", phrase: "I thought my insurance covered that visit", handled: false },
    vendor: { verdict: "pass", score: 100, note: "Paid in full, all script points met. Pass." },
  },
  {
    id: "CH-30433",
    channel: "chat",
    day: YESTERDAY,
    minute: 22 * 60 + 41,
    outcome: "plan",
    creditor: 6,
    balance: 968,
    pay: { day: 27, count: 8 },
    cue: { type: "hardship", line: "just got out of the hospital last week so bear with me. can i do it in parts", phrase: "just got out of the hospital last week", handled: false },
    vendor: { verdict: "pass", score: 98, note: "Plan created, read back, consumer agreed. Pass." },
  },
  {
    id: "VC-58262",
    channel: "voice",
    day: YESTERDAY,
    minute: 10 * 60 + 8,
    outcome: "plan",
    creditor: 2,
    balance: 2275.4,
    pay: { day: 15, count: 10 },
    recordDateShift: -10,
    vendor: { verdict: "pass", score: 100, note: "All script points met, plan confirmed. Pass." },
  },
  {
    id: "VC-58277",
    channel: "voice",
    day: YESTERDAY,
    minute: 8 * 60 + 3,
    outcome: "silent",
    silence: 41,
    vendor: { verdict: "pass", score: 100, note: "No caller audio, bot ended the call correctly." },
  },
  {
    id: "CH-30451",
    channel: "chat",
    day: YESTERDAY,
    minute: 20 * 60 + 19,
    outcome: "info",
    creditor: 5,
    balance: 612.75,
    cue: { type: "cease", line: "please stop texting me about this, i'll deal with it on my own", phrase: "please stop texting me about this", handled: true },
    vendor: { verdict: "fail", score: 72, note: "Bot did not attempt payment or offer a plan. Fail." },
  },
  {
    id: "VC-58301",
    channel: "voice",
    day: YESTERDAY,
    minute: 14 * 60 + 52,
    outcome: "dropped",
    creditor: 3,
    balance: 6120,
    cue: { type: "attorney", line: "My attorney's handling all of this now, I'm not supposed to talk about it.", phrase: "My attorney's handling all of this now", handled: false },
    vendor: { verdict: "fail", score: 64, note: "Attorney mentioned, bot kept offering a plan. Fail." },
  },
  {
    id: "VC-58315",
    channel: "voice",
    day: YESTERDAY,
    minute: 9 * 60 + 26,
    outcome: "payment",
    creditor: 4,
    balance: 214.33,
    pay: { day: 3 },
    identityEarly: true,
    vendor: { verdict: "pass", score: 100, note: "Paid in full, verified, disclosure given. Pass." },
  },
  {
    id: "CH-30470",
    channel: "chat",
    day: YESTERDAY,
    minute: 6 * 60 + 55,
    outcome: "transfer",
    creditor: 7,
    balance: 3380,
    cue: { type: "military", line: "i'm active duty, ship out next week. my wife usually handles the bills", phrase: "i'm active duty", handled: true },
    vendor: { verdict: "pass", score: 100, note: "Service member routed to the right team. Pass." },
  },
  {
    id: "VC-58322",
    channel: "voice",
    day: YESTERDAY,
    minute: 16 * 60 + 5,
    outcome: "transfer",
    creditor: 2,
    balance: 5480.9,
    cue: { type: "bankruptcy", line: "I filed chapter seven back in April, I thought all of this was covered.", phrase: "I filed chapter seven back in April", handled: true },
    vendor: { verdict: "pass", score: 100, note: "Bankruptcy recognized, routed to a specialist. Pass." },
  },
  {
    id: "VC-58340",
    channel: "voice",
    day: YESTERDAY,
    minute: 19 * 60 + 33,
    outcome: "transfer",
    creditor: 1,
    balance: 2730,
    cue: { type: "hardship", line: "I'm on disability now and it barely covers rent. I don't know what I can pay.", phrase: "I'm on disability now", handled: true },
    vendor: { verdict: "fail", score: 80, note: "Bot transferred without offering the standard plan. Fail." },
  },
  {
    id: "CH-30488",
    channel: "chat",
    day: YESTERDAY,
    minute: 13 * 60 + 14,
    outcome: "payment",
    creditor: 5,
    balance: 148.9,
    pay: { day: 4 },
    noReadback: true,
    vendor: { verdict: "fail", score: 84, note: "Payment taken without reading back the terms. Fail." },
  },
  {
    id: "VC-58356",
    channel: "voice",
    day: YESTERDAY,
    minute: 21 * 60 + 2,
    outcome: "plan",
    creditor: 0,
    balance: 1190,
    pay: { day: 6, count: 6 },
    cue: { type: "hardship", line: "We just had a baby and I'm on unpaid leave, so it's tight right now. Can it be monthly?", phrase: "I'm on unpaid leave", handled: false },
    vendor: { verdict: "pass", score: 98, note: "Plan set up, terms read back. Pass." },
  },
  {
    id: "CH-30492",
    channel: "chat",
    day: YESTERDAY,
    minute: 11 * 60 + 40,
    outcome: "plan",
    creditor: 4,
    balance: 431.18,
    pay: { day: 18, count: 4 },
    cue: { type: "dispute", line: "this is from my old apartment, i paid the final bill when i moved out. whatever, how much a month", phrase: "i paid the final bill when i moved out", handled: false },
    vendor: { verdict: "pass", score: 96, note: "Plan created and confirmed. Pass." },
  },
  {
    id: "VC-58371",
    channel: "voice",
    day: YESTERDAY,
    minute: 15 * 60 + 18,
    outcome: "payment",
    creditor: 6,
    balance: 277.5,
    pay: { day: 1 },
    noDisclosure: true,
    vendor: { verdict: "fail", score: 82, note: "Debt collector disclosure missing. Fail." },
  },
  {
    id: "VC-58389",
    channel: "voice",
    day: YESTERDAY,
    minute: 17 * 60 + 44,
    outcome: "silent",
    silence: 38,
    vendor: { verdict: "pass", score: 100, note: "No caller audio, ended correctly." },
  },
  {
    id: "CH-30501",
    channel: "chat",
    day: YESTERDAY,
    minute: 7 * 60 + 38,
    outcome: "plan",
    creditor: 7,
    balance: 2604,
    pay: { day: 25, count: 12 },
    recordAmount: 127,
    vendor: { verdict: "pass", score: 100, note: "Plan created and confirmed. Pass." },
  },
  // the day before, already reviewed
  {
    id: "VC-57990",
    channel: "voice",
    day: DAY_BEFORE,
    minute: 18 * 60 + 15,
    outcome: "plan",
    creditor: 2,
    balance: 3015,
    pay: { day: 10, count: 15 },
    cue: { type: "hardship", line: "I'm between jobs right now, but I start somewhere new in December.", phrase: "I'm between jobs right now", handled: false },
    vendor: { verdict: "pass", score: 96, note: "Plan set up and read back. Pass." },
    review: { status: "fail", stance: "dispute", reason: "Hardship said in the first answer, bot moved straight to a 15 month plan. Should have offered the hardship path first.", dispute: "vendor-accepted" },
  },
  {
    id: "CH-30260",
    channel: "chat",
    day: DAY_BEFORE,
    minute: 21 * 60 + 50,
    outcome: "payment",
    creditor: 5,
    balance: 85,
    pay: { day: 7 },
    recordAmount: 58,
    vendor: { verdict: "pass", score: 100, note: "Paid in full and confirmed. Pass." },
    review: { status: "fail", stance: "dispute", reason: "Consumer paid 85.00, account shows 58.00. Digits swapped between summary and account update.", dispute: "open" },
  },
  {
    id: "VC-58011",
    channel: "voice",
    day: DAY_BEFORE,
    minute: 9 * 60 + 2,
    outcome: "silent",
    silence: 44,
    vendor: { verdict: "pass", score: 100, note: "No caller audio, ended correctly." },
    review: { status: "pass", stance: "confirm" },
  },
  {
    id: "VC-58030",
    channel: "voice",
    day: DAY_BEFORE,
    minute: 13 * 60 + 41,
    outcome: "plan",
    creditor: 3,
    balance: 7240,
    pay: { day: 20, count: 24 },
    cue: { type: "cease", line: "And please stop calling me at work, my supervisor isn't happy about it.", phrase: "please stop calling me at work", handled: false },
    vendor: { verdict: "fail", score: 70, note: "Request about calls at work not noted. Fail." },
    review: { status: "fail", stance: "confirm" },
  },
];

/* ------------------------------------------------------------------ */
/* building a transcript                                               */
/* ------------------------------------------------------------------ */

const nth = (n: number) => n + (n % 10 === 1 && n !== 11 ? "st" : n % 10 === 2 && n !== 12 ? "nd" : n % 10 === 3 && n !== 13 ? "rd" : "th");

function dateOn(dayOfMonth: number) {
  return `2026-11-${String(dayOfMonth).padStart(2, "0")}`;
}

class Script {
  turns: Turn[] = [];
  t = 0;
  constructor(public channel: Channel, private r: R) {}
  bot(text: string) {
    this.t += this.channel === "voice" ? 1.2 : 2 + this.r() * 2;
    this.turns.push({ who: "bot", t: Math.round(this.t), text });
    this.t += this.channel === "voice" ? text.length / 15 : 1;
  }
  me(text: string, cue?: Turn["cue"]) {
    this.t += this.channel === "voice" ? 0.8 + this.r() * 1.4 : 6 + text.length / 4 + this.r() * 10;
    this.turns.push({ who: "consumer", t: Math.round(this.t), text, cue });
    this.t += this.channel === "voice" ? text.length / 14 : 0;
  }
  sys(text: string, gap = 0) {
    this.t += gap;
    this.turns.push({ who: "system", t: Math.round(this.t), text });
  }
}

const HANDLED: Record<CueType, string> = {
  hardship: "I'm sorry you're dealing with that. I can note a hardship on the account, and a specialist can go over options that may lower or pause payments. Would you like me to connect you now?",
  dispute: "Thanks for telling me. I'll note that you dispute this balance and send it for review, and you'll get the details in writing. I won't ask for a payment today.",
  cease: "Understood. I've noted your request to stop contact about this account.",
  attorney: "Thank you. Could you share your attorney's name and phone number? We'll contact them instead.",
  bankruptcy: "Thanks for letting me know. I'll stop here and pass this to a specialist who handles bankruptcy cases.",
  military: "Thank you for telling me. I'm routing this to the team that handles accounts for service members, and they'll reach out.",
};

function build(spec: Spec, r: R, who: { name: string; state: string }, creditor: { name: string; kind: string }, balance: number) {
  const s = new Script(spec.channel, r);
  const voice = spec.channel === "voice";
  const acct4 = String(int(r, 1000, 9999));
  const card = String(int(r, 1000, 9999));
  const [first, last] = who.name.split(" ");
  const dob = `${pick(r, MONTHS)} ${int(r, 1, 28)}, ${int(r, 1958, 2001)}`;
  const ssn4 = String(int(r, 1000, 9999));

  let said: PayTerms | undefined;

  // opening
  if (voice) s.bot("Thanks for calling. You're speaking with an automated assistant, and this call is recorded.");
  else s.bot("Hi, I'm the automated assistant. This chat is saved for quality. How can I help today?");

  if (spec.outcome === "silent") {
    s.sys(`No audio from the caller for ${Math.round((spec.silence ?? 40) * 0.45)} seconds`, (spec.silence ?? 40) * 0.45);
    s.bot("Are you still there?");
    s.sys(`No audio from the caller for ${Math.round((spec.silence ?? 40) * 0.4)} seconds`, (spec.silence ?? 40) * 0.4);
    s.bot("I'm not hearing anything, so I'll end this call. You can call back anytime.");
    s.sys("Call ended by the assistant", 1);
    return { turns: s.turns, said, card, acct4 };
  }

  if (spec.identityEarly) {
    s.me(voice ? `Hi, I got a letter about a ${creditor.name} bill.` : `hi i got a letter about ${creditor.name.toLowerCase()}`);
    s.bot(`I can help with that. The ${creditor.name} account shows a balance of ${money(balance)}.`);
    s.me(voice ? "Okay, and I can pay that today?" : "ok can i pay it today");
    s.bot("You can. First I need to verify who I'm speaking with. What's your full name and date of birth?");
  } else {
    if (voice) s.me(pick(r, ["Hi, I got a call about an account.", "Yeah, I'm calling about a letter I got.", "I need to take care of a bill.", "Hi, I'm returning a call."]));
    else s.me(pick(r, ["hi i got a text about my account", "hello, i need to pay a bill", "i got a letter, what is this about", "hi"]));
    s.bot("I can help. Before I look at an account, I need to verify who I'm speaking with. What's your full name and date of birth?");
  }
  s.me(voice ? `${first} ${last}, ${dob}.` : `${first.toLowerCase()} ${last.toLowerCase()} ${dob.toLowerCase()}`);
  s.bot("Thanks. And the last four digits of your Social Security number?");
  s.me(ssn4);
  s.bot("Thank you, you're verified.");

  if (!spec.noDisclosure) s.bot("This is a communication from a debt collector. This is an attempt to collect a debt, and any information obtained will be used for that purpose.");

  if (spec.outcome === "dropped" && !spec.cue) {
    s.bot(`Your ${creditor.name} account ending in ${acct4} has a balance of ${money(balance)}. Would you like to pay it in full today, or set up a payment plan?`);
    s.me(voice ? "Hold on, someone's at the door, I'll have to call back." : "brb");
    s.sys(voice ? "Caller disconnected" : "Chat closed by the consumer", 2);
    return { turns: s.turns, said, card, acct4 };
  }

  if (!spec.identityEarly) s.bot(`Your ${creditor.name} account ending in ${acct4} has a balance of ${money(balance)}. Would you like to pay it in full today, or set up a payment plan?`);
  else s.bot("Would you like to pay it in full today, or set up a payment plan?");

  const cue = spec.cue;
  if (cue) {
    s.me(cue.line, { type: cue.type, phrase: cue.phrase, handled: cue.handled });
    if (cue.handled) {
      s.bot(HANDLED[cue.type]);
      if (cue.type === "attorney") {
        s.me(voice ? "Linda Moss, 555-0142." : "linda moss 555-0142");
        s.bot("Thank you. We'll contact Linda Moss directly.");
      } else if (cue.type === "hardship") {
        s.me(voice ? "Yeah, okay." : "yes please");
        s.sys("Transferred to the hardship specialist queue", 1);
        return { turns: s.turns, said, card, acct4 };
      } else if (spec.outcome === "transfer") {
        s.me(voice ? "Okay, thank you." : "ok thanks");
        s.sys("Transferred to a specialist queue", 1);
        return { turns: s.turns, said, card, acct4 };
      } else {
        s.me(voice ? "Okay." : "ok");
      }
      s.bot(voice ? "Is there anything else I can help with today?" : "Anything else I can help with?");
      s.me(voice ? "No." : "no");
      s.sys(voice ? "Call ended" : "Chat closed", 1);
      return { turns: s.turns, said, card, acct4 };
    }
    // the cue goes past the bot
    if (spec.outcome === "dropped") {
      s.bot("I understand. To resolve the balance, I can set up a monthly plan. What amount works for you?");
      s.me(voice ? "I told you, I'm not doing this." : "no");
      s.sys(voice ? "Caller disconnected" : "Chat closed by the consumer", 1);
      return { turns: s.turns, said, card, acct4 };
    }
    if (cue.type === "cease") {
      s.bot("I can help with that. What would you like to do about the balance today?");
      s.me(voice ? "I guess a payment plan." : "plan i guess");
    }
  }

  const pay = spec.pay ?? { day: int(r, 1, 28) };
  const isPlan = spec.outcome === "plan";
  const count = pay.count ?? 0;
  const amount = spec.pay?.amount ?? (isPlan ? Math.ceil(balance / count) : balance);
  said = { amount, date: dateOn(pay.day), card, count: isPlan ? count : undefined, freq: isPlan ? "monthly" : undefined };

  if (isPlan) {
    if (!cue) s.me(voice ? pick(r, ["Can we do a plan? I can't do it all at once.", "I'd like to split it up if I can.", "What does a plan look like?"]) : pick(r, ["can i do payments", "i need a plan", "monthly please"]));
    s.bot(cue ? `I can help with that. The plan I can offer is ${money(amount)} a month for ${count} months. Which day of the month works for the first payment?` : `I can set that up. ${money(amount)} a month for ${count} months would cover it. Which day of the month works for the first payment?`);
    s.me(voice ? `The ${ordinal(pay.day)}, I guess. That's when I get paid.` : `the ${nth(pay.day)}`);
  } else if (spec.outcome === "payment") {
    if (!cue) s.me(voice ? pick(r, ["I'll just pay it in full.", "I can pay all of it today.", "Let's just get it paid."]) : pick(r, ["pay in full", "i'll pay all of it", "full"]));
    s.bot(`I can take that payment. Which date should it go through?`);
    s.me(voice ? `Put it on the ${ordinal(pay.day)}.` : `the ${nth(pay.day)}`);
  } else if (spec.outcome === "promise") {
    s.me(voice ? "I can't do anything today. I'll pay when my check comes in." : "can't today. when i get paid");
    s.bot(`I've noted that you plan to pay on ${longDate(dateOn(pay.day))}. You'll get a reminder the day before.`);
    s.sys(voice ? "Call ended" : "Chat closed", 1);
    return { turns: s.turns, said: undefined, card, acct4 };
  }
  s.bot("What card would you like to use?");
  s.me(voice ? `Card ending ${card}.` : `card ending ${card}`);
  if (!spec.noReadback) {
    const what = isPlan ? `${money(amount)} a month for ${count} months, starting ${longDate(said.date)}` : `${money(amount)} on ${longDate(said.date)}`;
    s.bot(`To confirm, that's ${what}, from the card ending in ${card}. Is that right?`);
    s.me(voice ? "Yes." : "yes");
  }
  s.bot("You're all set, and a confirmation is on its way by email. Is there anything else?");
  s.me(voice ? "No, that's it." : "no thats it");
  s.bot(voice ? "Thanks for calling. Take care." : "Thanks for chatting with us. Take care.");
  s.sys(voice ? "Call ended" : "Chat closed", 1);
  return { turns: s.turns, said, card, acct4 };
}

/* ------------------------------------------------------------------ */
/* filling the rest of the sample                                      */
/* ------------------------------------------------------------------ */

function randomSpecs(r: R): Spec[] {
  const out: Spec[] = [];
  let v = 58400;
  let c = 30510;
  const plan: [string, number][] = [
    [YESTERDAY, 20],
    [DAY_BEFORE, 32],
  ];
  for (const [day, n] of plan) {
    for (let i = 0; i < n; i++) {
      const channel: Channel = chance(r, 0.58) ? "voice" : "chat";
      const roll = r();
      const outcome: Outcome = roll < 0.3 ? "payment" : roll < 0.62 ? "plan" : roll < 0.72 ? "info" : roll < 0.84 ? "transfer" : roll < 0.9 ? "promise" : roll < 0.96 ? "dropped" : "silent";
      // more chats late, more calls in business hours
      const hour = channel === "chat" ? pick(r, [7, 8, 12, 13, 19, 20, 21, 21, 22, 22, 23, 0]) : pick(r, [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20]);
      out.push({
        id: channel === "voice" ? `VC-${v--}` : `CH-${c--}`,
        channel,
        day,
        minute: hour * 60 + int(r, 0, 59),
        outcome,
        creditor: int(r, 0, CREDITORS.length - 1),
        balance: Math.round((120 + r() * 5200) * 100) / 100,
        pay: outcome === "plan" ? { day: int(r, 1, 28), count: pick(r, [3, 4, 6, 8, 10, 12]) } : { day: int(r, 1, 28) },
        silence: outcome === "silent" ? int(r, 30, 48) : undefined,
      });
    }
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* scoring                                                             */
/* ------------------------------------------------------------------ */

function suggestedFor(spec: Spec, said: PayTerms | undefined, record: PayTerms | undefined): Record<CheckId, Mark> {
  const silent = spec.outcome === "silent";
  const paid = spec.outcome === "payment" || spec.outcome === "plan";
  const mismatch = !!(said && record && (said.date !== record.date || said.amount !== record.amount));
  return {
    recording: "ok",
    identity: silent ? "na" : spec.identityEarly ? "miss" : "ok",
    disclosure: silent ? "na" : spec.noDisclosure ? "miss" : "ok",
    cues: spec.cue ? (spec.cue.handled ? "ok" : "miss") : "na",
    readback: paid ? (spec.noReadback ? "miss" : "ok") : "na",
    account: said && record ? (mismatch ? "miss" : "ok") : "na",
    tone: spec.tone ?? "ok",
  };
}

const VENDOR_QA = "Vendor QA, M. Bell";

function vendorFor(spec: Spec, sug: Record<CheckId, Mark>): VendorScore {
  // the vendor's grid sees script points and key words, and passes soft cues inside a payment
  const criteria = { ...sug };
  const paid = spec.outcome === "payment" || spec.outcome === "plan";
  if (spec.cue && !spec.cue.handled && paid && (spec.cue.type === "hardship" || spec.cue.type === "dispute")) criteria.cues = "ok";
  if (spec.identityEarly) criteria.identity = "ok";
  criteria.account = "na";
  criteria.tone = "ok";
  if (spec.cue?.handled && spec.vendor?.verdict === "fail") criteria.readback = "miss";
  const misses = Object.values(criteria).filter((m) => m === "miss").length;
  return {
    verdict: spec.vendor?.verdict ?? (misses ? "fail" : "pass"),
    score: spec.vendor?.score ?? Math.max(60, 100 - misses * 14),
    by: VENDOR_QA,
    note: spec.vendor?.note ?? (misses ? "Script point missed. Fail." : paid ? "Script followed, terms confirmed. Pass." : "Handled within script. Pass."),
    criteria,
  };
}

function reviewFor(spec: Spec, sug: Record<CheckId, Mark>, vendor: VendorScore): MyReview {
  const base: MyReview = { status: "todo", checks: { ...sug }, note: "" };
  if (spec.review) return { ...base, ...spec.review, checks: { ...sug }, reviewedAt: spec.day === DAY_BEFORE ? "Oct 28, 9:40 AM" : undefined };
  if (spec.day === DAY_BEFORE) {
    const fail = Object.values(sug).includes("miss");
    const status = fail ? "fail" : "pass";
    const stance = (status === vendor.verdict ? "confirm" : "dispute") as MyReview["stance"];
    return { ...base, status, stance, reason: stance === "dispute" ? "Checklist and vendor grid disagree, see notes." : undefined, reviewedAt: "Oct 28, 10:15 AM", dispute: stance === "dispute" ? "open" : undefined };
  }
  return base;
}

/* ------------------------------------------------------------------ */

function make(spec: Spec, r: R, idx: number): Conversation {
  const who = spec.who ?? { name: `${FIRST[(idx * 7 + 3) % FIRST.length]} ${LAST[(idx * 11 + 5) % LAST.length]}`, state: STATES[(idx * 5 + 1) % STATES.length] };
  const creditor = CREDITORS[spec.creditor ?? int(r, 0, CREDITORS.length - 1)];
  const balance = spec.balance ?? 400;
  const { turns, said, card, acct4 } = build(spec, r, who, creditor, balance);

  let summary: PayTerms | undefined;
  let record: PayTerms | undefined;
  if (said) {
    summary = { ...said };
    record = { ...said };
    if (spec.recordDateShift) record.date = addDays(said.date, spec.recordDateShift);
    if (spec.recordAmount) record.amount = spec.recordAmount;
  }
  const sug = suggestedFor(spec, said, record);
  const vendor = vendorFor(spec, sug);
  const review = reviewFor(spec, sug, vendor);

  const last = turns[turns.length - 1];
  const durationSec = Math.max(spec.channel === "voice" ? 40 : 90, Math.round(last.t + 4));
  const flags: string[] = [];
  if (spec.outcome === "silent") flags.push("Silence");
  if (spec.outcome === "transfer") flags.push("Transfer");
  if (spec.outcome === "dropped") flags.push("Dropped");
  if (spec.cue && ["cease", "attorney", "bankruptcy", "military"].includes(spec.cue.type)) flags.push("Keyword");
  if (vendor.verdict === "fail") flags.push("Vendor fail");

  const outcomeText: Record<Outcome, string> = {
    payment: said ? `Consumer paid ${money(said.amount)} in full, scheduled ${longDate(said.date)}, card ending ${card}.` : "Payment taken.",
    plan: said ? `Plan set up: ${money(said.amount)} a month for ${said.count} months, first payment ${longDate(said.date)}, card ending ${card}.` : "Plan set up.",
    promise: "Consumer promised to pay on payday. Reminder scheduled.",
    info: spec.cue?.type === "cease" ? "Consumer asked to stop contact. Request noted." : spec.cue?.type === "attorney" ? "Consumer is represented. Attorney details taken." : "Balance information given.",
    transfer: "Transferred to a specialist queue.",
    dropped: "Consumer left before a resolution.",
    silent: "No audio from the caller. Call ended by the assistant.",
  };
  let summaryText = outcomeText[spec.outcome];
  if (spec.recordDateShift && summary) summaryText = `Plan set up: ${money(summary.amount)} a month for ${summary.count} months, first payment ${longDate(summary.date)}, card ending ${card}.`;

  return {
    id: spec.id,
    channel: spec.channel,
    day: spec.day,
    minute: spec.minute,
    durationSec,
    consumer: who,
    account: { id: `A-${acct4}${String(idx).padStart(2, "0")}`, creditor: creditor.name, kind: creditor.kind, balance },
    outcome: spec.outcome,
    said,
    summary,
    record,
    summaryText,
    transcript: turns,
    flags,
    vendor,
    review,
    suggested: sug,
    silenceSec: spec.silence,
    release: spec.release ?? (spec.day >= DAY_BEFORE ? "4.2" : "4.1"),
  };
}

export function seedConversations(): Conversation[] {
  const r = rng(20261029);
  const specs = [...FEATURED, ...randomSpecs(r)];
  const list = specs.map((s, i) => make(s, rng(1000 + i * 31), i));
  return list.sort((a, b) => (a.day === b.day ? b.minute - a.minute : a.day < b.day ? 1 : -1));
}

/* the cues a conversation carries, ready for the review screen */
export function cuesOf(c: Conversation) {
  return c.transcript.flatMap((t, i) => (t.cue ? [{ ...t.cue, turn: i }] : []));
}

export const isWin = (c: Conversation) => c.outcome === "payment" || c.outcome === "plan";
export const hasSoftMiss = (c: Conversation) => isWin(c) && cuesOf(c).some((q) => !q.handled && (q.type === "hardship" || q.type === "dispute"));
export const hasMismatch = (c: Conversation) => !!(c.said && c.record && (c.said.date !== c.record.date || c.said.amount !== c.record.amount));
export const isCompliance = (c: Conversation) =>
  cuesOf(c).some((q) => ["cease", "attorney", "bankruptcy", "military"].includes(q.type)) || c.suggested.identity === "miss" || c.suggested.disclosure === "miss";
