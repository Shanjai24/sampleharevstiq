const axios = require('axios');

const BASE_URL = 'https://rest.isric.org/soilgrids/v2.0/properties/query';

async function getSoilData(lat, lng) {
  try {
    const response = await axios.get(BASE_URL, {
      params: {
        lon: lng,
        lat: lat,
        property: 'phh2o,clay,sand,silt,soc,bdod',
        depth: '0-5cm,5-15cm,15-30cm',
        value: 'mean'
      },
      timeout: 10000
    });

    const properties = response.data.properties?.layers || [];
    const extractValue = (propName) => {
      const layer = properties.find(p => p.name === propName);
      if (!layer) return null;
      const depths = layer.depths;
      if (!depths || depths.length === 0) return null;
      // Average across depths
      const values = depths.map(d => d.values?.mean).filter(v => v !== null && v !== undefined);
      return values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : null;
    };

    const phRaw = extractValue('phh2o');
    const clayRaw = extractValue('clay');
    const sandRaw = extractValue('sand');
    const siltRaw = extractValue('silt');
    const socRaw = extractValue('soc');

    // SoilGrids returns pH * 10, clay/sand/silt in g/kg, SOC in dg/kg
    const ph = phRaw ? phRaw / 10 : 6.5;
    const clay = clayRaw ? clayRaw / 10 : 30;
    const sand = sandRaw ? sandRaw / 10 : 40;
    const silt = siltRaw ? siltRaw / 10 : 30;
    const organicCarbon = socRaw ? socRaw / 10 : 1.5;

    // Determine soil type
    let soilType = 'loam';
    if (sand > 60) soilType = 'sandy';
    else if (clay > 40) soilType = 'clay';
    else if (silt > 50) soilType = 'silt';

    // Estimate soil depth from available data (simplified)
    const depth = clayRaw ? Math.min(200, Math.max(30, 100 + clay)) : 100;

    return {
      soilType,
      ph: Math.round(ph * 10) / 10,
      clay: Math.round(clay * 10) / 10,
      sand: Math.round(sand * 10) / 10,
      silt: Math.round(silt * 10) / 10,
      organicCarbon: Math.round(organicCarbon * 100) / 100,
      depth: Math.round(depth)
    };
  } catch (error) {
    console.error('Soil API error:', error.message);
    return {
      soilType: 'loam',
      ph: 6.5,
      clay: 30,
      sand: 40,
      silt: 30,
      organicCarbon: 1.5,
      depth: 100
    };
  }
}

module.exports = { getSoilData };
