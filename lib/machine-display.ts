type MachineDisplayInput = {
  brand?: string;
  model: string;
  modelSlug: string;
};

export function getMachineGenerationLabel(modelSlug: string): string | null {
  return /(^|-)previous($|-)/.test(modelSlug) ? 'Previous generation' : null;
}

export function getMachineDisplayModel(machine: MachineDisplayInput): string {
  const generation = getMachineGenerationLabel(machine.modelSlug);
  return generation ? `${machine.model} — ${generation}` : machine.model;
}

export function getMachineDisplayTitle(machine: MachineDisplayInput): string {
  const displayModel = getMachineDisplayModel(machine);
  return machine.brand ? `${machine.brand} ${displayModel}` : displayModel;
}
