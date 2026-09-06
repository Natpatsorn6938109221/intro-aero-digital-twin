import { describe, expect, test } from "vitest";

import {
  calculateCm,
  calculateDeltaCm,
  calculateTrimAngleDeg,
  calculateTrimResponse,
  classifyDisturbance,
  isTrimmed
} from "../../src/student/physics/trim-response.js";

describe("trim-response physics", () => {
  test("matches the numerical reference case", () => {
    const result = calculateTrimResponse({
      cm0: 0.04,
      cmAlphaPerRad: -0.8,
      angleOfAttackDeg: 2.86,
      disturbanceAlphaDeg: 2.0
    });

    expect(result.cm).toBeCloseTo(
      0.000066866712,
      6
    );

    expect(result.trimAngleDeg).toBeCloseTo(
      2.864788976,
      6
    );

    expect(result.deltaCm).toBeCloseTo(
      -0.02792526803,
      6
    );

    expect(result.trimmed).toBe(false);
    expect(result.disturbanceTendency).toBe(
      "restoring"
    );
  });

  test("doubling disturbance doubles delta_Cm while selected Cm and trim remain unchanged", () => {
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

    expect(start.deltaCm).toBeLessThan(0);
    expect(changed.deltaCm).toBeLessThan(0);

    expect(changed.disturbanceTendency).toBe(
      "restoring"
    );

    expect(changed.cm).toBeCloseTo(
      start.cm,
      12
    );

    expect(changed.trimAngleDeg).toBeCloseTo(
      start.trimAngleDeg,
      12
    );
  });

  test("zero slope has no unique trim angle and produces a neutral disturbance", () => {
    const result = calculateTrimResponse({
      cm0: 0.04,
      cmAlphaPerRad: 0,
      angleOfAttackDeg: 2.86,
      disturbanceAlphaDeg: 2.0
    });

    expect(result.cm).toBeCloseTo(
      0.04,
      12
    );

    expect(result.deltaCm).toBeCloseTo(
      0,
      12
    );

    expect(result.trimAngleDeg).toBeNull();
    expect(result.trimmed).toBe(false);
    expect(result.disturbanceTendency).toBe(
      "neutral"
    );
  });

  test("negative Cm_alpha with positive disturbance gives negative delta_Cm", () => {
    const deltaCm = calculateDeltaCm(
      -0.8,
      2.0
    );

    expect(deltaCm).toBeLessThan(0);
    expect(
      classifyDisturbance(-0.8, 2.0)
    ).toBe("restoring");
  });

  test("positive Cm_alpha with positive disturbance gives destabilizing tendency", () => {
    const deltaCm = calculateDeltaCm(
      0.8,
      2.0
    );

    expect(deltaCm).toBeGreaterThan(0);
    expect(
      classifyDisturbance(0.8, 2.0)
    ).toBe("destabilizing");
  });

  test("zero Cm_alpha produces no change in Cm with angle of attack", () => {
    const first = calculateCm(
      0.04,
      0,
      0
    );

    const second = calculateCm(
      0.04,
      0,
      10
    );

    expect(first).toBe(0.04);
    expect(second).toBe(0.04);
  });

  test("trim tolerance accepts Cm at the specified tolerance", () => {
    expect(isTrimmed(1e-6)).toBe(true);
    expect(isTrimmed(-1e-6)).toBe(true);
    expect(isTrimmed(1.000001e-6)).toBe(false);
  });

  test("zero slope does not divide by zero when calculating trim angle", () => {
    expect(
      calculateTrimAngleDeg(0.04, 0)
    ).toBeNull();
  });
});