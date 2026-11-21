import { useMemo, useState } from "react";
import "./styles.css";

const DEFAULTS = {
  asset: "SOL",
  quote: "USDC",
  side: "long",
  amount: 1000,
  entry: 150,
  stopLoss: 140,
  takeProfit: 175,
  entryFeePercent: 0.1,
  exitFeePercent: 0.1,
};

function money(value, currency = "USDC") {
  if (!Number.isFinite(value)) return "—";
  return `${value < 0 ? "−" : ""}$${Math.abs(value).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} ${currency}`;
}

function percent(value) {
  if (!Number.isFinite(value)) return "—";
  return `${value >= 0 ? "+" : "−"}${Math.abs(value).toFixed(2)}%`;
}

function price(value) {
  if (!Number.isFinite(value)) return "—";
  return `$${value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: Math.abs(value) < 1 ? 4 : 2,
  })}`;
}

function qty(value) {
  if (!Number.isFinite(value)) return "—";
  return value.toLocaleString(undefined, {
    maximumFractionDigits: Math.abs(value) >= 1 ? 4 : 6,
  });
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
        <div className={`scenario-badge ${result.pnl >= 0 ? "profit" : "loss"}`}>
          {percent(result.roi)}
        </div>
      </div>
      <div className="scenario-main">
        <div>
          <div className="scenario-caption">Estimated net P&amp;L</div>
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

function NumberField({ label, value, onChange, unit, step = "any", min = "0" }) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      <span className="input-with-addon">
        <input
          type="number"
          inputMode="decimal"
          min={min}
          step={step}
          value={value}
          onChange={onChange}
          aria-label={label}
        />
        <span className="input-unit">{unit}</span>
      </span>
    </label>
  );
}

