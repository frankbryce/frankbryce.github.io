from z3 import *

# ------------------------
# PARAMETERS
# ------------------------
grid_size = 9      # simulation grid is 7 x 7
steps = 8          # time steps 0 .. 7; we require replication by some t in {1,...,7}
seed_start = 4     # the free 3x3 seed is placed in rows/cols 2,3,4
seed_end = seed_start + 3  # exclusive

# ------------------------
# SET UP SOLVER
# ------------------------
s = Solver()

# ------------------------
# RULESET VARIABLES
# ------------------------
# Each ruleset (for blue and for orange) is represented by two arrays:
# one for a dead cell outcome [index = neighbor count] and one for a live cell.
# They are Int variables constrained to be either 0 or 1.
def create_ruleset(prefix):
    dead = [Int(f"{prefix}_dead_{i}") for i in range(9)]
    live = [Int(f"{prefix}_live_{i}") for i in range(9)]
    for i in range(9):
        s.add(Or(dead[i] == 0, dead[i] == 1))
        s.add(Or(live[i] == 0, live[i] == 1))
    # Prevent spontaneous birth in a dead cell with 0 neighbors.
    s.add(dead[0] == 0)
    return dead, live

blue_dead, blue_live = create_ruleset("blue")
orange_dead, orange_live = create_ruleset("orange")
s.add(orange_dead[0] == 0)  # also add for orange

# ------------------------
# STATE VARIABLES
# ------------------------
# For time t = 0,1,...,7, define the blue and orange layers over a grid_size x grid_size.
state_blue = [[[Int(f"B_{t}_{r}_{c}") for c in range(grid_size)]
               for r in range(grid_size)] for t in range(steps)]
state_orange = [[[Int(f"O_{t}_{r}_{c}") for c in range(grid_size)]
                 for r in range(grid_size)] for t in range(steps)]

# Constrain all state variables to be 0 or 1.
for t in range(steps):
    for r in range(grid_size):
        for c in range(grid_size):
            s.add(Or(state_blue[t][r][c] == 0, state_blue[t][r][c] == 1))
            s.add(Or(state_orange[t][r][c] == 0, state_orange[t][r][c] == 1))

# Define the initial conditions.
# The 3x3 seed (positions r,c in {2,3,4}) is free; everywhere else the grid is dead.
for r in range(grid_size):
    for c in range(grid_size):
        if r >= seed_start and r < seed_end and c >= seed_start and c < seed_end:
            # (r, c) is in the seed: no constraint so that all 4 states (dead, blue, orange, both) are allowed.
            pass
        else:
            s.add(state_blue[0][r][c] == 0)
            s.add(state_orange[0][r][c] == 0)

# ------------------------
# ADDITIONAL CONSTRAINT
# ------------------------
# The starting seed must have at least one blue cell and at least one orange cell.
seed_blue_nonzero = []
seed_orange_nonzero = []
for r in range(seed_start, seed_end):
    for c in range(seed_start, seed_end):
        seed_blue_nonzero.append(state_blue[0][r][c] == 1)
        seed_orange_nonzero.append(state_orange[0][r][c] == 1)
s.add(Or(seed_blue_nonzero))
s.add(Or(seed_orange_nonzero))

# ------------------------
# NEIGHBOR COUNT
# ------------------------
# Since the grid is finite, out-of-bound neighbors count as dead (i.e. 0).
def neighbor_count(state, t, r, c):
    neighbors = []
    for dr in [-1, 0, 1]:
        for dc in [-1, 0, 1]:
            if dr == 0 and dc == 0:
                continue
            nr = r + dr
            nc = c + dc
            if 0 <= nr < grid_size and 0 <= nc < grid_size:
                neighbors.append(state[t][nr][nc])
            else:
                neighbors.append(0)
    return Sum(neighbors)

# ------------------------
# HELPER TO SELECT RULE VALUE
# ------------------------
def select_rule(rule_arr, count):
    # Returns the element of rule_arr corresponding to a neighbor count.
    # Unroll into a chain of If's (since count is an Int that can only be 0..8).
    expr = rule_arr[0]
    for i in range(1, 9):
        expr = If(count == i, rule_arr[i], expr)
    return expr

