const DEG_TO_RAD = Math.PI / 180;
export const TRIM_TOLERANCE = 1e-6;

function assertFiniteNumber(value, name) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new TypeError(`${name} must be a finite number`);
  }
}

export function degreesToRadians(degrees) {
  assertFiniteNumber(degrees, "degrees");
  return degrees * DEG_TO_RAD;
}

export function calculateCm(cm0, cmAlphaPerRad, angleOfAttackDeg) {
  // Inputs: cm0 dimensionless, cmAlphaPerRad 1/rad, angleOfAttackDeg deg.
  // Output: Cm(alpha), dimensionless. Positive signs are nose-up.
  assertFiniteNumber(cm0, "cm0");
  assertFiniteNumber(cmAlphaPerRad, "cmAlphaPerRad");
  assertFiniteNumber(angleOfAttackDeg, "angleOfAttackDeg");

  const alphaRad = degreesToRadians(angleOfAttackDeg);
  return cm0 + cmAlphaPerRad * alphaRad;
}

export function calculateTrimAngleRad(cm0, cmAlphaPerRad) {
  // Inputs: cm0 dimensionless, cmAlphaPerRad 1/rad.
  // Output: trim angle in radians, or null when Cm_alpha is zero.
  assertFiniteNumber(cm0, "cm0");
  assertFiniteNumber(cmAlphaPerRad, "cmAlphaPerRad");

  if (cmAlphaPerRad === 0) {
    return null;
  }

  return -cm0 / cmAlphaPerRad;
}

export function calculateTrimAngleDeg(cm0, cmAlphaPerRad) {
  // Output: trim angle in degrees, or null when no unique trim exists.
  const trimRad = calculateTrimAngleRad(cm0, cmAlphaPerRad);
  return trimRad === null ? null : trimRad / DEG_TO_RAD;
}

export function calculateDeltaCm(cmAlphaPerRad, disturbanceAlphaDeg) {
  // Inputs: cmAlphaPerRad 1/rad, disturbanceAlphaDeg deg.
  // Output: delta_Cm, dimensionless. Positive moment is nose-up.
  assertFiniteNumber(cmAlphaPerRad, "cmAlphaPerRad");
  assertFiniteNumber(disturbanceAlphaDeg, "disturbanceAlphaDeg");

  const disturbanceRad = degreesToRadians(disturbanceAlphaDeg);
  return cmAlphaPerRad * disturbanceRad;
}

export function classifyDisturbance(cmAlphaPerRad, disturbanceAlphaDeg) {
  // Classification uses the sign of delta_alpha_rad * delta_Cm.
  assertFiniteNumber(cmAlphaPerRad, "cmAlphaPerRad");
  assertFiniteNumber(disturbanceAlphaDeg, "disturbanceAlphaDeg");

  const disturbanceRad = degreesToRadians(disturbanceAlphaDeg);
  const deltaCm = calculateDeltaCm(cmAlphaPerRad, disturbanceAlphaDeg);
  const product = disturbanceRad * deltaCm;

  if (product < 0) {
    return "restoring";
  }

  if (product > 0) {
    return "destabilizing";
  }

  return "neutral";
}

export function isTrimmed(cm) {
  // Trim criterion: abs(Cm(alpha)) <= 1e-6.
  assertFiniteNumber(cm, "cm");
  return Math.abs(cm) <= TRIM_TOLERANCE;
}

export function calculateTrimResponse({
  cm0,
  cmAlphaPerRad,
  angleOfAttackDeg,
  disturbanceAlphaDeg
}) {
  assertFiniteNumber(cm0, "cm0");
  assertFiniteNumber(cmAlphaPerRad, "cmAlphaPerRad");
  assertFiniteNumber(angleOfAttackDeg, "angleOfAttackDeg");
  assertFiniteNumber(disturbanceAlphaDeg, "disturbanceAlphaDeg");

  const alphaRad = degreesToRadians(angleOfAttackDeg);
  const disturbanceAlphaRad = degreesToRadians(disturbanceAlphaDeg);
  const cm = calculateCm(cm0, cmAlphaPerRad, angleOfAttackDeg);
  const trimAngleRad = calculateTrimAngleRad(cm0, cmAlphaPerRad);
  const trimAngleDeg =
    trimAngleRad === null ? null : trimAngleRad / DEG_TO_RAD;
  const deltaCm = calculateDeltaCm(
    cmAlphaPerRad,
    disturbanceAlphaDeg
  );
  const trimmed = isTrimmed(cm);
  const disturbanceTendency = classifyDisturbance(
    cmAlphaPerRad,
    disturbanceAlphaDeg
  );

  return {
    alphaRad,
    disturbanceAlphaRad,
    cm,
    trimAngleRad,
    trimAngleDeg,
    deltaCm,
    trimmed,
    disturbanceTendency
  };
}

export function calculateCmAlphaPlot(
  cm0,
  cmAlphaPerRad,
  angleOfAttackDeg
) {
  assertFiniteNumber(cm0, "cm0");
  assertFiniteNumber(cmAlphaPerRad, "cmAlphaPerRad");
  assertFiniteNumber(angleOfAttackDeg, "angleOfAttackDeg");

  const lowerBound = Math.min(-10, angleOfAttackDeg);
  const upperBound = Math.max(10, angleOfAttackDeg);
  const pointCount = 41;
  const step = (upperBound - lowerBound) / (pointCount - 1);

  const angles = Array.from(
    { length: pointCount },
    (_, index) => lowerBound + index * step
  );

  if (!angles.some((angle) => Object.is(angle, angleOfAttackDeg))) {
    angles.push(angleOfAttackDeg);
  }

  angles.sort((a, b) => a - b);

  return angles.map((alphaDeg) => ({
    x: alphaDeg,
    y: calculateCm(cm0, cmAlphaPerRad, alphaDeg)
  }));
}