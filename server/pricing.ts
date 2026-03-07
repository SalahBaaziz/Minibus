// Extract time period from time string like "Morning (08:00–12:00)"
function extractTimePeriod(timeString: string): string {
  if (!timeString) return "Afternoon"; // default
  const match = timeString.match(/^([A-Za-z\s]+?)\s*\(/);
  return match ? match[1].trim() : "Afternoon";
}

// Convert passenger range to a number (use max of range)
function passengersToNumber(passengerRange: string): number {
  if (!passengerRange || passengerRange === "Not sure yet") return 8; // default to midpoint
  
  const match = passengerRange.match(/^(\d+)–(\d+)/);
  if (match) {
    return parseInt(match[2]); // return upper bound
  }
  return 8;
}

// Get time premium multiplier
function getTimePremium(timePeriod: string): number {
  const premiums: { [key: string]: number } = {
    "Morning": 1.0,
    "Afternoon": 1.0,
    "Early Morning": 1.1,
    "Evening": 1.2,
    "Late Night": 1.3,
    "Overnight": 1.5,
  };
  return premiums[timePeriod] || 1.0;
}

// Get journey type premium multiplier
function getJourneyTypePremium(journeyType: string): number {
  const premiums: { [key: string]: number } = {
    "Corporate": 1.0,
    "School Trip": 1.0,
    "Other": 1.0,
    "Airport Transfer": 1.1,
    "Wedding": 1.2,
    "Night Out": 1.3,
  };
  return premiums[journeyType] || 1.0;
}

// Calculate price estimate
export function calculatePrice(
  distanceMiles: number,
  passengers: string,
  timeString: string,
  journeyType: string
): { fairPrice: number; minimumCharge: number; finalPrice: number } | null {
  if (!distanceMiles || distanceMiles <= 0) return null;

  const people = passengersToNumber(passengers);
  const timePeriod = extractTimePeriod(timeString);
  const timePremium = getTimePremium(timePeriod);
  const journeyPremium = getJourneyTypePremium(journeyType);

  // Fair Price = (People / 16) × Miles × £5 × Time Premium × Journey Type Premium
  const fairPrice = (people / 16) * distanceMiles * 5 * timePremium * journeyPremium;

  // Minimum Charge = Miles × £3.333...
  const minimumCharge = distanceMiles * (10 / 3);

  // Final Price = MAX(Fair Price, Minimum Charge)
  const finalPrice = Math.max(fairPrice, minimumCharge);

  return {
    fairPrice: Math.round(finalPrice * 100) / 100,
    minimumCharge: Math.round(minimumCharge * 100) / 100,
    finalPrice: Math.round(finalPrice * 100) / 100,
  };
}
