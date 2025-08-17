const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

let x = 50;
let y = 300;
let velocityY = 0;
let gravity = 1;
let isJumping = false;

const frogImg = new Image();
frogImg.src = "/static/frog.avif";

function drawGround() {
  ctx.fillStyle = "#267326";
  ctx.fillRect(0, 350, canvas.width, 50);
}



function drawFrog() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawGround();
  ctx.drawImage(frogImg, x, y, 40, 50);
}


function showFlowerSparkle() {
  tsParticles.load("sparkle-container", {
    background: { color: { value: "transparent" } },
    particles: {
      number: { value: 25 },
      size: { value: 18 },
      move: { speed: 2 },
      shape: {
        type: "char",
        character: {
          value: ["🌸"],
          font: "Verdana",
          style: "",
          weight: "400"
        }
      },
      opacity: { value: 0.8 }
    }
  });

  setTimeout(() => {
    const container = document.getElementById("sparkle-container");
    if (container) container.innerHTML = '';
  }, 800);
}





function playSound(type) {
  const soundMap = {
    move: "/static/sound/frog-croak-80816.mp3",
    jump: "/static/sound/jump-sound-14839,mp3",
    wait: "/static/sound/waitwaitwaitwait-95930.mp3",
    glow: "/static/sound/glow.mp3",
    spin: "/static/sound/spin.mp3",
    dash: "/static/sound/dash.mp3",
    float: "/static/sound/float.mp3"
  };
  const audio = new Audio(soundMap[type]);
  if (audio.src) audio.play();
}

function move(direction, steps) {
  return new Promise(resolve => {
    
    playSound("move");
    let moved = 0;
    const stepPixels = 10;
    const interval = setInterval(() => {
      if (moved >= steps * stepPixels) {
        clearInterval(interval);
        resolve();
        return;
      }
      x += direction === "right" ? 2 : -2;
      moved += 2;
      drawFrog();
    }, 15);
  });
}

function jump() {
  return new Promise(resolve => {
    if (isJumping) return resolve();
    playSound("jump");
    // ✅ only here
    isJumping = true;
    velocityY = -15;
    const interval = setInterval(() => {
      y += velocityY;
      velocityY += gravity;
      drawFrog();
      if (y >= 300) {
        y = 300;
        velocityY = 0;
        isJumping = false;
        clearInterval(interval);
        resolve();
      }
    }, 30);
  });
}

function spin() {
  return new Promise(resolve => {
    playSound("spin");
    let angle = 0;
    const spinInterval = setInterval(() => {
      if (angle >= 360) {
        clearInterval(spinInterval);
        drawFrog();
        resolve();
        return;
      }
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      drawGround(); // ✅ only draw ground now
      ctx.save();
      ctx.translate(x + 20, y + 25);
      ctx.rotate((angle * Math.PI) / 180);
      ctx.drawImage(frogImg, -20, -25, 40, 50);
      ctx.restore();
      angle += 20;
    }, 50);
  });
}




function dash() {
  return new Promise(resolve => {
    playSound("dash");
    let distance = 0;
    const interval = setInterval(() => {
      if (distance >= 100) {
        clearInterval(interval);
        resolve();
        return;
      }
      x += 5;
      distance += 5;
      drawFrog();
    }, 20);
  });
}
function glow() {
  return new Promise(resolve => {
    playSound("glow");
    showFlowerSparkle();
    canvas.style.boxShadow = "0 0 50px 15px rgba(255, 255, 0, 0.7)";
    setTimeout(() => {
      canvas.style.boxShadow = "none";
      resolve();
    }, 1500);
  });
}


function float() {
  return new Promise(resolve => {
    playSound("float");
    let dir = 1;
    let steps = 0;
    const interval = setInterval(() => {
      y += dir * 2;
      drawFrog();
      steps++;
      if (steps >= 60) {
        clearInterval(interval);
        y = 300;
        drawFrog();
        resolve();
      }
      dir *= -1;
    }, 60);
  });
}

function undoLastCommand() {
  const input = document.getElementById("codeInput");
  const lines = input.value.trim().split("\n");
  lines.pop();
  input.value = lines.join("\n");
}

function clearCode() {
  document.getElementById("codeInput").value = "";
}

function tokenize(input) {
  const tokens = [];
  const regex = /\b(moveRight|moveLeft|jump|wait|glow|spin|dash|float)\b|\d+/gi;
  let match;
  while ((match = regex.exec(input)) !== null) {
    tokens.push(match[0]);
  }
  return tokens;
}

function buildParseTree(actions) {
  let tree = "";
  actions.forEach((a, i) => {
    const index = `Command ${i + 1}: `;
    switch (a.type) {
      case "move":
        tree += `${index}MOVE ${a.direction.toUpperCase()} by ${a.steps} steps\n`;
        break;
      case "jump":
        tree += `${index}JUMP\n`;
        break;
      case "wait":
        tree += `${index}WAIT for ${a.time} seconds\n`;
        break;
      case "glow":
        tree += `${index}GLOW (visual sparkle effect)\n`;
        break;
      case "spin":
        tree += `${index}SPIN (rotate 360°)\n`;
        break;
      case "dash":
        tree += `${index}DASH (quick run)\n`;
        break;
      case "float":
        tree += `${index}FLOAT (up/down float animation)\n`;
        break;
      default:
        tree += `${index}UNKNOWN\n`;
        break;
    }
  });
  return tree;
}


function runCode() {
  const code = document.getElementById("codeInput").value;
  const tokens = tokenize(code);
  document.getElementById("tokens").innerText = "Tokens:\n" + tokens.join(" | ");

  fetch("/run", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code })
  })
    .then(res => res.json())
    .then(data => {
      if (data.error) {
        alert("❌ Error: " + data.error);
        return;
      }

      document.getElementById("parseTree").innerText = buildParseTree(data.actions);
      x = 50;
      y = 300;
      drawFrog();
      execute(data.actions);
    });
}


async function execute(actions) {
  for (const action of actions) {
    if (action.type === "move") await move(action.direction, action.steps);
    else if (action.type === "jump") await jump();
    else if (action.type === "wait") await wait(action.time);
    else if (action.type === "glow") await glow();
    else if (action.type === "spin") await spin();
    else if (action.type === "dash") await dash();
    else if (action.type === "float") await float();
  }
}

function addCommand(cmd, type) {
  const input = document.getElementById("codeInput");
  if (input.value && !input.value.endsWith("\n")) input.value += "\n";
  input.value += cmd + "\n";
  playSound(type);
}

function runCommand(command) {
  const codeInput = document.getElementById("codeInput");
  if (!codeInput.value.endsWith('\n') && codeInput.value.length > 0) {
    codeInput.value += '\n';
  }
  codeInput.value += command + '\n';
  runCode();
}

window.onload = () => {
  drawFrog();
};
