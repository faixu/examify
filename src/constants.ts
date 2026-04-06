import { Category } from "./types";

export const CATEGORIES: Category[] = [
  {
    id: "gk",
    name: "General Knowledge (GK)",
    description: "History, Geography, Polity, Economy, Static GK, Science",
    topics: [
      { id: "history", name: "History", description: "Ancient, Medieval, Modern" },
      { id: "geography", name: "Geography", description: "India + World" },
      { id: "polity", name: "Polity", description: "Indian Constitution & Governance" },
      { id: "economy", name: "Economy", description: "Indian Economy & Concepts" },
      { id: "static-gk", name: "Static GK", description: "Facts, Places, Personalities" },
      { id: "science", name: "Science", description: "Physics, Chemistry, Biology" },
    ],
  },
  {
    id: "ga",
    name: "General Awareness (GA)",
    description: "Current Affairs, Schemes, Awards, Sports",
    topics: [
      { id: "current-affairs", name: "Current Affairs", description: "Monthly + Yearly" },
      { id: "govt-schemes", name: "Government Schemes", description: "Central & State Schemes" },
      { id: "awards", name: "Awards & Honors", description: "National & International" },
      { id: "sports", name: "Sports", description: "Events, Players, Records" },
      { id: "important-days", name: "Important Days", description: "Dates & Themes" },
    ],
  },
  {
    id: "english",
    name: "English",
    description: "Grammar, Vocabulary, Comprehension",
    topics: [
      { id: "grammar", name: "Grammar", description: "Tenses, Articles, Prepositions" },
      { id: "vocabulary", name: "Vocabulary", description: "Synonyms/Antonyms" },
      { id: "error-detection", name: "Error Detection", description: "Sentence Correction" },
      { id: "fill-blanks", name: "Fill in the Blanks", description: "Contextual Completion" },
      { id: "comprehension", name: "Comprehension", description: "Reading & Analysis" },
    ],
  },
  {
    id: "math",
    name: "Mathematics",
    description: "Arithmetic, Algebra, Geometry, DI",
    topics: [
      { id: "arithmetic", name: "Arithmetic", description: "Percentage, Profit/Loss, Ratio" },
      { id: "algebra", name: "Algebra", description: "Equations, Identities" },
      { id: "geometry", name: "Geometry", description: "Shapes, Theorems" },
      { id: "trigonometry", name: "Trigonometry", description: "Ratios, Identities" },
      { id: "di", name: "Data Interpretation", description: "Charts, Tables, Graphs" },
      { id: "number-system", name: "Number System", description: "HCF, LCM, Fractions" },
    ],
  },
  {
    id: "reasoning",
    name: "Reasoning",
    description: "Verbal, Non-Verbal, Logical",
    topics: [
      { id: "verbal", name: "Verbal Reasoning", description: "Analogy, Classification" },
      { id: "non-verbal", name: "Non-Verbal Reasoning", description: "Patterns, Series" },
      { id: "logical", name: "Logical Reasoning", description: "Syllogism, Statements" },
      { id: "coding-decoding", name: "Coding-Decoding", description: "Letter/Number Coding" },
      { id: "blood-relations", name: "Blood Relations", description: "Family Trees" },
      { id: "puzzles", name: "Puzzles", description: "Seating Arrangement" },
    ],
  },
  {
    id: "computer",
    name: "Computer Knowledge",
    description: "Basics, MS Office, Internet, Security",
    topics: [
      { id: "basics", name: "Basics of Computer", description: "History, Generations" },
      { id: "ms-office", name: "MS Office", description: "Word, Excel, PPT" },
      { id: "internet", name: "Internet", description: "Browsers, Search Engines" },
      { id: "hardware-software", name: "Hardware & Software", description: "Input/Output, OS" },
      { id: "networking", name: "Networking", description: "LAN, WAN, Protocols" },
      { id: "cyber-security", name: "Cyber Security", description: "Viruses, Firewalls" },
    ],
  },
  {
    id: "jk-gk",
    name: "JK Specific GK",
    description: "History, Geography, Culture of J&K",
    topics: [
      { id: "jk-history", name: "JK History", description: "Ancient to Modern" },
      { id: "jk-geography", name: "JK Geography", description: "Rivers, Lakes, Climate" },
      { id: "jk-polity", name: "JK Polity", description: "Governance & Reorganization" },
      { id: "jk-culture", name: "JK Culture", description: "Festivals, Arts, Crafts" },
      { id: "jk-personalities", name: "Important Personalities", description: "Historical & Modern" },
      { id: "jk-current-affairs", name: "Current Affairs (JK)", description: "Local News & Events" },
    ],
  },
];
