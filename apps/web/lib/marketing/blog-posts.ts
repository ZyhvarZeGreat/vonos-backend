// Relative import: apps/api/prisma/seed/cms-posts.ts compiles this file under
// the API tsconfig, which has no "@/…" path alias.
import { cdn } from "../cdn";

export type BlogSection = {
  id: string;
  title: string;
  paragraphs: string[];
};

export type BlogPost = {
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  publishedAt: string;
  image: string;
  author: string;
  readMinutes: number;
  intro: string[];
  sections: BlogSection[];
};

export const BLOG_POSTS: BlogPost[] = [
  {
    slug: "brake-warning-signs",
    title: "5 signs your brakes need attention before they fail",
    excerpt:
      "Squealing, spongy pedal, or pulling to one side? Here is what each symptom usually means — and when to book a check.",
    category: "Safety",
    publishedAt: "2026-08-14",
    image: cdn("/images/vonos-photos/IMG_0438.jpg"),
    author: "Vonos Technical Team",
    readMinutes: 9,
    intro: [
      "Your brakes are the one system on the car you never want to guess about. The good news is that they almost always warn you before something serious happens — squeals, vibrations, changes in pedal feel, or the car pulling under braking are all messages worth listening to.",
      "This guide walks through the five symptoms we see most often at the Vonos workshop in Kubwa: what they mean, how urgent they are, and what a proper inspection should cover. None of this replaces a hands-on check by a technician, but it should help you decide whether you can wait until Monday or need to book today.",
    ],
    sections: [
      {
        id: "why-brakes-fail-gradually",
        title: "Why brakes rarely fail without warning",
        paragraphs: [
          "Modern disc brakes wear predictably. Pads are sacrificial — they are designed to thin out over thousands of stops until a metal tab touches the disc and makes noise. That squeal is intentional engineering, not bad luck.",
          "What catches people out is ignoring early signals because the car still stops. By the time stopping distances have noticeably increased, you may already be scoring the discs, overheating calipers, or relying on one axle more than the other. Fixing that costs more than a straightforward pad change.",
          "Abuja driving — stop-start traffic around Area 1, hard braking on the Kubwa expressway, dusty roads that embed grit in pad material — accelerates wear compared to gentle motorway miles. Checking brakes every service is cheap insurance.",
        ],
      },
      {
        id: "sign-1-squealing",
        title: "Sign 1 — High-pitched squealing when you brake",
        paragraphs: [
          "A sharp squeal on light pedal pressure usually means the wear indicator on the pad is contacting the disc. The pad friction material is nearly gone. You still have braking, but not much margin left.",
          "Occasional squeal after rain or a car wash can be surface rust on the disc — that clears after a few stops. Persistent squeal every time you brake is different: plan a pad inspection within the week.",
          "If the noise has become a grinding metal-on-metal sound, assume the pad backing plate is touching the disc. Stop driving except to reach a workshop. Continuing will destroy the disc and may damage the caliper piston seals.",
        ],
      },
      {
        id: "sign-2-soft-pedal",
        title: "Sign 2 — Soft or sinking brake pedal",
        paragraphs: [
          "The pedal should feel firm and consistent. If it sinks toward the floor or needs pumping to build pressure, treat it as urgent.",
          "Common causes include low brake fluid (often from a leak at a hose, caliper, or rear wheel cylinder on older cars), air trapped in the hydraulic lines after recent work, or a failing master cylinder. All of them reduce your ability to generate stopping force.",
          "Check the fluid reservoir under the bonnet — never open it if the car has just been driven hard, but a level below the minimum mark is a red flag. If the pedal goes to the floor, do not rely on the handbrake for normal stopping; have the car recovered.",
        ],
      },
      {
        id: "sign-3-vibration",
        title: "Sign 3 — Vibration through the steering wheel",
        paragraphs: [
          "Pulsing or shaking felt in the wheel under braking typically points to disc problems: warping from heat, uneven pad deposit, or lateral run-out. It is common after repeated hard stops, towing downhill, or fitting cheap pads that do not bed in evenly.",
          "You may also feel vibration through the seat if the rear discs are affected. Left unchecked, it wears suspension bushings and tyres unevenly because the wheel is constantly being shaken under load.",
          "Sometimes discs can be skimmed if they are thick enough and the run-out is within tolerance. Often on older cars it is more economical to replace discs and pads together — we measure before quoting either way.",
        ],
      },
      {
        id: "sign-4-pulling",
        title: "Sign 4 — Pulling left or right under braking",
        paragraphs: [
          "If the car drifts toward one side when you brake in a straight line, one wheel is doing more work than the other — or one is barely working at all.",
          "A stuck caliper piston, collapsed flexi hose acting as a one-way valve, or heavily uneven pad wear are the usual suspects. Tyre pressure differences can mimic this on light stops, so rule that out first, but persistent pull needs inspection.",
          "Pulling is easy to ignore on familiar roads where you compensate without thinking. In an emergency stop on wet tarmac, uneven braking can push you toward oncoming traffic or off the road edge. Worth fixing before the rains.",
        ],
      },
      {
        id: "sign-5-warning-light",
        title: "Sign 5 — ABS or brake warning light on the dash",
        paragraphs: [
          "An amber brake warning may indicate low fluid, worn pads (on cars with electronic pad wear sensors), or a fault in the ABS module or wheel speed sensor circuit. A red brake light is more serious — stop when safe and investigate.",
          "ABS faults sometimes appear as the light staying on after startup, or the pedal feeling normal but the ABS activating too early on dry roads. Scan tools read stored codes; interpretation matters because a sensor fault and a wiring break need different fixes.",
          "Never assume the light is \"just a sensor\" without checking fluid level and pad thickness first. We include a brake scan and road test on every brake-related visit so you are not paying twice for diagnosis.",
        ],
      },
      {
        id: "what-inspection-covers",
        title: "What a proper brake inspection should include",
        paragraphs: [
          "At minimum: pad thickness on all corners, disc condition (lip, scoring, heat cracks), flexi hose condition, caliper slide pin movement, fluid level and moisture content, and handbrake travel.",
          "We also check tyre condition because worn tyres mask brake problems — a car that pulls may be tyres, not brakes. Good workshops look at the whole picture.",
          "Every Vonos brake quote is fixed-price before work starts and carries a 12-month warranty on parts and labour. If something on this list sounds familiar, book your car in — catching it early is almost always cheaper than recovering a car with destroyed discs.",
        ],
      },
    ],
  },
  {
    slug: "manufacturer-schedule-servicing",
    title: "Why manufacturer schedule servicing saves money long-term",
    excerpt:
      "Skipping a service to save cash often costs more later. Scheduled maintenance protects warranty, resale value, and major components.",
    category: "Maintenance",
    publishedAt: "2026-07-22",
    image: cdn("/images/vonos-photos/IMG_0435.jpg"),
    author: "Vonos Technical Team",
    readMinutes: 10,
    intro: [
      "Every car ships with a service schedule in the handbook — usually a table of mileage and time intervals. It is easy to treat as a dealer upsell, especially when the car feels fine. But the schedule exists because oil, filters, belts, and fluids have finite lives whether or not you notice symptoms.",
      "Skipping services saves money this month and often costs multiples later when sludge blocks oil galleries, a timing belt snaps, or a small coolant leak becomes a head gasket job. This article explains what scheduled servicing actually protects, what each major interval tends to include, and why a trusted independent workshop can follow the same schedule as the main dealer — often with clearer pricing.",
    ],
    sections: [
      {
        id: "what-the-schedule-is",
        title: "What the manufacturer schedule actually is",
        paragraphs: [
          "The schedule is the minimum maintenance the engineers who designed the engine and gearbox expect. Intervals are set using durability testing, oil analysis, and failure data — not random calendar dates.",
          "Most schedules use whichever comes first: mileage or time. A car that does only 5,000 km a year still needs annual oil changes because oil oxidises sitting in a hot engine bay, and condensation contaminates it on short trips.",
          "Hybrid and turbocharged engines often have shorter oil change intervals than older naturally aspirated units. Always use the schedule for your exact engine code, not a generic brochure.",
        ],
      },
      {
        id: "oil-and-filter",
        title: "Oil and filter — the cheapest major repair you can prevent",
        paragraphs: [
          "Engine oil lubricates, cools, cleans, and seals. As it ages, detergent additives deplete, viscosity breaks down, and sludge forms in sumps and turbo feed lines.",
          "A missed oil change rarely kills an engine immediately. It shortens bearing life, encourages turbo seal failure, and can block the pick-up screen years later when the car has another owner — who inherits the damage.",
          "We use oil grades and specifications listed in the handbook (ACEA, API, or manufacturer-specific approvals). Wrong grade oil is a common corner cut that shows up as increased consumption or noisy valvetrain on cold starts.",
        ],
      },
      {
        id: "beyond-oil",
        title: "What else happens at scheduled services",
        paragraphs: [
          "Minor services typically include oil, filter, fluid top-ups, and a multi-point inspection. Major services add air filter, cabin filter, fuel filter (where fitted), spark plugs on petrol engines, and brake fluid replacement on longer intervals.",
          "Coolant, gearbox oil, and differential fluid have their own schedules — often 40,000–100,000 km or five to ten years. They are easy to forget because they do not get changed every year.",
          "Belt-driven components matter too: auxiliary belts crack with age; timing belts have a hard mileage and time limit. A timing belt failure on an interference engine is catastrophic. The schedule tells you when to replace it — not when it looks worn.",
        ],
      },
      {
        id: "catching-small-problems",
        title: "How services catch small problems early",
        paragraphs: [
          "A trained technician on a ramp sees things you cannot from the driver seat: seeping water pump, perished brake hose, torn CV boot greasing the inside of a wheel, exhaust flexi starting to split.",
          "Fixing a leaking hose clamp during a service is cheap. Replacing an overheated engine because coolant slowly dropped to zero over months is not.",
          "Our inspection sheets follow manufacturer checkpoints where possible, plus common failure items we see on Nigerian roads — suspension bushings, shock leaks, and underbody corrosion after rainy seasons.",
        ],
      },
      {
        id: "resale-and-history",
        title: "Service history and resale value",
        paragraphs: [
          "Buyers of used cars pay for evidence. A stamped handbook or digital service record showing regular maintenance at sensible intervals supports a higher asking price and faster sale.",
          "Gaps in history raise questions: was the mileage rolled back, was the car crashed, was maintenance deferred because money ran out? Even when the car drives well, uncertainty discounts the price.",
          "Vonos provides itemised invoices suitable for transfer with the car. We record mileage, parts used, and next due dates so the next owner knows where they stand.",
        ],
      },
      {
        id: "dealer-vs-independent",
        title: "Main dealer vs independent — same schedule, different bill",
        paragraphs: [
          "Following the manufacturer schedule does not require main dealer labour rates. What matters is correct parts specification, correct fluid grades, and documented work.",
          "Independents often spend more time explaining what is due now versus what can wait — useful when a dealer quotes a major service bundle and you want to understand each line.",
          "We use genuine or OEM-equivalent parts, dealer-level diagnostics, fixed-price quotes, and a 12-month warranty. You get handbook-compliant care without surprise extras on collection.",
        ],
      },
      {
        id: "when-to-book",
        title: "When to book your next service",
        paragraphs: [
          "If you are within 1,000 km or one month of the next interval, book now rather than after a long trip. If the service light is on, the ECU has calculated due date from mileage and time — reset alone is not a service.",
          "Unusual noises, new dashboard warnings, or fluid spots on the driveway should trigger a visit regardless of schedule. The schedule is baseline maintenance, not a limit on when you can ask for help.",
          "Book manufacturer schedule servicing at Vonos the same way you would book any repair — online, by phone, or in person at Vonos Plaza, Military Roundabout, Kubwa. We quote before we wrench.",
        ],
      },
    ],
  },
  {
    slug: "check-engine-light-guide",
    title: "What to do when your check engine light comes on",
    excerpt:
      "Steady amber or flashing red? We explain the difference, what you can check yourself, and when to stop driving immediately.",
    category: "Diagnostics",
    publishedAt: "2026-06-03",
    image: cdn("/images/vonos-photos/IMG_3343.jpg"),
    author: "Vonos Technical Team",
    readMinutes: 11,
    intro: [
      "The check engine light — technically the malfunction indicator lamp (MIL) — is the car's way of saying the engine management system has detected something outside normal parameters. It is not specific: the same light covers a loose fuel cap and a misfire that can melt a catalytic converter.",
      "Knowing the difference between \"monitor this\" and \"stop now\" saves money and prevents roadside breakdowns. This guide covers what the light means, what you can safely check at home, how workshops diagnose faults, and the most common causes we see on petrol and diesel cars in Abuja.",
    ],
    sections: [
      {
        id: "what-the-light-means",
        title: "What the check engine light actually tells you",
        paragraphs: [
          "When the MIL illuminates, the ECU has stored at least one diagnostic trouble code (DTC) and often a freeze-frame snapshot of engine data at the moment of fault — rpm, load, coolant temperature, fuel trim.",
          "The light does not tell you which part failed. It tells you a sensor reading or system test failed. Interpretation requires a scan tool and experience with how codes relate to root causes.",
          "Some faults are \"pending\" and may clear after several drive cycles if the condition does not repeat. Repeated faults set a \"confirmed\" code and keep the light on until cleared after repair.",
        ],
      },
      {
        id: "steady-vs-flashing",
        title: "Steady amber vs flashing — know the difference",
        paragraphs: [
          "A steady amber light usually means drive carefully to a workshop within days, not months. Emissions-related faults, minor sensor drift, or efficiency issues are common. The car may feel normal.",
          "A flashing check engine light typically indicates an active misfire — unburned fuel is entering the exhaust and can overheat the catalytic converter within minutes. Ease off the throttle, avoid hard acceleration, and book urgent diagnostics.",
          "If the car is shaking, lacks power, or smells strongly of raw fuel with a flashing light, stop in a safe place and arrange recovery. Driving further can turn a spark plug job into a converter replacement.",
        ],
      },
      {
        id: "check-yourself-first",
        title: "Four things to check before you call the workshop",
        paragraphs: [
          "Fuel cap: loose or missing caps are a classic cause of evaporative emissions codes. Tighten until it clicks, drive two or three cycles, and see if the light clears. It costs nothing to try.",
          "Recent fuel: a bad batch or water contamination can cause temporary misfires. Note where you filled up if symptoms started immediately after refuelling.",
          "Dashboard companions: if the oil pressure or temperature light is on alongside the MIL, stop. Those are not emissions warnings — they indicate mechanical distress.",
          "Symptoms: note rough idle, stalling, reduced power, hard starting, or increased consumption. Write them down — intermittent faults are easier to trace when we know what you felt.",
        ],
      },
      {
        id: "how-diagnosis-works",
        title: "How professional diagnosis works",
        paragraphs: [
          "Step one is reading codes with a scan tool that supports your car's protocol — OBD-II for most, manufacturer-specific for deeper modules on some European and Asian models.",
          "Step two is interpreting codes in context. A \"bank 1 too lean\" code might be a vacuum leak, a failing MAF sensor, a weak fuel pump, or an exhaust leak before the oxygen sensor. The code points to the symptom, not always the part.",
          "Step three is live data and actuation tests — watching sensor values while the engine runs, commanding injectors or solenoids, smoke-testing the intake for leaks. Good diagnosis is labour, not just plugging in a reader.",
          "At Vonos we explain codes in plain language, show you the data where helpful, and quote a fixed repair price before ordering parts. No pressure to fix on the spot if you need time to decide.",
        ],
      },
      {
        id: "common-causes",
        title: "Common causes we see in the workshop",
        paragraphs: [
          "Ignition system: worn spark plugs, failing coils, or cracked plug wires on older petrol engines cause misfire codes — especially under load in hot traffic.",
          "Air and fuel metering: dirty MAF sensors, split vacuum hoses, and clogged fuel filters skew mixtures and trigger lean or rich codes.",
          "Emissions hardware: oxygen sensors, EGR valves, and EVAP solenoids age out. Nigerian fuel quality and dust accelerate contamination on some designs.",
          "Diesel specifics: DPF regeneration issues, EGT sensor faults, and swirl flap problems appear on modern diesels used mainly for short urban trips where regeneration never completes.",
        ],
      },
      {
        id: "what-not-to-do",
        title: "What not to do when the light is on",
        paragraphs: [
          "Do not use code readers to clear the light without fixing the cause — except to verify a repair after work. Clearing masks problems and can leave you without readiness monitors for an inspection.",
          "Do not replace parts based on internet forums alone. \"I always change the O2 sensor\" wastes money when the real issue is an exhaust leak sucking air.",
          "Do not ignore a steady light for months. Some faults increase fuel consumption silently; others slowly damage converters or glow plugs.",
        ],
      },
      {
        id: "after-the-fix",
        title: "After the fix — clearing codes and readiness",
        paragraphs: [
          "Repairs should end with clearing codes, a road test, and confirming monitors reset. Some cars need a specific drive cycle — motorway speed, idle time — before all monitors show \"ready\" again.",
          "If you need an emissions test for import or registration, tell us upfront so we verify monitor status before you leave.",
          "Keep the invoice with codes found and parts replaced. If the light returns, history speeds up the second diagnosis.",
        ],
      },
    ],
  },
  {
    slug: "rainy-season-car-care-abuja",
    title: "How Abuja's rainy season affects your car — and what to check",
    excerpt:
      "Standing water, humidity, and washed-out roads take a toll. A short seasonal checklist keeps you moving safely.",
    category: "Seasonal",
    publishedAt: "2026-05-18",
    image: cdn("/images/vonos-photos/IMG_0439.jpg"),
    author: "Vonos Technical Team",
    readMinutes: 9,
    intro: [
      "Abuja's rainy season arrives fast. Morning sun can turn into afternoon storms that flood low sections of the Kubwa expressway, soak unpaved side streets in Gwarinpa, and leave standing water across roundabouts before drainage catches up.",
      "Cars that skipped basic seasonal checks become stranded — water in intakes, dead electrics, faded brakes, aquaplaning on bald tyres. This guide is a practical checklist for drivers who need the car every day: what to inspect, what to replace proactively, and what to do if you have already driven through deep water.",
    ],
    sections: [
      {
        id: "why-rain-hits-harder-here",
        title: "Why rain hits Abuja cars harder than you expect",
        paragraphs: [
          "Heat cycles already stress batteries, tyres, and rubber seals. Adding humidity accelerates corrosion on terminals, brake discs, and exposed underbody metal.",
          "Dust from dry weeks mixes with water into abrasive mud that packs into wheel arches and accelerates wear on suspension joints if never flushed.",
          "Sudden heavy rain after long dry spells lifts oil and grime off road surfaces — the first hour of a storm is when tarmac is slickest and aquaplaning risk peaks.",
        ],
      },
      {
        id: "visibility-checklist",
        title: "Visibility — wipers, washers, and lights",
        paragraphs: [
          "Wiper blades should clear the screen in one pass without streaks or chatter. Rubber hardens in Abuja heat; replace blades at least once a year, ideally before the rains.",
          "Fill washer fluid with proper concentrate — water alone grows algae in the bottle and smears. Clean the jet nozzles with a pin if spray is uneven.",
          "Check all lights: headlights, brake lights, indicators. Rain and spray reduce visibility for everyone; working lights are how other drivers see you in grey conditions.",
        ],
      },
      {
        id: "tyres-and-grip",
        title: "Tyres, tread depth, and aquaplaning",
        paragraphs: [
          "Tyres need tread grooves to channel water away from the contact patch. Below roughly 3 mm of tread, wet grip drops sharply — legal minimum is not the same as safe minimum.",
          "Check pressure monthly including the spare if you carry one. Under-inflated tyres flex more, heat up, and handle poorly in standing water.",
          "Look for cuts, bulges, and uneven wear that suggest alignment or suspension issues. A car that tracked fine in the dry may wander in ruts filled with water.",
        ],
      },
      {
        id: "brakes-after-water",
        title: "Brakes and steering after driving through floods",
        paragraphs: [
          "Water on brake discs reduces friction until pads wipe the surface dry. After a deep puddle, brake lightly several times at low speed to restore bite before you need an emergency stop.",
          "If the pedal stays soft after drying attempts, water may have entered the system or pads may be contaminated — book inspection before relying on the car in traffic.",
          "Power steering whine after water exposure can mean fluid contamination or a low level from a seeping rack boot. Noises that persist after the engine bay dries need checking.",
        ],
      },
      {
        id: "electrics-and-battery",
        title: "Battery, alternator, and exposed electrics",
        paragraphs: [
          "Slow cranking on damp mornings often starts with corroded battery terminals. Clean and tighten them, or replace clamps if the metal is green and crumbling.",
          "Humidity exposes weak cells. If the battery is more than three years old and struggles after rain, load-test it before you are stuck at Military Roundabout with a dead starter.",
          "Avoid blasting pressure washers directly at engine bay fuse boxes, MAF sensors, and alternator vents — forced water causes intermittent faults that are frustrating to trace.",
        ],
      },
      {
        id: "deep-water-damage",
        title: "If you have already driven through deep water",
        paragraphs: [
          "Do not restart a diesel if water may have reached the air intake — hydrolock bends connecting rods. If the engine stalled in deep water, recover before attempting a start.",
          "Change engine oil and filter if water breather or dipstick shows milky contamination — a sign coolant or water entered the sump.",
          "Check brake fluid, diff breathers, and cabin filters if water entered the footwells. Mold in carpets follows quickly in hot weather.",
        ],
      },
      {
        id: "seasonal-service-at-vonos",
        title: "Book a seasonal check at Vonos",
        paragraphs: [
          "Our rainy-season inspection covers tyres, brakes, wipers, fluids, lights, battery load test, and underbody visual for corrosion and torn boots.",
          "We flush mud from arch liners where accessible and note suspension wear before pothole season makes it worse.",
          "Fixed-price quotes, genuine parts where it matters, and a 12-month warranty on repairs — book before the next storm rather than after a breakdown.",
        ],
      },
    ],
  },
  {
    slug: "genuine-vs-aftermarket-parts",
    title: "Genuine parts vs aftermarket: what actually matters",
    excerpt:
      "Not every component needs a dealer label. We break down where OEM quality matters — and where sensible alternatives are fine.",
    category: "Parts",
    publishedAt: "2026-04-02",
    image: cdn("/images/vonos-photos/IMG_0440.jpg"),
    author: "Vonos Technical Team",
    readMinutes: 10,
    intro: [
      "Parts quality is not a simple choice between \"dealer good\" and \"aftermarket bad.\" The supply chain has genuine OEM boxes, OE suppliers selling under their own brand, premium aftermarket, and budget lines that should never touch a brake caliper.",
      "Understanding where quality matters — and where a reputable alternative is identical — helps you read quotes intelligently and avoid both overspending and unsafe corners. Here is how we decide at Vonos, and what you should expect explained on every invoice.",
    ],
    sections: [
      {
        id: "three-tiers",
        title: "Three tiers — genuine, OE-equivalent, and budget",
        paragraphs: [
          "Genuine OEM parts come in manufacturer packaging — Toyota, BMW, Nissan boxes. They are made to the same specification the car left the factory with, usually at the highest price.",
          "OE-equivalent parts are made by the same companies that supply the factory — Bosch, Denso, Mahle, Lemförder — sold under their own brand without the car logo. Often the same part, different box, lower price.",
          "Budget aftermarket fills a price point. Some categories are fine; some are not. The problem is knowing which before fitment, not after a failure on the Third Mainland equivalent at speed.",
        ],
      },
      {
        id: "safety-critical",
        title: "Where we insist on OEM or proven OE quality",
        paragraphs: [
          "Brakes: pads, discs, calipers, hoses, and fluid. Fade under repeated stops, cracked hoses, and substandard friction material are not worth any saving.",
          "Steering and suspension load-bearing parts: tie rods, ball joints, hub assemblies. Failure here is immediate loss of control.",
          "Fuel system components: high-pressure lines, injectors, regulators. Leaks and incorrect spray patterns damage engines and create fire risk.",
          "Airbags and seatbelt pretensioners: always OEM, always correct procedure, always documented — no exceptions.",
        ],
      },
      {
        id: "sensible-alternatives",
        title: "Where reputable aftermarket is often the smart choice",
        paragraphs: [
          "Filters — air, oil, cabin, fuel — from established brands meet or exceed spec if the catalogue listing matches your engine code.",
          "Wiper blades, bulbs, and many service consumables perform identically across premium tiers.",
          "Clutch kits and timing belt kits from specialist brands (often the same suppliers as OEM) are standard in independent workshops worldwide — provided the kit includes tensioners and rollers where required.",
        ],
      },
      {
        id: "electronics-pitfalls",
        title: "Electronics and sensors — the expensive guessing game",
        paragraphs: [
          "Cheap oxygen sensors, MAF sensors, and ABS wheel speed sensors have wide quality spread. Failures can throw false codes, run rich, or illuminate warnings intermittently.",
          "We source sensors from OE suppliers or genuine where the vehicle is sensitive to signal quality. Saving ₦15,000 on a sensor and spending ₦40,000 on diagnostic time is a false economy.",
          "Aftermarket ECU and immobiliser components on some models cause pairing headaches — another area where we default to manufacturer-approved parts.",
        ],
      },
      {
        id: "how-we-quote",
        title: "How Vonos presents parts choices on your quote",
        paragraphs: [
          "Every line item names the part category and quality tier — genuine, OE-equivalent, or alternative where offered. We explain if an alternative exists and why we recommend one path.",
          "If you request genuine only, we honour that. If budget is tight, we say what can wait and what cannot — never silently fit the cheapest line.",
          "The price we quote is the price you pay. No surprise parts on collection, no upsell without approval.",
        ],
      },
      {
        id: "warranty-and-fitment",
        title: "Warranty, fitment, and counterfeit risk",
        paragraphs: [
          "Our 12-month warranty covers parts we supply and fit. Customer-supplied parts limit what we can stand behind — another reason to let us source with traceability.",
          "Counterfeit packaging exists in every market. We buy from established distributors, not anonymous online listings with impossible prices.",
          "Correct fitment matters as much as brand — wrong-spec brake pads for a similar model number can rub, squeal, or overheat. We verify by VIN or registration where multiple variants exist.",
        ],
      },
      {
        id: "questions-to-ask",
        title: "Questions worth asking any workshop",
        paragraphs: [
          "Which brand are you fitting, and is it OE-supplier or budget tier?",
          "What happens if the part fails within a year — parts and labour covered?",
          "Can I see the old part and the box for the new one?",
          "At Vonos the answers should be clear before you approve work. Parts quality is not a mystery — it should be a conversation.",
        ],
      },
    ],
  },
  {
    slug: "car-thermostat-explained",
    title: "Car thermostat explained: how it works, how it fails, and how we test it",
    excerpt:
      "A small valve with a big job — how the thermostat regulates coolant flow, what the symptoms of failure look like, and why the correct temperature rating matters.",
    category: "Technical",
    publishedAt: "2026-11-24",
    image: cdn("/images/vonos-photos/IMG_0436.jpg"),
    author: "Vonos Technical Team",
    readMinutes: 13,
    intro: [
      "Becoming a competent automotive technician starts with knowing how each part of a car functions. The thermostat is a small but crucial part that affects engine performance, longevity, and efficiency. Inside the engine cooling system sits a temperature-sensitive valve whose main duty is to control coolant flow between the engine and the radiator so the engine runs within its recommended temperature range.",
      "This guide covers what a thermostat is, how it is built, the main designs on the road today, how it behaves through a warm-up cycle, the symptoms and failure modes technicians diagnose most often, and the maintenance habits that keep a cooling system healthy.",
    ],
    sections: [
      {
        id: "what-the-thermostat-does",
        title: "What the thermostat does",
        paragraphs: [
          "The thermostat stays closed when a cold engine is started, which limits the amount of coolant that can reach the radiator. As a result the engine warms up quickly to its normal operating temperature. As coolant temperature rises to the thermostat's designed opening temperature, the valve gradually opens and lets hot coolant flow to the radiator, where heat is transferred to the surrounding air. During operation this continuous cycle helps keep engine temperature stable.",
          "Despite its diminutive size, the thermostat plays a crucial role. A well-functioning thermostat encourages economical fuel use, lowers dangerous exhaust emissions, supports adequate engine lubrication, and guards against overheating. It also helps the heating system produce warm air for the passenger compartment.",
          "A malfunctioning thermostat causes major problems. A thermostat stuck closed stops coolant flowing through the radiator and can overheat the engine. A thermostat stuck open lets the engine take too long to reach its normal operating temperature, which can mean higher fuel consumption, poor heater performance, and inefficient running.",
          "Learning about the thermostat is more than understanding one small part of the cooling system — it is learning how several automotive parts cooperate to protect the engine and guarantee dependable vehicle operation. Technicians must be able to recognise thermostat-related complaints, examine the thermostat's physical condition, test its opening and closing function, and replace it in line with the vehicle manufacturer's procedures.",
        ],
      },
      {
        id: "definition",
        title: "Definition: a temperature-controlled gate",
        paragraphs: [
          "An automotive thermostat is a temperature-sensing device that gauges engine coolant temperature. In an internal combustion engine it is designed to open and close as needed to maintain an effective operating temperature.",
          "More precisely, it is a temperature-sensitive valve in the engine cooling system that automatically controls coolant flow between the engine and the radiator. When the engine is cold the thermostat stays closed, preventing coolant from passing through the radiator, which allows a rapid warm-up after starting. When coolant temperature reaches the pre-set opening temperature the thermostat gradually opens, allowing coolant to pass through the radiator and shed excess heat.",
          "By continuously opening and closing in response to coolant temperature, the thermostat keeps the engine within its intended range under a variety of driving conditions. If the coolant is not hot enough, the thermostat stays closed; once it reaches its rating, the valve admits hot coolant to the radiator. It behaves like a gate that permits or blocks coolant flow from the engine to the radiator, and it is mounted between the engine and the radiator.",
        ],
      },
      {
        id: "construction",
        title: "Construction of an automotive thermostat",
        paragraphs: [
          "Designs differ between manufacturers, but a typical automotive thermostat contains the following components.",
          "Thermostat valve — the movable component that regulates coolant flow. Flow to the radiator is restricted when the thermostat is closed and admitted when it opens.",
          "Wax pellet — the temperature-sensitive element. It contains a specially formulated wax that expands when heated.",
          "Piston or operating pin — transfers the movement created by the expanding wax to the valve, which opens as the pin moves.",
          "Spring — holds the valve in its normal closed position when the engine is cold and helps return the valve toward closed as temperature drops.",
          "Thermostat housing — supports the thermostat and allows coolant to flow through it. Depending on the vehicle, the thermostat may sit in a separate housing or be integrated into a coolant outlet assembly.",
          "Gasket or O-ring — seals the housing against coolant leaks. The correct seal must be used on installation.",
          "Bleed features — some thermostats include a jiggle pin, bypass, or small bleed hole that helps purge trapped air during warm-up and maintain controlled coolant circulation.",
        ],
      },
      {
        id: "thermostat-types-bypass",
        title: "Bypass vs non-bypass thermostats",
        paragraphs: [
          "Thermostats can be divided into two main categories based on whether they incorporate a bypass valve.",
          "A thermostat without a bypass valve is more common in older vehicles. It sits at the radiator inlet, and the cooling circuit keeps supplying coolant even if the thermostat fails. When the engine is cold, water is held in the water jacket and radiator. This design is inexpensive, but it has drawbacks: if it malfunctions there is no safety line, and no additional water lines to cool a hot engine.",
          "A bypass-valve thermostat is used in modern vehicles and has a built-in bypass at the radiator outlet. Instead of cycling through the radiator, this type routes coolant from the water jacket back to the thermostat and into the water pump before returning to the jacket. In the event of a fault it can still cool the engine through its bypass path, but the more complex design costs more.",
        ],
      },
      {
        id: "thermostat-types-control",
        title: "Wax-pellet, electronic, and map-controlled thermostats",
        paragraphs: [
          "The traditional wax-pellet thermostat is the most prevalent type in diesel and petrol engines. Coolant flow is controlled solely by the expansion and contraction of wax inside a sealed capsule. Its straightforward design offers outstanding reliability, a long service life, and inexpensive production.",
          "An electronic thermostat, found on many current vehicles, still uses a wax element but adds an electrical heating element managed by the engine control module. The ECM can open the thermostat earlier or later by heating the wax independently of coolant temperature, optimising economy, emissions, and performance under different driving conditions. Modern turbocharged and high-efficiency engines frequently use them.",
          "A map-controlled thermostat is a more advanced variant of the electronic type. It continuously adjusts coolant flow in response to engine load, vehicle speed, throttle position, and other operating factors, letting manufacturers improve engine longevity and fuel efficiency while lowering emissions.",
        ],
      },
      {
        id: "how-it-works",
        title: "How the thermostat works through a warm-up cycle",
        paragraphs: [
          "In traditional designs the thermostat operates on its own without needing electricity. It sits between the engine and the radiator as a valve designed to open and close at specific temperatures.",
          "When the engine is cold, the thermostat stays closed and coolant cannot reach the radiator. Coolant circulates only through a smaller internal bypass path inside the block and cylinder head, allowing the engine to warm up quickly.",
          "As combustion proceeds and coolant temperature climbs, the wax inside the sealed capsule starts to melt and expand. The expanding wax pushes a piston attached to the valve, progressively opening it so hot coolant can enter the radiator from the engine.",
          "Once operating temperature is reached, the thermostat opens further and more coolant passes through the radiator. Heat transfers from the coolant to the surrounding air, and the cooled coolant returns to the engine to help regulate temperature. The thermostat then keeps opening and closing in response to variations in coolant temperature.",
          "On cold starts the cool coolant keeps the wax contracted, allowing the spring to hold the valve closed so radiator circulation is restricted. Coolant may still flow through internal engine channels and bypass circuits depending on how the cooling system is designed.",
        ],
      },
      {
        id: "opening-temperature",
        title: "Opening temperature and correct specification",
        paragraphs: [
          "Every thermostat is designed to operate within a set temperature range. Depending on the vehicle and engine architecture, for example, a thermostat may begin to open between 80°C and 90°C and be fully open at a higher temperature.",
          "The precise specification always comes from the manufacturer's service information. A thermostat should never be chosen only because it fits the housing — the temperature rating and design must be correct for the engine to operate properly.",
          "Fitting the wrong rating is a common and expensive mistake. A thermostat that opens too early causes overcooling, poor heater output, and higher fuel use; one that opens too late raises combustion and coolant temperatures above design limits. Match the part number to the engine code, not just to the shape of the housing.",
        ],
      },
      {
        id: "symptoms",
        title: "Symptoms of a failing thermostat",
        paragraphs: [
          "Engine performance and cooling efficiency are greatly affected by a malfunctioning thermostat. Overheating is one of the most common symptoms: if the thermostat sticks closed, coolant cannot pass through the radiator and engine temperature rises quickly. An engine that never reaches its normal operating temperature is another classic sign, usually caused by a thermostat stuck open that lets coolant flow through the radiator continuously.",
          "Because the heater core cannot receive enough heat from inadequately warmed coolant, drivers may also notice poor cabin heater performance. Other indicators include fluctuating temperature gauge readings, reduced fuel economy, elevated emissions, poor engine performance, and an illuminated check engine light. In some vehicles the engine control module stores diagnostic trouble codes relating to coolant temperature.",
          "Overheating and overcooling — the most common pair. Age or corrosion can stick the thermostat closed, stopping coolant from reaching the radiator and allowing the engine to overheat and suffer serious damage. Overcooling happens when engine temperature drops below the level needed for normal operation: a stuck-open thermostat lets coolant flow freely through the radiator, which shortens engine life.",
          "Strange noises and temperature variation — knocking, boiling, or rumbling sounds from the radiator all point to a cooling system problem. The thermostat also influences the temperature of air entering the cabin through the vents, so air that swings abruptly from hot to cold, or the reverse, is a clear indication of a fault.",
          "Coolant leakage — if the car has been overheating or liquid is seeping underneath it, suspect a coolant leak. The thermostat itself holds no coolant, so the leak is more likely a gasket failing to seal the thermostat housing. Check for drops, drip marks, or dried deposits around the housing; if nothing shows there, inspect the rest of the system before condemning the thermostat.",
        ],
      },
      {
        id: "failure-causes",
        title: "Why thermostats fail",
        paragraphs: [
          "Despite their long service life, thermostats can malfunction for several reasons. After years of repeated heating and cooling cycles, normal wear progressively weakens the wax element and spring, and valve movement may be restricted by corrosion caused by old or contaminated coolant.",
          "Rust, debris, or mineral deposits in the cooling system can prevent the valve opening or closing correctly. Using the wrong coolant or skipping coolant replacement intervals accelerates internal corrosion. Severe overheating events can cause irreversible damage to the wax capsule or mechanical parts, and poor housing tightness or physical damage during installation can cause premature failure.",
        ],
      },
      {
        id: "stuck-closed",
        title: "Failure mode 1 — thermostat stuck closed",
        paragraphs: [
          "When a thermostat remains closed after the engine reaches operating temperature, coolant flow to the radiator is restricted. This can cause engine overheating, rapidly rising coolant temperature, coolant boiling in severe cases, increased cooling-system pressure, and coolant loss.",
          "If operation continues, the consequences escalate: possible cylinder-head damage, head-gasket failure, degraded engine oil, and severe engine damage. A stuck-closed thermostat is a stop-driving condition, not something to monitor over the coming weeks.",
        ],
      },
      {
        id: "stuck-open",
        title: "Failure mode 2 — thermostat stuck open",
        paragraphs: [
          "When a thermostat is stuck open, coolant keeps flowing through the radiator even when the engine is cold. This may cause slow warm-up, low operating temperature, poor fuel economy, reduced heater performance, increased emissions, poor cold-running performance, and engine management fault codes on some vehicles.",
          "A stuck-open thermostat is less dramatic than overheating but still costly. The engine runs below its designed temperature, wear rates and fuel consumption rise, and the driver is left with a weak heater — a complaint that is often misdiagnosed as a heater matrix problem.",
        ],
      },
      {
        id: "fault-list",
        title: "Common thermostat faults at a glance",
        paragraphs: [
          "In workshop practice, the faults we encounter most often are: thermostat stuck closed; thermostat stuck open; opening at the wrong temperature; valve sticking; wax element failure; a weak or damaged spring; corrosion of thermostat components; physical damage to the valve; blockage caused by contamination; incorrect thermostat installation; a damaged gasket or O-ring; coolant leakage around the thermostat housing; air trapped around the thermostat; and installation of an incorrect thermostat.",
          "A thermostat can also become partially stuck or operate slowly, which produces intermittent temperature complaints that are harder to pin down than a simple stuck valve. Those cases need live data during a road test rather than a single gauge reading.",
        ],
      },
      {
        id: "maintenance",
        title: "Maintenance and testing considerations",
        paragraphs: [
          "In most cars the thermostat is not a regular maintenance item, but whenever the cooling system is serviced or an unusual engine temperature is reported, its condition should be considered.",
          "Proper cooling system maintenance means using the correct coolant, keeping the coolant level correct, inspecting hoses regularly, checking for leaks, maintaining the radiator, checking the water pump, inspecting the cooling fan system, monitoring engine temperature, and replacing coolant according to manufacturer recommendations.",
          "When testing confirms a thermostat is faulty, replace it. Bench testing the opening temperature in a heated water bath and comparing it with the specified rating is quick and decisive; on the vehicle, temperature data during warm-up shows whether the valve opens at the right point and how far it opens.",
        ],
      },
      {
        id: "conclusion",
        title: "Conclusion",
        paragraphs: [
          "The thermostat is a crucial part of the engine cooling system because it controls coolant flow and keeps the engine at its proper operating temperature. A well-functioning thermostat prevents overheating, avoids excessive fuel consumption, and supports engine performance.",
          "To guarantee engine reliability, longevity, and peak performance, Vonos Automotive Engineering stresses the importance of understanding, examining, testing, and maintaining the thermostat — and of always using the correct specification when replacing a faulty unit.",
        ],
      },
    ],
  },
];

export function getBlogPost(slug: string): BlogPost | undefined {
  return BLOG_POSTS.find((post) => post.slug === slug);
}

export function getLatestBlogPosts(limit = 3): BlogPost[] {
  return [...BLOG_POSTS]
    .sort(
      (a, b) =>
        new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
    )
    .slice(0, limit);
}

export function formatBlogDate(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}
