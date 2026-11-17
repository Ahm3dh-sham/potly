import { formatIngredientForDisplay } from "@/lib/unitConverter";
import type {
  Community,
  Cookbook,
  IngredientSubstitutionResponse,
  MadeItReview,
  MarkCookedResponse,
  MealPlanGenerateRequest,
  MealPlanResponse,
  MultiRecipeTimelineResponse,
  NormalizedIngredient,
  PantryItem,
  PantryRescueMatch,
  Recipe,
  RecipeParseRequest,
  RemixMode,
  SousChefVoiceQueryRequest,
  SousChefVoiceQueryResponse,
  StorageLocation,
  AisleCategory,
  UnitSystem,
} from "@/types/recipe";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";

function shouldTryExternalApi(): boolean {
  if (process.env.NEXT_PUBLIC_API_URL) return true;
  if (typeof window === "undefined") return false;
  return (
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1"
  );
}

function ensureExternalApi(): void {
  if (!shouldTryExternalApi()) {
    throw new Error("Using built-in client mode");
  }
}

export type DishArchetype =
  | "kadhai"
  | "thali"
  | "dosa"
  | "bowl"
  | "uruli"
  | "platter"
  | "handi";

export const RECIPE_ARCHETYPE_BY_ID: Record<string, DishArchetype> = {
  "11111111-1111-4111-8111-111111111101": "kadhai",
  "11111111-1111-4111-8111-111111111102": "thali",
  "11111111-1111-4111-8111-111111111103": "dosa",
  "11111111-1111-4111-8111-111111111104": "bowl",
  "11111111-1111-4111-8111-111111111105": "uruli",
  "11111111-1111-4111-8111-111111111106": "platter",
  "11111111-1111-4111-8111-111111111107": "handi",
};

export const ARCHETYPE_3D_IMAGE: Record<DishArchetype, string> = {
  kadhai: "/recipes/paneer-tikka-3d.jpg",
  thali: "/recipes/dal-palak-thali-3d.jpg",
  dosa: "/recipes/mysore-masala-dosa-3d.jpg",
  bowl: "/recipes/tandoori-chicken-bowl-3d.jpg",
  uruli: "/recipes/malabar-prawn-appam-3d.jpg",
  platter: "/recipes/mumbai-pav-bhaji-3d.jpg",
  handi: "/recipes/kolkata-kosha-pulao-3d.jpg",
};

export const RECIPE_3D_IMAGE_BY_ID: Record<string, string> = {
  "11111111-1111-4111-8111-111111111101": "/recipes/paneer-tikka-3d.jpg",
  "11111111-1111-4111-8111-111111111102": "/recipes/dal-palak-thali-3d.jpg",
  "11111111-1111-4111-8111-111111111103": "/recipes/mysore-masala-dosa-3d.jpg",
  "11111111-1111-4111-8111-111111111104": "/recipes/tandoori-chicken-bowl-3d.jpg",
  "11111111-1111-4111-8111-111111111105": "/recipes/malabar-prawn-appam-3d.jpg",
  "11111111-1111-4111-8111-111111111106": "/recipes/mumbai-pav-bhaji-3d.jpg",
  "11111111-1111-4111-8111-111111111107": "/recipes/kolkata-kosha-pulao-3d.jpg",
};

export function getRecipeArchetype(recipe: Recipe): DishArchetype {
  const byId = RECIPE_ARCHETYPE_BY_ID[recipe.id];
  if (byId) return byId;
  if (recipe.parent_recipe_id) {
    const byParent = RECIPE_ARCHETYPE_BY_ID[recipe.parent_recipe_id];
    if (byParent) return byParent;
  }
  const text = `${recipe.title} ${recipe.cuisine} ${(recipe.tags ?? []).join(" ")}`.toLowerCase();
  if (/(mutton|lamb|goat|kulambu|kuzhambu|chettinad|rogan josh|keema)/i.test(text)) {
    return "uruli";
  }
  if (/(paneer|kadhai|makhani)/i.test(text)) {
    return "kadhai";
  }
  if (/(dosa|idli|sambar|tiffin|south|uttapam|vada)/i.test(text)) {
    return "dosa";
  }
  if (/(prawn|fish|meen|kerala|malabar|appam|coastal|chemmeen|seafood)/i.test(text)) {
    return "uruli";
  }
  if (/(pav|bhaji|mumbai|west|street|chole|chaat)/i.test(text)) {
    return "platter";
  }
  if (/(bengali|east|kolkata|pulao|kosha|soya|biryani|handi)/i.test(text)) {
    return "handi";
  }
  if (/(chicken|tikka|tandoori|quinoa|air-fryer|bowl|salad)/i.test(text)) {
    return "bowl";
  }
  if (/(dal|palak|thali|rice|moong|khichdi|spinach|toor)/i.test(text)) {
    return "thali";
  }
  return "kadhai";
}

export function getRecipe3DImage(recipe: Recipe): string {
  if (recipe.hero_image_url) return recipe.hero_image_url;
  const byId = RECIPE_3D_IMAGE_BY_ID[recipe.id];
  if (byId) return byId;
  if (recipe.parent_recipe_id) {
    const byParent = RECIPE_3D_IMAGE_BY_ID[recipe.parent_recipe_id];
    if (byParent) return byParent;
  }
  const text = `${recipe.title} ${recipe.cuisine} ${(recipe.tags ?? []).join(" ")}`.toLowerCase();
  if (/(mutton|lamb|goat|kulambu|kuzhambu|chettinad|rogan josh|keema|nihari)/i.test(text)) {
    return "/recipes/mutton-kulambu-3d.jpg";
  }
  return ARCHETYPE_3D_IMAGE[getRecipeArchetype(recipe)];
}

