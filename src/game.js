const DEFAULT_PIECE_SIZE = 4;
const GROUP_COLOR_COUNT = 9;
const SESSION_STORAGE_KEY = "digitiler.currentPuzzle.v1";
const CONFIG = window.DigitilerConfig || {};
const URL_FLAGS = new URLSearchParams(window.location.search);
const ENABLE_6X6 = CONFIG.enable6x6 === true || parseUrlBoolean(URL_FLAGS.get("enable6x6"), false);
const DEFAULT_RULESET = "sum-last";
const SOLUTION_CHEAT_CODE = "qqq";
const SOLUTION_MULTIPLIERS = [3, 7, 9];
const SOLUTION_MULTIPLIER_INVERSES = {
  3: 7,
  7: 3,
  9: 9
};
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
  }
};
const RULESET_ORDER = [
  "nondecreasing",
  "sum-last",
  "sum-anywhere",
  "values-between"
];
const RULESET_SYMBOLS = {
  nondecreasing: "↗",
  "sum-last": "+!",
  "sum-anywhere": "+?",
  "values-between": "]:["
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
  ["between", "values-between"]
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
const DEFAULT_SIZE = modeBoardSizes(DEFAULT_PIECE_SIZE)[0];
const state = {
  pieceSize: DEFAULT_PIECE_SIZE,
  rows: DEFAULT_SIZE.rows,
  cols: DEFAULT_SIZE.cols,
  board: [],
  selection: [],
  locked: new Map(),
  moves: [],
  activeMoveIndex: null,
  dragSelection: null,
  invalidSelection: false,
  invalidClearTimer: null,
  isIntro: false,
  hasTileSelectionStarted: false,
  cheatBuffer: "",
  ruleSetKey: DEFAULT_RULESET,
  includeZero: false,
  timerMode: TIMER_MODE.TIMED,
  startedAt: null,
  completedAt: null,
  solutionTiling: null,
  ruleModelValues: [],
  ruleModelTargetIndex: null,
  ruleModelShape: [],
  tilingsBySize: { ...FALLBACK_TILINGS },
  loadedTilingSizes: new Set(),
  tilingLoadPromises: new Map()
};

const elements = {
  playArea: document.querySelector(".play-area"),
  board: document.querySelector("#board"),
  selectionLines: document.querySelector("#selection-lines"),
  completionMessage: document.querySelector("#completion-message"),
  settingsButton: document.querySelector("#settings-button"),
  settingsPanel: document.querySelector("#settings-panel"),
  settingsSummary: document.querySelector("#settings-summary"),
  boardSizeOptions: document.querySelector("#board-size-options"),
  pieceSizeInputs: document.querySelectorAll("input[name='piece-size']"),
  timerModeInput: document.querySelector("#untimed-mode"),
  infoButton: document.querySelector("#info-button"),
  infoPanel: document.querySelector("#info-panel"),
  shareButton: document.querySelector("#share-button"),
  pieceSizeButton: document.querySelector("#piece-size-button"),
  ruleSetButton: document.querySelector("#rule-set-button"),
  keyboardPanel: document.querySelector("#keyboard-panel"),
  printPanel: document.querySelector("#print-panel"),
  printGrid: document.querySelector("#print-grid"),
  restartButton: document.querySelector("#restart-button"),
  newButton: document.querySelector("#new-button"),
  pentominoButton: document.querySelector("#pentomino-button"),
  title: document.querySelector("#title"),
  infoTitle: document.querySelector("#info-title"),
  pieceShapeRule: document.querySelector("#piece-shape-rule"),
  readingOrderRule: document.querySelector("#reading-order-rule"),
  ruleDescription: document.querySelector("#rule-description"),
  exampleValidStraight: document.querySelector("#example-valid-straight"),
  exampleValidBent: document.querySelector("#example-valid-bent"),
  exampleInvalidDisconnected: document.querySelector("#example-invalid-disconnected"),
  exampleInvalidShort: document.querySelector("#example-invalid-short")
};

configureBoardSizeControls();
elements.settingsButton.addEventListener("click", toggleSettingsPanel);
elements.pieceSizeInputs.forEach((input) => input.addEventListener("change", updatePieceSize));
elements.timerModeInput.addEventListener("change", updateTimerMode);
elements.infoButton.addEventListener("click", toggleInfoPanel);
elements.shareButton.addEventListener("click", copyPuzzleToClipboard);
elements.pieceSizeButton.addEventListener("click", switchPieceSizeMode);
elements.ruleSetButton.addEventListener("click", cycleRuleSet);
elements.restartButton.addEventListener("click", restartGame);
elements.newButton.addEventListener("click", startNewGame);
elements.pentominoButton.addEventListener("click", startPentominoGame);
document.addEventListener("keydown", handleKeydown);
document.addEventListener("click", closePanelsFromOutside);
document.addEventListener("pointermove", handleDragMove);
document.addEventListener("pointerup", endDragSelection);
document.addEventListener("pointercancel", endDragSelection);
window.addEventListener("resize", render);

startGame();

async function startGame() {
  try {
    const urlLoadResult = loadPuzzleFromUrl();

    if (urlLoadResult === "generate") {
      await loadTilingDataForSize(state.rows, state.cols);
      generatePuzzle();
      updateAddressBar();
    } else if (!urlLoadResult && !restoreStoredPuzzle()) {
      showIntro();
    }

    syncSettingsControls();
    renderExampleGrids();
    render();
  } catch (error) {
    showStartupError(error);
    throw error;
  }
}

function showStartupError(error) {
  elements.completionMessage.classList.add("is-complete");
  elements.completionMessage.textContent = `Startup error: ${error.message}`;
}

function showIntro() {
  state.isIntro = true;
  state.pieceSize = DEFAULT_PIECE_SIZE;
  state.rows = 4;
  state.cols = 4;
  state.board = [];
  state.selection = [];
  state.locked.clear();
  state.moves = [];
  state.activeMoveIndex = null;
  state.dragSelection = null;
  state.invalidSelection = false;
  state.hasTileSelectionStarted = false;
  state.startedAt = null;
  state.completedAt = null;
  state.solutionTiling = null;
  clearInvalidTimer();
  updateModeText();
  syncSettingsControls();
}

async function loadTilingDataForSize(rows, cols) {
  const pieceSize = state.pieceSize;

  if (!isSupportedSize(rows, cols, pieceSize)) {
    return;
  }

  if (state.loadedTilingSizes.has(tilingStoreKey(pieceSize, rows, cols))) {
    return;
  }

  const canonicalKey = canonicalSizeKey(rows, cols);
  const loadKey = tilingStoreKey(pieceSize, ...canonicalKey.split("x").map(Number));
  const mode = MODES[pieceSize];

  if (!state.tilingLoadPromises.has(loadKey)) {
    state.tilingLoadPromises.set(
      loadKey,
      fetchText(`data/${mode.tilingPrefix}-tilings-${canonicalKey}.txt`)
        .then(parseTilingText)
        .then((tilings) => {
          if (tilings.length > 0) {
            const [canonicalRows, canonicalCols] = canonicalKey.split("x").map(Number);
            storeTilings(pieceSize, canonicalRows, canonicalCols, tilings);
          }
        })
    );
  }

  await state.tilingLoadPromises.get(loadKey);
}

async function fetchText(url) {
  try {
    const response = await fetch(url);
    return response.ok ? response.text() : null;
  } catch {
    return null;
  }
}

function parseTilingText(text) {
  return (text || "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function storeTilings(pieceSize, rows, cols, tilings) {
  state.tilingsBySize[tilingStoreKey(pieceSize, rows, cols)] = tilings;
  state.loadedTilingSizes.add(tilingStoreKey(pieceSize, rows, cols));

  if (rows !== cols && isSupportedSize(cols, rows, pieceSize)) {
    state.tilingsBySize[tilingStoreKey(pieceSize, cols, rows)] = tilings.map((tiling) =>
      transposeTiling(tiling, rows, cols)
    );
    state.loadedTilingSizes.add(tilingStoreKey(pieceSize, cols, rows));
  }
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

function generatePuzzle() {
  let candidate = null;
  state.isIntro = false;

  for (let attempt = 1; attempt <= MAX_GENERATION_ATTEMPTS; attempt += 1) {
    candidate = generateCandidateBoard();

    if (countValidSolutions(candidate.board, MAX_ALLOWED_SOLUTIONS + 1) <= MAX_ALLOWED_SOLUTIONS) {
      state.board = candidate.board;
      state.solutionTiling = candidate.solutionTiling;
      resetProgress();
      saveCurrentPuzzle();
      return;
    }
  }

  throw new Error(`Could not generate a puzzle with ${MAX_ALLOWED_SOLUTIONS} or fewer solutions.`);
}

function generateCandidateBoard() {
  const board = makeEmptyBoard();
  const tiling = randomItem(currentTilings());
  const pieces = tiling ? compactTilingToPieces(tiling) : fallbackPieces();
  const pieceSequences = currentRuleSet().generatePieceSequences(pieces.length, state.pieceSize);

  pieces.forEach((piece, pieceIndex) => {
    const cells = piece
      .map((id) => getCellByIdFromBoard(board, id))
      .sort(compareCells);
    const values = pieceSequences[pieceIndex];

    cells.forEach((cell, index) => {
      cell.value = values[index];
    });
  });

  return {
    board,
    solutionTiling: tiling || makeFallbackTiling()
  };
}

function makeEmptyBoard() {
  return Array.from({ length: boardCellCount() }, (_, index) => ({
    id: cellId(Math.floor(index / state.cols), index % state.cols),
    row: Math.floor(index / state.cols),
    col: index % state.cols,
    value: ""
  }));
}

function countValidSolutions(board, stopAt = Infinity) {
  let count = 0;

  for (const tiling of currentTilings()) {
    if (isValidTilingSolution(board, tiling)) {
      count += 1;

      if (count >= stopAt) {
        return count;
      }
    }
  }

  return count;
}

function isValidTilingSolution(board, tiling) {
  const pieceValues = compactTilingToPieces(tiling).map((piece) =>
    piece
      .map((id) => getCellByIdFromBoard(board, id))
      .sort(compareCells)
      .map((cell) => cell.value)
  );

  return currentRuleSet().validateSolution(pieceValues);
}

function currentTilings() {
  return state.tilingsBySize[tilingStoreKey(state.pieceSize, state.rows, state.cols)] || [];
}

function compactTilingToPieces(tiling) {
  const pieces = Array.from({ length: pieceCount() }, () => []);

  [...tiling].forEach((label, index) => {
    const pieceIndex = parseInt(label, 36);

    if (pieces[pieceIndex]) {
      pieces[pieceIndex].push(cellId(Math.floor(index / state.cols), index % state.cols));
    }
  });

  return pieces;
}

function fallbackPieces() {
  return Array.from({ length: pieceCount() }, (_, pieceIndex) => {
    const start = pieceIndex * state.pieceSize;

    return Array.from({ length: state.pieceSize }, (__, offset) => {
      const index = start + offset;
      return cellId(Math.floor(index / state.cols), index % state.cols);
    });
  });
}

function makeFallbackTiling() {
  return Array.from({ length: boardCellCount() }, (_, index) =>
    String(Math.floor(index / state.pieceSize))
  ).join("");
}

function loadPuzzleFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const pieceSize = readUrlPieceSize(params);
  const size = parseSizeKey(params.get("size"), pieceSize);
  const grid = params.get("grid");

  setPieceSize(pieceSize, { regenerate: false });
  setRuleSet(readUrlRuleSet(params), { regenerate: false });
  setBoardDimensions(size?.rows || defaultSize().rows, size?.cols || defaultSize().cols);

  state.includeZero = false;
  state.timerMode = readUrlTimerMode(params);

  if (!grid) {
    return hasUrlGenerationSettings(params) ? "generate" : false;
  }

  if (!isValidGridString(grid)) {
    return false;
  }

  state.board = makeBoardFromGrid(grid);
  state.solutionTiling = readUrlSolution(params, grid);
  resetProgress();
  saveCurrentPuzzle();
  return true;
}

function hasUrlGenerationSettings(params) {
  return [
    "size",
    "pieceSize",
    "pieces",
    "mode",
    "rule",
    "timed",
    "untimed"
  ].some((key) => params.has(key));
}

function readUrlPieceSize(params) {
  const explicitMode = Number(params.get("pieceSize") || params.get("pieces") || params.get("mode"));

  return MODES[explicitMode] ? explicitMode : DEFAULT_PIECE_SIZE;
}

function readUrlRuleSet(params) {
  const ruleSetKey = params.get("rule");
  const normalizedRuleSetKey = normalizeRuleSetKey(ruleSetKey);

  return isKnownRuleSet(normalizedRuleSetKey) ? normalizedRuleSetKey : DEFAULT_RULESET;
}

function readUrlTimerMode(params) {
  if (params.has("timed")) {
    return parseUrlBoolean(params.get("timed"), true)
      ? TIMER_MODE.TIMED
      : TIMER_MODE.UNTIMED;
  }

  return parseUrlBoolean(params.get("untimed"), false)
    ? TIMER_MODE.UNTIMED
    : TIMER_MODE.TIMED;
}

function readUrlSolution(params, grid) {
  const encodedSolution = params.get("sol");
  const tiling = decodeSolutionTiling(encodedSolution, grid);

  return isValidSolutionTiling(tiling, state.rows, state.cols, state.pieceSize) &&
    isValidTilingSolution(makeBoardFromGrid(grid), tiling)
    ? tiling
    : null;
}

function parseUrlBoolean(value, fallback) {
  if (value === null) {
    return fallback;
  }

  return ["1", "t", "true", "yes", "on"].includes(value.toLowerCase());
}

function restoreStoredPuzzle() {
  try {
    const stored = JSON.parse(sessionStorage.getItem(SESSION_STORAGE_KEY));

    if (!isStoredPuzzle(stored)) {
      return false;
    }

    setPieceSize(stored.pieceSize || DEFAULT_PIECE_SIZE, { regenerate: false });
    setRuleSet(stored.ruleSetKey || DEFAULT_RULESET, { regenerate: false });
    setBoardDimensions(stored.rows, stored.cols);
    state.includeZero = stored.includeZero;
    state.timerMode = stored.timerMode || TIMER_MODE.TIMED;
    state.board = makeBoardFromGrid(stored.grid);
    state.solutionTiling = stored.solutionTiling &&
      isValidTilingSolution(state.board, stored.solutionTiling)
      ? stored.solutionTiling
      : null;
    state.startedAt = stored.startedAt || Date.now();
    resetProgress({ resetTimer: false });
    saveCurrentPuzzle();
    return true;
  } catch {
    return false;
  }
}

function saveCurrentPuzzle() {
  try {
    sessionStorage.setItem(
      SESSION_STORAGE_KEY,
      JSON.stringify({
        grid: makeGridString(),
        pieceSize: state.pieceSize,
        rows: state.rows,
        cols: state.cols,
        includeZero: state.includeZero,
        ruleSetKey: state.ruleSetKey,
        solutionTiling: state.solutionTiling,
        timerMode: state.timerMode,
        startedAt: state.startedAt
      })
    );
  } catch {
    // Storage can be unavailable in some browser privacy modes.
  }
}

function isStoredPuzzle(stored) {
  const pieceSize = stored?.pieceSize || DEFAULT_PIECE_SIZE;
  const expectedCellCount = stored?.rows * stored?.cols;

  return (
    stored &&
    MODES[pieceSize] &&
    isSupportedSize(stored.rows, stored.cols, pieceSize) &&
    typeof stored.grid === "string" &&
    isKnownRuleSet(stored.ruleSetKey || DEFAULT_RULESET) &&
    isValidGridString(stored.grid, stored.ruleSetKey || DEFAULT_RULESET, expectedCellCount, pieceSize) &&
    (
      stored.solutionTiling === undefined ||
      stored.solutionTiling === null ||
      isValidSolutionTiling(stored.solutionTiling, stored.rows, stored.cols, pieceSize)
    ) &&
    typeof stored.includeZero === "boolean" &&
    (stored.timerMode === undefined || Object.values(TIMER_MODE).includes(stored.timerMode)) &&
    (stored.startedAt === undefined || Number.isFinite(stored.startedAt))
  );
}

function makeBoardFromGrid(grid) {
  return Array.from({ length: boardCellCount() }, (_, index) => ({
    id: cellId(Math.floor(index / state.cols), index % state.cols),
    row: Math.floor(index / state.cols),
    col: index % state.cols,
    value: grid[index]
  }));
}

function resetProgress({ resetTimer = true } = {}) {
  state.selection = [];
  state.locked.clear();
  state.moves = [];
  state.activeMoveIndex = null;
  state.dragSelection = null;
  state.invalidSelection = false;
  state.hasTileSelectionStarted = false;
  state.startedAt = resetTimer || state.startedAt === null ? Date.now() : state.startedAt;
  state.completedAt = null;
  setRuleModel();
  clearInvalidTimer();
}

function render() {
  elements.board.innerHTML = "";
  elements.playArea.classList.toggle("is-intro", state.isIntro);
  elements.board.hidden = state.isIntro;
  elements.completionMessage.hidden = state.isIntro;
  elements.shareButton.hidden = state.isIntro;

  if (state.isIntro) {
    elements.selectionLines.style.removeProperty("--selection-space");
    renderSelectionLines();
    renderToolbar();
    renderPieceSizeButton();
    renderRuleSetButton();
    return;
  }

  elements.completionMessage.hidden = false;
  elements.shareButton.hidden = false;
  elements.board.style.gridTemplateColumns = `repeat(${state.cols}, minmax(0, 1fr))`;
  elements.board.style.aspectRatio = `${state.cols} / ${state.rows}`;
  elements.board.style.setProperty("--board-max-width", `${boardMaxWidth()}px`);
  elements.board.style.setProperty("--tile-font-size", `${tileFontSize()}rem`);
  elements.board.style.setProperty("--tile-radius", `${tileRadius()}px`);
  elements.board.style.setProperty("--tile-inset", `${tileInset()}px`);
  setSelectionLayoutSpace();

  state.board.forEach((cell) => {
    const button = document.createElement("button");
    const lockedMoveIndex = state.locked.get(cell.id);

    button.type = "button";
    button.className = getTileClassName(cell, lockedMoveIndex);
    button.textContent = cell.value;
    button.dataset.id = cell.id;
    button.setAttribute("aria-label", getTileAriaLabel(cell, lockedMoveIndex));
    button.setAttribute("aria-disabled", String(lockedMoveIndex !== undefined));
    button.addEventListener("pointerdown", (event) => startDragSelection(cell, event));
    button.addEventListener("pointerenter", () => extendDragSelection(cell));
    button.addEventListener("pointerup", (event) => endDragSelection(event));
    button.addEventListener("pointercancel", (event) => endDragSelection(event));
    button.addEventListener("click", () => selectCell(cell));
    elements.board.append(button);
  });

  renderSelectionLines();
  renderToolbar();
  renderPieceSizeButton();
  renderRuleSetButton();
}

function renderPieceSizeButton() {
  const nextPieceSize = alternatePieceSize();

  elements.pieceSizeButton.hidden = true;
  elements.pieceSizeButton.textContent = String(state.pieceSize);
  elements.pieceSizeButton.setAttribute("aria-label", `Switch to ${nextPieceSize}-tile pieces`);
}

function renderRuleSetButton() {
  const nextKey = nextRuleSetKey();

  elements.ruleSetButton.hidden = state.isIntro;
  elements.ruleSetButton.textContent = RULESET_SYMBOLS[state.ruleSetKey] || "?";
  elements.ruleSetButton.setAttribute(
    "aria-label",
    `Switch to ${RULESETS[nextKey].label}`
  );
}

function renderToolbar() {
  const toolbar = elements.newButton.closest(".toolbar");

  elements.restartButton.hidden = state.isIntro;
  elements.pentominoButton.hidden = !state.isIntro;
  toolbar.classList.toggle("is-intro", state.isIntro);

  if (state.isIntro) {
    elements.newButton.setAttribute("aria-label", "Open tetromino game");
    elements.pentominoButton.setAttribute("aria-label", "Start pentomino game");
    renderIntroModeButton(
      elements.newButton,
      [
        { value: "O", row: 1, col: 1 },
        { value: "P", row: 1, col: 2 },
        { value: "E", row: 2, col: 2 },
        { value: "N", row: 2, col: 3 }
      ],
      "intro-tiles-open",
      3
    );
    renderIntroModeButton(
      elements.pentominoButton,
      [
        { value: "S", row: 1, col: 1 },
        { value: "T", row: 1, col: 2 },
        { value: "A", row: 1, col: 3 },
        { value: "R", row: 2, col: 2 },
        { value: "T", row: 2, col: 3 }
      ],
      "intro-tiles-start",
      3
    );
    return;
  }

  elements.newButton.textContent = "New";
  elements.newButton.setAttribute("aria-label", "New puzzle");
}

function renderIntroModeButton(button, cells, className, cols) {
  button.textContent = "";

  const tileDisplay = document.createElement("span");
  tileDisplay.className = `intro-tiles ${className}`;
  tileDisplay.style.setProperty("--intro-cols", String(cols));
  tileDisplay.setAttribute("aria-hidden", "true");

  cells.forEach(({ value, row, col }) => {
    const tile = document.createElement("span");

    tile.className = "intro-tile";
    tile.textContent = value;
    tile.style.gridArea = `${row} / ${col}`;
    tileDisplay.append(tile);
  });

  button.append(tileDisplay);
}

function renderSelectionLines() {
  elements.selectionLines.innerHTML = "";

  if (state.isIntro) {
    elements.selectionLines.className = "selection-lines is-intro";
    renderIntroRulePicker();
    renderCompletionMessage();
    return;
  }

  const showRuleModel = shouldShowRuleModel();

  elements.selectionLines.className = "selection-lines";
  elements.selectionLines.classList.toggle("is-complete", isPuzzleComplete());
  elements.selectionLines.classList.toggle("is-complete-medium", isPuzzleComplete() && pieceCount() === 6);
  elements.selectionLines.classList.toggle("is-complete-large", isPuzzleComplete() && pieceCount() >= 9);
  elements.selectionLines.classList.toggle(
    "is-in-progress-large",
    !showRuleModel && !isPuzzleComplete() && pieceCount() >= 6
  );
  elements.selectionLines.classList.toggle("is-rule-model", showRuleModel);

  if (showRuleModel) {
    renderRuleModel();
    renderCompletionMessage();
    return;
  }

  state.moves.forEach((move, index) => {
    const row = document.createElement("button");

    row.type = "button";
    row.className = getSelectionRowClassName(index);
    row.setAttribute("aria-label", `Selection ${index + 1}: ${move.values}. Press Backspace to delete.`);
    row.addEventListener("click", () => selectMoveLine(index));

    if (isPuzzleComplete()) {
      row.textContent = move.values;
    } else {
      [...move.values].forEach((value, valueIndex) => {
        row.append(makeMiniTile(
          value,
          [
            lockGroupClass(index),
            move.targetValueIndex === valueIndex ? "is-rule-target" : null
          ].filter(Boolean).join(" ")
        ));
      });
    }

    elements.selectionLines.append(row);
  });

  if (!isPuzzleComplete() && state.selection.length > 0) {
    const row = document.createElement("div");
    row.className = state.invalidSelection
      ? "selection-row is-current is-invalid"
      : "selection-row is-current";
    const values = readSelectionValues(state.selection);

    row.setAttribute("aria-label", `Current selection: ${values}`);

    [...values].forEach((value) => {
      row.append(makeMiniTile(value, "is-current"));
    });

    elements.selectionLines.append(row);
  }

  renderCompletionMessage();
}

function renderIntroRulePicker() {
  const grid = document.createElement("div");

  grid.className = "intro-rule-grid";

  INTRO_RULE_CARDS.forEach((card) => {
    const button = document.createElement("button");
    const tile = makeIntroRuleTile(card);
    const label = document.createElement("span");
    const icon = document.createElement("strong");

    label.className = "intro-rule-card-label";
    icon.textContent = RULESET_SYMBOLS[card.key] || "?";
    label.append(document.createTextNode(RULESETS[card.key].title), icon);

    button.type = "button";
    button.className = card.key === state.ruleSetKey
      ? "intro-rule-card is-selected"
      : "intro-rule-card";
    button.setAttribute("aria-label", `Choose ${RULESETS[card.key].label}`);
    button.append(tile, label);
    button.addEventListener("click", () => {
      state.ruleSetKey = card.key;
      syncSettingsControls();
      renderExampleGrids();
      render();
    });
    grid.append(button);
  });

  elements.selectionLines.append(grid);
}

function makeIntroRuleTile(card) {
  const tile = document.createElement("span");
  const rows = Math.max(...card.shape.map((cell) => cell.row)) + 1;
  const cols = Math.max(...card.shape.map((cell) => cell.col)) + 1;
  const ruleSet = RULESETS[card.key];
  const targetIndex = ruleSet.targetIndex?.(card.values);

  tile.className = "intro-rule-tile";
  tile.style.setProperty("--intro-rule-rows", String(rows));
  tile.style.setProperty("--intro-rule-cols", String(cols));
  tile.setAttribute("aria-hidden", "true");

  card.shape.forEach((position, index) => {
    const cell = document.createElement("span");

    cell.className = targetIndex === index ? "is-rule-target" : "";
    cell.textContent = card.values[index];
    cell.style.gridArea = `${position.row + 1} / ${position.col + 1}`;
    tile.append(cell);
  });

  return tile;
}

function renderRuleModel() {
  const label = document.createElement("div");
  const body = document.createElement("div");
  const divider = document.createElement("div");
  const row = document.createElement("div");

  label.className = "rule-model-label";
  label.textContent = currentRuleSet().title || currentRuleSet().label;
  body.className = "rule-model-body";
  divider.className = "rule-model-divider";
  row.className = "selection-row is-rule-model";

  state.ruleModelValues.forEach((value, index) => {
    row.append(makeMiniTile(
      value,
      state.ruleModelTargetIndex === index ? "is-rule-target" : ""
    ));
  });

  body.append(makeRuleModelTile(), divider, row);
  elements.selectionLines.append(label, body);
}

function makeRuleModelTile() {
  const tile = document.createElement("div");
  const rows = Math.max(...state.ruleModelShape.map((cell) => cell.row)) + 1;
  const cols = Math.max(...state.ruleModelShape.map((cell) => cell.col)) + 1;

  tile.className = "rule-model-tile";
  tile.style.setProperty("--model-rows", String(rows));
  tile.style.setProperty("--model-cols", String(cols));
  tile.setAttribute("aria-hidden", "true");

  state.ruleModelShape.forEach((position, index) => {
    const cell = document.createElement("span");

    cell.className = state.ruleModelTargetIndex === index
      ? "rule-model-cell is-rule-target"
      : "rule-model-cell";
    cell.textContent = state.ruleModelValues[index];
    cell.style.gridArea = `${position.row + 1} / ${position.col + 1}`;
    tile.append(cell);
  });

  return tile;
}

function shouldShowRuleModel() {
  return !state.hasTileSelectionStarted &&
    !isPuzzleComplete() &&
    state.selection.length === 0 &&
    state.moves.length === 0;
}

function setRuleModel() {
  const ruleSet = currentRuleSet();
  const values = ruleSet.generatePieceSequences(1, state.pieceSize)[0] || [];
  const targetIndex = ruleSet.targetIndex?.(values);
  const shapes = state.pieceSize === 5 ? PENTOMINO_RULE_MODEL_SHAPES : RULE_MODEL_SHAPES;

  state.ruleModelValues = values;
  state.ruleModelTargetIndex = targetIndex ?? null;
  state.ruleModelShape = randomItem(shapes).slice().sort(compareCells);
}

function makeMiniTile(value, extraClassName) {
  const tile = document.createElement("span");

  tile.className = ["mini-tile", extraClassName].filter(Boolean).join(" ");
  tile.textContent = value;
  tile.setAttribute("aria-hidden", "true");

  return tile;
}

function getSelectionRowClassName(index) {
  const classes = ["selection-row", "is-complete", lockGroupClass(index)];

  if (state.activeMoveIndex === index) {
    classes.push("is-active");
  }

  return classes.join(" ");
}

function startDragSelection(cell, event) {
  if (event.pointerType === "mouse" && event.button !== 0) {
    return;
  }

  if (event.pointerType !== "mouse" && state.selection.includes(cell.id)) {
    handleSelectedTileTap(cell, event);
    return;
  }

  if (event.pointerType !== "mouse" && state.locked.has(cell.id)) {
    handleLockedTileTap(cell, event);
    return;
  }

  if (state.locked.has(cell.id) || state.selection.includes(cell.id)) {
    return;
  }

  state.dragSelection = {
    pointerId: event.pointerId,
    moved: false
  };

  event.preventDefault();
  event.currentTarget.setPointerCapture(event.pointerId);
  addCellToSelection(cell);
}

function handleSelectedTileTap(cell, event) {
  event.preventDefault();
  state.dragSelection = null;
  deselectSelectedCell(cell);
}

function handleLockedTileTap(cell, event) {
  const lockedMoveIndex = state.locked.get(cell.id);

  event.preventDefault();
  state.dragSelection = null;

  if (lockedMoveIndex === undefined) {
    return;
  }

  if (isDeleteAnchorCell(cell, lockedMoveIndex)) {
    deleteMove(lockedMoveIndex);
    return;
  }

  state.selection = [];
  state.activeMoveIndex = lockedMoveIndex;
  render();
}

function handleDragMove(event) {
  if (!state.dragSelection || state.dragSelection.pointerId !== event.pointerId) {
    return;
  }

  const tile = document.elementFromPoint(event.clientX, event.clientY)?.closest(".tile");

  if (!tile) {
    return;
  }

  const cell = getCellById(tile.dataset.id);

  if (cell) {
    extendDragSelection(cell);
  }
}

function extendDragSelection(cell) {
  if (!state.dragSelection || state.locked.has(cell.id)) {
    return;
  }

  state.dragSelection.moved = true;
  addCellToSelection(cell);
}

function endDragSelection(event) {
  if (!state.dragSelection || state.dragSelection.pointerId !== event.pointerId) {
    return;
  }

  state.dragSelection = null;
}

function selectCell(cell) {
  if (state.dragSelection?.moved) {
    state.dragSelection = null;
    return;
  }

  if (state.selection.includes(cell.id)) {
    deselectSelectedCell(cell);
    return;
  }

  const lockedMoveIndex = state.locked.get(cell.id);

  if (lockedMoveIndex !== undefined) {
    handleLockedTileClick(cell, lockedMoveIndex);
    return;
  }

  addCellToSelection(cell);
}

function handleLockedTileClick(cell, lockedMoveIndex) {
  if (state.activeMoveIndex === lockedMoveIndex && isDeleteAnchorCell(cell, lockedMoveIndex)) {
    deleteMove(lockedMoveIndex);
    return;
  }

  state.selection = [];
  state.activeMoveIndex = lockedMoveIndex;
  render();
}

function addCellToSelection(cell) {
  if (state.invalidSelection) {
    return;
  }

  state.activeMoveIndex = null;

  if (state.selection.includes(cell.id) || state.selection.length >= state.pieceSize) {
    return;
  }

  state.hasTileSelectionStarted = true;
  state.selection.push(cell.id);

  if (state.selection.length === state.pieceSize) {
    state.dragSelection = null;
    finishSelection();
    return;
  }

  render();
}

function finishSelection() {
  const result = validateSelection(state.selection);

  if (!result.valid) {
    rejectSelection();
    return;
  }

  const moveIndex = state.moves.length;
  const cells = [...state.selection];
  const values = readSelectionValues(cells);

  cells.forEach((id) => state.locked.set(id, moveIndex));
  state.moves.push(makeMove(cells, result));
  state.selection = [];
  state.activeMoveIndex = null;

  if (state.locked.size === boardCellCount()) {
    state.completedAt = Date.now();
  }

  render();
}

function makeMove(cells, result) {
  return {
    cells,
    values: readSelectionValues(cells),
    shape: result.shape,
    aggregate: result.aggregate,
    targetCellId: result.targetCellId,
    targetValueIndex: result.targetValueIndex
  };
}

function validateSelection(selection) {
  if (selection.length !== state.pieceSize) {
    return {
      valid: false,
      reason: `Choose exactly ${state.pieceSize} tiles.`,
      shape: "Incomplete",
      aggregate: 0,
      targetCellId: null
    };
  }

  if (new Set(selection).size !== selection.length) {
    return {
      valid: false,
      reason: "A tile can only be used once in a selection.",
      shape: "Repeated tile",
      aggregate: 0,
      targetCellId: null
    };
  }

  const cells = selection.map(getCellById);

  if (cells.some((cell) => !cell || state.locked.has(cell.id))) {
    return {
      valid: false,
      reason: "Locked tiles cannot be selected again.",
      shape: "Locked tile",
      aggregate: 0,
      targetCellId: null
    };
  }

  if (!isEdgeConnected(cells)) {
    return {
      valid: false,
      reason: `Those ${state.pieceSize} tiles are not edge-connected.`,
      shape: "Disconnected",
      aggregate: 0,
      targetCellId: null
    };
  }

  const values = readCellsValues(cells);
  const ruleSet = currentRuleSet();
  const existingPieces = state.moves.map((move) => [...move.values]);

  if (!ruleSet.validateMove(values, existingPieces)) {
    return {
      valid: false,
      reason: ruleReason(ruleSet, values),
      shape: "Out of order",
      aggregate: 0,
      targetCellId: null
    };
  }

  const sortedCells = [...cells].sort(compareCells);
  const targetIndex = ruleSet.targetIndex?.(values);

  return {
    valid: true,
    reason: `Valid ${currentMode().pieceName}.`,
    shape: classifyPolyomino(cells),
    aggregate: ruleSet.aggregate?.(values) ?? 0,
    targetCellId: targetIndex === null || targetIndex === undefined
      ? null
      : sortedCells[targetIndex]?.id || null,
    targetValueIndex: targetIndex ?? null
  };
}

function rejectSelection() {
  state.invalidSelection = true;
  state.dragSelection = null;
  clearInvalidTimer();
  render();

  state.invalidClearTimer = window.setTimeout(() => {
    state.selection = [];
    state.invalidSelection = false;
    state.invalidClearTimer = null;
    render();
  }, 360);
}

function clearInvalidTimer() {
  if (!state.invalidClearTimer) {
    return;
  }

  window.clearTimeout(state.invalidClearTimer);
  state.invalidClearTimer = null;
}

function deselectSelectedCell(cell) {
  const existingIndex = state.selection.indexOf(cell.id);

  if (existingIndex < 0) {
    return;
  }

  state.selection.splice(existingIndex, 1);
  render();
}

function selectMoveLine(index) {
  state.selection = [];
  state.activeMoveIndex = state.activeMoveIndex === index ? null : index;
  render();
}

function deleteMove(index) {
  const deletedMove = state.moves[index];

  if (!deletedMove) {
    return;
  }

  state.moves.splice(index, 1);
  state.selection = [];
  state.activeMoveIndex = null;
  state.dragSelection = null;
  state.invalidSelection = false;
  state.completedAt = null;
  clearInvalidTimer();
  rebuildLockedMap();
  render();
}

function restartGame() {
  resetProgress({ resetTimer: false });
  render();
}

function revealSolution() {
  if (!state.solutionTiling || !isValidTilingSolution(state.board, state.solutionTiling)) {
    return;
  }

  resetProgress({ resetTimer: false });
  clearInvalidTimer();

  compactTilingToPieces(state.solutionTiling).forEach((piece) => {
    const cells = piece
      .map(getCellById)
      .filter(Boolean)
      .sort(compareCells)
      .map((cell) => cell.id);
    const result = validateSelection(cells);

    if (result.valid) {
      state.moves.push(makeMove(cells, result));
      state.moves[state.moves.length - 1].cells.forEach((id) =>
        state.locked.set(id, state.moves.length - 1)
      );
    }
  });

  if (state.locked.size === boardCellCount()) {
    state.completedAt = Date.now();
  }

  render();
}

async function startNewGame() {
  if (state.isIntro) {
    await startGameWithPieceSize(DEFAULT_PIECE_SIZE);
    return;
  }

  await loadTilingDataForSize(state.rows, state.cols);
  generatePuzzle();
  updateAddressBar();
  render();
}

async function startPentominoGame() {
  await startGameWithPieceSize(5);
}

async function startGameWithPieceSize(pieceSize) {
  await setPieceSize(pieceSize, { regenerate: false });
  const size = defaultSize(pieceSize);

  setBoardDimensions(size.rows, size.cols);
  syncSettingsControls();
  await loadTilingDataForSize(state.rows, state.cols);
  generatePuzzle();
  updateAddressBar();
  renderExampleGrids();
  render();
}

async function updateBoardSize(event) {
  const size = parseSizeKey(event.target.value);

  if (size) {
    await setBoardSize(size.rows, size.cols);
  }
}

async function updatePieceSize(event) {
  await setPieceSize(Number(event.target.value));
}

function updateTimerMode(event) {
  setTimerMode(event.target.checked ? TIMER_MODE.UNTIMED : TIMER_MODE.TIMED);
}

async function switchPieceSizeMode() {
  await setPieceSize(alternatePieceSize());
}

async function cycleRuleSet() {
  await setRuleSet(nextRuleSetKey());
}

async function setBoardSize(rows, cols) {
  if (state.rows === rows && state.cols === cols) {
    return;
  }

  setBoardDimensions(rows, cols);
  syncSettingsControls();
  await loadTilingDataForSize(rows, cols);
  generatePuzzle();
  updateAddressBar();
  render();
}

async function setPieceSize(pieceSize, { regenerate = true } = {}) {
  if (!MODES[pieceSize]) {
    return;
  }

  const sizeStillWorks = isSupportedSize(state.rows, state.cols, pieceSize);

  state.pieceSize = pieceSize;

  if (!sizeStillWorks) {
    const size = defaultSize(pieceSize);
    setBoardDimensions(size.rows, size.cols);
  }

  updateModeText();

  if (regenerate) {
    syncSettingsControls();
    await loadTilingDataForSize(state.rows, state.cols);
    generatePuzzle();
    updateAddressBar();
    renderExampleGrids();
    render();
  }
}

async function setRuleSet(ruleSetKey, { regenerate = true } = {}) {
  const normalizedRuleSetKey = normalizeRuleSetKey(ruleSetKey);

  if (!isKnownRuleSet(normalizedRuleSetKey)) {
    return;
  }

  state.ruleSetKey = normalizedRuleSetKey;

  if (regenerate) {
    syncSettingsControls();
    closeSettingsPanel();
    await loadTilingDataForSize(state.rows, state.cols);
    generatePuzzle();
    updateAddressBar();
    renderExampleGrids();
    render();
  }
}

function nextRuleSetKey() {
  const index = RULESET_ORDER.indexOf(state.ruleSetKey);

  return RULESET_ORDER[(index + 1) % RULESET_ORDER.length] || DEFAULT_RULESET;
}

function setTimerMode(timerMode) {
  if (!Object.values(TIMER_MODE).includes(timerMode) || state.timerMode === timerMode) {
    return;
  }

  state.timerMode = timerMode;
  syncSettingsControls();
  saveCurrentPuzzle();
  updateAddressBar();
  render();
}

function updateModeText() {
  const mode = currentMode();

  elements.title.dataset.hint = `Tile the board with connected numbered ${mode.pieceLabel}.`;
  elements.pieceShapeRule.textContent = `Cover the board with ${numberWord(state.pieceSize)}-tile pieces. Tiles must touch along their edges.`;
  renderExampleGrids();
}

function renderExampleGrids() {
  const ruleSet = currentRuleSet();
  const examples = ruleExamples(ruleSet);

  elements.infoTitle.textContent = ruleSet.title || ruleSet.label;
  elements.readingOrderRule.hidden = state.ruleSetKey === "sum-anywhere";
  elements.ruleDescription.textContent = ruleText(ruleSet);
  renderExampleGrid(elements.exampleValidStraight, examples.validStraight);
  renderExampleGrid(elements.exampleValidBent, examples.validBent);
  renderExampleGrid(elements.exampleInvalidDisconnected, examples.invalidDisconnected);
  renderExampleGrid(elements.exampleInvalidShort, examples.invalidShort);
}

function ruleExamples(ruleSet) {
  const validValues = ruleExampleValues(ruleSet, "exampleValues") ||
    ruleSet.generatePieceSequences(1, state.pieceSize)[0];
  const invalidValues = ruleExampleValues(ruleSet, "invalidExampleValues") ||
    validValues.slice().reverse();
  const positions = examplePositions();

  return {
    validStraight: exampleCells(validValues, positions.straight),
    validBent: exampleCells(validValues, positions.bent),
    invalidDisconnected: exampleCells(validValues, positions.disconnected),
    invalidShort: exampleCells(invalidValues, positions.bent)
  };
}

function examplePositions() {
  if (state.pieceSize === 5) {
    return {
      straight: [[1, 1], [1, 2], [1, 3], [1, 4], [1, 5]],
      bent: [[1, 1], [1, 2], [2, 2], [3, 2], [3, 3]],
      disconnected: [[1, 1], [1, 3], [2, 2], [3, 3], [3, 4]]
    };
  }

  return {
    straight: [[1, 1], [1, 2], [1, 3], [1, 4]],
    bent: [[1, 1], [1, 2], [2, 2], [3, 2]],
    disconnected: [[1, 1], [1, 3], [2, 2], [3, 3]]
  };
}

function exampleCells(values, positions) {
  return values.map((value, index) => ({
    value,
    row: positions[index][0],
    col: positions[index][1]
  }));
}

function renderExampleGrid(element, cells) {
  element.innerHTML = "";
  element.style.setProperty("--example-cols", String(Math.max(...cells.map((cell) => cell.col))));

  cells.forEach((cell) => {
    const tile = document.createElement("b");

    tile.textContent = cell.value;
    tile.style.gridArea = `${cell.row} / ${cell.col}`;
    element.append(tile);
  });
}

function configureBoardSizeControls() {
  elements.boardSizeOptions.innerHTML = "";

  modeBoardSizes().forEach((size) => {
    const label = document.createElement("label");
    const input = document.createElement("input");

    input.type = "radio";
    input.name = "board-size";
    input.value = sizeKey(size.rows, size.cols);
    input.checked = input.value === currentSizeKey();
    input.addEventListener("change", updateBoardSize);
    label.append(input, document.createTextNode(size.label));
    elements.boardSizeOptions.append(label);
  });
}

function syncSettingsControls() {
  configureBoardSizeControls();
  elements.pieceSizeInputs.forEach((input) => {
    input.checked = Number(input.value) === state.pieceSize;
  });
  elements.timerModeInput.checked = !isTimedMode();
  updateSettingsSummary();
}

function updateSettingsSummary() {
  elements.settingsSummary.textContent = [
    `${state.pieceSize}-tile`,
    currentSizeKey(),
    digitSummary(ruleDigits(currentRuleSet())),
    state.ruleSetKey,
    isTimedMode() ? null : "Untimed"
  ].filter(Boolean).join(" | ");
}

function digitSummary(digits) {
  if (digits.length === 0) {
    return "";
  }

  const numbers = digits.map(Number);
  const isConsecutive = numbers.every((number, index) => (
    index === 0 || number === numbers[index - 1] + 1
  ));

  return isConsecutive
    ? `${digits[0]}-${digits[digits.length - 1]}`
    : digits.join(",");
}

function toggleSettingsPanel(event) {
  event.stopPropagation();

  const isOpen = !elements.settingsPanel.hidden;

  elements.settingsPanel.hidden = isOpen;
  elements.settingsButton.setAttribute("aria-expanded", String(!isOpen));

  if (!isOpen) {
    closeInfoPanel();
    closeKeyboardPanel();
    closePrintPanel();
  }
}

function toggleInfoPanel(event) {
  event.stopPropagation();

  const isOpen = !elements.infoPanel.hidden;

  elements.infoPanel.hidden = isOpen;
  elements.infoButton.setAttribute("aria-expanded", String(!isOpen));

  if (!isOpen) {
    renderExampleGrids();
    closeSettingsPanel();
    closeKeyboardPanel();
    closePrintPanel();
  }
}

function toggleKeyboardPanel() {
  const isOpen = !elements.keyboardPanel.hidden;

  elements.keyboardPanel.hidden = isOpen;

  if (!isOpen) {
    closeInfoPanel();
    closeSettingsPanel();
    closePrintPanel();
  }
}

function showPrintPanel() {
  closeInfoPanel();
  closeSettingsPanel();
  closeKeyboardPanel();
  elements.printGrid.value = makeGridUrl();
  elements.printPanel.hidden = false;
  elements.printGrid.focus();
  elements.printGrid.select();
}

async function copyPuzzleToClipboard() {
  const label = elements.shareButton.getAttribute("aria-label");

  closeInfoPanel();
  closeSettingsPanel();
  closeKeyboardPanel();
  closePrintPanel();

  try {
    await navigator.clipboard.writeText(makeGridUrl());
    elements.shareButton.setAttribute("aria-label", "Copied puzzle");
    elements.shareButton.classList.add("is-copied");
    window.setTimeout(() => {
      elements.shareButton.setAttribute("aria-label", label);
      elements.shareButton.classList.remove("is-copied");
    }, 900);
  } catch {
    showPrintPanel();
  }
}

function closePanelsFromOutside(event) {
  if (
    !elements.infoPanel.hidden &&
    !elements.infoPanel.contains(event.target) &&
    !elements.infoButton.contains(event.target)
  ) {
    closeInfoPanel();
  }

  if (
    !elements.settingsPanel.hidden &&
    !elements.settingsPanel.contains(event.target) &&
    !elements.settingsButton.contains(event.target)
  ) {
    closeSettingsPanel();
  }

  if (!elements.keyboardPanel.hidden && !elements.keyboardPanel.contains(event.target)) {
    closeKeyboardPanel();
  }

  if (!elements.printPanel.hidden && !elements.printPanel.contains(event.target)) {
    closePrintPanel();
  }

  if (
    state.activeMoveIndex !== null &&
    !event.target.closest(".tile") &&
    !event.target.closest(".selection-row")
  ) {
    state.activeMoveIndex = null;
    render();
  }
}

function closeInfoPanel() {
  elements.infoPanel.hidden = true;
  elements.infoButton.setAttribute("aria-expanded", "false");
}

function closeSettingsPanel() {
  elements.settingsPanel.hidden = true;
  elements.settingsButton.setAttribute("aria-expanded", "false");
}

function closeKeyboardPanel() {
  elements.keyboardPanel.hidden = true;
}

function closePrintPanel() {
  elements.printPanel.hidden = true;
}

function handleKeydown(event) {
  if (handleCheatCode(event)) {
    return;
  }

  if (handleShortcut(event)) {
    return;
  }

  if (event.key !== "Backspace") {
    return;
  }

  if (state.activeMoveIndex !== null) {
    event.preventDefault();
    deleteMove(state.activeMoveIndex);
    return;
  }

  if (state.selection.length > 0) {
    event.preventDefault();
    state.selection.pop();
    render();
  }
}

function handleCheatCode(event) {
  if (event.metaKey || event.ctrlKey || event.altKey || isFormField(event.target)) {
    return false;
  }

  if (event.key.length !== 1) {
    return false;
  }

  state.cheatBuffer = `${state.cheatBuffer}${event.key.toLowerCase()}`
    .slice(-SOLUTION_CHEAT_CODE.length);

  if (state.cheatBuffer !== SOLUTION_CHEAT_CODE) {
    return false;
  }

  event.preventDefault();
  state.cheatBuffer = "";
  revealSolution();
  return true;
}

function handleShortcut(event) {
  if (event.metaKey || event.ctrlKey || event.altKey || isFormField(event.target)) {
    return false;
  }

  const key = event.key.toLowerCase();
  const shortcuts = {
    i: () => toggleInfoPanel(event)
  };

  if (!shortcuts[key]) {
    return false;
  }

  event.preventDefault();
  shortcuts[key]();
  return true;
}

function isFormField(element) {
  return ["INPUT", "TEXTAREA", "SELECT"].includes(element?.tagName);
}

function renderCompletionMessage() {
  elements.completionMessage.innerHTML = "";
  elements.completionMessage.classList.toggle("is-complete", isPuzzleComplete());

  if (!isPuzzleComplete() || !isTimedMode()) {
    return;
  }

  const label = document.createElement("span");
  const time = document.createElement("strong");

  label.className = "completion-label";
  label.textContent = "Time";
  time.textContent = formatElapsedTime(state.completedAt - state.startedAt);

  elements.completionMessage.append(label, time);
}

function getTileClassName(cell, lockedMoveIndex) {
  const classes = ["tile"];

  if (state.selection.includes(cell.id)) {
    classes.push("is-selected");
  }

  if (state.invalidSelection && state.selection.includes(cell.id)) {
    classes.push("is-invalid");
  }

  if (lockedMoveIndex !== undefined) {
    classes.push("is-locked", lockGroupClass(lockedMoveIndex));

    if (state.activeMoveIndex === lockedMoveIndex) {
      classes.push("is-active-group");
    }

    if (isDeleteAnchorCell(cell, lockedMoveIndex)) {
      classes.push("is-delete-anchor");
    }

    if (isRuleTargetCell(cell, lockedMoveIndex)) {
      classes.push("is-rule-target");
    }
  }

  return classes.join(" ");
}

function getTileAriaLabel(cell, lockedMoveIndex) {
  const position = `${cell.value} at row ${cell.row + 1}, column ${cell.col + 1}`;

  if (lockedMoveIndex === undefined) {
    return position;
  }

  const move = state.moves[lockedMoveIndex];
  const values = move ? move.values : "completed piece";

  if (isDeleteAnchorCell(cell, lockedMoveIndex)) {
    return `${position}. Remove ${values}.`;
  }

  if (isRuleTargetCell(cell, lockedMoveIndex)) {
    return `${position}. Target value for completed piece ${values}.`;
  }

  return `${position}. Select completed piece ${values}.`;
}

function isRuleTargetCell(cell, moveIndex) {
  return state.moves[moveIndex]?.targetCellId === cell.id;
}

function isDeleteAnchorCell(cell, moveIndex) {
  return state.activeMoveIndex === moveIndex && cell.id === deleteAnchorCellId(moveIndex);
}

function deleteAnchorCellId(moveIndex) {
  const move = state.moves[moveIndex];

  if (!move) {
    return null;
  }

  return move.cells
    .map(getCellById)
    .sort(compareCells)[0]?.id || null;
}

function readSelectionValues(selection) {
  return readCellsValues(selection.map(getCellById)).join("");
}

function readCellsValues(cells) {
  return [...cells].sort(compareCells).map((cell) => cell.value);
}

function rebuildLockedMap() {
  state.locked.clear();

  state.moves.forEach((move, moveIndex) => {
    move.cells.forEach((id) => state.locked.set(id, moveIndex));
  });
}

function lockGroupClass(index) {
  return `lock-group-${index % GROUP_COLOR_COUNT}`;
}

function makeGridString() {
  return state.board.map((cell) => cell.value).join("");
}

function makeGridUrl() {
  const url = new URL(window.location.href);
  const grid = makeGridString();

  url.searchParams.set("size", currentSizeKey());
  url.searchParams.set("pieceSize", String(state.pieceSize));
  url.searchParams.set("rule", state.ruleSetKey);
  url.searchParams.set("grid", grid);
  if (state.solutionTiling) {
    url.searchParams.set("sol", encodeSolutionTiling(state.solutionTiling, grid));
  } else {
    url.searchParams.delete("sol");
  }
  url.searchParams.set("timed", isTimedMode() ? "1" : "0");
  url.searchParams.delete("zero");
  url.searchParams.delete("untimed");
  url.hash = "";
  return url.toString();
}

function updateAddressBar() {
  window.history.replaceState(null, "", makeGridUrl());
}

function currentMode() {
  return MODES[state.pieceSize] || MODES[DEFAULT_PIECE_SIZE];
}

function currentRuleSet() {
  return RULESETS[normalizeRuleSetKey(state.ruleSetKey)] || RULESETS[DEFAULT_RULESET];
}

function ruleDigits(ruleSet, pieceSize = state.pieceSize) {
  return ruleSet.digitsBySize?.[pieceSize] || ruleSet.digits || [];
}

function ruleText(ruleSet) {
  return typeof ruleSet.infoText === "function" ? ruleSet.infoText() : ruleSet.infoText;
}

function ruleReason(ruleSet, values) {
  return typeof ruleSet.invalidReason === "function"
    ? ruleSet.invalidReason(values)
    : ruleSet.invalidReason;
}

function ruleExampleValues(ruleSet, property) {
  return ruleSet[`${property}BySize`]?.[state.pieceSize] || ruleSet[property];
}

function numberWord(value) {
  return {
    1: "one",
    2: "two",
    3: "three",
    4: "four",
    5: "five"
  }[value] || String(value);
}

function isKnownRuleSet(ruleSetKey) {
  return Object.prototype.hasOwnProperty.call(RULESETS, normalizeRuleSetKey(ruleSetKey));
}

function normalizeRuleSetKey(ruleSetKey) {
  const key = String(ruleSetKey || "").toLowerCase();

  return RULESET_ALIASES.get(key) || key;
}

function isValidGridString(
  grid,
  ruleSetKey = state.ruleSetKey,
  expectedLength = boardCellCount(),
  pieceSize = state.pieceSize
) {
  const ruleSet = RULESETS[normalizeRuleSetKey(ruleSetKey)] || RULESETS[DEFAULT_RULESET];
  const digits = ruleDigits(ruleSet, pieceSize);

  return (
    typeof grid === "string" &&
    grid.length === expectedLength &&
    grid.split("").every((value) => digits.includes(value))
  );
}

function isValidSolutionTiling(tiling, rows = state.rows, cols = state.cols, pieceSize = state.pieceSize) {
  const expectedCellCount = rows * cols;
  const expectedPieceCount = expectedCellCount / pieceSize;

  if (
    !Number.isInteger(expectedPieceCount) ||
    typeof tiling !== "string" ||
    tiling.length !== expectedCellCount ||
    !/^\d+$/.test(tiling)
  ) {
    return false;
  }

  const counts = Array.from({ length: expectedPieceCount }, () => 0);
  const pieces = Array.from({ length: expectedPieceCount }, () => []);

  [...tiling].forEach((label, index) => {
    const pieceIndex = Number(label);

    if (pieceIndex >= 0 && pieceIndex < expectedPieceCount) {
      counts[pieceIndex] += 1;
      pieces[pieceIndex].push({
        row: Math.floor(index / cols),
        col: index % cols
      });
    }
  });

  return counts.every((count) => count === pieceSize) &&
    pieces.every((piece) => areCoordinatesEdgeConnected(piece));
}

function encodeSolutionTiling(tiling, grid = makeGridString()) {
  if (!isValidSolutionTiling(tiling)) {
    return "";
  }

  const settings = solutionCipherSettings(grid);
  let rolling = settings.rolling;

  return [...tiling].map((label, index) => {
    const raw = Number(label);
    const additive = (settings.seed + index * settings.offset) % 10;
    const mixed = mod10(raw + settings.offset + rolling + index * settings.step);
    const encoded = mod10(mixed * settings.multiplier + additive);

    rolling = mod10(rolling + raw + index + settings.offset);
    return String(encoded);
  }).join("");
}

function decodeSolutionTiling(encoded, grid = makeGridString()) {
  if (typeof encoded !== "string" || encoded.length !== boardCellCount() || !/^\d+$/.test(encoded)) {
    return null;
  }

  const settings = solutionCipherSettings(grid);
  let rolling = settings.rolling;

  return [...encoded].map((label, index) => {
    const additive = (settings.seed + index * settings.offset) % 10;
    const mixed = mod10((Number(label) - additive) * settings.inverseMultiplier);
    const raw = mod10(mixed - settings.offset - rolling - index * settings.step);

    rolling = mod10(rolling + raw + index + settings.offset);
    return String(raw);
  }).join("");
}

function solutionCipherSettings(grid) {
  const seed = checksumString(`${currentSizeKey()}|${state.pieceSize}|${state.ruleSetKey}|${grid}`);
  const multiplier = SOLUTION_MULTIPLIERS[seed % SOLUTION_MULTIPLIERS.length];

  return {
    seed,
    multiplier,
    inverseMultiplier: SOLUTION_MULTIPLIER_INVERSES[multiplier],
    offset: (seed * 7 + state.rows + state.cols) % 10,
    rolling: (seed * 3 + state.pieceSize) % 10,
    step: (seed % 7) + 3
  };
}

function checksumString(value) {
  return [...value].reduce((checksum, character, index) => (
    (checksum + character.charCodeAt(0) * (index + 17)) % 1000003
  ), 0);
}

function mod10(value) {
  return ((value % 10) + 10) % 10;
}

function usesRuleDigits(values, digits) {
  return values.length === state.pieceSize && values.every((value) => digits.includes(value));
}

function repeatFromGroup(group, count) {
  return Array.from({ length: count }, () => randomItem(group));
}

function buildAllSequences(digits, length) {
  if (length === 0) {
    return [[]];
  }

  return digits.flatMap((digit) =>
    buildAllSequences(digits, length - 1).map((suffix) => [digit, ...suffix])
  );
}

function isNonDecreasing(values) {
  return values.every((value, index) => (
    index === 0 || Number(value) >= Number(values[index - 1])
  ));
}

function isSumLast(values) {
  return values.length >= 2 &&
    sequenceSum(values.slice(0, values.length - 1)) === Number(values[values.length - 1]);
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

  return values.length >= 3 &&
    first !== last &&
    values.slice(1, values.length - 1).every((value) => (
      Number(value) > low && Number(value) < high
    ));
}

function sequenceSum(values) {
  return values.reduce((total, value) => total + Number(value), 0);
}

function modeBoardSizes(pieceSize = state?.pieceSize || DEFAULT_PIECE_SIZE) {
  const mode = MODES[pieceSize] || MODES[DEFAULT_PIECE_SIZE];

  return mode.boardSizes.filter((size) => (
    ENABLE_6X6 || sizeKey(size.rows, size.cols) !== "6x6"
  ));
}

function defaultSize(pieceSize = state.pieceSize) {
  return modeBoardSizes(pieceSize)[0];
}

function parseSizeKey(value, pieceSize = state.pieceSize) {
  if (!value) {
    return null;
  }

  const [rows, cols] = value.toLowerCase().split("x").map(Number);

  return isSupportedSize(rows, cols, pieceSize) ? { rows, cols } : null;
}

function isSupportedSize(rows, cols, pieceSize = state.pieceSize) {
  return modeBoardSizes(pieceSize).some((size) => size.rows === rows && size.cols === cols);
}

function setBoardDimensions(rows, cols) {
  state.rows = rows;
  state.cols = cols;
}

function currentSizeKey() {
  return sizeKey(state.rows, state.cols);
}

function canonicalSizeKey(rows, cols) {
  return rows <= cols ? sizeKey(rows, cols) : sizeKey(cols, rows);
}

function tilingStoreKey(pieceSize, rows, cols) {
  return `${pieceSize}:${sizeKey(rows, cols)}`;
}

function sizeKey(rows, cols) {
  return `${rows}x${cols}`;
}

function boardCellCount() {
  return state.rows * state.cols;
}

function pieceCount() {
  return boardCellCount() / state.pieceSize;
}

function alternatePieceSize() {
  return state.pieceSize === 5 ? DEFAULT_PIECE_SIZE : 5;
}

function isTimedMode() {
  return state.timerMode === TIMER_MODE.TIMED;
}

function isPuzzleComplete() {
  return state.locked.size === boardCellCount() && state.completedAt !== null;
}

function isEdgeConnected(cells) {
  const ids = new Set(cells.map((cell) => cell.id));
  const seen = new Set([cells[0].id]);
  const stack = [cells[0]];

  while (stack.length > 0) {
    const current = stack.pop();

    neighborsOf(current)
      .filter((neighbor) => ids.has(neighbor.id) && !seen.has(neighbor.id))
      .forEach((neighbor) => {
        seen.add(neighbor.id);
        stack.push(neighbor);
      });
  }

  return seen.size === cells.length;
}

function areCoordinatesEdgeConnected(cells) {
  const ids = new Set(cells.map((cell) => `${cell.row},${cell.col}`));
  const seen = new Set([`${cells[0].row},${cells[0].col}`]);
  const stack = [cells[0]];

  while (stack.length > 0) {
    const current = stack.pop();
    const neighbors = [
      { row: current.row - 1, col: current.col },
      { row: current.row + 1, col: current.col },
      { row: current.row, col: current.col - 1 },
      { row: current.row, col: current.col + 1 }
    ];

    neighbors
      .filter((neighbor) => {
        const id = `${neighbor.row},${neighbor.col}`;

        return ids.has(id) && !seen.has(id);
      })
      .forEach((neighbor) => {
        seen.add(`${neighbor.row},${neighbor.col}`);
        stack.push(neighbor);
      });
  }

  return seen.size === cells.length;
}

function classifyPolyomino(cells) {
  if (cells.length !== 4) {
    return currentMode().pieceName;
  }

  const normalized = normalizeCells(cells);
  const signature = normalized.map(({ row, col }) => `${row},${col}`).join(";");
  const signatures = {
    "0,0;0,1;0,2;0,3": "I",
    "0,0;1,0;2,0;3,0": "I",
    "0,0;0,1;1,0;1,1": "O",
    "0,0;0,1;0,2;1,1": "T",
    "0,1;1,0;1,1;2,1": "T",
    "0,1;1,0;1,1;1,2": "T",
    "0,0;1,0;1,1;2,0": "T",
    "0,1;0,2;1,0;1,1": "S/Z",
    "0,0;1,0;1,1;2,1": "S/Z",
    "0,0;0,1;1,1;1,2": "S/Z",
    "0,1;1,0;1,1;2,0": "S/Z",
    "0,0;0,1;0,2;1,0": "J/L",
    "0,0;0,1;0,2;1,2": "J/L",
    "0,0;1,0;2,0;2,1": "J/L",
    "0,1;1,1;2,0;2,1": "J/L",
    "0,0;0,1;1,0;2,0": "J/L",
    "0,0;0,1;1,1;2,1": "J/L",
    "0,0;1,0;1,1;1,2": "J/L",
    "0,2;1,0;1,1;1,2": "J/L"
  };

  return signatures[signature] || "Tetromino";
}

function normalizeCells(cells) {
  const minRow = Math.min(...cells.map((cell) => cell.row));
  const minCol = Math.min(...cells.map((cell) => cell.col));

  return cells
    .map((cell) => ({
      row: cell.row - minRow,
      col: cell.col - minCol
    }))
    .sort(compareCells);
}

function neighborsOf(cell) {
  return [
    getCell(cell.row - 1, cell.col),
    getCell(cell.row + 1, cell.col),
    getCell(cell.row, cell.col - 1),
    getCell(cell.row, cell.col + 1)
  ].filter(Boolean);
}

function getCell(row, col) {
  if (row < 0 || row >= state.rows || col < 0 || col >= state.cols) {
    return null;
  }

  return state.board[row * state.cols + col];
}

function getCellById(id) {
  return state.board.find((cell) => cell.id === id);
}

function getCellByIdFromBoard(board, id) {
  return board.find((cell) => cell.id === id);
}

function cellId(row, col) {
  return `${row}:${col}`;
}

function compareCells(a, b) {
  return a.row - b.row || a.col - b.col;
}

function boardMaxWidth() {
  const widthConstrained = boardMaxWidthForViewportWidth();
  const heightConstrained = boardMaxWidthForViewportHeight();

  return Math.min(widthConstrained, heightConstrained);
}

function boardMaxWidthForViewportWidth() {
  if (state.rows <= state.cols) {
    return 400;
  }

  if (window.matchMedia("(max-width: 430px)").matches) {
    return Math.round(360 * Math.sqrt(state.cols / state.rows));
  }

  return Math.round(400 * Math.sqrt(state.cols / state.rows));
}

function boardMaxWidthForViewportHeight() {
  const viewportHeight = window.innerHeight || 900;
  const verticalChrome = appVerticalPadding() + 44 + mastheadSpace() + reservedSelectionSpace() + 12 + toolbarSpace();
  const maxBoardHeight = Math.max(300, viewportHeight - verticalChrome);

  return Math.round(maxBoardHeight * state.cols / state.rows);
}

function appVerticalPadding() {
  return window.matchMedia("(max-width: 430px)").matches ? 20 : 48;
}

function mastheadSpace() {
  return window.matchMedia("(max-width: 430px)").matches ? 55 : 72;
}

function toolbarSpace() {
  return window.matchMedia("(max-width: 430px)").matches ? 48 : 56;
}

function tileFontSize() {
  return Math.max(1.25, Math.min(3.1, 11 / state.cols));
}

function tileRadius() {
  return Math.max(12, Math.min(20, 82 / state.cols));
}

function tileInset() {
  return Math.max(4, Math.min(8, 34 / state.cols));
}

function setSelectionLayoutSpace() {
  const selectionSpace = reservedSelectionSpace();
  const completeRowSpace = completedSelectionRowSpace();

  elements.selectionLines.style.setProperty("--selection-space", `${selectionSpace}px`);
  elements.selectionLines.style.setProperty("--complete-row-space", `${completeRowSpace}px`);
  elements.completionMessage.style.setProperty(
    "--completion-message-space",
    `${Math.max(0, selectionSpace - completeRowSpace)}px`
  );
}

function reservedSelectionSpace() {
  return Math.max(inProgressSelectionSpace(), completedSelectionSpace());
}

function inProgressSelectionSpace() {
  const count = pieceCount();

  if (count >= 6) {
    const rows = Math.ceil(count / 2);
    return rows * 28 + (rows - 1) * 5;
  }

  return count * 40 + (count - 1) * 3;
}

function completedSelectionSpace() {
  return completedSelectionRowSpace() + 132;
}

function completedSelectionRowSpace() {
  return pieceCount() >= 6 ? 68 : 42;
}

function formatElapsedTime(milliseconds) {
  const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function randomInt(max) {
  return Math.floor(Math.random() * max);
}

function randomItem(items) {
  return items[Math.floor(Math.random() * items.length)];
}

function clampInteger(value, fallback, min, max) {
  const number = Number(value);

  if (!Number.isInteger(number)) {
    return fallback;
  }

  return Math.max(min, Math.min(max, number));
}
