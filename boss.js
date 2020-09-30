
function setupBosses(){
	data.bosses = {
		//tier1
		"1": { e:1,w1:5,w2:0,i:0,s:0 },
		"2": { e:3,w1:3,w2:0,i:0,s:0 },
		
		//tier2
		"3": { e:2,w1:5,w2:2,i:2,s:2 },	//1
		"4": { e:2,w1:7,w2:0,i:2,s:2 },	//1
		"5": { e:4,w1:3,w2:2,i:2,s:2 },	//2
		"6": { e:4,w1:6,w2:0,i:2,s:2 },	//2
		
		//tier3
		"7": { e:3,w1:6,w2:4,i:6,s:3 },	//3
		"8": { e:3,w1:5,w2:5,i:6,s:3 },	//3
		
		"9": { e:4,w1:8,w2:3,i:4,s:3 },	//4
		"a": { e:4,w1:7,w2:4,i:4,s:3 },	//4
		
		"b": { e:6,w1:6,w2:3,i:4,s:3 },	//5
		"c": { e:6,w1:5,w2:4,i:4,s:3 },	//5
		
		"d": { e:6,w1:7,w2:2,i:4,s:3 },	//6
		"e": { e:6,w1:6,w2:3,i:4,s:3 },	//6
		
		"0": { e:6,w1:8,w2:7,i:8,s:4 },	//final boss?
	}
	if (data.randBoss){
		for (var boss in data.bosses){
			data.bosses[boss].e = Math.ceil(Math.random()*4);
			data.bosses[boss].w1 = Math.ceil(Math.random()*8);
			data.bosses[boss].w2 = Math.ceil(Math.random()*7);
			data.bosses[boss].i = Math.floor(Math.random()*5);
		};
	}
}

function enterBoss(room){
	var br = data.bossRoom;
	var p = br.player;
	
	br.inBossRoom = room;		//teleport to boss room
	p.x = br.start.x;
	p.y = br.start.y;
	p.dx = 0;
	p.dy = 0;
	
	if (data.bosses[room].i) for (var i=0;i<data.bosses[room].i;i++) br.gameObjects.push(new GameObject({symbol:"i",x:Math.random()>0.5?0:canvas.width-data.tileSize,y:randBias(3)*canvas.height,ai:"imp",color:"e1",flight:true,maxDX:2,maxDY:2,enemy:true}))
	
	spawnBoss();
	
	br.roomCheck = function(room){
		if (!room.boss && !room.gameObjects.some(x => x.symbol === "@") && !room.gameObjects.some(x => x.symbol === "★")){
			room.gameObjects.push(new GameObject({symbol:"@",x:canvas.width/2 - data.tileSize/2,y:Math.floor(data.tilesY/2)*data.tileSize,color:"pt",flight:true}))
		}
	}
	
	if (diesIraeGenerated){
		stopMusic();
		playMusic("diesIrae",true);
	}
}
function leaveBoss(){
	if (data.finalBoss && data.bossRoom.inBossRoom === "0") switchScene("end");
	data.bossRoom.inBossRoom = false
	getCurrentMap().player.dx = data.bossRoom.player.dx;	//reset player momentum
	getCurrentMap().player.dy = data.bossRoom.player.dy;
	stopMusic();
	playMusic("mainTheme",true);
}








function Component(boss, model){
	this.id = Math.floor(Math.random()*1000);
	this.type = model.type;
	this.dirX = model.dirX || 0;
	this.dirY = model.dirY || 0;
	this.offset = model.offset;
	this.x = boss.x + model.offset.x * data.tileSize;
	this.y = boss.y + model.offset.y * data.tileSize;
	this.gameObjects = [];
}