export const FALLBACK_RECIPES: Recipe[] = [
  {
    id: "11111111-1111-4111-8111-111111111101",
    title: "Smoky Dhaba Paneer Tikka Masala with Garlic Naan",
    slug: "smoky-dhaba-paneer-tikka-masala",
    description:
      "Char-grilled malai paneer cubes marinated in Kashmiri mirch and hung curd, simmered in a velvety onion-tomato-cashew makhani gravy.",
    cuisine: "North Indian Punjabi",
    difficulty: "Intermediate",
    source_type: "instagram_reel",
    source_url: "https://www.instagram.com/reel/potly-paneer-tikka",
    prep_time_minutes: 15,
    cook_time_minutes: 20,
    servings: 3,
    estimated_total_cost_inr: 265,
    hero_image_url: "/recipes/paneer-tikka-3d.jpg",
    likes_count: 642,
    forks_count: 94,
    author_name: "Chef Ranveer Kapoor",
    parent_recipe_id: null,
    remix_mode: null,
    remix_note: null,
    similarity_score: 0.98,
    created_at: "2026-11-10T12:00:00Z",
    tags: [
      "high-protein",
      "vegetarian",
      "indian-classic",
      "paneer",
      "north-indian",
    ],
    reviews: [
      {
        id: "rev-1",
        recipe_id: "11111111-1111-4111-8111-111111111101",
        author_name: "Priya Nair",
        rating: 5,
        review_note:
          "Used the 1-click Jain Remix for my in-laws and nobody could believe there was no onion or garlic!",
        photo_caption: "Charred tawa paneer in clay handi",
        tweak_note: "Swapped heavy cream for soaked kaju paste",
        created_at: "2026-11-10T12:00:00Z",
      },
    ],
    ingredients: [
      {
        name: "malai paneer (fresh cottage cheese)",
        quantity: 300,
        unit: "g",
        aisle_category: "dairy_eggs",
        preparation_note: "cut into 1.5-inch tikka cubes, soaked in warm water",
        nutrition_meta: {
          calories_kcal: 795,
          protein_g: 54,
          carbs_g: 9.6,
          fat_g: 60,
          fiber_g: 0,
          estimated_cost_inr: 135,
          grams_equivalent: 300,
          allergens: ["dairy"],
          dietary_flags: ["vegetarian", "gluten-free", "high-protein"],
        },
      },
      {
        name: "strained hung curd (chakka dahi)",
        quantity: 1,
        unit: "katori",
        aisle_category: "dairy_eggs",
        preparation_note: "whisked smooth with roasted besan",
        nutrition_meta: {
          calories_kcal: 145,
          protein_g: 14.5,
          carbs_g: 6.5,
          fat_g: 6,
          fiber_g: 0,
          estimated_cost_inr: 35,
          grams_equivalent: 150,
          allergens: ["dairy"],
          dietary_flags: ["vegetarian", "gluten-free", "high-protein"],
        },
      },
      {
        name: "red onion",
        quantity: 2,
        unit: "piece",
        aisle_category: "produce",
        preparation_note: "finely chopped for bhuna masala",
        nutrition_meta: {
          calories_kcal: 88,
          protein_g: 2.4,
          carbs_g: 20,
          fat_g: 0.2,
          fiber_g: 3.6,
          estimated_cost_inr: 18,
          grams_equivalent: 220,
          allergens: [],
          dietary_flags: ["vegan", "dairy-free", "gluten-free"],
        },
      },
      {
        name: "roma tomato",
        quantity: 3,
        unit: "piece",
        aisle_category: "produce",
        preparation_note: "blended into smooth puree",
        nutrition_meta: {
          calories_kcal: 66,
          protein_g: 3,
          carbs_g: 14.4,
          fat_g: 0.6,
          fiber_g: 4.2,
          estimated_cost_inr: 22,
          grams_equivalent: 300,
          allergens: [],
          dietary_flags: [
            "vegan",
            "dairy-free",
            "gluten-free",
            "jain-friendly",
          ],
        },
      },
      {
        name: "cumin seeds (jeera)",
        quantity: 1.5,
        unit: "tsp",
        aisle_category: "spices_masalas",
        preparation_note: "whole for hot ghee tadka",
        nutrition_meta: {
          calories_kcal: 22,
          protein_g: 1.1,
          carbs_g: 2.6,
          fat_g: 1.3,
          fiber_g: 0.6,
          estimated_cost_inr: 8,
          grams_equivalent: 7.5,
          allergens: [],
          dietary_flags: [
            "vegan",
            "dairy-free",
            "gluten-free",
            "jain-friendly",
          ],
        },
      },
      {
        name: "kashmiri lal mirch & garam masala",
        quantity: 2,
        unit: "tbsp",
        aisle_category: "spices_masalas",
        preparation_note: "bloomed in warm oil for deep ruby color",
        nutrition_meta: {
          calories_kcal: 48,
          protein_g: 1.8,
          carbs_g: 8.5,
          fat_g: 1.9,
          fiber_g: 3.8,
          estimated_cost_inr: 17,
          grams_equivalent: 20,
          allergens: [],
          dietary_flags: [
            "vegan",
            "dairy-free",
            "gluten-free",
            "jain-friendly",
          ],
        },
      },
      {
        name: "heavy cream (fresh malai)",
        quantity: 3,
        unit: "tbsp",
        aisle_category: "dairy_eggs",
        preparation_note: "chilled for finishing swirl",
        nutrition_meta: {
          calories_kcal: 150,
          protein_g: 1.2,
          carbs_g: 1.5,
          fat_g: 16,
          fiber_g: 0,
          estimated_cost_inr: 30,
          grams_equivalent: 45,
          allergens: ["dairy"],
          dietary_flags: ["vegetarian", "gluten-free", "jain-friendly"],
        },
      },
    ],
    timeline_steps: [
      {
        step_number: 1,
        title: "Whisk Tikka Marinade & Cube Paneer",
        instruction:
          "Whisk hung curd, 1 tbsp Kashmiri lal mirch, and salt; coat the paneer cubes gently and chop the red onions + puree the tomatoes.",
        track: "prep",
        duration_seconds: 300,
        start_offset_seconds: 0,
        depends_on_steps: [],
        equipment: ["Mixing Bowl", "Chef's Knife", "Blender"],
        ingredient_names: [
          "malai paneer (fresh cottage cheese)",
          "strained hung curd (chakka dahi)",
        ],
        timer_label: "Prep & Coat (5m)",
        sensory_cue:
          "Ruby-red yogurt marinade clings thickly to every paneer cube",
      },
      {
        step_number: 2,
        title: "Rest Paneer in Spiced Hung Curd Marinade",
        instruction:
          "Let the coated paneer cubes marinate for 12 minutes so the spices penetrate while you build the gravy on the main burner.",
        track: "passive_wait",
        duration_seconds: 720,
        start_offset_seconds: 300,
        depends_on_steps: [1],
        equipment: ["Covered Bowl"],
        ingredient_names: ["malai paneer (fresh cottage cheese)"],
        timer_label: "Marinate Paneer (12m)",
        sensory_cue: "Aromatic smoky-tangy fragrance",
      },
      {
        step_number: 3,
        title: "Crackle Jeera & Bhuno Onion-Tomato Masala",
        instruction:
          "While paneer marinates, crackle cumin seeds in hot ghee, caramelize chopped onions for 5 minutes, then simmer tomato puree for 5 minutes until oil separates.",
        track: "active_cook",
        duration_seconds: 600,
        start_offset_seconds: 300,
        depends_on_steps: [1],
        equipment: ["Heavy Brass/Steel Kadhai"],
        ingredient_names: ["cumin seeds (jeera)", "red onion", "roma tomato"],
        timer_label: "Bhuno Masala (10m)",
        sensory_cue:
          "Glossy crimson droplets rising around the edges of the kadhai",
      },
      {
        step_number: 4,
        title: "High-Heat Char Paneer Tikka on Cast-Iron Tawa",
        instruction:
          "Sear marinated paneer cubes on a smoking-hot cast-iron tawa for 4 minutes, turning once until edges develop charred dhaba blisters.",
        track: "active_cook",
        duration_seconds: 240,
        start_offset_seconds: 900,
        depends_on_steps: [2],
        equipment: ["Cast-Iron Tawa"],
        ingredient_names: ["malai paneer (fresh cottage cheese)"],
        timer_label: "Char Tikka (4m)",
        sensory_cue:
          "Audible sizzle and smoky blistered corners on the paneer",
      },
      {
        step_number: 5,
        title: "Fold Charred Paneer & Swirl Fresh Cream",
        instruction:
          "Fold the blistered paneer tikka into the simmering makhani gravy, swirl in 3 tbsp fresh cream and crushed kasuri methi, and serve hot.",
        track: "plating",
        duration_seconds: 120,
        start_offset_seconds: 1140,
        depends_on_steps: [3, 4],
        equipment: ["Serving Handi"],
        ingredient_names: [
          "malai paneer (fresh cottage cheese)",
          "heavy cream (fresh malai)",
        ],
        timer_label: null,
        sensory_cue: "Velvety saffron-red gravy ribbons with cream swirl",
      },
    ],
  },
  {
    id: "11111111-1111-4111-8111-111111111102",
    title: "High-Protein Lasooni Palak Toor Dal Tadka & Jeera Rice Thali",
    slug: "lasooni-palak-toor-dal-tadka-thali",
    description:
      "Unpolished toor and moong dal pressure-cooked with iron-rich spinach, crowned with a double burnt-garlic & Kashmiri chili ghee tadka alongside fluffy jeera basmati rice.",
    cuisine: "Indian Home Thali",
    difficulty: "Easy",
    source_type: "youtube_shorts",
    source_url: "https://www.youtube.com/shorts/potly-dal-palak",
    prep_time_minutes: 10,
    cook_time_minutes: 18,
    servings: 3,
    estimated_total_cost_inr: 165,
    hero_image_url: "/recipes/dal-palak-thali-3d.jpg",
    likes_count: 518,
    forks_count: 72,
    author_name: "Chef Meera Joshi",
    parent_recipe_id: null,
    remix_mode: null,
    remix_note: null,
    similarity_score: 0.94,
    created_at: "2026-11-10T12:00:00Z",
    tags: [
      "thali",
      "high-protein",
      "vegetarian",
      "dal-tadka",
      "budget-friendly",
    ],
    reviews: [],
    ingredients: [
      {
        name: "unpolished toor & yellow moong dal",
        quantity: 1.5,
        unit: "katori",
        aisle_category: "pantry_dry",
        preparation_note: "washed 3 times and soaked 15 mins",
        nutrition_meta: {
          calories_kcal: 740,
          protein_g: 49.5,
          carbs_g: 128,
          fat_g: 3.5,
          fiber_g: 24,
          estimated_cost_inr: 48,
          grams_equivalent: 225,
          allergens: [],
          dietary_flags: [
            "vegan",
            "dairy-free",
            "gluten-free",
            "jain-friendly",
          ],
        },
      },
      {
        name: "fresh palak (spinach)",
        quantity: 250,
        unit: "g",
        aisle_category: "produce",
        preparation_note: "washed and finely shredded",
        nutrition_meta: {
          calories_kcal: 58,
          protein_g: 7.2,
          carbs_g: 9,
          fat_g: 1,
          fiber_g: 5.5,
          estimated_cost_inr: 30,
          grams_equivalent: 250,
          allergens: [],
          dietary_flags: [
            "vegan",
            "dairy-free",
            "gluten-free",
            "jain-friendly",
          ],
        },
      },
      {
        name: "aged basmati rice",
        quantity: 1.5,
        unit: "katori",
        aisle_category: "pantry_dry",
        preparation_note: "rinsed until clear for fluffy jeera rice",
        nutrition_meta: {
          calories_kcal: 765,
          protein_g: 15.8,
          carbs_g: 168,
          fat_g: 1.5,
          fiber_g: 3,
          estimated_cost_inr: 42,
          grams_equivalent: 225,
          allergens: [],
          dietary_flags: [
            "vegan",
            "dairy-free",
            "gluten-free",
            "jain-friendly",
          ],
        },
      },
    ],
    timeline_steps: [
      {
        step_number: 1,
        title: "Wash Dal, Rinse Basmati & Shred Palak",
        instruction:
          "Wash the toor-moong dal blend and aged basmati rice in separate bowls; finely shred the fresh palak leaves.",
        track: "prep",
        duration_seconds: 240,
        start_offset_seconds: 0,
        depends_on_steps: [],
        equipment: ["Strainer", "Chef's Knife"],
        ingredient_names: [
          "unpolished toor & yellow moong dal",
          "fresh palak (spinach)",
        ],
        timer_label: "Prep Dal & Greens (4m)",
        sensory_cue: "Rinse water runs crystal clear",
      },
      {
        step_number: 2,
        title: "Pressure Cook Toor-Moong Dal (3 Whistles)",
        instruction:
          "Pressure cook the soaked dal with turmeric, salt, and 3.5 katori water for 11 minutes (3 whistles) until creamy.",
        track: "passive_wait",
        duration_seconds: 660,
        start_offset_seconds: 240,
        depends_on_steps: [1],
        equipment: ["3-Litre Pressure Cooker"],
        ingredient_names: ["unpolished toor & yellow moong dal"],
        timer_label: "Pressure Cook Dal (11m)",
        sensory_cue: "Three steady whistles and fragrant turmeric steam",
      },
      {
        step_number: 3,
        title: "Fold Shredded Palak & Sizzle Double Ghee Tadka",
        instruction:
          "Whisk shredded palak into the hot pressure-cooked dal for 3 minutes until emerald, then pour sizzling cow ghee, jeera, and hing tadka on top.",
        track: "active_cook",
        duration_seconds: 240,
        start_offset_seconds: 900,
        depends_on_steps: [2],
        equipment: ["Tadka Pan", "Wire Whisk"],
        ingredient_names: ["fresh palak (spinach)"],
        timer_label: "Tadka Finish (4m)",
        sensory_cue: "Loud crackle as hot ghee hits the emerald dal surface",
      },
    ],
  },
  {
    id: "11111111-1111-4111-8111-111111111103",
    title: "Crispy Mysore Masala Dosa with Roasted Chana Chutney & Tiffin Sambar",
    slug: "crispy-mysore-masala-dosa",
    description:
      "Golden fermented rice-urad crepes brushed with fiery garlic-Byadgi red chutney, stuffed with turmeric potato palya and served beside aromatic drumstick tiffin sambar.",
    cuisine: "South Indian Tiffin",
    difficulty: "Intermediate",
    source_type: "youtube_shorts",
    source_url: "https://www.youtube.com/shorts/potly-mysore-dosa",
    prep_time_minutes: 10,
    cook_time_minutes: 15,
    servings: 3,
    estimated_total_cost_inr: 140,
    hero_image_url: "/recipes/mysore-masala-dosa-3d.jpg",
    likes_count: 734,
    forks_count: 112,
    author_name: "Chef Arvind Narayan",
    parent_recipe_id: null,
    remix_mode: null,
    remix_note: null,
    similarity_score: 0.96,
    created_at: "2026-11-11T09:30:00Z",
    tags: [
      "south-indian",
      "tiffin",
      "crispy",
      "vegetarian",
      "gluten-free",
    ],
    reviews: [],
    ingredients: [
      {
        name: "fermented dosa batter (idli rice & urad dal)",
        quantity: 3,
        unit: "katori",
        aisle_category: "pantry_dry",
        preparation_note: "brought to pouring ribbon consistency",
        nutrition_meta: {
          calories_kcal: 690,
          protein_g: 21,
          carbs_g: 138,
          fat_g: 4.5,
          fiber_g: 7.2,
          estimated_cost_inr: 45,
          grams_equivalent: 450,
          allergens: [],
          dietary_flags: ["vegan", "dairy-free", "gluten-free", "jain-friendly"],
        },
      },
      {
        name: "yukon gold or jyoti potatoes (boiled & smashed)",
        quantity: 2,
        unit: "katori",
        aisle_category: "produce",
        preparation_note: "steamed until fork-tender, lightly mashed",
        nutrition_meta: {
          calories_kcal: 255,
          protein_g: 6,
          carbs_g: 58,
          fat_g: 0.4,
          fiber_g: 6.4,
          estimated_cost_inr: 24,
          grams_equivalent: 300,
          allergens: [],
          dietary_flags: ["vegan", "dairy-free", "gluten-free"],
        },
      },
      {
        name: "roasted chana dal (dalia) & fresh grated coconut",
        quantity: 1,
        unit: "katori",
        aisle_category: "pantry_dry",
        preparation_note: "ground silky with curry leaves and green chili",
        nutrition_meta: {
          calories_kcal: 280,
          protein_g: 12.5,
          carbs_g: 26,
          fat_g: 14,
          fiber_g: 8.5,
          estimated_cost_inr: 32,
          grams_equivalent: 150,
          allergens: [],
          dietary_flags: ["vegan", "dairy-free", "gluten-free", "jain-friendly"],
        },
      },
      {
        name: "byadgi red chili & garlic mysore paste",
        quantity: 3,
        unit: "tbsp",
        aisle_category: "spices_masalas",
        preparation_note: "soaked chilies ground with roasted cumin and lime",
        nutrition_meta: {
          calories_kcal: 65,
          protein_g: 2.1,
          carbs_g: 11,
          fat_g: 1.8,
          fiber_g: 3.4,
          estimated_cost_inr: 15,
          grams_equivalent: 45,
          allergens: [],
          dietary_flags: ["vegan", "dairy-free", "gluten-free"],
        },
      },
      {
        name: "cultured cow ghee & cold-pressed sesame oil",
        quantity: 3,
        unit: "tbsp",
        aisle_category: "spices_oils",
        preparation_note: "drizzled around crepe edges for shattering crispness",
        nutrition_meta: {
          calories_kcal: 360,
          protein_g: 0,
          carbs_g: 0,
          fat_g: 40,
          fiber_g: 0,
          estimated_cost_inr: 24,
          grams_equivalent: 45,
          allergens: ["dairy"],
          dietary_flags: ["vegetarian", "gluten-free", "jain-friendly"],
        },
      },
    ],
    timeline_steps: [
      {
        step_number: 1,
        title: "Grind Red Mysore Paste & Prep Potato Palya",
        instruction:
          "Blend soaked Byadgi chilies, garlic, and roasted chana into a smooth red paste; slice onions and curry leaves for potato palya.",
        track: "prep",
        duration_seconds: 240,
        start_offset_seconds: 0,
        depends_on_steps: [],
        equipment: ["Mixer Jar", "Chef's Knife"],
        ingredient_names: [
          "byadgi red chili & garlic mysore paste",
          "yukon gold or jyoti potatoes (boiled & smashed)",
        ],
        timer_label: "Prep Chutney & Palya (4m)",
        sensory_cue: "Vibrant crimson spice paste with nutty garlic aroma",
      },
      {
        step_number: 2,
        title: "Steep Tiffin Sambar & Rest Dosa Batter at Room Temp",
        instruction:
          "Simmer cooked toor dal with sambar powder, tamarind, and curry leaves while bringing cold dosa batter to smooth room temperature.",
        track: "passive_wait",
        duration_seconds: 360,
        start_offset_seconds: 240,
        depends_on_steps: [1],
        equipment: ["Saucepan"],
        ingredient_names: ["fermented dosa batter (idli rice & urad dal)"],
        timer_label: "Simmer Sambar (6m)",
        sensory_cue: "Tangy roast-coriander steam rising from the pot",
      },
      {
        step_number: 3,
        title: "Swirl Paper-Thin Dosas & Brush Mysore Chili Spread",
        instruction:
          "Season cast-iron tawa, ladle batter outward in thin spirals, drizzle ghee, spread red Mysore paste, and roast until deeply speckled gold.",
        track: "active_cook",
        duration_seconds: 420,
        start_offset_seconds: 600,
        depends_on_steps: [2],
        equipment: ["Seasoned Cast-Iron Dosa Tawa"],
        ingredient_names: [
          "fermented dosa batter (idli rice & urad dal)",
          "cultured cow ghee & cold-pressed sesame oil",
        ],
        timer_label: "Crisp Dosas (7m)",
        sensory_cue: "Lacy edges lift cleanly off the tawa with a crisp snap",
      },
      {
        step_number: 4,
        title: "Fold Over Potato Palya & Serve with Coconut Chutney",
        instruction:
          "Spoon warm turmeric potato palya along the center ridge, fold cleanly into golden cylinders, and plate beside hot sambar and chana chutney.",
        track: "plating",
        duration_seconds: 120,
        start_offset_seconds: 1020,
        depends_on_steps: [3],
        equipment: ["Flat Offset Spatula", "Brass Tiffin Plate"],
        ingredient_names: [
          "roasted chana dal (dalia) & fresh grated coconut",
        ],
        timer_label: null,
        sensory_cue: "Audible crackle when folded onto a warm steel plate",
      },
    ],
  },
  {
    id: "11111111-1111-4111-8111-111111111104",
    title: "Air-Fryer Tandoori Chicken Tikka & Mint-Curd Quinoa Bowl",
    slug: "air-fryer-tandoori-chicken-tikka-bowl",
    description:
      "Juicy boneless chicken thighs glazed in smoked mustard-kasuri methi yogurt marinade, air-fried at high heat over herb-tossed quinoa and pickled onions.",
    cuisine: "High-Protein North Indian",
    difficulty: "Easy",
    source_type: "instagram_reel",
    source_url: "https://www.instagram.com/reel/potly-tandoori-bowl",
    prep_time_minutes: 10,
    cook_time_minutes: 12,
    servings: 2,
    estimated_total_cost_inr: 240,
    hero_image_url: "/recipes/tandoori-chicken-bowl-3d.jpg",
    likes_count: 891,
    forks_count: 148,
    author_name: "Chef Vikramaditya Sen",
    parent_recipe_id: null,
    remix_mode: null,
    remix_note: null,
    similarity_score: 0.95,
    created_at: "2026-11-12T14:15:00Z",
    tags: [
      "high-protein",
      "air-fryer",
      "low-calorie",
      "meal-prep",
      "north-indian",
    ],
    reviews: [],
    ingredients: [
      {
        name: "boneless chicken thighs (skinless tikka cut)",
        quantity: 400,
        unit: "g",
        aisle_category: "meat_seafood",
        preparation_note: "trimmed into 1.5-inch bite pieces",
        nutrition_meta: {
          calories_kcal: 560,
          protein_g: 76,
          carbs_g: 0,
          fat_g: 26,
          fiber_g: 0,
          estimated_cost_inr: 145,
          grams_equivalent: 400,
          allergens: [],
          dietary_flags: ["dairy-free", "gluten-free", "high-protein"],
        },
      },
      {
        name: "strained thick greek curd (hung dahi)",
        quantity: 0.75,
        unit: "katori",
        aisle_category: "dairy_eggs",
        preparation_note: "split between marinade and mint chutney drizzle",
        nutrition_meta: {
          calories_kcal: 110,
          protein_g: 11.5,
          carbs_g: 4.8,
          fat_g: 4.5,
          fiber_g: 0,
          estimated_cost_inr: 28,
          grams_equivalent: 112.5,
          allergens: ["dairy"],
          dietary_flags: ["vegetarian", "gluten-free", "high-protein"],
        },
      },
      {
        name: "cooked tricolor quinoa or millet",
        quantity: 1.5,
        unit: "katori",
        aisle_category: "pantry_dry",
        preparation_note: "fluffed with lime zest and fresh coriander",
        nutrition_meta: {
          calories_kcal: 270,
          protein_g: 9.8,
          carbs_g: 48,
          fat_g: 4.2,
          fiber_g: 6.2,
          estimated_cost_inr: 42,
          grams_equivalent: 225,
          allergens: [],
          dietary_flags: ["vegan", "dairy-free", "gluten-free", "jain-friendly"],
        },
      },
      {
        name: "tandoori masala, ginger-garlic & kasuri methi",
        quantity: 2,
        unit: "tbsp",
        aisle_category: "spices_masalas",
        preparation_note: "crushed fenugreek leaves rubbed between palms",
        nutrition_meta: {
          calories_kcal: 38,
          protein_g: 1.4,
          carbs_g: 6.2,
          fat_g: 1.1,
          fiber_g: 2.8,
          estimated_cost_inr: 12,
          grams_equivalent: 20,
          allergens: [],
          dietary_flags: ["vegan", "dairy-free", "gluten-free"],
        },
      },
      {
        name: "fresh mint, coriander & pickled onion rings",
        quantity: 1,
        unit: "katori",
        aisle_category: "produce",
        preparation_note: "tossed in sumac or chaat masala + lemon juice",
        nutrition_meta: {
          calories_kcal: 42,
          protein_g: 1.6,
          carbs_g: 8.4,
          fat_g: 0.3,
          fiber_g: 3.1,
          estimated_cost_inr: 13,
          grams_equivalent: 150,
          allergens: [],
          dietary_flags: ["vegan", "dairy-free", "gluten-free"],
        },
      },
    ],
    timeline_steps: [
      {
        step_number: 1,
        title: "Coat Chicken in Smoked Curd & Bloom Quinoa",
        instruction:
          "Whisk hung curd with ginger-garlic, tandoori masala, and a splash of mustard oil; coat chicken bites and start simmering rinsed quinoa.",
        track: "prep",
        duration_seconds: 240,
        start_offset_seconds: 0,
        depends_on_steps: [],
        equipment: ["Mixing Bowl", "Small Saucepan"],
        ingredient_names: [
          "boneless chicken thighs (skinless tikka cut)",
          "strained thick greek curd (hung dahi)",
        ],
        timer_label: "Marinade & Quinoa (4m)",
        sensory_cue: "Warm smoky-mustard gloss coating every piece",
      },
      {
        step_number: 2,
        title: "Rest Marinade While Quinoa Steams & Fluffs",
        instruction:
          "Let the spiced tikka sit for 8 minutes while covered quinoa absorbs water on low heat and crisp pickled onions chill.",
        track: "passive_wait",
        duration_seconds: 480,
        start_offset_seconds: 240,
        depends_on_steps: [1],
        equipment: ["Covered Pan"],
        ingredient_names: ["cooked tricolor quinoa or millet"],
        timer_label: "Steep & Steam (8m)",
        sensory_cue: "Tiny steam vents across tender translucent quinoa grains",
      },
      {
        step_number: 3,
        title: "200°C Air-Fry Chicken Tikka Until Charred",
        instruction:
          "Arrange marinated chicken in a single basket layer and air-fry at 200°C for 10 minutes, flipping halfway for charred edges.",
        track: "active_cook",
        duration_seconds: 600,
        start_offset_seconds: 720,
        depends_on_steps: [2],
        equipment: ["Air-Fryer Basket"],
        ingredient_names: ["boneless chicken thighs (skinless tikka cut)"],
        timer_label: "Air-Fry Tikka (10m)",
        sensory_cue: "Caramelized dark-amber spots and juicy sizzle",
      },
      {
        step_number: 4,
        title: "Layer Bowls with Mint-Curd Drizzle & Laccha Onions",
        instruction:
          "Spoon lime-herb quinoa into deep bowls, crown with sizzling tikka, drizzle cool mint yogurt chutney, and finish with crunchy onions.",
        track: "plating",
        duration_seconds: 120,
        start_offset_seconds: 1320,
        depends_on_steps: [3],
        equipment: ["Serving Bowls", "Tongs"],
        ingredient_names: ["fresh mint, coriander & pickled onion rings"],
        timer_label: null,
        sensory_cue: "Cool herb contrast against smoky-hot tandoori char",
      },
    ],
  },
  {
    id: "11111111-1111-4111-8111-111111111105",
    title: "Malabar Coconut Prawn Roast (Chemmeen Ularthiyathu) & Appam",
    slug: "malabar-coconut-prawn-roast",
    description:
      "Sweet coastal prawns pan-roasted in virgin coconut oil with toasted coconut slivers, cracked black pepper, shallots, and lacy hopper appams.",
    cuisine: "Kerala Coastal",
    difficulty: "Intermediate",
    source_type: "website_url",
    source_url: "https://potly-kitchen.vercel.app/recipes/chemmeen-roast",
    prep_time_minutes: 10,
    cook_time_minutes: 15,
    servings: 3,
    estimated_total_cost_inr: 310,
    hero_image_url: "/recipes/malabar-prawn-appam-3d.jpg",
    likes_count: 589,
    forks_count: 68,
    author_name: "Chef Deepa Menon",
    parent_recipe_id: null,
    remix_mode: null,
    remix_note: null,
    similarity_score: 0.93,
    created_at: "2026-11-13T11:00:00Z",
    tags: [
      "kerala",
      "coastal",
      "high-protein",
      "seafood",
      "dairy-free",
    ],
    reviews: [],
    ingredients: [
      {
        name: "tiger prawns (deveined, tail-on)",
        quantity: 350,
        unit: "g",
        aisle_category: "meat_seafood",
        preparation_note: "rubbed with turmeric, lemon juice, and sea salt",
        nutrition_meta: {
          calories_kcal: 346,
          protein_g: 71,
          carbs_g: 3,
          fat_g: 4.5,
          fiber_g: 0,
          estimated_cost_inr: 215,
          grams_equivalent: 350,
          allergens: ["shellfish"],
          dietary_flags: ["dairy-free", "gluten-free", "high-protein"],
        },
      },
      {
        name: "kerala shallots (chuvanna ulli) & ginger",
        quantity: 1.25,
        unit: "katori",
        aisle_category: "produce",
        preparation_note: "thinly sliced with generous fresh curry leaves",
        nutrition_meta: {
          calories_kcal: 112,
          protein_g: 3.4,
          carbs_g: 24,
          fat_g: 0.3,
          fiber_g: 4.1,
          estimated_cost_inr: 32,
          grams_equivalent: 187.5,
          allergens: [],
          dietary_flags: ["vegan", "dairy-free", "gluten-free"],
        },
      },
      {
        name: "thenga kothu (thin coconut slivers)",
        quantity: 0.5,
        unit: "katori",
        aisle_category: "produce",
        preparation_note: "crisped golden in coconut oil before sautéing",
        nutrition_meta: {
          calories_kcal: 195,
          protein_g: 2.1,
          carbs_g: 8.2,
          fat_g: 18.5,
          fiber_g: 5,
          estimated_cost_inr: 18,
          grams_equivalent: 75,
          allergens: [],
          dietary_flags: ["vegan", "dairy-free", "gluten-free", "jain-friendly"],
        },
      },
      {
        name: "tellicherry black pepper & kudampuli extract",
        quantity: 2,
        unit: "tbsp",
        aisle_category: "spices_masalas",
        preparation_note: "coarsely pounded peppercorns with tangy gambooge",
        nutrition_meta: {
          calories_kcal: 44,
          protein_g: 1.6,
          carbs_g: 9.8,
          fat_g: 0.5,
          fiber_g: 3.8,
          estimated_cost_inr: 20,
          grams_equivalent: 20,
          allergens: [],
          dietary_flags: ["vegan", "dairy-free", "gluten-free"],
        },
      },
      {
        name: "fermented coconut appam batter",
        quantity: 2,
        unit: "katori",
        aisle_category: "pantry_dry",
        preparation_note: "for lacy appam cups beside the roast",
        nutrition_meta: {
          calories_kcal: 380,
          protein_g: 7.4,
          carbs_g: 78,
          fat_g: 3.8,
          fiber_g: 2.2,
          estimated_cost_inr: 25,
          grams_equivalent: 300,
          allergens: [],
          dietary_flags: ["vegan", "dairy-free", "gluten-free", "jain-friendly"],
        },
      },
    ],
    timeline_steps: [
      {
        step_number: 1,
        title: "Season Prawns & Slice Shallots + Coconut Slivers",
        instruction:
          "Coat cleaned tiger prawns in turmeric and salt; slice shallots, ginger, and thin thenga kothu coconut chips.",
        track: "prep",
        duration_seconds: 240,
        start_offset_seconds: 0,
        depends_on_steps: [],
        equipment: ["Mixing Bowl", "Chef's Knife"],
        ingredient_names: [
          "tiger prawns (deveined, tail-on)",
          "kerala shallots (chuvanna ulli) & ginger",
        ],
        timer_label: "Prep Coastal Base (4m)",
        sensory_cue: "Bright turmeric stain on glistening prawns",
      },
      {
        step_number: 2,
        title: "Soak Kudampuli & Rest Coated Prawns",
        instruction:
          "Steep smoked kudampuli pieces in warm water while shallots sit salted for faster caramelization.",
        track: "passive_wait",
        duration_seconds: 300,
        start_offset_seconds: 240,
        depends_on_steps: [1],
        equipment: ["Small Bowl"],
        ingredient_names: ["tellicherry black pepper & kudampuli extract"],
        timer_label: "Infuse Kudampuli (5m)",
        sensory_cue: "Smoky citrus fragrance rising from warm soak",
      },
      {
        step_number: 3,
        title: "Roast Shallots, Coconut Chips & Flash-Sear Prawns",
        instruction:
          "Toast coconut slivers in hot coconut oil, brown shallots deeply with curry leaves, then sear prawns with crushed black pepper for 5 minutes.",
        track: "active_cook",
        duration_seconds: 480,
        start_offset_seconds: 540,
        depends_on_steps: [2],
        equipment: ["Uruli or Cast-Iron Skillet", "Appachatti Pan"],
        ingredient_names: [
          "thenga kothu (thin coconut slivers)",
          "tiger prawns (deveined, tail-on)",
        ],
        timer_label: "Roast Prawns & Appam (8m)",
        sensory_cue: "Glossy dark pepper masala clinging tightly to curled prawns",
      },
      {
        step_number: 4,
        title: "Plate Glossy Chemmeen Over Lacy Appams",
        instruction:
          "Finish prawns with fresh curry leaves and swirl crisp lacy appams onto warm stoneware plates.",
        track: "plating",
        duration_seconds: 120,
        start_offset_seconds: 1020,
        depends_on_steps: [3],
        equipment: ["Serving Platter"],
        ingredient_names: ["fermented coconut appam batter"],
        timer_label: null,
        sensory_cue: "Pillowy soft centers with crisp lace-thin appam rims",
      },
    ],
  },
  {
    id: "11111111-1111-4111-8111-111111111106",
    title: "15-Minute Mumbai Tawa Pav Bhaji with Roasted Beetroot & Makkhan",
    slug: "mumbai-tawa-pav-bhaji",
    description:
      "Velvety Chowpatty-style vegetable bhaji naturally tinted crimson with grated beetroot, blistered on a hot tawa alongside white-butter toasted ladi pav.",
    cuisine: "West Indian Street Classic",
    difficulty: "Easy",
    source_type: "manual",
    source_url: null,
    prep_time_minutes: 8,
    cook_time_minutes: 12,
    servings: 3,
    estimated_total_cost_inr: 155,
    hero_image_url: "/recipes/mumbai-pav-bhaji-3d.jpg",
    likes_count: 678,
    forks_count: 89,
    author_name: "Chef Siddharth Kulkarni",
    parent_recipe_id: null,
    remix_mode: null,
    remix_note: null,
    similarity_score: 0.92,
    created_at: "2026-11-14T16:45:00Z",
    tags: [
      "street-food",
      "vegetarian",
      "west-indian",
      "quick-dinner",
      "budget-friendly",
    ],
    reviews: [],
    ingredients: [
      {
        name: "cauliflower florets, green peas & potato mix",
        quantity: 3,
        unit: "katori",
        aisle_category: "produce",
        preparation_note: "pressure-cooked 2 whistles with grated beetroot",
        nutrition_meta: {
          calories_kcal: 360,
          protein_g: 13.5,
          carbs_g: 74,
          fat_g: 1.5,
          fiber_g: 15.2,
          estimated_cost_inr: 45,
          grams_equivalent: 450,
          allergens: [],
          dietary_flags: ["vegan", "dairy-free", "gluten-free", "jain-friendly"],
        },
      },
      {
        name: "sweet red onion & green capsicum",
        quantity: 1,
        unit: "katori",
        aisle_category: "produce",
        preparation_note: "finely brunoised for sweet-crisp tawa sear",
        nutrition_meta: {
          calories_kcal: 54,
          protein_g: 1.8,
          carbs_g: 12,
          fat_g: 0.2,
          fiber_g: 2.8,
          estimated_cost_inr: 22,
          grams_equivalent: 150,
          allergens: [],
          dietary_flags: ["vegan", "dairy-free", "gluten-free"],
        },
      },
      {
        name: "soft bakery ladi pav buns (6 buns)",
        quantity: 6,
        unit: "piece",
        aisle_category: "bakery_bread",
        preparation_note: "halved horizontally for butter-masala toasting",
        nutrition_meta: {
          calories_kcal: 620,
          protein_g: 18,
          carbs_g: 118,
          fat_g: 8.5,
          fiber_g: 4.5,
          estimated_cost_inr: 36,
          grams_equivalent: 240,
          allergens: ["gluten"],
          dietary_flags: ["vegan", "dairy-free"],
        },
      },
      {
        name: "kolhapuri pav bhaji masala & kasuri methi",
        quantity: 2.5,
        unit: "tbsp",
        aisle_category: "spices_masalas",
        preparation_note: "bloomed directly on the buttered tawa well",
        nutrition_meta: {
          calories_kcal: 55,
          protein_g: 2.1,
          carbs_g: 9.8,
          fat_g: 1.6,
          fiber_g: 3.9,
          estimated_cost_inr: 18,
          grams_equivalent: 25,
          allergens: [],
          dietary_flags: ["vegan", "dairy-free", "gluten-free", "jain-friendly"],
        },
      },
      {
        name: "cultured salted table butter (makkhan)",
        quantity: 3,
        unit: "tbsp",
        aisle_category: "dairy_eggs",
        preparation_note: "divided between bhaji mash and pav crust",
        nutrition_meta: {
          calories_kcal: 306,
          protein_g: 0.3,
          carbs_g: 0,
          fat_g: 34.5,
          fiber_g: 0,
          estimated_cost_inr: 34,
          grams_equivalent: 45,
          allergens: ["dairy"],
          dietary_flags: ["vegetarian", "gluten-free", "jain-friendly"],
        },
      },
    ],
    timeline_steps: [
      {
        step_number: 1,
        title: "Dice Veggies & Prepare Beetroot Tawa Color Base",
        instruction:
          "Chop potatoes, cauliflower, beetroot, onions, and capsicum into uniform quick-cook dice.",
        track: "prep",
        duration_seconds: 180,
        start_offset_seconds: 0,
        depends_on_steps: [],
        equipment: ["Chef's Knife", "Cutting Board"],
        ingredient_names: [
          "cauliflower florets, green peas & potato mix",
          "sweet red onion & green capsicum",
        ],
        timer_label: "Dice Bhaji Veggies (3m)",
        sensory_cue: "Ruby beetroot staining diced florets naturally bright pink",
      },
      {
        step_number: 2,
        title: "2-Whistle Pressure Steam Mixed Veggies",
        instruction:
          "Steam cauliflower, peas, potato, and beetroot in 1 katori water for 5 minutes until effortlessly smashable.",
        track: "passive_wait",
        duration_seconds: 300,
        start_offset_seconds: 180,
        depends_on_steps: [1],
        equipment: ["Pressure Cooker"],
        ingredient_names: ["cauliflower florets, green peas & potato mix"],
        timer_label: "Steam Bhaji Base (5m)",
        sensory_cue: "Two sharp whistles and tender steam release",
      },
      {
        step_number: 3,
        title: "Mash Bhaji in Butter & Toast Spiced Ladi Pav",
        instruction:
          "Sauté onion-capsicum with pav bhaji masala on a wide tawa, mash in steamed veggies until silky, and toast halved pav in remaining buttered spice.",
        track: "active_cook",
        duration_seconds: 420,
        start_offset_seconds: 480,
        depends_on_steps: [2],
        equipment: ["Wide Iron Tawa", "Steel Potato Masher"],
        ingredient_names: [
          "kolhapuri pav bhaji masala & kasuri methi",
          "cultured salted table butter (makkhan)",
          "soft bakery ladi pav buns (6 buns)",
        ],
        timer_label: "Mash & Toast Pav (7m)",
        sensory_cue: "Glossy crimson bubbles breaking lazily across the tawa",
      },
      {
        step_number: 4,
        title: "Crown with White Makkhan, Coriander & Lime Wedges",
        instruction:
          "Swirl hot bhaji into divided steel plates with a pat of melting butter, diced onion crunch, coriander, and fresh lime.",
        track: "plating",
        duration_seconds: 90,
        start_offset_seconds: 900,
        depends_on_steps: [3],
        equipment: ["Divided Thali Plate"],
        ingredient_names: ["sweet red onion & green capsicum"],
        timer_label: null,
        sensory_cue: "Toasty buttered pav crisp on the edges, cloud-soft inside",
      },
    ],
  },
  {
    id: "11111111-1111-4111-8111-111111111107",
    title: "Kolkata Kosha Chana & Soya Masala with Fragrant Basanti Pulao",
    slug: "kolkata-kosha-chana-soya-basanti-pulao",
    description:
      "Slow-caramelized Bengali kosha masala with protein-rich soya chunks and kabuli chana paired beside saffron-cashew Gobindobhog basanti pulao.",
    cuisine: "East Indian Bengali",
    difficulty: "Intermediate",
    source_type: "website_url",
    source_url: "https://potly-kitchen.vercel.app/recipes/kosha-basanti-pulao",
    prep_time_minutes: 10,
    cook_time_minutes: 18,
    servings: 3,
    estimated_total_cost_inr: 175,
    hero_image_url: "/recipes/kolkata-kosha-pulao-3d.jpg",
    likes_count: 512,
    forks_count: 64,
    author_name: "Chef Sohini Chatterjee",
    parent_recipe_id: null,
    remix_mode: null,
    remix_note: null,
    similarity_score: 0.91,
    created_at: "2026-11-15T10:15:00Z",
    tags: [
      "east-indian",
      "high-protein",
      "vegetarian",
      "festive",
      "soya-chana",
    ],
    reviews: [],
    ingredients: [
      {
        name: "boiled kabuli chana & pressed soya nuggets",
        quantity: 2.5,
        unit: "katori",
        aisle_category: "pantry_dry",
        preparation_note: "soya squeezed dry after warm-salt soak",
        nutrition_meta: {
          calories_kcal: 540,
          protein_g: 56,
          carbs_g: 64,
          fat_g: 5.5,
          fiber_g: 19,
          estimated_cost_inr: 62,
          grams_equivalent: 375,
          allergens: ["soy"],
          dietary_flags: [
            "vegan",
            "dairy-free",
            "gluten-free",
            "high-protein",
            "jain-friendly",
          ],
        },
      },
      {
        name: "gobindobhog short-grain aromatic rice",
        quantity: 1.5,
        unit: "katori",
        aisle_category: "pantry_dry",
        preparation_note: "coated evenly in turmeric, ginger paste, and ghee",
        nutrition_meta: {
          calories_kcal: 760,
          protein_g: 15.2,
          carbs_g: 166,
          fat_g: 1.8,
          fiber_g: 2.6,
          estimated_cost_inr: 52,
          grams_equivalent: 225,
          allergens: [],
          dietary_flags: ["vegan", "dairy-free", "gluten-free", "jain-friendly"],
        },
      },
      {
        name: "whole cashews (kaju) & golden kishmish raisins",
        quantity: 0.35,
        unit: "katori",
        aisle_category: "pantry_dry",
        preparation_note: "ghee-toasted until cashews blush warm gold",
        nutrition_meta: {
          calories_kcal: 215,
          protein_g: 5.4,
          carbs_g: 24,
          fat_g: 12.2,
          fiber_g: 1.6,
          estimated_cost_inr: 32,
          grams_equivalent: 52.5,
          allergens: ["tree_nuts"],
          dietary_flags: ["vegan", "dairy-free", "gluten-free", "jain-friendly"],
        },
      },
      {
        name: "bengali bhaja masala, bay leaf & mustard oil",
        quantity: 2,
        unit: "tbsp",
        aisle_category: "spices_masalas",
        preparation_note: "roasted cumin-coriander-cardamom spice blend",
        nutrition_meta: {
          calories_kcal: 145,
          protein_g: 1.4,
          carbs_g: 6.5,
          fat_g: 12,
          fiber_g: 2.2,
          estimated_cost_inr: 15,
          grams_equivalent: 25,
          allergens: [],
          dietary_flags: ["vegan", "dairy-free", "gluten-free", "jain-friendly"],
        },
      },
      {
        name: "caramelized red onions & hung curd marinade",
        quantity: 1,
        unit: "katori",
        aisle_category: "produce",
        preparation_note: "ground silky for dark glossy kosha gravy",
        nutrition_meta: {
          calories_kcal: 105,
          protein_g: 7.5,
          carbs_g: 12,
          fat_g: 2.8,
          fiber_g: 2.1,
          estimated_cost_inr: 14,
          grams_equivalent: 150,
          allergens: ["dairy"],
          dietary_flags: ["vegetarian", "gluten-free"],
        },
      },
    ],
    timeline_steps: [
      {
        step_number: 1,
        title: "Soak Gobindobhog Rice in Turmeric & Press Soya Chunks",
        instruction:
          "Coat washed Gobindobhog rice in haldi and ghee to dry briefly; boil and squeeze soya chunks dry before seasoning.",
        track: "prep",
        duration_seconds: 240,
        start_offset_seconds: 0,
        depends_on_steps: [],
        equipment: ["Mixing Bowls", "Colander"],
        ingredient_names: [
          "gobindobhog short-grain aromatic rice",
          "boiled kabuli chana & pressed soya nuggets",
        ],
        timer_label: "Marinade Rice & Soya (4m)",
        sensory_cue: "Vibrant marigold-yellow glow on short fragrant grains",
      },
      {
        step_number: 2,
        title: "Slow-Steam Fragrant Basanti Pulao (1:2 Ratio)",
        instruction:
          "Bloom whole tej patta and cashews, stir in saffron-yellow Gobindobhog rice, add 3 katori hot water, and cover on low flame for 10 minutes.",
        track: "passive_wait",
        duration_seconds: 600,
        start_offset_seconds: 240,
        depends_on_steps: [1],
        equipment: ["Heavy Dutch Oven"],
        ingredient_names: [
          "gobindobhog short-grain aromatic rice",
          "whole cashews (kaju) & golden kishmish raisins",
        ],
        timer_label: "Dum Steam Pulao (10m)",
        sensory_cue: "Floral nutmeg-cardamom aroma wafting under the lid",
      },
      {
        step_number: 3,
        title: "Slow-Kosha Chana & Soya in Mustard-Bhaja Masala",
        instruction:
          "While pulao steams, caramelize onions and spice paste until dark mahogany, fold in chana and soya chunks, and sear over medium heat until glossy.",
        track: "active_cook",
        duration_seconds: 480,
        start_offset_seconds: 300,
        depends_on_steps: [1],
        equipment: ["Cast-Iron Kadhai"],
        ingredient_names: [
          "boiled kabuli chana & pressed soya nuggets",
          "bengali bhaja masala, bay leaf & mustard oil",
          "caramelized red onions & hung curd marinade",
        ],
        timer_label: "Kosha Gravy (8m)",
        sensory_cue: "Deep chestnut gravy releasing toasted garam masala oil",
      },
      {
        step_number: 4,
        title: "Fluff Cashew Basanti Pulao & Spoon Warm Kosha",
        instruction:
          "Fluff steamed golden pulao grains gently with a fork and ladle glossy kosha chana-soya beside plump raisins.",
        track: "plating",
        duration_seconds: 120,
        start_offset_seconds: 840,
        depends_on_steps: [2, 3],
        equipment: ["Kansa Thali Plate"],
        ingredient_names: ["whole cashews (kaju) & golden kishmish raisins"],
        timer_label: null,
        sensory_cue: "Every golden grain separate and perfumed with rose-cardamom",
      },
    ],
  },
];

