/**
 * Love Laundry intent ANN.
 *
 * Zero dependencies, runs in Node.js and in the browser (Vite can bundle it).
 * Architecture: sparse bag-of-words (word uni/bi-grams + character tri-grams)
 * -> 2 hidden ReLU layers -> softmax intent classifier.
 */

const DEFAULT_OPTIONS = {
  epochs: 250,
  learningRate: 0.008,
  batchSize: 24,
  hidden: [128, 64],
  l2: 0.0002,
  minDocFreq: 2,
  maxFeatures: 3000,
  minConfidence: 0.34,
  select: "best",
  seed: 42,
};

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffleIndices(length, rng) {
  const indices = Array.from({ length }, (_, i) => i);
  for (let i = length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }
  return indices;
}

/** Unicode-aware tokenizer with word, word-bigram and character-trigram features. */
export function tokenize(text) {
  const words = String(text || "")
    .toLowerCase()
    .normalize("NFKC")
    .match(/[\p{L}\p{N}]+/gu) || [];

  const features = [];

  words.forEach((word, index) => {
    features.push(`w:${word}`);

    if (word.length >= 4) {
      for (let i = 0; i <= word.length - 3; i += 1) {
        features.push(`c:${word.slice(i, i + 3)}`);
      }
    }

    if (index < words.length - 1) {
      features.push(`b:${word}_${words[index + 1]}`);
    }
  });

  return features;
}

function buildVocabulary(examples, options) {
  const docFrequency = new Map();

  examples.forEach((example) => {
    const seen = new Set(tokenize(example.text));
    seen.forEach((feature) => {
      docFrequency.set(feature, (docFrequency.get(feature) || 0) + 1);
    });
  });

  const eligible = [...docFrequency.entries()]
    .filter(([, frequency]) => frequency >= options.minDocFreq)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, options.maxFeatures);

  const vocabulary = eligible.map(([feature]) => feature);
  const indexByFeature = new Map(vocabulary.map((feature, i) => [feature, i]));
  const total = examples.length;
  const idf = eligible.map(([, frequency]) => Math.log((1 + total) / (1 + frequency)) + 1);

  return { vocabulary, indexByFeature, idf };
}

export function vectorize(text, model) {
  const values = new Map();

  tokenize(text).forEach((feature) => {
    const index = model.featureIndex?.[feature] ?? model.indexByFeature?.get(feature);
    if (index !== undefined) values.set(index, (values.get(index) || 0) + 1);
  });

  const x = new Float64Array(model.vocabulary.length);
  let norm = 0;
  values.forEach((count, index) => {
    const value = count * model.idf[index];
    x[index] = value;
    norm += value * value;
  });

  norm = Math.sqrt(norm) || 1;
  for (let i = 0; i < x.length; i += 1) x[i] /= norm;
  return x;
}

function makeLayer(fanIn, fanOut, rng, isOutput = false) {
  const scale = isOutput ? Math.sqrt(1 / fanIn) : Math.sqrt(2 / fanIn);
  const weights = Array.from({ length: fanOut }, () =>
    Float64Array.from({ length: fanIn }, () => (rng() * 2 - 1) * scale)
  );
  const biases = new Float64Array(fanOut);

  return {
    weights,
    biases,
    mWeights: weights.map((row) => new Float64Array(row.length)),
    vWeights: weights.map((row) => new Float64Array(row.length)),
    mBiases: new Float64Array(fanOut),
    vBiases: new Float64Array(fanOut),
  };
}

function createNetwork(inputSize, hiddenSizes, outputSize, rng) {
  const sizes = [inputSize, ...hiddenSizes, outputSize];
  const layers = [];

  for (let i = 0; i < sizes.length - 1; i += 1) {
    layers.push(makeLayer(sizes[i], sizes[i + 1], rng, i === sizes.length - 2));
  }

  return { layers };
}

function cloneWeights(network) {
  return network.layers.map((layer) => ({
    weights: layer.weights.map((row) => Array.from(row)),
    biases: Array.from(layer.biases),
  }));
}

function restoreWeights(network, snapshot) {
  snapshot.forEach((saved, layerIndex) => {
    const layer = network.layers[layerIndex];
    saved.weights.forEach((row, rowIndex) => layer.weights[rowIndex].set(row));
    layer.biases.set(saved.biases);
  });
}

