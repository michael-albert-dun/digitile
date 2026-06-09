// Stable game definitions shared by the UI, generator, and URL/session code.
const DEFAULT_PIECE_SIZE = 4;
const GROUP_COLOR_COUNT = 9;
const SESSION_STORAGE_KEY = "digitiler.currentPuzzle.v1";
const DEFAULT_RULESET = "sum-last";
const SOLUTION_CHEAT_CODE = "uuddlrlrab";
const SOLUTION_MULTIPLIERS = [3, 7, 9];
const SOLUTION_MULTIPLIER_INVERSES = {
  3: 7,
  7: 3,
  9: 9
};

function sequenceSum(values) {
  return values.reduce((total, value) => total + Number(value), 0);
}

const RULESETS = {
  nondecreasing: {
    label: "Nondecreasing",
    title: "Making progress",
    digitsBySize: {
      4: ["1", "2", "3", "4"],
      5: ["1", "2", "3", "4", "5"]
    },
    infoText: "Tile values must increase or stay the same.",
    exampleValuesBySize: {
      4: ["1", "2", "3", "4"],
      5: ["1", "2", "3", "4", "5"]
    },
    invalidExampleValuesBySize: {
      4: ["1", "3", "2", "4"],
      5: ["1", "2", "4", "3", "5"]
    },
    invalidReason(values) {
      return `The digits must be non-decreasing and use only ${digitSummary(ruleDigits(this))}.`;
    },
    generatePieceSequences(pieceCount, length) {
      const sequences = buildAllSequences(ruleDigits(this), length).filter(isNonDecreasing);

      return repeatFromGroup(sequences, pieceCount);
    },
    validateMove(values) {
      return usesRuleDigits(values, ruleDigits(this)) && isNonDecreasing(values);
    },
    validateSolution(pieceValues) {
      return pieceValues.every((values) => this.validateMove(values));
    }
  },
  "sum-last": {
    label: "Sum last",
    title: "Final total",
    digitsBySize: {
      4: ["1", "2", "3", "4", "5", "6"],
      5: ["1", "2", "3", "4", "5", "6", "7", "8", "9"]
    },
    infoText() {
      return `The first ${numberWord(state.pieceSize - 1)} values must add up to the last value.`;
    },
    exampleValuesBySize: {
      4: ["1", "2", "3", "6"],
      5: ["1", "1", "2", "3", "7"]
    },
    invalidExampleValuesBySize: {
      4: ["1", "2", "4", "6"],
      5: ["1", "1", "2", "4", "7"]
    },
    invalidReason(values) {
      return `The first ${values.length - 1} LR-TB digits must sum to the last and use only ${digitSummary(ruleDigits(this))}.`;
    },
    generatePieceSequences(pieceCount, length) {
      const sequences = buildAllSequences(ruleDigits(this), length).filter(isSumLast);

      return repeatFromGroup(sequences, pieceCount);
    },
    validateMove(values) {
      return usesRuleDigits(values, ruleDigits(this)) && isSumLast(values);
    },
    validateSolution(pieceValues) {
      return pieceValues.every((values) => this.validateMove(values));
    },
    aggregate: sequenceSum,
    targetIndex(values) {
      return this.validateMove(values) ? values.length - 1 : null;
    }
  },
  "sum-anywhere": {
    label: "Sum anywhere",
    title: "Some total",
    digitsBySize: {
      4: ["1", "2", "3", "4", "5", "6"],
      5: ["1", "2", "3", "4", "5", "6", "7", "8", "9"]
    },
    infoText() {
      return `One value in each piece must equal the sum of the other ${numberWord(state.pieceSize - 1)} values.`;
    },
    exampleValuesBySize: {
      4: ["6", "3", "2", "1"],
      5: ["8", "3", "2", "1", "2"]
    },
    invalidExampleValuesBySize: {
      4: ["6", "4", "2", "1"],
      5: ["8", "4", "2", "1", "2"]
    },
    invalidReason(values) {
      return `One digit must equal the sum of the other ${numberWord(values.length - 1)} and use only ${digitSummary(ruleDigits(this))}.`;
    },
    generatePieceSequences(pieceCount, length) {
      const sequences = buildAllSequences(ruleDigits(this), length).filter(hasValueEqualToSumOfOthers);

      return repeatFromGroup(sequences, pieceCount);
    },
    validateMove(values) {
      return usesRuleDigits(values, ruleDigits(this)) && hasValueEqualToSumOfOthers(values);
    },
    validateSolution(pieceValues) {
      return pieceValues.every((values) => this.validateMove(values));
    },
    aggregate: sequenceSum,
    targetIndex(values) {
      const total = sequenceSum(values);

      return this.validateMove(values)
        ? values.findIndex((value) => Number(value) * 2 === total)
        : null;
    }
  },
  "values-between": {
    label: "Values between",
    title: "Middling middle",
    digitsBySize: {
      4: ["1", "2", "3", "4", "5", "6", "7", "8"],
      5: ["1", "2", "3", "4", "5", "6", "7", "8", "9"]
    },
    infoText() {
      return `The ${numberWord(state.pieceSize - 2)} middle values must lie strictly between the first and last values.`;
    },
    exampleValuesBySize: {
      4: ["1", "2", "5", "6"],
      5: ["1", "2", "4", "5", "6"]
    },
    invalidExampleValuesBySize: {
      4: ["1", "1", "5", "6"],
      5: ["1", "2", "6", "5", "6"]
    },
    invalidReason() {
      return "The middle LR-TB digits must lie strictly between the first and last.";
    },
    generatePieceSequences(pieceCount, length) {
      const sequences = buildAllSequences(ruleDigits(this), length).filter(hasMiddleValuesBetweenEnds);

      return repeatFromGroup(sequences, pieceCount);
    },
    validateMove(values) {
      return usesRuleDigits(values, ruleDigits(this)) && hasMiddleValuesBetweenEnds(values);
    },
    validateSolution(pieceValues) {
      return pieceValues.every((values) => this.validateMove(values));
    }
  },
  mean: {
    label: "That's just mean",
    title: "That's just mean",
    digits: ["1", "2", "3", "4", "5", "6", "7", "8"],
    infoText: "A piece must contain its arithmetic mean in any position.",
    exampleValuesBySize: {
      4: ["5", "2", "4", "5"],
      5: ["1", "2", "3", "4", "3"]
    },
    invalidExampleValuesBySize: {
      4: ["2", "5", "5", "3"],
      5: ["1", "2", "3", "4", "4"]
    },
    invalidReason(values) {
      return `The piece must contain its arithmetic mean in any position and use only ${digitSummary(ruleDigits(this))}.`;
    },
    generatePieceSequences(pieceCount, length) {
      const sequences = buildAllSequences(ruleDigits(this), length).filter(hasExactMeanValue);

      return repeatFromGroup(sequences, pieceCount);
    },
    validateMove(values) {
      return usesRuleDigits(values, ruleDigits(this)) && hasExactMeanValue(values);
    },
    validateSolution(pieceValues) {
      return pieceValues.every((values) => this.validateMove(values));
    },
    aggregate: sequenceSum,
    targetIndex(values) {
      const mean = exactMean(values);

      return this.validateMove(values)
        ? values.findIndex((value) => Number(value) === mean)
        : null;
    }
  }
};
const RULESET_ORDER = [
  "nondecreasing",
  "sum-last",
  "sum-anywhere",
  "values-between",
  "mean"
];
const RULESET_SYMBOLS = {
  nondecreasing: "↗",
  "sum-last": "+!",
  "sum-anywhere": "+?",
  "values-between": "]:[",
  mean: "x"
};
const INTRO_RULE_CARDS = [
  {
    key: "nondecreasing",
    values: ["1", "1", "2", "2"],
    shape: [{ row: 0, col: 0 }, { row: 0, col: 1 }, { row: 1, col: 1 }, { row: 1, col: 2 }]
  },
  {
    key: "sum-last",
    values: ["2", "1", "3", "6"],
    shape: [{ row: 0, col: 1 }, { row: 1, col: 0 }, { row: 1, col: 1 }, { row: 2, col: 1 }]
  },
  {
    key: "sum-anywhere",
    values: ["5", "1", "1", "3"],
    shape: [{ row: 0, col: 0 }, { row: 1, col: 0 }, { row: 1, col: 1 }, { row: 2, col: 1 }]
  },
  {
    key: "values-between",
    values: ["6", "2", "5", "1"],
    shape: [{ row: 0, col: 1 }, { row: 1, col: 0 }, { row: 1, col: 1 }, { row: 1, col: 2 }]
  },
  {
    key: "mean",
    values: ["5", "2", "4", "5"],
    shape: [{ row: 0, col: 0 }, { row: 0, col: 1 }, { row: 1, col: 1 }, { row: 1, col: 2 }]
  }
];
const RULE_MODEL_SHAPES = [
  [{ row: 0, col: 0 }, { row: 0, col: 1 }, { row: 1, col: 0 }, { row: 1, col: 1 }],
  [{ row: 0, col: 0 }, { row: 0, col: 1 }, { row: 0, col: 2 }, { row: 1, col: 1 }],
  [{ row: 0, col: 1 }, { row: 1, col: 0 }, { row: 1, col: 1 }, { row: 2, col: 1 }],
  [{ row: 0, col: 1 }, { row: 1, col: 0 }, { row: 1, col: 1 }, { row: 1, col: 2 }],
  [{ row: 0, col: 0 }, { row: 1, col: 0 }, { row: 1, col: 1 }, { row: 2, col: 0 }],
  [{ row: 0, col: 1 }, { row: 0, col: 2 }, { row: 1, col: 0 }, { row: 1, col: 1 }],
  [{ row: 0, col: 0 }, { row: 1, col: 0 }, { row: 1, col: 1 }, { row: 2, col: 1 }],
  [{ row: 0, col: 0 }, { row: 0, col: 1 }, { row: 1, col: 1 }, { row: 1, col: 2 }],
  [{ row: 0, col: 1 }, { row: 1, col: 0 }, { row: 1, col: 1 }, { row: 2, col: 0 }],
  [{ row: 0, col: 0 }, { row: 0, col: 1 }, { row: 0, col: 2 }, { row: 1, col: 0 }],
  [{ row: 0, col: 0 }, { row: 0, col: 1 }, { row: 0, col: 2 }, { row: 1, col: 2 }],
  [{ row: 0, col: 0 }, { row: 1, col: 0 }, { row: 2, col: 0 }, { row: 2, col: 1 }],
  [{ row: 0, col: 1 }, { row: 1, col: 1 }, { row: 2, col: 0 }, { row: 2, col: 1 }],
  [{ row: 0, col: 0 }, { row: 0, col: 1 }, { row: 1, col: 0 }, { row: 2, col: 0 }],
  [{ row: 0, col: 0 }, { row: 0, col: 1 }, { row: 1, col: 1 }, { row: 2, col: 1 }],
  [{ row: 0, col: 0 }, { row: 1, col: 0 }, { row: 1, col: 1 }, { row: 1, col: 2 }],
  [{ row: 0, col: 2 }, { row: 1, col: 0 }, { row: 1, col: 1 }, { row: 1, col: 2 }]
];
const PENTOMINO_RULE_MODEL_SHAPES = [
  [{ row: 0, col: 0 }, { row: 0, col: 1 }, { row: 0, col: 2 }, { row: 1, col: 1 }, { row: 2, col: 1 }],
  [{ row: 0, col: 0 }, { row: 1, col: 0 }, { row: 1, col: 1 }, { row: 1, col: 2 }, { row: 2, col: 2 }],
  [{ row: 0, col: 1 }, { row: 1, col: 0 }, { row: 1, col: 1 }, { row: 1, col: 2 }, { row: 2, col: 1 }],
  [{ row: 0, col: 0 }, { row: 1, col: 0 }, { row: 2, col: 0 }, { row: 2, col: 1 }, { row: 2, col: 2 }],
  [{ row: 0, col: 0 }, { row: 0, col: 1 }, { row: 1, col: 1 }, { row: 1, col: 2 }, { row: 1, col: 3 }],
  [{ row: 0, col: 2 }, { row: 1, col: 0 }, { row: 1, col: 1 }, { row: 1, col: 2 }, { row: 2, col: 0 }]
];
const RULESET_ALIASES = new Map([
  ["first3-sum", "sum-last"],
  ["first3-anywhere", "sum-anywhere"],
  ["between", "values-between"],
  ["thats-just-mean", "mean"],
  ["that's-just-mean", "mean"]
]);
const MAX_GENERATION_ATTEMPTS = 5000;
const MAX_ALLOWED_SOLUTIONS = 2;
const FALLBACK_TILINGS = {
  "4:4x4": ["0000111122223333"]
};
const TIMER_MODE = {
  TIMED: "timed",
  UNTIMED: "untimed"
};
const MODES = {
  4: {
    pieceSize: 4,
    pieceName: "tetromino",
    pieceLabel: "tetrominoes",
    tilingPrefix: "tetromino",
    boardSizes: [
      { rows: 4, cols: 4, label: "4 x 4" },
      { rows: 4, cols: 5, label: "4 x 5" },
      { rows: 5, cols: 4, label: "5 x 4" },
      { rows: 4, cols: 6, label: "4 x 6" },
      { rows: 6, cols: 4, label: "6 x 4" },
      { rows: 6, cols: 6, label: "6 x 6" }
    ]
  },
  5: {
    pieceSize: 5,
    pieceName: "pentomino",
    pieceLabel: "pentominoes",
    tilingPrefix: "pentomino",
    boardSizes: [
      { rows: 4, cols: 5, label: "4 x 5" },
      { rows: 5, cols: 4, label: "5 x 4" },
      { rows: 5, cols: 5, label: "5 x 5" },
      { rows: 5, cols: 6, label: "5 x 6" },
      { rows: 6, cols: 5, label: "6 x 5" }
    ]
  }
};
