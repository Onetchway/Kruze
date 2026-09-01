# Kruze Optimizer Service

A real Capacitated Vehicle Routing Problem (CVRP) solver, using Google
[OR-Tools](https://developers.google.com/optimization)' constraint-
programming routing library — a genuine solver, not the nearest-
neighbor/2-opt heuristic in `apps/api/src/planning/geo-routing.ts`.
Given one depot and a set of employee pickup points, it jointly solves
*how many vehicle routes to use*, *which points go on which route*,
and *the pickup order on each route* in a single optimization.

## Why a separate Python service

OR-Tools' Python bindings are the reference implementation and the
easiest to work with; there's no equivalently mature Node binding.
Running it as its own small Flask service (rather than shelling out to
a Python script per request) keeps the solver process warm and lets it
scale independently of the NestJS API.

## How it's called

`apps/api/src/planning/optimizer-client.ts` calls `POST /solve-cvrp`
with an 8s timeout. **Every failure mode — unreachable, slow, non-2xx,
or `solved: false` — returns `null`, never throws.**
`PlanningService.groupAndRoute` falls back to the
`clusterByProximity`/`orderRouteByDistance` heuristic whenever that
happens (or when any employee in the shift's demand lacks home
coordinates, since the solver needs them all). A plan generation is
therefore never blocked by this service being down — same philosophy
as the Kafka event backbone's fire-and-forget publishing
(`apps/api/src/eventbus/README.md`).

## Running locally

```bash
cd apps/optimizer-service
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
.venv/bin/python app.py            # dev server on :8000

# or, for something closer to production:
.venv/bin/gunicorn -w 2 -b 0.0.0.0:8000 app:app
```

The NestJS API picks it up via `OPTIMIZER_SERVICE_URL` (default
`http://localhost:8000`, see `apps/api/.env.example`) — nothing else
to configure; `auto`-detection isn't needed since a missing/unreachable
service is exactly the supported degraded mode.

## Testing

```bash
.venv/bin/pip install -r requirements-dev.txt
.venv/bin/python -m pytest test_app.py -v
```

`test_app.py` covers: capacity respected, two well-separated clusters
never end up mixed on one route, all input points are accounted for
in the output, and the haversine distance helper is correct against a
known real-world distance.

## Verified end to end

Beyond the unit tests, this was verified against the real running
NestJS API: registered a corporate + vendor, created 4 vehicles/
drivers, created 10 employees split into two tight ~5km-apart
geographic clusters (5 each) with real home coordinates, opted them
into a shift, and called `POST /plans/generate`. Result: `READY`, 2
trips, 0 exceptions — the server log confirmed `OR-Tools solved 2
route(s) for 10 employee(s)`, and a direct DB check confirmed each
trip's 5 employees were exactly one geographic cluster, never mixed.
