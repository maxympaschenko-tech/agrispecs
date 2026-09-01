import { getEquipmentTypeContent, type EquipmentTypeContent } from '@/lib/equipment-type-content';

const overrides: Record<string, EquipmentTypeContent> = {
  'application-system': {
    title: 'Agricultural Application System Specs and Capacities',
    description: 'Browse source-backed agricultural application-system specifications including liquid tank capacity, boom width, air-boom capacity, application rate, compatible chassis and precision controls.',
    lead: 'Compare current agricultural application systems without treating mounted systems as chassis specifications. Liquid and dry systems keep tank, boom, bin, pump, rate-control and compatibility data attached to the exact manufacturer system, including published source discrepancies instead of silently choosing one conflicting value.',
  },
  'disc-mower': {
    title: 'Disc Mower Specs, Cutting Width, Weight and PTO HP',
    description: 'Browse source-backed disc mower specifications including cutting width, approximate weight, transport width, hitch category, PTO speed, minimum PTO horsepower, discs, blades, remotes and cutterbar range.',
    lead: 'Compare the current Kubota DM1017, DM1022, DM1024, DM2028, DM2032, DM3087, DM4032, DM5028, DM5032 and DM5040 using the live U.S. lineup plus current product and series specification sheets. Newer DM brochure weights remain separate from older family-sheet figures, DM1024 and DM2032 width differences are documented rather than averaged, and DM3087 keeps the live/current-product 140 hp and 3,000 lb value set while the conflicting 2026 full-line 120 hp and 3,420 lb figures remain visible in source notes.',
  },
  'disc-mower-conditioner': {
    title: 'Disc Mower Conditioner Specs, PTO HP and Conditioner Type',
    description: 'Browse source-backed disc mower conditioner specifications including current model status, minimum PTO horsepower, DMC series and SemiSwing tine, roller or steel-roller conditioner configuration.',
    lead: 'Browse the complete current Kubota USA DMC lineup across DMC6300, DMC7300, DMC8000 and DMC8500 Series. All 29 current model cards retain their live manufacturer horsepower requirement, while T, R and RS configurations remain distinct SemiSwing tine, roller and steel-roller machines instead of being collapsed into one family record. Detailed cutting widths, weights and transport dimensions are layered from family-specific publications separately so changing DMC brochure generations are not silently mixed.',
  },
  'rotary-tedder': {
    title: 'Rotary Tedder Specs, Working Width, Weight and Tractor HP',
    description: 'Browse source-backed rotary tedder specifications including working width, transport dimensions, approximate weight, theoretical field capacity, attachment type, rotor count, tine-arm count and current tractor-horsepower requirements where Kubota publishes them.',
    lead: 'Compare the current Kubota TE4052T, TE6576C, TE6583T, TE8511T, TE8590C, TE10511C, TE12513C and TE14515C across FarmLine and ProLine. Live U.S. model status is kept separate from older brochures, TerraFlow remains attached only to the current ProLine models Kubota identifies, and source conflicts are preserved: TE4052T uses the live 904 lb figure rather than silently replacing it with the 2026 catalog’s 1,014 lb, while TE6576C keeps the live 24 ft 11 in working width and treats the catalog’s 25 ft 7 in figure as working-position width instead of averaging the two.',
  },
  'rotary-rake': {
    title: 'Rotary Rake Specs, Working Width, Weight and Rotor Setup',
    description: 'Browse source-backed rotary rake specifications including working and swath width, transport dimensions, weight, hitch system, rotor diameter, tine-arm configuration, rake capacity and TerraLink ground-following data.',
    lead: 'Compare the eight current Kubota rotary rakes separately from the newer CR wheel-rake family: RA1035, RA1042T, RA1047T, RA2071T EVO, RA2072, RA2076, RA2577 and RA2584. FarmLine and ProLine gearbox families remain distinct, multi-rotor tine layouts stay model-specific, and publication conflicts are retained instead of averaged—for example RA2584 keeps the newer broad-brochure and 2026-catalog 9 ft 9 in transport width while its dedicated RA2000 sheet’s 9 ft 2 in value is preserved in the source note.',
  },
  'wheel-rake': {
    title: 'Wheel Rake Specs, Working Width, Weight and Tractor HP',
    description: 'Browse source-backed carted wheel rake specifications including minimum and maximum working width, transport dimensions, typical weight, tractor horsepower, hydraulic requirements and rake-wheel suspension.',
    lead: 'Compare the current Kubota RA108CR, RA110CR, RA210CR and RA212CR carted wheel rakes without mixing them into the rotary-rake catalog. Current Kubota model cards keep their 30, 40, 40 and 50 hp requirements, while the 2026 U.S. table supplies distinct RA100 and RA200 chassis dimensions, working-width ranges and typical weights. Independent rake-wheel suspension, adjustable drawbar height and RA200 multi-point windrow adjustment remain attached to the correct current family.',
  },
  'round-baler': {
    title: 'Round Baler Specs, Bale Size, Tractor HP and Binding',
    description: 'Browse source-backed round baler specifications including current model status, nominal bale size, minimum tractor horsepower, density system, binding system, silage capability, controls and crop-intake family.',
    lead: 'Compare the current Kubota BV4160, BV4180, BV4580, BV5160, BV5160RN, BV5200 and BV5200RN directly from the live U.S. Round Balers lineup. BV4000 and BV5000 remain separate families with their current 4x5, 4x6 and 5x6 model-card configurations and 40–75 hp requirements. Intelligent Density 3-D, PowerBind and silage capability remain manufacturer-level current features, while BV4000 Focus III/fork-feeder data and BV5000 ISOGO/drop-floor data are attached only at the family level; optional SuperCut details are not inferred onto base model cards.',
  },
  'square-baler': {
    title: 'Square Baler Specs, Bale Size, PTO and Tractor HP',
    description: 'Browse source-backed high-capacity small square baler specifications including bale cross section, tractor horsepower, PTO requirement, plunger rate, dual-chamber design, knotters, twine capacity and ISOBUS controls.',
    lead: 'Compare the current Kubota SSB2012 and SSB2014 introduced for the U.S. market in 2026. The live Kubota lineup confirms both current 100 hp model cards and the independent dual-chamber design; Kubota’s February 11, 2026 launch release keeps the models distinct at 12.25 x 18 in and 14 x 18 in bale cross sections and records 100 plunger strokes per minute, 100+ hp minimum, 120 hp recommended, a 1000-spline PTO requirement and standard full ISOBUS compatibility.',
  },
  'bale-wrapper': {
    title: 'Bale Wrapper Specs, Bale Capacity and Wrapping Features',
    description: 'Browse source-backed bale wrapper specifications including current model status, wrapper configuration, transport dimensions, machine weight, maximum bale size and weight, mounting and film-applicator features.',
    lead: 'Compare the current Kubota WR1100, WR1400 and WR1600C from the live U.S. Wrappers lineup. WR1100 retains its live 1,653 lb machine weight, 47 x 50 in maximum bale size and 2,650 lb bale rating plus mounted/static configuration; WR1400 keeps the current 8 ft 4 in narrow-transport feature; WR1600C remains the high-capacity DuoWrap model that can wrap one bale while carrying another with two film applicators. Older brochure generations are not used to fill missing live dimensions automatically.',
  },
  'pendulum-spreader': {
    title: 'Pendulum Spreader Specs, Tractor HP and Application Control',
    description: 'Browse source-backed pendulum spreader specifications including current model status, minimum tractor horsepower, SuperFlow spreading system, manual/hydraulic/electric controls, rate adjustment and corrosion-resistant construction.',
    lead: 'Compare the current Kubota VS220, VS400VITI, VS400 and VS600 directly from the live U.S. Spreaders page. Current model-card horsepower stays at 10, 20, 20 and 35 hp respectively, while SuperFlow pendulum distribution, manual/hydraulic/electric control, continuous pounds-per-acre adjustment, reinforced polyester hoppers, stainless metering discs and Duracoat protection remain family-level VS features. Hopper capacities and weights are deliberately left for a later model-specific source layer rather than copied from an older brochure.',
  },
  'tractor-loader-backhoe': {
    title: 'Tractor Loader Backhoe Specs, 4WD, PTO and Integrated Frame',
    description: 'Browse source-backed tractor loader backhoe specifications and current U.S. model status including 4WD, independent PTO, three-point-hitch capability, integrated loader/backhoe frame and visibility features.',
    lead: 'Compare the current Kubota B26, L47 and M62 as the manufacturer-defined TLB Series rather than flattening them into a generic tractor or backhoe category. The current U.S. lineup confirms all three machines and family-level standard 4WD, independent PTO, three-point-hitch capability, integrated reinforced main frame and slanted boom/hood design. Model-specific engine, loader and backhoe geometry is intentionally left for a separately verified source layer instead of copying values from a PDF that could not be screenshot-validated.',
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
    lead: 'Compare current compact wheel loaders from CASE, Bobcat and New Holland by powertrain, operating weight and loader geometry. New Holland W Series keeps family-card horsepower, weight, cab height and hinge-pin height attached to each exact Z-Bar, Long Reach or High Speed configuration; electric CASE models retain battery capacity, while Bobcat model-page ROC and hydraulic values stay tied to their own sources.',
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
    lead: 'Compare current Kubota utility vehicles using U.S. manufacturer sources for RTV520, RTV-XG850 Sidekick and the diesel RTV-X family. RTV-X Cab, RTV-X Crew and RTV-X Long Bed remain separate 2026 catalog configurations with their own published weights, dimensions and cargo ratings; Crew long/short cargo-bed capacities are preserved as a pair, and Long Bed keeps its 1,212 lb cargo rating. Gas and diesel drivetrains stay distinct, and source conflicts are documented rather than silently reconciled.',
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