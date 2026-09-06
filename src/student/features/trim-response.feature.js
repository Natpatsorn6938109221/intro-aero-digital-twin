import {
  TRIM_TOLERANCE,
  calculateCm,
  calculateCmAlphaPlot,
  calculateDeltaCm,
  calculateTrimAngleDeg,
  calculateTrimResponse
} from "../physics/trim-response.js";

const REQUIRED_CAPABILITY_ID = "loads.pitch.component-sum";
const REQUIRED_CAPABILITY_VERSION = 1;

function hasRequiredCapability(capabilityContext) {
  const capabilities = capabilityContext?.capabilities;

  if (Array.isArray(capabilities)) {
    return capabilities.some((capability) => {
      if (typeof capability === "string") {
        return capability === REQUIRED_CAPABILITY_ID;
      }

      return (
        capability?.id === REQUIRED_CAPABILITY_ID &&
        Number(capability?.version) >= REQUIRED_CAPABILITY_VERSION
      );
    });
  }

  if (capabilities && typeof capabilities === "object") {
    const capability = capabilities[REQUIRED_CAPABILITY_ID];

    if (typeof capability === "number") {
      return capability >= REQUIRED_CAPABILITY_VERSION;
    }

    if (typeof capability === "object") {
      return Number(capability?.version) >= REQUIRED_CAPABILITY_VERSION;
    }
  }

  return false;
}

function finite(value) {
  return typeof value === "number" && Number.isFinite(value);
}

function closeTo(actual, expected, tolerance) {
  return finite(actual) &&
    Math.abs(actual - expected) <= tolerance;
}

function makeResults(response) {
  return [
    {
      key: "cm-alpha-selected",
      label: "Cm(alpha)",
      value: response.cm,
      unit: "",
      precision: 9,
      emphasis: true
    },
    {
      key: "trim-angle",
      label: "Trim angle",
      value:
        response.trimAngleDeg === null
          ? "not available"
          : response.trimAngleDeg,
      unit: response.trimAngleDeg === null ? "" : "deg",
      precision: 9,
      emphasis: false
    },
    {
      key: "delta-cm",
      label: "delta_Cm",
      value: response.deltaCm,
      unit: "",
      precision: 9,
      emphasis: false
    },
    {
      key: "trim-status",
      label: "Selected condition",
      value: response.trimmed ? "trimmed" : "not trimmed",
      unit: "",
      precision: 0,
      emphasis: false
    },
    {
      key: "disturbance-tendency",
      label: "Disturbance tendency",
      value: response.disturbanceTendency,
      unit: "",
      precision: 0,
      emphasis: false
    }
  ];
}

function makeDecision(response) {
  if (response.disturbanceTendency === "destabilizing") {
    return {
      question:
        "At the selected angle of attack, is the simplified pitching-moment model trimmed, and does a small angle-of-attack disturbance create a restoring moment tendency?",
      interpretation:
        response.trimmed
          ? "The selected condition is trimmed, but the disturbance has a destabilizing moment tendency under the simplified linear model."
          : "The selected condition is not trimmed and the disturbance has a destabilizing moment tendency under the simplified linear model.",
      status: "caution"
    };
  }

  if (
    response.trimmed &&
    response.disturbanceTendency === "restoring"
  ) {
    return {
      question:
        "At the selected angle of attack, is the simplified pitching-moment model trimmed, and does a small angle-of-attack disturbance create a restoring moment tendency?",
      interpretation:
        "The selected condition is trimmed and the disturbance has a restoring moment tendency under the simplified linear model.",
      status: "pass"
    };
  }

  if (response.disturbanceTendency === "neutral") {
    return {
      question:
        "At the selected angle of attack, is the simplified pitching-moment model trimmed, and does a small angle-of-attack disturbance create a restoring moment tendency?",
      interpretation:
        response.trimmed
          ? "The selected condition is trimmed, while the disturbance is neutral under the simplified linear model."
          : "The selected condition is not trimmed, while the disturbance is neutral under the simplified linear model.",
      status: "neutral"
    };
  }

  return {
    question:
      "At the selected angle of attack, is the simplified pitching-moment model trimmed, and does a small angle-of-attack disturbance create a restoring moment tendency?",
    interpretation:
      "The selected condition is not trimmed, but the disturbance has a restoring moment tendency under the simplified linear model.",
    status: "caution"
  };
}

