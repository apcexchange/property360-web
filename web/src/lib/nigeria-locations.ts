/**
 * Nigerian states and their commonly-referenced cities / LGAs.
 *
 * Coverage: 36 states + Federal Capital Territory. Each entry lists the
 * state capital first followed by other widely-used city / LGA names.
 * This is not exhaustive (Nigeria has 774 LGAs) — it's a curated set
 * that covers the cities tenants and landlords typically transact in.
 * Cities are stored as plain strings so they round-trip through the
 * existing free-text `address.city` field on Property.
 */

export interface NigeriaState {
  name: string;
  cities: string[];
}

export const NIGERIA_STATES: NigeriaState[] = [
  {
    name: "Abia",
    cities: ["Umuahia", "Aba", "Arochukwu", "Ohafia", "Bende", "Isuikwuato"],
  },
  {
    name: "Adamawa",
    cities: [
      "Yola",
      "Jimeta",
      "Mubi",
      "Numan",
      "Ganye",
      "Michika",
      "Hong",
      "Gombi",
    ],
  },
  {
    name: "Akwa Ibom",
    cities: [
      "Uyo",
      "Eket",
      "Ikot Ekpene",
      "Oron",
      "Abak",
      "Itu",
      "Ikot Abasi",
      "Etinan",
    ],
  },
  {
    name: "Anambra",
    cities: [
      "Awka",
      "Onitsha",
      "Nnewi",
      "Ekwulobia",
      "Aguata",
      "Ihiala",
      "Otuocha",
    ],
  },
  {
    name: "Bauchi",
    cities: [
      "Bauchi",
      "Azare",
      "Misau",
      "Jama'are",
      "Katagum",
      "Tafawa Balewa",
      "Dass",
    ],
  },
  {
    name: "Bayelsa",
    cities: [
      "Yenagoa",
      "Brass",
      "Nembe",
      "Ogbia",
      "Sagbama",
      "Ekeremor",
      "Southern Ijaw",
    ],
  },
  {
    name: "Benue",
    cities: [
      "Makurdi",
      "Gboko",
      "Otukpo",
      "Katsina-Ala",
      "Vandeikya",
      "Adikpo",
      "Wukari",
    ],
  },
  {
    name: "Borno",
    cities: [
      "Maiduguri",
      "Biu",
      "Bama",
      "Konduga",
      "Dikwa",
      "Monguno",
      "Damboa",
      "Gwoza",
    ],
  },
  {
    name: "Cross River",
    cities: [
      "Calabar",
      "Ikom",
      "Ugep",
      "Obudu",
      "Ogoja",
      "Akamkpa",
      "Obubra",
      "Odukpani",
    ],
  },
  {
    name: "Delta",
    cities: [
      "Asaba",
      "Warri",
      "Sapele",
      "Ughelli",
      "Agbor",
      "Ozoro",
      "Oleh",
      "Effurun",
      "Oghara",
    ],
  },
  {
    name: "Ebonyi",
    cities: [
      "Abakaliki",
      "Afikpo",
      "Onueke",
      "Ezza",
      "Ikwo",
      "Ohaozara",
      "Ishielu",
    ],
  },
  {
    name: "Edo",
    cities: [
      "Benin City",
      "Auchi",
      "Ekpoma",
      "Uromi",
      "Ubiaja",
      "Igarra",
      "Sabongida-Ora",
      "Irrua",
    ],
  },
  {
    name: "Ekiti",
    cities: [
      "Ado-Ekiti",
      "Ikere-Ekiti",
      "Ijero-Ekiti",
      "Ise-Ekiti",
      "Aramoko-Ekiti",
      "Ikole-Ekiti",
      "Omuo-Ekiti",
    ],
  },
  {
    name: "Enugu",
    cities: [
      "Enugu",
      "Nsukka",
      "Agbani",
      "Awgu",
      "Oji River",
      "Udi",
      "Ezeagu",
      "Enugu Ezike",
    ],
  },
  {
    name: "FCT",
    cities: [
      "Abuja",
      "Garki",
      "Wuse",
      "Maitama",
      "Asokoro",
      "Gwarinpa",
      "Kubwa",
      "Lugbe",
      "Kuje",
      "Bwari",
      "Karu",
      "Nyanya",
      "Lokogoma",
      "Gwagwalada",
      "Jabi",
      "Utako",
      "Wuye",
      "Apo",
      "Lifecamp",
      "Kado",
      "Karmo",
      "Mpape",
      "Idu",
    ],
  },
  {
    name: "Gombe",
    cities: ["Gombe", "Billiri", "Kaltungo", "Dukku", "Bajoga", "Deba", "Akko"],
  },
  {
    name: "Imo",
    cities: [
      "Owerri",
      "Orlu",
      "Okigwe",
      "Mbaise",
      "Nkwerre",
      "Oguta",
      "Mbano",
      "Ohaji",
    ],
  },
  {
    name: "Jigawa",
    cities: [
      "Dutse",
      "Hadejia",
      "Birnin Kudu",
      "Gumel",
      "Kazaure",
      "Ringim",
      "Babura",
    ],
  },
  {
    name: "Kaduna",
    cities: [
      "Kaduna",
      "Zaria",
      "Kafanchan",
      "Sabon Gari",
      "Birnin Gwari",
      "Soba",
      "Saminaka",
      "Jema'a",
      "Kachia",
      "Zonkwa",
    ],
  },
  {
    name: "Kano",
    cities: [
      "Kano",
      "Wudil",
      "Gwarzo",
      "Bichi",
      "Rano",
      "Karaye",
      "Dawakin Tofa",
      "Tudun Wada",
      "Dambatta",
      "Bagwai",
    ],
  },
  {
    name: "Katsina",
    cities: [
      "Katsina",
      "Daura",
      "Funtua",
      "Malumfashi",
      "Mani",
      "Dutsin-Ma",
      "Jibia",
      "Kankara",
    ],
  },
  {
    name: "Kebbi",
    cities: [
      "Birnin Kebbi",
      "Argungu",
      "Yauri",
      "Zuru",
      "Jega",
      "Koko",
      "Bagudo",
      "Aliero",
    ],
  },
  {
    name: "Kogi",
    cities: [
      "Lokoja",
      "Okene",
      "Kabba",
      "Idah",
      "Anyigba",
      "Ankpa",
      "Dekina",
      "Egbe",
    ],
  },
  {
    name: "Kwara",
    cities: [
      "Ilorin",
      "Offa",
      "Omu-Aran",
      "Jebba",
      "Lafiagi",
      "Patigi",
      "Kaiama",
      "Share",
    ],
  },
  {
    name: "Lagos",
    cities: [
      "Ikeja",
      "Lagos Island",
      "Lagos Mainland",
      "Lekki",
      "Ajah",
      "Victoria Island",
      "Ikoyi",
      "Surulere",
      "Yaba",
      "Apapa",
      "Festac",
      "Ojo",
      "Alimosho",
      "Agege",
      "Ikorodu",
      "Badagry",
      "Epe",
      "Mushin",
      "Oshodi",
      "Isolo",
      "Ojota",
      "Magodo",
      "Maryland",
      "Gbagada",
      "Ojodu",
      "Egbeda",
      "Iyana Ipaja",
      "Ketu",
      "Sangotedo",
      "Ibeju-Lekki",
      "Ikotun",
      "Iju",
      "Festac Town",
    ],
  },
  {
    name: "Nasarawa",
    cities: [
      "Lafia",
      "Keffi",
      "Akwanga",
      "Nasarawa",
      "Karu",
      "Toto",
      "Doma",
      "Awe",
    ],
  },
  {
    name: "Niger",
    cities: [
      "Minna",
      "Bida",
      "Suleja",
      "Kontagora",
      "New Bussa",
      "Lapai",
      "Mokwa",
      "Agaie",
      "Wushishi",
    ],
  },
  {
    name: "Ogun",
    cities: [
      "Abeokuta",
      "Ijebu Ode",
      "Sagamu",
      "Ota",
      "Ifo",
      "Ilaro",
      "Ayetoro",
      "Owode",
      "Ijebu Igbo",
      "Mowe",
      "Ibafo",
      "Ofada",
    ],
  },
  {
    name: "Ondo",
    cities: [
      "Akure",
      "Ondo",
      "Owo",
      "Ikare-Akoko",
      "Okitipupa",
      "Igbokoda",
      "Ore",
      "Idanre",
      "Ilara-Mokin",
    ],
  },
  {
    name: "Osun",
    cities: [
      "Osogbo",
      "Ile-Ife",
      "Ilesa",
      "Ede",
      "Iwo",
      "Ikirun",
      "Ejigbo",
      "Modakeke",
      "Ila Orangun",
      "Gbongan",
    ],
  },
  {
    name: "Oyo",
    cities: [
      "Ibadan",
      "Oyo",
      "Ogbomosho",
      "Iseyin",
      "Saki",
      "Igboho",
      "Eruwa",
      "Igbo-Ora",
      "Okeho",
      "Lalupon",
    ],
  },
  {
    name: "Plateau",
    cities: [
      "Jos",
      "Bukuru",
      "Pankshin",
      "Shendam",
      "Langtang",
      "Mangu",
      "Bokkos",
      "Barkin Ladi",
    ],
  },
  {
    name: "Rivers",
    cities: [
      "Port Harcourt",
      "Bonny",
      "Eleme",
      "Bori",
      "Omoku",
      "Ahoada",
      "Okrika",
      "Abua",
      "Degema",
      "Oyigbo",
    ],
  },
  {
    name: "Sokoto",
    cities: [
      "Sokoto",
      "Tambuwal",
      "Gwadabawa",
      "Wurno",
      "Goronyo",
      "Illela",
      "Bodinga",
      "Yabo",
    ],
  },
  {
    name: "Taraba",
    cities: [
      "Jalingo",
      "Wukari",
      "Bali",
      "Gembu",
      "Serti",
      "Takum",
      "Mutum Biyu",
      "Ibi",
    ],
  },
  {
    name: "Yobe",
    cities: [
      "Damaturu",
      "Potiskum",
      "Gashua",
      "Nguru",
      "Geidam",
      "Bursari",
      "Buni Yadi",
    ],
  },
  {
    name: "Zamfara",
    cities: [
      "Gusau",
      "Talata Mafara",
      "Kaura Namoda",
      "Anka",
      "Tsafe",
      "Maru",
      "Shinkafi",
      "Bukkuyum",
    ],
  },
];

