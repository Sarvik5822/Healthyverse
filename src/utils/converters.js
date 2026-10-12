const kgToLbs = (kg) => Number((kg * 2.20462).toFixed(1));
const lbsToKg = (lbs) => Number((lbs / 2.20462).toFixed(1));
const cmToInches = (cm) => Number((cm / 2.54).toFixed(1));
const inchesToCm = (inches) => Number((inches * 2.54).toFixed(1));
const cmToFeet = (cm) => Number((cm / 30.48).toFixed(2));
const feetToCm = (feet) => Number((feet * 30.48).toFixed(1));
const litersToOunces = (liters) => Number((liters * 33.814).toFixed(1));
const ouncesToLiters = (ounces) => Number((ounces / 33.814).toFixed(2));

const convertWeight = (value, fromUnit, toUnit) => {
  if (fromUnit === toUnit) return value;
  if (fromUnit === 'kg' && toUnit === 'lbs') return kgToLbs(value);
  if (fromUnit === 'lbs' && toUnit === 'kg') return lbsToKg(value);
  return value;
};

const convertHeight = (value, fromUnit, toUnit) => {
  if (fromUnit === toUnit) return value;
  // Support both 'inches' and 'ft' (feet) as unit names
  if (fromUnit === 'cm' && (toUnit === 'inches' || toUnit === 'in')) return cmToInches(value);
  if ((fromUnit === 'inches' || fromUnit === 'in') && toUnit === 'cm') return inchesToCm(value);
  if (fromUnit === 'cm' && toUnit === 'ft') return cmToFeet(value);
  if (fromUnit === 'ft' && toUnit === 'cm') return feetToCm(value);
  return value;
};

const convertVolume = (value, fromUnit, toUnit) => {
  if (fromUnit === toUnit) return value;
  // Support both full names and abbreviations
  const isFromLiters = fromUnit === 'liters' || fromUnit === 'L' || fromUnit === 'l';
  const isToLiters = toUnit === 'liters' || toUnit === 'L' || toUnit === 'l';
  const isFromOunces = fromUnit === 'ounces' || fromUnit === 'oz';
  const isToOunces = toUnit === 'ounces' || toUnit === 'oz';

  if (isFromLiters && isToOunces) return litersToOunces(value);
  if (isFromOunces && isToLiters) return ouncesToLiters(value);
  return value;
};

export {
  kgToLbs,
  lbsToKg,
  cmToInches,
  inchesToCm,
  cmToFeet,
  feetToCm,
  litersToOunces,
  ouncesToLiters,
  convertWeight,
  convertHeight,
  convertVolume,
};