function makePlots(aircraft) {
  return [
    {
      id: "cm-alpha",
      title: "Cm–alpha relationship",
      xAxis: {
        label: "Angle of attack",
        unit: "deg"
      },
      yAxis: {
        label: "Pitching-moment coefficient",
        unit: ""
      },
      series: [
        {
          id: "cm-alpha-series",
          label: "Cm(alpha)",
          points: calculateCmAlphaPlot(
            aircraft.cm0,
            aircraft.cmAlphaPerRad,
            aircraft.angleOfAttackDeg
          )
        }
      ],
      referenceLines: [
        {
          id: "trim-line",
          label: "Trim line",
          axis: "y",
          value: 0
        }
      ],
      regions: []
    }
  ];
}

function makeVerificationCases(aircraft) {
  const numerical = calculateTrimResponse({
    cm0: 0.04,
    cmAlphaPerRad: -0.8,
    angleOfAttackDeg: 2.86,
    disturbanceAlphaDeg: 2.0
  });

  const behavioralStart = calculateTrimResponse({
    cm0: 0.04,
    cmAlphaPerRad: -0.8,
    angleOfAttackDeg: 2.86,
    disturbanceAlphaDeg: 2.0
  });

  const behavioralChanged = calculateTrimResponse({
    cm0: 0.04,
    cmAlphaPerRad: -0.8,
    angleOfAttackDeg: 2.86,
    disturbanceAlphaDeg: 4.0
  });

  const boundary = calculateTrimResponse({
    cm0: 0.04,
    cmAlphaPerRad: 0,
    angleOfAttackDeg: 2.86,
    disturbanceAlphaDeg: 2.0
  });

  return [
    {
      id: "numerical",
      title: "Numerical reference case",
      inputs: {
        cm0: 0.04,
        cmAlphaPerRad: -0.8,
        angleOfAttackDeg: 2.86,
        disturbanceAlphaDeg: 2.0
      },
      expected: {
        cm: 0.000066866712,
        trimAngleDeg: 2.864788976,
        deltaCm: -0.02792526803,
        trimmed: false,
        disturbanceTendency: "restoring"
      },
      tolerance: {
        cm: 1e-6,
        trimAngleDeg: 1e-6,
        deltaCm: 1e-6
      },
      passed:
        closeTo(numerical.cm, 0.000066866712, 1e-6) &&
        closeTo(numerical.trimAngleDeg, 2.864788976, 1e-6) &&
        closeTo(numerical.deltaCm, -0.02792526803, 1e-6) &&
        numerical.trimmed === false &&
        numerical.disturbanceTendency === "restoring"
    },
    {
      id: "behavioral",
      title: "Disturbance doubling case",
      inputs: {
        start: {
          cm0: 0.04,
          cmAlphaPerRad: -0.8,
          angleOfAttackDeg: 2.86,
          disturbanceAlphaDeg: 2.0
        },
        changed: {
          cm0: 0.04,
          cmAlphaPerRad: -0.8,
          angleOfAttackDeg: 2.86,
          disturbanceAlphaDeg: 4.0
        }
      },
      expected: {
        deltaCmMagnitudeDoubles: true,
        deltaCmRemainsNegative: true,
        disturbanceTendencyRemainsRestoring: true,
        selectedCmUnchanged: true,
        trimAngleUnchanged: true
      },
      tolerance: {
        ratio: 1e-12
      },
      passed:
        closeTo(
          Math.abs(behavioralChanged.deltaCm),
          2 * Math.abs(behavioralStart.deltaCm),
          1e-12
        ) &&
        behavioralChanged.deltaCm < 0 &&
        behavioralStart.deltaCm < 0 &&
        behavioralChanged.disturbanceTendency === "restoring" &&
        closeTo(
          behavioralChanged.cm,
          behavioralStart.cm,
          1e-12
        ) &&
        closeTo(
          behavioralChanged.trimAngleDeg,
          behavioralStart.trimAngleDeg,
          1e-12
        )
    },
    {
      id: "boundary",
      title: "Zero-slope boundary case",
      inputs: {
        cm0: 0.04,
        cmAlphaPerRad: 0,
        angleOfAttackDeg: 2.86,
        disturbanceAlphaDeg: 2.0
      },
      expected: {
        cm: 0.04,
        deltaCm: 0,
        trimmed: false,
        trimAngle: "not available",
        disturbanceTendency: "neutral"
      },
      tolerance: {
        cm: 1e-12,
        deltaCm: 1e-12
      },
      passed:
        closeTo(boundary.cm, 0.04, 1e-12) &&
        closeTo(boundary.deltaCm, 0, 1e-12) &&
        boundary.trimmed === false &&
        boundary.trimAngleDeg === null &&
        boundary.disturbanceTendency === "neutral"
    }
  ];
}