export const NIGERIA_STATE_NAMES: string[] = NIGERIA_STATES.map((s) => s.name);

/** Returns the cities for the given state, or [] if the state isn't recognised. */
export function citiesForState(stateName: string): string[] {
  const match = NIGERIA_STATES.find(
    (s) => s.name.toLowerCase() === stateName.trim().toLowerCase()
  );
  return match?.cities ?? [];
}

/* ------------------------------------------------------------------ *
 * Location slugs for the SEO marketplace pages (/listings/in/<slug>).
 * ------------------------------------------------------------------ */

/** URL-safe slug for a state or city name. "Victoria Island" -> "victoria-island". */
export function slugifyLocation(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export interface ResolvedLocation {
  /** Filter dimension on the listings API. */
  kind: "state" | "city";
  /** Exact name to filter by (matches Property address.state / address.city). */
  name: string;
  /** Human label for headings / titles. */
  label: string;
  /** Owning state, for city locations. */
  state?: string;
  slug: string;
}

/**
 * Slug -> location lookup. States are registered first so a slug that names
 * both a state and its capital (e.g. "kano") resolves to the broader STATE
 * page. City slugs only fill gaps, and the first state to claim a city wins.
 */
const LOCATION_BY_SLUG: Map<string, ResolvedLocation> = (() => {
  const map = new Map<string, ResolvedLocation>();
  for (const s of NIGERIA_STATES) {
    const slug = slugifyLocation(s.name);
    map.set(slug, { kind: "state", name: s.name, label: s.name, slug });
  }
  for (const s of NIGERIA_STATES) {
    for (const city of s.cities) {
      const slug = slugifyLocation(city);
      if (map.has(slug)) continue;
      map.set(slug, { kind: "city", name: city, label: city, state: s.name, slug });
    }
  }
  return map;
})();

/** Resolve a URL slug to a known Nigerian state or city, or undefined. */
export function resolveLocationSlug(slug: string): ResolvedLocation | undefined {
  return LOCATION_BY_SLUG.get(slug.toLowerCase());
}

/**
 * Curated, high-demand locations to pre-render and surface in "browse by
 * location" links. Mix of states and major Lagos/Abuja/PH submarkets.
 */
export const TOP_LOCATION_SLUGS: string[] = [
  "lagos",
  "lekki",
  "ikeja",
  "victoria-island",
  "ikoyi",
  "ajah",
  "yaba",
  "surulere",
  "fct",
  "abuja",
  "wuse",
  "gwarinpa",
  "maitama",
  "rivers",
  "port-harcourt",
  "oyo",
  "ibadan",
  "edo",
  "benin-city",
  "enugu",
  "ogun",
  "abeokuta",
  "kano",
];

/** TOP_LOCATION_SLUGS resolved to {slug,label}, dropping any that don't map. */
export const TOP_LOCATIONS: { slug: string; label: string }[] = TOP_LOCATION_SLUGS
  .map((slug) => {
    const loc = resolveLocationSlug(slug);
    return loc ? { slug, label: loc.label } : null;
  })
  .filter((x): x is { slug: string; label: string } => x !== null);
