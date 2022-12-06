/**
 * @author alexanderkhanov / http://24x20.com/
 */

var myGameArea = {
  canvas : document.createElement("canvas"),
  start : function() {
    this.canvas.width = 730;
    this.canvas.height = 500;
    this.context = this.canvas.getContext("2d");
    document.body.insertBefore(this.canvas, document.body.childNodes[0]);
    this.interval = setInterval(updateGameArea, 20);

    this.mouseEvent = 0;
    window.addEventListener('mousedown', function (e) {
      var r = myGameArea.canvas.getBoundingClientRect();
      myGameArea.x = e.clientX - r.left;
      myGameArea.y = e.clientY - r.top;
      myGameArea.mouseEvent = 1;
    })
  },
  clear : function() {
    this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }
}

// gameboard description
const cellWidth = 24;
const cellHeight = 24;
const nCellsX = 22;
const nCellsY = 18;
const offsetX = 4;
const offsetY = 4;

const nCells = nCellsX*nCellsY;
gameBoardCells = "xooxxxxxxxxxxxxxxxxxxxxooxxxxxxxxxxxxxxxxxxxxooooooooooooooooooooxxooooooooooooooooooooxxxxxxxxxxxxxxxxxxxxooxxooooooooooooooxxxxooxxooooooooooooooxxxxooxxooxxxxxxxxxxooxxxxooxxoooooooooooxooooooooxxoooooooooooxooooooooxxxxxxxxxxxooxxxxxxxxxxxoooooooooooxooooooxxxxoooooooooooxooooooxxxxooxxxxxxxxxxooxxooxxxxooooooooooooooxxooxxxxooooooooooooooxxoooooxxxxxxxxxxxxxxxxxoooooxxxxxxxxxxxxxxxxxxxxxx";
editMode = 0;

// money stuff
const startingCapital = 250;
bank = startingCapital;

const nRowsInWave = 14;
const startingStrength = 300;
vectoidStrength = startingStrength;
const vectoidPrice = 0.02;
const startingLives = 20;
lives = startingLives;
waveCount = 0;

buttons = [];
vectoids = [];
towers = [];
projectiles = [];

selectedTower = null;

vectoidLauncher = 0;
function launchVectoids() {
  if (vectoidLauncher>0) {
    if (vectoidLauncher%cellHeight==0) {
      vectoids.push(new vectoid(2,0, 21,15, 0,1, 0, 0));
      vectoids.push(new vectoid(1,0, 21,16, 0,1, 1, 0));
    }
    vectoidLauncher--;
  }
}

const darkColor = "#16a085";
const brightColor = "#73c6b6";
const boardColor = "#d0ece7";
const whiteColor = "#ffffff";
const blackColor = "#000000";

function colorSelector(i) {
  if (i==1) {
    return "#ec7063";
  } else if (i==2) {
    return "#af7ac5";
  } else if (i==3) {
    return "#5dade2";
  }
  return "#58d68d";
}

function createGameBoard() {
  buttons.push(new button( 20,456,darkColor,brightColor,1,"edit"));
  buttons.push(new button( 80,456,darkColor,brightColor,0,"save"));
  buttons.push(new button(140,456,darkColor,brightColor,0,"reset"));
  buttons.push(new button(474,456,darkColor,brightColor,0,"send"));
  buttons.push(new button(560, 80,darkColor,brightColor,0,"sell"));
  buttons.push(new button(620, 80,darkColor,brightColor,0,"upgrade"));
  towers.push(new  greenTower(560,30));
  towers.push(new    redTower(600,30));
  towers.push(new purpleTower(640,30));
  towers.push(new   blueTower(680,30));
}

function resetGameBoard() {
  towers.length = 4; // keep the towers defined in createGameBoard()
  vectoids.length = 0; // remove all existing vectoids

  selectedTower = 0;
  vectoidLauncher = 0;

  vectoidStrength = startingStrength;
  bank = startingCapital;
  lives = startingLives;
  waveCount = 0;
}

