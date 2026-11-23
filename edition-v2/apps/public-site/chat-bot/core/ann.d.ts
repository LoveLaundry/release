export interface IntentTrainingData {
  name?: string;
  answers: Record<string, Record<string, string>>;
  intents: Array<{ id: string; examples: string[] }>;
}

export interface TrainingOptions {
  epochs?: number;
  learningRate?: number;
  batchSize?: number;
  hidden?: number[];
  l2?: number;
  minDocFreq?: number;
  maxFeatures?: number;
  minConfidence?: number;
  select?: "best" | "final";
  seed?: number;
}

export interface BotModel {
  version: number;
  createdAt: string;
  name: string;
  intents: string[];
  answers: Record<string, Record<string, string>>;
  keywords: Record<string, string[]>;
  vocabulary: string[];
  idf: number[];
  featureIndex: Record<string, number>;
  hidden: number[];
  threshold: { minConfidence: number };
  layers: Array<{ weights: number[][]; biases: number[] }>;
  training: {
    examples: number;
    features: number;
    epochs: number;
    hidden: number[];
    testAccuracy: number;
  };
}

export interface Prediction {
  intent: string;
  confidence: number;
  scores: Record<string, number>;
}

export interface BotResponse {
  intent: string;
  confidence: number;
  lowConfidence: boolean;
  text: string;
}

export function tokenize(text: string): string[];
export function trainModel(
  data: IntentTrainingData,
  options?: TrainingOptions
): { model: BotModel; stats: { examples: number; features: number; intents: number; testAccuracy: number } };
export function predict(model: BotModel, text: string): Prediction;
export function respond(model: BotModel, text: string, lang?: string): BotResponse;
