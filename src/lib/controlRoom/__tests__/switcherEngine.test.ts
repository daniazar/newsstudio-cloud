import { describe, it, expect } from "vitest";
import {
  INITIAL_SWITCHER_STATE,
  executeCut,
  setTBar,
  toggleDsk,
  setChannelVolumeDb,
  type SwitcherState,
} from "../switcherEngine";

describe("Broadcast Switcher Engine", () => {
  it("executes instant CUT by swapping Program and Preview sources", () => {
    const initialState = { ...INITIAL_SWITCHER_STATE, programSource: "cam1_wide" as const, previewSource: "cam2_tight" as const };
    const cutState = executeCut(initialState);

    expect(cutState.programSource).toBe("cam2_tight");
    expect(cutState.previewSource).toBe("cam1_wide");
    expect(cutState.tBarPosition).toBe(0.0);
    expect(cutState.isTransitioning).toBe(false);
  });

  it("updates T-Bar position and auto-completes transition at 1.0", () => {
    let state: SwitcherState = { ...INITIAL_SWITCHER_STATE, programSource: "cam1_wide", previewSource: "cam3_dataviz" };

    // Halfway transition
    state = setTBar(state, 0.5);
    expect(state.tBarPosition).toBe(0.5);
    expect(state.isTransitioning).toBe(true);

    // Complete transition
    state = setTBar(state, 1.0);
    expect(state.programSource).toBe("cam3_dataviz");
    expect(state.previewSource).toBe("cam1_wide");
    expect(state.tBarPosition).toBe(0.0);
    expect(state.isTransitioning).toBe(false);
  });

  it("toggles Downstream Keyer (DSK) overlays", () => {
    let state = { ...INITIAL_SWITCHER_STATE };
    expect(state.dsk.dsk1BreakingAlert).toBe(false);

    state = toggleDsk(state, "dsk1BreakingAlert");
    expect(state.dsk.dsk1BreakingAlert).toBe(true);

    state = toggleDsk(state, "dsk1BreakingAlert");
    expect(state.dsk.dsk1BreakingAlert).toBe(false);
  });

  it("sets audio channel volume within -60dB to +6dB range and calculates linear gain", () => {
    let state = { ...INITIAL_SWITCHER_STATE };

    state = setChannelVolumeDb(state, "anchorMic", -6.0);
    expect(state.audioChannels.anchorMic.volumeDb).toBe(-6.0);
    expect(state.audioChannels.anchorMic.volumeLinear).toBeCloseTo(0.5, 1);

    // Clamps excessive volume
    state = setChannelVolumeDb(state, "anchorMic", 15.0);
    expect(state.audioChannels.anchorMic.volumeDb).toBe(6.0);
  });
});
