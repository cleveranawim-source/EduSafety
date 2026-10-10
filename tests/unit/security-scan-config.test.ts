import { Wallet } from "ethers";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { createServerRuntime } from "../../src/bootstrap.js";
import { loadConfig, STANDALONE_URL_SCAN_DATABASE_URL } from "../../src/config.js";

function environment(overrides: NodeJS.ProcessEnv = {}): NodeJS.ProcessEnv {
  const wallet = Wallet.createRandom();
  return {
    NODE_ENV: "test",
    DATABASE_URL: "postgresql://test.invalid/edusafety",
    EAS_ATTESTER_ADDRESS: wallet.address,
    EAS_ATTESTER_PRIVATE_KEY: wallet.privateKey,
    EAS_TRUSTED_ATTESTER_ADDRESSES: wallet.address,
    ADMIN_ID: "test-admin",
    ADMIN_USERNAME: "admin@example.test",
    ADMIN_PASSWORD_SCRYPT: "scrypt$c2FsdA$aGFzaA",
    ADMIN_SESSION_SECRET: "x".repeat(43),
    ...overrides,
  };
}

describe("URL 검사 전용 배포 (standalone)", () => {
  const minimal = { NODE_ENV: "test", DATABASE_URL: STANDALONE_URL_SCAN_DATABASE_URL, SECURITY_SCAN_DYNAMIC_TARGETS_ENABLED: "true" } as const;

  it("DATABASE_URL 과 URL 입력 허용 두 값만으로 시작한다 — 서명 키·관리자 계정을 따로 받지 않는다", () => {
    const config = loadConfig({ ...minimal });
    expect(config.securityScan).toMatchObject({ dynamicTargetsEnabled: true });
    expect(config.admin.sessionSecret.length).toBeGreaterThanOrEqual(43);
    expect(config.eas.trustedAttesterAddresses.has(config.eas.attesterAddress)).toBe(true);
  });

  it("임시 관리자 계정으로는 로그인할 수 없다", async () => {
    const runtime = await createServerRuntime(loadConfig({ ...minimal, BADGE_PUBLIC_BASE_URL: "https://scan.example" }));
    await request(runtime.app).get("/api/security-scan/config").expect(200);
    for (const password of ["", "standalone-disabled", "password1234"]) {
      const response = await request(runtime.app)
        .post("/api/admin/session")
        .set("Origin", "https://scan.example")
        .send({ username: "standalone-disabled", password });
      expect(response.status).not.toBe(200);
      expect(response.status).toBeLessThan(500);
    }
  });

  it("공개 주소를 적지 않으면 Vercel 운영 주소를 쓴다", () => {
    expect(loadConfig({ ...minimal, VERCEL_PROJECT_PRODUCTION_URL: "edusafe.vercel.app" }).publicBaseUrl)
      .toBe("https://edusafe.vercel.app");
    expect(loadConfig({ ...minimal, VERCEL_PROJECT_PRODUCTION_URL: "edusafe.vercel.app", BADGE_PUBLIC_BASE_URL: "https://my.example" }).publicBaseUrl)
      .toBe("https://my.example");
  });

  it("데이터베이스를 쓰는 정식 배포는 여전히 서명 키·관리자 값을 요구한다", () => {
    expect(() => loadConfig({ NODE_ENV: "test", DATABASE_URL: "postgresql://test.invalid/edusafety" })).toThrow();
  });
});

describe("security scan configuration", () => {
  it("enables only exact HTTPS origins without retaining AI credentials in app config", () => {
    const config = loadConfig(environment({
      SECURITY_SCAN_ALLOWED_ORIGINS: "https://school.example,https://review.example",
      ANTHROPIC_API_KEY: "request-only-key-must-not-be-read",
      ANTHROPIC_MODEL: "claude-opus-5",
    }));

    expect(config.securityScan).toEqual({
      allowedOrigins: new Set(["https://school.example", "https://review.example"]),
      dynamicTargetsEnabled: false,
      timeoutMs: 5_000,
    });
    expect(JSON.stringify(config)).not.toContain("request-only-key-must-not-be-read");
  });

  it("stays disabled without an operator-owned allowlist", () => {
    expect(loadConfig(environment()).securityScan).toBeUndefined();
  });

  it("enables dynamic URL input only with an explicit true value", () => {
    expect(loadConfig(environment({ SECURITY_SCAN_DYNAMIC_TARGETS_ENABLED: "false" })).securityScan)
      .toBeUndefined();
    expect(loadConfig(environment({ SECURITY_SCAN_DYNAMIC_TARGETS_ENABLED: "true" })).securityScan)
      .toMatchObject({
        allowedOrigins: new Set(),
        dynamicTargetsEnabled: true,
        timeoutMs: 5_000,
      });
  });

  it("rejects insecure or path-bearing targets at startup", () => {
    expect(() => loadConfig(environment({ SECURITY_SCAN_ALLOWED_ORIGINS: "http://school.example" })))
      .toThrow(/must contain HTTPS origins/);
    expect(() => loadConfig(environment({ SECURITY_SCAN_ALLOWED_ORIGINS: "https://school.example/path" })))
      .toThrow(/contains an invalid origin/);
    expect(() => loadConfig(environment({ SECURITY_SCAN_ALLOWED_ORIGINS: "https://127.0.0.1" })))
      .toThrow(/using domain names/);
    expect(() => loadConfig(environment({ SECURITY_SCAN_ALLOWED_ORIGINS: "https://[::1]" })))
      .toThrow(/using domain names/);
  });
});
