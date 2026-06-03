#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const ROWS = 4;
const COLS = 5;
const PIECE_SIZE = 5;
const CELL_COUNT = ROWS * COLS;
const PIECE_COUNT = CELL_COUNT / PIECE_SIZE;
const DEFAULT_RUNS = 100;

const RULES = {
  NONDECREASING: "nondecreasing",
  SUM_LAST: "sum-last",
  SUM_ANYWHERE: "sum-anywhere",
  VALUES_BETWEEN: "values-between"
};

const RULE_ORDER = [
  RULES.NONDECREASING,
  RULES.SUM_LAST,
  RULES.SUM_ANYWHERE,
  RULES.VALUES_BETWEEN
];

const OPTIONS = readOptions();
const TILINGS = loadTilings(OPTIONS.noRepeats);
const rules = OPTIONS.rule === "all" ? RULE_ORDER : [OPTIONS.rule];

for (const ruleName of rules) {
  runExperiment(buildRule(ruleName, defaultDigits(ruleName)));
}

function runExperiment(rule) {
  const counts = [];

  for (let run = 0; run < OPTIONS.runs; run += 1) {
    const sourceTiling = randomItem(TILINGS);
    const board = generateBoardFromTiling(sourceTiling, rule);
    const solutions = countValidSolutions(board, rule);

    counts.push(solutions);

    if (!OPTIONS.summaryOnly) {
      console.log([
        `run=${run + 1}`,
        `rule=${rule.name}`,
        `digits=${rule.digits.join("")}`,
        `solutions=${solutions}`,
        `source=${sourceTiling}`,
        `grid=${board.join("")}`
      ].join(" "));
    }
  }

  printSummary(rule, counts);
}

function generateBoardFromTiling(tiling, rule) {
  const board = Array.from({ length: CELL_COUNT }, () => "");
  const pieces = compactTilingToPieces(tiling);
  const sequences = rule.generatePieceSequences(pieces.length);

  pieces.forEach((piece, pieceIndex) => {
    piece
      .slice()
      .sort((a, b) => a - b)
      .forEach((cellIndex, valueIndex) => {
        board[cellIndex] = sequences[pieceIndex][valueIndex];
      });
  });

  return board;
}

function countValidSolutions(board, rule) {
  let count = 0;

  for (const tiling of TILINGS) {
    if (isValidSolution(board, tiling, rule)) {
      count += 1;
    }
  }

  return count;
}

function isValidSolution(board, tiling, rule) {
  const pieces = compactTilingToPieces(tiling).map((piece) =>
    piece
      .slice()
      .sort((a, b) => a - b)
      .map((cellIndex) => board[cellIndex])
  );

  return rule.validatePieces(pieces);
}

function buildRule(ruleName, digits) {
  const allSequences = buildAllSequences(digits, PIECE_SIZE);

  if (ruleName === RULES.NONDECREASING) {
    const sequences = allSequences.filter(isNonDecreasing);

    return {
      name: ruleName,
      digits,
      generatePieceSequences: (pieceCount) => repeatRandom(sequences, pieceCount),
      validatePieces: (pieces) => pieces.every((values) => (
        values.every((value) => digits.includes(value)) &&
        isNonDecreasing(values)
      ))
    };
  }

  if (ruleName === RULES.SUM_LAST) {
    const sequences = allSequences.filter((sequence) => (
      sequenceSum(sequence.slice(0, PIECE_SIZE - 1)) === Number(sequence[PIECE_SIZE - 1])
    ));

    return {
      name: ruleName,
      digits,
      generatePieceSequences: (pieceCount) => repeatRandom(sequences, pieceCount),
      validatePieces: (pieces) => pieces.every((values) => (
        values.every((value) => digits.includes(value)) &&
        sequenceSum(values.slice(0, PIECE_SIZE - 1)) === Number(values[PIECE_SIZE - 1])
      ))
    };
  }

  if (ruleName === RULES.SUM_ANYWHERE) {
    const sequences = allSequences.filter(hasValueEqualToSumOfOthers);

    return {
      name: ruleName,
      digits,
      generatePieceSequences: (pieceCount) => repeatRandom(sequences, pieceCount),
      validatePieces: (pieces) => pieces.every((values) => (
        values.every((value) => digits.includes(value)) &&
        hasValueEqualToSumOfOthers(values)
      ))
    };
  }

  if (ruleName === RULES.VALUES_BETWEEN) {
    const sequences = allSequences.filter(hasMiddleValuesBetweenEnds);

    return {
      name: ruleName,
      digits,
      generatePieceSequences: (pieceCount) => repeatRandom(sequences, pieceCount),
      validatePieces: (pieces) => pieces.every((values) => (
        values.every((value) => digits.includes(value)) &&
        hasMiddleValuesBetweenEnds(values)
      ))
    };
  }

  throw new Error(`Unknown rule: ${ruleName}`);
}