export async function fetchRecipes(query?: string): Promise<Recipe[]> {
  if (shouldTryExternalApi()) {
    try {
      const url = query
        ? `${API_BASE}/recipes?q=${encodeURIComponent(query)}`
        : `${API_BASE}/recipes`;
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const remoteRecipes = (await res.json()) as Recipe[];
      if (!query?.trim() && remoteRecipes.length < FALLBACK_RECIPES.length) {
        const remoteSlugs = new Set(remoteRecipes.map((r) => r.slug));
        return [
          ...remoteRecipes,
          ...FALLBACK_RECIPES.filter((r) => !remoteSlugs.has(r.slug)),
        ];
      }
      return remoteRecipes;
    } catch {
      // fall through to local catalogue search
    }
  }
  const q = query?.trim().toLowerCase();
  if (!q) return FALLBACK_RECIPES;
  const matched = FALLBACK_RECIPES.filter(
    (r) =>
      r.title.toLowerCase().includes(q) ||
      r.cuisine.toLowerCase().includes(q) ||
      r.description.toLowerCase().includes(q) ||
      r.tags.some((t) => t.toLowerCase().includes(q)) ||
      r.ingredients.some((i) => i.name.toLowerCase().includes(q))
  );
  return matched.length > 0 ? matched : FALLBACK_RECIPES;
}

