# LLM Code Review Evals

![CI](https://github.com/alliii1364/llm-code-review-evals/actions/workflows/ci.yml/badge.svg)

A small test harness that measures how well an AI model reviews code. It gives the model 10 short snippets with known, planted bugs, then scores how many of those bugs the review actually names.

**Stack:** TypeScript, Node.js 22, Vitest, GitHub Actions, OpenAI or Anthropic API (plain `fetch`, no SDK)

## Why

AI models are now used to review pull requests, so you need to know how often they miss a real bug. The only way to know is to test against code where the right answer is already known. This project is a minimal version of that idea.

## The cases

| # | Case | Planted bugs | Severity |
|---|---|---|---|
| 01 | Pagination slice | off-by-one (`slice` end is exclusive) | medium |
| 02 | Async work in `forEach` | callbacks not awaited · count reads 0 | high · low |
| 03 | Login lookup query | SQL injection | critical |
| 04 | Header display name | missing null/undefined check | high |
| 05 | Wallet withdrawal | race condition (check-then-write) · negative amount accepted | critical · high |
| 06 | Cart total | floating-point money, never rounded | medium |
| 07 | Login check | plain-text passwords · user enumeration | critical · medium |
| 08 | Task defaults | shallow copy shares one `tags` array | high |
| 09 | Express async route | unhandled promise rejection · no 404 | high · medium |
| 10 | Delivery date | UTC vs local time shifts the day | medium |

Each case lives in [`cases/cases.json`](cases/cases.json) with its snippet in [`cases/snippets/`](cases/snippets). Adding a case means adding one snippet and one JSON entry.

## How scoring works

There are two scorers.

1. **Keywords (default, free).** Each expected bug has a few regular expressions, such as `race|concurren|transaction|atomic`. If any one matches the review, the bug counts as found.
2. **LLM judge (`--judge`).** A second model call is made for each bug. It gets the bug description and the review, and must answer YES or NO with a reason. This is slower and costs more, but handles wording that keywords miss.

The tests protect the scoring itself:

- A hand-written correct review must find every bug. This catches patterns that are too strict.
- Pasting the buggy code back as the "review" must find nothing. This catches patterns that just quote the code.
- The review prompt must never contain the expected answer.

## Run it

```bash
git clone https://github.com/alliii1364/llm-code-review-evals.git
cd llm-code-review-evals
npm install
cp .env.example .env        # set PROVIDER, MODEL and your API key

npm run eval                # review all 10 cases, score with keywords
npm run eval -- --judge     # score with an LLM judge instead
npm run eval -- --only 05-withdraw
npm run eval -- --rescore <run-folder>   # re-score saved reviews without calling the model
npm test                    # unit tests, no API key needed
```

Each run saves the raw reviews to `runs/<model>-<timestamp>/reviews/`, plus `summary.json` and `results.md`. The latest report is also copied to `results.md` in the project root.

## Results

_No results committed yet. Run `npm run eval` and paste `results.md` here, then write a short analysis below._

### What the model missed, and why

_For each missed bug: what the review said instead, and why you think the model missed it. For example, it may have focused on style, or not known that Express 4 ignores rejected promises._

## Limits

- **Keyword scoring is generous.** A review that mentions "transaction" for the wrong reason still counts. Use `--judge` or read the saved reviews to confirm.
- **False positives aren't measured.** A model that invents extra bugs isn't penalized yet.
- **10 cases is a small sample.** Results show patterns, not a reliable benchmark.

## Next steps

- Add "clean" control snippets with no bugs, to measure false alarms.
- Run each case several times and report how much the results vary.
- Compare two models side by side in one report.

## Project structure

```
cases/
  cases.json          expected bugs and scoring patterns
  snippets/           the buggy code shown to the model
src/
  run.ts              CLI: review, score, save the report
  providers.ts        OpenAI / Anthropic calls with fetch
  prompts.ts          review and judge prompts
  score.ts            keyword scorer and judge-answer parser
  report.ts           markdown report
test/                 Vitest tests for cases and scoring
```

## Author

Sheikh Ali Asif ([@alliii1364](https://github.com/alliii1364)) · MIT License
