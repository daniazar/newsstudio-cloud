/**
 * src/lib/ai/darwinMediaEngine.ts
 *
 * Darwinian Media Evolution Engine.
 * 
 * Treats broadcast parameters (speaking cadence, color temperature, camera cut frequency,
 * vocal pitch, audio ducking headroom, lower-third style) as genetic chromosomes.
 * Runs genetic crossover and stochastic point mutations to evolve the channel's aesthetic
 * and optimize for viewer retention over successive generations.
 */

export interface BroadcastGenome {
  id: string;
  generation: number;
  cadenceWpm: number;            // 120 - 190 WPM
  lightingColorTempK: number;    // 3200K (warm tungsten) - 6500K (cool daylight)
  cutIntervalSec: number;        // 1.5s - 5.5s
  audioDuckingDb: number;        // -24dB to -10dB
  vocalPitchShift: number;       // -2.0 to +2.0 semitones
  brollZoomVelocity: number;     // 1.0 (static) to 1.35 (high dynamic zoom)
  lowerThirdStyle: "cyber_glass" | "classic_broadcast" | "minimal_dark" | "high_voltage";
  visualVibrance: number;        // 0.8 - 1.5
  fitnessScore: number;          // 0 - 100 (evaluated by retention & engagement)
}

export interface EvolutionHistory {
  totalGenerations: number;
  populationSize: number;
  initialBestFitness: number;
  finalBestFitness: number;
  bestGenome: BroadcastGenome;
  generationLog: Array<{
    generation: number;
    bestFitness: number;
    averageFitness: number;
    dominantTraits: string;
  }>;
}

const STYLES: BroadcastGenome["lowerThirdStyle"][] = [
  "cyber_glass",
  "classic_broadcast",
  "minimal_dark",
  "high_voltage",
];

export function createRandomGenome(id: string, generation = 1): BroadcastGenome {
  return {
    id,
    generation,
    cadenceWpm: Math.round(135 + Math.random() * 45),
    lightingColorTempK: Math.round(3400 + Math.random() * 2600),
    cutIntervalSec: parseFloat((1.8 + Math.random() * 3.2).toFixed(1)),
    audioDuckingDb: Math.round(-22 + Math.random() * 10),
    vocalPitchShift: parseFloat((-1.0 + Math.random() * 2.0).toFixed(1)),
    brollZoomVelocity: parseFloat((1.05 + Math.random() * 0.25).toFixed(2)),
    lowerThirdStyle: STYLES[Math.floor(Math.random() * STYLES.length)],
    visualVibrance: parseFloat((0.9 + Math.random() * 0.5).toFixed(2)),
    fitnessScore: 0,
  };
}

/**
 * Simulates audience retention fitness function
 * Ideal target zone: Cadence ~155-165 WPM, Cut ~2.2-3.0s, Ducking ~ -18dB, Temp ~ 5200K
 */
export function evaluateFitness(genome: BroadcastGenome): number {
  let score = 50;

  // Cadence optimization curve (peaks around 160 WPM)
  const cadenceDist = Math.abs(genome.cadenceWpm - 160);
  score += Math.max(0, 15 - cadenceDist * 0.5);

  // Cut interval optimization (peaks around 2.4s)
  const cutDist = Math.abs(genome.cutIntervalSec - 2.4);
  score += Math.max(0, 15 - cutDist * 4);

  // Audio ducking headroom (peaks around -18dB)
  const duckingDist = Math.abs(genome.audioDuckingDb - -18);
  score += Math.max(0, 10 - duckingDist * 0.8);

  // Lighting color temp (peaks around 5400K)
  const tempDist = Math.abs(genome.lightingColorTempK - 5400);
  score += Math.max(0, 10 - tempDist * 0.005);

  // Style bonus
  if (genome.lowerThirdStyle === "cyber_glass" || genome.lowerThirdStyle === "high_voltage") {
    score += 5;
  }

  // Stochastic natural viewer variance
  score += (Math.random() - 0.5) * 6;

  return Math.min(100, Math.max(20, Math.round(score)));
}

