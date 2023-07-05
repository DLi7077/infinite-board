const canvas = document.getElementById("whiteboard");
const context = canvas.getContext("2d");

// disable context meny
document.oncontextmenu = () => false;

const strokeSeries = [];
let redoStack = [];
let currentStrokeSeries = [];

const cursor = {
  x: null,
  y: null,
  previousX: null,
  previousY: null,
};

let currentHue = 0;
let huePen = (hue) => `hsl(${hue},100%,70%)`;

const origin = {
  offsetX: 0,
  offsetY: 0,
};

let scale = 1;

const trueHeight = () => {
  return canvas.clientHeight / scale;
};

const trueWidth = () => {
  return canvas.clientWidth / scale;
};

const relativePosition = (position, offset) => {
  return scale * (position + offset);
};

const absolutePosition = (position, offset) => {
  return position / scale - offset;
};

function relativeCoordinates(coordinates) {
  const [x, y] = coordinates;
  return [
    relativePosition(x, origin.offsetX),
    relativePosition(y, origin.offsetY),
  ];
}

function absoluteCoordinates(coordinates) {
  const [x, y] = coordinates;
  return [
    absolutePosition(x, origin.offsetX),
    absolutePosition(y, origin.offsetY),
  ];
}

function renderCanvas() {
  canvas.width = document.body.clientWidth;
  canvas.height = document.body.clientHeight;

  context.fillStyle = "black";
  context.fillRect(0, 0, canvas.width, canvas.height);

  strokeSeries.forEach((series) => {
    series.forEach(({ start, end, color }) => {
      drawLineSegment(
        relativeCoordinates(start),
        relativeCoordinates(end),
        color
      );
    });
  });
}

function drawLineSegment(start, end, strokeColor) {
  const [startX, startY] = start;
  const [endX, endY] = end;

  context.beginPath();
  context.moveTo(startX, startY);
  context.lineCap = "round";
  context.lineJoin = "round";
  context.lineTo(endX, endY);
  context.strokeStyle = strokeColor;
  context.lineWidth = 4;
  context.stroke();
}

renderCanvas();

const mouseStatus = {
  drawing: false,
  moving: false,
};

function updateCursor(event) {
  cursor.x = event.pageX;
  cursor.y = event.pageY;
}

// mouse event handlers
function handleMouseDown(event) {
  const LEFT_CLICK = 0;
  const RIGHT_CLICK = 2;

  if (event.button === LEFT_CLICK) {
    mouseStatus.drawing = true;
  }
  if (event.button === RIGHT_CLICK) {
    mouseStatus.moving = true;
  }

  updateCursor(event);
  cursor.previousX = cursor.x;
  cursor.previousY = cursor.y;
}

function handleMouseMove(event) {
  updateCursor(event);
  if (mouseStatus.drawing) {
    const start = [cursor.previousX, cursor.previousY];
    const end = [cursor.x, cursor.y];

    const strokeColor = huePen(currentHue);
    currentStrokeSeries.push({
      start: absoluteCoordinates(start),
      end: absoluteCoordinates(end),
      color: strokeColor,
    });
    drawLineSegment(start, end, strokeColor);
  }

  if (mouseStatus.moving) {
    origin.offsetX += (cursor.x - cursor.previousX) / scale;
    origin.offsetY += (cursor.y - cursor.previousY) / scale;

    renderCanvas();
  }
  cursor.previousX = cursor.x;
  cursor.previousY = cursor.y;
}

function handleMouseUp(event) {
  mouseStatus.drawing = false;
  mouseStatus.moving = false;

  const start = absoluteCoordinates([cursor.x, cursor.y]);
  const end = absoluteCoordinates([cursor.x, cursor.y]);
  currentStrokeSeries.push({
    start,
    end,
    color: huePen(currentHue),
  });
  drawLineSegment(start, end, huePen(currentHue));

  currentHue = Math.random() * 360;
  strokeSeries.push(currentStrokeSeries);
  currentStrokeSeries = [];
  redoStack = [];
}

// handle zoom level
function handleMouseWheel(event) {
  const deltaY = event.deltaY;
  const scaleAmount = -deltaY / 5000; // fixed scale preset
  scale = scale * (1 + scaleAmount);

  const distanceX = event.pageX / canvas.clientWidth;
  const distanceY = event.pageY / canvas.clientHeight;

  const unitsZoomedX = trueWidth() * scaleAmount;
  const unitsZoomedY = trueHeight() * scaleAmount;

  const unitsAddLeft = unitsZoomedX * distanceX;
  const unitsAddTop = unitsZoomedY * distanceY;

  origin.offsetX -= unitsAddLeft;
  origin.offsetY -= unitsAddTop;
  // bottom line
  drawLineSegment(
    relativeCoordinates([
      trueWidth() - canvas.width,
      trueHeight() - canvas.height,
    ]),
    relativeCoordinates([trueWidth() - canvas.width, trueHeight()]),
    huePen(currentHue)
  );

  renderCanvas();
}

const commands = [];

const keyCode = (character) => character.charCodeAt(0);
function handleKeyboardShortcut(event) {
  const isUndo = event.keyCode === keyCode("Z") && event.ctrlKey;
  const isRedo = event.keyCode === keyCode("Y") && event.ctrlKey;
  if (isUndo && strokeSeries.length !== 0) {
    redoStack.push(strokeSeries.at(-1));
    strokeSeries.pop();
    renderCanvas();
  }
  if (isRedo && redoStack.length !== 0) {
    strokeSeries.push(redoStack.at(-1));
    redoStack.pop();
    renderCanvas();
  }
}

window.onload = () => {
  // Event Listeners
  canvas.addEventListener("mousedown", handleMouseDown);
  canvas.addEventListener("mousemove", handleMouseMove);
  canvas.addEventListener("mouseup", handleMouseUp);
  canvas.addEventListener("mousewheel", handleMouseWheel);
  window.addEventListener("keydown", handleKeyboardShortcut);
};