export const feature = {
  contractVersion: 4,
  id: "trim-response",
  title: "Live Cm–alpha relationship and trim",
  description:
    "Determines whether the selected angle of attack is trimmed and whether a small disturbance has a restoring, neutral, or destabilizing moment tendency under the simplified linear model.",
  category: "Stability · Student feature",
  learningMode: "concept",
  topicId: "stability",
  inputKeys: [
    "cm0",
    "cmAlphaPerRad",
    "angleOfAttackDeg",
    "disturbanceAlphaDeg"
  ],
  requiresCapabilities: [
    {
      id: "loads.pitch.component-sum",
      version: 1
    }
  ],
  providesCapabilities: [
    {
      id: "stability.pitch.cm-alpha",
      version: 1
    }
  ],
  assumptions: [
    "The Cm–alpha relationship is linear over the investigated range.",
    "The model is quasi-static and represents a small disturbance about the selected condition.",
    "Cm0 and Cm_alpha represent the same aircraft configuration and flight condition.",
    "The assigned sign convention is positive nose-up pitching moment and positive nose-up angle of attack."
  ],
  validityLimits: [
    "Do not use this linear relationship at stall, at large angle of attack, or where aerodynamic coefficients are strongly nonlinear.",
    "This model does not calculate a time history, damping, control motion, or handling quality.",
    "A restoring tendency in this model is not proof of acceptable safety, controllability, or flightworthiness.",
    "The calculated trim angle is meaningful only when the linear model remains valid at that angle."
  ],
  simulation: {
    display: "analysis-only",
    durationS: 1,
    initialState: {},
    controls: {},
    disturbance: {}
  },

  analyze(aircraft, capabilityContext) {
    const capabilityAvailable =
      hasRequiredCapability(capabilityContext);

    if (!capabilityAvailable) {
      return {
        results: [],
        verificationCases: [],
        decision: {
          question:
            "At the selected angle of attack, is the simplified pitching-moment model trimmed, and does a small angle-of-attack disturbance create a restoring moment tendency?",
          interpretation:
            "The required Stage 3 capability is not available, so Stage 4 analysis remains locked.",
          status: "caution"
        },
        plots: [],
        scene: null
      };
    }

    const response = calculateTrimResponse(aircraft);

    return {
      results: makeResults(response),
      verificationCases: makeVerificationCases(aircraft),
      decision: makeDecision(response),
      plots: makePlots(aircraft),
      scene: null
    };
  }
};

export const model = {
  kind: "derived",

  evaluate(runtimeContext) {
    const aircraft = runtimeContext?.aircraft;

    if (!aircraft) {
      throw new TypeError("runtimeContext.aircraft is required");
    }

    const response = calculateTrimResponse(aircraft);

    return {
      values: {
        cmAlpha: calculateCm(
          aircraft.cm0,
          aircraft.cmAlphaPerRad,
          aircraft.angleOfAttackDeg
        ),
        trimAngleDeg:
          response.trimAngleDeg === null
            ? "not available"
            : response.trimAngleDeg,
        deltaCm: response.deltaCm,
        trimmed: response.trimmed,
        disturbanceTendency: response.disturbanceTendency
      }
    };
  }
};