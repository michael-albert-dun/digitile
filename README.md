# Digitiler

Digitiler is a small static prototype for tiling rectangular grids with numbered
tetrominoes and pentominoes. It was derived from the UI plumbing of Tilexicon,
but replaces word validation with numeric constraints.

## Run Locally

From this directory:

```sh
python3 -m http.server 4173 --bind 127.0.0.1
```

Then open:

```text
http://127.0.0.1:4173/
```

The app is plain HTML, CSS, and JavaScript. There is no build step.

## Puzzle Generation

For the default `4x4` mode, generation currently works like this:

1. Load tetromino tilings from `data/tetromino-tilings-4x4.txt`.
2. Pick a random tiling.
3. Fill each tetromino in left-to-right, top-to-bottom order.
4. Each tetromino receives a uniformly chosen digit sequence from digits `1`
   through `6` where the first three values sum to the fourth, such as `1113`,
   `1124`, or `1236`.
5. Reject the board unless it has at most two valid solutions.

Solution counting scans the available tilings and stops as soon as a third valid
solution is found.

The `6x6` board is disabled by default because its tiling data is large. It can
be enabled with:

```text
http://127.0.0.1:4173/?enable6x6=true
```

## Experiments

Further pentomino variants are being explored separately in `dev/pentomino/`.
That directory is a checked-in development sandbox.

The solution-counting script can generate random `4x4` boards and count how
many valid tiling solutions they have:

```sh
node scripts/count-solutions.js 10
```

For a summary:

```sh
node scripts/count-solutions.js 100 --summary
```

To sample only boards accepted by the app's `<= 2 solutions` rejection rule:

```sh
node scripts/count-solutions.js 100 --accepted-only --summary
```

The experiment script can also test alternate rule and digit sets:

```sh
node scripts/count-solutions.js 100 --summary --rule same-sum
node scripts/count-solutions.js 100 --summary --rule different-sum
node scripts/count-solutions.js 100 --summary --rule same-product
node scripts/count-solutions.js 100 --summary --rule sum-last
node scripts/count-solutions.js 100 --summary --rule sum-anywhere
node scripts/count-solutions.js 100 --summary --rule mean
```

Available rules:

- `nondecreasing`: current app rule. In reading order, values in each piece are
  weakly increasing. Default digits: `1-4`.
- `same-sum`: all pieces in a solution have the same sum. Default digits: `1-4`.
- `different-sum`: all pieces in a solution have different sums. Default digits:
  `1-4`.
- `same-product`: all pieces in a solution have the same product. Default
  digits: `1-6`.
- `sum-last`: in reading order, the first three values in each piece sum to
  the fourth. Default digits: `1-6`.
- `sum-anywhere`: one value in each piece is the sum of the other three,
  regardless of its position. Default digits: `1-6`.
- `mean`: a piece contains its arithmetic mean in any position. Default digits:
  `1-8`.

The digit set can be overridden:

```sh
node scripts/count-solutions.js 100 --summary --rule same-product --digits 1-5
node scripts/count-solutions.js 100 --summary --rule same-sum --digits 0,1,2,3,4
```
