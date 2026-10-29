import type { CalItem, Ruling, TestCase, Topic } from "./types";

export const TOPIC_LABEL: Record<Topic, string> = {
  hardship: "Hardship",
  dispute: "Dispute",
  cease: "Cease",
  attorney: "Attorney",
  bankruptcy: "Bankruptcy",
  military: "Military",
  identity: "Identity",
  payments: "Payments",
  disclosure: "Disclosure",
  silence: "Silence",
};

export const DECISION_LABEL = { manual: "Manual update", calibration: "Calibration", ticket: "Ticket" } as const;

export const MEETING = { day: "2026-10-29", time: "2:00 PM ET", room: "Teams, QA calibration" };

export function seedCalItems(): CalItem[] {
  return [
    {
      id: "CAL-61",
      convId: "VC-57990",
      topic: "hardship",
      question: "Consumer says they are between jobs, then asks for a plan. Is setting up a 15 month plan without offering the hardship path a fail, even when the consumer agrees?",
      raisedBy: "Jordan Ellis",
      proposal: "calibration",
      status: "open",
      added: "Oct 28",
    },
    {
      id: "CAL-62",
      convId: "CH-30451",
      topic: "cease",
      question: "Vendor grid fails a cease request because no payment was attempted. Should payment attempt be N/A once a cease is said?",
      raisedBy: "Priya Raman",
      proposal: "manual",
      status: "open",
      added: "Oct 28",
    },
    {
      id: "CAL-63",
      convId: "VC-58277",
      topic: "silence",
      question: "After release 4.2 the bot waits about 18 seconds before the first prompt on a silent line. Expected behavior or a ticket?",
      raisedBy: "Dana Whitfield",
      proposal: "ticket",
      status: "open",
      added: "Oct 28",
    },
    {
      id: "CAL-64",
      convId: "CH-30260",
      topic: "payments",
      question: "Consumer paid 85.00 and the account shows 58.00. Is the account update reading the amount from the summary text?",
      raisedBy: "Jordan Ellis",
      proposal: "ticket",
      status: "open",
      added: "Oct 27",
    },
  ];
}

export function seedRulings(): Ruling[] {
  const r = (id: string, date: string, convId: string, topic: Topic, ruling: string, reason: string, decidedBy: string, outcome: Ruling["outcome"]): Ruling => ({ id, date, convId, topic, ruling, reason, decidedBy, outcome });
  return [
    r("R-48", "2026-10-22", "VC-57412", "hardship", "A hardship said in passing counts as a hardship, with or without the word.", "Consumers almost never say 'hardship'. Job loss, medical leave, disability or a death in the family start the hardship path.", "Dana Whitfield", "manual"),
    r("R-47", "2026-10-22", "CH-29876", "dispute", "'I thought insurance covered it' is a dispute, not a question.", "It questions whether the balance is owed. The bot notes a dispute and stops asking for payment in that conversation.", "Robert Haines", "calibration"),
    r("R-46", "2026-10-15", "VC-56980", "identity", "The creditor name counts as an account detail.", "Naming the creditor before verification tells whoever picked up that a debt exists.", "Robert Haines", "manual"),
    r("R-45", "2026-10-15", "CH-29540", "cease", "'Stop texting me' in chat is a cease request for that channel, logged like one on a call.", "The words change with the channel, the request doesn't.", "Dana Whitfield", "calibration"),
    r("R-44", "2026-10-08", "VC-56411", "payments", "The read-back says the calendar date, never 'next Friday'.", "Relative dates were confirmed on the wrong week twice in September.", "Dana Whitfield", "manual"),
    r("R-43", "2026-10-08", "VC-56390", "silence", "No prompt within 10 seconds on a silent line is a bot fail, not a pass.", "The caller may be on a bad line and hang up before hearing anything.", "Elena Park", "ticket"),
    r("R-42", "2026-10-01", "CH-29012", "attorney", "An attorney mentioned without a name still stops the payment ask.", "Asking for the name is the next step, not a condition for stopping.", "Robert Haines", "calibration"),
    r("R-41", "2026-10-01", "VC-55870", "military", "A spouse saying the account holder is deployed is routed to the service member team.", "The account holder can't be reached, and the spouse often holds the bills.", "Dana Whitfield", "manual"),
    r("R-40", "2026-09-24", "VC-55302", "bankruptcy", "'Filed', 'chapter seven' or 'chapter thirteen' routes to the bankruptcy specialist, even if the consumer offers to pay.", "An offer to pay doesn't change the status of the case.", "Robert Haines", "calibration"),
    r("R-39", "2026-09-24", "CH-28733", "hardship", "After a hardship cue the bot doesn't repeat the full balance.", "Repeating it reads as pressure to someone who just said they can't pay.", "Dana Whitfield", "manual"),
    r("R-38", "2026-09-17", "VC-54901", "disclosure", "The disclosure is given again when a dropped caller calls back.", "It is a new conversation, and the reviewer can't assume they heard the first one.", "Robert Haines", "manual"),
    r("R-37", "2026-09-17", "CH-28410", "payments", "A plan summary that rounds the monthly amount fails if the account stores the unrounded one.", "The consumer confirmed one number and gets charged another.", "Elena Park", "ticket"),
    r("R-36", "2026-09-10", "VC-54377", "hardship", "'What's the smallest I can pay' is not a hardship cue on its own.", "Asking about price is normal. A reason has to be stated: a job, health, leave, a death.", "Dana Whitfield", "calibration"),
    r("R-35", "2026-09-10", "VC-54350", "dispute", "'That one's not mine' about one charge on a multi-charge balance disputes that charge.", "The rest of the balance can still be discussed, that charge cannot.", "Robert Haines", "calibration"),
    r("R-34", "2026-09-03", "CH-27980", "identity", "Chat date of birth typos: one correction allowed, a second mismatch ends verification.", "Typing on a phone at night produces typos, a second miss is a different person as often as not.", "Dana Whitfield", "manual"),
    r("R-33", "2026-09-03", "VC-53911", "cease", "'Stop calling my work' is a request about the workplace, logged and honored, not a full cease.", "Calls to the home number can continue unless the consumer asks for that too.", "Robert Haines", "calibration"),
  ];
}

