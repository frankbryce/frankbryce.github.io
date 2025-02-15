// JavaScript for Cellular Automata Ruleset Explorer

// Global variables
let canvas, ctx;
let grid = [];
let gridSize = 14;
let cellSize = 20; // will be computed by canvas.width / gridSize
let simulationInterval = null;
let simulationSpeed = 50; // milliseconds
let isRunning = false;
let wrapAround = true;
let rulesets = [
    {
      "dead": [0, 0, 0, 1, 1, 1, 0, 0, 0],
      "live": [0, 1, 1, 0, 0, 0, 1, 0, 0]
    }]; // Array of ruleset objects, each with "dead" and "live" arrays (length 9).
let currentRulesetIndex = -1;

window.addEventListener("load", init);

function init() {
  // Initialize canvas and context
  canvas = document.getElementById("gridCanvas");
  ctx = canvas.getContext("2d");
  cellSize = canvas.width / gridSize;

  // Initialize grid (all cells dead) and draw
  initGrid(gridSize);
  drawGrid();

  // Set up event listeners
  canvas.addEventListener("click", canvasClickHandler);
  document.getElementById("playPauseButton").addEventListener("click", toggleSimulation);
  document.getElementById("stepButton").addEventListener("click", stepSimulation);
  
  const speedSlider = document.getElementById("speedSlider");
  speedSlider.addEventListener("input", updateSpeed);

  document.getElementById("wrapToggle").addEventListener("change", (e) => {
    wrapAround = e.target.checked;
  });

  document.getElementById("resizeButton").addEventListener("click", () => {
    const newSize = parseInt(document.getElementById("gridSizeInput").value);
    if (!isNaN(newSize) && newSize > 0) {
      gridSize = newSize;
      cellSize = canvas.width / gridSize;
      initGrid(gridSize);
      drawGrid();
    }
  });

  document.getElementById("saveConfigButton").addEventListener("click", saveConfig);
  document.getElementById("uploadConfigButton").addEventListener("click", () => {
    document.getElementById("uploadConfigInput").click();
  });
  document.getElementById("uploadConfigInput").addEventListener("change", loadConfig);

  document.getElementById("loadRulesetsButton").addEventListener("click", loadRulesets);
  document.getElementById("rulesetSelect").addEventListener("change", (e) => {
    currentRulesetIndex = parseInt(e.target.value);
    const display = document.getElementById("rulesetJsonDisplay");
    if (currentRulesetIndex === -1 || !rulesets[currentRulesetIndex]) {
      display.textContent = "No ruleset selected.";
    } else {
      display.textContent = formatRuleset(rulesets[currentRulesetIndex]);
    }
  });

  document.getElementById("clearGridButton").addEventListener("click", clearGrid);

  // Automatically load the default ruleset from the textarea on page load.
  loadRulesets();
}

// Initialize the grid as a 2D array of 0's.
function initGrid(size) {
  grid = [];
  for (let i = 0; i < size; i++) {
    let row = [];
    for (let j = 0; j < size; j++) {
      row.push(0);
    }
    grid.push(row);
  }
}

// Draw the grid to the canvas
function drawGrid() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  for (let i = 0; i < gridSize; i++) {
    for (let j = 0; j < gridSize; j++) {
      ctx.fillStyle = grid[i][j] === 1 ? "#333" : "#fff";
      ctx.fillRect(j * cellSize, i * cellSize, cellSize, cellSize);
      ctx.strokeStyle = "#ccc";
      ctx.strokeRect(j * cellSize, i * cellSize, cellSize, cellSize);
    }
  }
}

// Handle canvas clicks to toggle a cell's state
function canvasClickHandler(e) {
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  const col = Math.floor(x / cellSize);
  const row = Math.floor(y / cellSize);
  if (row >= 0 && row < gridSize && col >= 0 && col < gridSize) {
    grid[row][col] = grid[row][col] ? 0 : 1;
    drawGrid();
  }
}

// Compute the number of live neighbors for a cell at (row, col)
function countNeighbors(row, col) {
  let count = 0;
  for (let i = -1; i <= 1; i++) {
    for (let j = -1; j <= 1; j++) {
      if (i === 0 && j === 0) continue;
      let newRow = row + i;
      let newCol = col + j;
      if (wrapAround) {
        newRow = (newRow + gridSize) % gridSize;
        newCol = (newCol + gridSize) % gridSize;
      } else {
        if (newRow < 0 || newRow >= gridSize || newCol < 0 || newCol >= gridSize) {
          continue;
        }
      }
      if (grid[newRow][newCol] === 1) {
        count++;
      }
    }
  }
  return count;
}