# ------------------------
# TRANSITION CONSTRAINTS (EVOLUTION)
# ------------------------
# Use the update rules as follows:
# For a cell at (r, c) at time t:
#   Let nb = neighbor count from state_blue[t] and no = neighbor count from state_orange[t].
#   Then the updates (for time t+1) are:
#     If (B == 1 and O == 1) [i.e. cell is white]:
#         new blue = select(orange_live, no)
#         new orange = select(blue_live, nb)
#     Otherwise:
#         new blue = if B==1 then select(blue_live, nb) else select(blue_dead, nb)
#         new orange = if O==1 then select(orange_live, no) else select(orange_dead, no)
for t in range(steps - 1):
    for r in range(grid_size):
        for c in range(grid_size):
            B = state_blue[t][r][c]
            O = state_orange[t][r][c]
            nb = neighbor_count(state_blue, t, r, c)
            no = neighbor_count(state_orange, t, r, c)
            new_B = If(And(B == 1, O == 1),
                       select_rule(orange_live, no),
                       If(B == 1,
                          select_rule(blue_live, nb),
                          select_rule(blue_dead, nb)))
            new_O = If(And(B == 1, O == 1),
                       select_rule(blue_live, nb),
                       If(O == 1,
                          select_rule(orange_live, no),
                          select_rule(orange_dead, no)))
            s.add(state_blue[t+1][r][c] == new_B)
            s.add(state_orange[t+1][r][c] == new_O)

# ------------------------
# REPLICATION CONSTRAINT WITH ISOLATION
# ------------------------
# We require that there exists some time t in {1,...,steps-1} and an offset (dx, dy)
# (from the eight neighboring positions) such that:
# 1. The 3x3 seed at time 0 is exactly replicated (for both blue and orange) at the region
#    shifted by (dx, dy) at time t.
# 2. *All* cells in the grid outside this replicated 3x3 region are dead.
allowed_offsets = [(dx, dy) for dx in [-1, 0, 1] for dy in [-1, 0, 1] if not (dx == 0 and dy == 0)]
replication_conditions = []
for t in range(1, steps):
    for (dx, dy) in allowed_offsets:
        # Check that shifting the seed region stays in bounds.
        if seed_start + dx < 0 or seed_end - 1 + dx >= grid_size:
            continue
        if seed_start + dy < 0 or seed_end - 1 + dy >= grid_size:
            continue
        conds = []
        # Condition 1: Replication.
        for r in range(seed_start, seed_end):
            for c in range(seed_start, seed_end):
                conds.append(state_blue[t][r+dx][c+dy] == state_blue[0][r][c])
                conds.append(state_orange[t][r+dx][c+dy] == state_orange[0][r][c])
        # Condition 2: Isolation.
        # Every cell not in the replicated block (i.e. not in the translated 3x3 region) must be dead.
        for r in range(grid_size):
            for c in range(grid_size):
                if not (seed_start+dx <= r < seed_end+dx and seed_start+dy <= c < seed_end+dy):
                    conds.append(state_blue[t][r][c] == 0)
                    conds.append(state_orange[t][r][c] == 0)
        replication_conditions.append(And(conds))
s.add(Or(replication_conditions))

# ------------------------
# (Additional constraint "replicate in less than 8 steps" is ensured by t in 1..steps-1)
# ------------------------

# ------------------------
# ENUMERATE ALL SOLUTIONS
# ------------------------
# We now enter a loop that finds and prints solutions and then blocks the current solution
# so that the next call to s.check() finds a new one.
solution_count = 0
while s.check() == sat:
    m = s.model()
    solution_count += 1
    print("Solution", solution_count)
    
    # Print the seed pattern (only the free 3x3 area) for both layers.
    print("Seed pattern (blue layer):")
    for r in range(seed_start, seed_end):
        row = [m.evaluate(state_blue[0][r][c]) for c in range(seed_start, seed_end)]
        print(row)
    print("Seed pattern (orange layer):")
    for r in range(seed_start, seed_end):
        row = [m.evaluate(state_orange[0][r][c]) for c in range(seed_start, seed_end)]
        print(row)
    
    # Print the rulesets.
    print("Blue ruleset, dead:", [m.evaluate(blue_dead[i]) for i in range(9)])
    print("Blue ruleset, live:", [m.evaluate(blue_live[i]) for i in range(9)])
    print("Orange ruleset, dead:", [m.evaluate(orange_dead[i]) for i in range(9)])
    print("Orange ruleset, live:", [m.evaluate(orange_live[i]) for i in range(9)])
    print("-------------------------------------")
    
    # Build a blocking clause on the free variables that determine the solution (seed and rulesets).
    block = []
    for r in range(seed_start, seed_end):
        for c in range(seed_start, seed_end):
            block.append(state_blue[0][r][c] != m.evaluate(state_blue[0][r][c]))
            block.append(state_orange[0][r][c] != m.evaluate(state_orange[0][r][c]))
    for i in range(9):
        block.append(blue_dead[i] != m.evaluate(blue_dead[i]))
        block.append(blue_live[i] != m.evaluate(blue_live[i]))
        block.append(orange_dead[i] != m.evaluate(orange_dead[i]))
        block.append(orange_live[i] != m.evaluate(orange_live[i]))
    s.add(Or(block))

print("Total solutions found:", solution_count) 