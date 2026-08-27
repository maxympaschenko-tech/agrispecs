export type Machine = {
  id: string;
  category: 'tractor';
  brand: string;
  brandSlug: string;
  model: string;
  modelSlug: string;
  title: string;
  dataStatus: 'seed' | 'partial' | 'verified' | 'review';
};

export const machines: Machine[] = [
  {
    id: 'john-deere-5075e',
    category: 'tractor',
    brand: 'John Deere',
    brandSlug: 'john-deere',
    model: '5075E',
    modelSlug: '5075e',
    title: 'John Deere 5075E',
    dataStatus: 'seed',
  },
  {
    id: 'kubota-m7060',
    category: 'tractor',
    brand: 'Kubota',
    brandSlug: 'kubota',
    model: 'M7060',
    modelSlug: 'm7060',
    title: 'Kubota M7060',
    dataStatus: 'seed',
  },
  {
    id: 'case-ih-farmall-75a',
    category: 'tractor',
    brand: 'Case IH',
    brandSlug: 'case-ih',
    model: 'Farmall 75A',
    modelSlug: 'farmall-75a',
    title: 'Case IH Farmall 75A',
    dataStatus: 'seed',
  },
  {
    id: 'new-holland-workmaster-75',
    category: 'tractor',
    brand: 'New Holland',
    brandSlug: 'new-holland',
    model: 'Workmaster 75',
    modelSlug: 'workmaster-75',
    title: 'New Holland Workmaster 75',
    dataStatus: 'seed',
  },
  {
    id: 'massey-ferguson-4707',
    category: 'tractor',
    brand: 'Massey Ferguson',
    brandSlug: 'massey-ferguson',
    model: '4707',
    modelSlug: '4707',
    title: 'Massey Ferguson 4707',
    dataStatus: 'seed',
  },
];

export function getMachine(brandSlug: string, modelSlug: string) {
  return machines.find(
    (machine) =>
      machine.brandSlug === brandSlug && machine.modelSlug === modelSlug,
  );
}

export function getBrands() {
  return Array.from(
    new Map(machines.map((machine) => [machine.brandSlug, machine.brand])).entries(),
  ).map(([slug, name]) => ({ slug, name }));
}
