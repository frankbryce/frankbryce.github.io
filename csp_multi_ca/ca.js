// JavaScript for Cellular Automata Ruleset Explorer with two active rulesets (blue and orange)

// Global variables
let canvas, ctx;
let gridBlue = [];
let gridOrange = [];
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
    },
    {
        "dead": [0, 0, 0, 1, 0, 0, 0, 0, 0],
        "live": [0, 0, 1, 1, 0, 0, 0, 0, 0]
    }
]; // Array of ruleset objects, each with "dead" and "live" arrays (length 9).
let currentBlueRulesetIndex = -1;
let currentOrangeRulesetIndex = -1;

window.addEventListener("load", init);

function init() {
  // Initialize canvas and context
  canvas = document.getElementById("gridCanvas");
  ctx = canvas.getContext("2d");
  cellSize = canvas.width / gridSize;

  // Initialize grids (both blue and orange are all cells dead) and draw
  initGrids(gridSize);
  drawGrid();

  // Set up canvas event listeners for toggling cells:
  // Left click toggles the blue grid…
  canvas.addEventListener("click", blueCanvasClickHandler);
  // … and right click (contextmenu) toggles the orange grid.
  canvas.addEventListener("contextmenu", orangeCanvasClickHandler);

  // Set up simulation control event listeners.
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
      initGrids(gridSize);
      drawGrid();
    }
  });

  // Load rulesets from textarea when the button is clicked.
  document.getElementById("loadRulesetsButton").addEventListener("click", loadRulesets);

  // Set up ruleset selects for Blue and Orange layers.
  document.getElementById("blueRulesetSelect").addEventListener("change", (e) => {
    currentBlueRulesetIndex = parseInt(e.target.value);
    const display = document.getElementById("blueRulesetJsonDisplay");
    if (currentBlueRulesetIndex === -1 || !rulesets[currentBlueRulesetIndex]) {
      display.textContent = "No ruleset selected.";
    } else {
      display.textContent = formatRuleset(rulesets[currentBlueRulesetIndex]);
    }
  });
  document.getElementById("orangeRulesetSelect").addEventListener("change", (e) => {
    currentOrangeRulesetIndex = parseInt(e.target.value);
    const display = document.getElementById("orangeRulesetJsonDisplay");
    if (currentOrangeRulesetIndex === -1 || !rulesets[currentOrangeRulesetIndex]) {
      display.textContent = "No ruleset selected.";
    } else {
      display.textContent = formatRuleset(rulesets[currentOrangeRulesetIndex]);
    }
  });

  document.getElementById("clearGridButton").addEventListener("click", clearGrid);

  document.getElementById("randomNoiseButton").addEventListener("click", randomNoise);

  // Set up the Copy State URL button.
  document.getElementById("copyStateButton").addEventListener("click", copyStateUrl);

  // Automatically load the default ruleset from the textarea on page load.
  loadRulesets();

  // Check if a "config" parameter is present in the URL and load it.
  const urlParams = new URLSearchParams(window.location.search);
  const configParam = urlParams.get("config");
  if (configParam) {
    try {
      const configObj = JSON.parse(decodeURIComponent(configParam));
      applyConfig(configObj);
      console.log("Configuration loaded from URL parameter.");
    } catch (e) {
      console.error("Error parsing config from URL:", e);
    }
  }
}

// Initialize both grids as 2D arrays of 0's.
function initGrids(size) {
  gridBlue = [];
  gridOrange = [];
  for (let i = 0; i < size; i++) {
    let rowBlue = [];
    let rowOrange = [];
    for (let j = 0; j < size; j++) {
      rowBlue.push(0);
      rowOrange.push(0);
    }
    gridBlue.push(rowBlue);
    gridOrange.push(rowOrange);
  }
}

