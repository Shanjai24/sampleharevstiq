// Regional & Government Soil Database Seed for AgroPredict
// Provides baseline N, P, K (kg/ha), pH, and soil composition for Indian states & districts

const REGIONAL_SOIL_DB = {
  'tamil nadu': { N: 180, P: 22, K: 190, ph: 6.8, soilType: 'loam', confidence: 75, source: 'Government Soil Health Card Scheme (TN)' },
  'punjab': { N: 240, P: 30, K: 210, ph: 7.4, soilType: 'alluvial', confidence: 75, source: 'Government Soil Health Card Scheme (PB)' },
  'haryana': { N: 220, P: 28, K: 200, ph: 7.6, soilType: 'alluvial', confidence: 75, source: 'Government Soil Health Card Scheme (HR)' },
  'uttar pradesh': { N: 210, P: 25, K: 180, ph: 7.2, soilType: 'loam', confidence: 75, source: 'Government Soil Health Card Scheme (UP)' },
  'maharashtra': { N: 160, P: 18, K: 220, ph: 6.9, soilType: 'black soil', confidence: 75, source: 'Government Soil Health Card Scheme (MH)' },
  'karnataka': { N: 175, P: 20, K: 185, ph: 6.5, soilType: 'red loam', confidence: 75, source: 'Government Soil Health Card Scheme (KA)' },
  'andhra pradesh': { N: 190, P: 24, K: 195, ph: 7.0, soilType: 'coastal clay', confidence: 75, source: 'Government Soil Health Card Scheme (AP)' },
  'telangana': { N: 185, P: 22, K: 190, ph: 6.8, soilType: 'red soil', confidence: 75, source: 'Government Soil Health Card Scheme (TS)' },
  'west bengal': { N: 200, P: 26, K: 175, ph: 6.2, soilType: 'alluvial', confidence: 75, source: 'Government Soil Health Card Scheme (WB)' },
  'gujarat': { N: 170, P: 21, K: 205, ph: 7.5, soilType: 'sandy loam', confidence: 75, source: 'Government Soil Health Card Scheme (GJ)' },
  'madhya pradesh': { N: 165, P: 19, K: 195, ph: 7.1, soilType: 'black soil', confidence: 75, source: 'Government Soil Health Card Scheme (MP)' },
  'rajasthan': { N: 140, P: 15, K: 160, ph: 8.0, soilType: 'sandy', confidence: 75, source: 'Government Soil Health Card Scheme (RJ)' },
  'bihar': { N: 195, P: 24, K: 170, ph: 6.7, soilType: 'alluvial', confidence: 75, source: 'Government Soil Health Card Scheme (BR)' },
  'kerala': { N: 190, P: 20, K: 160, ph: 5.5, soilType: 'laterite', confidence: 75, source: 'Government Soil Health Card Scheme (KL)' }
};

const DEFAULT_REGIONAL_SOIL = {
  N: 180, P: 20, K: 180, ph: 6.5, soilType: 'loam', confidence: 60, source: 'National Regional Aggregated Average (ICAR)'
};

/**
 * Returns regional average NPK, pH, and soil type by state name
 */
function getRegionalSoilData(stateName) {
  if (!stateName) return DEFAULT_REGIONAL_SOIL;
  const key = stateName.toLowerCase().trim();
  return REGIONAL_SOIL_DB[key] || DEFAULT_REGIONAL_SOIL;
}

module.exports = {
  getRegionalSoilData,
  REGIONAL_SOIL_DB,
  DEFAULT_REGIONAL_SOIL
};
