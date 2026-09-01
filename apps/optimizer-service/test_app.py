"""Run with: .venv/bin/python -m pytest test_app.py -v"""

import app as app_module


def client():
    app_module.app.testing = True
    return app_module.app.test_client()


def test_health():
    res = client().get("/health")
    assert res.status_code == 200
    assert res.get_json() == {"status": "ok"}


def test_empty_points_returns_no_routes():
    res = client().post("/solve-cvrp", json={"depot": {"latitude": 0, "longitude": 0}, "points": [], "vehicleCapacity": 6})
    assert res.status_code == 200
    body = res.get_json()
    assert body == {"solved": True, "routes": [], "objectiveMeters": 0}


def test_solves_two_well_separated_clusters_into_two_routes():
    # Two tight clusters ~5km apart — should never end up mixed in one route.
    northeast = [{"id": f"ne{i}", "latitude": 12.98 + i * 0.001, "longitude": 77.60 + i * 0.001} for i in range(5)]
    southwest = [{"id": f"sw{i}", "latitude": 12.92 + i * 0.001, "longitude": 77.56 + i * 0.001} for i in range(5)]

    res = client().post(
        "/solve-cvrp",
        json={
            "depot": {"latitude": 12.95, "longitude": 77.58},
            "points": northeast + southwest,
            "vehicleCapacity": 6,
        },
    )
    assert res.status_code == 200
    body = res.get_json()
    assert body["solved"] is True
    assert len(body["routes"]) == 2

    routes_by_prefix = {frozenset(stop_id[:2] for stop_id in r["stopIds"]) for r in body["routes"]}
    assert routes_by_prefix == {frozenset({"ne"}), frozenset({"sw"})}

    all_stop_ids = {sid for r in body["routes"] for sid in r["stopIds"]}
    assert all_stop_ids == {p["id"] for p in northeast + southwest}


def test_respects_vehicle_capacity():
    points = [{"id": f"p{i}", "latitude": 12.9 + i * 0.01, "longitude": 77.6 + i * 0.01} for i in range(10)]
    res = client().post(
        "/solve-cvrp",
        json={"depot": {"latitude": 12.9, "longitude": 77.6}, "points": points, "vehicleCapacity": 3},
    )
    body = res.get_json()
    assert body["solved"] is True
    for route in body["routes"]:
        assert len(route["stopIds"]) <= 3
    all_stop_ids = {sid for r in body["routes"] for sid in r["stopIds"]}
    assert all_stop_ids == {p["id"] for p in points}


def test_haversine_matches_known_distance():
    # Roughly the straight-line distance between two well-known Bangalore points.
    a = {"latitude": 12.9716, "longitude": 77.5946}
    b = {"latitude": 12.9698, "longitude": 77.7500}
    distance = app_module.haversine_meters(a, b)
    assert 16_500 <= distance <= 17_500