// Draw the combined grid to the canvas.
function drawGrid() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  for (let i = 0; i < gridSize; i++) {
    for (let j = 0; j < gridSize; j++) {
      let blueAlive = gridBlue[i][j] === 1;
      let orangeAlive = gridOrange[i][j] === 1;
      let fillColor;
      if (blueAlive && orangeAlive) {
        fillColor = "#FFFFFF"; // White when both layers are alive.
      } else if (blueAlive) {
        fillColor = "#ADD8E6"; // Light blue for blue layer.
      } else if (orangeAlive) {
        fillColor = "#FFDAB9"; // Light orange for orange layer.
      } else {
        fillColor = "#000000"; // Black for dead cells.
      }
      ctx.fillStyle = fillColor;
      ctx.fillRect(j * cellSize, i * cellSize, cellSize, cellSize);
      ctx.strokeStyle = "#ccc";
      ctx.strokeRect(j * cellSize, i * cellSize, cellSize, cellSize);
    }
  }
}

//------------------------------------------------------------------------------
// Canvas Click Handlers
//------------------------------------------------------------------------------

// Handle left-click on canvas to toggle a cell's state for the Blue layer.
function blueCanvasClickHandler(e) {
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  const col = Math.floor(x / cellSize);
  const row = Math.floor(y / cellSize);
  if (row >= 0 && row < gridSize && col >= 0 && col < gridSize) {
    gridBlue[row][col] = gridBlue[row][col] ? 0 : 1;
    drawGrid();
  }
}

// Handle right-click on canvas to toggle a cell's state for the Orange layer.
function orangeCanvasClickHandler(e) {
  e.preventDefault(); // Prevent the context menu.
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  const col = Math.floor(x / cellSize);
  const row = Math.floor(y / cellSize);
  if (row >= 0 && row < gridSize && col >= 0 && col < gridSize) {
    gridOrange[row][col] = gridOrange[row][col] ? 0 : 1;
    drawGrid();
  }
}

//------------------------------------------------------------------------------
// Simulation Update Helpers
//------------------------------------------------------------------------------