export async function parseRecipeWithAI(
  payload: RecipeParseRequest
): Promise<Recipe> {
  if (shouldTryExternalApi()) {
    try {
      const res = await fetch(`${API_BASE}/recipes/parse`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        return (await res.json()) as Recipe;
      }
    } catch {
      // fall back to built-in Next.js /api/recipes/parse route
    }
  }

  const localRes = await fetch("/api/recipes/parse", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!localRes.ok) {
    const errBody = (await localRes.json().catch(() => ({}))) as {
      error?: string;
    };
    throw new Error(errBody.error || `Failed to parse recipe (${localRes.status})`);
  }
  return (await localRes.json()) as Recipe;
}

export async function remixRecipeWithAI(
  recipeId: string,
  remixMode: RemixMode,
  customInstruction?: string,
  targetServings?: number,
  sourceRecipe?: Recipe
): Promise<Recipe> {
  if (shouldTryExternalApi()) {
    try {
      const res = await fetch(`${API_BASE}/recipes/${recipeId}/remix`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          remix_mode: remixMode,
          custom_instruction: customInstruction ?? null,
          target_servings: targetServings ?? null,
        }),
      });
      if (res.ok) {
        return (await res.json()) as Recipe;
      }
    } catch {
      // fall back to built-in client adaptation
    }
  }

  const base =
    sourceRecipe ??
    FALLBACK_RECIPES.find((r) => r.id === recipeId) ??
    FALLBACK_RECIPES[0]!;
  const servings = targetServings ?? base.servings;
  const suffixMap: Record<RemixMode, string> = {
    high_protein: "(+40% High-Protein)",
    jain_no_onion_garlic: "(Jain • No Onion-Garlic)",
    vegan: "(Plant-Based / Vegan)",
    air_fryer: "(Air-Fryer • -65% Oil)",
    low_calorie: "(Light & Low-Calorie)",
  };

  let nextIngredients = [...base.ingredients];
  if (remixMode === "jain_no_onion_garlic") {
    nextIngredients = nextIngredients.map((ing) =>
      /(onion|garlic|lasoon)/i.test(ing.name)
        ? {
            ...ing,
            name: "asafoetida (hing) & fresh grated ginger",
            quantity: 1,
            unit: "tsp",
            preparation_note: "Jain-friendly aromatic base",
          }
        : ing
    );
  } else if (remixMode === "vegan") {
    nextIngredients = nextIngredients.map((ing) => {
      if (/paneer/i.test(ing.name)) {
        return {
          ...ing,
          name: "extra-firm organic tofu",
          preparation_note: "pressed & cubed • dairy-free swap",
        };
      }
      if (/cream|malai|curd|dahi|ghee|butter/i.test(ing.name)) {
        return {
          ...ing,
          name: "soaked cashew malai cream",
          preparation_note: "blended silky • 100% plant-based",
        };
      }
      return ing;
    });
  } else if (remixMode === "high_protein") {
    nextIngredients = nextIngredients.map((ing) =>
      /(paneer|dal|curd|chicken|tofu)/i.test(ing.name)
        ? {
            ...ing,
            quantity: Number((ing.quantity * 1.4).toFixed(2)),
            nutrition_meta: {
              ...ing.nutrition_meta,
              protein_g: Math.round(ing.nutrition_meta.protein_g * 1.4),
              calories_kcal: Math.round(ing.nutrition_meta.calories_kcal * 1.3),
            },
          }
        : ing
    );
  } else if (remixMode === "air_fryer") {
    nextIngredients = nextIngredients.map((ing) =>
      /(oil|ghee|butter|cream)/i.test(ing.name)
        ? {
            ...ing,
            quantity: 1,
            unit: "tsp",
            preparation_note: "light brush for 200°C air-fryer (-65% oil)",
          }
        : ing
    );
  }

  return {
    ...base,
    id: `remix-${Date.now()}`,
    title: `${base.title} ${suffixMap[remixMode]}`,
    servings,
    source_type: "ai_remix",
    parent_recipe_id: base.id,
    remix_mode: remixMode,
    remix_note: customInstruction ?? suffixMap[remixMode],
    ingredients: nextIngredients,
    tags: [...base.tags, remixMode],
    created_at: new Date().toISOString(),
  };
}

