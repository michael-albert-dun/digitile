#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const PIECE_SIZE = 4;
const MAX_ALLOWED_SOLUTIONS = 2;
const DEFAULT_MAX_ATTEMPTS = 100000;
const RULES = {
  NONDECREASING: "nondecreasing",
  SAME_SUM: "same-sum",
  DIFFERENT_SUM: "different-sum",
  SAME_PRODUCT: "same-product",
  SUM_LAST: "sum-last",
  SUM_ANYWHERE: "sum-anywhere",
  VALUES_BETWEEN: "values-between",
  MEAN: "mean"
};
const RULE_ALIASES = new Map([
  ["nondecreasing", RULES.NONDECREASING],
  ["increasing", RULES.NONDECREASING],
  ["same-sum", RULES.SAME_SUM],
  ["equal-sum", RULES.SAME_SUM],
  ["different-sum", RULES.DIFFERENT_SUM],
  ["distinct-sum", RULES.DIFFERENT_SUM],
  ["same-product", RULES.SAME_PRODUCT],
  ["equal-product", RULES.SAME_PRODUCT],
  ["first3-sum", RULES.SUM_LAST],
  ["sum-last", RULES.SUM_LAST],
  ["sum3", RULES.SUM_LAST],
  ["sum3-equals-fourth", RULES.SUM_LAST],
  ["first3-anywhere", RULES.SUM_ANYWHERE],
  ["sum-anywhere", RULES.SUM_ANYWHERE],
  ["sum-tile-anywhere", RULES.SUM_ANYWHERE],
  ["values-between", RULES.VALUES_BETWEEN],
  ["between", RULES.VALUES_BETWEEN],
  ["mean", RULES.MEAN],
  ["thats-just-mean", RULES.MEAN],
  ["that's-just-mean", RULES.MEAN]
]);

const OPTIONS = readOptions();
const RUNS = OPTIONS.runs;
const ROWS = OPTIONS.size.rows;
const COLS = OPTIONS.size.cols;
const PIECE_COUNT = ROWS * COLS / PIECE_SIZE;
const tilings = loadTilings(ROWS, COLS);
const rule = buildRule(OPTIONS.rule, OPTIONS.digits);
const counts = [];
const attemptsList = [];

for (let run = 0; run < RUNS; run += 1) {
  const { board, sourceTiling, attempts } = OPTIONS.acceptedOnly
    ? generateAcceptedBoard()
    : generateRandomBoard();
  const solutionCount = countValidSolutions(board);

  counts.push(solutionCount);
  attemptsList.push(attempts);

  if (!OPTIONS.summaryOnly) {
    console.log([
      `run=${run + 1}`,
      `rule=${rule.name}`,
      `digits=${rule.digits.join("")}`,
      `solutions=${solutionCount}`,
      `attempts=${attempts}`,
      `source=${sourceTiling}`,
      `grid=${board.join("")}`
    ].join(" "));
  }
}

if (OPTIONS.summaryOnly) {
  printSummary(counts, attemptsList);
}

function generateRandomBoard() {
  const sourceTiling = randomItem(tilings);

  return {
    board: generateBoardFromTiling(sourceTiling),
    sourceTiling,
    attempts: 1
  };
}

function generateAcceptedBoard() {
  for (let attempts = 1; attempts <= OPTIONS.maxAttempts; attempts += 1) {
    const sourceTiling = randomItem(tilings);
    const board = generateBoardFromTiling(sourceTiling);

    if (countValidSolutions(board, MAX_ALLOWED_SOLUTIONS + 1) <= MAX_ALLOWED_SOLUTIONS) {
      return { board, sourceTiling, attempts };
    }
  }

  throw new Error(
    `Could not find an accepted board within ${OPTIONS.maxAttempts} attempts.`
  );
}

function generateBoardFromTiling(tiling) {
  const board = Array.from({ length: ROWS * COLS }, () => "");
  const pieces = compactTilingToPieces(tiling);
  const pieceSequences = rule.generatePieceSequences(pieces.length);

  pieces.forEach((piece, pieceIndex) => {
    piece
      .slice()
      .sort((a, b) => a - b)
      .forEach((cellIndex, valueIndex) => {
        board[cellIndex] = pieceSequences[pieceIndex][valueIndex];
      });
  });

  return board;
}

