export const locales = ["mn", "en"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "mn";

export function isLocale(value: string): value is Locale {
  return (locales as readonly string[]).includes(value);
}

export type PeakId = "shunkhlai" | "gua" | "shiveet";

const mn = {
  meta: {
    title: "Хужирт — Байгалийн эрдэст ус",
    description:
      "Шунхлай, Гуа, Шивээт уулсын сав газраас ундрах Хужиртын байгалийн эрдэст ус. Кальци, магни, натри, төмөр, фторыг байгалиасаа агуулдаг, 2013 оноос.",
    keywords: ["Хужирт", "эрдэст ус", "рашаан ус", "байгалийн ус", "Орхон", "Өвөрхангай", "Khujirt"],
    ogLocale: "mn_MN",
  },
  nav: {
    legend: "Домог & Түүх",
    facts: "Эрдэст найрлага",
    products: "Бүтээгдэхүүн",
    contact: "Холбоо барих",
    menu: "Цэс",
    close: "Хаах",
    home: "Нүүр хуудас",
    language: "Хэл",
    skip: "Агуулга руу шилжих",
  },
  hero: {
    eyebrow: "Байгалийн эрдэст ус · Орхоны сав газар",
    titleA: "Байгалийн эрч хүч,",
    titleB: "Домогт эх булаг",
    sub: "Шунхлай, Гуа, Шивээт уулсын сав газраас ундрах байгалийн эрдэст ус.",
    caption:
      "Шунхлай, Гуа, Шивээт уулсын дунд, Орхон голын сав газарт оршдог Хужиртын эх булгийн уснаас буга бүрэлдэн тодорч буй нь.",
    cta: "Домгийг нээх",
    cta2: "Бүтээгдэхүүн",
    scroll: "Гүйлгэж нээ",
  },
  legend: {
    eyebrow: "01 · Домог & Түүх",
    titleA: "Усны манан дундаас",
    titleB: "бүрэлдэх буга",
    lead: "Хужиртын эх булгийн тухай эртний домог, дөрвөн агшинд.",
    steps: [
      {
        title: "Шархадсан буга",
        text: "Эрт урьдын цагт анчны суманд шархадсан эр буга Орхоны хөндийгөөр тэнүүчилж, сүүлчийн хүчээ ус хайхад зарцуулжээ.",
      },
      {
        title: "Гурван уулын дундах эх",
        text: "Шунхлай, Гуа, Шивээт уулсын дунд газрын гүнээс бүлээн ус ундарч, манан болон хөөрч байв. Буга тэр мананг дагажээ.",
      },
      {
        title: "Эдгэрэл",
        text: "Буга эх булгийн усанд шархаа угааж, хүч тэнхээ нь эргэн иржээ. Түүнээс хойш хүмүүс энэ газрыг эдгээх хүчит эх хэмээн дээдэлдэг болсон.",
      },
      {
        title: "Өнөөдөр",
        text: "Тэр домогт эхийн усыг байгалийн цэвэр хэвээр нь савлан танд хүргэж байна.",
      },
    ],
    peaks: [
      { id: "shunkhlai" as PeakId, name: "Шунхлай", epithet: "Эх булгийн сахиус", text: "Эх булгийг нөмөрлөн сахидаг уул." },
      { id: "gua" as PeakId, name: "Гуа", epithet: "Манан нөмөрсөн гоо", text: "Өглөө бүр манандаа ороогдон сэрдэг." },
      { id: "shiveet" as PeakId, name: "Шивээт", epithet: "Хэрэм мэт хамгаалагч", text: "Хөндийг салхинаас хэрэм мэт хаацайлна." },
    ],
    more: "Найрлагыг үзэх",
  },
  facts: {
    eyebrow: "02 · Эрдэст найрлага",
    titleA: "Байгалиас заяасан",
    titleB: "тэнцвэр",
    lead: "Хужирт ус эрдэс бодисоо байгалиас нь авсан хэвээр хадгалдаг. Түүнд юу ч нэмдэггүй, юу ч хасдаггүй.",
    since: "онд үйлдвэрлэж эхэлсэн",
    minerals: "байгалийн эрдэс бодис",
    additives: "нэмэлт эрдэсжүүлэлт, урвуу осмос",
    labValue: "Өдөр бүр",
    lab: "итгэмжлэгдсэн лабораторийн шинжилгээ",
    mineralsTitle: "Байгалиасаа агуулагдах эрдэс",
    mineralNames: { Ca: "Кальци", Mg: "Магни", Na: "Натри", Fe: "Төмөр", F: "Фтор" },
    source: "Эх сурвалж: gem.mn дээрх Хужирт бүтээгдэхүүний мэдээлэл.",
  },
  products: {
    eyebrow: "03 · Бүтээгдэхүүн",
    titleA: "Цэвэр байдлын",
    titleB: "олон хэлбэр",
    lead: "Хийгүй, хийтэй, иодтой, амттай. Хуванцар болон шилэн саванд.",
    buy: "gem.mn-ээс авах",
    volumes: "Савлагааны хэмжээ",
    categories: { still: "Хийгүй", sparkling: "Хийтэй", iodine: "Иодтой", flavoured: "Амттай" },
    packaging: { pet: "Хуванцар сав", glass: "Шилэн сав" },
  },
  contact: {
    eyebrow: "04 · Холбоо барих",
    titleA: "Хамтран",
    titleB: "ажиллая",
    lead: "Дистрибьютер, ресторан, зочид буудал болон байгууллагын захиалгаар бидэнтэй холбогдоорой.",
    name: "Нэр",
    email: "И-мэйл",
    phone: "Утас",
    message: "Зурвас",
    optional: "заавал биш",
    send: "Илгээх",
    sending: "Илгээж байна…",
    sent: "Баярлалаа! Бид удахгүй холбогдоно.",
    error: "Илгээж чадсангүй. Дахин оролдоно уу.",
    rateLimited: "Хэт олон удаа илгээлээ. Түр хүлээгээд дахин оролдоно уу.",
    notConfigured: "Холбоо барих сервер хараахан тохируулагдаагүй байна.",
    invalid: "Нэр, и-мэйл эсвэл утас, зурвасаа зөв бөглөнө үү.",
    privacy: "Таны мэдээллийг зөвхөн хариу өгөхөд ашиглана.",
  },
  footer: {
    manifesto: "Байгаль бидэнд өгсөн хамгийн цэвэр зүйлээ хэвээр нь хадгалж, хүн бүрт хүргэх нь бидний амлалт.",
    tag: "Байгалийн эрдэст ус",
    source: "Эх булаг",
    place: "Хужирт, Өвөрхангай",
    shop: "Онлайн дэлгүүр",
    shopLink: "GEM International · gem.mn",
    rights: "© 2026 Хужирт. Бүх эрх хуулиар хамгаалагдсан.",
    credit: "Бугын 3D хэлбэр",
    creditTail: "цэгэн болон усан хэлбэрт хувиргасан",
  },
};

export type Dictionary = typeof mn;

const en: Dictionary = {
  meta: {
    title: "Khujirt — Natural Mineral Water",
    description:
      "Khujirt natural mineral water rises between the Shunkhlai, Gua and Shiveet mountains of the Orkhon basin. Naturally containing calcium, magnesium, sodium, iron and fluoride, since 2013.",
    keywords: ["Khujirt", "mineral water", "Mongolia", "natural mineral water", "Orkhon", "Övörkhangai", "Хужирт"],
    ogLocale: "en_US",
  },
  nav: {
    legend: "Legend & Story",
    facts: "Minerals",
    products: "Products",
    contact: "Contact",
    menu: "Menu",
    close: "Close",
    home: "Home",
    language: "Language",
    skip: "Skip to content",
  },
  hero: {
    eyebrow: "Natural mineral water · Orkhon basin",
    titleA: "The living",
    titleB: "Source",
    sub: "Natural mineral water rising from the basin of the Shunkhlai, Gua and Shiveet mountains.",
    caption:
      "Between the Shunkhlai, Gua and Shiveet mountains, in the Orkhon river basin, a stag takes shape from the waters of the Khujirt spring.",
    cta: "Discover the legend",
    cta2: "Products",
    scroll: "Scroll to discover",
  },
  legend: {
    eyebrow: "01 · Legend & Story",
    titleA: "A stag that rises",
    titleB: "from the mist",
    lead: "The old legend of the Khujirt spring, in four moments.",
    steps: [
      {
        title: "The wounded stag",
        text: "Long ago, a stag wounded by a hunter's arrow wandered the Orkhon valley, spending the last of its strength in search of water.",
      },
      {
        title: "The source between three mountains",
        text: "Between Shunkhlai, Gua and Shiveet, warm water welled up from deep underground and rose as mist. The stag followed it.",
      },
      {
        title: "The healing",
        text: "The stag washed its wound in the spring and its strength returned. Ever since, people have honoured this place as a source of healing.",
      },
      {
        title: "Today",
        text: "We bottle the water of that legendary source just as nature made it, and bring it to you.",
      },
    ],
    peaks: [
      { id: "shunkhlai" as PeakId, name: "Shunkhlai", epithet: "Guardian of the source", text: "The mountain that keeps watch over the spring." },
      { id: "gua" as PeakId, name: "Gua", epithet: "The mist-veiled beauty", text: "Wakes each morning wrapped in its mist." },
      { id: "shiveet" as PeakId, name: "Shiveet", epithet: "The fortress ridge", text: "Shields the valley from the wind like a wall." },
    ],
    more: "See the composition",
  },
  facts: {
    eyebrow: "02 · Minerals",
    titleA: "A balance",
    titleB: "given by nature",
    lead: "Khujirt keeps its minerals exactly as nature gave them. Nothing is added, nothing is taken away.",
    since: "in production since",
    minerals: "natural minerals",
    additives: "added minerals or reverse osmosis",
    labValue: "Daily",
    lab: "testing by an accredited laboratory",
    mineralsTitle: "Minerals it naturally contains",
    mineralNames: { Ca: "Calcium", Mg: "Magnesium", Na: "Sodium", Fe: "Iron", F: "Fluoride" },
    source: "Source: Khujirt product information on gem.mn.",
  },
  products: {
    eyebrow: "03 · Products",
    titleA: "Purity in",
    titleB: "many forms",
    lead: "Still, sparkling, iodised and flavoured. In plastic and glass.",
    buy: "Buy on gem.mn",
    volumes: "Bottle sizes",
    categories: { still: "Still", sparkling: "Sparkling", iodine: "Iodised", flavoured: "Flavoured" },
    packaging: { pet: "Plastic bottle", glass: "Glass bottle" },
  },
  contact: {
    eyebrow: "04 · Contact",
    titleA: "Let's work",
    titleB: "together",
    lead: "Distributors, restaurants, hotels and corporate orders — write to us.",
    name: "Name",
    email: "E-mail",
    phone: "Phone",
    message: "Message",
    optional: "optional",
    send: "Send",
    sending: "Sending…",
    sent: "Thank you! We will be in touch soon.",
    error: "Could not send. Please try again.",
    rateLimited: "Too many messages. Please wait a moment and try again.",
    notConfigured: "The contact service is not configured yet.",
    invalid: "Please enter your name, an e-mail or phone, and a message.",
    privacy: "We only use your details to reply to you.",
  },
  footer: {
    manifesto: "Our promise: keep the purest thing nature gave us exactly as it is, and share it with everyone.",
    tag: "Natural mineral water",
    source: "The source",
    place: "Khujirt, Övörkhangai, Mongolia",
    shop: "Online shop",
    shopLink: "GEM International · gem.mn",
    rights: "© 2026 Khujirt. All rights reserved.",
    credit: "Stag form",
    creditTail: "converted into particles and water",
  },
};

export const dictionaries: Record<Locale, Dictionary> = { mn, en };

export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale];
}
