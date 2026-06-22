export function calculateMiseryIndex({
  transitDisruption,
  travelTimeInflation,
  weatherSeverity,
  commuterNegativity,
  routeUnreliability,
}) {
  const weightedScore =
    transitDisruption * 0.35 +
    travelTimeInflation * 0.25 +
    weatherSeverity * 0.2 +
    commuterNegativity * 0.15 +
    routeUnreliability * 0.05;

  const score = Math.min(
    10,
    Math.max(1, Number(weightedScore.toFixed(1)))
  );

  let level = "Easy";
  let recommendation = "Your commute looks clear. Leave as planned.";

  if (score >= 9) {
    level = "Miserable";
    recommendation =
      "Consider delaying your departure by 30 minutes or working remotely.";
  } else if (score >= 7) {
    level = "Severe";
    recommendation =
      "Expect major frustration. Use the suggested alternative route.";
  } else if (score >= 5) {
    level = "Frustrating";
    recommendation =
      "Leave 15 minutes early and monitor transit alerts.";
  } else if (score >= 3) {
    level = "Mild";
    recommendation =
      "Minor disruption is expected. Leave a few minutes early.";
  }

  return {
    score,
    level,
    recommendation,
  };
}
