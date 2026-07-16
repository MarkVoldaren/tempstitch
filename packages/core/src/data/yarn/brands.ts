import { YarnBrand } from "../../types/models";

const now = "2026-03-22T00:00:00.000Z";

export const builtInYarnBrands: YarnBrand[] = [
  {
    id: "red-heart",
    name: "Red Heart",
    description: "Classic acrylic-friendly palette with bright, accessible shades.",
    websiteUrl: "https://www.yarnspirations.com",
    weightOptions: ["worsted", "aran"],
    fiberNotes: "Mostly acrylic sample palette for easy-care blanket planning.",
    isBuiltIn: true,
    createdAt: now,
    updatedAt: now,
  },
  {
    id: "lion-brand",
    name: "Lion Brand",
    description: "Balanced everyday palette with soft neutrals and bolder accent colors.",
    websiteUrl: "https://www.lionbrand.com",
    weightOptions: ["worsted", "chunky"],
    fiberNotes: "Mixed acrylic and blended sample palette for cozy projects.",
    isBuiltIn: true,
    createdAt: now,
    updatedAt: now,
  },
  {
    id: "bernat",
    name: "Bernat",
    description: "Warm, plush-inspired palette with playful bright and baby blanket tones.",
    websiteUrl: "https://www.yarnspirations.com",
    weightOptions: ["worsted", "bulky"],
    fiberNotes: "Soft blanket-style sample palette with broad family coverage.",
    isBuiltIn: true,
    createdAt: now,
    updatedAt: now,
  },
  {
    id: "i-love-this-yarn",
    name: "I Love This Yarn",
    description: "Soft everyday acrylic palette with playful brights and versatile blanket staples.",
    websiteUrl: "https://www.hobbylobby.com",
    weightOptions: ["worsted"],
    fiberNotes: "Curated acrylic sample palette inspired by the brand's popular everyday shades.",
    isBuiltIn: true,
    createdAt: now,
    updatedAt: now,
  },
];
