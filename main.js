
	setup();

function setup(){	
	load();		//NB: ensure this is always called after initialising the data object
	
	window.canvas = document.getElementById("canvas")
	window.ctx = canvas.getContext("2d");
	canvas.width = data.tileSize*data.tilesX;
	canvas.height = data.tileSize*data.tilesY;
	
	registerFontFunctions(ctx);
	registerFonts(ctx);
	
	defineSounds();
	setupData();
	setupMenus();
	resetParticles();
	
	document.body.onkeydown = function(evt){
		if (!evt.repeat){
			data.keys[evt.code] = true;
			handleKeyPress(evt);
		}
	}
	document.body.onkeyup = function(evt){
		data.keys[evt.code] = false;
	}
	
	gameLoop();
}

function gameLoop(){
	window.requestAnimationFrame(gameLoop);
    var currentTime = (new Date()).getTime();
    var delta = currentTime - data.lastTime;
    if (delta > data.INTERVAL) {
	
		//do loop
		data.timer++;
		if (!window.musicGenerated) checkMusicGenerated();
		handleScene();
	
		data.lastTime = currentTime - (delta % data.INTERVAL);
	}
}
function handleScene(){
	switch(data.scene){
		case "game":
			if (data.hitstop) return data.hitstop--;	//freeze frames eg. on hitting an enemy
			//logic
			handleObjects();
			cullObjects();
			checkGameState();
			//draw
			clear();
			ctx.save();
			handleScreenShake();
			drawBG();
			drawMap();
			drawObjects();
			ctx.restore();	//restore before drawing the UI since it's unaffected by screenshake
			drawUI();
			break;
		case "end":
			drawEnd();
			break;
		case "death":
		case "title":
		case "mainmenu":
		case "secretmenu":
			clear();
			drawMenu(data.scene);
			break;
		case "credits":
			drawCredits();
	}
}

function handleObjects(){
	var m = getCurrentMap();
	if (m.roomCheck) m.roomCheck(m);
	m.gameObjects.forEach(x => x.update());
	if (data.bossRoom.boss) data.bossRoom.boss.ai(data.bossRoom.boss);
	m.player.update();
}

function cullObjects(){
	var m = getCurrentMap();
	m.gameObjects = m.gameObjects.filter(x => !x.cull);
	if (data.bossRoom.boss) data.bossRoom.boss.components = data.bossRoom.boss.components.filter(x => !x.cull);
}







	//	GAME STATE

function checkGameState(){
	if (data.life <= 0){
		switchScene("death");
		data.menus.prestige.selected = 0;
		data.menus.prestige.update(0);
	}
	if (data.score >= 404 && !data.maps[2][5].gameObjects.some(x => x.symbol === "@") && !data.finalBoss){
		data.finalBoss = true;
		data.maps[2][5].gameObjects.push(new GameObject({symbol:"@",x:canvas.width/2-data.tileSize/2,y:6*data.tileSize,color:"st",flight:true}))
	}
}
function startGame(){	
	setupData();
	switchScene("game");
	stopMusic();
	setVolume(data.music/10);
	playMusic("mainTheme",true);
}
function resetGame(){
	if (saveExists()) return confirm("Are you sure you wish to reset your progress?");
	return true;
}
function switchScene(to, k){
	if (!k) data.previousScene = data.scene + "";
	data.scene = to;
}









	//	DRAWING
function getColor(c){
	return data.palettes[data.palette][c];
}

