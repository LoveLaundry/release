# Love Laundry ANN Chat Bot

A dependency-free, trainable **intent neural network** for the Love Laundry
website. The same model and answer set run in three places:

1. directly in the browser (default — no backend or API key needed),
2. as a standalone Node.js chat API, and
3. behind the optional hosted conversation service when admin takeover is used.

The bot is laundry-domain specific and answers in English and Sinhala.

## What is here

```
chat-bot/
├── core/ann.js                 # tokenizer, trainer, predictor, responder (Node + browser)
├── core/ann.d.ts               # TypeScript types for the public site
├── data/intents.json           # training examples + EN/SIN answers (1,289 examples)
├── data/keywords.json          # curated EN/SIN domain lexicon embedded into the model
├── data/generated-examples.json# first deterministic paraphrase batch (folded into training)
├── data/generated-examples-2.json # second paraphrase batch (folded into training)
├── data/validation.json        # first human paraphrase set (folded into training)
├── data/validation2.json       # second human paraphrase set (folded into training)
├── data/validation3.json       # generated unseen paraphrases (94.3% final)
├── data/validation4.json       # human-written unseen questions (100% final)
├── model/model.json            # trained model used by the Node server
├── scripts/train.js            # training CLI
├── scripts/generate-examples.js# deterministic paraphrase generator
├── scripts/evaluate.js         # training-set accuracy + single-query tester
├── scripts/evaluate-validation.js # unseen-set checker
├── server.js                   # zero-dependency HTTP chat API
└── package.json
```

Training also writes the browser copy to `../public/bot-model.json`.

## How the model works

1. Text is lowercased and split into Unicode words.
2. Features are word unigrams, word bigrams and character trigrams. Character
   trigrams make Sinhala and typo handling much more robust.
3. Features are TF-IDF weighted and L2-normalised.
4. A sparse `2211 -> 128 -> 64 -> 34` ReLU/softmax network predicts an intent.
5. A curated EN/SIN keyword lexicon is blended with the ANN posterior. A
   confident domain keyword can correct a plausible-but-wrong neural guess;
   unknown topics still route to the `fallback` answer with a real phone number.

Training uses mini-batch gradient descent with Adam, cross-entropy loss, L2
regularisation, shuffled batches and best-epoch selection on a held-out 10%
test split.

### Final model

| Metric | Value |
|---|---|
| Examples | 1,289 |
| Intents | 34 |
| Features | 2,211 |
| Architecture | 128 × 64 hidden layers |
| Epochs | 300 |
| Learning rate | 0.005 |
| L2 | 0.0005 |
| Seed | 7 |
| Held-out test accuracy | 84.5% |
| Training-set check | 98.3% (1267/1289) |
| Unseen human questions (`validation4`) | 100.0% (50/50) |
| Unseen generated paraphrases (`validation3`) | 94.3% (633/671) |

## Train / retrain

From this folder, use the exact final command:

```bash
node scripts/train.js \
  --epochs 300 --lr 0.005 --min-df 2 --max-features 2500 \
  --hidden 128,64 --l2 0.0005 --seed 7
```

`npm run train` uses the same defaults. Both model files are rewritten.

Useful flags:

| Flag | Meaning |
|---|---|
| `--data` | JSON file with `intents` + `answers` |
| `--out` | Node model path (default `model/model.json`) |
| `--public-out` | Browser model path (default `../public/bot-model.json`) |
| `--epochs` | Training epochs |
| `--lr` | Learning rate |
| `--hidden` | Comma-separated hidden layer sizes |
| `--min-df` | Minimum document frequency for a feature |
| `--max-features` | Vocabulary cap |
| `--min-confidence` | Below this, use the fallback answer |
| `--l2` | L2 regularisation strength |
| `--select` | `best` (default) or `final` epoch weights |
| `--seed` | Reproducible random seed |

### Edit the knowledge base

`data/intents.json` contains `answers` (EN/SIN text per intent) and `intents`
(example questions per intent):

```json
{
  "answers": {
    "pricing": { "en": "...", "sin": "..." }
  },
  "intents": [
    { "id": "pricing", "examples": ["how much", "මිල කීයද"] }
  ]
}
```

- Add examples under an existing intent to teach new wording.
- Add a new intent object plus matching `answers` and `keywords` entries for a
  new topic.
- Keep the special `fallback` intent — it catches out-of-domain questions.
- Add synonyms to `data/keywords.json`; they are embedded into the model at
  training time and used by `respond()` at answer time.
- Retrain after any data or lexicon edit.

### Generate more paraphrases

```bash
node scripts/generate-examples.js \
  --seed 777 --en 12 --sin 8 \
  --out data/generated-examples-2.json --exclude-training
```

The generator is deterministic and slot-based. `--exclude-training` drops any
wording already present in `data/intents.json`, so the output can be used as a
genuinely unseen validation set or merged into training for the next round.
`validation3.json` was produced with seed `999`.

## Check the model

```bash
npm run check                                             # training-set accuracy
npm run check:validation -- --file data/validation4.json  # human unseen set
npm run check:validation -- --file data/validation3.json  # generated unseen set
npm run check -- --query "do you collect from hotels" en
npm run check -- --query "ඔබ ගෙදරින් එකතු කරනවද" sin
```

`check:validation` defaults to `data/validation4.json`. It calls `respond()`,
not just the raw `predict()`, so the score reflects what visitors actually
receive.

`validation.json` and `validation2.json` were used in earlier rounds and are
now folded into training. Use `validation3` and `validation4` for honest
generalisation checks.

## Run the Node server

```bash
npm start                 # http://localhost:8787
PORT=9000 npm start
ALLOWED_ORIGIN=https://lovelaundry.lk npm start
MODEL_PATH=./model/model.json npm start
```

Endpoints:

| Method | Path | Purpose |
|---|---|---|
| GET | `/health` | Model name, intents and training stats |
| POST | `/chat` | `{ "message": "...", "lang": "en" \| "sin" }` |
| POST | `/predict` | Same shape as `/chat` |

Example:

```bash
curl -X POST http://localhost:8787/chat \
  -H 'Content-Type: application/json' \
  -d '{"message":"where is your counter?","lang":"en"}'
```

Deploy requirements: Node 18+, no `npm install` needed (zero dependencies).
Set `PORT` from the platform and `ALLOWED_ORIGIN` to the public site origin.

## Connect the website

The public site picks a mode automatically:

1. `VITE_CHAT_API_URL` set → hosted conversation service with admin takeover.
2. `VITE_BOT_API_URL` set → this Node server, with bundled ANN as fallback.
3. Neither set → bundled `/bot-model.json` ANN running in the browser.

To connect a deployed ANN server, set in the public site environment:

```bash
VITE_BOT_API_URL=https://your-ann-server.onrender.com
```

Leave both unset for a fully static deployment. The browser loads the ANN code
as a separate lazy chunk and keeps the short conversation in `localStorage`.

## Safety / behaviour notes

- The bot answers laundry-specific topics only; unknown questions get a
  call/WhatsApp fallback with the real number.
- It never claims home pickup or delivery for the public. Public customers drop
  off and collect at the counter or a partner shop; hotels and partner shops
  arrange collection separately.
- English and Sinhala are supported by training examples, lexicon and answers.
- If the Node API is configured but unreachable, the browser silently uses the
  bundled model; if that also fails, it shows a static contact answer.
