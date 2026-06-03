# Digitiler Pentomino Experiments

This directory is a development sandbox for pentomino versions of Digitiler.
It is part of the repository, but not part of the released app.

The initial aim is to explore puzzle generation, rule sets, value sets, and
solution uniqueness for grids tiled by pentominoes before deciding which ideas
should move into the main app.

Suggested layout:

- `experiments/`: scripts and notes for generation and solution-count tests.
- `results/`: captured experiment outputs worth keeping.

## 4x5 Solution Counts

The first experiment samples `4x5` grids tiled by connected pentominoes:

```sh
node dev/pentomino/experiments/count-4x5-solutions.js 100 --summary
```

The default tiling set is the full `pentomino-tilings-4x5.txt` copied from
Tilexicon. Use `--no-repeats` to sample the filtered no-repeated-shape set.

Defaults:

- `nondecreasing` uses digits `1-5`.
- `sum-last`, `sum-anywhere`, and `values-between` use digits `1-9`.