function countValidSolutions(board, stopAt = Infinity) {
  let count = 0;

  for (const tiling of tilings) {
    if (isValidSolution(board, tiling)) {
      count += 1;

      if (count >= stopAt) {
        return count;
      }
    }
  }

  return count;
}

function isValidSolution(board, tiling) {
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
      generatePieceSequences: (pieceCount) => Array.from(
        { length: pieceCount },
        () => randomItem(sequences)
      ),
      validatePieces: (pieces) => pieces.every((values) => (
        values.every((value) => digits.includes(value)) &&
        isNonDecreasing(values)
      ))
    };
  }

  if (ruleName === RULES.SAME_SUM) {
    const groups = groupSequencesBy(allSequences, sequenceSum);

    return {
      name: ruleName,
      digits,
      generatePieceSequences: (pieceCount) => {
        const target = randomItem([...groups.keys()]);

        return repeatFromGroup(groups.get(target), pieceCount);
      },
      validatePieces: (pieces) => {
        const sums = pieceAggregates(pieces, digits, sequenceSum);

        return sums.length === pieces.length && sums.every((sum) => sum === sums[0]);
      }
    };
  }

  if (ruleName === RULES.DIFFERENT_SUM) {
    const groups = groupSequencesBy(allSequences, sequenceSum);
    const sums = [...groups.keys()];

    if (sums.length < PIECE_COUNT) {
      throw new Error(
        `Rule ${ruleName} needs at least ${PIECE_COUNT} distinct sums, but digits ${digits.join("")} only give ${sums.length}.`
      );
    }

    return {
      name: ruleName,
      digits,
      generatePieceSequences: (pieceCount) => shuffle(sums)
        .slice(0, pieceCount)
        .map((sum) => randomItem(groups.get(sum))),
      validatePieces: (pieces) => {
        const sums = pieceAggregates(pieces, digits, sequenceSum);

        return sums.length === pieces.length && new Set(sums).size === sums.length;
      }
    };
  }

  if (ruleName === RULES.SAME_PRODUCT) {
    const groups = groupSequencesBy(allSequences, sequenceProduct);

    return {
      name: ruleName,
      digits,
      generatePieceSequences: (pieceCount) => {
        const target = randomItem([...groups.keys()]);

        return repeatFromGroup(groups.get(target), pieceCount);
      },
      validatePieces: (pieces) => {
        const products = pieceAggregates(pieces, digits, sequenceProduct);

        return products.length === pieces.length &&
          products.every((product) => product === products[0]);
      }
    };
  }

  if (ruleName === RULES.SUM_LAST) {
    const sequences = allSequences.filter((sequence) => (
      sequenceSum(sequence.slice(0, 3)) === Number(sequence[3])
    ));

    if (sequences.length === 0) {
      throw new Error(`Rule ${ruleName} has no valid sequences for digits ${digits.join("")}.`);
    }

    return {
      name: ruleName,
      digits,
      generatePieceSequences: (pieceCount) => Array.from(
        { length: pieceCount },
        () => randomItem(sequences)
      ),
      validatePieces: (pieces) => pieces.every((values) => (
        values.every((value) => digits.includes(value)) &&
        sequenceSum(values.slice(0, 3)) === Number(values[3])
      ))
    };
  }

  if (ruleName === RULES.SUM_ANYWHERE) {
    const sequences = allSequences.filter(hasValueEqualToSumOfOthers);

    if (sequences.length === 0) {
      throw new Error(`Rule ${ruleName} has no valid sequences for digits ${digits.join("")}.`);
    }

    return {
      name: ruleName,
      digits,
      generatePieceSequences: (pieceCount) => Array.from(
        { length: pieceCount },
        () => randomItem(sequences)
      ),
      validatePieces: (pieces) => pieces.every((values) => (
        values.every((value) => digits.includes(value)) &&
        hasValueEqualToSumOfOthers(values)
      ))
    };
  }

  if (ruleName === RULES.VALUES_BETWEEN) {
    const sequences = allSequences.filter(hasMiddleValuesBetweenEnds);

    if (sequences.length === 0) {
      throw new Error(`Rule ${ruleName} has no valid sequences for digits ${digits.join("")}.`);
    }

    return {
      name: ruleName,
      digits,
      generatePieceSequences: (pieceCount) => Array.from(
        { length: pieceCount },
        () => randomItem(sequences)
      ),
      validatePieces: (pieces) => pieces.every((values) => (
        values.every((value) => digits.includes(value)) &&
        hasMiddleValuesBetweenEnds(values)
      ))
    };
  }

  if (ruleName === RULES.MEAN) {
    const sequences = allSequences.filter(hasExactMeanValue);

    if (sequences.length === 0) {
      throw new Error(`Rule ${ruleName} has no valid sequences for digits ${digits.join("")}.`);
    }

    return {
      name: ruleName,
      digits,
      generatePieceSequences: (pieceCount) => Array.from(
        { length: pieceCount },
        () => randomItem(sequences)
      ),
      validatePieces: (pieces) => pieces.every((values) => (
        values.every((value) => digits.includes(value)) &&
        hasExactMeanValue(values)
      ))
    };
  }

  throw new Error(`Unknown rule: ${ruleName}`);
}

