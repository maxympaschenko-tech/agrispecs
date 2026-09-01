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
    lead: 'Compare current farm-relevant skid steer loaders from CASE, Bobcat, New Holland and Kubota without collapsing unlike manufacturer metrics. Kubota SSV65/SSV75 keep SAE J1995 gross and SAE J1349 net horsepower as separate fields plus open- and closed-cab weights; New Holland L Series keeps gross horsepower, ROC at 50% tipping load and lift type; Bobcat retains its published horsepower/ROC; CASE B Series keeps net-power, weight and geometry tied to its source table.',
  },
  'compact-track-loader': {
    title: 'Compact Track Loader Specs, Horsepower, ROC and Weight',
    description: 'Browse source-backed compact track loader specifications including horsepower, rated operating capacity, operating weight, lift geometry, hydraulic flow, electric-system data and current North America model configurations.',
    lead: 'Compare current CASE, Bobcat, New Holland and Kubota compact track loaders using manufacturer-backed North America specifications. Kubota SVL generations remain separate current models and use the 2026 construction catalog or direct model sheet as their primary value set; documented conflicts between Kubota publications stay in the version notes instead of being averaged. New Holland C Series keeps gross horsepower and ROC from its current catalog, while Bobcat’s all-electric T7X keeps ISO ROC, battery capacity and voltage separate from diesel loaders.',
  },
  'compact-wheel-loader': {
    title: 'Compact Wheel Loader Specs, Horsepower, ROC and Weight',
    description: 'Browse source-backed compact wheel loader specifications including horsepower or battery capacity, operating weight, rated operating capacity, hinge-pin height, hydraulics, travel speed and current North America model data.',
    lead: 'Compare current compact wheel loaders from CASE, Bobcat and New Holland by powertrain, published power, operating weight and loader geometry. New Holland W Series keeps family-card horsepower, weight, cab height and hinge-pin height attached to each exact Z-Bar, Long Reach or High Speed configuration; electric CASE models retain battery capacity, while Bobcat model-page ROC and hydraulic values stay tied to their own sources.',
  },
  'wheel-loader': {
    title: 'Wheel Loader Specs, Horsepower, ROC and Tipping Load',
    description: 'Browse source-backed manufacturer-defined wheel loader specifications including gross horsepower, canopy and cab operating weights, bucket breakout force, tipping loads, rated operating capacity, hydraulics and articulation.',
    lead: 'Browse Kubota R Series machines in the manufacturer-defined Wheel Loader category rather than forcing them into compact or large wheel-loader buckets. R430, R540 and R640 keep 2026 U.S. catalog canopy/cab weights, tipping loads and rated operating capacities as separate configuration fields, with gross SAE J1995 horsepower, bucket breakout force, articulation and hydraulic flow tied to the same factory source.',
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
    description: 'Browse source-backed rough terrain forklift specifications including horsepower, lift capacity, mast height, side shift, drivetrain, travel speed and operating weight for current farm-relevant models.',
    lead: 'Compare current CASE H Series and New Holland F50C rough terrain forklifts using manufacturer-backed North America specifications. CASE 586H/588H retain their family-level mast and travel data, while the New Holland F50C keeps its 5,000 lb lift rating, 12 ft mast, 4WD driveline and 24.1 mph travel data tied to its direct product page; published greater-than ground-clearance wording remains text rather than a false exact value.',
  },
  'tractor-loader': {
    title: 'Tractor Loader Specs, Lift Capacity, Hitch and Horsepower',
    description: 'Browse source-backed tractor loader specifications including gross horsepower, operating weight, bucket lift capacity, breakout force, three-point hitch capacity, PTO and transmission data.',
    lead: 'Review the current New Holland U80D as the manufacturer-defined Tractor Loader it is, rather than forcing it into the agricultural tractor catalog. Direct North America product data keeps its 74 gross hp, loader lift ratings, three-point hitch capacities, optional 540-rpm PTO and power-shuttle transmission together in the correct equipment category.',
  },
  'loader-backhoe': {
    title: 'Loader Backhoe Specs, Lift Capacity, Reach and Horsepower',
    description: 'Browse source-backed loader backhoe specifications including horsepower, operating weight, loader lift capacity, maximum backhoe reach, transmission options and hydraulic performance.',
    lead: 'Compare current New Holland D Series loader backhoes including B75D, B95D, B95D Tool Carrier, B95D Long Reach and B110D. Horsepower, operating weight, loader lift capacity and maximum backhoe reach remain model-specific, while the shared FPT 3.4-liter engine family, transmission choices and hydraulic systems stay explicitly labeled as D Series family specifications.',
  },
  'utility-vehicle': {
    title: 'Utility Vehicle Specs, Cargo Capacity, Towing and Speed',
    description: 'Browse source-backed farm utility vehicle specifications including horsepower, cargo-bed load, towing capacity, drive system, transmission, maximum speed, fuel capacity and overall dimensions.',
    lead: 'Compare current Kubota utility vehicles using U.S. manufacturer data for RTV520, RTV-XG850 Sidekick and RTV-X. Gas and diesel drivetrains remain distinct, cargo-bed and towing ratings stay model-specific, and published discrepancies are preserved in source notes instead of being silently reconciled. Sidekick keeps its California cargo-bed limit separate, while RTV-X uses the live Kubota series-table values attached to that exact source version.',
  },
  'mini-excavator': {
    title: 'Mini Excavator Specs, Horsepower, Battery, Weight and Dig Depth',
    description: 'Browse source-backed mini excavator specifications from current North America catalogs including horsepower or battery capacity, operating-weight configurations, maximum dig depth, dump height, hydraulics, diesel or electric powertrain and arm options.',
    lead: 'Compare current CASE, Bobcat, New Holland and Kubota mini excavators without flattening unlike configurations. Kubota U and KX models keep 2026 full-line catalog values or direct model-sheet values tied to the exact current model; canopy/cab and rubber-track weight bases are shown explicitly, and extendable-arm digging depths remain configuration text. New Holland keeps Cab/Canopy and Standard/Long Arm values as published pairs, Bobcat arm variants stay separate where appropriate, and electric models retain battery capacity rather than receiving invented horsepower.',
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