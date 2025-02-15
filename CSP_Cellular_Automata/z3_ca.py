from z3 import *
import json
import itertools  # Needed for iterating over candidate grids.

try:
    import pyperclip
    clipboard_available = True
except ImportError:
    clipboard_available = False

def select_rule(neighbor_count, rule_list):
    """
    Constructs an expression that selects the appropriate rule value
    based on the neighbor_count.
    rule_list should be a list of 9 Z3 Int variables.
    """
    expr = If(neighbor_count == 0, rule_list[0],
           If(neighbor_count == 1, rule_list[1],
           If(neighbor_count == 2, rule_list[2],
           If(neighbor_count == 3, rule_list[3],
           If(neighbor_count == 4, rule_list[4],
           If(neighbor_count == 5, rule_list[5],
           If(neighbor_count == 6, rule_list[6],
           If(neighbor_count == 7, rule_list[7],
                rule_list[8]))))))))
    return expr

def find_all_z3_solutions_neighbor_count(start_config, end_config, max_steps, wrap_around=False):
    """
    Uses Z3 to search for all rulesets (neighbor count based) that transform
    start_config to end_config within max_steps.

    Parameters:
      start_config  - a 2D list representing the initial grid state (0 or 1)
      end_config    - a 2D list representing the target grid state (0 or 1)
      max_steps     - number of simulation steps allowed
      wrap_around   - if True, use toroidal (wrap-around) neighbor calculation

    Returns:
      A list of valid rulesets, where each ruleset is a dict with keys:
          'dead': [...],
          'live': [...]
    """
    grid_size = len(start_config)
    solver = Solver()

    # Create grid variables: grid[t][r][c] for t=0..max_steps.
    grid_vars = {}
    for t in range(max_steps + 1):
        grid_vars[t] = {}
        for r in range(grid_size):
            for c in range(grid_size):
                var = Int(f"Grid_{t}_{r}_{c}")
                grid_vars[t][(r, c)] = var
                solver.add(Or(var == 0, var == 1))
    
    # Create rule variables for dead and live cells.
    rule_dead_vars = []
    rule_live_vars = []
    for i in range(9):
        rd = Int(f"Rule_Dead_{i}")
        rl = Int(f"Rule_Live_{i}")
        rule_dead_vars.append(rd)
        rule_live_vars.append(rl)
        solver.add(Or(rd == 0, rd == 1))
        solver.add(Or(rl == 0, rl == 1))
    
    # When a cell is dead, having 0 neighbors should not revive it.
    solver.add(rule_dead_vars[0] == 0)
    
    # Initial configuration constraint.
    for r in range(grid_size):
        for c in range(grid_size):
            solver.add(grid_vars[0][(r, c)] == start_config[r][c])
    
    # Final configuration constraint.
    for r in range(grid_size):
        for c in range(grid_size):
            solver.add(grid_vars[max_steps][(r, c)] == end_config[r][c])
    
    # Transition constraints: Define how the grid evolves following the ruleset.
    for t in range(max_steps):
        for r in range(grid_size):
            for c in range(grid_size):
                neighbors = []
                for dr in [-1, 0, 1]:
                    for dc in [-1, 0, 1]:
                        if dr == 0 and dc == 0:
                            continue  # Skip the cell itself.
                        rr = r + dr
                        cc = c + dc
                        if wrap_around:
                            rr = (rr + grid_size) % grid_size
                            cc = (cc + grid_size) % grid_size
                            neighbors.append(grid_vars[t][(rr, cc)])
                        else:
                            if 0 <= rr < grid_size and 0 <= cc < grid_size:
                                neighbors.append(grid_vars[t][(rr, cc)])
                neighbor_sum = Sum(neighbors) if neighbors else 0
                current_cell = grid_vars[t][(r, c)]
                next_cell = grid_vars[t+1][(r, c)]
                expected_next = If(current_cell == 0,
                                   select_rule(neighbor_sum, rule_dead_vars),
                                   select_rule(neighbor_sum, rule_live_vars))
                solver.add(next_cell == expected_next)
    
    solutions = []
    # Enumerate all valid rulesets.
    while solver.check() == sat:
        model = solver.model()
        rule_dead = [model.evaluate(rule_dead_vars[i]).as_long() for i in range(9)]
        rule_live = [model.evaluate(rule_live_vars[i]).as_long() for i in range(9)]
        sol = {'dead': rule_dead, 'live': rule_live}
        solutions.append(sol)
        
        # Create a blocking clause to avoid finding the same ruleset again.
        block_conditions = []
        for i in range(9):
            block_conditions.append(rule_dead_vars[i] != model.evaluate(rule_dead_vars[i]))
        for i in range(9):
            block_conditions.append(rule_live_vars[i] != model.evaluate(rule_live_vars[i]))
        solver.add(Or(block_conditions))
    
    return solutions

def parse_grid(grid_str):
    """
    Parses a multi-line string of 1s and 0s into a 2D list (grid) of integers.
    Ignores any characters that are not '0' or '1'.
    """
    grid = []
    for line in grid_str.strip().splitlines():
        line = line.strip()
        if not line:
            continue
        row = [int(ch) for ch in line if ch in '01']
        grid.append(row)
    return grid