export async function forkRecipeOnServer(
  parentRecipe: Recipe,
  remixNote: string,
  scaledIngredients: NormalizedIngredient[],
  servings: number
): Promise<Recipe> {
  ensureExternalApi();
  const payload = {
    title: `${parentRecipe.title} (Remix)`,
    description: parentRecipe.description,
    cuisine: parentRecipe.cuisine,
    difficulty: parentRecipe.difficulty,
    source_type: "ai_remix",
    source_url: parentRecipe.source_url,
    prep_time_minutes: parentRecipe.prep_time_minutes,
    cook_time_minutes: parentRecipe.cook_time_minutes,
    servings,
    estimated_total_cost_inr: parentRecipe.estimated_total_cost_inr,
    hero_image_url: parentRecipe.hero_image_url,
    ingredients: scaledIngredients,
    timeline_steps: parentRecipe.timeline_steps,
    tags: [...parentRecipe.tags, "remixed"],
    parent_recipe_id: parentRecipe.id,
    remix_note: remixNote,
  };
  const res = await fetch(`${API_BASE}/recipes`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    throw new Error(`Failed to fork recipe (${res.status})`);
  }
  return (await res.json()) as Recipe;
}

export async function requestIngredientSubstitution(
  ingredient: NormalizedIngredient,
  recipeTitle: string,
  dietaryReason?: string
): Promise<IngredientSubstitutionResponse> {
  ensureExternalApi();
  const res = await fetch(`${API_BASE}/recipes/substitute`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ingredient,
      recipe_title: recipeTitle,
      dietary_reason: dietaryReason ?? null,
    }),
  });
  if (!res.ok) {
    throw new Error(`Substitution request failed (${res.status})`);
  }
  return (await res.json()) as IngredientSubstitutionResponse;
}