export default function App() {
  const [form, setForm] = useState(DEFAULTS);

  const update = (field) => (event) => {
    const raw = event.target.value;
    setForm((current) => ({
      ...current,
      [field]: field === "asset" || field === "quote" ? raw : raw === "" ? "" : Number(raw),
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
    const validBase =
      Number.isFinite(amount) && amount > 0 &&
      Number.isFinite(entry) && entry > 0 &&
      Number.isFinite(stopLoss) && stopLoss > 0 &&
      Number.isFinite(takeProfit) && takeProfit > 0 &&
      Number.isFinite(entryFeePercent) && entryFeePercent >= 0 && entryFeePercent < 100 &&
      Number.isFinite(exitFeePercent) && exitFeePercent >= 0 && exitFeePercent < 100;

    if (!validBase) return { valid: false, message: "Enter positive amounts and prices, and fees from 0% up to (but not including) 100%." };

    const isLong = form.side === "long";
    if ((isLong && (stopLoss >= entry || takeProfit <= entry)) ||
        (!isLong && (stopLoss <= entry || takeProfit >= entry))) {
      return {
        valid: false,
        message: isLong
          ? "For a long trade, stop loss must be below entry and take profit must be above it."
          : "For a short trade, stop loss must be above entry and take profit must be below it.",
      };
    }

    const quantity = amount / entry;
    const entryFeeRate = entryFeePercent / 100;
    const exitFeeRate = exitFeePercent / 100;
    const entryFee = amount * entryFeeRate;
    const totalCapital = amount + entryFee;

    const scenario = (exitPrice, label) => {
      const exitValue = quantity * exitPrice;
      const exitFee = exitValue * exitFeeRate;
      const grossPnl = (isLong ? exitValue - amount : amount - exitValue);
      const totalFees = entryFee + exitFee;
      const pnl = grossPnl - totalFees;
      return {
        label,
        exitPrice,
        grossPnl,
        entryFee,
        exitFee,
        totalFees,
        pnl,
        roi: (pnl / totalCapital) * 100,
      };
    };

    const tp = scenario(takeProfit, "Take profit");
    const sl = scenario(stopLoss, "Stop loss");
    const breakEvenPrice = isLong
      ? (amount * (1 + entryFeeRate)) / (quantity * (1 - exitFeeRate))
      : (amount * (1 - entryFeeRate)) / (quantity * (1 + exitFeeRate));
    const risk = Math.abs(sl.pnl);
    const reward = Math.max(0, tp.pnl);

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
      riskReward: risk > 0 ? reward / risk : Infinity,
    };
  }, [form]);

  return (
    <main className="page-shell">
      <div className="app-container">
        <header className="hero">
          <div className="brand-lockup">
            <div className="brand-mark" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none"><path d="M4 17.5 9 12l3.5 3.5L20 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M14.5 7H20v5.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </div>
            <span className="brand-name">Trade tools <span> / </span> Position planner</span>
          </div>
          <div className="hero-content">
            <div>
              <div className="eyebrow hero-eyebrow"><span className="live-dot" /> PLAN BEFORE YOU TRADE</div>
              <h1>Know your numbers.<br /><span>Trade with a plan.</span></h1>
              <p>Map out your entry, exit, and fees before you place a trade.</p>
            </div>
            <button className="reset-button" type="button" onClick={reset}>
              <span aria-hidden="true">↺</span> Reset example
            </button>
          </div>
        </header>

        <section className="panel setup-panel" aria-labelledby="setup-title">
          <div className="section-heading">
            <div className="heading-title">
              <span className="step-number">01</span>
              <div>
                <span className="eyebrow">YOUR SETUP</span>
                <h2 id="setup-title">Build a trade scenario</h2>
              </div>
            </div>
            <span className="fee-note">Calculations include entry + exit fees</span>
          </div>

          <div className="side-control" role="group" aria-label="Trade direction">
            <span className="side-label">Direction</span>
            <div className="side-options">
              <button type="button" className={form.side === "long" ? "selected long" : ""} aria-pressed={form.side === "long"} onClick={() => setForm((current) => ({ ...current, side: "long" }))}>
                <span aria-hidden="true">↗</span> Long
              </button>
              <button type="button" className={form.side === "short" ? "selected short" : ""} aria-pressed={form.side === "short"} onClick={() => setForm((current) => ({ ...current, side: "short" }))}>
                <span aria-hidden="true">↘</span> Short
              </button>
            </div>
          </div>

          <div className="form-grid">
            <label className="field">
              <span className="field-label">Asset</span>
              <span className="select-wrap">
                <select value={form.asset} onChange={update("asset")} aria-label="Asset">
                  <option value="BTC">Bitcoin (BTC)</option>
                  <option value="SOL">Solana (SOL)</option>
                </select>
                <span className="select-chevron" aria-hidden="true">⌄</span>
              </span>
            </label>
            <label className="field">
              <span className="field-label">Quote currency</span>
              <span className="select-wrap">
                <select value={form.quote} onChange={update("quote")} aria-label="Quote currency">
                  <option value="USDT">USDT</option>
                  <option value="USDC">USDC</option>
                </select>
                <span className="select-chevron" aria-hidden="true">⌄</span>
              </span>
            </label>
            <NumberField label="Position amount" value={form.amount} onChange={update("amount")} unit={form.quote} step="0.01" />
            <NumberField label="Entry price" value={form.entry} onChange={update("entry")} unit={form.quote} />
            <NumberField label="Stop loss" value={form.stopLoss} onChange={update("stopLoss")} unit={form.quote} />
            <NumberField label="Take profit" value={form.takeProfit} onChange={update("takeProfit")} unit={form.quote} />
            <NumberField label="Entry fee" value={form.entryFeePercent} onChange={update("entryFeePercent")} unit="%" step="0.001" />
            <NumberField label="Exit fee" value={form.exitFeePercent} onChange={update("exitFeePercent")} unit="%" step="0.001" />
          </div>

          {calc.valid ? (
            <div className="formula-strip">
              <div><span className="strip-icon" aria-hidden="true">◈</span><span className="strip-copy"><span className="strip-label">Position size</span><strong>{qty(calc.quantity)} <small>{form.asset}</small></strong></span></div>
              <div><span className="strip-icon fee-icon" aria-hidden="true">%</span><span className="strip-copy"><span className="strip-label">Entry fee</span><strong>{money(calc.entryFee, form.quote)}</strong></span></div>
              <div><span className="strip-icon capital-icon" aria-hidden="true">↗</span><span className="strip-copy"><span className="strip-label">Capital + entry fee</span><strong>{money(calc.totalCapital, form.quote)}</strong></span></div>
            </div>
          ) : (
            <div className="validation-message" role="status"><span aria-hidden="true">!</span>{calc.message}</div>
          )}
        </section>

        {calc.valid ? (
          <>
            <div className="scenario-section-heading">
              <div><span className="eyebrow">02 / POSSIBLE OUTCOMES</span><h2>See both sides of the trade</h2></div>
              <span className="scenario-note">Estimates · not live market prices</span>
            </div>
            <div className="scenario-grid">
              <ScenarioCard title="IF PRICE MOVES IN YOUR FAVOR" result={calc.tp} accent="profit" currency={form.quote} />
              <ScenarioCard title="IF YOUR STOP IS HIT" result={calc.sl} accent="loss" currency={form.quote} />
            </div>

            <section className="panel summary-panel">
              <div className="section-heading">
                <div className="heading-title">
                  <span className="step-number">03</span>
                  <div><span className="eyebrow">AT A GLANCE</span><h2>Trade summary</h2></div>
                </div>
                <span className="fee-note">Based on your price targets</span>
              </div>
              <div className="summary-grid">
                <Metric label="Risk / reward" value={Number.isFinite(calc.riskReward) ? `1 : ${calc.riskReward.toFixed(2)}` : "1 : ∞"} subtext="Net of estimated fees" />
                <Metric label="Break-even price" value={price(calc.breakEvenPrice)} subtext="Covers entry + exit fees" />
                <Metric label="Loss if stopped" value={money(-calc.risk, form.quote)} tone="loss" />
                <Metric label="Gain at target" value={money(calc.reward, form.quote)} tone="profit" />
              </div>
            </section>

            <details className="how-it-works">
              <summary><span><span className="eyebrow">THE MATH</span><strong>How these estimates work</strong></span><span className="details-toggle" aria-hidden="true">+</span></summary>
              <div className="details-content">
                <p>Position size = position amount ÷ entry price. Fees are applied to the entry amount and estimated exit value.</p>
                <p><strong>Net P&amp;L = directional price change − entry fee − exit fee.</strong> A long benefits from a rising price; a short benefits from a falling price.</p>
                <p className="disclaimer">This is a planning estimate, not financial advice or a live price feed. It excludes leverage, borrowing or funding costs, spread, slippage, taxes, and withdrawal fees. Actual execution and exchange fee tiers may differ.</p>
              </div>
            </details>
          </>
        ) : null}

        <footer><span>Position planner <span className="footer-separator">·</span> Estimates only</span><span>Double-check your exchange's fees before trading.</span></footer>
      </div>
    </main>
  );
}
