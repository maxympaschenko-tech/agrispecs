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
  {
    slug: 'john-deere-3025e-vs-kubota-l2502-vs-mahindra-1626-hst-vs-kioti-ck2640h',
    title: 'John Deere 3025E vs Kubota L2502 vs Mahindra 1626 HST vs KIOTI CK2640H',
    description: 'Compare current source-backed specifications for four compact tractors in the roughly 23 to 25 horsepower class. Published power labels differ by manufacturer, so each value keeps its original source definition.',
    machines: [
      { brand: 'John Deere', model: '3025E' },
      { brand: 'Kubota', model: 'L2502' },
      { brand: 'Mahindra', model: '1626 HST' },
      { brand: 'KIOTI', model: 'CK2640H' },
    ],
  },
  {
    slug: 'john-deere-3038e-vs-kubota-l3902-vs-mahindra-1635-hst-vs-kioti-ck3540h',
    title: 'John Deere 3038E vs Kubota L3902 vs Mahindra 1635 HST vs KIOTI CK3540H',
    description: 'Compare current source-backed specifications for four compact tractors around the 35 to 38 horsepower class. Power terminology remains source-specific rather than being relabeled as a single rating standard.',
    machines: [
      { brand: 'John Deere', model: '3038E' },
      { brand: 'Kubota', model: 'L3902' },
      { brand: 'Mahindra', model: '1635 HST' },
      { brand: 'KIOTI', model: 'CK3540H' },
    ],
  },
  {
    slug: 'john-deere-3039r-vs-kubota-l3902-vs-mahindra-1640-hst-vs-kioti-ck4040h',
    title: 'John Deere 3039R vs Kubota L3902 vs Mahindra 1640 HST vs KIOTI CK4040H',
    description: 'Compare current source-backed specifications for four premium and standard compact tractors around the 38 to 40 horsepower class. Engine-power labels are shown according to each official source rather than normalized into an unsupported common rating.',
    machines: [
      { brand: 'John Deere', model: '3039R' },
      { brand: 'Kubota', model: 'L3902' },
      { brand: 'Mahindra', model: '1640 HST' },
      { brand: 'KIOTI', model: 'CK4040H' },
    ],
  },
  {
    slug: 'john-deere-5055e-vs-new-holland-workmaster-55-vs-mahindra-5155-shuttle-vs-kioti-ns6010h',
    title: 'John Deere 5055E vs New Holland WORKMASTER 55 vs Mahindra 5155 Shuttle vs KIOTI NS6010H',
    description: 'Compare source-backed specifications for four utility and compact-utility tractors spanning roughly 54 to 59 published horsepower. Manufacturer power labels and test standards differ, so values retain their original source definitions.',
    machines: [
      { brand: 'John Deere', model: '5055E' },
      { brand: 'New Holland', model: 'WORKMASTER 55' },
      { brand: 'Mahindra', model: '5155 Shuttle' },
      { brand: 'KIOTI', model: 'NS6010H' },
    ],
  },
  {
    slug: 'john-deere-5065e-vs-new-holland-workmaster-65-vs-mahindra-6065-power-shuttle-vs-kioti-rx6620p',
    title: 'John Deere 5065E vs New Holland WORKMASTER 65 vs Mahindra 6065 Power Shuttle vs KIOTI RX6620P',
    description: 'Compare source-backed specifications for four utility tractors in the roughly 62 to 67 published horsepower range. Power terminology is kept manufacturer-specific rather than normalized into an unsupported common rating.',
    machines: [
      { brand: 'John Deere', model: '5065E' },
      { brand: 'New Holland', model: 'WORKMASTER 65' },
      { brand: 'Mahindra', model: '6065 Power Shuttle' },
      { brand: 'KIOTI', model: 'RX6620P' },
    ],
  },
  {
    slug: 'john-deere-5075e-vs-new-holland-workmaster-75-vs-mahindra-6075-power-shuttle-vs-kioti-rx7340p',
    title: 'John Deere 5075E vs New Holland WORKMASTER 75 vs Mahindra 6075 Power Shuttle vs KIOTI RX7340P',
    description: 'Compare source-backed specifications for four utility tractors around the 71 to 74 published horsepower class. Manufacturer engine-power labels remain source-specific, while shared PTO, hydraulic and dimensional fields can be compared directly where normalized.',
    machines: [
      { brand: 'John Deere', model: '5075E' },
      { brand: 'New Holland', model: 'WORKMASTER 75' },
      { brand: 'Mahindra', model: '6075 Power Shuttle' },
      { brand: 'KIOTI', model: 'RX7340P' },
    ],
  },
];

export function getComparisonPreset(slug: string) {
  return comparisonPresets.find((preset) => preset.slug === slug);
}