function forward(network, x) {
  const activations = [x];
  const preActivations = [];

  network.layers.forEach((layer, layerIndex) => {
    const input = activations[layerIndex];
    const z = new Float64Array(layer.biases.length);

    for (let o = 0; o < z.length; o += 1) {
      let sum = layer.biases[o];
      const row = layer.weights[o];
      for (let i = 0; i < row.length; i += 1) sum += row[i] * input[i];
      z[o] = sum;
    }

    preActivations.push(z);

    if (layerIndex === network.layers.length - 1) {
      const max = Math.max(...z);
      const exponentials = Array.from(z, (value) => Math.exp(value - max));
      const total = exponentials.reduce((sum, value) => sum + value, 0);
      activations.push(Float64Array.from(exponentials, (value) => value / total));
    } else {
      activations.push(Float64Array.from(z, (value) => (value > 0 ? value : 0)));
    }
  });

  return { probabilities: activations[activations.length - 1], activations, preActivations };
}

function adamStep(layer, gradients, learningRate, step, options) {
  const beta1 = 0.9;
  const beta2 = 0.999;
  const epsilon = 1e-8;
  const biasCorrection1 = 1 - Math.pow(beta1, step);
  const biasCorrection2 = 1 - Math.pow(beta2, step);

  for (let o = 0; o < layer.weights.length; o += 1) {
    const row = layer.weights[o];
    const gradRow = gradients.weights[o];
    const mRow = layer.mWeights[o];
    const vRow = layer.vWeights[o];

    for (let i = 0; i < row.length; i += 1) {
      const gradient = gradRow[i] + options.l2 * row[i];
      mRow[i] = beta1 * mRow[i] + (1 - beta1) * gradient;
      vRow[i] = beta2 * vRow[i] + (1 - beta2) * gradient * gradient;
      const mHat = mRow[i] / biasCorrection1;
      const vHat = vRow[i] / biasCorrection2;
      row[i] -= (learningRate * mHat) / (Math.sqrt(vHat) + epsilon);
      gradRow[i] = 0;
    }
  }

  for (let o = 0; o < layer.biases.length; o += 1) {
    const gradient = gradients.biases[o];
    layer.mBiases[o] = beta1 * layer.mBiases[o] + (1 - beta1) * gradient;
    layer.vBiases[o] = beta2 * layer.vBiases[o] + (1 - beta2) * gradient * gradient;
    const mHat = layer.mBiases[o] / biasCorrection1;
    const vHat = layer.vBiases[o] / biasCorrection2;
    layer.biases[o] -= (learningRate * mHat) / (Math.sqrt(vHat) + epsilon);
    gradients.biases[o] = 0;
  }
}

function emptyGradients(network) {
  return network.layers.map((layer) => ({
    weights: layer.weights.map((row) => new Float64Array(row.length)),
    biases: new Float64Array(layer.biases.length),
  }));
}

function backward(network, activations, preActivations, label, gradients) {
  const lastIndex = network.layers.length - 1;
  const probabilities = activations[activations.length - 1];
  let delta = Array.from(probabilities);
  delta[label] -= 1;

  for (let layerIndex = lastIndex; layerIndex >= 0; layerIndex -= 1) {
    const layer = network.layers[layerIndex];
    const input = activations[layerIndex];
    const gradient = gradients[layerIndex];

    for (let o = 0; o < layer.weights.length; o += 1) {
      const row = layer.weights[o];
      const gradRow = gradient.weights[o];
      const deltaO = delta[o];
      for (let i = 0; i < row.length; i += 1) gradRow[i] += deltaO * input[i];
      gradient.biases[o] += deltaO;
    }

    if (layerIndex > 0) {
      const previousDelta = new Float64Array(layer.weights[0].length);
      for (let o = 0; o < layer.weights.length; o += 1) {
        const row = layer.weights[o];
        const deltaO = delta[o];
        for (let i = 0; i < row.length; i += 1) previousDelta[i] += deltaO * row[i];
      }
      const previousPre = preActivations[layerIndex - 1];
      for (let i = 0; i < previousDelta.length; i += 1) {
        previousDelta[i] = previousPre[i] > 0 ? previousDelta[i] : 0;
      }
      delta = previousDelta;
    }
  }
}