function clear(){
	ctx.fillStyle = getColor("bg") //"black";
	ctx.fillRect(0,0,canvas.width,canvas.height);
}
function handleScreenShake(){
	if (data.screenShake){
		ctx.translate(Math.round(Math.sin(data.screenShake)*data.screenShake), Math.round(Math.cos(data.screenShake)*data.screenShake/2));	//round to stop subpixel artifacting
		data.screenShake--;
	}
}
function Particle(y){
	this.x = Math.floor(Math.random()*canvas.width/4)*4
	this.y = y || Math.random()*canvas.height
	this.w = (Math.random()/2 + 0.5)*1.5
	this.s = Math.round(Math.random()*3)*4
}
function resetParticles(){
	data.particles = [];
	for (var i=0;i<20;i++) data.particles.push(new Particle());
}
function drawBG(){
	var grd = ctx.createLinearGradient(0, 0, 0, canvas.height);
	grd.addColorStop(0, getColor("bg"));
	grd.addColorStop(1, data.bossRoom.inBossRoom ? getColor("e1") : getColor("fg"));
	ctx.fillStyle = grd;
	
	data.particles.forEach((p) => {
		p.y -= p.w
		if (p.y < 0){ p.y += canvas.height }
		ctx.fillRect(p.x,p.y,p.s,p.s);
	});
}
function drawMap(){
	var m = getCurrentMap();
	ctx.fillStyle = getColor("fg") //"white";
	ctx.fonts.current = "gameObjects";
	if (m.dropDeath){
		for (var i=0;i<data.tilesX;i++){
			ctx.drawFont("^",i*data.tileSize,canvas.height-data.tileSize,4);
		}
	}
	for (var y in m.layout){
		for (var x in m.layout[y]){		
			ctx.fillRect(x*data.tileSize,y*data.tileSize,data.tileSize,data.tileSize)
		}
	}
}
function drawObjects(){
	var m = getCurrentMap();
	m.gameObjects.forEach(x => x.draw());
	if (data.bossRoom.boss) data.bossRoom.boss.draw(data.bossRoom.boss);
	m.player.draw();
}
function drawUI(){
	ctx.strokeStyle = getColor("fg"); //"white";
	ctx.lineWidth = 4;
	ctx.fonts.current = "alphanumeric";
	
	ctx.save();
	ctx.translate(canvas.width-(data.tileSize+ctx.lineWidth),data.tileSize+ctx.lineWidth);
	var scorechars = data.score.toString().length + 4;
	ctx.fillStyle = getColor("bgt");
	ctx.fillRect(-1*scorechars*6*4 - 24, 4, scorechars*6*4 + 20, 7*4 + 16);
	ctx.strokeRect(-1*scorechars*6*4 - 24, 4, scorechars*6*4 + 20, 7*4 + 16);
	ctx.fillStyle = getColor("fg");
	ctx.drawFontRight(data.score + "/404", -8, 12, 4);
	ctx.restore();
	
	ctx.save()
	ctx.translate(data.tileSize+ctx.lineWidth,data.tileSize+ctx.lineWidth);
	var lifechars = 2 + data.life.toString().length;
	ctx.fillStyle = getColor("bgt");
	ctx.fillRect(4, 4, lifechars*6*4 + 16, 7*4 + 16);
	ctx.strokeRect(4, 4, lifechars*6*4 + 16, 7*4 + 16);
	ctx.fillStyle = getColor("fg");
	ctx.drawFont("  "+data.life, 12, 12, 4)
	ctx.fillStyle = getColor("ht"); //"red";
	ctx.drawFont("♥", 12, 12, 4)
	ctx.restore();
	
	if (!data.finalBoss){
		if (data.world[data.currentMap.y][data.currentMap.x] === "0"){
			//tutorial
			ctx.fillStyle = getColor("fg");
			var x = canvas.width/4;
			ctx.drawFontCenter("move", x, data.tileSize*3.5, 4)
			ctx.drawFontCenter(" ↑ ",  x, data.tileSize*4.5, 4)
			ctx.drawFontCenter("←↓→",  x, data.tileSize*5.5, 4)
			x += canvas.width/2;
			ctx.drawFontCenter("attack", x, data.tileSize*3.5, 4)
			ctx.drawFontCenter("x", x, data.tileSize*5.5, 4)
			if (data.unlocks.dash.unlocked){
				x -= canvas.width/4;
				ctx.drawFontCenter("dash", x, data.tileSize*3.5, 4)
				ctx.drawFontCenter("z", x, data.tileSize*5.5, 4)
			}
		}
	}
}

