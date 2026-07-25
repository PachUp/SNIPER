export const metadata = { title: "Disclaimer – SNIPER" };

export default function DisclaimerPage() {
  return (
    <>
      <h1 className="text-xl font-bold">Disclaimer</h1>

      <h2 className="text-base font-bold">Not investment advice</h2>
      <p>
        SNIPER provides general information and educational content only. Nothing
        on this site is investment advice, a recommendation, or an offer or
        solicitation to buy or sell any security. SNIPER is not your broker,
        dealer, or investment adviser, and no advisory relationship is created by
        your use of the site.
      </p>

      <h2 className="text-base font-bold">Risk of loss</h2>
      <p>
        Investing in securities involves risk, including the possible loss of
        principal. Past or illustrated performance is not a guarantee of future
        results. Prices, fair-value estimates, &ldquo;growth potential&rdquo;, and the
        Buy / Sell target / Safety exit levels shown are informational and may be
        inaccurate, delayed, or change without notice.
      </p>

      <h2 className="text-base font-bold">Do your own research</h2>
      <p>
        You are solely responsible for your investment decisions. Consider your
        own circumstances and consult a licensed financial professional before
        acting on any information here.
      </p>

      <h2 className="text-base font-bold">No custody or execution</h2>
      <p>
        SNIPER does not hold your money and does not execute trades on your
        behalf. Any trades you make are placed through your own broker at your own
        discretion.
      </p>

      <p className="text-terminal-muted">
        [Placeholder — final wording, jurisdiction-specific disclosures (US and
        Israel), and licensing statements to be provided by legal counsel.]
      </p>
    </>
  );
}
