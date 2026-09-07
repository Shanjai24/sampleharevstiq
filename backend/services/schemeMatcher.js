const fs = require('fs');
const path = require('path');

let schemesData = [];
try {
  const jsonPath = path.join(__dirname, '../../ml/data/knowledge/government_schemes.json');
  if (fs.existsSync(jsonPath)) {
    schemesData = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  }
} catch (e) {
  console.error('Error loading government_schemes.json:', e.message);
}

/**
 * Match farmer profile against government scheme criteria.
 * @param {Object} profile - { state, areaAcres, crop }
 */
function matchSchemes(profile = {}) {
  const { state = 'Tamil Nadu', areaAcres = 1.0, crop = 'rice' } = profile;
  const cropLower = crop.toLowerCase();

  const matched = [];

  schemesData.forEach(scheme => {
    let eligible = true;
    let explanation = scheme.description || '';
    let estimatedBenefit = '';

    const schemeTitle = scheme.scheme || scheme.name || scheme.title || 'Government Agricultural Scheme';
    const name = schemeTitle.toLowerCase();
    const desc = (scheme.eligibility || scheme.description || '').toLowerCase();

    let applyUrl = 'https://pmkisan.gov.in';
    let category = 'Subsidy / Direct Benefit';

    // Scheme specific rule matching
    if (name.includes('pm-kisan') || name.includes('kisan samman')) {
      category = 'Direct Income Support';
      applyUrl = 'https://pmkisan.gov.in';
      if (areaAcres <= 5.0) {
        eligible = true;
        estimatedBenefit = '₹6,000 / year (in 3 equal installments of ₹2,000 directly to bank account)';
      } else {
        eligible = true;
        estimatedBenefit = '₹6,000 / year direct benefit transfer';
      }
    } else if (name.includes('pmfby') || name.includes('crop insurance') || name.includes('fasal bima')) {
      category = 'Crop Insurance';
      applyUrl = 'https://pmfby.gov.in';
      const isKharif = ['rice', 'cotton', 'maize', 'soybean', 'groundnut', 'turmeric'].includes(cropLower);
      const isRabi = ['wheat', 'mustard', 'chickpea'].includes(cropLower);
      const ratePct = isKharif ? 2.0 : isRabi ? 1.5 : 5.0; // commercial/horticulture 5%
      
      const estimatedCropValue = Math.round(areaAcres * 35000);
      const estimatedPremium = Math.round(estimatedCropValue * (ratePct / 100));

      eligible = true;
      estimatedBenefit = `Coverage up to ₹${estimatedCropValue.toLocaleString()} with low subsidized premium ~₹${estimatedPremium.toLocaleString()} (${ratePct}%)`;
    } else if (name.includes('kisan credit') || name.includes('kcc')) {
      category = 'Subsidized Credit';
      applyUrl = 'https://myscheme.gov.in/schemes/kcc';
      const loanEstimate = Math.round(areaAcres * 22000);
      eligible = true;
      estimatedBenefit = `Subsidized working capital loan up to ₹${loanEstimate.toLocaleString()} at 4% effective interest rate (with prompt repayment discount)`;
    } else if (name.includes('drip') || name.includes('pmksy') || name.includes('irrigation') || name.includes('sinchayee')) {
      category = 'Irrigation Infrastructure Subsidy';
      applyUrl = 'https://pmksy.gov.in';
      const subsidyPct = areaAcres <= 5.0 ? '55% subsidy' : '45% subsidy';
      const approxCost = Math.round(areaAcres * 45000);
      const approxSubsidy = Math.round(approxCost * (areaAcres <= 5.0 ? 0.55 : 0.45));
      eligible = true;
      estimatedBenefit = `${subsidyPct} (~₹${approxSubsidy.toLocaleString()} subsidy on total system cost ₹${approxCost.toLocaleString()})`;
    } else if (name.includes('soil health')) {
      category = 'Soil Diagnostics';
      applyUrl = 'https://soilhealth.dac.gov.in';
      eligible = true;
      estimatedBenefit = '100% Free Soil Testing & Nutrient Card (12 vital parameters tested)';
    } else if (name.includes('enam') || name.includes('e-nam')) {
      category = 'Digital Market Linkage';
      applyUrl = 'https://enam.gov.in';
      eligible = true;
      estimatedBenefit = 'Pan-India direct auction access to transparent online buyer bidding';
    } else {
      eligible = true;
      estimatedBenefit = scheme.benefit || 'Financial subsidy & credit support';
    }

    if (eligible) {
      matched.push({
        id: scheme.id || name.replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
        title: schemeTitle,
        category: scheme.category || category,
        description: scheme.eligibility || scheme.description || '',
        howToApply: scheme.howToApply || '',
        coverage: scheme.coverage || '',
        estimatedBenefit,
        applyUrl: scheme.applyUrl || applyUrl,
        documentsRequired: scheme.documents || ['Aadhaar Card', 'Land Record (Chitta/Patta)', 'Bank Passbook']
      });
    }
  });

  return matched;
}

module.exports = { matchSchemes };