export function crossover(parentA: BroadcastGenome, parentB: BroadcastGenome, generation: number): BroadcastGenome {
  return {
    id: `genome_gen${generation}_${Math.random().toString(36).substring(2, 7)}`,
    generation,
    cadenceWpm: Math.random() > 0.5 ? parentA.cadenceWpm : parentB.cadenceWpm,
    lightingColorTempK: Math.random() > 0.5 ? parentA.lightingColorTempK : parentB.lightingColorTempK,
    cutIntervalSec: Math.random() > 0.5 ? parentA.cutIntervalSec : parentB.cutIntervalSec,
    audioDuckingDb: Math.random() > 0.5 ? parentA.audioDuckingDb : parentB.audioDuckingDb,
    vocalPitchShift: Math.random() > 0.5 ? parentA.vocalPitchShift : parentB.vocalPitchShift,
    brollZoomVelocity: Math.random() > 0.5 ? parentA.brollZoomVelocity : parentB.brollZoomVelocity,
    lowerThirdStyle: Math.random() > 0.5 ? parentA.lowerThirdStyle : parentB.lowerThirdStyle,
    visualVibrance: Math.random() > 0.5 ? parentA.visualVibrance : parentB.visualVibrance,
    fitnessScore: 0,
  };
}

export function mutate(genome: BroadcastGenome, mutationRate = 0.2): BroadcastGenome {
  const g = { ...genome };

  if (Math.random() < mutationRate) {
    g.cadenceWpm = Math.min(190, Math.max(120, g.cadenceWpm + Math.round((Math.random() - 0.5) * 16)));
  }
  if (Math.random() < mutationRate) {
    g.cutIntervalSec = parseFloat(Math.min(5.5, Math.max(1.5, g.cutIntervalSec + (Math.random() - 0.5) * 0.8)).toFixed(1));
  }
  if (Math.random() < mutationRate) {
    g.lightingColorTempK = Math.min(6500, Math.max(3200, g.lightingColorTempK + Math.round((Math.random() - 0.5) * 600)));
  }
  if (Math.random() < mutationRate) {
    g.audioDuckingDb = Math.min(-10, Math.max(-24, g.audioDuckingDb + Math.round((Math.random() - 0.5) * 4)));
  }
  if (Math.random() < mutationRate) {
    g.lowerThirdStyle = STYLES[Math.floor(Math.random() * STYLES.length)];
  }

  return g;
}

export function runDarwinianEvolution(generations = 5, populationSize = 8): EvolutionHistory {
  let population: BroadcastGenome[] = Array.from({ length: populationSize }, (_, i) =>
    createRandomGenome(`seed_${i + 1}`, 1)
  );

  // Evaluate initial fitness
  population.forEach((g) => {
    g.fitnessScore = evaluateFitness(g);
  });

  const initialBest = [...population].sort((a, b) => b.fitnessScore - a.fitnessScore)[0].fitnessScore;
  const history: EvolutionHistory["generationLog"] = [];

  for (let gen = 1; gen <= generations; gen++) {
    population.sort((a, b) => b.fitnessScore - a.fitnessScore);

    const best = population[0];
    const avg = Math.round(population.reduce((sum, g) => sum + g.fitnessScore, 0) / population.length);

    history.push({
      generation: gen,
      bestFitness: best.fitnessScore,
      averageFitness: avg,
      dominantTraits: `Cadence: ${best.cadenceWpm}WPM | Cuts: ${best.cutIntervalSec}s | Lighting: ${best.lightingColorTempK}K | Style: ${best.lowerThirdStyle}`,
    });

    // Reproduce top 50%
    const survivors = population.slice(0, Math.max(2, Math.floor(populationSize / 2)));
    const nextGen: BroadcastGenome[] = [best]; // Elitism: keep best

    while (nextGen.length < populationSize) {
      const p1 = survivors[Math.floor(Math.random() * survivors.length)];
      const p2 = survivors[Math.floor(Math.random() * survivors.length)];
      const child = mutate(crossover(p1, p2, gen + 1));
      child.fitnessScore = evaluateFitness(child);
      nextGen.push(child);
    }

    population = nextGen;
  }

  population.sort((a, b) => b.fitnessScore - a.fitnessScore);
  const finalBest = population[0];

  return {
    totalGenerations: generations,
    populationSize,
    initialBestFitness: initialBest,
    finalBestFitness: finalBest.fitnessScore,
    bestGenome: finalBest,
    generationLog: history,
  };
}