function repeatFromGroup(group, count) {
  return Array.from({ length: count }, () => randomItem(group));
}

function pieceAggregates(pieces, digits, aggregate) {
  const aggregates = [];

  for (const values of pieces) {
    if (!values.every((value) => digits.includes(value))) {
      return [];
    }

    aggregates.push(aggregate(values));
  }

  return aggregates;
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
  const last = Number(values[3]);
  const low = Math.min(first, last);
  const high = Math.max(first, last);

  return values.length === 4 &&
    first !== last &&
    Number(values[1]) > low &&
    Number(values[1]) < high &&
    Number(values[2]) > low &&
    Number(values[2]) < high;
}

function exactMean(values) {
  const total = sequenceSum(values);

  return total % values.length === 0 ? total / values.length : null;
}

function hasExactMeanValue(values) {
  const mean = exactMean(values);

  return mean !== null && values.some((value) => Number(value) === mean);
}

function sequenceSum(sequence) {
  return sequence.reduce((total, value) => total + Number(value), 0);
}

function sequenceProduct(sequence) {
  return sequence.reduce((total, value) => total * Number(value), 1);
}

function groupSequencesBy(sequences, keyFn) {
  const groups = new Map();

  sequences.forEach((sequence) => {
    const key = keyFn(sequence);
    const group = groups.get(key) || [];

    group.push(sequence);
    groups.set(key, group);
  });

  return groups;
}

function buildAllSequences(digits, length) {
  if (length === 0) {
    return [[]];
  }

  return digits.flatMap((digit) =>
    buildAllSequences(digits, length - 1).map((suffix) => [digit, ...suffix])
  );
}

function compactTilingToPieces(tiling) {
  const pieces = Array.from({ length: PIECE_COUNT }, () => []);

  [...tiling].forEach((label, index) => {
    const pieceIndex = parseInt(label, 36);

    if (!pieces[pieceIndex]) {
      throw new Error(`Unexpected piece label ${label} in tiling ${tiling}`);
    }

    pieces[pieceIndex].push(index);
  });

  return pieces;
}

function printSummary(solutionCounts, attempts) {
  const sortedCounts = solutionCounts.slice().sort((a, b) => a - b);
  const histogram = new Map();

  solutionCounts.forEach((count) => {
    histogram.set(count, (histogram.get(count) || 0) + 1);
  });

  console.log(`size=${ROWS}x${COLS}`);
  console.log(`rule=${rule.name}`);
  console.log(`digits=${rule.digits.join("")}`);
  console.log(`tilings=${tilings.length}`);
  console.log(`runs=${RUNS}`);
  console.log(`acceptedOnly=${OPTIONS.acceptedOnly}`);
  console.log(`min=${sortedCounts[0]}`);
  console.log(`median=${sortedCounts[Math.floor(sortedCounts.length / 2)]}`);
  console.log(`mean=${mean(solutionCounts).toFixed(2)}`);
  console.log(`max=${sortedCounts[sortedCounts.length - 1]}`);
  console.log(`meanAttempts=${mean(attempts).toFixed(2)}`);
  console.log("histogram=" + [...histogram.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([count, frequency]) => `${count}:${frequency}`)
    .join(","));
}