function drawEnd(){
	clear();
	drawBG();
	ctx.fillStyle = getColor("fg");
	ctx.drawFontCenter("And at the throne of heaven",canvas.width/2,data.tileSize*2,2);
	ctx.drawFontCenter("she stood triumphant",canvas.width/2,data.tileSize*3,2);
	
	ctx.drawFontCenter("Upon her brow, a crown of four hundred and four",canvas.width/2,data.tileSize*5,2);
	ctx.drawFontCenter("stars shining brighter than the heavens",canvas.width/2,data.tileSize*6,2);
	
	ctx.drawFontCenter("In her right hand, the stolen flaming sword",canvas.width/2,data.tileSize*8,2);
	ctx.drawFontCenter("that cast all before her into darkness",canvas.width/2,data.tileSize*9,2);
	
	ctx.drawFontCenter("And on her lips, a single phrase...",canvas.width/2,data.tileSize*11,2);
	ctx.drawFontCenter("\"God is thy law, but thou not mine.\"",canvas.width/2,data.tileSize*12,2);
}
function drawCredits(){
	var c1 = canvas.width*2/7;
	var c2 = canvas.width*5/7;
	
	clear();
	drawBG();
	
	ctx.fillStyle = getColor("p3");
	ctx.drawFontCenter("Code & Design", canvas.width/2, data.tileSize*1.5, 2);
	ctx.drawFontCenter("Special Thanks", c1, data.tileSize*5, 2);
	ctx.drawFontCenter("Patrons", c2, data.tileSize*5, 2)
	
	ctx.fillStyle = getColor("fg");
	ctx.drawFontCenter("Katherine Stark", canvas.width/2, data.tileSize*2.5, 3);
	ctx.drawFontCenter("@dhmstark", canvas.width/2, data.tileSize*3.5, 2);
	
	ctx.drawFontCenter("Frank Force", c1, data.tileSize*6, 3);
	ctx.drawFontCenter("ZZFX SFX System", c1, data.tileSize*7, 2);
	ctx.drawFontCenter("Marcus Geelnard", c1, data.tileSize*8, 3);
	ctx.drawFontCenter("Soundbox Music Player", c1, data.tileSize*9, 2);
	ctx.drawFontCenter("Jake Gordon", c1, data.tileSize*10, 3);
	ctx.drawFontCenter("Tiny Collision Algorithm", c1, data.tileSize*11, 2);
	
	
	var patronTier1 = ["Guy Patching","Racheet Dave"]
	var patronTier2 = ["4MinuteWarning", "Amy Allen", "Aquarion", "Azurit", "Jonathan Hogg", "Susan", "Susannah Cooke"]
	for (var y=0; y<patronTier1.length; y++){
		var p = patronTier1[y];
		ctx.drawFontCenter(p, c2, data.tileSize*(6+y), 3)
	}
	for (var y=0; y<patronTier2.length; y++){
		var p = patronTier2[y];
		ctx.drawFontCenter(p, c2, data.tileSize*(6+(y*0.75)+patronTier1.length), 2)
	}
}





function handleKeyPress(evt){
	if (data.scene == "title" && data.startable){
		switch (evt.code){
			case "ArrowUp":
				data.menus.title.update(-1);
				break;
			case "ArrowDown":
				data.menus.title.update(1);
				break;
			case "Escape":
				switchScene("mainmenu");
				break;
			case "Enter":
				data.menus.title.options[data.menus.title.selected].onSelect();
		}
		return false;
	}
	if (data.scene == "mainmenu"){
		var o = data.menus.main.options[data.menus.main.selected];
		switch (evt.code){
			case "ArrowUp":
				data.menus.main.update(-1);
				break;
			case "ArrowDown":
				data.menus.main.update(1);
				break;
			case "ArrowLeft":
				if (o.left && o.left(o)) o.onLeft(o);
				break;
			case "ArrowRight":
				if (o.right && o.right(o)) o.onRight(o);
				break;
			case "Escape":
				switchScene(data.previousScene);
				break;
			case "Enter":
				o.onSelect();
		}
		return false;
	}
	if (data.scene == "secretmenu"){
		var o = data.menus.secret.options[data.menus.secret.selected];
		switch (evt.code){
			case "ArrowUp":
				data.menus.secret.update(-1);
				break;
			case "ArrowDown":
				data.menus.secret.update(1);
				break;
			case "ArrowLeft":
				if (o.left && o.left(o)) o.onLeft(o);
				break;
			case "ArrowRight":
				if (o.right && o.right(o)) o.onRight(o);
				break;
			case "Escape":
				switchScene("mainmenu",true);
		}
		return false;
	}
	if (data.scene == "death"){
		var o = data.menus.prestige.options[data.menus.prestige.selected]
		switch (evt.code){
			case "ArrowUp":
				data.menus.prestige.update(-1);
				break;
			case "ArrowDown":
				data.menus.prestige.update(1);
				break;
			case "Enter":
				o.onSelect(o.optionData ? data.unlocks[o.optionData.id] : false);
				data.menus.prestige.update(0);
		}
	}
	switch (evt.code){
		case "Escape":		//scene switching
			switch (data.scene){
				case "game":
				case "death":
				case "credits":
					switchScene("mainmenu");
					break;
				case "mainmenu":
					switchScene(data.previousScene);
					break;
				case "end":
					switchScene("title");
					data.finalBoss = false;
			}
			break;
	}
}


/* ------------------------------------------------ */

	// UTILITY FUNCTIONS

function getObjArr(){
	var objArr = getCurrentMap().gameObjects;	//potentially add the m.player here if we're checking a non-player object
	if (data.bossRoom.boss) data.bossRoom.boss.components.forEach((c) => { objArr = objArr.concat(c.gameObjects) });
	return objArr;
}
function getCurrentMap(){	
	if (data.bossRoom.inBossRoom) return data.bossRoom;
	return data.maps[data.currentMap.y][data.currentMap.x];
}
function randBias(x){
	var t = 0;
	for (var i=0;i<x;i++) t += Math.random();
	return t/x;
}
function chooseRandom(arr){
	return arr[Math.floor(arr.length*Math.random())]
}