// Compute the number of live neighbors for a cell at (row, col) in a given grid.
function countNeighborsForGrid(grid, row, col) {
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

// In ca.js, add a new helper function for applying a ruleset to a single cell.
function applyCellRule(currentState, neighborCount, rulesetIndex) {
  if (rulesetIndex < 0 || rulesetIndex >= rulesets.length) {
    return currentState;
  }
  const ruleset = rulesets[rulesetIndex];
  // Use the "dead" branch if the cell is currently 0, otherwise the "live" branch.
  return currentState === 0 ? ruleset.dead[neighborCount] : ruleset.live[neighborCount];
}

// Updated simulation step function to handle swapped rules for white cells.
function stepSimulation() {
  let newBlue = [];
  let newOrange = [];
  for (let i = 0; i < gridSize; i++) {
    newBlue[i] = [];
    newOrange[i] = [];
    for (let j = 0; j < gridSize; j++) {
      // If the cell is white (both layers alive), swap the rulesets:
      // • New blue state uses the orange's ruleset and orange neighbors.
      // • New orange state uses the blue's ruleset and blue neighbors.
      if (gridBlue[i][j] === 1 && gridOrange[i][j] === 1) {
        newBlue[i][j] = applyCellRule(1, countNeighborsForGrid(gridOrange, i, j), currentOrangeRulesetIndex);
        newOrange[i][j] = applyCellRule(1, countNeighborsForGrid(gridBlue, i, j), currentBlueRulesetIndex);
      } else {
        // Otherwise update normally.
        newBlue[i][j] = applyCellRule(gridBlue[i][j], countNeighborsForGrid(gridBlue, i, j), currentBlueRulesetIndex);
        newOrange[i][j] = applyCellRule(gridOrange[i][j], countNeighborsForGrid(gridOrange, i, j), currentOrangeRulesetIndex);
      }
    }
  }
  gridBlue = newBlue;
  gridOrange = newOrange;
  drawGrid();
}

// Toggle simulation play/pause for both layers.
function toggleSimulation() {
  const playPauseButton = document.getElementById("playPauseButton");
  if (isRunning) {
    clearInterval(simulationInterval);
    simulationInterval = null;
    isRunning = false;
    playPauseButton.textContent = "Play";
  } else {
    if ((currentBlueRulesetIndex < 0 || currentBlueRulesetIndex >= rulesets.length) &&
        (currentOrangeRulesetIndex < 0 || currentOrangeRulesetIndex >= rulesets.length)) {
      alert("Please load and select at least one valid ruleset.");
      return;
    }
    simulationInterval = setInterval(stepSimulation, simulationSpeed);
    isRunning = true;
    playPauseButton.textContent = "Pause";
  }
}

// Update simulation speed based on slider value.
function updateSpeed(e) {
  simulationSpeed = parseInt(e.target.value);
  document.getElementById("speedDisplay").textContent = simulationSpeed;
  if (isRunning) {
    clearInterval(simulationInterval);
    simulationInterval = setInterval(stepSimulation, simulationSpeed);
  }
}

//------------------------------------------------------------------------------
// Configuration and Ruleset Management
//------------------------------------------------------------------------------

// Load rulesets from the textarea.
// Expected format: a JSON array of objects, each with:
//   { "dead": [num,...,num] (9 elements), "live": [num,...,num] (9 elements) }
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
      populateRulesetSelects();
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

// Populate the ruleset drop-down select elements for Blue and Orange layers.
function populateRulesetSelects() {
  const blueSelect = document.getElementById("blueRulesetSelect");
  const orangeSelect = document.getElementById("orangeRulesetSelect");
  blueSelect.innerHTML = '<option value="-1">None</option>';
  orangeSelect.innerHTML = '<option value="-1">None</option>';
  
  rulesets.forEach((ruleset, index) => {
    const optionBlue = document.createElement("option");
    optionBlue.value = index;
    optionBlue.textContent = "Ruleset " + (index + 1);
    blueSelect.appendChild(optionBlue);
    
    const optionOrange = document.createElement("option");
    optionOrange.value = index;
    optionOrange.textContent = "Ruleset " + (index + 1);
    orangeSelect.appendChild(optionOrange);
  });
  
  if (rulesets.length > 0) {
    currentBlueRulesetIndex = 0;
    currentOrangeRulesetIndex = 0;
    blueSelect.value = "0";
    orangeSelect.value = "0";
    document.getElementById("blueRulesetJsonDisplay").textContent = formatRuleset(rulesets[0]);
    document.getElementById("orangeRulesetJsonDisplay").textContent = formatRuleset(rulesets[0]);
  } else {
    currentBlueRulesetIndex = -1;
    currentOrangeRulesetIndex = -1;
  }
}

// Clear both grids (set all cells to dead state)
function clearGrid() {
  initGrids(gridSize);
  drawGrid();
}

function randomNoise() {
  // Try to retrieve threshold values from input fields (if they exist).
  const blueThresholdEl = document.getElementById("blueNoiseThreshold");
  const orangeThresholdEl = document.getElementById("orangeNoiseThreshold");
  // Use the value from the input or fall back to a default (0.1)
  const blueThreshold = blueThresholdEl ? parseFloat(blueThresholdEl.value) : 0.1;
  const orangeThreshold = orangeThresholdEl ? parseFloat(orangeThresholdEl.value) : 0.1;

  // Loop through grid cells and assign random values for both blue and orange layers.
  for (let i = 0; i < gridSize; i++) {
    for (let j = 0; j < gridSize; j++) {
      gridBlue[i][j] = Math.random() < blueThreshold ? 1 : 0;
      gridOrange[i][j] = Math.random() < orangeThreshold ? 1 : 0;
    }
  }
  drawGrid();
}

// Helper functions to convert the 2D grid array to/from a compact string representation.
function encodeGrid(grid) {
  // Convert each row (array of 0/1) to a string and join all rows together.
  return grid.map(row => row.join('')).join('');
}

function decodeGrid(encoded, size) {
  let grid = [];
  for (let i = 0; i < size; i++) {
    let row = [];
    for (let j = 0; j < size; j++) {
      // For each character in the string, convert it back to 0 or 1.
      row.push(encoded.charAt(i * size + j) === '1' ? 1 : 0);
    }
    grid.push(row);
  }
  return grid;
}

// Returns a compact configuration object representing the current state.
function getCurrentConfig() {
  return {
    gridSize: gridSize,
    gridBlue: encodeGrid(gridBlue),
    gridOrange: encodeGrid(gridOrange),
    wrapAround: wrapAround,
    currentBlueRulesetIndex: currentBlueRulesetIndex,
    currentOrangeRulesetIndex: currentOrangeRulesetIndex,
    rulesets: rulesets
  };
}

// Takes a configuration object and applies it to the current state.
function applyConfig(config) {
  if (config.gridBlue && config.gridOrange && config.gridSize) {
    gridSize = config.gridSize;
    document.getElementById("gridSizeInput").value = gridSize;
    gridBlue = typeof config.gridBlue === "string" ? decodeGrid(config.gridBlue, gridSize) : config.gridBlue;
    gridOrange = typeof config.gridOrange === "string" ? decodeGrid(config.gridOrange, gridSize) : config.gridOrange;
    wrapAround = config.wrapAround;
    document.getElementById("wrapToggle").checked = wrapAround;
    cellSize = canvas.width / gridSize;
    
    if ("rulesets" in config) {
      // Update rulesets globally.
      rulesets = config.rulesets;
      // Format the rulesets JSON with 2-space indent.
      let jsonString = JSON.stringify(rulesets, null, 2);
      // Collapse arrays of numbers (for "dead" and "live") into a single line.
      jsonString = jsonString.replace(/\[\s*((?:(?:\d+)(?:,\s*)?)+)\s*\]/gm, function(match, p1) {
        return "[" + p1.replace(/\s+/g, " ") + "]";
      });
      document.getElementById("rulesetTextarea").value = jsonString;
      
      // Regenerate the ruleset select options to match the loaded rulesets.
      populateRulesetSelects();
    }
    
    if (typeof config.currentBlueRulesetIndex !== 'undefined') {
      currentBlueRulesetIndex = config.currentBlueRulesetIndex;
      const blueSelect = document.getElementById("blueRulesetSelect");
      blueSelect.value = currentBlueRulesetIndex;
      if (rulesets[currentBlueRulesetIndex]) {
        document.getElementById("blueRulesetJsonDisplay").textContent = formatRuleset(rulesets[currentBlueRulesetIndex]);
      } else {
        document.getElementById("blueRulesetJsonDisplay").textContent = "No ruleset selected.";
      }
    }
    
    if (typeof config.currentOrangeRulesetIndex !== 'undefined') {
      currentOrangeRulesetIndex = config.currentOrangeRulesetIndex;
      const orangeSelect = document.getElementById("orangeRulesetSelect");
      orangeSelect.value = currentOrangeRulesetIndex;
      if (rulesets[currentOrangeRulesetIndex]) {
        document.getElementById("orangeRulesetJsonDisplay").textContent = formatRuleset(rulesets[currentOrangeRulesetIndex]);
      } else {
        document.getElementById("orangeRulesetJsonDisplay").textContent = "No ruleset selected.";
      }
    }
    drawGrid();
  } else {
    alert("Invalid configuration parameter in URL.");
  }
}

// Generates a URL with the current configuration encoded in the "config" query parameter and copies it
function copyStateUrl() {
  const config = getCurrentConfig();
  const configStr = JSON.stringify(config);
  const encoded = encodeURIComponent(configStr);
  const url = window.location.origin + window.location.pathname + '?config=' + encoded;
  navigator.clipboard.writeText(url)
    .catch((err) => {
      alert("Failed to copy URL: " + err);
    });
}