def pad_grid(grid, target_size=9):
    """
    Pads the given 2D grid with 0s so that it becomes a square grid
    of size target_size x target_size. Padding is distributed evenly on
    the top, bottom, left, and right (adding extra rows/columns to the bottom/right if needed).
    """
    rows = len(grid)
    cols = len(grid[0]) if grid else 0

    top_padding = (target_size - rows) // 2
    bottom_padding = target_size - rows - top_padding
    left_padding = (target_size - cols) // 2
    right_padding = target_size - cols - left_padding

    padded_grid = []
    # Add top padding rows.
    for _ in range(top_padding):
        padded_grid.append([0] * target_size)
    # Pad each row.
    for row in grid:
        padded_row = [0] * left_padding + row + [0] * right_padding
        padded_grid.append(padded_row)
    # Add bottom padding rows.
    for _ in range(bottom_padding):
        padded_grid.append([0] * target_size)
    return padded_grid

def shift_grid(grid, shift_x, shift_y):
    """
    Shifts the grid horizontally by shift_x and vertically by shift_y.
    Cells that move out of bounds are replaced with 0's.
    
    Parameters:
      grid     - a 2D list (square grid) of integers.
      shift_x  - number of columns to shift (positive shifts right).
      shift_y  - number of rows to shift (positive shifts down).
    
    Returns:
      A new 2D list representing the shifted grid.
    """
    n = len(grid)
    new_grid = [[0 for _ in range(n)] for _ in range(n)]
    for r in range(n):
        for c in range(n):
            new_r = r + shift_y
            new_c = c + shift_x
            if 0 <= new_r < n and 0 <= new_c < n:
                new_grid[new_r][new_c] = grid[r][c]
    return new_grid

if __name__ == "__main__":
    # We generate all 3x3 candidate grids (with exactly 3 ones) and then pad
    # them to a 9x9 start configuration. The end configuration is computed by
    # shifting the padded grid by shift_x and shift_y.
    
    def generate_3x3_grids_with_n_ones(ones_count):
        """
        Generates all possible 3x3 grids (as a list of lists) which contain exactly 3 ones.
        There are C(9, 3) = 84 candidates.
        """
        assert ones_count in [0,1,2,3,4,5,6,7,8,9]
        candidates = []
        # There are 9 cells (flattened), choose 3 of them to be 1.
        for ones_indices in itertools.combinations(range(9), ones_count):
            grid_flat = [0] * 9
            for idx in ones_indices:
                grid_flat[idx] = 1
            # Reshape the flat list into a 3x3 grid.
            grid_candidate = [grid_flat[i*3:(i+1)*3] for i in range(3)]
            candidates.append(grid_candidate)
        return candidates
    
    def print_grid(grid):
        """
        Prints the grid (list of lists) as lines of numbers.
        """
        for row in grid:
            print("".join(str(cell) for cell in row))
    
    found_count = 0
    
    # Parameterized values for shifting the grid.
    # iterate through all possible shifts where shift_x and shift_y are between -3 and 3
    for n_ones in range(1, 10):
        for shift_x in range(0, 3):
            for shift_y in range(1, 3):
                # Simulation steps allowed.
                for max_steps in range(2, 5):
                    print(f"shift_x: {shift_x}, shift_y: {shift_y}, steps: {max_steps}")
        
                    candidate_grids = generate_3x3_grids_with_n_ones(n_ones)
                    print("Searching for candidate starting grids (3x3 with exactly 3 ones) with solutions...\n")
                    
                    # Iterate over each candidate grid.
                    for i, candidate in enumerate(candidate_grids, start=1):
                        # Pad the candidate grid (3x3) to a 9x9 grid.
                        padded_candidate = pad_grid(candidate, target_size=9)
                        # Compute the end configuration by shifting the padded grid.
                        end_config = shift_grid(padded_candidate, shift_x, shift_y)
                        print(f"Candidate {i} (shift_x: {shift_x}, shift_y: {shift_y}, steps: {max_steps}):")
                        print("Start grid (padded to 9x9):")
                        print_grid(padded_candidate)
                        
                        # Try to find valid rulesets that transform the start grid to the end grid.
                        solutions = find_all_z3_solutions_neighbor_count(
                            padded_candidate, end_config, max_steps, wrap_around=False
                        )
                        if solutions:
                            print(f" -> Candidate {i} has {len(solutions)} solution(s)!")
                            # Print the starting grid (again) to make sure it's clearly visible.
                            print("Starting grid:")
                            print_grid(padded_candidate)
                            
                            # Format the first solution as JSON.
                            ruleset_json = json.dumps(solutions[0], indent=2)
                            print("First solution (ruleset):")
                            print(ruleset_json)
                            
                            # Copy the ruleset to the clipboard for use in ca.html's load rulesets box.
                            if clipboard_available:
                                pyperclip.copy(ruleset_json)
                                print("Ruleset copied to clipboard.")
                            else:
                                print("pyperclip is not installed; ruleset not copied.")
                            
                            # Pause execution until the user indicates it should continue.
                            input("Solution found. Press Enter to continue searching...")
                            found_count += 1
                        else:
                            print(f" -> Candidate {i} has no solution.")
                        print("-" * 40)
                
    print(f"Total candidates with solutions: {found_count}")
    