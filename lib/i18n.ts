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
      "Нар мандах үед Хужиртын халуун булгаас уур савсаж, уурын дундаас тунгалаг усан буга тодорч, түүний өмнө Хужирт усны бүх савнууд гүехэн усанд зогсож буй нь. Ард нь намрын шар шинэс, Шунхлай, Гуа, Шивээт уулс.",
    cta: "Домгийг нээх",
    cta2: "Бүтээгдэхүүн",
    scroll: "Гүйлгэж нээ",
  },
  legend: {
    eyebrow: "01 · Домог & Түүх",
    titleA: "Өвгөн Шунхлайн",
    titleB: "домог",
    lead: "Хужиртын халуун рашааныг анх олсон анчин өвгөний тухай аман домог, зургаан агшинд.",
    steps: [
      {
        title: "Намрын өглөөний уур",
        text: "Намрын дунд сард анчин өвгөн Шунхлай Хангайн нуруугаар хэсүүчилж, Шивээт, Гуа уулын хооронд бэлчих ямаан гөрөөсийг ажиглан хоножээ. Нар мандах агшинд Хужиртын голын зүүн хаяанаас уур савсаж байхыг тэр анзаарчээ.",
        quote: "Наран сөрөг Хужиртын голын зүүн хаяанд утаа май суунаглаж байна уу гэтэл уур цан савсаж байх шиг харагджээ.",
      },
      {
        title: "Доголон буга",
        text: "Уурын дундаас ганц буга босч, урд хөлөө өргөн доголсоор уулын бэл өөд явжээ. Анчин түүнийг амархан агнаж болох байсан ч өрөвдөж, гар хүрсэнгүй.",
        quote: "Халуун намраар энэ сайхан амьтныг егүүтгэнэ гэсэн чинь юу гэсэн үг вэ?",
      },
      {
        title: "Үдэш бүр нэг хонхорт",
        text: "Үдэш болгон буга уур савсдаг тэр хонхортоо эргэж ирж хэвтдэг байв. Өдрөөс өдөрт доголох нь багассаар, нэг өглөө морьтой хүнээс үргэн уулын бэл өөд харайгаад явчихжээ.",
        quote: "Сайн ажиглавал өглөөг бодвол доголох нь арай гайгүй ч болчихсон юм шиг.",
      },
      {
        title: "Халуун булаг",
        text: "Бугын хэвтэр нь усан шалбаагтай, тас хар шавартай хонхор байлаа. Ойр ойрхон хэд хэдэн булаг зөөлөн оргилж, зарим нь бүлээн, зарим нь гар түлэм халуун байжээ.",
        quote: "Оргилж байгаа нэг булгаас гараа тосоод амсах гэтэл бүлээн, гайхан дараагийнхаас амсах гэтэл золтой л гараа түлчихсэнгүй.",
      },
      {
        title: "Рашаан",
        text: "Өвгөн хөл гараа халуун усанд шавшиж, хар шавраар нь боож хэд хоног саатахад хуян шар ус нь тарж, бие нь илааршжээ. Энэ усны тухай яриа Орхоны хөндийгөөр тархаж, Гуа уулын баруун талын сэрвэн хадтай өндөрлөгийг Шунхлай хэмээн өргөмжилжээ.",
        quote: "Өвгөн анчны явсан тэр мөр жим болж, жим нь зөрөг болж, зөрөг нь харгуй болон тодорсоор…",
      },
      {
        title: "Өнөөдөр",
        text: "Тэр домогт нутгийн усыг байгалийн цэвэр хэвээр нь савлан танд хүргэж байна.",
        quote: "Монгол хүн бүр эрүүл байг.",
      },
    ],
    peaks: [
      { id: "shunkhlai" as PeakId, name: "Шунхлай", epithet: "Анчны нэрэмжит хад", text: "Гуа уулын баруун талын сэрвэн хадтай өндөрлөг, домгийн анчны нэрээр." },
      { id: "gua" as PeakId, name: "Гуа", epithet: "Гөрөөсний бэлчээр", text: "Ямаан гөрөөс сэлгэн бэлчдэг уул." },
      { id: "shiveet" as PeakId, name: "Шивээт", epithet: "Усан зам", text: "Гөрөөс энгэрийг нь даган голдоо усанд бууна." },
    ],
    more: "Найрлагыг үзэх",
    full: {
      title: "Өвгөн Шунхлайн домог",
      note: "Хужирт нутгийн аман домог",
      open: "Домгийг бүтнээр нь унших",
      close: "Хураах",
      paragraphs: [
        "Шунхлайнх энэ хөндийд зун намартаа тарвага, туулайхан, өвөл хавартаа зээр гөрөөсхөн шоглож амин зуулгадаа нэмэрлэнэ. Түүний ан авын эрдэм ухаан гагцхүү ажиглалт, тэвчээр, зөн совин гурав дээр тогтоно. Энэ удаад ч гэсэн өвгөн анчин нэг л их аз хийморь дагуулах юм шиг зөн совиндоо хөтлөгдөн намрын дунд сарын хирд өвгөн анчин Хангай нуруугаар хэсүүчлэн явж байтал Шивээт, Гуа уулын хооронд хэдэн ямаан гөрөөс сэлгэн бэлчээрлэж байхыг ажиглажээ.",
        "Намрын сэрүүнд жихүүцэж хоносон өвгөн анчин наран ээвэр хадны нөмөрт мандах нартай золгох тэр мөчид, наран сөрөг Хужиртын голын зүүн хаяанд утаа май суунаглаж байна уу гэтэл уур цан савсаж байх шиг харагджээ. Нүдээ зээрэн дээлийнхээ хир даг болсон ханцуйгаар хэд шудравч уур цан, утаа май болохыг ялгаж эс чадан байтал нөгөө газраас ганц буга босч хэд шилгээж өвс хазалснаа өрөөсөн урд хөлөө өргөөд зүүн хойшоо явах нь яахын аргагүй доголон буга байв.",
        "Өвгөн анчин баярлаж доголон ч гэсэн намрын юм тарган байгаа даа угтаж очоод амархаан шоглочихдог хэрэг гэж бодоод босон харайх гэснээ эргэн суугаад: Хайрхаан нүгэлт хар гөрөөчин би чинь халуун намраар энэ сайхан амьтныг егүүтгэнэ гэсэн чинь юу гэсэн үг вэ? Үүрч ганзаглаад даах ч биш дээ, үмхэж идээд барах ч биш дээ. Энэ сайхан амьтан чоно нохойд хөөгдөж, хад асганд хөлөө хавчуулаад бэртэж гэмтсэнээс хаа зайлав гэж хөөрхий минь, болдогсон бол хугархай хөлд нь мод бариад боогоод өгчих юмсан, дорхноо л эдгэнэ дээ гэж бодон урт амьсгаа авав.",
        "Доголон буга өвс идсээр Хужиртын голын зүүн хаяанаас хугархай хөлийнхөө зөнгөөр гишгэж ядан уулын бэл өөд аажуухан сажилж байлаа. Доголон бугын явдлаас болоод өчигдөр өглөөгүүр Хужиртын голоос ус уугаад Шивээт уулын бэлчир өгссөн нөгөө хэдэн ямаан гөрөөсөө ч мартсан өвгөн анчин гэнэт сэхээрч, өмнө нь дүнхийх хайрхан тийш нүд бэлчээвээс нойтон сормуустай юм үл харагдана.",
        "Анчин өвгөний хэд хоног нүдээрээ хариулсан нөгөө хэдэн ямаан гөрөөс нь усандаа ирэх аястай Шивээт уулынхаа энгэр даган доошилж харагдана. Өвгөн энэ хэд… Гуа ууландаа ирэхгүй хаачих вэ гэсэн өглөөнийх нь таавар зөв байсанд сэтгэл баясаж, их л додигор сууна. Наашлаад Хужиртын голын ай саваар нүд бэлчээтэл нөгөө өглөөний ганц доголон буга буцаад хойд уулын бэл уруудан гол усанд ирж явах шиг.",
        "Сайн ажиглавал өглөөг бодвол доголох нь арай гайгүй ч болчихсон юм шиг. Тэр буга аажуу тайван өвс идэж явсаар өчигдрийнхөө хэвтэр буюу өнөө өглөө утаа май, уур цан босгоод байсан нөгөө хонхортоо очоод хэвтэх нь тэр ээ. Бас нөгөө хэдэн гөрөөс нь ч усанд ойртоод голынхоо хөвөөнд дөхөж яваа нь үдшийн бүрийд бүдэг бадаг харагдана.",
        "Өвгөн Шунхлай мориныхоо аргамжааг сэлгэж ирээд тулгын гурван чулуундаа гал өрдөж цай даргиулан, хээрийн хүнс болох тосонд нь чанаж болгосон тарваганы хаа, гуяаа зооглоод тохмоо дэвсэж, янгиа цагаан эмээлээ дэрлэн, зээрэн дээлээ өрөөлдөж нөмрөөд дуг нойрондоо дугжирчээ. Ингээд хээр хоносон өвгөн хүн жихүүн намрын шөнө яахын араггүй тайван нойрсож билээ дээ. Ар өврөөс нь сийгэж, дороос нь жиндэж, жихүүцэн сэртэл үүр манхайж дорноос бүдэг саарал, цагаан гэгээ тэнгэр өөд аажуухан огшиж байлаа. Даарч хоносноос болоод хуян шар усандаа баригдсан дөрвөн мөч нь шархирч байх гэж жигтэйхэн.",
        "Өчигдрийн хэвтэж хоносон нөгөө доголон буга босож хэд шилгээснээ яваад өгөх нь өчигдрийнхөөсөө бүр ч бага доголж байх шиг. Тэнд өглөө болгон уур савсаж байдаг, орой болгон доголон буга хэвтэж хоноод байгаа нь өвгөн анчны очиж үзэх юмсан гэсэн хорхойг улам ч гижигдэв ээ. Маргааш өглөө нь эртээ босоод хартал нөгөө бугын хэвтэш хонхроос бүр ч ихээр уур манан савсаж байсанд Шунхлай өвгөн түүнийг үзэхээр эрс шулуун цогиулах нь тэр ээ. Өвгөнийг ирэх гэсээр байтал уур манан ч арилж, морьтой хүнээс үргэсэн доголон буга нь ч доголон гэхээргүй уулын бэлээд харайгаад явж одов.",
        "Өвгөн жаахан мунгинаж яваад бугын хэвтрийг олтол усан шалбаагтай тас хар шавартай хонхорт мал амьтан байнга хэвтэж орогнодогийг түвэггүйхэн ажилглав. Жаахан цааш явтал ойр ойрхон хэд хэдэн газраас булаг зөөлөн зөөлөн оргилж намаг шалбааг ихтэй, тэр орчин цаанаа л нэг бүлээхэн дулаахан болохыг мэдрэв. Оргилж байгаа нэг булгаас гараа тосоод амсах гэтэл бүлээн, гайхан дараагийнхаас амсах гэтэл золтой л гараа түлчихсэнгүй. Өвгөн анчин бүр мэл гайхаж, цэл хөхрөн бүлаг болгонд гараа дүр үзэхэд бүгдээрээ халуун байлаа.",
        "Ан амьтан газар нутгийг шинжин ажиглахдаа гаргууд тэр өвгөн өглөө бүр эндээс уур манан яагаад савсдаг, доголон буга орой болгон яагаад энд ирж хоноглож хэвтдэг, хугархай хөл нь өдөр өдрөөр илааршин доголох нь багасаж байгаа зэргийг төвөггүйхэн ойлгож мэдэв. Урьд хожид дуулж сонсоогүй, үзэж хараагүй газраас ундардаг, гайхалтай энэ халуун усыг анчин өвгөн Шунхлай ихэд биширч, өвдөгнийх нь нүхээр хатгачхаараа хэсэг доголон явдаг хуучтайгаа санагалзан энэ голын хөвөөнд хэд хоног саатан, хуян шар усандаа идэгдсэн хөл гараа халуун усанд дүрж шавших, хар шаврыг нь түрхэх боох зэргээр өөрийгөө бөөцийлөн аргаджээ.",
        "Дөнгөс л гэвэл янгинан шархирч байдаг хөл гарынх нь хуян шар ус нь тарж, нугарч тэрнийх нь хүртэл сайжирч, арьс мах нь илт зөөлрөн илааршиж байлаа. Тэр цагаас хойш Хужиртын голын зүүн хөвөөний тус газраас ундрах, гайхалтай энэ халуун усны ид шидийн тухай өвгөн анчин Шунхлайн аман яриа Орхоны хөндийгөөр хуй салхи мэт тархжээ.",
        "Ийнхүү өвгөн анчны явсан тэр мөр жим болж, жим нь зөрөг болж, зөрөг нь харгуй болон тодорсоор, нөгөө халуун ус нь хүмүүний биеийг илааршуулдаг ид шидийн рашаан болох нь амьдралаар нотлогдож, өвгөн анчин Шунхлайн домог болон үлдэж, нөгөө Гуа уулынх нь баруун сэрвэн хадтай өндөрлөгийг Шунхлай хэмээн өргөмжилж, сүслэн залбирдаг болсон ажгуу.",
      ],
    },
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
    manifesto: "Монгол хүн бүр эрүүл байг",
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
      "At sunrise, steam rises from the hot springs of Khujirt; a clear stag of water takes shape in it, and in front of it every Khujirt bottle stands in the shallows. Behind: golden autumn larches and the Shunkhlai, Gua and Shiveet mountains.",
    cta: "Discover the legend",
    cta2: "Products",
    scroll: "Scroll to discover",
  },
  legend: {
    eyebrow: "01 · Legend & Story",
    titleA: "The legend of",
    titleB: "old Shunkhlai",
    lead: "The tale of the old hunter who first found the hot springs of Khujirt, in six moments.",
    steps: [
      {
        title: "Steam at an autumn sunrise",
        text: "In the middle month of autumn the old hunter Shunkhlai roamed the Khangai, watching roe deer graze between the Shiveet and Gua mountains. As the sun rose he saw steam drifting up from the east bank of the Khujirt river.",
        quote: "Facing the sun, on the east bank of the Khujirt — was it smoke drifting? No, it looked more like steam rising.",
      },
      {
        title: "The lame stag",
        text: "A lone stag rose out of the steam and limped up the mountainside, one front leg held high. The hunter could easily have taken it — but out of pity, he let it be.",
        quote: "To slay such a fine creature in the warm autumn — what would that mean?",
      },
      {
        title: "Every evening, the same hollow",
        text: "Each evening the stag came back to lie in the steaming hollow, and each day it limped less — until one morning it bounded up the slope, hardly lame at all.",
        quote: "Looking closely, its limp seemed a little better than in the morning.",
      },
      {
        title: "The hot springs",
        text: "Where the stag had lain, the hunter found puddles and pitch-black mud, and springs welling up gently close together — some lukewarm, some hot enough to scald.",
        quote: "He cupped his hand under one spring: it was warm. He tried the next, and nearly scalded his hand.",
      },
      {
        title: "Arshan, the healing water",
        text: "He soaked his aching limbs in the hot water and bound them with the black mud, and his old joint-ache went away. Word of the healing water spread through the Orkhon valley, and the rocky height west of Gua was named Shunkhlai.",
        quote: "The old hunter’s tracks became a trail, the trail a path, the path a road…",
      },
      {
        title: "Today",
        text: "We bottle the water of that legendary land just as nature made it, and bring it to you.",
        quote: "May every Mongolian be healthy.",
      },
    ],
    peaks: [
      { id: "shunkhlai" as PeakId, name: "Shunkhlai", epithet: "The hunter’s crag", text: "The rocky height west of Gua, named after the hunter of the legend." },
      { id: "gua" as PeakId, name: "Gua", epithet: "Where roe deer graze", text: "The mountain the roe deer wander back and forth across." },
      { id: "shiveet" as PeakId, name: "Shiveet", epithet: "The way to water", text: "Roe deer come down its slope to drink at the river." },
    ],
    more: "See the composition",
    full: {
      title: "The legend of old Shunkhlai",
      note: "A folk legend of the Khujirt land, translated from Mongolian",
      open: "Read the whole legend",
      close: "Close",
      paragraphs: [
        "In this valley Shunkhlai hunted marmots and hares in summer and autumn, and gazelle and roe deer in winter and spring, adding a little to his daily bread. His craft rested on three things alone: watchfulness, patience and instinct. This time too, led by a feeling that some great fortune awaited him, the old hunter was roaming the Khangai range in the middle month of autumn when he noticed a few roe deer grazing back and forth between the Shiveet and Gua mountains.",
        "He had spent a shivering night in the autumn chill, and at the moment he greeted the rising sun from the lee of a sunlit rock, he saw something on the east bank of the Khujirt, facing the sun — was it smoke drifting? No, it looked more like steam rising. He rubbed his eyes a few times with the greasy sleeve of his gazelle-skin deel, still unable to tell steam from smoke, when a lone stag rose from that very spot, took a few steps, cropped some grass, lifted one front leg and moved off to the north-east: there was no mistaking it, the stag was lame.",
        "The old man brightened. Lame or not, an autumn stag would be fat; he could go to meet it and take it easily. He was about to spring up — and sat back down. “A sinful old hunter like me, to slay such a fine creature in the warm autumn — what would that mean? I could not carry it all on my back and saddle, nor could I eat it all. The poor thing must have been chased by wolves, or caught its leg between rocks. If only I could splint that broken leg with a stick and bind it, it would heal in no time,” he thought, and drew a long breath.",
        "Grazing as it went, the lame stag climbed slowly from the east bank of the Khujirt up toward the foot of the mountain, feeling its way on its broken leg. Because of it the old hunter had even forgotten the roe deer that had drunk at the Khujirt the morning before and then climbed the slopes of Shiveet. Coming to himself, he looked toward the mountain looming before him, but not a living thing was in sight.",
        "The roe deer he had watched over for days appeared at last, coming down the slope of Shiveet as if to water. Glad that his morning guess had been right — where else would they go but back to their Gua mountain? — the old man sat there quite content. Turning his eyes back down along the Khujirt, he saw the lame stag of that morning coming down the slope of the northern mountain to the river again.",
        "Looking closely, its limp seemed a little better than in the morning. The stag grazed calmly on and lay down in yesterday’s bed — the very hollow from which smoke and steam had risen that morning. The roe deer too were drawing near the water, dim shapes along the riverbank in the dusk.",
        "Old Shunkhlai moved his horse’s tether, lit a fire between the three stones of his hearth and boiled his tea, ate the haunch and thigh of a marmot cooked in its own fat — the food of the open country — spread his saddle-cloth, pillowed his head on his white saddle, pulled his gazelle-skin deel over himself and fell fast asleep. An old man sleeping out on a cold autumn night sleeps soundly enough. He woke chilled through, the cold seeping in from front and back and up from the ground, as dawn greyed and the first pale light crept slowly up the eastern sky. After the cold night, his four limbs, long gripped by joint-ache, ached terribly.",
        "The lame stag that had slept there rose, took a few steps and left — limping even less than the day before. Steam rising there every morning, the lame stag coming to sleep there every evening: the urge to go and see grew ever stronger in the old hunter. The next morning he rose early and saw even more steam rising from the stag’s hollow, and Shunkhlai set off straight toward it at a trot. Before he arrived the steam had cleared, and the stag, startled by the rider, bounded off up the mountainside, hardly lame at all.",
        "Riding about a little, the old man found the stag’s bed: a hollow of puddles and pitch-black mud where animals plainly came often to lie and shelter. A little further on, several springs were welling up gently, close together, among many pools and marshy patches, and the whole place felt somehow lukewarm and warm. He cupped his hand under one welling spring to taste it — it was warm. Amazed, he tried the next, and nearly scalded his hand. Astonished, wide-eyed, he dipped his hand in every spring: every one of them was hot.",
        "Keen as he was at reading the land and its animals, the old man easily understood why steam rose there every morning, why the lame stag came to lie there every evening, and why its broken leg was mending and its limp fading day by day. Marvelling at this hot water welling from ground he had never heard of nor seen, old Shunkhlai remembered his own old trouble — the knee that made him limp whenever it was pricked — and lingered on the riverbank for several days, soaking his aching limbs in the hot water and smearing and binding them with the black mud, nursing himself back to health.",
        "The ache that made his limbs throb at the slightest movement went away; his joints grew supple again, and his skin and flesh plainly softened and healed. From that time on, old hunter Shunkhlai’s tale of the wondrous hot water welling from the east bank of the Khujirt spread through the Orkhon valley like a whirlwind.",
        "And so the old hunter’s tracks became a trail, the trail became a path, and the path became a road; life itself proved the hot water to be a magical arshan that heals the human body; old hunter Shunkhlai became a legend; and the rocky height on the western side of Gua mountain was honoured with the name Shunkhlai, a place people revere and pray to.",
      ],
    },
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
    manifesto: "Let every Mongolian be healthy",
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
