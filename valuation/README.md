# SNIPER Portfolio Builder

Python portfolio engine used by the SNIPER website for pick-and-fill (1–4 famous anchors → up to 12 holdings).

## Setup

```bash
pip install -r valuation/requirements.txt
```

Requires local valuation data (not vendored in this repo):

| Env var | Default (local) |
| --- | --- |
| `SNIPER_FV_DIR` | `/Users/noambelinkis/Documents/StockAnalysis/FvIndustries-0-0-` |
| `SNIPER_UNIVERSE` | `/Users/noambelinkis/Documents/StockAnalysis/NoamShit/extracted_symbols_newest.json` |
| `SNIPER_SHARPE_FILE` | `$SNIPER_FV_DIR/all_stocks_sharpe_ratios.json` |
| `SNIPER_PYTHON` | `python3` |

Optional: set `SNIPER_USE_MOCK_BUILDER=1` to use the TypeScript mock fill instead of Python (`isMockBuilderEnabled()` in `lib/builder/config.ts`).

## CLI examples

```bash
# Eligible famous picks (JSON for the website)
python3 valuation/Builder --fv-dir "$SNIPER_FV_DIR" --universe "$SNIPER_UNIVERSE" \
  --sharpe-file "$SNIPER_SHARPE_FILE" --list-famous-json

# Build from picks
python3 valuation/Builder --fv-dir "$SNIPER_FV_DIR" --universe "$SNIPER_UNIVERSE" \
  --sharpe-file "$SNIPER_SHARPE_FILE" --pick DIS JPM --size 12 --json-stdout
```
