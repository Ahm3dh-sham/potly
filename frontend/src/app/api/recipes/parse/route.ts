import { NextResponse } from "next/server";
import type {
  AisleCategory,
  NormalizedIngredient,
  ParallelTimelineNode,
  Recipe,
  RecipeParseRequest,
  RecipeSourceType,
} from "@/types/recipe";

export const runtime = "nodejs";

function inferAisle(name: string): AisleCategory {
  const lower = name.toLowerCase();
  if (/(paneer|milk|curd|dahi|yogurt|butter|ghee|cream|cheese)/.test(lower)) {
    return "dairy_eggs";
  }
  if (/(chicken|fish|prawn|mutton|egg|meat|seafood)/.test(lower)) {
    return "meat_seafood";
  }
  if (
    /(cumin|jeera|turmeric|haldi|chili|mirch|masala|hing|coriander powder|garam|cardamom|clove|cinnamon|mustard seed|spice|salt|pepper|kasuri)/.test(
      lower
    )
  ) {
    return "spices_masalas";
  }
  if (/(oil|olive|mustard oil|sesame oil)/.test(lower)) {
    return "spices_oils";
  }
  if (
    /(onion|tomato|palak|spinach|garlic|ginger|chili|coriander leaf|cilantro|potato|aloo|peas|carrot|beans|lemon|mint|cabbage|cauliflower|okra|bhindi|brinjal)/.test(
      lower
    )
  ) {
    return "produce";
  }
  if (/(naan|roti|bread|bun|pav|kulcha|parotta)/.test(lower)) {
    return "bakery_bread";
  }
  return "pantry_dry";
}

function makeIngredient(
  name: string,
  quantity: number,
  unit: string,
  preparation_note: string | null = null,
  gramsOverride?: number
): NormalizedIngredient {
  const cleanName = name.trim();
  const lower = cleanName.toLowerCase();
  const aisle = inferAisle(cleanName);
  const grams =
    gramsOverride ??
    (unit === "g"
      ? quantity
      : unit === "ml"
        ? quantity
        : unit === "katori"
          ? Math.round(quantity * 150)
          : unit === "cup"
            ? Math.round(quantity * 240)
            : unit === "tbsp"
              ? Math.round(quantity * 15)
              : unit === "tsp"
                ? Math.round(quantity * 5)
                : Math.round(quantity * 90));

  const isDairy = aisle === "dairy_eggs";
  const isMeat = aisle === "meat_seafood";
  const isSpice = aisle === "spices_masalas";
  const isOil = aisle === "spices_oils" || /ghee|butter|cream|oil/.test(lower);

  const protein = /paneer|chicken|fish|mutton|egg|prawn/.test(lower)
    ? Math.round(grams * 0.2)
    : /dal|lentil|chana|chickpea|rajma|besan|curd|dahi/.test(lower)
      ? Math.round(grams * 0.14)
      : isSpice
        ? 1
        : Math.round(grams * 0.02);

  const fat = isOil
    ? Math.round(grams * 0.85)
    : /paneer|mutton|curd/.test(lower)
      ? Math.round(grams * 0.16)
      : Math.round(grams * 0.015);

  const carbs = isOil
    ? 0
    : /dal|rice|chana|rajma|flour|atta|besan|potato|aloo/.test(lower)
      ? Math.round(grams * 0.55)
      : isSpice
        ? Math.round(grams * 0.35)
        : Math.round(grams * 0.06);

  const calories = Math.max(12, Math.round(protein * 4 + carbs * 4 + fat * 9));
  const cost = isMeat
    ? Math.max(40, Math.round(grams * 0.45))
    : /paneer|cashew|kaju|almond/.test(lower)
      ? Math.max(30, Math.round(grams * 0.42))
      : isSpice
        ? 12
        : Math.max(15, Math.round(grams * 0.12));

  const flags: string[] = ["gluten-free"];
  if (!isMeat) flags.push("vegetarian");
  if (!isMeat && !isDairy) flags.push("vegan", "dairy-free");
  if (!/(onion|garlic|lasoon|potato|aloo)/.test(lower)) {
    flags.push("jain-friendly");
  }

  return {
    name: cleanName,
    quantity: Number(quantity.toFixed(2)),
    unit,
    aisle_category: aisle,
    preparation_note,
    nutrition_meta: {
      calories_kcal: calories,
      protein_g: protein,
      carbs_g: carbs,
      fat_g: fat,
      fiber_g: aisle === "produce" || /dal|chana/.test(lower) ? 4 : 0.5,
      estimated_cost_inr: cost,
      grams_equivalent: Math.max(5, grams),
      allergens: isDairy ? ["dairy"] : [],
      dietary_flags: flags,
    },
  };
}

function parseIngredientLine(rawLine: string): NormalizedIngredient {
  const cleaned = rawLine.replace(/^[-*•\d.)\s]+/, "").trim();
  const match = cleaned.match(
    /^(\d+(?:\.\d+)?)\s*(katori|cups?|tbsps?|tsps?|ml|g|grams?|pieces?|pcs?|cloves?|inch)?\s+(.+)$/i
  );

  if (match) {
    const qty = Number(match[1]) || 1;
    const rawUnit = (match[2] ?? "piece").toLowerCase();
    const unit = rawUnit.startsWith("gram")
      ? "g"
      : rawUnit.startsWith("tbsp")
        ? "tbsp"
        : rawUnit.startsWith("tsp")
          ? "tsp"
          : rawUnit.startsWith("cup")
            ? "cup"
            : rawUnit.startsWith("piece") || rawUnit.startsWith("pc")
              ? "piece"
              : rawUnit;
    const rest = (match[3] ?? cleaned).trim();
    const parts = rest.split(",");
    const ingName = (parts[0] ?? rest).trim();
    const prepNote = parts.length > 1 ? parts.slice(1).join(",").trim() : null;
    return makeIngredient(ingName, qty, unit, prepNote);
  }

  const parts = cleaned.split(",");
  return makeIngredient(
    (parts[0] ?? cleaned).trim(),
    1,
    "piece",
    parts.length > 1 ? parts.slice(1).join(",").trim() : null
  );
}