// Update the grid one simulation step using the selected ruleset.
function updateGrid() {
  if (currentRulesetIndex < 0 || currentRulesetIndex >= rulesets.length) {
    // No valid ruleset selected; do nothing.
    return;
  }
  const ruleset = rulesets[currentRulesetIndex];
  const newGrid = [];
  for (let i = 0; i < gridSize; i++) {
    newGrid[i] = [];
    for (let j = 0; j < gridSize; j++) {
      const liveNeighbors = countNeighbors(i, j);
      // Apply rule based on current state:
      // For dead cell → use ruleset.dead; for live cell → use ruleset.live.
      newGrid[i][j] = grid[i][j] === 0 ? ruleset.dead[liveNeighbors] : ruleset.live[liveNeighbors];
    }
  }
  grid = newGrid;
}

// Perform one simulation step and redraw.
function stepSimulation() {
  updateGrid();
  drawGrid();
}

// Toggle simulation play/pause
function toggleSimulation() {
  const playPauseButton = document.getElementById("playPauseButton");
  if (isRunning) {
    clearInterval(simulationInterval);
    simulationInterval = null;
    isRunning = false;
    playPauseButton.textContent = "Play";
  } else {
    if (currentRulesetIndex < 0 || currentRulesetIndex >= rulesets.length) {
      alert("Please load and select a ruleset first.");
      return;
    }
    simulationInterval = setInterval(stepSimulation, simulationSpeed);
    isRunning = true;
    playPauseButton.textContent = "Pause";
  }
}

// Update simulation speed based on slider value
function updateSpeed(e) {
  simulationSpeed = parseInt(e.target.value);
  document.getElementById("speedDisplay").textContent = simulationSpeed;
  if (isRunning) {
    clearInterval(simulationInterval);
    simulationInterval = setInterval(stepSimulation, simulationSpeed);
  }
}

// Save the current configuration to a local JSON file.
function saveConfig() {
  const config = {
    gridSize: gridSize,
    grid: grid,
    wrapAround: wrapAround
  };
  const dataStr = JSON.stringify(config, null, 2);
  const blob = new Blob([dataStr], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "grid_config.json";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Load a configuration from a user-selected file.
function loadConfig(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const config = JSON.parse(e.target.result);
      if (config.grid && config.gridSize) {
        gridSize = config.gridSize;
        document.getElementById("gridSizeInput").value = gridSize;
        grid = config.grid;
        wrapAround = config.wrapAround;
        document.getElementById("wrapToggle").checked = wrapAround;
        cellSize = canvas.width / gridSize;
        drawGrid();
      } else {
        alert("Invalid config file format.");
      }
    } catch (err) {
      alert("Error reading config: " + err);
    }
  };
  reader.readAsText(file);
}

// Load rulesets from the textarea.
// Expected format: a JSON array of objects, each with:
//   { "dead": [num, ..., num] (9 elements), "live": [num, ..., num] (9 elements) }
function loadRulesets() {
  const text = document.getElementById("rulesetTextarea").value;
  try {
    const parsed = JSON.parse(text);
    if (Array.isArray(parsed)) {
      // Validate and filter the rulesets.
      rulesets = parsed.filter(ruleset =>
        Array.isArray(ruleset.dead) &&
        Array.isArray(ruleset.live) &&
        ruleset.dead.length === 9 &&
        ruleset.live.length === 9
      );
      populateRulesetSelect();
    } else {
      alert("JSON must be an array of ruleset objects.");
    }
  } catch (err) {
    alert("Invalid JSON: " + err);
  }
}

// Helper function to format a ruleset.
// Returns a string like "live: 2,3 | dead: 3"
function formatRuleset(ruleset) {
  let liveIndices = [];
  let deadIndices = [];
  for (let i = 0; i < 9; i++) {
    if (ruleset.live[i] === 1) {
      liveIndices.push(i);
    }
    if (ruleset.dead[i] === 1) {
      deadIndices.push(i);
    }
  }
  return "live: " + liveIndices.join(",") + " | dead: " + deadIndices.join(",");
}

// Populate the ruleset drop-down select element.
function populateRulesetSelect() {
  const select = document.getElementById("rulesetSelect");
  select.innerHTML = '<option value="-1">None</option>';
  rulesets.forEach((ruleset, index) => {
    const option = document.createElement("option");
    option.value = index;
    option.textContent = "Ruleset " + (index + 1);
    select.appendChild(option);
  });
  if (rulesets.length > 0) {
    currentRulesetIndex = 0;
    select.value = "0";
    const display = document.getElementById("rulesetJsonDisplay");
    display.textContent = formatRuleset(rulesets[0]);
  } else {
    currentRulesetIndex = -1;
  }
}

// Function to clear the grid (set all cells to dead state)
function clearGrid() {
  initGrid(gridSize); // Re-initialize the grid with the current gridSize
  drawGrid();
}