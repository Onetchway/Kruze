import { clusterByProximity, orderRouteByDistance } from "./geo-routing";

describe("clusterByProximity", () => {
  it("groups spatially close employees together even when roster order interleaves distant ones", () => {
    // Two tight geographic pairs, ~10km apart from each other, interleaved in input order.
    const employees = [
      { employeeId: "north-1", latitude: 28.7041, longitude: 77.1025 }, // Delhi
      { employeeId: "south-1", latitude: 12.9716, longitude: 77.5946 }, // Bangalore
      { employeeId: "north-2", latitude: 28.7045, longitude: 77.103 }, // near Delhi
      { employeeId: "south-2", latitude: 12.972, longitude: 77.595 }, // near Bangalore
    ];

    const clusters = clusterByProximity(employees, 2);

    expect(clusters).toHaveLength(2);
    for (const cluster of clusters) {
      const ids = cluster.map((c) => c.employeeId).sort();
      // Each cluster must be either the two "north" or the two "south" employees — never mixed.
      expect(ids).toEqual(ids[0].startsWith("north") ? ["north-1", "north-2"] : ["south-1", "south-2"]);
    }
  });

  it("respects maxGroupSize even with many nearby employees", () => {
    const employees = Array.from({ length: 7 }, (_, i) => ({
      employeeId: `e${i}`,
      latitude: 12.97 + i * 0.0001,
      longitude: 77.59 + i * 0.0001,
    }));

    const clusters = clusterByProximity(employees, 3);

    expect(clusters.every((c) => c.length <= 3)).toBe(true);
    expect(clusters.flat()).toHaveLength(7);
  });

  it("falls back to fixed-size roster-order chunking when any employee lacks coordinates", () => {
    const employees = [
      { employeeId: "a", latitude: 12.97, longitude: 77.59 },
      { employeeId: "b", latitude: null, longitude: null },
      { employeeId: "c", latitude: 13.0, longitude: 77.6 },
    ];

    const clusters = clusterByProximity(employees, 2);

    expect(clusters).toEqual([
      [employees[0], employees[1]],
      [employees[2]],
    ]);
  });

  it("returns nothing for empty input", () => {
    expect(clusterByProximity([], 6)).toEqual([]);
  });
});

describe("orderRouteByDistance", () => {
  it("produces a shorter (or equal) total route than an arbitrary order", () => {
    // Four points on a line: A --- B ------- C --- D. A "bad" order (A, C, B, D)
    // backtracks; the optimized order should recover the line order (or its reverse).
    const points = [
      { employeeId: "A", latitude: 0, longitude: 0 },
      { employeeId: "C", latitude: 0, longitude: 0.03 },
      { employeeId: "B", latitude: 0, longitude: 0.01 },
      { employeeId: "D", latitude: 0, longitude: 0.04 },
    ];

    const ordered = orderRouteByDistance(points);
    const ids = ordered.map((p) => p.employeeId);

    expect([...ids].sort()).toEqual(["A", "B", "C", "D"]); // same set, no employee dropped
    const isForward = ids.join(",") === "A,B,C,D";
    const isReverse = ids.join(",") === "D,C,B,A";
    expect(isForward || isReverse).toBe(true);
  });

  it("leaves order unchanged when coordinates are missing", () => {
    const points = [
      { employeeId: "a", latitude: 12.97, longitude: 77.59 },
      { employeeId: "b", latitude: null, longitude: null },
      { employeeId: "c", latitude: 13.0, longitude: 77.6 },
    ];
    expect(orderRouteByDistance(points)).toEqual(points);
  });

  it("leaves a 2-point route unchanged (nothing to optimize)", () => {
    const points = [
      { employeeId: "a", latitude: 12.97, longitude: 77.59 },
      { employeeId: "b", latitude: 13.0, longitude: 77.6 },
    ];
    expect(orderRouteByDistance(points)).toEqual(points);
  });
});
