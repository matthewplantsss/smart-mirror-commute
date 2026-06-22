import { calculateMiseryIndex } from "../scoring/miseryIndex.js";

const incidents = [
  "No major transit incidents",
  "Minor boarding delays reported",
  "Heavy traffic near downtown",
  "Transit vehicle running behind schedule",
  "Route temporarily affected by congestion",
  "Service cancellation reported",
];

const weatherConditions = [
  "Clear",
  "Cloudy",
  "Light rain",
  "Heavy rain",
  "Strong wind",
  "Low visibility",
];

const sentimentLabels = [
  "Positive",
  "Neutral",
  "Slightly negative",
  "Negative",
  "Very negative",
];

function randomInteger(minimum, maximum) {
  return Math.floor(
    Math.random() * (maximum - minimum + 1)
  ) + minimum;
}

function chooseRandom(items) {
  return items[randomInteger(0, items.length - 1)];
}

export function generateCommuteUpdate() {
  const normalTravelMinutes = 28;
  const currentTravelMinutes = randomInteger(27, 58);

  const transitDisruption = randomInteger(1, 10);
  const weatherSeverity = randomInteger(1, 10);
  const commuterNegativity = randomInteger(1, 10);
  const routeUnreliability = randomInteger(1, 10);

  const travelTimeInflation = Math.min(
    10,
    Math.max(
      1,
      ((currentTravelMinutes - normalTravelMinutes) /
        normalTravelMinutes) *
        10 +
        1
    )
  );

  const misery = calculateMiseryIndex({
    transitDisruption,
    travelTimeInflation,
    weatherSeverity,
    commuterNegativity,
    routeUnreliability,
  });

  return {
    generatedAt: new Date().toISOString(),

    route: {
      origin: "Home",
      destination: "Downtown",
      primaryRoute: "Route A",
      alternativeRoute: "Route B",
    },

    travel: {
      normalMinutes: normalTravelMinutes,
      currentMinutes: currentTravelMinutes,
      delayMinutes: Math.max(
        0,
        currentTravelMinutes - normalTravelMinutes
      ),
    },

    transit: {
      disruptionScore: transitDisruption,
      activeIncident: chooseRandom(incidents),
      delayedServices: randomInteger(0, 4),
      cancelledServices:
        transitDisruption >= 8 ? randomInteger(1, 2) : 0,
    },

    weather: {
      severityScore: weatherSeverity,
      condition: chooseRandom(weatherConditions),
      temperatureFahrenheit: randomInteger(41, 72),
      alertActive: weatherSeverity >= 8,
    },

    sentiment: {
      negativityScore: commuterNegativity,
      label: sentimentLabels[
        Math.min(
          sentimentLabels.length - 1,
          Math.floor((commuterNegativity - 1) / 2)
        )
      ],
      postsAnalyzed: randomInteger(18, 95),
    },

    reliability: {
      score: routeUnreliability,
    },

    miseryIndex: misery,
  };
}
