import { describe, expect, it } from "vitest";

import {
  calculateCm,
  calculateDeltaCm,
  calculateTrimAngleDeg,
  calculateTrimResponse,
  classifyDisturbance,
  degreesToRadians,
  isTrimmed
} from "../../src/student/physics/trim-response.js";

describe("trim-response physics", () => {
  it("passes the numerical reference case", () => {
    const response = calculateTrimResponse({
      cm0: 0.04,
      cmAlphaPerRad: -0.8,
      angleOfAttackDeg: 2.86,
      disturbanceAlphaDeg: 2.0
    });

    expect(response.cm).toBeCloseTo(0.000066866712, 6);
    expect(response.trimAngleDeg).toBeCloseTo(2.864788976, 6);
    expect(response.deltaCm).toBeCloseTo(-0.02792526803, 6);
    expect(response.trimmed).toBe(false);
    expect(response.disturbanceTendency).toBe("restoring");
  });

  it("doubles delta Cm when the disturbance angle doubles", () => {
    const start = calculateTrimResponse({
      cm0: 0.04,
      cmAlphaPerRad: -0.8,
      angleOfAttackDeg: 2.86,
      disturbanceAlphaDeg: 2.0
    });

    const changed = calculateTrimResponse({
      cm0: 0.04,
      cmAlphaPerRad: -0.8,
      angleOfAttackDeg: 2.86,
      disturbanceAlphaDeg: 4.0
    });

    expect(Math.abs(changed.deltaCm)).toBeCloseTo(
      2 * Math.abs(start.deltaCm),
      12
    );
    expect(changed.deltaCm).toBeLessThan(0);
    expect(changed.disturbanceTendency).toBe("restoring");
    expect(changed.cm).toBeCloseTo(start.cm, 12);
    expect(changed.trimAngleDeg).toBeCloseTo(
      start.trimAngleDeg,
      12
    );
  });

  it("handles the zero-slope boundary without division by zero", () => {
    const response = calculateTrimResponse({
      cm0: 0.04,
      cmAlphaPerRad: 0,
      angleOfAttackDeg: 2.86,
      disturbanceAlphaDeg: 2.0
    });

    expect(response.cm).toBeCloseTo(0.04, 12);
    expect(response.deltaCm).toBeCloseTo(0, 12);
    expect(response.trimmed).toBe(false);
    expect(response.trimAngleDeg).toBe(null);
    expect(response.disturbanceTendency).toBe("neutral");
  });

  it("converts degree angles to radians", () => {
    expect(degreesToRadians(180)).toBeCloseTo(Math.PI, 12);
    expect(degreesToRadians(2)).toBeCloseTo(
      0.03490658503988659,
      12
    );
  });

  it("uses the linear Cm-alpha relationship", () => {
    expect(calculateCm(0.04, -0.8, 2.86)).toBeCloseTo(
      0.000066866712,
      6
    );
  });

  it("calculates disturbance moment coefficient using radians", () => {
    expect(calculateDeltaCm(-0.8, 2)).toBeCloseTo(
      -0.02792526803,
      6
    );
  });

  it("classifies negative delta-alpha times delta-Cm as restoring", () => {
    expect(classifyDisturbance(-0.8, 2)).toBe("restoring");
  });

  it("classifies positive delta-alpha times delta-Cm as destabilizing", () => {
    expect(classifyDisturbance(0.8, 2)).toBe("destabilizing");
  });

  it("classifies zero disturbance response as neutral", () => {
    expect(classifyDisturbance(-0.8, 0)).toBe("neutral");
  });

  it("uses the specified trim tolerance", () => {
    expect(isTrimmed(1e-6)).toBe(true);
    expect(isTrimmed(-1e-6)).toBe(true);
    expect(isTrimmed(1.000001e-6)).toBe(false);
  });

  it("rejects non-finite engineering inputs", () => {
    expect(() =>
      calculateCm(NaN, -0.8, 2.86)
    ).toThrow();

    expect(() =>
      calculateDeltaCm(-0.8, Infinity)
    ).toThrow();

    expect(() =>
      calculateTrimAngleDeg(0.04, Number.NaN)
    ).toThrow();
  });
});