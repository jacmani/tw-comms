# TWAOA FM Communication Tool — Cost-Inverted AI Infrastructure Report

**Document 5** · Companion to `01`–`04`
**Question addressed:** Can notice drafting and image generation run on free/near-free AI infrastructure, using historical TWAOA content to make the system smarter, sustainably for 2–3 years?
**Short answer:** Yes for drafting, with one important caveat on which tier to use. For images, "free" and "safe to feed real content into" don't fully overlap — there's a small, worthwhile paid layer to keep. Full reasoning below.

---

## 1. The one decision that matters most: free tier vs. cheap paid tier

This is worth resolving before anything else, because it changes which content you're allowed to feed the system.

**On Google's Gemini API specifically** (the strongest free option — see §2), the free tier and the paid tier are not just a rate-limit difference. They're a *data-handling* difference:

- **Free tier (Google AI Studio / unpaid API key):** Google explicitly states it may use submitted content to improve its products, including for training, and human reviewers may see it.
- **Paid tier (billing enabled, same models):** Google's terms state prompts and responses are not used to improve products or for training.

This matters directly for your plan, because you want to feed the system **real historical notices — committee decisions, resident-facing announcements, possibly names, flat numbers, vendor details.** Sending that through the free tier means it's sitting in Google's training/review pipeline indefinitely. Sending the same content through the paid tier, with billing enabled but $0 actually spent most months, means it's contractually excluded from training.

**Recommendation: enable billing on the Gemini API (Tier 1), but design so your actual usage rarely exceeds what the free tier would have covered.** You get the *privacy terms* of the paid tier while your *bill* stays at or near the free tier's ceiling in practice. This is not a compromise — it's strictly better than the free tier on both axes (privacy AND higher rate limits) for a cost that, as shown in §3, rounds to a few hundred rupees a year at your volume.

This is the single most important adjustment to "free of cost" as originally asked: **free-tier text generation is not a safe place to put historical resident/committee content.** A trivially-billed paid tier is.

---

## 2. Text drafting — the landscape

| Provider | Free tier reality | Fit for TWAOA |
|---|---|---|
| **Google Gemini (Flash / Flash-Lite)** | Free tier: strong, but content used for training/review. Paid Tier 1: $0.10–$0.30 per million input tokens, no training use, much higher limits, no minimum spend. | **Best fit.** Multimodal (handles the poster-image side too), largest free/cheap context window in the market, and the paid tier is the one that actually protects your content. |
| **Groq** | Genuinely free, fast, no training-use concerns raised in research — but only serves open-weight models (Llama, etc.), not a frontier proprietary model, and rate limits are tighter (30 RPM, ~1,000 requests/day on the model tested). | Good as a **fallback/second opinion**, not primary — quality on nuanced committee-tone drafting is a step below Gemini Flash. |
| **OpenRouter** | Aggregates many models' free slots; 20 RPM / 50 free requests/day until $10 lifetime spend, then 1,000/day. | Useful as a **router/fallback layer** (see §5), not a primary pick on its own. |
| **Cerebras** | 1M tokens/day free, fastest raw throughput, no card required. | Speed-focused; fine as another fallback rung. |
| **Anthropic (Claude API)** | No meaningful free tier — occasional small trial credit, then pay-per-token. | This is the one you asked to avoid — correctly, for this use case. Claude via `claude.ai` chat (what Mani already uses for planning) remains free for that purpose; it's specifically the **API** cost for routine notice drafting that this report avoids. |
| **Self-hosted (Ollama + open weights)** | Zero marginal cost, but requires a machine to run inference on — not realistic to add to your existing Vercel/Supabase-based stack without a dedicated GPU host, which reintroduces a cost this whole exercise is trying to avoid. | Not recommended at TWAOA's scale — the ops burden costs more than the ₹100s/year the paid Gemini tier would cost. |

**Recommendation: Gemini Flash / Flash-Lite, paid tier, as primary.** It's the only option that's simultaneously cheap enough to round to free, multimodal (drafting text AND assisting with poster copy), and — critically — contractually keeps your historical content out of Google's training pipeline once billing is enabled.

---

## 3. What this actually costs at TWAOA's real volume