function readOptions() {
  const args = process.argv.slice(2);
  const runs = Number(args[0] && !args[0].startsWith("--") ? args[0] : 10);
  const ruleName = normalizeRule(readFlag(args, "--rule") || RULES.NONDECREASING);
  const digits = readDigits(readFlag(args, "--digits"), ruleName);

  return {
    runs,
    summaryOnly: args.includes("--summary"),
    acceptedOnly: args.includes("--accepted-only"),
    maxAttempts: Number(readFlag(args, "--max-attempts") || DEFAULT_MAX_ATTEMPTS),
    rule: ruleName,
    digits,
    size: readSizeArg(args)
  };
}

function normalizeRule(name) {
  const normalized = RULE_ALIASES.get(String(name).toLowerCase());

  if (!normalized) {
    throw new Error(`Unknown --rule ${name}.`);
  }

  return normalized;
}

function readDigits(text, ruleName) {
  if (!text) {
    return [RULES.SAME_PRODUCT, RULES.SUM_LAST, RULES.SUM_ANYWHERE].includes(ruleName)
      ? ["1", "2", "3", "4", "5", "6"]
      : [RULES.VALUES_BETWEEN, RULES.MEAN].includes(ruleName)
        ? ["1", "2", "3", "4", "5", "6", "7", "8"]
      : ["1", "2", "3", "4"];
  }

  const rangeMatch = /^(\d+)-(\d+)$/.exec(text);

  if (rangeMatch) {
    const start = Number(rangeMatch[1]);
    const end = Number(rangeMatch[2]);

    if (end < start) {
      throw new Error(`Invalid digit range: ${text}`);
    }

    return Array.from({ length: end - start + 1 }, (_, index) => String(start + index));
  }

  const digits = text.split(",").map((digit) => digit.trim()).filter(Boolean);

  if (digits.length === 0 || digits.some((digit) => !/^\d+$/.test(digit))) {
    throw new Error(`Invalid --digits value: ${text}`);
  }

  return digits;
}

function readFlag(args, flag) {
  const index = args.indexOf(flag);

  return index === -1 ? null : args[index + 1];
}

function readSizeArg(args) {
  const sizeText = readFlag(args, "--size") || "4x4";
  const match = /^(\d+)x(\d+)$/i.exec(sizeText || "");

  if (!match) {
    throw new Error("Expected --size in RxC format, for example --size 4x5.");
  }

  const rows = Number(match[1]);
  const cols = Number(match[2]);

  if (rows * cols % PIECE_SIZE !== 0) {
    throw new Error(`Board size ${sizeText} is not divisible into tetrominoes.`);
  }

  return { rows, cols };
}

function loadTilings(rows, cols) {
  const canonicalRows = Math.min(rows, cols);
  const canonicalCols = Math.max(rows, cols);
  const tilingsPath = path.join(
    __dirname,
    "..",
    "data",
    `tetromino-tilings-${canonicalRows}x${canonicalCols}.txt`
  );
  const loadedTilings = fs.readFileSync(tilingsPath, "utf8")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  return rows <= cols
    ? loadedTilings
    : loadedTilings.map((tiling) => transposeTiling(tiling, canonicalRows, canonicalCols));
}

function transposeTiling(tiling, rows, cols) {
  const transposed = Array.from({ length: tiling.length });

  [...tiling].forEach((label, index) => {
    const row = Math.floor(index / cols);
    const col = index % cols;
    transposed[col * rows + row] = label;
  });

  return transposed.join("");
}

function randomItem(items) {
  return items[Math.floor(Math.random() * items.length)];
}

function shuffle(items) {
  const shuffled = [...items];

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }

  return shuffled;
}

function mean(values) {
  return values.reduce((total, value) => total + value, 0) / values.length;
}