const runs = (lines: string[], results: string) =>
  lines.map((line, i) => ({ n: i + 1, line, result: (results[i] === "p" ? "pass" : results[i] === "f" ? "fail" : "pending") as "pass" | "fail" | "pending" }));

export function seedTests(): TestCase[] {
  return [
    {
      id: "T-118",
      ticket: "QA-412",
      title: "Hardship said in passing goes to the hardship path",
      channel: "chat",
      topic: "hardship",
      scenario: "Consumer verifies, hears the balance, and mentions a job loss, leave or health problem in the same message as asking for a plan.",
      expected: "Bot acknowledges it, offers the hardship path before any plan amount, and logs a hardship note.",
      runs: runs(
        ["i've been out of work since july, can i do a plan", "lost my job last month whats the lowest", "my hours got cut so i need something small", "i'm on unpaid leave till january", "just got out of the hospital can i pay in parts", "we're down to one income right now", "between jobs, start a new one in december", "my unemployment ran out what can i do", "on disability now, need a plan", "had surgery and haven't worked since"],
        "ppfpfp----",
      ),
      status: "running",
      owner: "Jordan Ellis",
      created: "Oct 28",
      convId: "CH-30418",
    },
    {
      id: "T-117",
      ticket: "QA-409",
      title: "Silent caller hears a prompt within 5 seconds",
      channel: "voice",
      topic: "silence",
      scenario: "Caller connects and says nothing.",
      expected: "Bot prompts at 5 seconds, again at 15, and ends at 30 with a line about calling back.",
      runs: runs(["Silence", "Silence, line hiss", "Silence, TV in the background", "Silence", "Breathing only", "Silence, call from a car", "Silence", "Silence, dog barking", "Silence", "Silence, speakerphone"], "fpffpfpfpp"),
      status: "failed",
      owner: "Priya Raman",
      created: "Oct 27",
      convId: "VC-58277",
    },
    {
      id: "T-115",
      ticket: "QA-405",
      title: "Cease request in chat stops the payment ask",
      channel: "chat",
      topic: "cease",
      scenario: "Consumer asks to stop contact at any point after verification.",
      expected: "Bot confirms the request is noted and asks for nothing else.",
      runs: runs(["please stop texting me", "stop contacting me about this", "dont message me again", "i want this to stop", "no more texts please", "leave me alone about this bill", "stop", "quit messaging me", "please don't contact me anymore", "unsubscribe"], "pppppppppp"),
      status: "passed",
      owner: "Jordan Ellis",
      created: "Oct 21",
    },
    {
      id: "T-114",
      ticket: "QA-401",
      title: "Account first payment date matches the read-back",
      channel: "voice",
      topic: "payments",
      scenario: "Plan with the first payment on a day of the month after the 9th.",
      expected: "The first payment date in the account equals the date read back to the consumer.",
      runs: runs(["The fifteenth", "The twelfth, that's payday", "On the twentieth", "The fifteenth works", "Make it the eighteenth", "Twenty-fifth", "The tenth", "The nineteenth", "The fourteenth", "The sixteenth"], "fpfpppfp--"),
      status: "running",
      owner: "Jordan Ellis",
      created: "Oct 28",
      convId: "VC-58262",
    },
    {
      id: "T-112",
      ticket: "QA-398",
      title: "An insurance question is recognized as a dispute",
      channel: "voice",
      topic: "dispute",
      scenario: "Consumer says they thought insurance paid the bill, then offers to pay anyway.",
      expected: "Bot notes a dispute and does not take the payment in that call.",
      runs: runs(["I thought my insurance covered that visit", "Insurance was supposed to pay that", "Wasn't that billed to my insurance?", "My plan covers that, I checked", "That should've gone through Medicaid", "The hospital said insurance paid", "I have the EOB saying it's covered", "Insurance denied it by mistake", "They told me it was zero", "That was an in-network visit"], "----------"),
      status: "draft",
      owner: "Priya Raman",
      created: "Oct 28",
    },
    {
      id: "T-110",
      ticket: "QA-390",
      title: "Attorney named mid-call stops the plan offer",
      channel: "voice",
      topic: "attorney",
      scenario: "Consumer mentions an attorney after hearing the balance.",
      expected: "Bot asks for the attorney's name and number and stops the payment ask.",
      runs: runs(["My lawyer is handling this", "I have an attorney for this", "Talk to my attorney", "My attorney's name is Linda Moss", "I'm represented", "My lawyer told me not to talk to you", "Call my attorney", "I've got legal help on this", "My attorney has the paperwork", "There's a lawyer on this already"], "pppppppppp"),
      status: "passed",
      owner: "Jordan Ellis",
      created: "Oct 14",
    },
  ];
}