function spawnBoss(){
	var br = data.bossRoom;
	
	//spawn global boss object
	var boss = {
		x: canvas.width/2-data.tileSize/2,
		y: -160,	//spawn above the player so the player has time to fall to the platform
		dx:0,
		dy:0,
		timer:Math.PI*50,
		cooldown:240,		//initial value while it arrives, it may get set to something else by the AI
		components:[],
		ai: bossAI,
		draw: function(boss){
			boss.components.forEach((c) => {
				if (c.type === "eye"){			//animate eye
					switch (Math.floor((data.timer+c.id)/10)%16){
						case 0:
						case 3:
							c.gameObjects[0].symbol = "e"
							break;
						case 1:
						case 2:
							c.gameObjects[0].symbol = "u";
							break;
						default:
							c.gameObjects[0].symbol = "o";
					}
				}
				if (c.type === "sword" && c.attacking){
					if (data.timer%4){
						ctx.fillStyle = getColor("p3");
						if (c.attacking > data.bossSwordFireTime){
							//spool up
							var f = (c.attacking - data.bossSwordFireTime)*3%data.bossSwordSpoolUp;	//3 loops
							var prop = (data.bossSwordSpoolUp-f)/data.bossSwordSpoolUp;
							var x = Math.floor(data.tileSize/8*prop)*4;
							var x1 = c.x + x
							var x2 = c.x + data.tileSize - 8 - x;
							ctx.fillRect(x1,0,4,canvas.height)
							ctx.fillRect(x2,0,4,canvas.height)
						} else {
							//fire
							ctx.fillRect(c.x,0,data.tileSize-4,canvas.height);
						}
					}
				}
				c.gameObjects.forEach(x => x.draw())
			});
		}
	}
	
	//generate components of boss (eyes, wings, swords, etc)
	var bData = data.bosses[br.inBossRoom];
	var tOff = 0;
	//eyes
	if (bData.e < 2){
		boss.components.push(new Component(boss, { type: "eye", offset: {x:0, y:0} }))
	} else {
		tOff++;
		for (i=0;i<bData.e;i++){
			boss.components.push(new Component(boss, { type: "eye", offset: {
				x:tOff*Math.cos((i/bData.e)*2*Math.PI),
				y:tOff*Math.sin((i/bData.e)*2*Math.PI)
			} }))
		}
	}
	tOff += 2;
	//wings
	for (i=(bData.w1-1)/-2;i<=(bData.w1-1)/2;i++){
		var x = tOff*Math.cos(i/(bData.w1+2)*Math.PI);
		var y = tOff*Math.sin(i/(bData.w1+2)*Math.PI);
		if (Math.sin(i/(bData.w1+2)*Math.PI) < Math.sin(Math.PI/-4)){
			boss.components.push(new Component(boss, { type: "wing3", dirX: 1, offset: { x:x, y:y } }))
			boss.components.push(new Component(boss, { type: "wing3", dirX:-1, offset: { x:x*-1, y:y } }))
		} else if (Math.sin(i/(bData.w1+2)*Math.PI) < Math.sin(Math.PI/4)){
			boss.components.push(new Component(boss, { type: "wing2", dirX: 1, offset: { x:x, y:y } }))
			boss.components.push(new Component(boss, { type: "wing2", dirX:-1, offset: { x:x*-1, y:y } }))
		} else {
			boss.components.push(new Component(boss, { type: "wing1", dirX: 1, dirY:1, offset: { x:x, y:y } }))
			boss.components.push(new Component(boss, { type: "wing1", dirX:-1, dirY:1, offset: { x:x*-1, y:y } }))
		}
	}
	tOff += 2;
	for (i=(bData.w2-1)/-2;i<=(bData.w2-1)/2;i++){
		var x = tOff*Math.cos(i/(bData.w2+2)*Math.PI);
		var y = tOff*Math.sin(i/(bData.w2+2)*Math.PI);
		if (Math.sin(i/(bData.w1+2)*Math.PI) < Math.sin(Math.PI/-4)){
			boss.components.push(new Component(boss, { type: "wing3", dirX: 1, offset: { x:x, y:y } }))
			boss.components.push(new Component(boss, { type: "wing3", dirX:-1, offset: { x:x*-1, y:y } }))
		} else if (Math.sin(i/(bData.w1+2)*Math.PI) < Math.sin(Math.PI/4)){
			boss.components.push(new Component(boss, { type: "wing2", dirX: 1, offset: { x:x, y:y } }))
			boss.components.push(new Component(boss, { type: "wing2", dirX:-1, offset: { x:x*-1, y:y } }))
		} else {
			boss.components.push(new Component(boss, { type: "wing1", dirX: 1, dirY:1, offset: { x:x, y:y } }))
			boss.components.push(new Component(boss, { type: "wing1", dirX:-1, dirY:1, offset: { x:x*-1, y:y } }))
		}
	}
	
	//swords
	for (i=0;i<bData.s;i++){
		var x = (i - (bData.s-1)/2)*2;
		var y = 1;
		boss.components.push(new Component(boss, { type: "sword", offset: { x:x, y:y } }))
	}
	
	
	//spawn child gameObjects for each component - only these objects are actually drawn to the screen
	boss.components.forEach((c) => {
		var model = {
			font:"boss",
			x: boss.x+c.offset.x*data.tileSize,
			y: boss.y+c.offset.y*data.tileSize,
			color:"e1",
			flight:true,
			maxDX:2,
			maxDY:2,
			enemy:true
		}
		switch (c.type){
			case "eye":
				model.symbol = "o";
				c.gameObjects.push(new GameObject(model));
				break;
			case "wing1":
				model.facing = c.dirX*-1;
				model.symbol = "r";
				c.gameObjects.push(new GameObject(model));
				model.symbol = "l";
				model.y += c.dirY*data.tileSize;	//currently these wings always point downwards
				c.gameObjects.push(new GameObject(model));
				break;
			case "wing2":
				model.facing = c.dirX*-1;
				model.symbol = "-";
				c.gameObjects.push(new GameObject(model));
				model.symbol = "/";
				model.x += c.dirX*data.tileSize;
				c.gameObjects.push(new GameObject(model));
				break;
			case "wing3":
				model.facing = c.dirX*-1;
				model.symbol = "_";
				c.gameObjects.push(new GameObject(model));
				model.symbol = "=";
				model.x += c.dirX*data.tileSize;
				c.gameObjects.push(new GameObject(model));
				break;
			case "sword":
				model.symbol = "h";
				c.gameObjects.push(new GameObject(model));
				model.symbol = "b";
				model.y += data.tileSize;
				c.gameObjects.push(new GameObject(model));
				model.symbol = "t";
				model.y += data.tileSize;
				c.gameObjects.push(new GameObject(model));
			
		}
	})
	
	data.bossRoom.boss = boss;
}