function loadTilings(noRepeats) {
  const suffix = noRepeats ? "-no-repeats" : "";
  const tilingPath = path.join(
    __dirname,
    "..",
    "data",
    `pentomino-tilings-4x5${suffix}.txt`
  );

  return fs.readFileSync(tilingPath, "utf8")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function compactTilingToPieces(tiling) {
  const pieces = Array.from({ length: PIECE_COUNT }, () => []);

  [...tiling].forEach((label, index) => {
    pieces[parseInt(label, 36)].push(index);
  });

  return pieces;
}

function defaultDigits(ruleName) {
  return ruleName === RULES.NONDECREASING
    ? ["1", "2", "3", "4", "5"]
    : ["1", "2", "3", "4", "5", "6", "7", "8", "9"];
}

function repeatRandom(items, count) {
  if (items.length === 0) {
    throw new Error("Rule has no valid piece sequences for this digit set.");
  }

  return Array.from({ length: count }, () => randomItem(items));
}

function isNonDecreasing(values) {
  return values.every((value, index) => (
    index === 0 || Number(value) >= Number(values[index - 1])
  ));
}

function hasValueEqualToSumOfOthers(values) {
  const total = sequenceSum(values);

  return values.some((value) => Number(value) * 2 === total);
}

function hasMiddleValuesBetweenEnds(values) {
  const first = Number(values[0]);
  const last = Number(values[values.length - 1]);
  const low = Math.min(first, last);
  const high = Math.max(first, last);

  return first !== last &&
    values.slice(1, values.length - 1).every((value) => (
      Number(value) > low && Number(value) < high
    ));
}

function sequenceSum(sequence) {
  return sequence.reduce((total, value) => total + Number(value), 0);
}

function buildAllSequences(digits, length) {
  if (length === 0) {
    return [[]];
  }

  return digits.flatMap((digit) =>
    buildAllSequences(digits, length - 1).map((suffix) => [digit, ...suffix])
  );
}

function printSummary(rule, counts) {
  const sortedCounts = counts.slice().sort((a, b) => a - b);
  const histogram = new Map();

  counts.forEach((count) => {
    histogram.set(count, (histogram.get(count) || 0) + 1);
  });

  console.log(`size=${ROWS}x${COLS}`);
  console.log(`pieceSize=${PIECE_SIZE}`);
  console.log(`rule=${rule.name}`);
  console.log(`digits=${rule.digits.join("")}`);
  console.log(`tilings=${TILINGS.length}`);
  console.log(`tilingSet=${OPTIONS.noRepeats ? "no-repeats" : "all"}`);
  console.log(`runs=${counts.length}`);
  console.log(`min=${sortedCounts[0]}`);
  console.log(`median=${sortedCounts[Math.floor(sortedCounts.length / 2)]}`);
  console.log(`mean=${mean(counts).toFixed(2)}`);
  console.log(`max=${sortedCounts[sortedCounts.length - 1]}`);
  console.log("histogram=" + [...histogram.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([count, frequency]) => `${count}:${frequency}`)
    .join(","));
  console.log("");
}

function readOptions() {
  const args = process.argv.slice(2);
  const runs = Number(args[0] && !args[0].startsWith("--") ? args[0] : DEFAULT_RUNS);
  const rule = readFlag(args, "--rule") || "all";

  if (rule !== "all" && !RULE_ORDER.includes(rule)) {
    throw new Error(`Unknown --rule ${rule}.`);
  }

  return {
    runs,
    rule,
    noRepeats: args.includes("--no-repeats"),
    summaryOnly: args.includes("--summary")
  };
}

function readFlag(args, flag) {
  const index = args.indexOf(flag);

  return index === -1 ? null : args[index + 1];
}

function randomItem(items) {
  return items[Math.floor(Math.random() * items.length)];
}

function mean(values) {
  return values.reduce((total, value) => total + value, 0) / values.length;
}

