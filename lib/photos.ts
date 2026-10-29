// Unsplash photo ids, picked from contact sheets and checked to answer 200
export const photo = (id: string, w: number, h: number, face = false) =>
  `https://images.unsplash.com/photo-${id}?w=${w}&h=${h}&fit=crop${face ? "&crop=faces" : ""}&q=80&auto=format`;

export const AVATARS = {
  me: "1568602471122-7832951cc4c5",
  dana: "1573497019940-1c28c88b4f3e",
  priya: "1573497161161-c3e73707e25c",
  marcus: "1790596684821-9267d0178fff",
  elena: "1758691737605-69a0e78bd193",
  robert: "1738566061883-1b568c74b550",
  tom: "1588178454780-441fa5b99fa5",
};

/** people reaching out at different hours, on the dial and on the hours strip */
export const MOMENTS = [
  { id: "1738728227418-7b45fac2bcf9", from: 0, to: 6, label: "Midnight to 6 AM", alt: "A nurse on a break at the end of a night shift" },
  { id: "1714646793621-0d0c96a551fb", from: 6, to: 11, label: "6 to 11 AM", alt: "A parent on the phone at a laptop while a toddler plays" },
  { id: "1758521961483-30f5908b9c93", from: 11, to: 14, label: "11 AM to 2 PM", alt: "A man checking his phone in a parked car on his lunch break" },
  { id: "1654931801074-42933341e31a", from: 14, to: 18, label: "2 to 6 PM", alt: "An older man at his desk reading a bill" },
  { id: "1701010886917-d46828106845", from: 18, to: 21, label: "6 to 9 PM", alt: "A woman on her couch in the evening, looking at her phone" },
  { id: "1517940322679-2b003a168fd2", from: 21, to: 24, label: "After 9 PM", alt: "A woman at a table late at night, looking down at her phone" },
];

/** the three that float over the dial */
export const DIAL_MOMENTS = [
  { id: "1714646793621-0d0c96a551fb", hour: 8.5, label: "8:30 AM" },
  { id: "1654931801074-42933341e31a", hour: 15.5, label: "3:30 PM" },
  { id: "1517940322679-2b003a168fd2", hour: 23.2, label: "11:12 PM" },
];

export const WORK = {
  reviewer: "1758598306535-93877d73892d",
  meeting: "1632835254999-b0041c859303",
  sheet: "1784334312040-5b3d4cf78b88",
};
