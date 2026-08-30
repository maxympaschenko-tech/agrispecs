export type ComparisonPresetMachine = {
  brand: string;
  model: string;
};

export type ComparisonPreset = {
  slug: string;
  title: string;
  description: string;
  machines: ComparisonPresetMachine[];
};

export const comparisonPresets: ComparisonPreset[] = [
  {
    slug: 'john-deere-5090m-vs-case-ih-farmall-90a-vs-new-holland-powerstar-90',
    title: 'John Deere 5090M vs Case IH Farmall 90A vs New Holland PowerStar 90',
    description: 'Compare current source-backed specifications for three utility tractors around the 90 horsepower class.',
    machines: [
      { brand: 'John Deere', model: '5090M' },
      { brand: 'Case IH', model: 'Farmall 90A' },
      { brand: 'New Holland', model: 'PowerStar 90' },
    ],
  },
  {
    slug: 'john-deere-5100m-vs-case-ih-farmall-100a-vs-new-holland-powerstar-100',
    title: 'John Deere 5100M vs Case IH Farmall 100A vs New Holland PowerStar 100',
    description: 'Compare current source-backed specifications for three utility tractors around the 100 horsepower class.',
    machines: [
      { brand: 'John Deere', model: '5100M' },
      { brand: 'Case IH', model: 'Farmall 100A' },
      { brand: 'New Holland', model: 'PowerStar 100' },
    ],
  },
  {
    slug: 'john-deere-5120m-vs-case-ih-farmall-115a-vs-new-holland-powerstar-120',
    title: 'John Deere 5120M vs Case IH Farmall 115A vs New Holland PowerStar 120',
    description: 'Compare current source-backed specifications for three utility tractors around the 120 horsepower class.',
    machines: [
      { brand: 'John Deere', model: '5120M' },
      { brand: 'Case IH', model: 'Farmall 115A' },
      { brand: 'New Holland', model: 'PowerStar 120' },
    ],
  },
  {
    slug: 'case-ih-puma-155-new-vs-new-holland-all-new-t7-190',
    title: 'Case IH Puma 155 New vs New Holland All-New T7.190',
    description: 'Compare current source-backed specifications for two 155 rated horsepower row-crop tractors.',
    machines: [
      { brand: 'Case IH', model: 'Puma 155 New' },
      { brand: 'New Holland', model: 'All-New T7.190' },
    ],
  },
  {
    slug: 'case-ih-puma-165-new-vs-new-holland-all-new-t7-210',
    title: 'Case IH Puma 165 New vs New Holland All-New T7.210',
    description: 'Compare current source-backed specifications for two 165 rated horsepower row-crop tractors.',
    machines: [
      { brand: 'Case IH', model: 'Puma 165 New' },
      { brand: 'New Holland', model: 'All-New T7.210' },
    ],
  },
  {
    slug: 'case-ih-puma-185-new-vs-new-holland-all-new-t7-225',
    title: 'Case IH Puma 185 New vs New Holland All-New T7.225',
    description: 'Compare current source-backed specifications for two 185 rated horsepower row-crop tractors.',
    machines: [
      { brand: 'Case IH', model: 'Puma 185 New' },
      { brand: 'New Holland', model: 'All-New T7.225' },
    ],
  },
  {
    slug: 'john-deere-6r-155-vs-case-ih-puma-155-new-vs-new-holland-all-new-t7-190',
    title: 'John Deere 6R 155 vs Case IH Puma 155 New vs New Holland All-New T7.190',
    description: 'Compare current source-backed specifications for three tractors with 155 rated horsepower.',
    machines: [
      { brand: 'John Deere', model: '6R 155' },
      { brand: 'Case IH', model: 'Puma 155 New' },
      { brand: 'New Holland', model: 'All-New T7.190' },
    ],
  },
  {
    slug: 'john-deere-6r-165-vs-case-ih-puma-165-new-vs-new-holland-all-new-t7-210',
    title: 'John Deere 6R 165 vs Case IH Puma 165 New vs New Holland All-New T7.210',
    description: 'Compare current source-backed specifications for three tractors with 165 rated horsepower.',
    machines: [
      { brand: 'John Deere', model: '6R 165' },
      { brand: 'Case IH', model: 'Puma 165 New' },
      { brand: 'New Holland', model: 'All-New T7.210' },
    ],
  },
  {
    slug: 'john-deere-6r-185-vs-case-ih-puma-185-new-vs-new-holland-all-new-t7-225',
    title: 'John Deere 6R 185 vs Case IH Puma 185 New vs New Holland All-New T7.225',
    description: 'Compare current source-backed specifications for three tractors with 185 rated horsepower.',
    machines: [
      { brand: 'John Deere', model: '6R 185' },
      { brand: 'Case IH', model: 'Puma 185 New' },
      { brand: 'New Holland', model: 'All-New T7.225' },
    ],
  },
  {
    slug: 'john-deere-7r-250-vs-new-holland-t8-320',
    title: 'John Deere 7R 250 vs New Holland T8.320',
    description: 'Compare current source-backed specifications for two tractors with 250 rated horsepower.',
    machines: [
      { brand: 'John Deere', model: '7R 250' },
      { brand: 'New Holland', model: 'T8.320' },
    ],
  },
  {
    slug: 'john-deere-7r-270-vs-case-ih-optum-270',
    title: 'John Deere 7R 270 vs Case IH Optum 270',
    description: 'Compare current source-backed specifications for high-horsepower tractors with 270 and 271 rated horsepower.',
    machines: [
      { brand: 'John Deere', model: '7R 270' },
      { brand: 'Case IH', model: 'Optum 270' },
    ],
  },
  {
    slug: 'john-deere-7r-290-vs-case-ih-magnum-295',
    title: 'John Deere 7R 290 vs Case IH Magnum 295',
    description: 'Compare current source-backed specifications for high-horsepower tractors with 290 and 295 rated horsepower.',
    machines: [
      { brand: 'John Deere', model: '7R 290' },
      { brand: 'Case IH', model: 'Magnum 295' },
    ],
  },
  {
    slug: 'john-deere-7r-350-vs-case-ih-magnum-355',
    title: 'John Deere 7R 350 vs Case IH Magnum 355',
    description: 'Compare current source-backed specifications for high-horsepower tractors with 350 and 355 rated horsepower.',
    machines: [
      { brand: 'John Deere', model: '7R 350' },
      { brand: 'Case IH', model: 'Magnum 355' },
    ],
  },
  {
    slug: 'john-deere-5075en-vs-case-ih-farmall-80n-vs-new-holland-t4-80v',
    title: 'John Deere 5075EN vs Case IH Farmall 80N vs New Holland T4.80V',
    description: 'Compare current source-backed specifications for three narrow orchard and vineyard tractors around the 75 horsepower class.',
    machines: [
      { brand: 'John Deere', model: '5075EN' },
      { brand: 'Case IH', model: 'Farmall 80N' },
      { brand: 'New Holland', model: 'T4.80V' },
    ],
  },
  {
    slug: 'john-deere-5090en-vs-case-ih-farmall-90n-vs-new-holland-t4-90v',
    title: 'John Deere 5090EN vs Case IH Farmall 90N vs New Holland T4.90V',
    description: 'Compare current source-backed specifications for three narrow orchard and vineyard tractors in the 84 to 90 horsepower range.',
    machines: [
      { brand: 'John Deere', model: '5090EN' },
      { brand: 'Case IH', model: 'Farmall 90N' },
      { brand: 'New Holland', model: 'T4.90V' },
    ],
  },
  {
    slug: 'john-deere-5105en-vs-case-ih-farmall-100n-vs-new-holland-t4-100v',
    title: 'John Deere 5105EN vs Case IH Farmall 100N vs New Holland T4.100V',
    description: 'Compare current source-backed specifications for three narrow orchard and vineyard tractors around the 100 horsepower class.',
    machines: [
      { brand: 'John Deere', model: '5105EN' },
      { brand: 'Case IH', model: 'Farmall 100N' },
      { brand: 'New Holland', model: 'T4.100V' },
    ],
  },
  {
    slug: 'john-deere-5100m-vs-massey-ferguson-mf-4710-vs-case-ih-farmall-100a-vs-new-holland-powerstar-100',
    title: 'John Deere 5100M vs Massey Ferguson MF 4710 vs Case IH Farmall 100A vs New Holland PowerStar 100',
    description: 'Compare current source-backed specifications for four major-brand utility tractors around the 100 horsepower class.',
    machines: [
      { brand: 'John Deere', model: '5100M' },
      { brand: 'Massey Ferguson', model: 'MF 4710' },
      { brand: 'Case IH', model: 'Farmall 100A' },
      { brand: 'New Holland', model: 'PowerStar 100' },
    ],
  },
  {
    slug: 'john-deere-5120m-vs-massey-ferguson-mf-6712-vs-case-ih-farmall-115a-vs-new-holland-powerstar-120',
    title: 'John Deere 5120M vs Massey Ferguson MF 6712 vs Case IH Farmall 115A vs New Holland PowerStar 120',
    description: 'Compare current source-backed specifications for four utility and mid-range tractors around the 115 to 120 horsepower class.',
    machines: [
      { brand: 'John Deere', model: '5120M' },
      { brand: 'Massey Ferguson', model: 'MF 6712' },
      { brand: 'Case IH', model: 'Farmall 115A' },
      { brand: 'New Holland', model: 'PowerStar 120' },
    ],
  },
  {
    slug: 'john-deere-6r-155-vs-massey-ferguson-mf-7s-155-vs-case-ih-puma-155-new-vs-new-holland-all-new-t7-190',
    title: 'John Deere 6R 155 vs Massey Ferguson MF 7S.155 vs Case IH Puma 155 New vs New Holland All-New T7.190',
    description: 'Compare current source-backed specifications for four major-brand tractors in the 155 horsepower class.',
    machines: [
      { brand: 'John Deere', model: '6R 155' },
      { brand: 'Massey Ferguson', model: 'MF 7S.155' },
      { brand: 'Case IH', model: 'Puma 155 New' },
      { brand: 'New Holland', model: 'All-New T7.190' },
    ],
  },
  {
    slug: 'john-deere-6r-165-vs-massey-ferguson-mf-7s-165-vs-case-ih-puma-165-new-vs-new-holland-all-new-t7-210',
    title: 'John Deere 6R 165 vs Massey Ferguson MF 7S.165 vs Case IH Puma 165 New vs New Holland All-New T7.210',
    description: 'Compare current source-backed specifications for four major-brand tractors in the 165 horsepower class.',
    machines: [
      { brand: 'John Deere', model: '6R 165' },
      { brand: 'Massey Ferguson', model: 'MF 7S.165' },
      { brand: 'Case IH', model: 'Puma 165 New' },
      { brand: 'New Holland', model: 'All-New T7.210' },
    ],
  },
  {
    slug: 'john-deere-7r-290-vs-massey-ferguson-mf-8s-285-vs-case-ih-magnum-295',
    title: 'John Deere 7R 290 vs Massey Ferguson MF 8S.285 vs Case IH Magnum 295',
    description: 'Compare current source-backed specifications for three high-horsepower tractors around the 285 to 295 horsepower class.',
    machines: [
      { brand: 'John Deere', model: '7R 290' },
      { brand: 'Massey Ferguson', model: 'MF 8S.285' },
      { brand: 'Case IH', model: 'Magnum 295' },
    ],
  },
  {
    slug: 'john-deere-6r-165-vs-fendt-616-vario-vs-case-ih-puma-165-new-vs-new-holland-all-new-t7-210',
    title: 'John Deere 6R 165 vs Fendt 616 Vario vs Case IH Puma 165 New vs New Holland All-New T7.210',
    description: 'Compare current source-backed specifications for four major-brand tractors around the 165 to 170 horsepower class.',
    machines: [
      { brand: 'John Deere', model: '6R 165' },
      { brand: 'Fendt', model: '616 Vario' },
      { brand: 'Case IH', model: 'Puma 165 New' },
      { brand: 'New Holland', model: 'All-New T7.210' },
    ],
  },
  {
    slug: 'john-deere-7r-290-vs-fendt-930-vario-vs-massey-ferguson-mf-8s-285-vs-case-ih-magnum-295',
    title: 'John Deere 7R 290 vs Fendt 930 Vario vs Massey Ferguson MF 8S.285 vs Case IH Magnum 295',
    description: 'Compare current source-backed specifications for four high-horsepower tractors around the 285 to 296 horsepower class.',
    machines: [
      { brand: 'John Deere', model: '7R 290' },
      { brand: 'Fendt', model: '930 Vario' },
      { brand: 'Massey Ferguson', model: 'MF 8S.285' },
      { brand: 'Case IH', model: 'Magnum 295' },
    ],
  },
  {
    slug: 'john-deere-7r-350-vs-fendt-936-vario-vs-case-ih-magnum-355',
    title: 'John Deere 7R 350 vs Fendt 936 Vario vs Case IH Magnum 355',
    description: 'Compare current source-backed specifications for three high-horsepower tractors around the 350 to 355 horsepower class.',
    machines: [
      { brand: 'John Deere', model: '7R 350' },
      { brand: 'Fendt', model: '936 Vario' },
      { brand: 'Case IH', model: 'Magnum 355' },
    ],
  },
];

export function getComparisonPreset(slug: string) {
  return comparisonPresets.find((preset) => preset.slug === slug);
}