This is worth doing the arithmetic on, because "per million tokens" pricing is abstract until it's mapped to your actual usage.

**Realistic monthly volume:** Say 15–20 notices/month at steady state (routine notices + ads + occasional emergency), each drafting interaction using roughly 2,000–4,000 tokens of input (the prompt + a few historical examples for style-matching, per §4) and 300–500 tokens of output (the drafted notice). Image-prompt assistance adds a similar small amount.

- Input: ~20 notices × 3,000 tokens ≈ 60,000 tokens/month
- Output: ~20 notices × 400 tokens ≈ 8,000 tokens/month

At Gemini 2.5 Flash-Lite paid rates (~$0.10/M input, $0.40/M output): **under $0.01/month.** Even at 10x that volume for a very active month (committee meeting season, festival notices, ad surge), you're looking at a few cents. **Realistically, this system will spend single-digit dollars per year on text generation, total**, while sitting entirely outside Google's training pipeline. There is essentially no scenario at TWAOA's scale where this becomes a real line item — the free tier's rate limits (1,500 requests/day) are so far above your actual need that the "paid" tier is really just a privacy toggle, not a meaningful cost commitment.

---

## 4. Using your historical content — the right technique, and why

You offered to share several months of past notices and images so "the system has more content on the type of notices sent before." This is a good instinct, and the research is unambiguous on *how* to do it well at this scale:

**Use few-shot prompting (with light retrieval), not fine-tuning.** Fine-tuning means training a custom version of a model on your data — it has real setup cost, ongoing maintenance burden (re-tune when the base model updates), and the practitioner consensus across current sources is consistent: **fine-tuning only earns its complexity above roughly 1 million tokens/month of steady volume, or when you need a fixed rigid output schema prompting can't reliably hit.** TWAOA is nowhere near that volume (§3), and "match our committee's tone" is exactly the kind of style-matching problem few-shot prompting handles well without any training step.

**What this looks like concretely:**
1. Your historical notices (last few months, as offered) get stored as a small reference set — plain text/markdown, tagged by category (matching the `notice_templates` categories already in the spec: water outage, maintenance, event, security, dues reminder, ad).
2. When the FM drafts a new notice, the system pulls 2–3 *similar-category* historical examples and includes them in the prompt to Gemini as "here's how TWAOA has phrased this kind of notice before — draft in this style" — this is the "few-shot" part.
3. No training run, no model weights change, no ongoing fine-tune maintenance. Updating the reference set (adding this month's new notices) is just adding rows to a table, not retraining anything.
4. This is a natural extension of the `notice_templates` table already in the spec — historical notices become additional *reference examples* linked to templates, not a separate system.

**Storage:** this reference set lives in the same Supabase project as everything else — a `notice_examples` table (title, body, category, sent_date, optionally the image URL) populated once from what you share, then grown organically as new notices get sent through the system itself. No vector database, no separate RAG infrastructure needed at this volume — a simple "pull the 2–3 most recent examples in the same category" query does the job; true semantic vector search only starts earning its complexity past a few hundred documents, which is years away at your notice volume.

**On the images you mentioned sharing:** these are valuable as **style reference for the poster generator** (confirming the visual patterns TWAOA notices have actually used — colors, layout conventions, what residents are used to seeing) rather than as training data for an image model. Practically: review them once during Phase 4 build to refine the poster template's visual defaults, rather than feeding them into a generation pipeline. This gets the value (consistency with what residents already recognize as "an official TWAOA notice") without any image-model cost or complexity at all.

---

## 5. Image generation — free tier is more of a fit here, but read the caveat

Unlike text, most of your image generation is **template-driven poster rendering** (headline + details → branded PNG via `html-to-image`), which was already scoped in the original spec as needing **no AI model at all** — it's a design-template render, essentially free regardless of any AI provider decision. This section is about the smaller slice: AI-*assisted* image work (e.g., cleaning up a vendor's rough ad flyer into the branded style, or generating an illustrative image for an event notice).

