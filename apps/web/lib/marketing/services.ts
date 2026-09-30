export type ServiceFaq = { question: string; answer: string };

export type ServiceDetail = {
  slug: string;
  /** Matches the /services hub card title so hub ↔ detail stay coherent. */
  title: string;
  excerpt: string;
  description: string[];
  includes: string[];
  signs: string[];
  faqs: ServiceFaq[];
  keywords: string[];
};

export const SERVICES: ServiceDetail[] = [
  {
    slug: "servicing-mot",
    title: "Servicing & MOT",
    excerpt:
      "Manufacturer schedule servicing and Class 4 MOT testing for every make — logged and stamped, same-day for most cars in Kubwa, Abuja.",
    description: [
      "Servicing & MOT covers manufacturer schedule servicing — interim, full, and major — plus Class 4 MOT testing for every make, all under one roof at our Kubwa workshop.",
      "Every service follows the handbook schedule for your exact engine: correct oil grade, genuine or OE-quality parts, and a digital service record emailed to you. Work starts only after you approve a fixed-price quote, and every repair carries a 12-month warranty on parts and labour.",
    ],
    includes: [
      "Interim, full & major service options to handbook spec",
      "Class 4 MOT testing with free retest within 10 days",
      "Digital service record, emailed to you",
      "Multi-point inspection with photos of anything we flag",
    ],
    signs: [
      "Service light on, or due within 1,000 km / one month",
      "Overdue handbook interval after a long trip",
      "Buying or selling — a stamped history protects resale value",
    ],
    faqs: [
      {
        question: "Will servicing at Vonos affect my warranty?",
        answer:
          "No. We follow the manufacturer schedule with parts and oil grades that meet handbook specification, and we document everything — which is what warranty terms require.",
      },
      {
        question: "How long does a service take?",
        answer:
          "Most interim and full services are same-day. Major services with plugs, filters, and fluids can run into a second day if parts need to be ordered — we confirm timing when you book.",
      },
      {
        question: "Do I get a price before work starts?",
        answer:
          "Yes. You approve a fixed-price quote before any work begins, and we call first if the inspection finds anything extra.",
      },
    ],
    keywords: ["car servicing Abuja", "MOT test Kubwa", "manufacturer service schedule"],
  },
  {
    slug: "brakes-suspension",
    title: "Brakes & Suspension",
    excerpt:
      "Pads, discs, calipers, shocks, and bushings — fixed-price brake repair in Abuja with a 12-month warranty.",
    description: [
      "Brakes & Suspension covers the full stopping and ride system: pads, discs, calipers, brake fluid, shocks, springs, arms, and bushings — inspected together, because worn suspension masks brake faults and vice versa.",
      "Abuja driving is hard on both systems: stop-start traffic, hard braking on the expressway, and dust that embeds in pad material. We measure pad thickness and disc run-out on all four corners before quoting, so you pay for what is actually worn.",
    ],
    includes: [
      "Pad and disc replacement, caliper overhaul",
      "Brake fluid test and replacement",
      "Shocks, springs, control arms, and bushings",
      "ABS scan and road test on every brake visit",
    ],
    signs: [
      "Squealing or grinding when braking",
      "Soft, sinking, or vibrating pedal",
      "Car pulling to one side under braking",
      "Knocking over bumps or uneven tyre wear",
    ],
    faqs: [
      {
        question: "How do I know if I need pads or discs as well?",
        answer:
          "We measure both before quoting. Pads alone suffice when discs are thick, flat, and crack-free; scored or heat-warped discs get replaced with the pads so the new set beds in evenly.",
      },
      {
        question: "Is a grinding noise urgent?",
        answer:
          "Yes. Grinding usually means the pad backing plate is touching the disc. Drive only as far as a workshop — continuing destroys the disc and can damage calipers.",
      },
      {
        question: "Do you warranty brake work?",
        answer:
          "Yes — 12 months on parts and labour, same as every Vonos repair.",
      },
    ],
    keywords: ["brake repair Abuja", "brake pads Kubwa", "suspension repair Abuja"],
  },
  {
    slug: "diagnostics-electrical",
    title: "Diagnostics & Electrical",
    excerpt:
      "Dealer-level fault finding for warning lights, starting faults, and electrical gremlins — diagnose first, quote fixed, then repair.",
    description: [
      "Diagnostics & Electrical is fault-finding, not parts-swapping: dealer-level scan tools, live data, and wiring tests to pin down check-engine lights, no-starts, battery drains, and intermittent electrical faults.",
      "A code is a clue, not a diagnosis — a sensor fault and a broken wire need different fixes at very different prices. We interpret codes against live readings and confirm the cause before quoting the repair.",
    ],
    includes: [
      "Full-system scan with freeze-frame analysis",
      "Battery, alternator, and parasitic-drain testing",
      "Wiring, sensor, and module fault tracing",
      "Pre-purchase inspection scans with written report",
    ],
    signs: [
      "Check engine, ABS, or airbag light staying on",
      "Car cranks slowly or clicks instead of starting",
      "Battery going flat overnight",
      "Intermittent faults that clear and return",
    ],
    faqs: [
      {
        question: "My check engine light is on but the car drives fine. Can I wait?",
        answer:
          "A steady amber light means book soon; a flashing light means stop driving — it usually signals a misfire that can destroy the catalytic converter. If in doubt, call us before driving on.",
      },
      {
        question: "Do you charge for diagnosis separately?",
        answer:
          "Diagnosis is quoted upfront as its own job. If you approve the repair with us, you pay once — never twice for finding it and fixing it.",
      },
      {
        question: "Can you diagnose cars with modified wiring?",
        answer:
          "Yes, though previously modified looms take longer to trace. We will tell you honestly if a fault traces back to an old installation rather than a failed part.",
      },
    ],
    keywords: ["car diagnostics Abuja", "check engine light", "auto electrician Kubwa"],
  },
  {
    slug: "engine-transmission",
    title: "Engine & Transmission",
    excerpt:
      "Overheating, oil leaks, timing belts, clutch, and gearbox faults — major mechanical work with written quotes and genuine parts.",
    description: [
      "Engine & Transmission is major mechanical work: overheating diagnosis, oil and coolant leaks, timing belts and chains, clutch replacement, and manual and automatic gearbox faults.",
      "These are the repairs where a wrong guess is expensive, so we confirm with compression tests, leak-down tests, and fluid analysis where it counts — then give you a written, fixed-price quote with parts options (genuine vs OE-quality) before anything is stripped.",
    ],
    includes: [
      "Overheating and head-gasket diagnosis",
      "Timing belt/chain replacement to schedule",
      "Clutch kits and gearbox repairs",
      "Oil leaks, mounts, cooling system overhaul",
    ],
    signs: [
      "Temperature gauge climbing or coolant loss",
      "Oil spots on the driveway or burning-oil smell",
      "Slipping clutch or harsh gear changes",
      "Rattling on startup (possible timing-chain wear)",
    ],
    faqs: [
      {
        question: "My car is overheating. Can I top up water and keep driving?",
        answer:
          "Only to reach a workshop. Repeated overheating warps cylinder heads and turns a hose or thermostat job into a head-gasket rebuild. Stop, cool down, and call us.",
      },
      {
        question: "How do I know my timing belt is due?",
        answer:
          "By mileage and age from the handbook — whichever comes first. Belts rarely look worn before they snap, and on interference engines a snap is catastrophic. If history is unknown, assume it is due.",
      },
      {
        question: "Do you use genuine parts for engine work?",
        answer:
          "Genuine or OE-quality to handbook spec, your choice at quote stage. Either way the work carries our 12-month warranty.",
      },
    ],
    keywords: ["engine repair Abuja", "gearbox repair", "clutch replacement Kubwa"],
  },
  {
    slug: "ac-cooling",
    title: "Air-Con & Cooling",
    excerpt:
      "AC that actually cools in Abuja heat — regas, leak tracing, compressors, condensers, and full cooling-system work.",
    description: [
      "Air-Con & Cooling covers the full climate and cooling system: AC regas, leak detection with UV dye and nitrogen pressure testing, compressors, condensers, evaporators, plus radiators, fans, and thermostats.",
      "In Abuja heat a weak AC is not cosmetic — cabin temperatures affect driver alertness and safety. And AC and engine cooling share components, so we check both sides: a failing condenser fan overheats the engine as well as the cabin.",
    ],
    includes: [
      "AC performance test, regas, and leak tracing",
      "Compressors, condensers, evaporators, expansion valves",
      "Radiators, fans, thermostats, coolant flush",
      "Cabin filter replacement and odour treatment",
    ],
    signs: [
      "AC blowing warm or weakly, especially in traffic",
      "Hissing, clicking, or belt squeal with AC on",
      "Musty smell from vents",
      "Engine temperature rising with AC on",
    ],
    faqs: [
      {
        question: "Does my AC just need a regas?",
        answer:
          "Sometimes — but refrigerant does not get used up, it leaks out. We pressure-test first: a regas without fixing the leak is money spent twice. If the system holds pressure, a regas with fresh oil and dye is the fix.",
      },
      {
        question: "Why does my AC cool on the highway but not in traffic?",
        answer:
          "Classic condenser-fan or low-refrigerant symptom: at speed, ram air does the fan's job. In traffic the fault shows. Both are quick to test.",
      },
      {
        question: "How often should the AC be serviced?",
        answer:
          "A performance check every 12 months and a cabin filter yearly in dusty conditions. Full system service only when performance drops or a part fails.",
      },
    ],
    keywords: ["car AC repair Abuja", "AC regas Kubwa", "radiator repair Abuja"],
  },
  {
    slug: "tires-alignment",
    title: "Tires & Alignment",
    excerpt:
      "Tyres, balancing, and 3D alignment — stop uneven wear and pulling, and get honest advice on what actually needs replacing.",
    description: [
      "Tires & Alignment covers tyres, puncture repair, wheel balancing, and computerised alignment — the work that decides how your brakes, suspension, and fuel bill perform.",
      "Uneven wear is information: feathered edges, bald centres, or one-sided wear each point at pressure, alignment, or suspension faults. We read the wear pattern with you before recommending replacement, rotation, or alignment.",
    ],
    includes: [
      "New tyres in common sizes, fitted and balanced",
      "Puncture repair to standard (plug-patch, never string alone)",
      "Computerised wheel alignment with before/after printout",
      "Rotation schedules and pressure checks",
    ],
    signs: [
      "Car pulling left or right on a straight road",
      "Steering wheel off-centre or vibrating at speed",
      "Uneven or rapid tyre wear",
      "Tyres older than 5 years, even with tread left",
    ],
    faqs: [
      {
        question: "Can any puncture be repaired?",
        answer:
          "Sidewall damage and large shoulder punctures cannot be repaired safely — the tyre must be replaced. Tread-area punctures within size limits get a proper plug-patch from the inside.",
      },
      {
        question: "Do I need alignment with new tyres?",
        answer:
          "If the old set wore unevenly, yes — otherwise the same fault eats the new set. If wear was even and nothing was disturbed, a check is enough.",
      },
      {
        question: "How do I read tyre age?",
        answer:
          "The DOT code ends in four digits: week and year of manufacture (e.g. 2324 = week 23 of 2024). Past five years, rubber hardens and grips less even with tread remaining.",
      },
    ],
    keywords: ["tyre shop Abuja", "wheel alignment Kubwa", "wheel balancing Abuja"],
  },
];

export function getService(slug: string): ServiceDetail | undefined {
  return SERVICES.find((service) => service.slug === slug);
}

export function servicePath(slug: string): string {
  return `/services/${slug}`;
}
