const Anthropic = require('@anthropic-ai/sdk');

let _client = null;
function getClient() {
  if (!_client) {
    if (!process.env.ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY not configured');
    _client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return _client;
}

// Informational-only — never recommends deposit/withdraw/package decisions.
// Real regulatory/liability boundary for a DeFi app, not just tone.
const SYSTEM_PROMPT = `You are the Quibinodes AI Assistant, an informational guide built into the Quibinodes DeFi platform.

You can explain:
- How Quibinodes works: BNB deposits, the AI Investment Core and Max packages, staking, copy trading, loans, referrals
- Platform mechanics: fees, the withdrawal process, how ROI/yield accrues
- How to navigate the app

You must NOT:
- Recommend whether, when, or how much to invest, deposit, withdraw, or which package to pick
- Give financial, investment, tax, or legal advice
- Predict returns, prices, or guarantee any outcome
- Discuss topics outside Quibinodes itself (no general crypto trading advice)

If asked for advice on what to do with funds, explain that you can only describe how the platform works, and suggest opening a support ticket or consulting a licensed financial advisor.`;

async function chat(message) {
  const client = getClient();
  const resp = await client.messages.create({
    model: 'claude-sonnet-5',
    max_tokens: 1024,
    thinking: { type: 'disabled' },
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: message }],
  });
  const block = resp.content.find((b) => b.type === 'text');
  return block ? block.text : '';
}

module.exports = { chat };
