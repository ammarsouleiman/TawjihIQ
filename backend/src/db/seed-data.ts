// Seed content for the TawjihIQ database.
// This file only contains static configuration and non-AI fallback lists
// used outside of major recommendations.

export type MarketFieldSeed = { name: string; demand: number; trend: string };

export const marketFieldsSeed: MarketFieldSeed[] = [
  { name: "Software Development", demand: 92, trend: "+18%" },
  { name: "Data Analytics", demand: 88, trend: "+22%" },
  { name: "Digital Marketing", demand: 79, trend: "+12%" },
  { name: "Healthcare", demand: 84, trend: "+9%" },
  { name: "Engineering", demand: 74, trend: "+6%" },
  { name: "Accounting & Finance", demand: 71, trend: "+4%" },
  { name: "Education", demand: 65, trend: "+3%" },
  { name: "Remote Freelancing", demand: 90, trend: "+27%" },
];

export type ScholarshipSeed = {
  id: string;
  title: string;
  org: string;
  type: string;
  deadline: string;
  country: string;
  tag: string;
};

export const scholarshipsSeed: ScholarshipSeed[] = [
  { id: "1", title: "AUB Merit Scholarship", org: "American University of Beirut", type: "Scholarship", deadline: "Aug 15, 2026", country: "Lebanon", tag: "Up to 75% tuition" },
  { id: "2", title: "Google STEP Internship", org: "Google", type: "Internship", deadline: "Sep 01, 2026", country: "Remote", tag: "Paid" },
  { id: "3", title: "Erasmus+ Exchange", org: "European Union", type: "Program", deadline: "Oct 20, 2026", country: "Europe", tag: "Fully funded" },
  { id: "4", title: "LAU Open Day", org: "Lebanese American University", type: "Open Day", deadline: "Jul 28, 2026", country: "Lebanon", tag: "Free entry" },
];

// Static configuration lists (assessment options / prompt suggestions).
export const skillsListSeed = [
  "Communication",
  "Problem Solving",
  "Math",
  "Creativity",
  "Leadership",
  "Technology",
  "Analysis",
  "Teamwork",
  "Public Speaking",
  "Writing",
];

export const fieldChipsSeed = [
  "Technology",
  "Business",
  "Medicine",
  "Engineering",
  "Arts",
  "Education",
  "Law",
  "Science",
  "Media",
];

export const chatSuggestionsSeed = [
  "Should I choose Computer Science or Business?",
  "What major fits my personality?",
  "What can I study if I like biology?",
  "Which majors have remote job potential?",
];
