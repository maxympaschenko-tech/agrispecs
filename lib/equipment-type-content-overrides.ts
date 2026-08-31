import { getEquipmentTypeContent, type EquipmentTypeContent } from '@/lib/equipment-type-content';

const overrides: Record<string, EquipmentTypeContent> = {
  'application-system': {
    title: 'Agricultural Application System Specs and Capacities',
    description: 'Browse source-backed agricultural application-system specifications including liquid tank capacity, boom width, air-boom capacity, application rate, compatible chassis and precision controls.',
    lead: 'Compare current agricultural application systems without treating mounted systems as chassis specifications. Liquid and dry systems keep tank, boom, bin, pump, rate-control and compatibility data attached to the exact manufacturer system, including published source discrepancies instead of silently choosing one conflicting value.',
  },
  'skid-steer-loader': {
    title: 'Skid Steer Loader Specs, Operating Weight and Lift Geometry',
    description: 'Browse source-backed skid steer loader specifications including horsepower, operating weight, rated operating capacity, lift geometry, auxiliary hydraulics and current North America configurations.',
    lead: 'Compare current farm-relevant skid steer loaders by engine power, operating weight, rated operating capacity and lift geometry. CASE B Series models remain separate current records so radial- and vertical-lift machines are not collapsed into one generic specification.',
  },
  'compact-track-loader': {
    title: 'Compact Track Loader Specs, Horsepower, ROC and Weight',
    description: 'Browse source-backed compact track loader specifications including horsepower, rated operating capacity, operating weight, lift geometry, track configuration and current North America model data.',
    lead: 'Compare current compact track loaders using manufacturer-backed North America specifications. Performance values and operating dimensions remain tied to the source that publishes them, while model-specific rated operating capacity and lift geometry stay attached to the exact machine.',
  },
  'compact-wheel-loader': {
    title: 'Compact Wheel Loader Specs, Horsepower and Operating Weight',
    description: 'Browse source-backed compact wheel loader specifications including horsepower or battery capacity, operating weight, powertrain and current North America model data.',
    lead: 'Compare current CASE compact wheel loaders by powertrain, published horsepower or battery capacity and operating weight. Electric models remain electric records with manufacturer-published battery capacity rather than receiving an invented horsepower equivalent.',
  },
  'small-articulated-loader': {
    title: 'Small Articulated Loader Specs, Weight, Power and Boom Type',
    description: 'Browse source-backed small articulated loader specifications including horsepower or battery capacity, operating weight, standard or telescopic-reach boom and current North America configurations.',
    lead: 'Compare current small articulated loaders by powertrain, operating weight and boom configuration. Telescopic-reach TR variants remain separate machines, and electric models retain battery capacity instead of being converted into unsupported horsepower figures.',
  },
  'large-wheel-loader': {
    title: 'Large Wheel Loader Specs, Horsepower and Operating Weight',
    description: 'Browse source-backed large wheel loader specifications including horsepower, operating weight and current CASE North America model data for farm and ranch material handling.',
    lead: 'Compare current CASE G Series large wheel loaders by manufacturer-published horsepower and operating weight. The family table is kept deliberately narrow: fields that are not published consistently for all eight current models remain blank until an individual current product page is sourced.',
  },
  'rough-terrain-forklift': {
    title: 'Rough Terrain Forklift Specs, Lift Capacity and Mast Range',
    description: 'Browse source-backed rough terrain forklift specifications including horsepower, lift capacity, mast range, mast tilt, side shift and road speed for current farm-relevant models.',
    lead: 'Compare current CASE H Series rough terrain forklifts by horsepower and lift capacity, with family-level mast and travel specifications kept explicitly tied to the H Series source. The 586H and 588H remain separate machines because their rated lift capacities differ materially.',
  },
  'mini-excavator': {
    title: 'Mini Excavator Specs, Horsepower, Battery and Operating Weight',
    description: 'Browse source-backed mini excavator specifications including horsepower or battery capacity, operating weight, diesel or electric powertrain and current North America model data.',
    lead: 'Compare current CASE mini excavators using the manufacturer’s North America family table. Diesel models keep published horsepower, electric CX15EV and CX25EV models keep battery capacity, and operating weights remain tied to the exact current model instead of being generalized across a size class.',
  },
};

export function getEquipmentTypePageContent(type: string, typeName: string): EquipmentTypeContent {
  return overrides[type] || getEquipmentTypeContent(type, typeName);
}
