import { OptimizerClient } from "./optimizer-client";

describe("OptimizerClient", () => {
  const originalFetch = global.fetch;
  let client: OptimizerClient;

  beforeEach(() => {
    client = new OptimizerClient();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it("returns an empty array without calling the service when there are no points", async () => {
    const fetchSpy = jest.fn();
    global.fetch = fetchSpy as unknown as typeof fetch;

    const result = await client.solveCvrp({ latitude: 0, longitude: 0 }, [], 6);

    expect(result).toEqual([]);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("returns the solved routes on a successful response", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ solved: true, routes: [{ stopIds: ["a", "b"] }], objectiveMeters: 1234 }),
    }) as unknown as typeof fetch;

    const result = await client.solveCvrp({ latitude: 1, longitude: 2 }, [{ id: "a", latitude: 1, longitude: 2 }], 6);

    expect(result).toEqual([{ stopIds: ["a", "b"] }]);
  });

  it("returns null (never throws) on a non-2xx response", async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 500 }) as unknown as typeof fetch;

    const result = await client.solveCvrp({ latitude: 1, longitude: 2 }, [{ id: "a", latitude: 1, longitude: 2 }], 6);

    expect(result).toBeNull();
  });

  it("returns null when the solver reports it found no feasible solution", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ solved: false, routes: [] }),
    }) as unknown as typeof fetch;

    const result = await client.solveCvrp({ latitude: 1, longitude: 2 }, [{ id: "a", latitude: 1, longitude: 2 }], 6);

    expect(result).toBeNull();
  });

  it("returns null (never throws) when the service is unreachable", async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error("connect ECONNREFUSED")) as unknown as typeof fetch;

    const result = await client.solveCvrp({ latitude: 1, longitude: 2 }, [{ id: "a", latitude: 1, longitude: 2 }], 6);

    expect(result).toBeNull();
  });
});