function paintGameBoard() {
  context = myGameArea.context;
  context.lineWidth = 2;
  context.strokeStyle = darkColor;
  context.strokeRect(offsetX-2,offsetY-2,nCellsX*cellWidth+4,nCellsY*cellHeight+4);

  k = 0;
  for (j = 0; j<nCellsY; ++j) {
    for (i = 0; i<nCellsX; ++i) {
      cell = gameBoardCells[k];
      if (cell=='x') context.fillStyle = darkColor; else context.fillStyle = boardColor;
      context.fillRect(offsetX+i*cellWidth+1, offsetY+j*cellHeight+1, cellWidth-2, cellHeight-2);
      ++k;
    }
  }
}

class button {

  constructor(x, y, color1, color2, lockable, action) {
    this.x = x;
    this.y = y;
    this.w = action.length<4 ? 42:2+10*action.length;
    this.h = 20;
    this.color1 = color1;
    this.color2 = color2;
    this.lockable = lockable;
    this.action = action;
    this.state = 0;
  }

  update() {
    // special buttons only shown if an active tower is selected
    if ((this.action=="sell" || this.action=="upgrade") && !(selectedTower && selectedTower.isActive)) {
      return;
    }
    if (myGameArea.mouseEvent==1
	&& this.x<=myGameArea.x && myGameArea.x<=this.x+this.w
	&& this.y<=myGameArea.y && myGameArea.y<=this.y+this.h) {
      this.state = 1 - this.state;
      myGameArea.mouseEvent = 0;

      if (this.action=="edit") {
	editMode = this.state;
      } else if (this.action=="save") {
	var textToSave = gameBoardCells;
	var textToSaveAsBlob = new Blob([textToSave], {type:"text/plain"});
	var textToSaveAsURL = window.URL.createObjectURL(textToSaveAsBlob);
	var fileNameToSaveAs = "cells.txt";
     
	var downloadLink = document.createElement("a");
	downloadLink.download = fileNameToSaveAs;
	downloadLink.innerHTML = "Download File";
	downloadLink.href = textToSaveAsURL;
	downloadLink.onclick = destroyClickedElement; // see the code below
	downloadLink.style.display = "none";
	document.body.appendChild(downloadLink);
     
	downloadLink.click();
      } else if (this.action=="reset") {
	resetGameBoard();
      } else if (this.action=="sell") {
	bank += selectedTower.priceToSell();
	// remove the tower from the list
	towers.splice(towers.indexOf(selectedTower),1);
	selectedTower = null;
      } else if (this.action=="upgrade") {
	if (selectedTower.level<10 && bank>=selectedTower.priceToUpgrade) {
	  bank -= selectedTower.priceToUpgrade;
	  selectedTower.level++;
	}
      } else if (this.action=="send") {
	if (vectoidLauncher==0) {
	  vectoidLauncher = nRowsInWave*cellHeight;
	  vectoidStrength = Math.floor(vectoidStrength*1.2);
	  bank = Math.floor(bank*1.03);
	  ++waveCount;
	}
      }
    } else if (this.lockable==0) {
      this.state = 0;
    }

    let context = myGameArea.context;
    if (this.state==0) {
      context.fillStyle = this.color1;
    } else {
      context.fillStyle = this.color2;
    }
    context.fillRect(this.x, this.y, this.w, this.h);

    context.font = "16px Arial";
    context.textAlign = "center";
    context.textBaseline = "bottom";
    context.fillStyle = whiteColor;
    context.fillText(this.action,this.x+this.w/2,this.y+this.h-2);
  }

  // text info
}

function destroyClickedElement(event)
{
    document.body.removeChild(event.target);
}

class vectoid {

  constructor(x0, y0, x1, y1, vx, vy, rl, vectoidType) {
    this.initial_x = offsetX + x0*cellWidth;
    this.initial_y = offsetY + y0*cellHeight;
    this.initial_vx = vx;
    this.initial_vy = vy;

    this.x = this.initial_x;
    this.y = this.initial_y;
    this.vx = this.initial_vx;
    this.vy = this.initial_vy;

    this.z = 0;

    this.x1 = x1;
    this.y1 = y1;

    this.rl = rl;
    this.vectoidType = vectoidType;
    this.color = colorSelector(vectoidType);

    this.health = cellWidth/2-1;
    this.strength = vectoidStrength;

    this.pause = 0;
  }

