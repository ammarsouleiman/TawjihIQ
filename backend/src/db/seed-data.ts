// Seed content for the TawjihIQ database.
// This is real reference content (majors, market data, scholarships),
// not per-user data. It is inserted once when the DB is empty.

export type MajorSeed = {
  id: string;
  name: string;
  match: number;
  category: string;
  why: string;
  skills: string[];
  careers: string[];
  difficulty: "Moderate" | "Challenging" | "Intensive";
  localDemand: number;
  globalDemand: number;
  salary: "Medium" | "High" | "Very High";
  duration: string;
  overview: string;
  personality: string;
  subjects: string[];
  universities: string[];
  pros: string[];
  cons: string[];
  courses: string[];
};

export const majorsSeed: MajorSeed[] = [
  {
    id: "cs",
    name: "Computer Science",
    match: 94,
    category: "IT",
    why: "Your strong problem-solving, math, and technology scores align tightly with the analytical core of computer science.",
    skills: ["Problem Solving", "Programming", "Math", "Logic"],
    careers: ["Software Engineer", "AI Engineer", "Data Scientist", "Backend Developer"],
    difficulty: "Challenging",
    localDemand: 88,
    globalDemand: 96,
    salary: "Very High",
    duration: "4 years",
    overview:
      "Computer Science covers algorithms, software design, data structures, and intelligent systems. It's the backbone of nearly every modern industry.",
    personality: "Analytical, curious, independent problem-solver",
    subjects: ["Mathematics", "Physics", "Logic", "English"],
    universities: ["American University of Beirut", "Lebanese American University", "Université Saint-Joseph"],
    pros: ["Highest global demand", "Remote-friendly", "Excellent salary growth"],
    cons: ["Steep learning curve", "Requires continuous upskilling"],
    courses: ["CS50 by Harvard", "Meta Front-End Certificate", "DeepLearning.AI"],
  },
  {
    id: "ba",
    name: "Business Analytics",
    match: 89,
    category: "Business",
    why: "You combine strong analysis with communication — ideal for turning data into business decisions.",
    skills: ["Analysis", "Communication", "Statistics", "Visualization"],
    careers: ["Business Analyst", "Data Analyst", "Product Analyst", "Consultant"],
    difficulty: "Moderate",
    localDemand: 82,
    globalDemand: 90,
    salary: "High",
    duration: "3-4 years",
    overview:
      "Business Analytics blends business strategy with data analysis to help organizations make smarter, evidence-based decisions.",
    personality: "Practical, communicative, detail-oriented",
    subjects: ["Mathematics", "Economics", "Statistics", "English"],
    universities: ["Lebanese American University", "American University of Beirut"],
    pros: ["Versatile across industries", "Strong hiring pipeline"],
    cons: ["Heavy on statistics", "Competitive entry roles"],
    courses: ["Google Data Analytics", "Tableau Fundamentals"],
  },
  {
    id: "is",
    name: "Information Systems",
    match: 86,
    category: "IT",
    why: "A balanced fit between your technology aptitude and interest in business operations.",
    skills: ["Systems Thinking", "Technology", "Communication", "Management"],
    careers: ["IT Consultant", "Systems Analyst", "Product Manager", "ERP Specialist"],
    difficulty: "Moderate",
    localDemand: 79,
    globalDemand: 84,
    salary: "High",
    duration: "4 years",
    overview:
      "Information Systems bridges technology and business, focusing on how organizations use software and data to operate efficiently.",
    personality: "Organized, collaborative, tech-savvy",
    subjects: ["Mathematics", "Business", "English"],
    universities: ["Notre Dame University", "American University of Beirut"],
    pros: ["Bridges tech and business", "Broad career paths"],
    cons: ["Less specialized than CS"],
    courses: ["IBM IT Support", "Agile Foundations"],
  },
  {
    id: "dm",
    name: "Digital Marketing",
    match: 81,
    category: "Business",
    why: "Your creativity and communication strengths pair well with data-driven marketing.",
    skills: ["Creativity", "Communication", "Analytics", "Writing"],
    careers: ["Growth Marketer", "Content Strategist", "SEO Specialist", "Social Media Manager"],
    difficulty: "Moderate",
    localDemand: 76,
    globalDemand: 85,
    salary: "Medium",
    duration: "3 years",
    overview:
      "Digital Marketing focuses on reaching and converting audiences across digital channels using content, data, and campaigns.",
    personality: "Creative, expressive, adaptable",
    subjects: ["English", "Design", "Psychology"],
    universities: ["Lebanese American University", "Notre Dame University"],
    pros: ["Remote-friendly", "Fast entry into freelancing"],
    cons: ["Rapidly changing tools", "Results-driven pressure"],
    courses: ["Google Digital Garage", "HubSpot Content Marketing"],
  },
  {
    id: "ie",
    name: "Industrial Engineering",
    match: 78,
    category: "Engineering",
    why: "Strong math and leadership scores fit the optimization and process focus of this field.",
    skills: ["Math", "Optimization", "Leadership", "Analysis"],
    careers: ["Process Engineer", "Operations Manager", "Supply Chain Analyst"],
    difficulty: "Challenging",
    localDemand: 70,
    globalDemand: 80,
    salary: "High",
    duration: "5 years",
    overview:
      "Industrial Engineering optimizes complex systems, processes, and organizations to improve efficiency and reduce waste.",
    personality: "Systematic, leadership-driven, analytical",
    subjects: ["Mathematics", "Physics", "Statistics"],
    universities: ["American University of Beirut", "Lebanese University"],
    pros: ["Applicable across manufacturing & services", "Leadership track"],
    cons: ["Longer degree", "Math-intensive"],
    courses: ["Lean Six Sigma", "Supply Chain Analytics"],
  },
];

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
