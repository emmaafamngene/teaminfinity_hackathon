export const categories = [
  "All",
  "Food & drinks",
  "Design & tech",
  "Fashion & beauty",
  "Learning",
  "Everyday services",
  "Digital platforms",
] as const;
export type Category = Exclude<(typeof categories)[number], "All">;
export type Business = {
  id: string;
  name: string;
  owner: string;
  category: Category;
  description: string;
  price: number;
  emoji: string;
  color: string;
  tags: string[];
  phone?: string;
  isSample: boolean;
};
export const sampleBusinesses: Business[] = [
  {
    id: "pixel",
    name: "Pixel & Purpose",
    owner: "Amara O. · Year 3",
    category: "Design & tech",
    description:
      "Eye-catching flyers, brand identities and social content for your next big idea.",
    price: 3500,
    emoji: "✦",
    color: "#d7cce9",
    tags: [
      "flyer",
      "graphic",
      "design",
      "event",
      "poster",
      "logo",
      "branding",
      "portfolio",
    ],
    isSample: true,
  },
  {
    id: "bowl",
    name: "The Bowl Club",
    owner: "Chisom E. · Year 2",
    category: "Food & drinks",
    description:
      "Fresh rice bowls and comfort food, delivered right to your hostel.",
    price: 2500,
    emoji: "🍜",
    color: "#ead3b8",
    tags: ["lunch", "dinner", "food", "rice", "delivery", "hungry", "meal"],
    isSample: true,
  },
  {
    id: "threads",
    name: "Threads by Teni",
    owner: "Teni A. · Year 4",
    category: "Fashion & beauty",
    description:
      "Curated thrift finds and everyday staples. Good style, student prices.",
    price: 4000,
    emoji: "👕",
    color: "#cdddcf",
    tags: ["clothes", "fashion", "thrift", "outfit", "shirt", "wear"],
    isSample: true,
  },
  {
    id: "tutor",
    name: "Study Buddy",
    owner: "Daniel K. · Year 3",
    category: "Learning",
    description:
      "One-to-one maths and economics tutoring that makes the tough topics click.",
    price: 2000,
    emoji: "📚",
    color: "#e4dfa9",
    tags: ["math", "calculus", "tutor", "study", "exam", "economics", "learn"],
    isSample: true,
  },
  {
    id: "lens",
    name: "Lens by Leo",
    owner: "Leo M. · Year 2",
    category: "Everyday services",
    description:
      "Portraits, birthdays and campus events. Your moments, beautifully captured.",
    price: 5000,
    emoji: "📷",
    color: "#ccd9e3",
    tags: ["photo", "photography", "portrait", "birthday", "event", "shoot"],
    isSample: true,
  },
  {
    id: "braids",
    name: "Braids & Beyond",
    owner: "Zara I. · Year 3",
    category: "Fashion & beauty",
    description:
      "Protective styles, neat braids and a fresh look without leaving campus.",
    price: 6000,
    emoji: "✿",
    color: "#efced5",
    tags: ["hair", "braids", "beauty", "style", "salon"],
    isSample: true,
  },
  {
    id: "code",
    name: "Code Corner",
    owner: "Victor N. · Year 4",
    category: "Design & tech",
    description:
      "Landing pages and websites for student projects and growing businesses.",
    price: 15000,
    emoji: "⌘",
    color: "#c6d6bf",
    tags: ["website", "web", "app", "code", "developer", "landing", "tech"],
    isSample: true,
  },
  {
    id: "laundry",
    name: "Fresh Fold",
    owner: "Femi B. · Year 2",
    category: "Everyday services",
    description:
      "Laundry pickup, careful washing and crisp ironing. Get your weekend back.",
    price: 1500,
    emoji: "🧺",
    color: "#cce4e1",
    tags: ["laundry", "wash", "iron", "clean", "pickup"],
    isSample: true,
  },
  {
    id: "cakes",
    name: "Crumbs & Co.",
    owner: "Ada U. · Year 3",
    category: "Food & drinks",
    description:
      "Cupcakes, cookies and custom celebration cakes baked with a little love.",
    price: 1800,
    emoji: "🧁",
    color: "#eed9c5",
    tags: ["cake", "birthday", "cookies", "snack", "bake", "sweet"],
    isSample: true,
  },
  {
    id: "notes",
    name: "PAU Notes",
    owner: "Michael S. · Year 3",
    category: "Digital platforms",
    description:
      "A student-built hub for organising study resources and revision notes.",
    price: 0,
    emoji: "▤",
    color: "#d6d1e8",
    tags: ["notes", "revision", "resource", "study", "digital", "platform"],
    isSample: true,
  },
  {
    id: "print",
    name: "Print Sprint",
    owner: "Ife O. · Year 2",
    category: "Everyday services",
    description:
      "Assignments, posters and binding, ready when your deadline needs them.",
    price: 100,
    emoji: "🖨️",
    color: "#e0ddce",
    tags: ["print", "printing", "assignment", "binding", "poster", "paper"],
    isSample: true,
  },
  {
    id: "fitness",
    name: "Move with May",
    owner: "May E. · Year 4",
    category: "Everyday services",
    description:
      "Friendly fitness sessions and beginner workout plans that fit student life.",
    price: 1500,
    emoji: "⚡",
    color: "#dce6b9",
    tags: ["fitness", "workout", "gym", "exercise", "train"],
    isSample: true,
  },
];
export function formatPrice(price: number) {
  return price === 0 ? "Free" : `₦${price.toLocaleString("en-NG")}`;
}
export function searchBusinesses(
  businesses: Business[],
  query: string,
  category: string,
) {
  const text = query.trim().toLowerCase();
  return businesses.filter(
    (b) =>
      (category === "All" || b.category === category) &&
      `${b.name} ${b.description} ${b.category} ${b.tags.join(" ")}`
        .toLowerCase()
        .includes(text),
  );
}
const ignored = new Set([
  "i",
  "a",
  "an",
  "the",
  "to",
  "for",
  "my",
  "me",
  "need",
  "someone",
  "with",
  "help",
  "want",
  "tomorrow",
  "please",
  "and",
  "of",
  "on",
]);
export function recommendBusinesses(businesses: Business[], request: string) {
  const words = [
    ...new Set(request.toLowerCase().match(/[a-z]+/g) ?? []),
  ].filter((w) => !ignored.has(w) && w.length > 2);
  return businesses
    .map((b) => {
      const tags = b.tags.join(" ");
      const text = `${b.name} ${b.description} ${b.category}`.toLowerCase();
      const matched = words.filter((w) => tags.includes(w) || text.includes(w));
      return {
        business: b,
        score: matched.reduce((n, w) => n + (tags.includes(w) ? 3 : 1), 0),
        matched,
      };
    })
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 6);
}
export function isBusiness(value: unknown): value is Business {
  if (!value || typeof value !== "object") return false;
  const b = value as Business;
  return (
    typeof b.id === "string" &&
    typeof b.name === "string" &&
    typeof b.owner === "string" &&
    typeof b.description === "string" &&
    categories.slice(1).includes(b.category) &&
    typeof b.price === "number" &&
    Number.isFinite(b.price) &&
    b.price >= 0 &&
    typeof b.emoji === "string" &&
    /^#[0-9a-f]{6}$/i.test(b.color) &&
    Array.isArray(b.tags) &&
    b.tags.every((t) => typeof t === "string") &&
    b.isSample === false &&
    (b.phone === undefined || /^\d{10,15}$/.test(b.phone))
  );
}