  update() {
    if (this.pause==0) {
      // positioned between the cells? keep moving
      if ((this.x-offsetX)%cellWidth == 0 &&
	  (this.y-offsetY)%cellHeight == 0) {
	// I'm in the center of a cell, time to decide where to go
	let i = (this.x-offsetX)/cellWidth;
	let j = (this.y-offsetY)/cellHeight;
	// close the loop
	if (i==this.x1 && j==this.y1) {
	  this.x = this.initial_x;
	  this.y = this.initial_y;
	  this.vx = this.initial_vx;
	  this.vy = this.initial_vy;
	  if (--lives<=0) {
	    alert("Game over");
	    resetGameBoard();
	  }
	  return;
	}
	// can I move forward?
	let kf = (j+this.vy)*nCellsX + (i+this.vx);
	let canMoveForward = gameBoardCells[kf]=="o";
	// do I have a wall to the left?
	let vxl = this.vy; let vyl = -this.vx;
	let kl = (j+vyl)*nCellsX + (i+vxl);
	let canMoveLeft = gameBoardCells[kl]=="o";
	// do I have a wall to the right?
	let vxr = -this.vy; let vyr = this.vx;
	let kr = (j+vyr)*nCellsX + (i+vxr);
	let canMoveRight = gameBoardCells[kr]=="o";
	if (this.rl==0) {
	  // I follow the left wall
	  if (canMoveLeft) {
	    this.vx = vxl;
	    this.vy = vyl;
	  } else if (!canMoveForward) {
	    this.vx = vxr;
	    this.vy = vyr;
	  } // otherwise keep moving forward
	} else {
	  // I follow the right wall
	  if (canMoveRight) {
	    this.vx = vxr;
	    this.vy = vyr;
	  } else if (!canMoveForward) {
	    this.vx = vxl;
	    this.vy = vyl;
	  } // otherwise keep moving forward
	}
      }

      this.x += this.vx;
      this.y += this.vy;
    } else {
      this.pause--;
    }

    let context = myGameArea.context;
    context.fillStyle = this.color;
    context.fillRect(this.x+(cellWidth/2-this.health), this.y+cellHeight/2-this.health, 2*this.health, 2*this.health);
  }
}

class tower {

  constructor(x, y, towerType) {
    this.x = x;
    this.y = y;
    this.towerType = towerType;
    this.color = colorSelector(towerType);

    this.level = 1;
    this.isActive = false;
    this.selected = 0;
    this.enemies = [];
    this.maxEnemies = 1;

    // default parameters, maybe overridden by specific tower types
    this.R0 = 67; this.dR = 1.7;
    this.radius = function() { return this.dR*this.level + this.R0; }
    this.P0 = 100; this.dP = 6;
    this.power = function() { return this.dP*this.level + this.P0; }

    this.maxCharge = 64;
    this.charge = this.maxCharge;

    this.priceToBuy = 100;
    this.priceToUpgrade = 50;
    this.priceToSell = function() { return 0.5*(this.priceToBuy + (this.level-1)*this.priceToUpgrade); }
  }

  update() {
    if (myGameArea.mouseEvent==1
	&& this.x<=myGameArea.x && myGameArea.x<=this.x+cellWidth
	&& this.y<=myGameArea.y && myGameArea.y<=this.y+cellHeight) {
      this.selected = 1 - this.selected;
      if (this.selected==0) {
	// it was us who was selected before
	selectedTower = null;
      } else {
	if (selectedTower) {
	  // someone else was selected before
	  selectedTower.selected = 0;
	  selectedTower.draw();
	}
	selectedTower = this;
      }
      myGameArea.mouseEvent = 0;
    }
    if (this.isActive) {
      // looping backwards so splicing does not disturb the indices
      for (let i = this.enemies.length-1; i>=0; i--) {
        let enemy = this.enemies[i];
	// see if enemy is already dead
	if (!vectoids.includes(enemy)) {
	  this.enemies.splice(i,1);
	  continue;
	}
	// see if we lost the enemy
	let distance = Math.sqrt(Math.pow(this.x-enemy.x,2) + Math.pow(this.y-enemy.y,2));
	if (distance>this.radius()) {
	  this.enemies.splice(i,1);
	}
      }
      if (this.enemies.length<this.maxEnemies) {
	// look around to see if there are enemies to lock
	for (i = 0; i<vectoids.length; i++) {
	  let v = vectoids[i];
	  if (this.enemies.includes(v)) continue;
	  let distance = Math.sqrt(Math.pow(this.x-v.x,2) + Math.pow(this.y-v.y,2));
	  if (distance<=this.radius()) {
	    this.enemies.push(v);
	    this.lockThis(v);
	    if (this.enemies.length>=this.maxEnemies) break;
	  }
	}
      }
    }
    this.draw();
  }