function applyDietaryAdaptation(
  title: string,
  ingredients: NormalizedIngredient[],
  steps: ParallelTimelineNode[],
  adaptation?: string | null
): {
  title: string;
  ingredients: NormalizedIngredient[];
  steps: ParallelTimelineNode[];
  tags: string[];
  remixMode: string | null;
  remixNote: string | null;
} {
  if (!adaptation || !adaptation.trim()) {
    return {
      title,
      ingredients,
      steps,
      tags: ["imported", "home-cooked"],
      remixMode: null,
      remixNote: null,
    };
  }

  const lower = adaptation.toLowerCase();
  let nextIngs = [...ingredients];
  let nextSteps = [...steps];
  let nextTitle = title;
  const tags = ["imported", "adapted"];
  let remixMode: string | null = "custom";

  if (lower.includes("jain") || lower.includes("no onion")) {
    remixMode = "jain_no_onion_garlic";
    nextTitle = `${title} (Jain Edition)`;
    tags.push("jain-friendly", "no-onion-garlic");
    nextIngs = nextIngs.map((ing) => {
      const n = ing.name.toLowerCase();
      if (n.includes("onion") || n.includes("garlic")) {
        return makeIngredient(
          "asafoetida (hing) & grated fresh ginger",
          1,
          "tsp",
          "Jain-friendly aromatic swap for onion/garlic",
          15
        );
      }
      if (n.includes("potato") || n.includes("aloo")) {
        return makeIngredient(
          "steamed raw banana (kaccha kela)",
          ing.quantity,
          ing.unit,
          "diced • root-free Jain swap"
        );
      }
      return ing;
    });
  } else if (lower.includes("vegan")) {
    remixMode = "vegan";
    nextTitle = `${title} (Plant-Based)`;
    tags.push("vegan", "dairy-free");
    nextIngs = nextIngs.map((ing) => {
      const n = ing.name.toLowerCase();
      if (n.includes("paneer")) {
        return makeIngredient(
          "extra-firm organic tofu",
          ing.quantity,
          ing.unit,
          "pressed & cubed • dairy-free swap"
        );
      }
      if (n.includes("ghee") || n.includes("butter")) {
        return makeIngredient(
          "cold-pressed groundnut oil",
          ing.quantity,
          ing.unit,
          "dairy-free tempering swap"
        );
      }
      if (n.includes("cream") || n.includes("curd") || n.includes("dahi")) {
        return makeIngredient(
          "silky soaked cashew cream",
          ing.quantity,
          ing.unit,
          "blended smooth • plant-based richness"
        );
      }
      return ing;
    });
  } else if (lower.includes("protein")) {
    remixMode = "high_protein";
    nextTitle = `${title} (+40% Protein)`;
    tags.push("high-protein");
    nextIngs = [
      ...nextIngs,
      makeIngredient(
        "roasted soya chunks or hung curd booster",
        0.75,
        "katori",
        "added for +22g extra protein",
        110
      ),
    ];
  } else if (lower.includes("air") || lower.includes("less oil")) {
    remixMode = "air_fryer";
    nextTitle = `${title} (Air-Fryer • -65% Oil)`;
    tags.push("air-fryer", "low-oil");
    nextIngs = nextIngs.map((ing) =>
      /oil|ghee|butter/.test(ing.name.toLowerCase())
        ? makeIngredient(
            ing.name,
            1,
            "tsp",
            "light spray coat (-65% oil)",
            5
          )
        : ing
    );
    nextSteps = nextSteps.map((s) =>
      s.track === "active_cook"
        ? {
            ...s,
            instruction: `${s.instruction} (Cook in pre-heated 195°C Air-Fryer basket with minimal oil brush.)`,
            equipment: ["Air-Fryer Basket"],
          }
        : s
    );
  }

  return {
    title: nextTitle,
    ingredients: nextIngs,
    steps: nextSteps,
    tags,
    remixMode,
    remixNote: adaptation.trim(),
  };
}

function defaultStepsForDish(
  title: string,
  ingredients: NormalizedIngredient[]
): ParallelTimelineNode[] {
  const ingNames = ingredients.slice(0, 3).map((i) => i.name);
  return [
    {
      step_number: 1,
      title: "Mise en Place & Chopping",
      instruction: `Measure all ingredients for ${title} into katoris, finely chop aromatics, and keep whole spices ready by the stove.`,
      track: "prep",
      duration_seconds: 360,
      start_offset_seconds: 0,
      depends_on_steps: [],
      equipment: ["Chef's Knife", "Mixing Bowls"],
      ingredient_names: ingNames,
      timer_label: "Prep (6m)",
      sensory_cue: "Ingredients portioned and aromatics finely diced",
    },
    {
      step_number: 2,
      title: "Temper Whole Spices & Sear Base",
      instruction:
        "Warm ghee or oil in a heavy pan over medium heat, crackle cumin and whole spices until fragrant, then sauté the base until deeply golden.",
      track: "active_cook",
      duration_seconds: 480,
      start_offset_seconds: 360,
      depends_on_steps: [1],
      equipment: ["Heavy Kadhai / Skillet"],
      ingredient_names: ingNames,
      timer_label: "Sauté Base (8m)",
      sensory_cue: "Warm roasted aroma with glossy edges",
    },
    {
      step_number: 3,
      title: "Simmer & Blend Flavors",
      instruction:
        "Cover and simmer gently so textures turn tender and spices infuse evenly without scorching.",
      track: "passive_wait",
      duration_seconds: 600,
      start_offset_seconds: 840,
      depends_on_steps: [2],
      equipment: ["Covered Lid"],
      ingredient_names: ingNames,
      timer_label: "Simmer (10m)",
      sensory_cue: "Steady gentle bubbles and rich color",
    },
    {
      step_number: 4,
      title: "Finish, Garnish & Serve Hot",
      instruction:
        "Adjust salt and acidity to taste, fold in fresh herbs, and serve piping hot.",
      track: "plating",
      duration_seconds: 120,
      start_offset_seconds: 1440,
      depends_on_steps: [3],
      equipment: ["Serving Bowl"],
      ingredient_names: [],
      timer_label: null,
      sensory_cue: "Vibrant color and fresh herb aroma",
    },
  ];
}

function inferCurated3DImage(title: string, cuisine = ""): string | null {
  const lower = `${title} ${cuisine}`.toLowerCase();
  if (/(mutton|lamb|goat|kulambu|kuzhambu|chettinad|rogan josh|keema|nihari|sukha|chukka)/i.test(lower)) {
    return "/recipes/mutton-kulambu-3d.jpg";
  }
  if (/(paneer|kadhai|makhani|butter chicken|korma|kofta|shahi)/i.test(lower)) {
    return "/recipes/paneer-tikka-3d.jpg";
  }
  if (/(dosa|idli|sambar|rasam|tiffin|south|uttapam|vada|pongal|upma)/i.test(lower)) {
    return "/recipes/mysore-masala-dosa-3d.jpg";
  }
  if (/(prawn|fish|meen|kerala|malabar|appam|coastal|chemmeen|seafood|crab)/i.test(lower)) {
    return "/recipes/malabar-prawn-appam-3d.jpg";
  }
  if (/(pav|bhaji|mumbai|west|street|chole|chaat|bhature|misal)/i.test(lower)) {
    return "/recipes/mumbai-pav-bhaji-3d.jpg";
  }
  if (/(bengali|east|kolkata|pulao|kosha|soya|biryani|handi)/i.test(lower)) {
    return "/recipes/kolkata-kosha-pulao-3d.jpg";
  }
  if (/(chicken|tikka|tandoori|quinoa|air-fryer|bowl|kebab)/i.test(lower)) {
    return "/recipes/tandoori-chicken-bowl-3d.jpg";
  }
  if (/(dal|palak|thali|rice|moong|khichdi|spinach|toor|rajma)/i.test(lower)) {
    return "/recipes/dal-palak-thali-3d.jpg";
  }
  return null;
}

function inferHeroImageUrl(title: string, cuisine = ""): string {
  return inferCurated3DImage(title, cuisine) ?? "/recipes/paneer-tikka-3d.jpg";
}

