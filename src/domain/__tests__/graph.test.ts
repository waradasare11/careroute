import { describe, expect, it } from "vitest";

import { findCycle, transitiveDependencies, transitiveDependents, wouldCreateCycle } from "../graph";
import { validateAppointmentInput } from "../validation";
import { appt, chainJourney, ctx, journey, localInput } from "./fixtures";

describe("dependency graph", () => {
  it("finds every transitive dependent of a report", () => {
    const j = chainJourney();
    expect([...transitiveDependents(j, "report")].sort()).toEqual(["consult", "followup"]);
    expect([...transitiveDependents(j, "scan")].sort()).toEqual(["consult", "followup", "report"]);
  });

  it("finds every transitive prerequisite", () => {
    const j = chainJourney();
    expect([...transitiveDependencies(j, "followup")].sort()).toEqual(["bloods", "consult", "report", "results", "scan"]);
  });

  it("returns null for an acyclic plan", () => {
    expect(findCycle(chainJourney())).toBeNull();
  });

  it("detects a direct two-step cycle", () => {
    const j = journey([appt("a", { dependsOn: ["b"] }), appt("b", { dependsOn: ["a"] })], []);
    const cycle = findCycle(j);
    expect(cycle).not.toBeNull();
    expect(cycle![0]).toBe(cycle![cycle!.length - 1]);
  });

  it("detects a cycle that a new dependency would introduce through a requirement", () => {
    const j = chainJourney();
    // scan depending on followup closes scan -> report -> consult -> followup -> scan
    expect(wouldCreateCycle(j, "scan", ["followup"])).not.toBeNull();
    expect(wouldCreateCycle(j, "followup", ["bloods"])).toBeNull();
  });

  it("rejects self-dependency", () => {
    expect(wouldCreateCycle(chainJourney(), "consult", ["consult"])).toEqual(["consult", "consult"]);
  });

  it("validation refuses a looping prerequisite with a readable message", () => {
    const j = chainJourney();
    const errors = validateAppointmentInput(
      j,
      "scan",
      { title: "Scan", department: "Imaging", location: "", start: localInput(2), durationMinutes: 30, ownerId: "c1", dependsOn: ["followup"], preparation: "" },
      ctx,
      { requireFuture: false },
    );
    expect(errors.dependsOn).toMatch(/loop/);
  });
});