function bossAI(boss){
	//boss AI
	if (!boss.components.some(x => x.type === "eye")) return data.bossRoom.boss = false;
	
	boss.timer++;
	if (boss.cooldown) boss.cooldown--;
	if (!boss.cooldown){
		if (boss.components.some(x => x.type === "sword")){
			var sword = chooseRandom(boss.components.filter(x => x.type === "sword"));
			sword.attacking = data.bossSwordSpoolUp + data.bossSwordFireTime;
			sword.gameObjects.forEach(x => x.invulnerable = true);
		}
		boss.cooldown = 60*5;	//5 seconds
	}
	
	//global boss movement
	var target = {
		x: canvas.width/2 + Math.sin(boss.timer/100)*400,
		y: 160 + Math.cos(boss.timer/50)*300
	}
	var gdx = (boss.x < target.x) ? 1 : -1;
	var gdy = (boss.y < target.y) ? 1 : -1;
	boss.x += gdx
	boss.y += gdy
	
	//component AI
	//	move in formation relative to boss + some jiggle
	boss.components.forEach(c => {
		//objects always cull
		c.gameObjects.forEach(o => {
			if (o.cull) c.cull = true;
		});
		if (c.cull && !data.finalBoss) data.bossRoom.gameObjects.push(new GameObject({symbol:"★",x:c.x,y:c.y,color:"st"}))
		
		//then handle attacking
		if (c.attacking){
			if (c.attacking <= data.bossSwordFireTime){
				//sword deals damage
				var p = data.bossRoom.player;
				if (p.x < c.x+data.tileSize && p.x+data.tileSize-4 > c.x){
					damage(p,1);
					p.iFrames = data.iFrames;
				}
			}
			c.attacking--;
			if (!c.attacking) c.gameObjects.forEach( x => x.invulnerable = false );		//unset invulnerability when attack is over
			return;	//component does not move while attacking
		}
		
		//lastly handle movement and update child gameObjects
		var targetX = c.offset.x * data.tileSize + boss.x;
		var targetY = c.offset.y * data.tileSize + boss.y;
		var cdx = c.x === targetX ? 0 : (targetX-c.x)/Math.abs(targetX-c.x);
		var cdy = c.y === targetY ? 0 : (targetY-c.y)/Math.abs(targetY-c.y);
		c.x += gdx + cdx;
		c.y += gdy + cdy;
		c.gameObjects.forEach(o => {
			o.x += gdx + cdx;			//movement matches global + component movement
			o.y += gdy + cdy;
		})
	})
}