// Rule-based Fertilizer Schedule & NPK Deficit Calculator for AgroPredict

// Ideal NPK requirements (kg/acre) per crop type
const CROP_NPK_TARGETS = {
  rice: { N: 50, P: 25, K: 25, name: 'Rice / Paddy' },
  wheat: { N: 48, P: 24, K: 20, name: 'Wheat' },
  maize: { N: 55, P: 28, K: 22, name: 'Maize' },
  cotton: { N: 45, P: 22, K: 22, name: 'Cotton' },
  groundnut: { N: 15, P: 30, K: 20, name: 'Groundnut' },
  sugarcane: { N: 100, P: 40, K: 50, name: 'Sugarcane' },
  soybean: { N: 12, P: 32, K: 16, name: 'Soybean' },
  tomato: { N: 60, P: 30, K: 40, name: 'Tomato' },
  onion: { N: 40, P: 20, K: 30, name: 'Onion' },
  turmeric: { N: 35, P: 25, K: 45, name: 'Turmeric' },
  chickpea: { N: 10, P: 25, K: 15, name: 'Chickpea' },
  mustard: { N: 35, P: 20, K: 15, name: 'Mustard' },
  banana: { N: 80, P: 30, K: 100, name: 'Banana' },
  millet: { N: 30, P: 15, K: 15, name: 'Millet' },
  chilli: { N: 50, P: 25, K: 35, name: 'Chilli' }
};

const DEFAULT_TARGET = { N: 40, P: 20, K: 20 };

/**
 * Calculates fertilizer recommendation in kg/acre based on soil NPK vs crop targets
 * N -> Urea (46% N)
 * P -> DAP (18% N, 46% P)
 * K -> MOP (60% K)
 */
function calculateFertilizerRecommendation(cropName, soilN, soilP, soilK, phLevel = 6.5) {
  const cropKey = (cropName || '').toLowerCase().trim();
  const target = CROP_NPK_TARGETS[cropKey] || DEFAULT_TARGET;

  // Convert soil NPK (kg/ha) to per-acre available approximation (~divide by 2.47)
  const availN = Math.max(0, (soilN || 180) / 2.5);
  const availP = Math.max(0, (soilP || 20) / 2.5);
  const availK = Math.max(0, (soilK || 180) / 2.5);

  const deficitN = Math.max(0, target.N - availN * 0.3); // 30% available absorption
  const deficitP = Math.max(0, target.P - availP * 0.4);
  const deficitK = Math.max(0, target.K - availK * 0.4);

  // Calculate commercial fertilizer requirements (kg/acre)
  const dapKg = Math.round((deficitP / 0.46) * 1.0);
  const nFromDap = dapKg * 0.18;
  const remN = Math.max(0, deficitN - nFromDap);
  const ureaKg = Math.round(remN / 0.46);
  const mopKg = Math.round(deficitK / 0.60);

  const recommendations = [];

  if (ureaKg > 0) {
    recommendations.push({
      fertilizer: 'Urea (46% N)',
      quantityKgPerAcre: ureaKg,
      timing: 'Apply in 2 split doses: 50% at basal, 50% at vegetative stage.',
      targetDeficit: 'Nitrogen (Leaf & Growth)'
    });
  }

  if (dapKg > 0) {
    recommendations.push({
      fertilizer: 'DAP (Di-Ammonium Phosphate 18:46:0)',
      quantityKgPerAcre: dapKg,
      timing: 'Apply full dose at sowing/planting time as basal application.',
      targetDeficit: 'Phosphorus (Root Development)'
    });
  }

  if (mopKg > 0) {
    recommendations.push({
      fertilizer: 'MOP (Muriate of Potash 60% K)',
      quantityKgPerAcre: mopKg,
      timing: 'Apply at basal stage along with organic compost.',
      targetDeficit: 'Potassium (Disease Resistance & Grain Size)'
    });
  }

  // pH Correction advice
  let phCorrection = null;
  if (phLevel < 6.0) {
    phCorrection = 'Soil is acidic (pH < 6.0). Apply 100-150 kg/acre Agricultural Lime (Calcium Carbonate) before planting.';
  } else if (phLevel > 7.8) {
    phCorrection = 'Soil is alkaline (pH > 7.8). Apply 50-75 kg/acre Gypsum or Gypsum + Organic Compost to normalize pH.';
  }

  return {
    crop: cropName,
    cropTargetNPK: target,
    estimatedDeficit: {
      N: Math.round(deficitN),
      P: Math.round(deficitP),
      K: Math.round(deficitK)
    },
    schedule: recommendations,
    phCorrection
  };
}

module.exports = {
  calculateFertilizerRecommendation,
  CROP_NPK_TARGETS
};