  draw() {
    let context = myGameArea.context;
    context.fillStyle = this.color;
    context.fillRect(this.x, this.y, cellWidth, cellHeight);
    if (this.selected) {
      context.lineWidth = 1;
      context.strokeStyle = blackColor;
      context.strokeRect(this.x+1, this.y+1, cellWidth-2, cellHeight-2);
    }

    if (this.isActive && this.selected) {
      context.beginPath();
      context.arc(this.x+cellWidth/2, this.y+cellHeight/2, this.radius(), 0, 2*Math.PI);
      context.closePath();
      context.lineWidth = 1;
      context.strokeStyle = this.color;
      context.stroke();
    }

    if (this.isActive) {
      context.font = "10px Arial";
      context.textAlign = "left";
      context.textBaseline = "top";
      context.fillStyle = blackColor;
      context.fillText(this.level,this.x+2,this.y+2);
    }
  }

  attack() {
    for (let i = this.enemies.length-1; i>=0; i--) {
      let enemy = this.enemies[i];
      let strike = this.attackThis(enemy);
      if (strike>0) {
	// damage enemy's health
	if ((enemy.health-=strike/enemy.strength)<3) {
	  // the enemy is dead
	  bank += Math.floor(enemy.strength*vectoidPrice);
	  vectoids.splice(vectoids.indexOf(enemy),1);
	  this.enemies.splice(i,1);
	}
      }
    }
    if (this.charge<this.maxCharge) this.charge++;
  }

  attackThis(enemy) {
    // dummy in parent's class, different for each tower type
    return 0;
  }

  lockThis(enemy) {
    // additional action when new enemy is locked
  }
}

class greenTower extends tower {

  constructor(x, y) {
    super(x, y, 0);
  }

  attackThis(enemy) {
    let context = myGameArea.context;
    context.beginPath();
    context.moveTo(this.x+cellWidth/2, this.y+cellHeight/2);
    context.lineTo(enemy.x+cellWidth/2, enemy.y+cellHeight/2);
    context.closePath();
    context.lineWidth = 2;
    context.strokeStyle = whiteColor;
    context.stroke();

    let dd = (enemy.x+enemy.y)%4+1;
    context.fillStyle = whiteColor;
    context.fillRect(enemy.x+cellWidth/2-dd, enemy.y+cellHeight/2-dd, 2*dd, 2*dd);
    context.fillStyle = whiteColor;
    context.fillRect(this.x+cellWidth/2-dd, this.y+cellHeight/2-dd, 2*dd, 2*dd);

    return this.power();
  }
}

class redTower extends tower {

  constructor(x, y) {
    super(x, y, 1);
    super.maxEnemies = 4;

    super.R0 = 143; super.dR = 7;

    super.priceToBuy = 2500;
    super.priceToUpgrade = 1250;
  }

  lockThis(enemy) {
    projectiles.push(new projectile(this, enemy));
  }
}

class purpleTower extends tower {

  constructor(x, y) {
    super(x, y, 2);
    this.lockedEnemy = null;
    this.loadedCharge = 0;

    super.R0 = 95; super.dR = 5;

    super.priceToBuy = 300;
    super.priceToUpgrade = 150;
  }