export async function mergeMultiRecipeTimeline(
  recipeIds: string[],
  availableBurners = 3
): Promise<MultiRecipeTimelineResponse> {
  if (shouldTryExternalApi()) {
    try {
      const res = await fetch(`${API_BASE}/timelines/merge`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipe_ids: recipeIds,
          available_burners: availableBurners,
        }),
      });
      if (res.ok) {
        return (await res.json()) as MultiRecipeTimelineResponse;
      }
    } catch {
      // fall back to built-in parallel timeline interleaver
    }
  }

  const chosen = recipeIds
    .map((id) => FALLBACK_RECIPES.find((r) => r.id === id))
    .filter((r): r is Recipe => Boolean(r));
  const pool = chosen.length >= 2 ? chosen : FALLBACK_RECIPES.slice(0, 2);
  const colors = ["#3f6212", "#C44D28", "#DF9B35", "#1E1612"];

  const seqSec = pool.reduce(
    (sum, r) =>
      sum + r.timeline_steps.reduce((s, st) => s + st.duration_seconds, 0),
    0
  );
  const totalSec = Math.max(
    900,
    Math.round(seqSec / Math.max(1.3, Math.min(2.1, availableBurners * 0.65)))
  );

  const interleaved = pool
    .flatMap((r, rIdx) =>
      r.timeline_steps.map((st, sIdx) => ({
        global_step_number: rIdx * 10 + sIdx + 1,
        recipe_id: r.id,
        recipe_title: r.title,
        recipe_color_hex: colors[rIdx % colors.length] ?? "#3f6212",
        title: st.title,
        instruction: st.instruction,
        track: st.track,
        duration_seconds: st.duration_seconds,
        start_offset_seconds: Math.min(
          totalSec - st.duration_seconds,
          Math.round(st.start_offset_seconds * 0.75 + rIdx * 180)
        ),
        overlap_reason:
          st.track === "active_cook" && rIdx > 0
            ? "Overlapped inside passive pressure-cook / marination wait window"
            : null,
        equipment: st.equipment,
        timer_label: st.timer_label,
        sensory_cue: st.sensory_cue,
      }))
    )
    .sort((a, b) => a.start_offset_seconds - b.start_offset_seconds)
    .map((node, i) => ({ ...node, global_step_number: i + 1 }));

  return {
    id: `tl-${Date.now()}`,
    title: `${pool.map((r) => r.title.split(" ")[0]).join(" + ")} Synchronized Prep`,
    recipe_ids: pool.map((r) => r.id),
    recipe_titles: pool.map((r) => r.title),
    sequential_duration_seconds: seqSec,
    total_duration_seconds: totalSec,
    time_saved_seconds: Math.max(0, seqSec - totalSec),
    interleaved_steps: interleaved,
    created_at: new Date().toISOString(),
  };
}