function splitDataset(examples, intentIds, rng) {
  const train = [];
  const test = [];

  intentIds.forEach((intentId) => {
    const group = shuffleIndices(
      examples.filter((example) => example.intent === intentId).length,
      rng
    );
    const groupExamples = examples.filter((example) => example.intent === intentId);
    const testCount = Math.max(1, Math.floor(group.length * 0.1));

    group.forEach((index, position) => {
      (position < testCount ? test : train).push(groupExamples[index]);
    });
  });

  return {
    train: shuffleIndices(train.length, rng).map((index) => train[index]),
    test,
  };
}

function evaluate(network, examples, vectors, labels) {
  let correct = 0;
  examples.forEach((example, index) => {
    const { probabilities } = forward(network, vectors[index]);
    let best = 0;
    for (let i = 1; i < probabilities.length; i += 1) {
      if (probabilities[i] > probabilities[best]) best = i;
    }
    if (best === labels[index]) correct += 1;
  });
  return correct / Math.max(1, examples.length);
}

/** Train an intent classifier from the seed/custom JSON dataset. */
export function trainModel(data, options = {}) {
  const config = { ...DEFAULT_OPTIONS, ...options };
  const rng = mulberry32(config.seed);

  const intentIds = data.intents.map((intent) => intent.id);
  const intentIndex = new Map(intentIds.map((id, index) => [id, index]));
  const examples = [];

  data.intents.forEach((intent) => {
    if (!intent.examples?.length) return;
    intent.examples.forEach((text) => {
      examples.push({ text, intent: intent.id });
    });
  });

  if (examples.length < intentIds.length) {
    throw new Error("Training data needs at least one example per intent.");
  }

  const { vocabulary, indexByFeature, idf } = buildVocabulary(examples, config);
  if (vocabulary.length === 0) throw new Error("Vocabulary is empty; add more examples.");

  const featureIndex = Object.fromEntries(vocabulary.map((feature, i) => [feature, i]));
  const modelCore = { vocabulary, indexByFeature, idf, featureIndex };
  const vectors = examples.map((example) => vectorize(example.text, modelCore));
  const labels = examples.map((example) => intentIndex.get(example.intent));
  const { train, test } = splitDataset(examples, intentIds, rng);
  const trainVectors = train.map((example) => vectors[examples.indexOf(example)]);
  const trainLabels = train.map((example) => labels[examples.indexOf(example)]);
  const testVectors = test.map((example) => vectors[examples.indexOf(example)]);
  const testLabels = test.map((example) => labels[examples.indexOf(example)]);

  const network = createNetwork(vocabulary.length, config.hidden, intentIds.length, rng);
  const gradients = emptyGradients(network);
  let bestAccuracy = -1;
  let bestWeights = cloneWeights(network);
  let step = 0;

  for (let epoch = 1; epoch <= config.epochs; epoch += 1) {
    const order = shuffleIndices(train.length, rng);
    const learningRate = config.learningRate * (1 / (1 + epoch * 0.0015));

    for (let start = 0; start < order.length; start += config.batchSize) {
      const batch = order.slice(start, start + config.batchSize);
      batch.forEach((index) => {
        const { activations, preActivations } = forward(network, trainVectors[index]);
        backward(network, activations, preActivations, trainLabels[index], gradients);
      });

      step += 1;
      network.layers.forEach((layer, layerIndex) => {
        const scale = 1 / batch.length;
        gradients[layerIndex].weights.forEach((row) => {
          for (let i = 0; i < row.length; i += 1) row[i] *= scale;
        });
        for (let i = 0; i < gradients[layerIndex].biases.length; i += 1) {
          gradients[layerIndex].biases[i] *= scale;
        }
        adamStep(layer, gradients[layerIndex], learningRate, step, config);
      });
    }

    if (epoch % 5 === 0 || epoch === config.epochs) {
      const accuracy = evaluate(network, test, testVectors, testLabels);
      if (accuracy > bestAccuracy) {
        bestAccuracy = accuracy;
        bestWeights = cloneWeights(network);
      }
    }
  }

  if (config.select === "final") {
    bestAccuracy = evaluate(network, test, testVectors, testLabels);
  } else {
    restoreWeights(network, bestWeights);
  }

  return {
    model: {
      version: 1,
      createdAt: new Date().toISOString(),
      name: data.name || "Love Laundry intent model",
      intents: intentIds,
      answers: data.answers,
      keywords: data.keywords || {},
      vocabulary,
      idf,
      featureIndex,
      hidden: config.hidden,
      threshold: { minConfidence: config.minConfidence },
      layers: cloneWeights(network),
      training: {
        examples: examples.length,
        features: vocabulary.length,
        epochs: config.epochs,
        hidden: config.hidden,
        testAccuracy: Number(bestAccuracy.toFixed(4)),
      },
    },
    stats: {
      examples: examples.length,
      features: vocabulary.length,
      intents: intentIds.length,
      testAccuracy: bestAccuracy,
    },
  };
}

