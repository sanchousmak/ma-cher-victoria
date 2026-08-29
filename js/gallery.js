// ==========================================================================
// СЕРИЯ РАБОТ (карусель)
// ==========================================================================
const gallery = {
  painting: [
    { image: '../catalog/work-1.webp', title: { ru: 'Утро в Юрмале', en: 'Morning in Jurmala' }, year: 2024, material: { ru: 'Холст, масло', en: 'Oil on canvas' }, size: '60×80' },
    { image: '../catalog/work-2.webp', title: { ru: 'Окно',          en: 'Window' },             year: 2024, material: { ru: 'Холст, масло', en: 'Oil on canvas' }, size: '40×50' },
    { image: '../catalog/work-3.webp', title: { ru: 'Сирень',        en: 'Lilac' },              year: 2023, material: { ru: 'Холст, масло', en: 'Oil on canvas' }, size: '50×70' },
    { image: '../catalog/work-4.webp', title: { ru: 'Тишина',        en: 'Silence' },            year: 2023, material: { ru: 'Холст, масло', en: 'Oil on canvas' }, size: '40×40' }
  ],
  graphics: [
    { image: '../catalog/work-5.webp', title: { ru: 'Набросок I',  en: 'Sketch I' },  year: 2025, material: { ru: 'Бумага, тушь',  en: 'Ink on paper' },     size: '21×30' },
    { image: '../catalog/work-6.webp', title: { ru: 'Набросок II', en: 'Sketch II' }, year: 2025, material: { ru: 'Бумага, тушь',  en: 'Ink on paper' },     size: '21×30' },
    { image: '../catalog/work-7.webp', title: { ru: 'Профиль',     en: 'Profile' },   year: 2024, material: { ru: 'Бумага, уголь', en: 'Charcoal on paper' }, size: '30×40' }
  ],
  illustration: [
    { image: '../catalog/work-8.webp',  title: { ru: 'Кофейня',  en: 'Café' },      year: 2025, material: { ru: 'Цифровая печать', en: 'Digital print' }, size: 'A3' },
    { image: '../catalog/work-9.webp',  title: { ru: 'Прогулка', en: 'Walk' },      year: 2025, material: { ru: 'Цифровая печать', en: 'Digital print' }, size: 'A3' },
    { image: '../catalog/work-10.webp', title: { ru: 'Двор',     en: 'Courtyard' }, year: 2024, material: { ru: 'Акварель',        en: 'Watercolour' },  size: '30×40' },
    { image: '../catalog/work-11.webp', title: { ru: 'Вечер',    en: 'Evening' },   year: 2024, material: { ru: 'Акварель',        en: 'Watercolour' },  size: '30×40' }
  ]
};

// ==========================================================================
// СТЕНА (магазин)
//
// id         уникальный, по нему работает корзина
// kind       'original' | 'print' — по этому полю фильтр
// ratio      пропорция работы, '4/5', '3/4', '1/1', '16/10'.
//            Задаёт и размер картины, и размер следа от проданной
// scale      's' | 'm' | 'l' — насколько крупно работа висит на стене
// detail     кроп фрагмента для разворота (необязательно, но сильно оживляет)
// about      1–2 предложения о работе (необязательно)
// status     'sold' → вместо картины остаются гвоздь и невыгоревший след
// collection подпись у проданной: «Частная коллекция, Стамбул»
// ==========================================================================
const shop = [
  {
    id: 'orig-yurmala',
    title: { ru: 'Утро в Юрмале', en: 'Morning in Jurmala' },
    image: '../catalog/work-1.webp',
    detail: '../catalog/work-1.webp',
    kind: 'original',
    type: { ru: 'Оригинал', en: 'Original' },
    ratio: '4/5',
    scale: 'l',
    year: 2024,
    material: { ru: 'Холст, масло', en: 'Oil on canvas' },
    size: { ru: '60×80 см', en: '60×80 cm' },
    price: 850,
    about: { ru: 'Писалось три недели утром, пока свет ещё холодный.', en: 'Painted over three weeks, in the mornings while the light was still cool.' }
  },
  {
    id: 'orig-window',
    title: { ru: 'Окно', en: 'Window' },
    image: '../catalog/work-2.webp',
    kind: 'original',
    type: { ru: 'Оригинал', en: 'Original' },
    ratio: '4/5',
    scale: 'm',
    year: 2024,
    material: { ru: 'Холст, масло', en: 'Oil on canvas' },
    size: { ru: '40×50 см', en: '40×50 cm' },
    price: 620,
    status: 'sold',
    collection: { ru: 'Частная коллекция, Стамбул', en: 'Private collection, Istanbul' }
  },
  {
    id: 'orig-silence',
    title: { ru: 'Тишина', en: 'Silence' },
    image: '../catalog/work-4.webp',
    kind: 'original',
    type: { ru: 'Оригинал', en: 'Original' },
    ratio: '1/1',
    scale: 's',
    year: 2023,
    material: { ru: 'Холст, масло', en: 'Oil on canvas' },
    size: { ru: '40×40 см', en: '40×40 cm' },
    price: 480,
    status: 'sold',
    collection: { ru: 'Частная коллекция, Рига', en: 'Private collection, Riga' }
  },
  {
    id: 'print-yurmala-a3',
    title: { ru: 'Утро в Юрмале', en: 'Morning in Jurmala' },
    image: '../catalog/work-1.webp',
    kind: 'print',
    type: { ru: 'Принт, тираж 25', en: 'Print, edition of 25' },
    ratio: '4/5',
    scale: 'm',
    year: 2025,
    material: { ru: 'Giclée, хлопковая бумага', en: 'Giclée, cotton paper' },
    size: 'A3',
    price: 90
  },
  {
    id: 'print-sketch-a4',
    title: { ru: 'Набросок I', en: 'Sketch I' },
    image: '../catalog/work-5.webp',
    kind: 'print',
    type: { ru: 'Принт, тираж 50', en: 'Print, edition of 50' },
    ratio: '3/4',
    scale: 's',
    year: 2025,
    material: { ru: 'Giclée', en: 'Giclée' },
    size: 'A4',
    price: 55
  }
];