export interface SousChefLocalContext {
  unitSystem?: UnitSystem;
  scaleFactor?: number;
  stepTitle?: string;
  stepDurationSeconds?: number;
  sensoryCue?: string | null;
  equipment?: string[];
}

function findMatchingIngredient(
  query: string,
  ingredients: NormalizedIngredient[]
): NormalizedIngredient | undefined {
  const stopWords = new Set([
    "how",
    "much",
    "many",
    "what",
    "can",
    "use",
    "for",
    "substitute",
    "replace",
    "swap",
    "instead",
    "with",
    "need",
    "the",
    "do",
    "of",
    "is",
    "in",
  ]);
  const tokens = query
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length >= 3 && !stopWords.has(w));
  if (tokens.length === 0) return ingredients[0];

  let best: { ing: NormalizedIngredient; score: number } | null = null;
  for (const ing of ingredients) {
    const ingLower = ing.name.toLowerCase();
    let score = 0;
    for (const tok of tokens) {
      if (ingLower.includes(tok)) score += tok.length;
    }
    if (score > 0 && (!best || score > best.score)) {
      best = { ing, score };
    }
  }
  return best?.ing;
}

function getSmartSubstitutionAdvice(ingredientName: string): string {
  const lower = ingredientName.toLowerCase();
  if (/cream|malai/.test(lower)) {
    return `Swap ${ingredientName} 1:1 with soaked cashew paste (15g cashews blended smooth with 2 tbsp warm water) or whisked hung curd for the same silky finish.`;
  }
  if (/paneer/.test(lower)) {
    return `Swap ${ingredientName} 1:1 with pressed extra-firm organic tofu marinated in lemon juice, turmeric, and salt, or grilled halloumi.`;
  }
  if (/ghee|butter|makkhan/.test(lower)) {
    return `Swap ${ingredientName} with cold-pressed groundnut oil or virgin coconut oil (for South Indian dishes), adding a pinch of jeera for aroma.`;
  }
  if (/curd|dahi|yogurt/.test(lower)) {
    return `Swap ${ingredientName} with thick coconut yogurt blended with 1 tsp lemon juice, or whisked buttermilk at lower heat so it won't curdle.`;
  }
  if (/mutton|lamb|goat/.test(lower)) {
    return `Swap ${ingredientName} with tender young jackfruit (kathal) or bone-in chicken thighs (reduce pressure cooking from 5 whistles to 2 whistles).`;
  }
  if (/shallot|onion|garlic/.test(lower)) {
    return `For a Jain or zero-allium swap, replace ${ingredientName} with 1/2 tsp compounded asafoetida (hing), 1 tbsp grated ginger, and toasted fennel powder.`;
  }
  if (/coconut/.test(lower)) {
    return `Swap ${ingredientName} with soaked and blended white sesame + cashew paste or 1/3 cup heavy almond milk for nutty body.`;
  }
  if (/tamarind|puli/.test(lower)) {
    return `Swap ${ingredientName} with kokum extract, 1.5 tsp amchoor (dry mango powder), or fresh lime juice stirred in off the heat.`;
  }
  return `If you're out of ${ingredientName}, try doubling the aromatics in Step ${1} or pairing a similar texture (${ingredientName.includes("oil") ? "cold-pressed sesame oil" : "soaked cashew or mild broth base"}) without altering cook times.`;
}

