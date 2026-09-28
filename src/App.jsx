import { useMemo, useState } from "react";

const DEFAULTS = {
  asset: "SOL",
  quote: "USDC",
  amount: 10,
  entry: 0.00,
  stopLoss: 0.00,
  takeProfit: 0.00,
  entryFeePercent: 0.1,
  exitFeePercent: 0.1,
};

function money(value, currency = "USDT") {
  if (!Number.isFinite(value)) return "—";
  return `${value < 0 ? "-" : ""}$${Math.abs(value).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} ${currency}`;
}

function percent(value) {
  if (!Number.isFinite(value)) return "—";
  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
}

function price(value) {
  if (!Number.isFinite(value)) return "—";
  return `$${value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: Math.abs(value) < 1 ? 4 : 2,
  })}`;
}

// Position size: 2 decimals for 1 or more, 4 significant digits for smaller amounts
function qty(value) {
  if (!Number.isFinite(value)) return "—";
  if (Math.abs(value) >= 1) {
    return value.toLocaleString(undefined, { maximumFractionDigits: 2 });
  }
  return value.toLocaleString(undefined, { maximumSignificantDigits: 4 });
}

function Metric({ label, value, tone = "neutral", subtext }) {
  return (
    <div className="metric">
      <div className="metric-label">{label}</div>
      <div className={`metric-value ${tone}`}>{value}</div>
      {subtext ? <div className="metric-subtext">{subtext}</div> : null}
    </div>
  );
}

function ScenarioCard({ title, result, accent, currency }) {
  return (
    <section className={`scenario-card ${accent}`}>
      <div className="scenario-heading">
        <div>
          <span className="eyebrow">{title}</span>
          <h2>{result.label}</h2>
        </div>
        <div className={`scenario-badge ${accent}`}>
          {percent(result.roi)}
        </div>
      </div>

      <div className="scenario-main">
        <div>
          <div className="scenario-caption">Net P&L after fees</div>
          <div className={`scenario-pnl ${result.pnl >= 0 ? "profit" : "loss"}`}>
            {money(result.pnl, currency)}
          </div>
        </div>
        <div className="scenario-price">
          <span>Exit price</span>
          <strong>{price(result.exitPrice)}</strong>
        </div>
      </div>

      <div className="metric-grid">
        <Metric label="Gross P&L" value={money(result.grossPnl, currency)} />
        <Metric label="Entry fee" value={money(result.entryFee, currency)} />
        <Metric label="Exit fee" value={money(result.exitFee, currency)} />
        <Metric label="Total fees" value={money(result.totalFees, currency)} />
      </div>
    </section>
  );
}