async function fetchDishPhotoByTitle(title: string): Promise<string | null> {
  const clean = title
    .replace(/\([^)]*\)/g, " ")
    .replace(/[^a-zA-Z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!clean || clean.length < 3) return null;

  // 1. Check TheMealDB public API for real plated food photography
  try {
    const words = clean.split(" ").slice(0, 3).join(" ");
    const mealRes = await fetch(
      `https://www.themealdb.com/api/json/v1/1/search.php?s=${encodeURIComponent(words)}`,
      { signal: AbortSignal.timeout(2500) }
    );
    if (mealRes.ok) {
      const data = (await mealRes.json()) as {
        meals?: Array<{ strMealThumb?: string }>;
      };
      const thumb = data.meals?.[0]?.strMealThumb;
      if (thumb && /^https?:\/\//i.test(thumb)) return thumb;
    }
  } catch {
    // fall through to Wikimedia Commons
  }

  // 2. Check Wikimedia Commons food image search
  try {
    const wikiRes = await fetch(
      `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(`${clean} dish`)}&gsrnamespace=6&gsrlimit=3&prop=imageinfo&iiprop=url&iiurlwidth=800&format=json&origin=*`,
      { signal: AbortSignal.timeout(2500) }
    );
    if (wikiRes.ok) {
      const data = (await wikiRes.json()) as {
        query?: {
          pages?: Record<
            string,
            { imageinfo?: Array<{ thumburl?: string; url?: string }> }
          >;
        };
      };
      const pages = Object.values(data.query?.pages ?? {});
      for (const page of pages) {
        const imgUrl = page.imageinfo?.[0]?.thumburl ?? page.imageinfo?.[0]?.url;
        if (imgUrl && /\.(jpe?g|png|webp)(\?|$)/i.test(imgUrl)) {
          return imgUrl;
        }
      }
    }
  } catch {
    // silent fallback
  }

  return null;
}

function buildSmartDishFromTitle(titleHint: string): {
  title: string;
  cuisine: string;
  description: string;
  heroImageUrl: string;
  servings?: number;
  ingredients: NormalizedIngredient[];
  steps: ParallelTimelineNode[];
} {
  const lower = titleHint.toLowerCase();

  // 1. Mutton Kulambu / Chettinad Mutton Curry / Lamb Kuzhambu
  if (/(mutton|lamb|goat|attukari)/i.test(lower) && /(kulambu|kuzhambu|curry|chettinad|gravy|masala)/i.test(lower)) {
    const finalTitle = cleanOrDefaultTitle(
      titleHint,
      "Chettinad Mutton Kulambu (Tamil Nadu)"
    );
    const ings = [
      makeIngredient("bone-in tender mutton cuts", 500, "g", "washed with turmeric & drained"),
      makeIngredient("pearl shallots (chinna vengayam)", 1, "katori", "peeled whole & sliced", 150),
      makeIngredient("country roma tomatoes", 2, "piece", "finely chopped", 180),
      makeIngredient("chettinad kulambu masala (coriander, fennel, black pepper & dry chili)", 3, "tbsp", "freshly dry-roasted & ground", 35),
      makeIngredient("fresh grated coconut & cashew/sombu paste", 0.5, "katori", "ground velvety smooth", 95),
      makeIngredient("ginger-garlic paste", 1.5, "tbsp", "freshly stone-ground", 22),
      makeIngredient("cold-pressed gingelly sesame oil (nallenai) & curry leaves", 2.5, "tbsp", "divided for tempering & finish", 36),
    ];
    const steps: ParallelTimelineNode[] = [
      {
        step_number: 1,
        title: "Marinate Mutton & Grind Fresh Coconut-Spice Paste",
        instruction:
          "Rub bone-in mutton pieces with haldi, salt, and half the ginger-garlic paste. Meanwhile, blend soaked grated coconut, sombu (fennel), and cashews with splash of water into a silky finishing paste.",
        track: "prep",
        duration_seconds: 420,
        start_offset_seconds: 0,
        depends_on_steps: [],
        equipment: ["Mixing Bowl", "Mixer Jar", "Chef's Knife"],
        ingredient_names: [
          "bone-in tender mutton cuts",
          "fresh grated coconut & cashew/sombu paste",
        ],
        timer_label: "Prep & Grind Masala (7m)",
        sensory_cue: "Velvety ivory coconut paste and bright turmeric-coated mutton",
      },
      {
        step_number: 2,
        title: "Crackle Nallenai Tempering & Caramelize Chinna Vengayam",
        instruction:
          "Warm cold-pressed gingelly oil in a heavy pressure cooker or clay chatti; temper kalpasi, fennel seeds, and fresh curry leaves, then sauté sliced pearl shallots and remaining ginger-garlic paste until deeply golden.",
        track: "active_cook",
        duration_seconds: 480,
        start_offset_seconds: 420,
        depends_on_steps: [1],
        equipment: ["Heavy Pressure Cooker", "Wooden Ladle"],
        ingredient_names: [
          "pearl shallots (chinna vengayam)",
          "cold-pressed gingelly sesame oil (nallenai) & curry leaves",
          "ginger-garlic paste",
        ],
        timer_label: "Bhuno Shallots (8m)",
        sensory_cue: "Sweet caramelized shallot and toasted curry-leaf aroma",
      },
      {
        step_number: 3,
        title: "Bhuno Tomatoes, Chettinad Kulambu Masala & Sear Mutton",
        instruction:
          "Add chopped tomatoes and sear until mushy, fold in freshly ground Chettinad kulambu masala and marinated mutton on high heat for 6 minutes until juices seal and masala oil separates.",
        track: "active_cook",
        duration_seconds: 420,
        start_offset_seconds: 900,
        depends_on_steps: [2],
        equipment: ["Pressure Cooker"],
        ingredient_names: [
          "country roma tomatoes",
          "chettinad kulambu masala (coriander, fennel, black pepper & dry chili)",
          "bone-in tender mutton cuts",
        ],
        timer_label: "Sear Mutton & Masala (7m)",
        sensory_cue: "Deep brick-red spice oil shimmering cleanly around seared mutton",
      },
      {
        step_number: 4,
        title: "Pressure Cook 4 Whistles Until Fall-Off-The-Bone Tender",
        instruction:
          "Pour 1.75 katori hot water, seal the cooker, and pressure cook on medium flame for 4–5 whistles (15 minutes) until mutton turns butter-tender and marrow infuses the gravy.",
        track: "passive_wait",
        duration_seconds: 900,
        start_offset_seconds: 1320,
        depends_on_steps: [3],
        equipment: ["Pressure Cooker Lid"],
        ingredient_names: ["bone-in tender mutton cuts"],
        timer_label: "Pressure Cook Mutton (15m)",
        sensory_cue: "Four steady whistles followed by natural steam release",
      },
      {
        step_number: 5,
        title: "Simmer with Coconut Paste & Finish with Crushed Pepper",
        instruction:
          "Swirl in the ground coconut-fennel paste, simmer uncovered for 4 minutes till glossy dark oil floats cleanly on top, and garnish with torn coriander and crushed black pepper.",
        track: "plating",
        duration_seconds: 240,
        start_offset_seconds: 2220,
        depends_on_steps: [4],
        equipment: ["Serving Chatti Pot"],
        ingredient_names: ["fresh grated coconut & cashew/sombu paste"],
        timer_label: "Simmer Finish (4m)",
        sensory_cue: "Rich aromatic kulambu coating the spoon without splitting",
      },
    ];
    return {
      title: finalTitle,
      cuisine: "Tamil Nadu Chettinad",
      description:
        "Slow-simmered bone-in mutton kulambu rich with roasted coriander-fennel-pepper masala, caramelized pearl shallots, coconut paste, and cold-pressed gingelly oil.",
      heroImageUrl: "/recipes/mutton-kulambu-3d.jpg",
      servings: 4,
      ingredients: ings,
      steps,
    };
  }

  // 2. Chicken Kulambu / Chettinad Chicken Curry
  if (/(chicken|kozhi|koli)/i.test(lower) && /(kulambu|kuzhambu|chettinad|curry|gravy)/i.test(lower)) {
    const finalTitle = cleanOrDefaultTitle(
      titleHint,
      "Chettinad Chicken Kulambu"
    );
    const ings = [
      makeIngredient("curry-cut bone-in chicken", 500, "g", "marinated in turmeric & curd"),
      makeIngredient("pearl shallots (chinna vengayam)", 1, "katori", "thinly sliced", 150),
      makeIngredient("roma tomatoes", 2, "piece", "finely chopped", 180),
      makeIngredient("roasted chettinad pepper-fennel-coriander masala", 2.5, "tbsp", "freshly ground", 32),
      makeIngredient("fresh grated coconut paste", 0.5, "katori", "blended velvety smooth", 75),
      makeIngredient("cold-pressed gingelly oil & curry leaves", 2, "tbsp", "for tempering", 30),
    ];
    const steps: ParallelTimelineNode[] = [
      {
        step_number: 1,
        title: "Prep Chicken, Slice Chinna Vengayam & Blend Coconut",
        instruction:
          "Marinate curry-cut chicken with turmeric, ginger-garlic, and salt; slice shallots and grind fresh coconut with fennel seeds.",
        track: "prep",
        duration_seconds: 360,
        start_offset_seconds: 0,
        depends_on_steps: [],
        equipment: ["Mixing Bowl", "Mixer Jar"],
        ingredient_names: ["curry-cut bone-in chicken", "fresh grated coconut paste"],
        timer_label: "Prep & Grind (6m)",
        sensory_cue: "Fragrant fennel-coconut puree",
      },
      {
        step_number: 2,
        title: "Temper Spices & Sauté Shallots Golden",
        instruction:
          "Crackle cinnamon, kalpasi, fennel, and curry leaves in hot gingelly oil; brown shallots and tomatoes till jammy.",
        track: "active_cook",
        duration_seconds: 420,
        start_offset_seconds: 360,
        depends_on_steps: [1],
        equipment: ["Heavy Clay Chatti / Kadhai"],
        ingredient_names: ["pearl shallots (chinna vengayam)", "roma tomatoes"],
        timer_label: "Sauté Base (7m)",
        sensory_cue: "Glossy tomato masala pulling cleanly from the pan",
      },
      {
        step_number: 3,
        title: "Sear Chicken & Simmer Kulambu Covered",
        instruction:
          "Fold in Chettinad spice masala and chicken, sear 5 minutes, add 1.5 katori hot water, cover and simmer 14 minutes until chicken pulls from bone.",
        track: "passive_wait",
        duration_seconds: 840,
        start_offset_seconds: 780,
        depends_on_steps: [2],
        equipment: ["Covered Chatti"],
        ingredient_names: ["curry-cut bone-in chicken", "roasted chettinad pepper-fennel-coriander masala"],
        timer_label: "Simmer Chicken (14m)",
        sensory_cue: "Deep copper-red spice oil shimmering on top",
      },
      {
        step_number: 4,
        title: "Swirl Coconut Paste & Fresh Curry Leaves",
        instruction:
          "Stir in coconut-fennel puree, boil 2 minutes to thicken, top with crisp curry leaves, and serve with parotta or steamed rice.",
        track: "plating",
        duration_seconds: 180,
        start_offset_seconds: 1620,
        depends_on_steps: [3],
        equipment: ["Serving Bowl"],
        ingredient_names: ["fresh grated coconut paste"],
        timer_label: null,
        sensory_cue: "Silky, pepper-fragrant Chettinad gravy",
      },
    ];
    return {
      title: finalTitle,
      cuisine: "South Indian Chettinad",
      description:
        "Peppery Tamil-style chicken kulambu slow-simmered with caramelized shallots, roasted coriander-fennel masala, and silky coconut paste.",
      heroImageUrl: "/recipes/mutton-kulambu-3d.jpg",
      servings: 3,
      ingredients: ings,
      steps,
    };
  }

  // 3. Meen Kulambu / Fish Curry
  if (/(fish|meen|seafood|vanjaram|pomfret)/i.test(lower) && /(kulambu|kuzhambu|curry|masala|mappas|moilee)/i.test(lower)) {
    const finalTitle = cleanOrDefaultTitle(titleHint, "Karaikudi Meen Kulambu (Fish Curry)");
    const ings = [
      makeIngredient("firm seer or king fish steaks", 450, "g", "marinated in turmeric & salt"),
      makeIngredient("aged tamarind pulp (puli) extract", 0.5, "katori", "strained smooth", 85),
      makeIngredient("pearl shallots & peeled garlic pods", 1, "katori", "chopped & halved", 150),
      makeIngredient("country roma tomatoes", 3, "piece", "crushed by hand or pureed", 250),
      makeIngredient("kuzhambu chili-coriander powder & fenugreek", 2.5, "tbsp", "aromatic tangy spice base", 30),
      makeIngredient("cold-pressed gingelly oil & curry leaves", 2.5, "tbsp", "essential for earthen pot finish", 36),
    ];
    return {
      title: finalTitle,
      cuisine: "South Indian Coastal",
      description:
        "Tangy earthen-pot fish kulambu tempered with roasted fenugreek, garlic cloves, shallots, and aged tamarind extract simmered in gingelly oil.",
      heroImageUrl: "/recipes/malabar-prawn-appam-3d.jpg",
      servings: 3,
      ingredients: ings,
      steps: defaultStepsForDish(finalTitle, ings),
    };
  }

  // 4. Biryani (Mutton, Chicken, Paneer, Veg Dum Biryani)
  if (/biryani|biriyani|tehri/i.test(lower)) {
    const isMutton = /(mutton|lamb|goat)/i.test(lower);
    const isVeg = /(veg|paneer|soya|jackfruit|mushroom|subz)/i.test(lower);
    const proteinIng = isMutton
      ? makeIngredient("tender bone-in mutton pieces", 500, "g", "marinated 1 hr in curd & fried onions")
      : isVeg
        ? makeIngredient("malai paneer & seasonal florets", 400, "g", "tossed in spiced curd marinade")
        : makeIngredient("bone-in chicken thighs & drumsticks", 500, "g", "marinated in shahi curd & mint");
    const finalTitle = cleanOrDefaultTitle(titleHint, "Hyderabadi Kacchi Dum Biryani");
    const ings = [
      proteinIng,
      makeIngredient("aged extra-long grain basmati rice", 2, "katori", "soaked 35 mins & parboiled 70%", 300),
      makeIngredient("golden fried onions (birista)", 1, "katori", "crisply caramelized", 110),
      makeIngredient("fresh mint (pudina) & coriander leaves", 1, "katori", "roughly torn", 60),
      makeIngredient("strained curd (dahi) & ginger-garlic paste", 1, "katori", "marinade base", 150),
      makeIngredient("saffron strands steeped in warm milk + cow ghee", 3, "tbsp", "drizzled over top rice layer", 45),
    ];
    const steps: ParallelTimelineNode[] = [
      {
        step_number: 1,
        title: "Soak Basmati Rice & Whisk Dum Marinade",
        instruction:
          "Wash aged basmati rice cleanly and soak 30 minutes; marinate protein/veggies in whisked curd, ginger-garlic, birista onions, mint, garam masala, and lemon.",
        track: "prep",
        duration_seconds: 360,
        start_offset_seconds: 0,
        depends_on_steps: [],
        equipment: ["Deep Handi", "Soaking Bowl"],
        ingredient_names: [proteinIng.name, "aged extra-long grain basmati rice"],
        timer_label: "Marinade & Soak (6m)",
        sensory_cue: "Herb-packed, aromatic creamy marinade",
      },
      {
        step_number: 2,
        title: "Parboil Whole-Spiced Basmati Rice to 70% Doneness",
        instruction:
          "Boil heavily salted water with shahi jeera, bay leaf, green cardamom, and ghee; cook soaked basmati for 5 minutes till grains elongate yet keep a firm center bite, then drain.",
        track: "active_cook",
        duration_seconds: 360,
        start_offset_seconds: 360,
        depends_on_steps: [1],
        equipment: ["Wide Pasta Pot", "Slotted Spider"],
        ingredient_names: ["aged extra-long grain basmati rice"],
        timer_label: "Parboil Basmati (6m)",
        sensory_cue: "Elongated snowy grains snapping slightly at the core",
      },
      {
        step_number: 3,
        title: "Layer Handi & Seal Under Low-Flame Dum Steam",
        instruction:
          "Spread marinated base in heavy handi, blanket with parboiled rice, scatter birista, mint, and saffron-ghee milk; seal tightly with lid and steam on a heavy tawa on low heat for 18 minutes.",
        track: "passive_wait",
        duration_seconds: 1080,
        start_offset_seconds: 720,
        depends_on_steps: [2],
        equipment: ["Heavy Copper/Steel Handi", "Iron Tawa Diffuser"],
        ingredient_names: [
          "golden fried onions (birista)",
          "saffron strands steeped in warm milk + cow ghee",
        ],
        timer_label: "Slow Dum Steam (18m)",
        sensory_cue: "Fragrant saffron-cardamom steam escaping the sealed rim",
      },
      {
        step_number: 4,
        title: "Rest 5 Min, Cut From Edge & Serve with Mirchi Salan",
        instruction:
          "Unseal lid and gently scoop from side-to-bottom so saffron, white, and spiced masala grains cascade onto warm plates with raita.",
        track: "plating",
        duration_seconds: 180,
        start_offset_seconds: 1800,
        depends_on_steps: [3],
        equipment: ["Flat Serving Spoon", "Platter"],
        ingredient_names: ["fresh mint (pudina) & coriander leaves"],
        timer_label: null,
        sensory_cue: "Fluffy separate grains stained saffron-gold",
      },
    ];
    return {
      title: finalTitle,
      cuisine: "Royal Hyderabadi & Awadhi",
      description:
        "Fragrant saffron-infused basmati biryani layered over spiced curd marinade with crisp birista onions, fresh mint, and cow ghee under sealed dum.",
      heroImageUrl: "/recipes/kolkata-kosha-pulao-3d.jpg",
      servings: 4,
      ingredients: ings,
      steps,
    };
  }

  if (lower.includes("palak") && lower.includes("paneer")) {
    const ings = [
      makeIngredient("fresh spinach (palak)", 300, "g", "blanched & pureed"),
      makeIngredient("malai paneer", 250, "g", "cut into cubes"),
      makeIngredient("garlic cloves (lasoon)", 6, "piece", "finely minced", 24),
      makeIngredient("cumin seeds (jeera)", 1, "tsp", "whole for tadka", 5),
      makeIngredient("cultured cow ghee", 1.5, "tbsp", "for smoky tadka", 22),
      makeIngredient("roma tomato", 2, "piece", "finely chopped", 180),
    ];
    return {
      title: "Lasooni Palak Paneer (Dhaba Style)",
      cuisine: "North Indian",
      description:
        "Velvety emerald spinach puree gently simmered with golden seared paneer cubes and crowned with crisp burnt-garlic ghee tadka.",
      heroImageUrl: "/recipes/paneer-tikka-3d.jpg",
      ingredients: ings,
      steps: defaultStepsForDish("Lasooni Palak Paneer", ings),
    };
  }

  if (lower.includes("paneer")) {
    const finalTitle = cleanOrDefaultTitle(titleHint, "Dhaba Paneer Masala");
    const ings = [
      makeIngredient("fresh malai paneer", 300, "g", "cubed & lightly seared"),
      makeIngredient("red onion", 2, "piece", "finely chopped for bhuna gravy", 210),
      makeIngredient("roma tomatoes", 3, "piece", "pureed silky", 260),
      makeIngredient("cashews (kaju) + fresh malai cream", 2, "tbsp", "soaked & ground smooth", 35),
      makeIngredient("kashmiri chili, kasuri methi & garam masala", 2, "tbsp", "whole & ground spices", 22),
      makeIngredient("cultured cow butter & ghee", 2, "tbsp", "for velvety makhani base", 30),
    ];
    return {
      title: finalTitle,
      cuisine: "North Indian Punjabi",
      description:
        "Golden-seared malai paneer simmered in caramelized onion-tomato masala enriched with cashew cream and roasted kasuri methi.",
      heroImageUrl: "/recipes/paneer-tikka-3d.jpg",
      ingredients: ings,
      steps: defaultStepsForDish(finalTitle, ings),
    };
  }

  if (lower.includes("dosa") || lower.includes("idli") || lower.includes("sambar") || lower.includes("rasam")) {
    const ings = [
      makeIngredient("fermented dosa & idli batter", 2.5, "katori", "room temp"),
      makeIngredient("boiled potatoes (aloo)", 2, "katori", "lightly mashed with turmeric"),
      makeIngredient("roasted chana dal & grated coconut", 0.75, "katori", "ground silky"),
      makeIngredient("toor dal for tiffin sambar", 0.5, "katori", "pressure cooked"),
      makeIngredient("cow ghee & mustard seeds", 2, "tbsp", "for crisp roast & tadka"),
    ];
    return {
      title: cleanOrDefaultTitle(titleHint, "Crispy Mysore Masala Dosa & Chutney"),
      cuisine: "South Indian Tiffin",
      description:
        "Paper-crisp fermented golden crepe spread with spiced red chili chutney, turmeric potato palya, and hot drumstick tiffin sambar.",
      heroImageUrl: "/recipes/mysore-masala-dosa-3d.jpg",
      ingredients: ings,
      steps: defaultStepsForDish("Crispy Masala Dosa", ings),
    };
  }

  if (/(prawn|chemmeen|appam|malabar|kerala)/i.test(lower)) {
    const ings = [
      makeIngredient("cleaned tiger prawns", 350, "g", "marinated in turmeric"),
      makeIngredient("sliced shallots & curry leaves", 1, "katori", "thinly sliced"),
      makeIngredient("virgin coconut oil & coconut slivers", 2, "tbsp", "toasted crisp"),
      makeIngredient("crushed tellicherry black pepper", 1.5, "tbsp", "coarsely pounded"),
      makeIngredient("fermented appam batter", 2, "katori", "ready to swirl"),
    ];
    return {
      title: cleanOrDefaultTitle(titleHint, "Malabar Coconut Pepper Roast & Appam"),
      cuisine: "Kerala Coastal",
      description:
        "Caramelized shallots, crispy toasted coconut slivers, and cracked black pepper sear over juicy coastal prawns beside lacy appams.",
      heroImageUrl: "/recipes/malabar-prawn-appam-3d.jpg",
      ingredients: ings,
      steps: defaultStepsForDish("Malabar Pepper Roast", ings),
    };
  }

  if (/(pav|bhaji|chole|chaat|mumbai|street|bhature|rajma)/i.test(lower)) {
    const isChole = /chole|bhature|rajma/i.test(lower);
    const ings = isChole
      ? [
          makeIngredient("kabuli chana or rajma beans", 2, "katori", "soaked overnight & boiled soft", 300),
          makeIngredient("red onions & ginger juliennes", 1.5, "katori", "finely grated", 160),
          makeIngredient("roma tomato puree", 1.5, "katori", "simmered thick", 220),
          makeIngredient("roasted chana masala & amchoor", 2, "tbsp", "anardana spice blend", 25),
          makeIngredient("cultured cow ghee", 2, "tbsp", "for smoky ginger-chili tadka", 28),
        ]
      : [
          makeIngredient("potato, cauliflower & green peas mix", 3, "katori", "pressure steamed"),
          makeIngredient("grated beetroot (natural crimson color)", 0.5, "katori", "boiled with veggies"),
          makeIngredient("pav bhaji spice blend", 2.5, "tbsp", "toasted in butter"),
          makeIngredient("soft ladi pav buns", 6, "piece", "halved & butter toasted"),
          makeIngredient("salted white butter (makkhan)", 3, "tbsp", "divided for tawa & finish"),
        ];
    const titleOut = cleanOrDefaultTitle(
      titleHint,
      isChole ? "Amritsari Pindi Chole Masala" : "Mumbai Tawa Pav Bhaji with Makkhan"
    );
    return {
      title: titleOut,
      cuisine: isChole ? "North Indian Punjabi" : "West Indian Street Classic",
      description: isChole
        ? "Slow-simmered chickpeas glazed in dark roasted anardana-coriander masala and crowned with sizzling ginger-chili ghee tadka."
        : "Butter-smashed street-style vegetable bhaji naturally ruby-tinted with roasted beetroot and served with toasted ladi pav.",
      heroImageUrl: "/recipes/mumbai-pav-bhaji-3d.jpg",
      ingredients: ings,
      steps: defaultStepsForDish(titleOut, ings),
    };
  }

  if (/(pulao|kosha|soya|bengali|handi)/i.test(lower)) {
    const ings = [
      makeIngredient("aged basmati or gobindobhog rice", 1.5, "katori", "rinsed & coated in haldi ghee"),
      makeIngredient("soya nuggets or marinated protein", 2, "katori", "seared deeply"),
      makeIngredient("caramelized red onions", 1.5, "katori", "slow-browned"),
      makeIngredient("whole cashews & golden raisins", 0.35, "katori", "ghee toasted"),
      makeIngredient("whole garam masala & saffron strands", 1.5, "tbsp", "steeped in warm milk"),
    ];
    return {
      title: cleanOrDefaultTitle(titleHint, "Handi Kosha Masala & Fragrant Pulao"),
      cuisine: "East & Royal Indian",
      description:
        "Slow-caramelized handi masala simmered till glossy alongside fragrant saffron-cashew pulao steamed in a sealed pot.",
      heroImageUrl: "/recipes/kolkata-kosha-pulao-3d.jpg",
      ingredients: ings,
      steps: defaultStepsForDish("Handi Kosha & Pulao", ings),
    };
  }

  if (lower.includes("tikka") || lower.includes("chicken")) {
    const ings = [
      makeIngredient(
        "boneless chicken thigh (tikka or curry cut)",
        400,
        "g",
        "1.5-inch bite pieces"
      ),
      makeIngredient("hung curd (thick yogurt)", 0.75, "katori", "whisked smooth"),
      makeIngredient("ginger-garlic paste", 1.5, "tbsp", "freshly crushed"),
      makeIngredient("kashmiri red chili & tandoori/garam masala", 2, "tbsp", "bloomed"),
      makeIngredient("mustard oil or butter", 1.5, "tbsp", "for smoky sear"),
    ];
    const finalTitle = cleanOrDefaultTitle(titleHint, "Air-Fryer Tandoori Chicken Tikka");
    return {
      title: finalTitle,
      cuisine: "North Indian Tandoori",
      description:
        "High-protein spiced yogurt marinade seared until charred and juicy with bold aromatic Indian spices.",
      heroImageUrl: "/recipes/tandoori-chicken-bowl-3d.jpg",
      ingredients: ings,
      steps: defaultStepsForDish(finalTitle, ings),
    };
  }

  if (lower.includes("khichdi") || lower.includes("dal") || lower.includes("thali")) {
    const ings = [
      makeIngredient("yellow moong & toor dal", 0.75, "katori", "washed & soaked 15m"),
      makeIngredient("sona masoori or basmati rice", 0.75, "katori", "rinsed clean"),
      makeIngredient("turmeric powder (haldi)", 0.5, "tsp", "for golden color"),
      makeIngredient("cumin seeds (jeera) & garlic", 1, "tsp", "crackle in hot ghee"),
      makeIngredient("pure cow ghee", 1.5, "tbsp", "for finishing tadka"),
    ];
    return {
      title: cleanOrDefaultTitle(titleHint, "15-Min Comfort Tadka Dal Khichdi"),
      cuisine: "Indian Comfort",
      description:
        "One-pot pressure-cooked moong dal and rice khichdi topped with fragrant cumin, hing, and roasted garlic ghee tadka.",
      heroImageUrl: "/recipes/dal-palak-thali-3d.jpg",
      ingredients: ings,
      steps: defaultStepsForDish("Tadka Dal Khichdi", ings),
    };
  }

  // Dynamic Compositional Recipe Builder for any remaining dish (e.g., Egg Curry, Mushroom Pepper Fry, Aloo Gobi)
  const finalTitle = cleanOrDefaultTitle(titleHint, "Imported Home Kitchen Special");
  const isSouth = /(kulambu|kuzhambu|varuval|chettinad|poriyal|kootu|rasam|curry leaf|tamarind|appam)/i.test(lower);
  const isEgg = /\begg\b|muttai|anda/i.test(lower);
  const isMutton = /mutton|lamb|goat|keema/i.test(lower);
  const isFish = /fish|meen|prawn|seafood/i.test(lower);
  const isMushroom = /mushroom|kaalan/i.test(lower);

  const mainProtein = isMutton
    ? makeIngredient("tender bone-in mutton pieces", 450, "g", "cut evenly & turmeric washed")
    : isEgg
      ? makeIngredient("hard-boiled farm eggs", 6, "piece", "scored lightly on sides", 300)
      : isFish
        ? makeIngredient("firm coastal fish steaks or prawns", 350, "g", "turmeric & salt rubbed")
        : isMushroom
          ? makeIngredient("button mushrooms", 300, "g", "wiped clean & quartered")
          : makeIngredient(`${finalTitle.toLowerCase()} main vegetables/protein`, 350, "g", "prepped into even pieces");

  const oilIng = isSouth
    ? makeIngredient("cold-pressed gingelly oil & fresh curry leaves", 2, "tbsp", "for fragrant tempering", 30)
    : makeIngredient("pure cow ghee or cold-pressed oil", 2, "tbsp", "for caramelizing base", 28);

  const spiceIng = isSouth
    ? makeIngredient("freshly roasted fennel, black pepper & coriander masala", 2.5, "tbsp", "ground aromatic spice paste", 30)
    : makeIngredient("kashmiri chili, coriander & roasted garam masala", 2, "tbsp", "bloomed in warm base", 24);

  const ings = [
    mainProtein,
    makeIngredient(isSouth ? "pearl shallots (chinna vengayam)" : "red onion", 1, "katori", "finely sliced", 150),
    makeIngredient("ripe roma tomatoes", 2, "piece", "finely chopped or pureed", 180),
    makeIngredient("fresh ginger-garlic paste", 1.5, "tbsp", "stone-crushed", 22),
    spiceIng,
    oilIng,
  ];
  const cuisineLabel = isSouth ? "South Indian Home Kitchen" : "Regional Indian Home Kitchen";
  return {
    title: finalTitle,
    cuisine: cuisineLabel,
    description: `Structured ${finalTitle} recipe prepared with ${mainProtein.name}, caramelized ${isSouth ? "shallots and curry leaves" : "onions and tomatoes"}, and ${spiceIng.name}.`,
    heroImageUrl: inferHeroImageUrl(finalTitle, cuisineLabel),
    ingredients: ings,
    steps: defaultStepsForDish(finalTitle, ings),
  };
}

function cleanOrDefaultTitle(raw: string, fallback: string): string {
  const cleanTitle = raw
    .replace(/https?:\/\/\S+/g, "")
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!cleanTitle || /^(instagram|youtube|reel|shorts?)$/i.test(cleanTitle)) {
    return fallback;
  }
  return cleanTitle;
}