export async function querySousChefVoice(
  payload: SousChefVoiceQueryRequest,
  localContext?: SousChefLocalContext
): Promise<SousChefVoiceQueryResponse> {
  if (shouldTryExternalApi()) {
    try {
      const res = await fetch(`${API_BASE}/sous-chef/voice-query`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        return (await res.json()) as SousChefVoiceQueryResponse;
      }
    } catch {
      // fall through to intelligent built-in kitchen Sous Chef engine
    }
  }

  const transcript = payload.user_transcript.trim();
  const lower = transcript.toLowerCase();
  const unitSystem = localContext?.unitSystem ?? "indian";
  const scaleFactor = localContext?.scaleFactor ?? 1;

  // 1. Step navigation commands
  if (/\b(next|done|finished|move on|skip|forward)\b/.test(lower)) {
    return {
      spoken_reply: `Moving ahead to the next step for ${payload.recipe_title}.`,
      action_command: "NEXT_STEP",
      timer_seconds: null,
      timer_label: null,
    };
  }
  if (/\b(prev|previous|back|last step|go back)\b/.test(lower)) {
    return {
      spoken_reply: `Going back one step in ${payload.recipe_title}.`,
      action_command: "PREV_STEP",
      timer_seconds: null,
      timer_label: null,
    };
  }
  if (/\b(repeat|again|read step|what step|current step)\b/.test(lower)) {
    const cueSuffix = localContext?.sensoryCue
      ? ` Look for: ${localContext.sensoryCue}.`
      : "";
    return {
      spoken_reply: `Step ${payload.current_step_number}${localContext?.stepTitle ? ` (${localContext.stepTitle})` : ""}: ${payload.current_instruction}${cueSuffix}`,
      action_command: "REPEAT_STEP",
      timer_seconds: null,
      timer_label: null,
    };
  }

  // 2. Pause / Stop Timers
  if (/\b(pause|stop timer|halt timers?)\b/.test(lower)) {
    return {
      spoken_reply:
        payload.active_timers.length > 0
          ? `Paused ${payload.active_timers.length} active timer${payload.active_timers.length === 1 ? "" : "s"}.`
          : "No active timers are currently running.",
      action_command: "PAUSE_TIMERS",
      timer_seconds: null,
      timer_label: null,
    };
  }

  // 3. Start / Set Timer with smart natural-language duration extraction
  if (/\b(timer|alarm|countdown|remind)\b/.test(lower)) {
    const durMatch = lower.match(/(\d+(?:\.\d+)?)\s*(min(?:ute)?s?|sec(?:ond)?s?|hrs?|hours?)/i);
    let seconds = localContext?.stepDurationSeconds ?? 300;
    if (durMatch?.[1]) {
      const n = Number(durMatch[1]);
      const unitStr = durMatch[2]?.toLowerCase() ?? "min";
      if (unitStr.startsWith("sec")) {
        seconds = Math.max(10, Math.round(n));
      } else if (unitStr.startsWith("hr") || unitStr.startsWith("hour")) {
        seconds = Math.max(60, Math.round(n * 3600));
      } else {
        seconds = Math.max(30, Math.round(n * 60));
      }
    }
    const mins = Math.round(seconds / 60);
    const label = durMatch
      ? `${mins >= 1 ? `${mins}m` : `${seconds}s`} Sous-Chef Timer`
      : `Step ${payload.current_step_number} Timer`;
    return {
      spoken_reply: `Started "${label}" for ${mins >= 1 ? `${mins} minute${mins === 1 ? "" : "s"}` : `${seconds} seconds`}.`,
      action_command: "START_TIMER",
      timer_seconds: seconds,
      timer_label: label,
    };
  }

  // 4. Ingredient Substitution Question
  if (/\b(substitute|substitution|replace|swap|instead|alternative|out of)\b/.test(lower)) {
    const matched = findMatchingIngredient(lower, payload.ingredients);
    if (matched) {
      return {
        spoken_reply: getSmartSubstitutionAdvice(matched.name),
        action_command: "NONE",
        timer_seconds: null,
        timer_label: null,
      };
    }
    const firstNonSpice = payload.ingredients[0]?.name ?? "that ingredient";
    return {
      spoken_reply: getSmartSubstitutionAdvice(firstNonSpice),
      action_command: "NONE",
      timer_seconds: null,
      timer_label: null,
    };
  }

  // 5. Ingredient Quantity / Measurement Question
  if (/\b(how much|how many|quantity|amount|measure|katori|grams?)\b/.test(lower) || findMatchingIngredient(lower, payload.ingredients)) {
    const matched = findMatchingIngredient(lower, payload.ingredients);
    if (matched) {
      const formatted = formatIngredientForDisplay(matched, unitSystem, scaleFactor);
      const prepNote = matched.preparation_note ? ` (${matched.preparation_note})` : "";
      return {
        spoken_reply: `Use ${formatted.quantity} ${formatted.unit} of ${matched.name}${prepNote} for ${payload.recipe_title}.`,
        action_command: "NONE",
        timer_seconds: null,
        timer_label: null,
      };
    }
  }

  // 6. Sensory Cue / Timing / Equipment Status Question
  if (/\b(how long|minutes|ready|done|clue|look for|flame|heat|pan|pot)\b/.test(lower)) {
    const mins = localContext?.stepDurationSeconds
      ? `${Math.max(1, Math.round(localContext.stepDurationSeconds / 60))} minutes`
      : "a few minutes";
    const equip = localContext?.equipment?.length
      ? ` using ${localContext.equipment.join(", ")}`
      : "";
    const cue = localContext?.sensoryCue
      ? ` You'll know it's ready by: ${localContext.sensoryCue}.`
      : "";
    return {
      spoken_reply: `For Step ${payload.current_step_number}, cook for about ${mins}${equip}.${cue}`,
      action_command: "NONE",
      timer_seconds: null,
      timer_label: null,
    };
  }

  // 7. Timer check
  if (/\btimers?\b/.test(lower) && payload.active_timers.length > 0) {
    return {
      spoken_reply: `Active timers: ${payload.active_timers.join("; ")}.`,
      action_command: "NONE",
      timer_seconds: null,
      timer_label: null,
    };
  }

  // 8. Clear contextual fallback reading current step + sensory guidance
  const cuePart = localContext?.sensoryCue
    ? ` Watch for: ${localContext.sensoryCue}.`
    : "";
  return {
    spoken_reply: `Step ${payload.current_step_number}: ${payload.current_instruction}${cuePart}`,
    action_command: "NONE",
    timer_seconds: null,
    timer_label: null,
  };
}

export async function generateSmartMealPlan(
  payload: MealPlanGenerateRequest
): Promise<MealPlanResponse> {
  ensureExternalApi();
  const res = await fetch(`${API_BASE}/meal-plans/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    throw new Error(`Meal plan generation failed (${res.status})`);
  }
  return (await res.json()) as MealPlanResponse;
}

export async function fetchPantryItems(): Promise<PantryItem[]> {
  ensureExternalApi();
  const res = await fetch(`${API_BASE}/pantry`, { cache: "no-store" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return (await res.json()) as PantryItem[];
}

export async function addPantryItemApi(payload: {
  name: string;
  quantity: number;
  unit: string;
  storage_location: StorageLocation;
  aisle_category: AisleCategory;
  days_until_expiry: number;
}): Promise<PantryItem> {
  ensureExternalApi();
  const res = await fetch(`${API_BASE}/pantry`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return (await res.json()) as PantryItem;
}

export async function scanBarcodeIntoPantry(
  barcodeEan: string
): Promise<PantryItem> {
  ensureExternalApi();
  const res = await fetch(`${API_BASE}/pantry/barcode-lookup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ barcode_ean: barcodeEan }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return (await res.json()) as PantryItem;
}

export async function markRecipeCookedApi(
  recipeId: string
): Promise<MarkCookedResponse> {
  ensureExternalApi();
  const res = await fetch(`${API_BASE}/pantry/mark-cooked/${recipeId}`, {
    method: "POST",
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return (await res.json()) as MarkCookedResponse;
}

export async function fetchPantryRescueMatches(): Promise<PantryRescueMatch[]> {
  ensureExternalApi();
  const res = await fetch(`${API_BASE}/pantry/rescue`, {
    method: "POST",
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return (await res.json()) as PantryRescueMatch[];
}

export async function fetchCommunities(): Promise<Community[]> {
  ensureExternalApi();
  const res = await fetch(`${API_BASE}/social/communities`, {
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return (await res.json()) as Community[];
}

export async function fetchCookbooks(): Promise<Cookbook[]> {
  ensureExternalApi();
  const res = await fetch(`${API_BASE}/social/cookbooks`, {
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return (await res.json()) as Cookbook[];
}

export async function postMadeItReview(
  recipeId: string,
  payload: {
    author_name: string;
    rating: number;
    review_note: string;
    photo_caption?: string;
    tweak_note?: string;
  }
): Promise<MadeItReview> {
  ensureExternalApi();
  const res = await fetch(`${API_BASE}/recipes/${recipeId}/reviews`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return (await res.json()) as MadeItReview;
}
