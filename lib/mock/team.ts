import type { Person } from "./types";
import { AVATARS } from "../photos";

export const TEAM: Person[] = [
  { id: "me", name: "Jordan Ellis", role: "QA reviewer", team: "qa", photo: AVATARS.me },
  { id: "dana", name: "Dana Whitfield", role: "QA lead", team: "qa", photo: AVATARS.dana },
  { id: "priya", name: "Priya Raman", role: "QA reviewer", team: "qa", photo: AVATARS.priya },
  { id: "marcus", name: "Marcus Bell", role: "Vendor QA", team: "vendor", photo: AVATARS.marcus },
  { id: "elena", name: "Elena Park", role: "Bot developer", team: "dev", photo: AVATARS.elena },
  { id: "robert", name: "Robert Haines", role: "Compliance manager", team: "compliance", photo: AVATARS.robert },
  { id: "tom", name: "Tom Alvarez", role: "Product owner", team: "product", photo: AVATARS.tom },
];

export const person = (name: string) => TEAM.find((p) => p.name === name);