function decodeHtmlEntities(str: string): string {
  return str
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function extractYouTubeId(url: string): string | null {
  const m = url.match(
    /(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|shorts\/|embed\/))([A-Za-z0-9_-]{6,15})/
  );
  return m?.[1] ?? null;
}

async function fetchMetadataFromUrl(sourceUrl: string): Promise<{
  sourceType: RecipeSourceType;
  titleHint: string;
  authorName: string;
  description: string;
  thumbnailUrl: string | null;
  extractedIngredients: string[];
  extractedSteps: string[];
}> {
  const isYouTube = /(?:youtube\.com|youtu\.be)/i.test(sourceUrl);
  const isInstagram = /instagram\.com/i.test(sourceUrl);
  const sourceType: RecipeSourceType = isYouTube
    ? "youtube_shorts"
    : isInstagram
      ? "instagram_reel"
      : "website_url";

  let titleHint = "";
  let authorName = "Imported Creator";
  let description = "";
  let thumbnailUrl: string | null = null;
  const extractedIngredients: string[] = [];
  const extractedSteps: string[] = [];

  // Derive fallback title from URL slug just in case network fetch is blocked
  try {
    const parsedUrl = new URL(sourceUrl);
    const slugParts = parsedUrl.pathname
      .split("/")
      .filter((p) => p && p !== "reel" && p !== "shorts" && p !== "watch");
    const lastSlug = slugParts[slugParts.length - 1] ?? "";
    if (lastSlug && !extractYouTubeId(sourceUrl)) {
      titleHint = decodeURIComponent(lastSlug).replace(/[-_]+/g, " ");
    }
  } catch {
    // ignore malformed URL
  }

  // 1. Official YouTube oEmbed + Watch Metadata (extracts thumbnail, ingredients & method steps)
  if (isYouTube) {
    try {
      const oembedRes = await fetch(
        `https://www.youtube.com/oembed?url=${encodeURIComponent(sourceUrl)}&format=json`,
        { signal: AbortSignal.timeout(4500) }
      );
      if (oembedRes.ok) {
        const data = (await oembedRes.json()) as {
          title?: string;
          author_name?: string;
          thumbnail_url?: string;
        };
        if (data.title) titleHint = data.title;
        if (data.author_name) authorName = data.author_name;
        if (data.thumbnail_url && /^https?:\/\//i.test(data.thumbnail_url)) {
          thumbnailUrl = data.thumbnail_url;
        }
      }
    } catch {
      // continue to page fetch fallback
    }

    const ytId = extractYouTubeId(sourceUrl);
    if (ytId && !thumbnailUrl && /^[A-Za-z0-9_-]{11}$/.test(ytId)) {
      thumbnailUrl = `https://i.ytimg.com/vi/${ytId}/hqdefault.jpg`;
    }

    if (ytId) {
      try {
        const pageRes = await fetch(`https://www.youtube.com/watch?v=${ytId}`, {
          headers: { "User-Agent": "Mozilla/5.0" },
          signal: AbortSignal.timeout(4500),
        });
        if (pageRes.ok) {
          const html = await pageRes.text();
          const descMatch = html.match(/"shortDescription":"((?:\\.|[^"\\])*)"/);
          if (descMatch?.[1]) {
            description = JSON.parse(`"${descMatch[1]}"`) as string;
            let inMethodSection = false;
            for (const line of description.split(/\r?\n/)) {
              const trimmed = line.trim();
              if (!trimmed) continue;
              if (/^(method|instructions|preparation|directions|steps)\b/i.test(trimmed)) {
                inMethodSection = true;
                continue;
              }
              if (/^(ingredients|for\s+marination|for\s+gravy)\b/i.test(trimmed)) {
                inMethodSection = false;
                continue;
              }
              if (/^\d+[.)]\s+/.test(trimmed) && trimmed.length > 18) {
                extractedSteps.push(trimmed.replace(/^\d+[.)]\s+/, "").trim());
                continue;
              }
              if (inMethodSection && trimmed.length > 20 && !/^[-•*]/.test(trimmed)) {
                extractedSteps.push(trimmed);
                continue;
              }
              if (
                /^[-•*\d]/.test(trimmed) &&
                /(g|ml|tbsp|tsp|cup|katori|salt|oil|onion|tomato|chicken|mutton|fish|paneer|dal|masala|rice|ginger|garlic|pepper|turmeric)/i.test(
                  trimmed
                )
              ) {
                extractedIngredients.push(trimmed);
              }
            }
          }
          if (!titleHint) {
            const tMatch = html.match(/<title>(.*?)<\/title>/i);
            if (tMatch?.[1]) {
              titleHint = decodeHtmlEntities(
                tMatch[1].replace(/\s*-\s*YouTube\s*$/i, "")
              );
            }
          }
        }
      } catch {
        // graceful fallback
      }
    }
    return {
      sourceType,
      titleHint: titleHint || "YouTube Recipe Video",
      authorName,
      description,
      thumbnailUrl,
      extractedIngredients: extractedIngredients.slice(0, 14),
      extractedSteps: extractedSteps.slice(0, 8),
    };
  }

  // 2. General Website / Blog URL / Reel: Parse og:image, twitter:image, Schema.org Recipe JSON-LD & <title>
  try {
    const pageRes = await fetch(sourceUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; PotlyBot/1.0; +https://potly.app)",
      },
      signal: AbortSignal.timeout(4500),
    });
    if (pageRes.ok) {
      const html = await pageRes.text();
      const tMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
      if (tMatch?.[1]) {
        titleHint = decodeHtmlEntities(tMatch[1].trim());
      }

      const ogImgMatch =
        html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i) ??
        html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i) ??
        html.match(/<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i);
      if (ogImgMatch?.[1] && !/rsrc\.php|static\.cdninstagram|favicon|logo/i.test(ogImgMatch[1])) {
        try {
          thumbnailUrl = new URL(decodeHtmlEntities(ogImgMatch[1]), sourceUrl).href;
        } catch {
          // ignore invalid relative image URL
        }
      }

      const jsonLdMatches = html.matchAll(
        /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
      );
      for (const m of jsonLdMatches) {
        try {
          const rawJson = m[1];
          if (!rawJson) continue;
          const parsed = JSON.parse(rawJson) as unknown;
          const queue: unknown[] = Array.isArray(parsed) ? [...parsed] : [parsed];
          while (queue.length > 0) {
            const node = queue.shift() as Record<string, unknown> | null;
            if (!node || typeof node !== "object") continue;
            if (Array.isArray(node["@graph"])) {
              queue.push(...(node["@graph"] as unknown[]));
            }
            const nodeType = node["@type"];
            const isRecipe =
              nodeType === "Recipe" ||
              (Array.isArray(nodeType) && nodeType.includes("Recipe"));
            if (isRecipe) {
              if (typeof node.name === "string") titleHint = node.name;
              if (typeof node.description === "string") {
                description = node.description;
              }
              if (!thumbnailUrl && node.image) {
                const rawImg = Array.isArray(node.image)
                  ? node.image[0]
                  : node.image;
                const candUrl =
                  typeof rawImg === "string"
                    ? rawImg
                    : rawImg && typeof rawImg === "object"
                      ? String((rawImg as Record<string, unknown>).url ?? "")
                      : "";
                if (/^https?:\/\//i.test(candUrl)) {
                  thumbnailUrl = candUrl;
                }
              }
              if (Array.isArray(node.recipeIngredient)) {
                for (const item of node.recipeIngredient) {
                  if (typeof item === "string") extractedIngredients.push(item);
                }
              }
              if (Array.isArray(node.recipeInstructions)) {
                for (const step of node.recipeInstructions) {
                  if (typeof step === "string") {
                    extractedSteps.push(step);
                  } else if (
                    step &&
                    typeof step === "object" &&
                    typeof (step as Record<string, unknown>).text === "string"
                  ) {
                    extractedSteps.push(
                      String((step as Record<string, unknown>).text)
                    );
                  }
                }
              }
              break;
            }
          }
        } catch {
          // ignore malformed JSON-LD block
        }
      }
    }
  } catch {
    // graceful fallback when target host rejects bot fetch
  }

  return {
    sourceType,
    titleHint: titleHint || "Saved Web Recipe",
    authorName,
    description,
    thumbnailUrl,
    extractedIngredients: extractedIngredients.slice(0, 16),
    extractedSteps: extractedSteps.slice(0, 10),
  };
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as RecipeParseRequest;
    const rawText = (body.raw_text ?? "").trim();
    const sourceUrl = body.source_url?.trim() || null;

    if (!rawText && !sourceUrl && !body.image_base64) {
      return NextResponse.json(
        { error: "Please paste a recipe URL, recipe text, or upload a photo." },
        { status: 400 }
      );
    }

    let title = "";
    let cuisine = "Indian Home Kitchen";
    let description = "";
    let servings = 3;
    let authorName = "Home Chef Import";
    let sourceType: RecipeSourceType = body.image_base64
      ? "ocr_image"
      : "manual";
    let ingredients: NormalizedIngredient[] = [];
    let steps: ParallelTimelineNode[] = [];

    let urlThumbnailUrl: string | null = null;
    if (sourceUrl) {
      const urlMeta = await fetchMetadataFromUrl(sourceUrl);
      sourceType = urlMeta.sourceType;
      authorName = urlMeta.authorName;
      urlThumbnailUrl = urlMeta.thumbnailUrl;

      const userTitleOverride = rawText
        ? rawText.split(/\r?\n/)[0]?.replace(/^(title|recipe)\s*:\s*/i, "").trim()
        : "";
      const isGenericUrlTitle =
        !urlMeta.titleHint ||
        /^(instagram|youtube(\s+recipe\s+video)?|saved\s+web\s+recipe)$/i.test(
          urlMeta.titleHint.trim()
        );
      const effectiveTitleHint =
        userTitleOverride ||
        (!isGenericUrlTitle ? urlMeta.titleHint : "");

      if (urlMeta.extractedIngredients.length > 0) {
        title = userTitleOverride || urlMeta.titleHint;
        description =
          urlMeta.description.slice(0, 260) ||
          `Imported directly from ${sourceType.replace("_", " ")}.`;
        ingredients = urlMeta.extractedIngredients.map(parseIngredientLine);
        steps =
          urlMeta.extractedSteps.length > 0
            ? urlMeta.extractedSteps.map((inst, idx) => ({
                step_number: idx + 1,
                title: `Step ${idx + 1}`,
                instruction: inst,
                track:
                  idx === 0
                    ? "prep"
                    : idx === urlMeta.extractedSteps.length - 1
                      ? "plating"
                      : /simmer|pressure|rest|marinate|steam/i.test(inst)
                        ? "passive_wait"
                        : "active_cook",
                duration_seconds: 300,
                start_offset_seconds: idx * 300,
                depends_on_steps: idx === 0 ? [] : [idx],
                equipment: ["Pan"],
                ingredient_names: [],
                timer_label: `Step ${idx + 1} (5m)`,
                sensory_cue: null,
              }))
            : defaultStepsForDish(title, ingredients);
      } else {
        const smart = buildSmartDishFromTitle(effectiveTitleHint);
        title = smart.title;
        cuisine = smart.cuisine;
        if (typeof smart.servings === "number") servings = smart.servings;
        description = urlMeta.description
          ? `${urlMeta.description.split("\n")[0]?.slice(0, 220) ?? smart.description}`
          : smart.description;
        ingredients = smart.ingredients;
        steps =
          urlMeta.extractedSteps.length > 0
            ? urlMeta.extractedSteps.map((inst, idx) => ({
                step_number: idx + 1,
                title: `Step ${idx + 1}`,
                instruction: inst,
                track:
                  idx === 0
                    ? "prep"
                    : idx === urlMeta.extractedSteps.length - 1
                      ? "plating"
                      : /simmer|pressure|rest|marinate|steam/i.test(inst)
                        ? "passive_wait"
                        : "active_cook",
                duration_seconds: 360,
                start_offset_seconds: idx * 360,
                depends_on_steps: idx === 0 ? [] : [idx],
                equipment: ["Kadhai / Cooker"],
                ingredient_names: [],
                timer_label: `Step ${idx + 1} (6m)`,
                sensory_cue: null,
              }))
            : smart.steps;
      }
    } else if (rawText) {
      const lines = rawText
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter(Boolean);

      title = lines[0]?.replace(/^(title|recipe)\s*:\s*/i, "") || "Scanned Recipe";
      const servLine = lines.find((l) => /servings?\s*:\s*\d+/i.test(l));
      if (servLine) {
        const m = servLine.match(/\d+/);
        if (m?.[0]) servings = Math.max(1, Math.min(12, Number(m[0])));
      }

      const ingLines = lines.filter(
        (l) => /^[-*•]\s+/.test(l) && !/^(ingredients|instructions)/i.test(l)
      );
      const stepLines = lines.filter((l) => /^\d+[.)]\s+/.test(l));

      const smart = buildSmartDishFromTitle(title);
      cuisine = smart.cuisine;
      if (typeof smart.servings === "number" && !servLine) {
        servings = smart.servings;
      }

      ingredients =
        ingLines.length > 0
          ? ingLines.map(parseIngredientLine)
          : smart.ingredients;

      steps =
        stepLines.length > 0
          ? stepLines.map((line, idx) => ({
              step_number: idx + 1,
              title: `Step ${idx + 1}`,
              instruction: line.replace(/^\d+[.)]\s+/, "").trim(),
              track:
                idx === 0
                  ? "prep"
                  : idx === stepLines.length - 1
                    ? "plating"
                    : /simmer|pressure|rest|marinate/i.test(line)
                      ? "passive_wait"
                      : "active_cook",
              duration_seconds: 360,
              start_offset_seconds: idx * 360,
              depends_on_steps: idx === 0 ? [] : [idx],
              equipment: ["Kadhai / Pan"],
              ingredient_names: [],
              timer_label: `Step ${idx + 1} (6m)`,
              sensory_cue: null,
            }))
          : smart.steps;
      description =
        ingLines.length > 0
          ? `Imported and normalized ${ingredients.length} ingredients into strict gram and 150ml katori measurements.`
          : smart.description;
    } else {
      const smart = buildSmartDishFromTitle("Scanned Cookbook Recipe");
      title = smart.title;
      cuisine = smart.cuisine;
      description = smart.description;
      ingredients = smart.ingredients;
      steps = smart.steps;
    }

    const adapted = applyDietaryAdaptation(
      title,
      ingredients,
      steps,
      body.dietary_adaptation
    );
    const totalCost = Math.round(
      adapted.ingredients.reduce(
        (sum, ing) => sum + (ing.nutrition_meta.estimated_cost_inr ?? 20),
        0
      )
    );

    const uploadedImageDataUrl =
      body.image_base64 && body.image_base64.length <= 2_500_000
        ? body.image_base64.startsWith("data:")
          ? body.image_base64
          : `data:${body.image_mime_type || "image/jpeg"};base64,${body.image_base64}`
        : null;

    const curated3D = inferCurated3DImage(adapted.title, cuisine);
    let resolvedHeroImage: string | null =
      uploadedImageDataUrl ?? urlThumbnailUrl ?? curated3D;
    if (!resolvedHeroImage) {
      resolvedHeroImage =
        (await fetchDishPhotoByTitle(adapted.title)) ??
        inferHeroImageUrl(adapted.title, cuisine);
    }

    const recipe: Recipe = {
      id: `imp-${Date.now()}`,
      title: adapted.title,
      slug: adapted.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, ""),
      description,
      cuisine,
      difficulty: "Intermediate",
      source_type: sourceType,
      source_url: sourceUrl,
      prep_time_minutes: 12,
      cook_time_minutes: Math.max(
        10,
        Math.round(
          adapted.steps.reduce((s, st) => s + st.duration_seconds, 0) / 60
        )
      ),
      servings,
      estimated_total_cost_inr: totalCost,
      hero_image_url: resolvedHeroImage,
      ingredients: adapted.ingredients,
      timeline_steps: adapted.steps,
      tags: adapted.tags,
      likes_count: 1,
      forks_count: 0,
      author_name: authorName,
      parent_recipe_id: null,
      remix_mode: adapted.remixMode,
      remix_note: adapted.remixNote,
      similarity_score: 0.96,
      reviews: [],
      created_at: new Date().toISOString(),
    };

    return NextResponse.json(recipe, { status: 200 });
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : "Failed to parse recipe payload.",
      },
      { status: 400 }
    );
  }
}
