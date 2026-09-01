import { getEquipmentTypeContent, type EquipmentTypeContent } from '@/lib/equipment-type-content';

const overrides: Record<string, EquipmentTypeContent> = {
  'application-system': {
    title: 'Agricultural Application System Specs and Capacities',
    description: 'Browse source-backed agricultural application-system specifications including liquid tank capacity, boom width, air-boom capacity, application rate, compatible chassis and precision controls.',
    lead: 'Compare current agricultural application systems without treating mounted systems as chassis specifications. Liquid and dry systems keep tank, boom, bin, pump, rate-control and compatibility data attached to the exact manufacturer system, including published source discrepancies instead of silently choosing one conflicting value.',
  },
  'skid-steer-loader': {
    title: 'Skid Steer Loader Specs, Horsepower and Rated Capacity',
    description: 'Browse source-backed skid steer loader specifications from current North America manufacturer catalogs, including horsepower, rated operating capacity, operating weight and loader configuration where published.',
    lead: 'Compare current farm-relevant skid steer loaders from CASE, Bobcat and New Holland without collapsing unlike manufacturer metrics. New Holland L Series keeps gross horsepower, operating weight, ROC at 50% tipping load and lift type exactly as published; Bobcat Classic and Pro models retain current designations and published horsepower/ROC; CASE B Series keeps net-power, weight and geometry tied to its source table.',
  },
  'compact-track-loader': {
    title: 'Compact Track Loader Specs, Horsepower, ROC and Weight',
    description: 'Browse source-backed compact track loader specifications including horsepower, rated operating capacity, operating weight, lift geometry, electric-system data and current North America model configurations.',
    lead: 'Compare current CASE, Bobcat and New Holland compact track loaders using manufacturer-backed North America specifications. New Holland C Series keeps gross horsepower, operating weight, ROC and lift type from its current construction catalog, while Bobcat’s all-electric T7X keeps ISO ROC, battery capacity and system voltage separate from diesel loaders.',
  },
  'compact-wheel-loader': {
    title: 'Compact Wheel Loader Specs, Horsepower, ROC and Weight',
    description: 'Browse source-backed compact wheel loader specifications including horsepower or battery capacity, operating weight, rated operating capacity, hinge-pin height, hydraulics, travel speed and current North America model data.',
    lead: 'Compare current compact wheel loaders from CASE, Bobcat and New Holland by powertrain, published power, operating weight and loader geometry. New Holland W Series keeps family-card horsepower, weight, cab height and hinge-pin height attached to each exact Z-Bar, Long Reach or High Speed configuration; electric CASE models retain battery capacity, while Bobcat model-page ROC and hydraulic values stay tied to their own sources.',
  },
  'mini-track-loader': {
    title: 'Mini Track Loader Specs, ROC, Weight and Electric Options',
    description: 'Browse source-backed mini track loader specifications including horsepower or battery capacity, rated operating capacity, operating weight, lift type, ground pressure, hydraulics and current North America configurations.',
    lead: 'Compare current Bobcat MT100/MT120 and New Holland C314/C314X mini track loaders using manufacturer-backed North America specifications. New Holland technical-card ROC at 50% tipping load is kept as the numeric comparison value while the different rated-operating-capacity wording in its marketing copy is preserved as a source note; the electric C314X keeps its 23.5 kWh battery capacity rather than receiving invented horsepower.',
  },
  'small-articulated-loader': {
    title: 'Small Articulated Loader Specs, Weight, Power and Boom Type',
    description: 'Browse source-backed small articulated loader specifications from current North America catalogs including horsepower or battery capacity, operating weight, overall dimensions and standard or telescopic boom configurations.',
    lead: 'Compare current CASE and New Holland small articulated loaders by powertrain, operating weight and boom configuration. Telescopic variants remain separate machines, electric SL22EV and ML22X retain manufacturer-published battery capacity without invented horsepower, and New Holland family technical-card values are not overwritten by inconsistent marketing prose on individual product pages.',
  },
  'large-wheel-loader': {
    title: 'Large Wheel Loader Specs, Horsepower and Operating Weight',
    description: 'Browse source-backed large wheel loader specifications from current North America catalogs, including horsepower, operating weight and model-specific material-handling data where published.',
    lead: 'Compare current CASE and Bobcat large wheel loaders using manufacturer-published horsepower and operating weight. Family-table fields remain deliberately narrow when a manufacturer does not expose the same detailed specification for every current model, so missing values are not filled from a neighboring machine.',
  },
  'rough-terrain-forklift': {
    title: 'Rough Terrain Forklift Specs, Lift Capacity and Mast Range',
    description: 'Browse source-backed rough terrain forklift specifications including horsepower, lift capacity, mast range, mast tilt, side shift and road speed for current farm-relevant models.',
    lead: 'Compare current CASE H Series rough terrain forklifts by horsepower and lift capacity, with family-level mast and travel specifications kept explicitly tied to the H Series source. The 586H and 588H remain separate machines because their rated lift capacities differ materially.',
  },
  'mini-excavator': {
    title: 'Mini Excavator Specs, Horsepower, Battery, Weight and Dig Depth',
    description: 'Browse source-backed mini excavator specifications from current North America catalogs including horsepower or battery capacity, operating-weight configurations, maximum dig depth, dump height, diesel or electric powertrain and arm options.',
    lead: 'Compare current CASE, Bobcat and New Holland mini excavators without flattening unlike configurations. New Holland keeps Cab/Canopy and Standard/Long Arm values as published pairs, Bobcat arm variants remain separate where the manufacturer exposes distinct configurations, and CASE family values stay tied to the exact model. Electric New Holland E15X/E25X, Bobcat E10e/E19e and CASE EV machines retain battery capacity rather than receiving invented horsepower.',
  },
  'compact-dozer-loader': {
    title: 'Compact Dozer Loader Specs, ROC, Drawbar Pull and Weight',
    description: 'Browse source-backed compact dozer loader specifications including horsepower, rated operating capacity, drawbar pull, breakout force, operating weight, dozer interface and high-flow hydraulics.',
    lead: 'Review the current CASE Minotaur DL550 using exact North America product-page data. Published greater-than values for breakout force and drawbar pull remain inequalities rather than being converted into false exact numbers, while the integrated C-frame and rated operating capacity stay attached to this specific machine.',
  },
};

export function getEquipmentTypePageContent(type: string, typeName: string): EquipmentTypeContent {
  return overrides[type] || getEquipmentTypeContent(type, typeName);
}