export default function App() {
  const [form, setForm] = useState(DEFAULTS);

  const update = (field) => (event) => {
    const raw = event.target.value;
    setForm((current) => ({
      ...current,
      [field]: field === "asset" || field === "quote" ? raw.toUpperCase() : raw === "" ? "" : Number(raw),
    }));
  };

  const reset = () => setForm(DEFAULTS);

  const calc = useMemo(() => {
    const amount = Number(form.amount);
    const entry = Number(form.entry);
    const stopLoss = Number(form.stopLoss);
    const takeProfit = Number(form.takeProfit);
    const entryFeePercent = Number(form.entryFeePercent);
    const exitFeePercent = Number(form.exitFeePercent);

    const valid =
      Number.isFinite(amount) &&
      amount > 0 &&
      Number.isFinite(entry) &&
      entry > 0 &&
      Number.isFinite(stopLoss) &&
      stopLoss > 0 &&
      Number.isFinite(takeProfit) &&
      takeProfit > 0 &&
      Number.isFinite(entryFeePercent) &&
      entryFeePercent >= 0 &&
      Number.isFinite(exitFeePercent) &&
      exitFeePercent >= 0;

    if (!valid) {
      return { valid: false };
    }

    // Position size is based on the amount allocated before fees.
    const quantity = amount / entry;
    const entryFeeRate = entryFeePercent / 100;
    const exitFeeRate = exitFeePercent / 100;
    const entryFee = amount * entryFeeRate;
    const totalCapital = amount + entryFee;

    const scenario = (exitPrice, label) => {
      const grossExitValue = quantity * exitPrice;
      const exitFee = grossExitValue * exitFeeRate;
      const grossPnl = grossExitValue - amount;
      const totalFees = entryFee + exitFee;
      const pnl = grossPnl - totalFees;
      const roi = (pnl / totalCapital) * 100;

      return {
        label,
        exitPrice,
        grossExitValue,
        grossPnl,
        entryFee,
        exitFee,
        totalFees,
        pnl,
        roi,
      };
    };

    const tp = scenario(takeProfit, "Take Profit");
    const sl = scenario(stopLoss, "Stop Loss");

    // Solve for an exit price where net P&L = 0:
    // quantity * exit * (1 - exitFeeRate) = amount * (1 + entryFeeRate)
    const breakEvenPrice =
      (amount * (1 + entryFeeRate)) / (quantity * (1 - exitFeeRate));

    const risk = Math.abs(sl.pnl);
    const reward = Math.max(0, tp.pnl);
    const riskReward = risk > 0 ? reward / risk : Infinity;

    return {
      valid: true,
      quantity,
      entryFee,
      totalCapital,
      tp,
      sl,
      breakEvenPrice,
      risk,
      reward,
      riskReward,
    };
  }, [form]);

  return (
    <main className="page-shell">
      <div className="app-container">
        <header className="hero">
          <div>
            <div className="brand-mark">₿</div>
            <div className="eyebrow">CRYPTO TRADING TOOL</div>
            <h1>Profit Calculator</h1>
            <p>
              See your real profit or loss after entry and exit trading fees.
            </p>
          </div>
          <button className="reset-button" onClick={reset}>
            Reset
          </button>
        </header>

        <section className="panel">
          <div className="section-heading">
            <div>
              <span className="eyebrow">TRADE SETUP</span>
              <h2>Enter your numbers</h2>
            </div>
            <span className="fee-note">Fees are applied on entry + exit</span>
          </div>

          <div className="form-grid">
            <label>
              <span>Asset</span>
              <div className="select-wrap">
                <select
                  value={form.asset}
                  onChange={update("asset")}
                  aria-label="Asset"
                >
                  <option value="BTC">BTC</option>
                  <option value="SOL">SOL</option>
                </select>
                <span className="select-chevron" aria-hidden="true">⌄</span>
              </div>
            </label>

            <label>
              <span>Stablecoin</span>
              <div className="select-wrap">
                <select
                  value={form.quote}
                  onChange={update("quote")}
                  aria-label="Stablecoin"
                >
                  <option value="USDT">USDT</option>
                  <option value="USDC">USDC</option>
                </select>
                <span className="select-chevron" aria-hidden="true">⌄</span>
              </div>
            </label>

            <label>
              <span>Initial amount</span>
              <div className="input-with-addon">
                <input
                  value={form.amount}
                  onChange={update("amount")}
                  min="0"
                  step="0.01"
                  type="number"
                />
                <span>{form.quote}</span>
              </div>
            </label>

            <label>
              <span>Entry price</span>
              <div className="input-with-addon">
                <input
                  value={form.entry}
                  onChange={update("entry")}
                  min="0"
                  step="0.00000001"
                  type="number"
                />
                <span>{form.quote}</span>
              </div>
            </label>

            <label>
              <span>Stop loss</span>
              <div className="input-with-addon">
                <input
                  value={form.stopLoss}
                  onChange={update("stopLoss")}
                  min="0"
                  step="0.00000001"
                  type="number"
                />
                <span>{form.quote}</span>
              </div>
            </label>

            <label>
              <span>Take profit</span>
              <div className="input-with-addon">
                <input
                  value={form.takeProfit}
                  onChange={update("takeProfit")}
                  min="0"
                  step="0.00000001"
                  type="number"
                />
                <span>{form.quote}</span>
              </div>
            </label>

            <label>
              <span>Entry fee</span>
              <div className="input-with-addon">
                <input
                  value={form.entryFeePercent}
                  onChange={update("entryFeePercent")}
                  min="0"
                  step="0.001"
                  type="number"
                />
                <span>%</span>
              </div>
            </label>

            <label>
              <span>Exit fee</span>
              <div className="input-with-addon">
                <input
                  value={form.exitFeePercent}
                  onChange={update("exitFeePercent")}
                  min="0"
                  step="0.001"
                  type="number"
                />
                <span>%</span>
              </div>
            </label>
          </div>

          <div className="formula-strip">
            <div>
              <span>Position size</span>
              <strong>
                {calc.valid ? `${qty(calc.quantity)} ${form.asset || "units"}` : "—"}
              </strong>
            </div>
            <div>
              <span>Entry fee</span>
              <strong>{calc.valid ? money(calc.entryFee, form.quote) : "—"}</strong>
            </div>
            <div>
              <span>Total capital incl. entry fee</span>
              <strong>{calc.valid ? money(calc.totalCapital, form.quote) : "—"}</strong>
            </div>
          </div>
        </section>

        {calc.valid ? (
          <>
            <div className="scenario-grid">
              <ScenarioCard title="UPSIDE SCENARIO" result={calc.tp} accent="profit" currency={form.quote} />
              <ScenarioCard title="DOWNSIDE SCENARIO" result={calc.sl} accent="loss" currency={form.quote} />
            </div>

            <section className="panel summary-panel">
              <div className="section-heading">
                <div>
                  <span className="eyebrow">TRADE SUMMARY</span>
                  <h2>What this trade looks like</h2>
                </div>
              </div>

              <div className="summary-grid">
                <Metric
                  label="Risk / Reward"
                  value={
                    Number.isFinite(calc.riskReward)
                      ? `1 : ${calc.riskReward.toFixed(2)}`
                      : "1 : ∞"
                  }
                  subtext="Based on net P&L after fees"
                />
                <Metric
                  label="Break-even exit"
                  value={price(calc.breakEvenPrice)}
                  subtext="Price needed to cover both fees"
                />
                <Metric
                  label="Max loss at SL"
                  value={money(-calc.risk, form.quote)}
                  tone="loss"
                />
                <Metric
                  label="Profit at TP"
                  value={money(calc.reward, form.quote)}
                  tone="profit"
                />
              </div>
            </section>

            <section className="how-it-works">
              <div className="eyebrow">FORMULA</div>
              <h2>How the calculator works</h2>
              <p>
                Position size = Initial amount ÷ Entry price. Entry fee is
                charged on the initial amount, and exit fee is charged on the
                position's final value.
              </p>
              <p>
                <strong>Net P&L = Exit value − Entry amount − Entry fee − Exit fee</strong>
              </p>
              <p className="disclaimer">
                This assumes a straightforward spot-style trade with no
                leverage, funding fees, slippage, spread, taxes, or withdrawal
                fees. Your exchange may calculate fees using a slightly
                different fee tier or execution model.
              </p>
            </section>
          </>
        ) : (
          <section className="empty-state panel">
            <div className="empty-icon">!</div>
            <h2>Enter valid trade values</h2>
            <p>
              Initial amount and prices must be greater than zero, and the fee
              cannot be negative.
            </p>
          </section>
        )}

        <footer>
          <span>Crypto Trading Calculator</span>
          <span>Spot-friendly · Fee-aware · No leverage required</span>
        </footer>
      </div>
    </main>
  );
}