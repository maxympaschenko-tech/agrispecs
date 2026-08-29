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
];

export function getComparisonPreset(slug: string) {
  return comparisonPresets.find((preset) => preset.slug === slug);
}
