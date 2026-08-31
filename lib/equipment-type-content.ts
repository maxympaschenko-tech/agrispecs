export type EquipmentTypeContent = {
  title: string;
  description: string;
  lead: string;
};

const content: Record<string, EquipmentTypeContent> = {
  combine: {
    title: 'Combine Harvester Specs by Brand and Model',
    description: 'Browse source-backed combine harvester specifications including engine power, grain tank capacity, unloading rate, feeder, threshing, separating and cleaning data.',
    lead: 'Compare published combine harvester specifications from major manufacturers. Model pages keep engine power, grain handling, feeder, threshing, separating, cleaning and market-specific configuration data tied to the original source record.',
  },
  sprayer: {
    title: 'Self-Propelled Sprayer Specs by Brand and Model',
    description: 'Browse source-backed self-propelled sprayer specifications including engine power, solution tank capacity, rinse tank, boom width, crop clearance and application-system data.',
    lead: 'Compare published self-propelled sprayer specifications from major manufacturers. Model pages keep engine power, solution and rinse tank capacity, boom configuration, crop clearance, travel and application-system data tied to the original market-specific source record.',
  },
  planter: {
    title: 'Planter Specs, Row Spacing and Capacity by Brand',
    description: 'Browse source-backed planter specifications including row count, row spacing, frame type, working width, seed capacity, fertilizer capacity and transport dimensions by model and configuration.',
    lead: 'Compare current planter configurations by manufacturer, row count and row spacing. Model pages keep frame type, working width, seed and fertilizer capacity, transport dimensions, row-unit details and tractor-power requirements tied to the exact published configuration instead of collapsing unlike planters into one record.',
  },
  'round-baler': {
    title: 'Round Baler Specs, Bale Size and PTO Requirements',
    description: 'Browse source-backed round baler specifications including bale width, bale diameter, bale size, feeding and wrapping systems, configuration options and PTO power requirements.',
    lead: 'Compare current round balers by bale size, bale width and diameter, feeding system, wrapping system and tractor PTO requirement. Configuration-dependent power requirements stay attached to the exact manufacturer model instead of being reduced to one misleading number.',
  },
  'small-square-baler': {
    title: 'Small Square Baler Specs, Bale Size and PTO Power',
    description: 'Browse source-backed small square baler specifications including bale cross section, bale length, pickup width, feeding system, tying system, plunger speed and PTO power requirements.',
    lead: 'Compare current small square balers from major hay-equipment manufacturers. Model pages keep bale dimensions, pickup and feeding details, tying system, plunger data and tractor PTO requirements tied to the current manufacturer source and market configuration.',
  },
  'large-square-baler': {
    title: 'Large Square Baler Specs, Bale Size and PTO Power',
    description: 'Browse source-backed large square baler specifications including bale width, bale height, maximum bale length, plunger speed, feeding configuration, tying system and PTO power requirements.',
    lead: 'Compare current conventional and high-density large square balers by bale dimensions, crop-processing configuration, plunger data, tying system and tractor PTO requirements. CropCutter and high-density variants remain separate records when the manufacturer publishes them as distinct configurations.',
  },
  'self-propelled-forage-harvester': {
    title: 'Self-Propelled Forage Harvester Specs by Model',
    description: 'Browse source-backed self-propelled forage harvester specifications including engine power, fuel capacity, header compatibility, kernel processor options, harvest automation and current US configuration data.',
    lead: 'Compare current self-propelled forage harvesters using manufacturer-backed engine, capacity, header, kernel-processing and automation data. Where a manufacturer publishes different power metrics on a family table and an individual product page, those metrics remain separately labeled instead of being silently merged.',
  },
  'cotton-harvester': {
    title: 'Cotton Harvester Specs: Pickers and Strippers',
    description: 'Browse source-backed cotton harvester specifications including picker or stripper configuration, engine power, row spacing, header options, accumulator capacity, round module size and fuel capacity.',
    lead: 'Compare cotton pickers and cotton strippers using exact US model-year data. Picker row units and stripper heads remain separately described, while engine power, fuel and DEF capacity, cotton accumulator, round module builder and wrap capacity stay tied to the manufacturer specification set for that machine.',
  },
  windrower: {
    title: 'Self-Propelled Windrower Specs and Engine Power',
    description: 'Browse source-backed self-propelled windrower specifications including engine horsepower, cylinders, fuel and DEF capacity, header drive, field and transport speed, precision technology and windrow-management features.',
    lead: 'Compare current self-propelled windrowers using manufacturer-backed engine, drive, capacity, travel-speed and header-system data. Series-wide features are published only when the manufacturer explicitly applies them to the lineup, while model-specific horsepower and engine configuration stay attached to the individual machine.',
  },
  'disc-mower-conditioner': {
    title: 'Disc Mower-Conditioner Specs, Cutting Width and PTO',
    description: 'Browse source-backed disc mower-conditioner specifications including cutting width, transport width, number of discs, cutterbar type, conditioning systems and minimum PTO power by model.',
    lead: 'Compare current side-pull and center-pivot disc mower-conditioners by cutting width, disc count, cutterbar design, conditioning options, transport width and tractor PTO requirement. Model-specific values remain separate from series-wide features, and unpublished technical-table cells are left blank instead of being inferred.',
  },
  'disc-mower': {
    title: 'Disc Mower Specs, Cutting Width and Disc Count',
    description: 'Browse source-backed disc mower specifications including cutting width, number of discs, mounted or pull-type configuration, cutterbar design, knife system and protection features by model.',
    lead: 'Compare current heavy-duty and economy disc mowers by cutting width, disc count, mounting configuration and cutterbar design. Family-level PTO ranges are not presented as individual model requirements unless the manufacturer publishes a model-specific value.',
  },
  'wheel-rake': {
    title: 'Wheel Rake Specs, Working Width and Wheel Count',
    description: 'Browse source-backed wheel rake specifications including rake wheel count, maximum working width, machine weight, flotation, single-side operation and transport configuration by model.',
    lead: 'Compare current carted wheel rakes by rake wheel count, maximum working width, machine weight, flotation and operating configuration. Standard and heavy-duty PLUS variants remain separate records when the manufacturer publishes them as distinct machines.',
  },
  'rotary-rake': {
    title: 'Rotary Rake Specs, Working Width and Rotor Size',
    description: 'Browse source-backed rotary rake specifications including working width, rotor count, rotor diameter, side or center delivery, tine system and tractor PTO requirements by model.',
    lead: 'Compare current single-, dual- and four-rotor rakes by working width, rotor diameter, crop delivery and tine configuration. Business, Trend, TWIN and North American variants stay separate whenever the manufacturer publishes them as distinct configurations.',
  },
  'rotary-tedder': {
    title: 'Rotary Tedder Specs, Working Width, Weight and Power',
    description: 'Browse source-backed rotary tedder specifications including tedding width, rotor count, rotor diameter, machine weight, transport width, drive system and minimum tractor power.',
    lead: 'Compare current rotary tedders by tedding width, rotor configuration, machine weight, transport setup and tractor-power requirement. Product-page values stay tied to the exact model, while blank manufacturer table cells remain unpublished instead of being filled from another market.',
  },
  'air-drill': {
    title: 'Air Drill Specs, Working Width and Row Spacing',
    description: 'Browse source-backed air drill specifications including toolbar or working width, row and shank spacing, opener system, transport dimensions, empty weight, operating speed and seed tank configuration.',
    lead: 'Compare current disk and hoe air drills by working width, row spacing, opener design, transport dimensions and seed-delivery configuration. Multi-width and multi-spacing machines retain the manufacturer-published configuration range instead of being collapsed into one artificial specification.',
  },
  'air-cart': {
    title: 'Air Cart Specs, Capacity, Tanks and Metering Systems',
    description: 'Browse source-backed air cart specifications including total capacity, tank configuration, metering and section control, blower and fill systems, transport dimensions, machine weight and towing configuration.',
    lead: 'Compare current commodity and air-seeding carts by capacity, tank layout, metering, section control, filling and transport configuration. New models can be listed as current when the manufacturer names them, but numerical capacities and dimensions remain unpublished until the current market source explicitly exposes those values.',
  },
  'field-cultivator': {
    title: 'Field Cultivator Specs, Working Width and Shank Spacing',
    description: 'Browse source-backed field cultivator specifications including working width, frame type, shank or tine spacing, operating depth, transport dimensions, horsepower requirements and precision tillage controls.',
    lead: 'Compare current field cultivators by working width, shank system, spacing, operating depth, transport dimensions and tractor power requirements. Configuration-specific John Deere widths remain separate records, while Case IH family ranges are kept exactly as published instead of being expanded into invented individual machines.',
  },
  'vertical-tillage': {
    title: 'Vertical Tillage Specs, Blade Size, Gang Angle and Power',
    description: 'Browse source-backed vertical tillage specifications including working width, blade diameter and spacing, gang angle, operating depth, field speed, transport dimensions, horsepower requirements and in-cab depth controls.',
    lead: 'Compare current vertical tillage tools by blade system, gang angle, working width, operating depth, speed and tractor-power requirement. Adjustable-gang machines and fixed True-Tandem tools remain distinct, while precision-control features are tied to the configurations where the manufacturer actually offers them.',
  },
  'high-speed-disk': {
    title: 'High-Speed Disk Specs, Working Depth, Speed and Power',
    description: 'Browse source-backed high-speed disk specifications including working depth, operating speed, disk spacing, working width, transport width, required horsepower, depth control and precision tillage technology.',
    lead: 'Compare current high-speed disks from Case IH and John Deere by operating depth, speed, frame configuration, power requirement and precision control. Family-wide John Deere HSD values are published only where the current comparison table explicitly applies them, while exact width, disk count and recommended horsepower stay limited to individual current product pages.',
  },
  'disk-ripper': {
    title: 'Disk Ripper Specs, Shank Spacing, Blades and Horsepower',
    description: 'Browse source-backed disk ripper specifications including working width, shank count and spacing, disk diameter and spacing, point system, seedbed conditioning and tractor horsepower requirements.',
    lead: 'Review current disk ripper specifications without collapsing width and shank combinations into invented model variants. The Ecolo-Tiger record keeps manufacturer-published width, shank, blade, conditioning and Soil Command details together as a current US configuration range.',
  },
  'combination-ripper': {
    title: 'Combination Ripper Specs, Working Depth, Speed and Power',
    description: 'Browse source-backed combination ripper specifications including maximum working depth, field speed, residue conditions, horsepower requirements, depth control and current precision technology.',
    lead: 'Review current combination ripper data using the manufacturer’s current US comparison table. Older price-book dimensions are not promoted into the current record when the live catalog no longer exposes those configuration-specific values.',
  },
  'tandem-disk': {
    title: 'Tandem Disk Specs, Working Depth, Blade Size and Power',
    description: 'Browse source-backed tandem disk specifications including working width, working depth, blade size and spacing, weight per blade, operating speed, residue conditions, horsepower requirements and depth control.',
    lead: 'Compare current Case IH True-Tandem and John Deere 2630 Series tandem disks using manufacturer-backed blade, depth, speed and power data. Configuration ranges remain ranges instead of being expanded into artificial model pages, and conflicting unit conversions are omitted when the manufacturer source itself is inconsistent.',
  },
  'strip-till': {
    title: 'Strip-Till Specs, Rows, Working Width and Row Units',
    description: 'Browse source-backed strip-till specifications including row configurations, operating width, frame style, row-unit options, berm conditioning, transport width and current precision implement controls.',
    lead: 'Compare current strip-till systems by row count, toolbar configuration, operating width, residue management and berm conditioning. The new Nutri-Tiller 1000 Series keeps ISOBUS and in-cab row-unit controls separate from the established pull-type 955 configuration, while manufacturer unit inconsistencies are not repeated as converted values.',
  },
  'in-line-ripper': {
    title: 'In-Line Ripper Specs, Shank Spacing, Depth and Power',
    description: 'Browse source-backed in-line and minimum-till ripper specifications including shank systems, spacing, maximum operating depth, field speed, residue conditions, horsepower requirements, transport data and depth control.',
    lead: 'Compare current Case IH Ecolo-Til and John Deere MT Series in-line ripping tools without inferring unpublished configuration values from model names. Manufacturer family-table specs remain tied to family source records, while model-page details such as MT9 working width, standard count and transport width retain their separate individual source provenance.',
  },
  transporter: {
    title: 'Farm Transporter Specs by Brand and Model',
    description: 'Browse source-backed agricultural transporter specifications by manufacturer and model, including engine, drivetrain, payload and loading-bed configuration.',
    lead: 'Browse agricultural transporter models with source-backed engine, drivetrain, loading-bed, capacity and current market configuration data.',
  },
};

export function getEquipmentTypeContent(type: string, typeName: string): EquipmentTypeContent {
  return content[type] || {
    title: `${typeName} Specs by Brand and Model`,
    description: `Browse source-backed ${typeName.toLowerCase()} specifications by manufacturer and model, including current market configuration and technical reference data.`,
    lead: `Browse published ${typeName.toLowerCase()} records organized by manufacturer. Model pages use source-backed specifications and keep market or configuration differences attached to the underlying version record.`,
  };
}