| Option | Free tier reality | Fit |
|---|---|---|
| **Gemini 2.5 Flash Image ("Nano Banana")** | ~500 images/day free, no card required | Generous for TWAOA's volume (a handful of AI-assisted images a month at most) — but same free-tier-trains-on-your-data caveat as §1 applies here too, if any real vendor/resident content goes into the prompt |
| **FLUX.1 Schnell (self-hosted, open weights)** | Free to self-host, but needs a GPU — not realistic to bolt onto your Vercel/Supabase stack | Skip — infrastructure cost exceeds what it saves at this volume |
| **Imagen 4 (Vertex)** | Minimal free tier (~2/min), cheap paid ($0.02–$0.06/image) | A fine paid fallback if Gemini Image's free tier is ever insufficient — at TWAOA's volume this would cost pennies/month |

**Recommendation:** for the templated poster generator (the vast majority of image needs per the original spec), no AI model is involved at all — skip this whole question for that path. For the smaller AI-*assisted* slice (occasional flyer cleanup, illustrative imagery), the same logic as §1 applies: **use Gemini's paid tier rather than free**, since ad images may contain real vendor branding/contact info, and it costs pennies at this volume anyway.

---

## 6. Reliability — the fallback chain (this is what makes it durable for 2–3 years)

No free tier has an SLA, and rate limits or terms can change without notice — this is a real risk for a system meant to run for years, not months. The standard 2026 production pattern for exactly this situation is a **fallback chain**: try the primary provider, automatically retry on a secondary if the primary is rate-limited or down.

**Recommended chain for TWAOA:**
1. **Primary: Gemini Flash-Lite, paid tier** (§1–3) — cheap, private, generous limits
2. **Fallback: Groq's free tier** — if Gemini is rate-limited or briefly down, degrade gracefully to a free open-weight model rather than blocking the FM entirely. Slightly lower drafting quality is an acceptable tradeoff for "the compose screen still works" during a provider hiccup
3. **Final fallback: FM drafts manually** — the compose screen must always allow typing a notice from scratch with zero AI assistance; AI drafting is an accelerant, never a hard dependency. This was implicitly true in the original spec's Compose flow and is worth stating explicitly here as a design requirement, not just a nice-to-have

This three-rung chain costs nothing extra to build (a try/catch with a fallback provider call) and is what makes "sustainable for 2–3 years" realistic — providers' free-tier terms *will* shift over that window (the research shows Gemini's own free tier already tightened once in late 2025), and a system hard-wired to one provider's current free-tier terms is fragile in exactly the way a 2–3 year infrastructure commitment shouldn't be.

---

## 7. Revised recommendation, summarized

| Component | Provider | Cost | Data-safety posture |
|---|---|---|---|
| Notice drafting (primary) | Gemini Flash-Lite, **paid tier enabled** | <$5/year at TWAOA's volume | Content excluded from training (paid-tier terms) |
| Notice drafting (fallback) | Groq, free tier | $0 | Acceptable for occasional fallback use only |
| Historical content grounding | Few-shot examples from a `notice_examples` Supabase table, no fine-tuning | $0 (just storage, already in the existing Supabase project) | Content stays in your own database; only pulled examples go into individual prompts, under paid-tier terms |
| Templated poster generation | `html-to-image`, no AI model | $0 | N/A — no AI involved |
| AI-assisted image cleanup (occasional) | Gemini Image, **paid tier if any real content involved** | Pennies/year at TWAOA's volume | Same reasoning as text |
| Manual fallback | FM types directly, no AI | $0 | N/A |

**This is a cost-inverted architecture in the sense you asked for**: the system's baseline cost is near-zero, AI assistance makes it progressively smarter as more historical notices are added to the reference table (with zero retraining cost to do so), and the one place real money could have been spent — Claude API calls for routine drafting — is avoided entirely in favor of a provider whose paid tier is priced low enough to round to free while still protecting real committee/resident content, which the actual free tier does not.

**One thing worth flagging plainly, since it's the reason this report exists:** "free" and "safe for real resident data" are not the same property, and the original ask conflated them slightly by pairing "use free AI" with "share our real content." The recommendation above gets you both — but only because the paid tier at this volume is cheap enough that the distinction barely matters financially, while mattering quite a lot for what happens to 814 households' worth of committee communications.