  attackThis(enemy) {
    let context = myGameArea.context;
    if (this.charge==this.maxCharge) {
      this.charge = 0;
      this.loadedCharge = this.maxCharge;
      this.lockedEnemy = enemy;
    }
    if (this.loadedCharge>0 && enemy==this.lockedEnemy) {
      // draw the beam
      context.beginPath();
      context.moveTo(this.x+cellWidth/2, this.y+cellHeight/2);
      context.lineTo(enemy.x+cellWidth/2, enemy.y+cellHeight/2);
      context.closePath();
      context.lineWidth = 1 + 5*this.loadedCharge/this.maxCharge;
      context.strokeStyle = whiteColor;
      context.stroke();

      let dd = (enemy.x+enemy.y)%4+1;
      context.fillStyle = whiteColor;
      context.fillRect(enemy.x+cellWidth/2-dd, enemy.y+cellHeight/2-dd, 2*dd, 2*dd);
      context.fillStyle = whiteColor;
      context.fillRect(this.x+cellWidth/2-dd, this.y+cellHeight/2-dd, 2*dd, 2*dd);
      // slow down the vectoid
      enemy.pause = 1;
      // discharge the tower (faster than when it's charging)
      this.loadedCharge-=2;
      // hit the enemy with the charge
      return this.charge;
    } else {
      return 0;
    }
  }
}

class blueTower extends tower {

  constructor(x, y) {
    super(x, y, 3);

    super.priceToBuy = 300;
    super.priceToUpgrade = 150;
  }

  attackThis(enemy) {
    let context = myGameArea.context;
    // only work with full charge
    if (this.charge == this.maxCharge) {
      // draw the beam
      context.beginPath();
      context.moveTo(this.x+cellWidth/2, this.y+cellHeight/2);
      context.lineTo(enemy.x+cellWidth/2, enemy.y+cellHeight/2);
      context.closePath();
      context.lineWidth = 2;
      context.strokeStyle = whiteColor;
      context.stroke();

      let dd = (enemy.x+enemy.y)%4+1;
      context.fillStyle = whiteColor;
      context.fillRect(enemy.x+cellWidth/2-dd, enemy.y+cellHeight/2-dd, 2*dd, 2*dd);
      context.fillStyle = whiteColor;
      context.fillRect(this.x+cellWidth/2-dd, this.y+cellHeight/2-dd, 2*dd, 2*dd);
      // slow down the vectoid
      enemy.pause = 32;
      // completely discharge the tower
      this.charge = 0;
      // hit the enemy with mega charge
      return 32*this.power();
    } else {
      return 0;
    }
  }
}

class projectile {
  constructor(tower, target) {
    this.tower = tower;
    this.target = target;

    this.x = tower.x+cellWidth/2;
    this.y = tower.y+cellHeight/2
    this.valid = true;
  }

  update() {
    // see if the mother tower still exists
    if (!towers.includes(this.tower)) {
      this.valid = false;
      return;
    }
    // see if the target still exists
    if (!vectoids.includes(this.target)) {
      this.valid = false;
      return;
    }
    // move towards target
    let dx = this.target.x+cellWidth/2-this.x;
    let dy = this.target.y+cellHeight/2-this.y;
    let distance = Math.sqrt(Math.pow(dx,2) + Math.pow(dy,2));
    let dstep = 4;
    if (distance<dstep+1) {
      // target is hit
      let strike = 8*this.tower.power();
      if ((this.target.health-=strike/this.target.strength)<3) {
	// the enemy is dead
	bank += Math.floor(this.target.strength*vectoidPrice);
	vectoids.splice(vectoids.indexOf(this.target),1);
      }
      if (this.tower.enemies.includes(this.target)) {
	this.tower.enemies.splice(this.tower.enemies.indexOf(this.target),1);
      }
      // self-destroy
      this.valid = false;
      return;
    }
    // move closer
    this.x += dstep/distance*dx;
    this.y += dstep/distance*dy;
    // draw myself
    let context = myGameArea.context;
    let dd = 2;
    context.fillStyle = whiteColor;
    context.fillRect(this.x-dd, this.y-dd, 2*dd, 2*dd);
  }
}