function networkFromModel(model) {
  if (model.version !== 1) throw new Error(`Unsupported model version: ${model.version}`);

  return {
    layers: model.layers.map((saved) => ({
      weights: saved.weights.map((row) => Float64Array.from(row)),
      biases: Float64Array.from(saved.biases),
    })),
  };
}

/** Return intent probabilities for a message. */
export function predict(model, text) {
  const network = networkFromModel(model);
  const x = vectorize(text, model);
  const { probabilities } = forward(network, x);

  let best = 0;
  for (let i = 1; i < probabilities.length; i += 1) {
    if (probabilities[i] > probabilities[best]) best = i;
  }

  const scores = {};
  model.intents.forEach((intent, index) => {
    scores[intent] = Number(probabilities[index].toFixed(4));
  });

  return {
    intent: model.intents[best],
    confidence: probabilities[best],
    scores,
  };
}

function normalizeMatchText(text) {
  return ` ${String(text || "")
    .toLowerCase()
    .normalize("NFKC")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim()} `;
}

/**
 * Curated domain lexicon. Each matched phrase adds evidence to an intent;
 * multi-word phrases count more than single words. This keeps the ANN honest
 * when a visitor uses a synonym that was not in the training examples.
 */
function keywordEvidence(model, text) {
  const haystack = normalizeMatchText(text);
  const scores = {};
  model.intents.forEach((intent) => { scores[intent] = 0; });

  Object.entries(model.keywords || {}).forEach(([intent, phrases]) => {
    if (!(intent in scores) || !Array.isArray(phrases)) return;
    phrases.forEach((phrase) => {
      const needle = normalizeMatchText(phrase).trim();
      if (needle && haystack.includes(` ${needle} `)) {
        scores[intent] += needle.includes(" ") ? 2 : 1.2;
      }
    });
  });

  let best = null;
  let bestScore = 0;
  model.intents.forEach((intent) => {
    if (scores[intent] > bestScore) {
      bestScore = scores[intent];
      best = intent;
    }
  });

  return { scores, best, bestScore };
}

/** Full reply helper shared by the Node server and the browser fallback. */
export function respond(model, text, lang = "en") {
  const prediction = predict(model, text);
  const evidence = keywordEvidence(model, text);

  // ANN is the base model, but a matched domain keyword is strong evidence:
  // visitors often use synonyms that were absent from the training examples.
  let bestIntent = prediction.intent;
  let confidence = prediction.confidence;

  if (evidence.bestScore > 0) {
    const keywordTotal = Object.values(evidence.scores).reduce((sum, score) => sum + score, 0);
    const combined = {};
    model.intents.forEach((intent) => {
      const keywordShare = (evidence.scores[intent] || 0) / keywordTotal;
      combined[intent] = 0.25 * (prediction.scores[intent] || 0) + 0.75 * keywordShare;
    });

    let bestScore = -1;
    model.intents.forEach((intent) => {
      if (combined[intent] > bestScore) {
        bestScore = combined[intent];
        bestIntent = intent;
      }
    });
    confidence = bestScore;
  }

  confidence = Math.min(1, confidence);
  const threshold = model.threshold?.minConfidence ?? DEFAULT_OPTIONS.minConfidence;
  // A curated keyword match is trusted even when several intents share tokens;
  // otherwise low ANN confidence routes to the human contact fallback.
  const isFallback =
    bestIntent === "fallback" || (evidence.bestScore === 0 && confidence < threshold);
  const intent = isFallback ? "fallback" : bestIntent;
  const answers = model.answers?.[intent] || {};

  return {
    intent,
    confidence: Number(confidence.toFixed(4)),
    lowConfidence: isFallback,
    text: answers[lang] || answers.en || "Sorry, I could not answer that. Please call +94 77 420 0919.",
  };
}
