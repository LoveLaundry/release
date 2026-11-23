#!/usr/bin/env node
/**
 * Deterministic paraphrase generator.
 *
 * Expands the seed knowledge base with slot-substituted wording so the ANN
 * sees many ways of asking the same question. Output is a JSON object keyed by
 * intent id; merge it into data/intents.json before training.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const botRoot = fileURLToPath(new URL("..", import.meta.url));

function parseArgs(argv) {
  const args = {
    seed: 20261121,
    en: 10,
    sin: 6,
    out: "data/generated-examples.json",
    excludeTraining: false,
  };
  for (let i = 0; i < argv.length; i += 1) {
    const key = argv[i];
    const value = argv[i + 1];
    if (!key.startsWith("--") || value === undefined) continue;
    if (key === "--exclude-training") {
      args.excludeTraining = true;
      continue;
    }
    switch (key) {
      case "--seed": args.seed = Number(value); break;
      case "--en": args.en = Number(value); break;
      case "--sin": args.sin = Number(value); break;
      case "--out": args.out = value; break;
      default: break;
    }
    i += 1;
  }
  args.out = path.resolve(botRoot, args.out);
  return args;
}

const args = parseArgs(process.argv.slice(2));
const output = args.out;

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rng = mulberry32(args.seed);
const pick = (items) => items[Math.floor(rng() * items.length)];

function expand(group, count) {
  const results = new Set();
  let guard = 0;
  while (results.size < count && guard < count * 30) {
    let text = pick(group.templates);
    Object.entries(group.slots).forEach(([key, values]) => {
      text = text.split(`{${key}}`).join(pick(values));
    });
    if (!text.includes("{")) results.add(text.replace(/\s+/g, " ").trim());
    guard += 1;
  }
  return [...results];
}

const GROUPS = {
  greeting: {
    en: { templates: ["hello {suffix}", "hi {suffix}", "good {time}", "{question} you there?"], slots: { suffix: ["there", "bot", "friend", "assistant"], time: ["morning", "afternoon", "evening", "day"], question: ["are", "are ya", "r u"] } },
    sin: { templates: ["ආයුබෝවන් {suffix}", "හැමෝටම {suffix}", "{time} සුභයි"], slots: { suffix: ["", "ට", "ඔබට"], time: ["උදෑසන", "සන්ධ්‍යාව", "දවස"] } },
  },
  goodbye: {
    en: { templates: ["{bye} then", "{see} you later", "talk {when}", "i am {leaving}"], slots: { bye: ["bye", "goodbye", "see ya", "later"], see: ["see", "catch", "talk to"], when: ["later", "tomorrow", "soon"], leaving: ["leaving", "off", "going"] } },
    sin: { templates: ["{bye}", "{see} ආයෙමු", "මම {leave}"], slots: { bye: ["ගිහින් එන්නම්", "ආයෙමු", "හොඳයි"], see: ["ආයෙ", "හෙට", "ඉවරයි"], leave: ["යනවා", "ගිහින්", "වැඩ ඉවරයි"] } },
  },
  thanks: {
    en: { templates: ["{thanks} so much", "{app} it", "cheers {suffix}", "{thanks} a lot"], slots: { thanks: ["thanks", "thank you", "thankyou"], app: ["i appreciate", "really appreciate", "thanks for"], suffix: ["", "mate", "bot"] } },
    sin: { templates: ["{thanks}", "{thanks} බොහොම", "ඔබේ {help} ස්තූතියි"], slots: { thanks: ["ස්තූතියි", "බොහොම ස්තූතියි", "ඔබට ස්තූතියි"], help: ["උදව්ට", "සහායට", "වැඩට"] } },
  },
  services: {
    en: { templates: ["do you {verb} {item}", "can you {verb} {item}", "what {kind} services do you have", "i need {item} {verb}ing"], slots: { verb: ["wash", "clean", "iron", "dry clean", "press"], item: ["clothes", "shirts", "linen", "towels", "bedsheets", "uniforms"], kind: ["laundry", "cleaning", "wash"] } },
    sin: { templates: ["ඔබ {verb} කරනවද", "{item} සඳහා සේවාවක් තියෙනවද", "{verb} සේවා ගැන කියන්න"], slots: { verb: ["සෝද", "ඉරි යොද", "වියළි පිරිසිදු", "පිරිසිදු"], item: ["ඇඳුම්", "තුවා", "රෙදිපිළි", "කමිස"] } },
  },
  pricing: {
    en: { templates: ["how much for {item}", "what is the {cost} for {service}", "{service} price please", "can you give me a {quote}"], slots: { item: ["a shirt", "a towel", "a bedsheet", "a suit", "wash and fold"], cost: ["price", "cost", "rate", "charge"], service: ["dry cleaning", "ironing", "laundry", "wash"], quote: ["quote", "estimate", "rate card"] } },
    sin: { templates: ["{item} මිල කීයද", "{service} ගාස්තුව කීයද", "මිලක් කියන්නකෝ"], slots: { item: ["කමිසයක්", "තුවාවක්", "ඇඳ ඇතිරිලියක්", "සූට් එකක්"], service: ["වියළි පිරිසිදු", "සේදීම", "ඉරි යොදීම"] } },
  },
  hours: {
    en: { templates: ["when do you {open}", "are you open on {day}", "what are your {hours}", "do you close on {day}"], slots: { open: ["open", "start work", "open the counter"], day: ["sunday", "monday", "saturday", "weekends", "public holidays"], hours: ["opening hours", "business hours", "timings"] } },
    sin: { templates: ["ඔබ {open} කවදාද", "{day} ඔපන් ද", "වේලාවන් කියන්න"], slots: { open: ["විවෘත වෙන්නේ", "කවුන්ටරය විවෘත කරන්නේ"], day: ["ඉරිදා", "සඳුදා", "සෙනසුරාදා", "නිවාඩු දවසේ"] } },
  },
  locations: {
    en: { templates: ["where is your {place}", "do you have a {branch} near {area}", "what is your {address}", "which {area} are you in"], slots: { place: ["laundry", "counter", "main branch", "shop"], branch: ["branch", "counter", "drop off point"], area: ["chilaw", "madampe", "mahawewa", "wennappuwa", "here"], address: ["address", "location"] } },
    sin: { templates: ["ඔබේ {place} කොහෙද", "{area} ළඟ තියෙනවද", "ලිපිනය කියන්න"], slots: { place: ["ලෝන්ඩ්‍රිය", "කවුන්ටරය", "ශාඛාව"], area: ["චිලාව්", "මදම්පේ", "මහවැව", "වෙන්නප්පුව"] } },
  },
  directions: {
    en: { templates: ["how do i {get} there", "can you {send} directions", "show me the {map}", "what is the route to your {place}"], slots: { get: ["get", "reach", "find my way"], send: ["send", "share", "give"], map: ["map", "location", "route"], place: ["counter", "laundry", "shop"] } },
    sin: { templates: ["කොහොමද {go} එන්නේ", "{map} එවන්න", "දිශාවන් කියන්නකෝ"], slots: { go: ["එන්න", "යන්න", "හොයාගන්න"], map: ["සිතියම", "ඛණ්ඩාංක", "මග"] } },
  },
  hotel_linen: {
    en: { templates: ["we need {service} for our {hotel}", "do you {verb} linen from {hotel}", "{item} cleaning for hotels", "can you handle {hotel} laundry"], slots: { service: ["linen washing", "bed linen service", "towels and sheets cleaning"], hotel: ["hotel", "resort", "guesthouse", "villa"], verb: ["collect", "pick up", "wash"], item: ["bed linen", "hotel towels", "table linen"] } },
    sin: { templates: ["{hotel} සඳහා {service} ඕනේ", "හෝටල්වලින් {verb} කරනවද", "{item} සෝදනවද"], slots: { hotel: ["හෝටලය", "නිවාඩු නිකේතනය", "විලා එක"], service: ["රෙදිපිළි සේදීම", "තුවා සේදීම", "ඇඳ ඇතිරිලි සේදීම"], verb: ["එකතු", "අරගෙන"], item: ["හෝටල් තුවා", "මේස රෙදි"] } },
  },
  partner_shop: {
    en: { templates: ["can our {shop} be a {point}", "do you work with {shop}", "we want to become a {partner}", "{shop} collection point"], slots: { shop: ["shop", "store", "business", "kiosk"], point: ["drop off point", "collection point", "partner location"], partner: ["partner shop", "collection partner", "drop off partner"] } },
    sin: { templates: ["අපේ {shop} {point} එකක් වෙන්න පුළුවන්ද", "ඔබ {shop} එක්ක වැඩ කරනවද", "{partner} වෙන්න ඕනේ"], slots: { shop: ["කඩේ", "සාප්පුව", "ව්‍යාපාරය"], point: ["භාරදීමේ", "එකතු කිරීමේ"], partner: ["හවුල්කාර සාප්පුවක්", "එකතු කරන්නෙක්"] } },
  },
  no_home_delivery: {
    en: { templates: ["do you {pick} from my {home}", "is {doorstep} available", "will you come to my {place}", "do you deliver to {home}"], slots: { pick: ["pick up", "collect", "come and get"], home: ["home", "house", "apartment", "flat"], doorstep: ["home pickup", "doorstep collection", "home delivery"], place: ["home", "house", "flat"] } },
    sin: { templates: ["ගෙදරින් {pick} කරනවද", "{doorstep} සේවාවක් තියෙනවද", "මගේ {home} එනවද"], slots: { pick: ["එකතු", "අරගෙන", "භාරගන්න"], doorstep: ["දොරකඩ", "ගෙදරට", "ගෙදරින්"], home: ["ගෙදර", "නිවස", "ෆ්ලැට් එක"] } },
  },
  dropoff_process: {
    en: { templates: ["what happens after i {drop}", "how do i {hand} my clothes", "is there a {token} system", "what are the {steps}"], slots: { drop: ["drop off", "hand in", "give them"], hand: ["hand over", "give", "bring"], token: ["token", "receipt", "ticket"], steps: ["steps", "process", "procedure"] } },
    sin: { templates: ["භාර දුන්නට පස්සේ {what}", "ඇඳුම් {how} දෙන්නේ", "{token} එකක් ලැබෙනවද"], slots: { what: ["මොකද වෙන්නේ", "ඊළඟට මොකක්ද"], how: ["කොහොමද", "ආකාරය"], token: ["ටෝකන්", "රිසිටුපත්", "තැබීමේ පත්‍රිකා"] } },
  },
  turnaround: {
    en: { templates: ["how {long} does it take", "when can i {collect}", "can i get it {when}", "what is the {time} for laundry"], slots: { long: ["long", "quickly", "fast"], collect: ["collect", "pick up", "get it back"], when: ["today", "tomorrow", "this week"], time: ["turnaround", "delivery", "collection"] } },
    sin: { templates: ["කීය {time} ගත වෙනවද", "ඇඳුම් {when} සූදානම්ද", "ඉක්මනින් කරන්න පුළුවන්ද"], slots: { time: ["වෙලාවක්", "දවසක්", "කාලයක්"], when: ["හෙට", "අද", "සතිය ඇතුළත"] } },
  },
  dry_cleaning: {
    en: { templates: ["do you {dry} suits", "{item} needs dry cleaning", "can you clean this {item}", "is dry cleaning {available}"], slots: { dry: ["dry clean", "solvent clean", "professionally clean"], item: ["suit", "dress", "blouse", "coat", "silk scarf"], available: ["available", "offered", "possible"] } },
    sin: { templates: ["{item} වියළි පිරිසිදු කරනවද", "මට {service} ඕනේ", "{item} එක පිරිසිදු කරන්න පුළුවන්ද"], slots: { item: ["සූට් එක", "ඇඳුම", "බ්ලවුස් එක", "කෝට් එක"], service: ["වියළි පිරිසිදු කිරීම", "dry cleaning සේවාව"] } },
  },
  ironing: {
    en: { templates: ["can you {press} my {item}", "{item} ironing only please", "do you {iron} uniforms", "pressing for {item}"], slots: { press: ["press", "iron", "smooth"], item: ["shirts", "trousers", "uniforms", "bedsheets", "linen"], iron: ["iron", "press"] } },
    sin: { templates: ["{item} ඉරි යොදන්න පුළුවන්ද", "{item} විතරක් ඉරි කරන්න ඕනේ", "නිල ඇඳුම් ඉරි කරනවද"], slots: { item: ["කමිස", "කලිසම්", "ඇඳ ඇතිරිලි", "රෙදිපිළි"] } },
  },
  wash_fold: {
    en: { templates: ["just {wash} and fold these", "normal {laundry} for {item}", "do you {fold} clothes", "wash dry fold for {item}"], slots: { wash: ["wash", "clean", "launder"], laundry: ["laundry", "wash", "wash and fold"], fold: ["fold", "pack", "neatly fold"], item: ["t-shirts", "jeans", "towels", "casual wear"] } },
    sin: { templates: ["{item} සෝදලා {fold} කරන්න", "සාමාන්‍ය {service} ඕනේ", "ඇඳුම් නවන්න පුළුවන්ද"], slots: { item: ["ටීෂර්ට්", "ජීන්ස්", "තුවා", "සාමාන්‍ය ඇඳුම්"], fold: ["අසුරුම්", "නවන්න", "පැකට්"], service: ["සේදීම", "සෝදා අසුරුම් කිරීම"] } },
  },
  stain_removal: {
    en: { templates: ["there is a {stain} on my {item}", "can you remove {stain}", "will the {stain} come out", "{stain} treatment"], slots: { stain: ["coffee stain", "oil mark", "ketchup spot", "wine stain", "tea mark", "mud"], item: ["shirt", "towel", "tablecloth", "dress"] } },
    sin: { templates: ["මගේ {item} එකේ {stain} තියෙනවා", "{stain} ඉවත් කරනවද", "{stain} පිට වෙයිද"], slots: { stain: ["කෝපි පැල්ලම", "තෙල් පැල්ලම", "තේ පැල්ලම", "වයින් පැල්ලම", "මඩ පැල්ලම"], item: ["කමිසෙ", "තුවාව", "මේස රෙද්ද"] } },
  },
  large_items: {
    en: { templates: ["do you clean {item}", "can you wash {item}", "{item} laundry service", "heavy {item} cleaning"], slots: { item: ["blankets", "curtains", "duvets", "bed covers", "quilts", "mattress covers"] } },
    sin: { templates: ["{item} සෝදනවද", "{item} පිරිසිදු කරන්න පුළුවන්ද", "විශාල {item} සේදීම"], slots: { item: ["බ්ලැන්කට්", "තිර රෙදි", "ඩිවට්", "ඇඳ ආවරණ", "මැට්‍රෑස් කවර"] } },
  },
  payment: {
    en: { templates: ["how do i {pay}", "can i pay by {method}", "when should i {pay}", "{bill} arrangement for hotels"], slots: { pay: ["pay", "settle", "make payment"], method: ["cash", "card", "bank transfer", "online"], bill: ["monthly billing", "payment", "invoice"] } },
    sin: { templates: ["ගෙවන්නේ {how} ද", "{method} ගෙවන්න පුළුවන්ද", "හෝටල් සඳහා {bill} ක්‍රමයක් තියෙනවද"], slots: { how: ["කොහොමද", "ආකාරය"], method: ["කාඩ් එකකින්", "මුදල්", "බැංකු මාරුවෙන්"], bill: ["මාසික බිල්", "ගෙවීම්"] } },
  },
  contact: {
    en: { templates: ["what is your {number}", "give me your {contact}", "how can i {call} you", "{phone} number please"], slots: { number: ["phone number", "contact number", "telephone number", "whatsapp number"], contact: ["contact details", "number", "phone"], call: ["call", "ring", "contact"], phone: ["contact", "phone", "whatsapp"] } },
    sin: { templates: ["{number} කියන්නකෝ", "ඔබව {how} අමතන්නද", "{contact} දෙන්න"], slots: { number: ["දුරකථන අංකය", "ෆෝන් නම්බර් එක", "අමතන්න නම්බර් එක"], how: ["කොහොමද", "ආකාරය"], contact: ["සම්බන්ධතා විස්තර", "නම්බර් එක"] } },
  },
  whatsapp: {
    en: { templates: ["can i {message} you on whatsapp", "do you have {app}", "send details on {app}", "whatsapp {info} please"], slots: { message: ["message", "text", "chat with"], app: ["whatsapp", "whatsapp number", "a whatsapp contact"], info: ["quote", "details", "number"] } },
    sin: { templates: ["වට්ස්ඇප් එකෙන් {message} පුළුවන්ද", "{app} තියෙනවද", "වට්ස්ඇප් එකට {info} එවන්න"], slots: { message: ["කතා කරන්න", "පණිවිඩ එවන්න"], app: ["වට්ස්ඇප් නම්බර් එක", "වට්ස්ඇප් එක"], info: ["මිල ගණන්", "විස්තර", "නම්බර් එක"] } },
  },
  careers: {
    en: { templates: ["are you {hiring} {role}", "{role} vacancy", "can i {work} with you", "do you have {job}"], slots: { hiring: ["hiring", "recruiting", "looking for staff"], role: ["drivers", "counter staff", "laundry workers", "staff"], work: ["work", "join", "get a job"], job: ["jobs", "vacancies", "openings"] } },
    sin: { templates: ["{role} සඳහා ඉඩ තියෙනවද", "ඔබ {hiring} කරනවද", "මට ඔබ එක්ක {work} පුළුවන්ද"], slots: { role: ["රියදුරන්", "කවුන්ටර් සේවකයන්", "ලෝන්ඩ්‍රි සේවකයන්"], hiring: ["බඳවා ගන්නවා", "රස්සා දෙනවා"], work: ["වැඩ කරන්න", "එකතු වෙන්න"] } },
  },
  towels_bedding: {
    en: { templates: ["wash my {item}", "{item} cleaning", "do you clean {item}", "{item} laundry"], slots: { item: ["towels", "bedsheets", "pillowcases", "table linen", "duvets", "bed linen"] } },
    sin: { templates: ["{item} සෝදන්න", "{item} පිරිසිදු කරනවද", "{item} සඳහා සේවාව"], slots: { item: ["තුවා", "ඇඳ ඇතිරිලි", "කොට්ට උර", "මේස රෙදි", "ඩිවට්"] } },
  },
  eco_friendly: {
    en: { templates: ["are your {products} eco friendly", "what {chemicals} do you use", "good for {skin}?", "sustainable {laundry}"], slots: { products: ["products", "detergents", "chemicals"], chemicals: ["detergents", "cleaning products", "chemicals"], skin: ["sensitive skin", "allergies", "babies"], laundry: ["laundry", "cleaning", "washing"] } },
    sin: { templates: ["{products} පරිසර හිතකාමීද", "{chemicals} මොනවාද පාවිච්චි කරන්නේ", "{skin} වලට හොඳද"], slots: { products: ["නිෂ්පාදන", "ඩිටර්ජන්ට්"], chemicals: ["රසායනික ද්‍රව්‍ය", "පිරිසිදු කරන ද්‍රව්‍ය"], skin: ["සංවේදී සම", "අසාත්මිකතා", "බබාලගේ සම"] } },
  },
  complaint: {
    en: { templates: ["my {item} was {problem}", "i have a {complaint}", "not happy with {service}", "can i speak to a {manager}"], slots: { item: ["shirt", "towel", "bedsheet", "order"], problem: ["damaged", "torn", "stained", "missing"], complaint: ["complaint", "issue", "problem"], service: ["the wash", "the cleaning", "the service"], manager: ["manager", "supervisor", "owner"] } },
    sin: { templates: ["මගේ {item} {problem} වුණා", "මට {complaint} එකක් තියෙනවා", "{service} ගැන සතුටු නැහැ"], slots: { item: ["කමිසෙ", "තුවාව", "ඇඳ ඇතිරිලිය", "ඇණවුම"], problem: ["නරක වුණා", "ඉරුණා", "නැති වුණා", "පැල්ලම් වුණා"], complaint: ["පැමිණිල්ල", "ගැටලුව", "ප්‍රශ්නය"], service: ["සේදීම", "පිරිසිදු කිරීම", "සේවාව"] } },
  },
  human_agent: {
    en: { templates: ["talk to a {person}", "can i speak to {staff}", "i want a {human}", "are you a {robot}"], slots: { person: ["human", "real person", "member of staff"], staff: ["someone", "an agent", "the manager"], human: ["person", "human agent", "real person"], robot: ["bot", "robot", "AI"] } },
    sin: { templates: ["{person} එක්ක කතා කරන්න ඕනේ", "ඔබ {robot} ද", "{staff} ගේන්නකෝ"], slots: { person: ["මිනිස්සෙක්", "සේවකයෙක්", "පරිපාලකයෙක්"], robot: ["බොට් එකක්", "රොබෝ එකක්", "AI එකක්"], staff: ["කළමනාකරුවා", "සේවකයා", "පරිපාලකයා"] } },
  },
  languages: {
    en: { templates: ["do you speak {lang}", "can we talk in {lang}", "change to {lang}", "which {languages} do you support"], slots: { lang: ["sinhala", "english", "සිංහල", "English"], languages: ["languages", "options"] } },
    sin: { templates: ["{lang} කතා කරන්න පුළුවන්ද", "භාෂාව {lang} කරන්න", "ඔබට {lang} තේරෙනවද"], slots: { lang: ["සිංහලෙන්", "ඉංග්‍රීසියෙන්", "සිංහල", "ඉංග්‍රීසි"] } },
  },
  booking: {
    en: { templates: ["do i need to {book}", "can i just {walk}", "should i call {before}", "{appointment} necessary?"], slots: { book: ["book", "reserve", "make an appointment"], walk: ["walk in", "come in", "come without booking"], before: ["first", "ahead", "in advance"], appointment: ["booking", "appointment", "reservation"] } },
    sin: { templates: ["වෙන් කරගන්න {need} ද", "කතා නොකර {come} පුළුවන්ද", "{appointment} අවශ්‍යද"], slots: { need: ["ඕනෙ", "අවශ්‍ය", "වෙන්නේ"], come: ["කෙලින්ම එන්න", "එන්න", "ගෙනත් දෙන්න"], appointment: ["වෙන් කිරීමක්", "පොස්ට් එකක්", "කලින් දැනුම් දීමක්"] } },
  },
  delicate_items: {
    en: { templates: ["can you clean {item}", "is {item} safe with you", "{item} needs special care", "do you handle {item}"], slots: { item: ["silk", "wool", "leather", "embellished dresses", "delicate fabrics", "hand wash only items"] } },
    sin: { templates: ["{item} සෝදන්න පුළුවන්ද", "{item} පරිස්සමෙන් හසුරුවනවද", "{item} වලට විශේෂ සැලකිල්ලක් තියෙනවද"], slots: { item: ["සේද රෙදි", "ලොම් රෙදි", "සම් භාණ්ඩ", "සැරසිලි ඇඳුම්", "සියුම් රෙදි"] } },
  },
  lost_items: {
    en: { templates: ["my {item} is {missing}", "one {item} did not come back", "can you trace my {order}", "i think something is {missing}"], slots: { item: ["shirt", "towel", "bedsheet", "piece"], missing: ["missing", "lost", "not returned"], order: ["order", "batch", "delivery"] } },
    sin: { templates: ["මගේ {item} {missing}", "එක {item} ආපහු ලැබුණේ නැහැ", "මගේ {order} සොයන්න පුළුවන්ද"], slots: { item: ["ඇඳුම", "තුවාව", "ඇඳ ඇතිරිලිය", "භාණ්ඩය"], missing: ["නැති වුණා", "නැහැ", "ආපහු ලැබුණේ නැහැ"], order: ["ඇණවුම", "ටෝකන් එක", "වාරිකය"] } },
  },
  pickup_schedule: {
    en: { templates: ["when do you collect from {place}", "how {often} is pickup", "can you arrange a {slot}", "{frequency} collection available"], slots: { place: ["hotels", "shops", "resorts", "our hotel", "our shop"], often: ["often", "frequently", "regularly"], slot: ["pickup time", "collection slot", "schedule"], frequency: ["daily", "weekly", "twice a week"] } },
    sin: { templates: ["{place} වලින් කවදා {collect} කරනවද", "{frequency} එකතු කිරීමක් තියෙනවද", "{slot} එකක් සකසන්න පුළුවන්ද"], slots: { place: ["හෝටල්", "සාප්පු", "නිවාඩු නිකේතන"], collect: ["එකතු", "අරගෙන"], frequency: ["දිනපතා", "සතිපතා", "සතියට දෙවරක්"], slot: ["වේලාවක්", "කාලසටහනක්", "දවසක්"] } },
  },
  bulk_capacity: {
    en: { templates: ["can you handle {amount}", "we have {amount} per {period}", "{bulk} laundry service", "do you take {large} orders"], slots: { amount: ["50 kg", "100 kg", "200 pieces", "a large volume", "bulk linen"], period: ["week", "day", "month"], bulk: ["bulk", "large volume", "high volume"], large: ["big", "large", "bulk"] } },
    sin: { templates: ["ඔබට {amount} හැසිරවිය හැකිද", "අපට {period} කට {amount} තියෙනවා", "{bulk} සේදුම් සේවාවක් තියෙනවද"], slots: { amount: ["කිලෝ 50ක්", "කිලෝ 100ක්", "කෑලි 200ක්", "විශාල ප්‍රමාණයක්"], period: ["සතියක", "දවසක", "මාසයක"], bulk: ["තොග", "විශාල ප්‍රමාණයේ", "වැඩි ප්‍රමාණයේ"] } },
  },
  quality_trust: {
    en: { templates: ["are you {reliable}", "how {experienced} are you", "do you have {clients}", "why choose {you}"], slots: { reliable: ["reliable", "trusted", "professional", "experienced"], experienced: ["experienced", "long established", "skilled"], clients: ["hotel clients", "regular customers", "partners"], you: ["you", "your laundry", "your service"] } },
    sin: { templates: ["ඔබ {reliable} ද", "ඔබට {clients} ඉන්නවද", "ඔබේ සේවාවේ {quality} කොහොමද"], slots: { reliable: ["විශ්වාසනීය", "විශ්වාසවන්ත", "පළපුරුදු"], clients: ["හෝටල් ගනුදෙනුකරුවන්", "ස්ථිර ගනුදෙනුකරුවන්", "හවුල්කරුවන්"], quality: ["ගුණාත්මකභාවය", "ප්‍රමිතිය"] } },
  },
  fallback: {
    en: { templates: ["what is the {weather}", "tell me a {joke}", "who won the {match}", "how do i {cook} rice", "play {music}", "what time is {it}"], slots: { weather: ["weather", "time", "date"], joke: ["joke", "story", "song"], match: ["match", "game", "election"], cook: ["cook", "make", "bake"], music: ["music", "a song", "video"], it: ["it", "the game", "the news"] } },
    sin: { templates: ["අද {weather} කොහොමද", "මට {joke} කියන්න", "{match} ප්‍රතිඵලය කියන්න", "මට {music} ඕනේ"], slots: { weather: ["කාලගුණය", "වෙලාව", "දිනය"], joke: ["විහිළුවක්", "කතාවක්", "ගීතයක්"], match: ["ක්‍රිකට් තරගය", "පාපන්දු තරගය", "තරගය"], music: ["සංගීතයක්", "ගීතයක්", "වීඩියෝ එකක්"] } },
  },
};

const trainingData = args.excludeTraining
  ? JSON.parse(fs.readFileSync(path.join(botRoot, "data/intents.json"), "utf8"))
  : null;
const trainingExamples = new Map(
  trainingData
    ? trainingData.intents.map((intent) => [intent.id, new Set(intent.examples)])
    : [],
);

const result = {};
Object.entries(GROUPS).forEach(([intent, group]) => {
  const known = trainingExamples.get(intent) || new Set();
  const generated = [...expand(group.en, args.en), ...expand(group.sin, args.sin)];
  result[intent] = generated.filter((text) => !known.has(text));
});

fs.writeFileSync(output, `${JSON.stringify(result, null, 2)}\n`);
const total = Object.values(result).reduce((sum, list) => sum + list.length, 0);
console.log(`Generated ${total} examples across ${Object.keys(result).length} intents -> ${output}`);