function editGameBoard() {
  if (myGameArea.mouseEvent==1
      && offsetX<=myGameArea.x && myGameArea.x<=offsetX+nCellsX*cellWidth
      && offsetY<=myGameArea.y && myGameArea.y<=offsetY+nCellsY*cellHeight) {
    let i = Math.floor((myGameArea.x-offsetX)/cellWidth);
    let j = Math.floor((myGameArea.y-offsetY)/cellHeight);
    let k = j*nCellsX + i;
    // js strings are immutable, can't replace a character
    if (gameBoardCells[k]=="x") {
      gameBoardCells = gameBoardCells.substring(0,k) + "o" + gameBoardCells.substring(k+1);
    } else if (gameBoardCells[k]=="o") {
      gameBoardCells = gameBoardCells.substring(0,k) + "x" + gameBoardCells.substring(k+1);
    }
    myGameArea.mouseEvent = 0;
  }
}

function updateGameArea() {
  myGameArea.clear();
  if (editMode==1) editGameBoard();
  paintGameBoard();

  launchVectoids();

  for (let i = 0; i<buttons.length; i++) {
    buttons[i].update();
  }

  for (let i = 0; i<vectoids.length; i++) {
    vectoids[i].update();
  }

  for (let i = 0; i<towers.length; i++) {
    towers[i].update();
  }

  for (let i = 0; i<towers.length; i++) {
    towers[i].attack();
  }

  for (let i = 0; i<projectiles.length; i++) {
    projectiles[i].update();
  }

  // remove dead projectiles
  projectiles = projectiles.filter(function(p) { return p.valid; });

  if (selectedTower && myGameArea.mouseEvent==1) {
    // check if the player wants to place a new tower
    if (!selectedTower.isActive
	&& offsetX<=myGameArea.x && myGameArea.x<=offsetX+nCellsX*cellWidth
	&& offsetY<=myGameArea.y && myGameArea.y<=offsetY+nCellsY*cellHeight) {
      if (bank>=selectedTower.priceToBuy) {
	bank -= selectedTower.priceToBuy;
	let i = Math.floor((myGameArea.x-offsetX)/cellWidth);
	let j = Math.floor((myGameArea.y-offsetY)/cellHeight);
	let k = j*nCellsX + i;
	if (gameBoardCells[k]=="x") {
	  // yes, place a new tower
	  selectedTower.selected = 0;
	  selectedTower.draw();
	  let xt = offsetX + i*cellWidth;
	  let yt = offsetY+j*cellHeight;
	  let newTower = null;
	  // cloning objects in (older) JS is not trivial, so a hack here..
	  switch (selectedTower.towerType) {
	    case 0: newTower = new  greenTower(xt,yt); break;
	    case 1: newTower = new    redTower(xt,yt); break;
	    case 2: newTower = new purpleTower(xt,yt); break;
	    case 3: newTower = new   blueTower(xt,yt); break;
	  }
	  newTower.isActive = true;
	  newTower.draw();
	  towers.push(newTower);
	}
      }
    } else {
      // reset selected tower
      if (selectedTower) {
	selectedTower.selected = 0;
	selectedTower.draw();
      selectedTower = null;
      }
    }
  }

  // show information
  let context = myGameArea.context;
  let xt = 560;
  let yt = 130;
  context.font = "14px Arial";
  context.textAlign = "left";
  context.textBaseline = "top";
  context.fillStyle = blackColor;
  if (waveCount==0) {
    context.fillText("ready", xt, yt);
  } else {
    context.fillText("wave: "+waveCount.toString(), xt, yt);
  }
  yt += 20;
  context.fillText("lives: "+lives.toString(), xt, yt);
  yt += 20;
  context.fillText("bank: "+bank.toString(), xt, yt);
  if (selectedTower) {
    if (!selectedTower.isActive) {
      yt += 20;
      if (bank>=selectedTower.priceToBuy) {
	context.fillStyle = blackColor;
      } else {
	context.fillStyle = brightColor;
      }
      context.fillText("buy: "+selectedTower.priceToBuy.toString(), xt, yt);
    } else {
      yt += 20;
      context.fillText("sell: "+selectedTower.priceToSell().toString(), xt, yt);
      if (selectedTower.level<10) {
	yt += 20;
	if (bank>=selectedTower.priceToUpgrade) {
	  context.fillStyle = blackColor;
	} else {
	  context.fillStyle = brightColor;
	}
	context.fillText("upgrade: "+selectedTower.priceToUpgrade.toString(), xt, yt);
      }
    }
  }
}

function startGame() {
  createGameBoard();
  myGameArea.start();
}
