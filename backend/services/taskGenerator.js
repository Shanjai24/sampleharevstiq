const fs = require('fs');
const path = require('path');
const { calculateFertilizerRecommendation } = require('./fertilizerService');

// Load crop database
let cropDatabase = {};
try {
  const dbPath = path.join(__dirname, '../../ml/data/crop_database.json');
  if (fs.existsSync(dbPath)) {
    cropDatabase = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
  }
} catch (err) {
  console.warn('Error reading crop_database.json:', err.message);
}

/**
 * Add days to a Date object safely
 */
function addDays(date, days) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

/**
 * Generate a sequence of real-dated agronomic tasks for a given crop and sowing date
 *
 * @param {string} cropName - e.g. 'rice', 'wheat', 'cotton', 'tomato'
 * @param {Date|string} sowingDate - The start/sowing date
 * @param {Object} options - { farmId, userId, areaAcres, soilN, soilP, soilK, phLevel }
 * @returns {Array<Object>} Generated tasks
 */
function generateCropTasks(cropName, sowingDate = new Date(), options = {}) {
  const {
    farmId = 'default-farm',
    userId = 'default-user',
    areaAcres = 1.0,
    soilN = 180,
    soilP = 20,
    soilK = 180,
    phLevel = 6.5
  } = options;

  const cropKey = (cropName || 'rice').toLowerCase().trim();
  const cropInfo = cropDatabase[cropKey] || cropDatabase['rice'] || {
    name: cropName,
    harvestDays: 120,
    waterPerDay: 6,
    tips: []
  };

  const displayName = cropInfo.name || cropName.charAt(0).toUpperCase() + cropName.slice(1);
  const harvestDays = cropInfo.harvestDays || 120;
  const sDate = new Date(sowingDate);

  // Compute agronomic fertilizer recommendation for dosages
  let fertRec;
  try {
    fertRec = calculateFertilizerRecommendation(cropKey, soilN, soilP, soilK, phLevel);
  } catch {
    fertRec = null;
  }

  // Derive basal and top-dressing dosages
  let basalDosage = 'DAP: 45 kg/acre • MOP: 25 kg/acre • Farmyard manure: 4-5 tonnes/acre';
  let topdress1Dosage = 'Urea: 25-30 kg/acre (First split at tillering/vegetative)';
  let topdress2Dosage = 'Potash: 15 kg/acre or Zinc Sulfate (0.5% spray) for panicle/flowering';

  if (fertRec && fertRec.schedule) {
    const urea = fertRec.schedule.find(s => s.fertilizer?.includes('Urea'));
    const dap = fertRec.schedule.find(s => s.fertilizer?.includes('DAP'));
    const mop = fertRec.schedule.find(s => s.fertilizer?.includes('MOP'));

    if (dap || mop) {
      basalDosage = [
        dap ? `DAP: ${dap.quantityKgPerAcre} kg/acre` : null,
        mop ? `MOP: ${mop.quantityKgPerAcre} kg/acre` : null,
        urea ? `Urea: ${Math.round(urea.quantityKgPerAcre * 0.4)} kg/acre (basal split)` : null
      ].filter(Boolean).join(' • ');
    }

    if (urea) {
      topdress1Dosage = `Urea: ${Math.round(urea.quantityKgPerAcre * 0.35)} kg/acre (vegetative top-dress)`;
      topdress2Dosage = `Urea: ${Math.round(urea.quantityKgPerAcre * 0.25)} kg/acre + Micronutrients at flowering`;
    }
  }

  // Define agronomic task roadmap
  const tasks = [];

  // 1. Sowing / Seed Bed Task (Day 0)
  tasks.push({
    farmId,
    userId,
    crop: cropKey,
    taskType: 'sowing',
    title: `Sow ${displayName} Seeds`,
    description: `Seedbed preparation, seed treatment (e.g. Trichoderma or Rhizobium), and sowing with recommended row spacing for ${displayName}.`,
    dosage: `Seed rate: approx 15-20 kg/acre for ${displayName}`,
    dueDate: addDays(sDate, 0),
    status: 'pending',
    source: 'auto_generated'
  });

  // 2. Basal Fertilizer Application (Day +1)
  tasks.push({
    farmId,
    userId,
    crop: cropKey,
    taskType: 'fertilizer_basal',
    title: `Basal Fertilizer Application`,
    description: `Incorporate full dose of Phosphorus (DAP) and Potassium (MOP) into the soil bed before or immediately after sowing for robust root development.`,
    dosage: basalDosage,
    dueDate: addDays(sDate, 1),
    status: 'pending',
    source: 'auto_generated'
  });

  // 3. Early Germination & Irrigation Check (Day +7)
  tasks.push({
    farmId,
    userId,
    crop: cropKey,
    taskType: 'irrigation_check',
    title: `First Irrigation & Germination Check`,
    description: `Inspect germination percentage and seedling uniformity. Ensure light irrigation without standing pool or soil crusting.`,
    dosage: `Target moisture: 60-70% field capacity (${cropInfo.waterPerDay || 6} mm/day requirement)`,
    dueDate: addDays(sDate, 7),
    status: 'pending',
    source: 'auto_generated'
  });

  // 4. Early Pest & Weed Scouting (Day +14)
  tasks.push({
    farmId,
    userId,
    crop: cropKey,
    taskType: 'pest_scout',
    title: `Early Growth Pest & Weed Scouting`,
    description: `Check for early stem borers, cutworms, or seedling damping-off. Hand weed or light hoeing if weed canopy is forming.`,
    dosage: `Physical inspection of 20 random plants across plot diagonals`,
    dueDate: addDays(sDate, 14),
    status: 'pending',
    source: 'auto_generated'
  });

  // 5. First Top-Dressing (Vegetative / Tillering Stage) (~Day +28)
  const dayTop1 = Math.min(Math.round(harvestDays * 0.23), 28);
  tasks.push({
    farmId,
    userId,
    crop: cropKey,
    taskType: 'fertilizer_topdress1',
    title: `First Top-Dressing (Vegetative Stage)`,
    description: `Apply first Nitrogen split dose to encourage rapid vegetative tillering and leaf canopy expansion. Broadcast on moist soil.`,
    dosage: topdress1Dosage,
    dueDate: addDays(sDate, dayTop1),
    status: 'pending',
    source: 'auto_generated'
  });

  // 6. Mid-Season Irrigation & Soil Moisture (Day +45)
  const dayIrrig2 = Math.min(Math.round(harvestDays * 0.38), 45);
  tasks.push({
    farmId,
    userId,
    crop: cropKey,
    taskType: 'irrigation_check',
    title: `Critical Growth Phase Irrigation`,
    description: `Crucial irrigation at active tillering / branch formation. Avoid water stress during this rapid cell elongation phase.`,
    dosage: `Maintain optimum root-zone water depth`,
    dueDate: addDays(sDate, dayIrrig2),
    status: 'pending',
    source: 'auto_generated'
  });

  // 7. Second Top-Dressing (Panicle / Flowering Stage) (~Day +60)
  const dayTop2 = Math.min(Math.round(harvestDays * 0.50), 60);
  tasks.push({
    farmId,
    userId,
    crop: cropKey,
    taskType: 'fertilizer_topdress2',
    title: `Second Top-Dressing & Flowering Boost`,
    description: `Apply final Nitrogen and Potash booster to ensure bold grain/fruit development and reduce flower shedding.`,
    dosage: topdress2Dosage,
    dueDate: addDays(sDate, dayTop2),
    status: 'pending',
    source: 'auto_generated'
  });

  // 8. Late Pest & Disease Inspection (Day +75)
  const dayScout2 = Math.min(Math.round(harvestDays * 0.65), 75);
  tasks.push({
    farmId,
    userId,
    crop: cropKey,
    taskType: 'pest_scout',
    title: `Late Season Pest & Fungal Scouting`,
    description: `Check panicles/pods/fruits for grain discoloration, aphids, or fungal rusts. Apply bio-pesticide if threshold exceeded.`,
    dosage: `Neem oil 3000 ppm (3-5 ml/L) or targeted organic spray if required`,
    dueDate: addDays(sDate, dayScout2),
    status: 'pending',
    source: 'auto_generated'
  });

  // 9. Pre-Harvest Water Cutoff (~15 days before harvest)
  const dayCutoff = Math.max(dayScout2 + 10, harvestDays - 15);
  tasks.push({
    farmId,
    userId,
    crop: cropKey,
    taskType: 'irrigation_check',
    title: `Pre-Harvest Field Drainage & Water Cutoff`,
    description: `Stop irrigation 10-15 days before harvest. This promotes uniform grain drying, hardens the seed coat, and eases mechanical harvesting.`,
    dosage: `Field drainage: drain excess water completely`,
    dueDate: addDays(sDate, dayCutoff),
    status: 'pending',
    source: 'auto_generated'
  });

  // 10. Harvest Window (Day harvestDays)
  tasks.push({
    farmId,
    userId,
    crop: cropKey,
    taskType: 'harvest_window',
    title: `Harvest Window — ${displayName}`,
    description: `${displayName} has reached full physiological maturity (~${harvestDays} days from sowing). Harvest on a sunny day when grain/fruit moisture is optimal.`,
    dosage: `Expected yield: ~${(cropInfo.baseYield * areaAcres).toFixed(1)} tons for ${areaAcres} acres`,
    dueDate: addDays(sDate, harvestDays),
    status: 'pending',
    source: 'auto_generated'
  });

  return tasks;
}

module.exports = {
  generateCropTasks
};
