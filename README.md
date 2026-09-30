# Newcomer onboarding calculator

An independent, local, dependency-free calculator for the ODE model developed in this project.
Open `index.html` directly in a browser, or serve this folder with `python3 -m http.server 8765 --bind 127.0.0.1`.

Structure follows the public reference panel at:
https://github.com/logos-blockchain/research/tree/master/tools/simulators/EmPoWering/web
Inspected at repository revision 272fd9a55c09830355da3646c1faef329ea4caed.
No reference source code was copied. This is not an implementation of that panel's reward controller.

- `model.js`: pure numerical functions, usable in browser or Node.
- `app.js`: controls, results, plots, deadline/share table and CSV export.
- `style.css`: responsive working-panel layout.
- `test-model.cjs`: regression and invariant checks.

Run checks with `node test-model.cjs`.

The beta parameter controls the immediately unlocked fraction of mining rewards (0–100% in
the UI, 0–1 in the model and CSV). Its default is zero, preserving the original results.
Both portions are staked. Before maturity, b = beta*m*t + gamma*A/N and
locked = (1-beta)*m*t. Total stake and pool dynamics are independent of beta at fixed payout.
The solver, approximations, deadline matrix, plots, and CSV all use beta. Exports also separate
direct unlocked mining income from leadership income. Tests cover zero leadership, beta=1,
pool exhaustion, conservation, monotonicity, and independent numerical ODE integration.

Modes: find the minimum constant income for a deadline; evaluate a fixed income per newcomer;
or evaluate a fixed total payout. The solver's budget check requires the constant payout to be
funded through the deadline. Plots enforce exhaustion and continue leadership income afterwards.
The deadline matrix displays formal rates, marking over-budget solutions rather than presenting
them as affordable. Inputs describe equal-income newcomers with zero genesis allocations.

No refill, fees, withdrawals, stochastic elections, token unlocks, or controller retargeting.
All plots stop at or before the one-year pre-unlock boundary. The calculator is a deterministic
research approximation, not a probability forecast or financial recommendation.
