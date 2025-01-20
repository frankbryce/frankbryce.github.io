const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const playPauseButton = document.getElementById('playPauseButton');
const resetButton = document.getElementById('resetButton');
const stepButton = document.getElementById('stepButton');
const speedSlider = document.getElementById('speedSlider');
const saveButton = document.getElementById('saveButton');
const loadInput = document.getElementById('loadInput');
const clearButton = document.getElementById('clearButton');
const rowsInput = document.getElementById('rowsInput');
const colsInput = document.getElementById('colsInput');
const cellSizeInput = document.getElementById('cellSizeInput');
const wrapCheckbox = document.getElementById('wrapCheckbox');

let cellSize = parseInt(cellSizeInput.value);
let gridWidth = parseInt(colsInput.value);
let gridHeight = parseInt(rowsInput.value);
canvas.width = gridWidth * cellSize;
canvas.height = gridHeight * cellSize;

// Initialize grid here (before createGrid function)
let grid = null; 
let loadedGridData = null; // Variable to store loaded grid data
let isPlaying = false;
let intervalId = null;
let simulationSpeed = getSpeedFromSlider();
let wrapAround = false;
let isMouseDown = false;

function getSpeedFromSlider() {
    // Logarithmic speed scale
    const base = 1.1;
    const value = parseInt(speedSlider.value);
    return Math.pow(base, value);
}

function createGrid(keep_state=false) {
    const newGrid = Array.from({ length: gridHeight }, () =>
        Array.from({ length: gridWidth }, () => 0)
    );

    // Preserve existing cell states within new bounds
    if (grid !== null && keep_state) {
        for (let y = 0; y < Math.min(gridHeight, grid.length); y++) {
            for (let x = 0; x < Math.min(gridWidth, grid[0].length); x++) {
                newGrid[y][x] = grid[y][x];
            }
        }
    }

    return newGrid;
}

grid = createGrid();

function drawGrid() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw cell outlines
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.2)';
    for (let y = 0; y < gridHeight; y++) {
        for (let x = 0; x < gridWidth; x++) {
            ctx.strokeRect(x * cellSize, y * cellSize, cellSize, cellSize);
        }
    }

    // Draw filled cells
    ctx.fillStyle = 'black';
    for (let y = 0; y < gridHeight; y++) {
        for (let x = 0; x < gridWidth; x++) {
            if (grid[y][x] === 1) {
                ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
            }
        }
    }
}

function loadGrid(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                loadedGridData = JSON.parse(JSON.stringify(data)); 
                resetGrid();
            } catch (error) {
                console.error('Error parsing JSON file:', error);
                alert('Invalid file format. Please select a valid JSON file.');
            }
        };
        reader.readAsText(file);
    }
}

function resetGrid() {
    if (loadedGridData) {
        grid = JSON.parse(JSON.stringify(loadedGridData.grid));
        gridHeight = loadedGridData.rows;
        gridWidth = loadedGridData.cols;
        cellSize = loadedGridData.cellSize || cellSize;
        wrapAround = loadedGridData.wrapAround || false;
        wrapCheckbox.checked = wrapAround;
        rowsInput.value = gridHeight;
        colsInput.value = gridWidth;
        cellSizeInput.value = cellSize;
        canvas.width = gridWidth * cellSize;
        canvas.height = gridHeight * cellSize;
        drawGrid();
    }
}

function countNeighbors(x, y) {
    let count = 0;
    for (let i = -1; i <= 1; i++) {
        for (let j = -1; j <= 1; j++) {
            if (i === 0 && j === 0) continue;

            let newX = x + i;
            let newY = y + j;

            if (wrapAround) {
                newX = (newX + gridWidth) % gridWidth;
                newY = (newY + gridHeight) % gridHeight;
            }

            if (newX >= 0 && newX < gridWidth && newY >= 0 && newY < gridHeight) {
                count += grid[newY][newX];
            }
        }
    }
    return count;
}

function nextGeneration() {
    const newGrid = createGrid();
    for (let y = 0; y < gridHeight; y++) {
        for (let x = 0; x < gridWidth; x++) {
            const neighbors = countNeighbors(x, y);
            if (grid[y][x] === 1) {
                newGrid[y][x] = neighbors === 2 || neighbors === 3 ? 1 : 0;
            } else {
                newGrid[y][x] = neighbors === 3 ? 1 : 0;
            }
        }
    }
    grid = newGrid;
}

function togglePlayPause() {
    isPlaying = !isPlaying;
    playPauseButton.textContent = isPlaying ? 'Pause' : 'Play';
    if (isPlaying) {
        intervalId = setInterval(() => {
            nextGeneration();
            drawGrid();
        }, 1000 / simulationSpeed);
    } else {
        clearInterval(intervalId);
    }
}

function step() {
    if (!isPlaying) {
        nextGeneration();
        drawGrid();
    }
}

function updateSpeed() {
    simulationSpeed = getSpeedFromSlider();
    if (isPlaying) {
        clearInterval(intervalId);
        intervalId = setInterval(() => {
            nextGeneration();
            drawGrid();
        }, 1000 / simulationSpeed);
    }
}

function saveGrid() {
    const data = JSON.stringify({
        grid: grid,
        rows: gridHeight,
        cols: gridWidth,
        cellSize: cellSize,
        wrapAround: wrapAround
    });
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'game-of-life.json';
    a.click();
    URL.revokeObjectURL(url);
}

function clearGrid() {
    grid = createGrid();
    drawGrid();
}

function updateGridSize() {
    gridWidth = parseInt(colsInput.value);
    gridHeight = parseInt(rowsInput.value);
    cellSize = parseInt(cellSizeInput.value);
    canvas.width = gridWidth * cellSize;
    canvas.height = gridHeight * cellSize;
    grid = createGrid(keep_state=true);
    drawGrid();
}

function handleCellClick(x, y, keep_on=false) {
    const cellX = Math.floor(x / cellSize);
    const cellY = Math.floor(y / cellSize);
    if (cellX >= 0 && cellX < gridWidth && cellY >= 0 && cellY < gridHeight) {
        if (keep_on) {
            grid[cellY][cellX] = 1
        } else {
            grid[cellY][cellX] = 1 - grid[cellY][cellX];
        }
        drawGrid();
    }
}

canvas.addEventListener('click', (event) => {
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    handleCellClick(x, y);
});

canvas.addEventListener('mousedown', () => {
    isMouseDown = true;
});

canvas.addEventListener('mouseup', () => {
    isMouseDown = false;
});

canvas.addEventListener('mousemove', (event) => {
    if (isMouseDown) {
        const rect = canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        handleCellClick(x, y, keep_on=true);
    }
});

canvas.addEventListener('mouseleave', () => {
    isMouseDown = false;
});

playPauseButton.addEventListener('click', togglePlayPause);
resetButton.addEventListener('click', resetGrid);
stepButton.addEventListener('click', step);
speedSlider.addEventListener('input', updateSpeed);
saveButton.addEventListener('click', saveGrid);
loadInput.addEventListener('change', loadGrid);
clearButton.addEventListener('click', clearGrid);
wrapCheckbox.addEventListener('change', () => {
    wrapAround = wrapCheckbox.checked;
});

rowsInput.addEventListener('input', updateGridSize);
colsInput.addEventListener('input', updateGridSize);
cellSizeInput.addEventListener('input', updateGridSize);

drawGrid();
