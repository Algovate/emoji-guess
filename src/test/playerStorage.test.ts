import { describe, expect, it } from "vitest";
import { DEFAULT_PROFILE, migrateProfile } from "../features/profile/playerStorage";

describe("player profile migration", () => {
  it("starts a new profile in onboarding", () => {
    expect(migrateProfile(undefined)).toMatchObject({ schemaVersion: 2, onboardingCompleted: false });
  });

  it("keeps an unused schema-1 profile in onboarding", () => {
    expect(migrateProfile({ ...DEFAULT_PROFILE, schemaVersion: 1, onboardingCompleted: undefined }))
      .toMatchObject({ schemaVersion: 2, onboardingCompleted: false });
  });

  it("skips onboarding for a schema-1 player with history", () => {
    expect(migrateProfile({ ...DEFAULT_PROFILE, schemaVersion: 1, xp: 20, onboardingCompleted: undefined }))
      .toMatchObject({ schemaVersion: 2, onboardingCompleted: true });
  });
});
