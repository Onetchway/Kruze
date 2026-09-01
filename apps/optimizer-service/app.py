"""
Real Capacitated Vehicle Routing Problem (CVRP) solver, using Google
OR-Tools' constraint-programming routing library — a genuine exact/
metaheuristic solver, not a hand-rolled heuristic. See README.md for
how this is wired into the NestJS planning module and how failures are
handled (the caller always has a working heuristic fallback; this
service is a quality upgrade, never a hard dependency).

Given one depot (the corporate office) and a set of employee pickup
points, jointly solves: how many vehicle routes to use, which points
go on which route, and the pickup order on each route — a single
optimization instead of the two-stage cluster-then-order heuristic
this replaces (or falls back to) in geo-routing.ts.
"""

import math

from flask import Flask, jsonify, request
from ortools.constraint_solver import pywrapcp, routing_enums_pb2

app = Flask(__name__)

EARTH_RADIUS_M = 6_371_000
SOLVE_TIME_LIMIT_SECONDS = 5


def haversine_meters(a, b):
    lat1, lon1 = math.radians(a["latitude"]), math.radians(a["longitude"])
    lat2, lon2 = math.radians(b["latitude"]), math.radians(b["longitude"])
    dlat = lat2 - lat1
    dlon = lon2 - lon1
    h = math.sin(dlat / 2) ** 2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon / 2) ** 2
    return round(EARTH_RADIUS_M * 2 * math.asin(math.sqrt(h)))


@app.get("/health")
def health():
    return jsonify({"status": "ok"})


@app.post("/solve-cvrp")
def solve_cvrp():
    body = request.get_json(force=True)
    depot = body["depot"]
    points = body["points"]
    vehicle_capacity = int(body["vehicleCapacity"])

    if not points:
        return jsonify({"solved": True, "routes": [], "objectiveMeters": 0})

    # One node per point plus the depot at index 0.
    nodes = [depot] + points
    n = len(nodes)

    distance_matrix = [[haversine_meters(nodes[i], nodes[j]) for j in range(n)] for i in range(n)]

    # More vehicles than strictly needed gives the solver slack to balance
    # routes rather than forcing an infeasible/poor-quality single route.
    min_vehicles = math.ceil(len(points) / vehicle_capacity)
    num_vehicles = int(body.get("numVehicles") or min_vehicles + 1)

    manager = pywrapcp.RoutingIndexManager(n, num_vehicles, 0)
    routing = pywrapcp.RoutingModel(manager)

    def distance_callback(from_index, to_index):
        from_node = manager.IndexToNode(from_index)
        to_node = manager.IndexToNode(to_index)
        return distance_matrix[from_node][to_node]

    transit_callback_index = routing.RegisterTransitCallback(distance_callback)
    routing.SetArcCostEvaluatorOfAllVehicles(transit_callback_index)

    def demand_callback(from_index):
        from_node = manager.IndexToNode(from_index)
        return 0 if from_node == 0 else 1

    demand_callback_index = routing.RegisterUnaryTransitCallback(demand_callback)
    routing.AddDimensionWithVehicleCapacity(
        demand_callback_index,
        0,
        [vehicle_capacity] * num_vehicles,
        True,
        "Capacity",
    )

    search_parameters = pywrapcp.DefaultRoutingSearchParameters()
    search_parameters.first_solution_strategy = routing_enums_pb2.FirstSolutionStrategy.PATH_CHEAPEST_ARC
    search_parameters.local_search_metaheuristic = routing_enums_pb2.LocalSearchMetaheuristic.GUIDED_LOCAL_SEARCH
    search_parameters.time_limit.FromSeconds(SOLVE_TIME_LIMIT_SECONDS)

    solution = routing.SolveWithParameters(search_parameters)
    if solution is None:
        return jsonify({"solved": False, "routes": [], "objectiveMeters": None}), 200

    routes = []
    for vehicle_id in range(num_vehicles):
        index = routing.Start(vehicle_id)
        stop_ids = []
        while not routing.IsEnd(index):
            node = manager.IndexToNode(index)
            if node != 0:
                stop_ids.append(points[node - 1]["id"])
            index = solution.Value(routing.NextVar(index))
        if stop_ids:
            routes.append({"stopIds": stop_ids})

    return jsonify({"solved": True, "routes": routes, "objectiveMeters": solution.ObjectiveValue()})


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8000)
