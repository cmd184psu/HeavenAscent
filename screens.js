/* WORLD LAYOUT
        
    7       b
	|       |
  8-3       5-c
     \     /
      1-0-2			7+8+9+a+b+c+d+e - 0 becomes f
	 /     \
  9-4       6-d
	|       |
    a       e
*/

function setupWorld(){
	data.world = [
		["8","<","3",">","7"," ","b","<","5",">","c"],
		[" "," ","^"," "," "," "," "," ","^"," "," "],
		[" "," ","1","<","<","0",">",">","2"," "," "],
		[" "," ","v"," "," "," "," "," ","v"," "," "],
		["9","<","4",">","a"," ","e","<","6",">","d"]
	];
		
	setupBosses();
	
	//we share one single room for all boss encounters, and just set a flag for which boss we're fighting / repopulate when necessary
	data.bossRoom = {
		layout: generateLayout({bossRoom:true}),
		start:{ x:data.tilesX/2*data.tileSize - data.tileSize/2, y:data.tileSize },
		dropDeath: true,
		inBossRoom: false,
		gameObjects:[]
	}
	data.bossRoom.player = new GameObject({symbol:"b",x:data.bossRoom.start.x,y:data.bossRoom.start.y,controlled:true,color:"p1"});
	
	data.maps = [];
	for (var y in data.world){
		data.maps[y] = [];
		for (var x in data.world[y]){
			data.maps[y][x] = generateMap(y,x);
		}
	}
	data.currentMap = {y:2,x:5}
}


function Map(model){
	this.start = model.start;
	this.dropDeath = model.dropDeath;
	this.screenDown = model.screenDown;
	this.screenUp = model.screenUp;
	this.screenLeft = model.screenLeft;
	this.screenRight = model.screenRight;
	this.layout = model.layout;
	this.gameObjects = model.gameObjects || [];
	this.player = model.player;
}


function generateMap(wY,wX){
	var mapType = data.world[wY][wX];
	
	//	BUILD MAP MODEL
	var start = { x:data.tilesX/2*data.tileSize - data.tileSize/2, y:data.tileSize };
	var model = {
		mapType: mapType,
		dropDeath: "^v1235".indexOf(mapType) < 0,
		start: start,
		gameObjects: [],
		player: new GameObject({symbol:"b",x:start.x,y:start.y,controlled:true,color:"p1"})
	}
	//set screenleft etc. based on mapType
	if ("<>0234567acd".indexOf(mapType) >= 0) model.screenLeft = function(){ switchMap(parseInt(wY), parseInt(wX)-1, "right") }
	if ("<>01345689be".indexOf(mapType) >= 0) model.screenRight = function(){ switchMap(parseInt(wY), parseInt(wX)+1, "left") }
	if ("^v1246".indexOf(mapType) >= 0) model.screenUp = function(){ switchMap(parseInt(wY)-1, parseInt(wX), "bottom") }
	if ("^v1235".indexOf(mapType) >= 0) model.screenDown = function(){ switchMap(parseInt(wY)+1, parseInt(wX), "top") }
	
	//	GENERATE LAYOUT FOR MAP
	model.layout = generateLayout(model);
	
	//	POPULATE GAME OBJECTS
	//stars
	var starSpawn = [];
	for (var x=1;x<data.tilesX-1;x++){
		for (var y=1;y<data.tilesY;y++){
			if (model.layout[y] && model.layout[y][x]) starSpawn.push({x:x,y:y});
		}
	}
	for (var i=0;i<5;i++){
		var spawn = starSpawn[Math.floor(Math.random()*starSpawn.length)];
		model.gameObjects.push(new GameObject({symbol:"★", x:spawn.x*data.tileSize, y:(spawn.y-2)*data.tileSize, color:"st"}))
	}
	//add enemies to every screen that's not the starting screen
	//add portals to portal rooms, plus an extra enemy
	if (mapType != "0"){
		model.gameObjects.push(new GameObject({symbol:"i",x:randBias(4)*canvas.width,y:canvas.height/2,ai:"imp",color:"e1",flight:true,maxDX:2,maxDY:2,enemy:true}))
	}
	if ("<>^v0".indexOf(mapType) < 0){
		model.gameObjects.push(new GameObject({symbol:"@",x:canvas.width/2-data.tileSize/2,y:Math.floor(data.tilesY/2)*data.tileSize,color:"pt",flight:true}))
		model.gameObjects.push(new GameObject({symbol:"i",x:randBias(4)*canvas.width,y:canvas.height/2,ai:"imp",color:"e1",flight:true,maxDX:2,maxDY:2,enemy:true}))
	}
	
	return new Map(model);
}
function generateLayout(m){
	var s = [];	
	for (var y=0; y<data.tilesY; y++) s.push([]);
	
	if (!m.bossRoom){
		switch (m.mapType){
			case "<":
				s = linear(s,true);
				break;
			case ">":
				s = linear(s);
				break;
			case "^":
			case "v":
				s = vertical(s);
				break;
			case "0":
				s[data.tilesY-7]  = [ , , , , , , , ,1,1,1,1, , , , , , , , ]
				s[data.tilesY-4]  = [ , , ,1,1,1,1, , , , , , ,1,1,1,1, , , ]
				s[data.tilesY-1]  = [1,1, , , , , , , , , , , , , , , , ,1,1]
				break;
			default:
				s = vertical(s);
		}	
		//draw boundaries (not down)
		for (var y=0; y<data.tilesY; y++){
			for (var x=0; x<data.tilesX; x++){
				if ((!m.screenUp && y==0) ||
					(!m.screenLeft && x==0) ||
					(!m.screenRight && x==data.tilesX-1)){
					s[y][x] = 1;
				}
			}
		}		
	} else {	//bossRoom
		s[data.tilesY-4]  = [ , , , , , , ,1,1,1,1,1,1, , , , , , , ]
	}
	return s;
}
function linear(s,r){
	var f = data.tilesY - 1;
	var t = 0;
	s[f][0] = 1
	s[f][data.tilesX-1] = 1;
	if (!r){
		for (var x=1; x<data.tilesX-1; x++){
			floorTiles(x);
		}
	} else {
		for (var x=data.tilesX-2; x>0; x--){
			floorTiles(x);
		}
	}
	return s;
	
	function floorTiles(x){
		var diff = Math.ceil(Math.random()*3);
		var dir = Math.random() > 0.5 ? 1 : -1;
		if (t*Math.random() > 1){
			if (f + diff*dir < data.tilesY && f + diff*dir > 2){
				f += diff*dir;
				t = 0;
			} else if (f - diff*dir < data.tilesY && f - diff*dir > 2){
				f -= diff*dir;
				t = 0;
			}
		}
		s[f][x] = 1;
		t++;
	}
}
function vertical(s){
	s[data.tilesY-1]  = [1,1,,,,,,,,,,,,,,,,,1,1]
	for (var i=1;i<=4;i++){
		var f = data.tilesY-1 - i*3;
		var platforms = Math.ceil(Math.random()*2);
		for (var j=0;j<platforms;j++){							//1			2
			var width = data.tilesX/platforms;					//20		10
			var startpoint = width*j;							//0			0, 10
			var calced = Math.floor(width*randBias(3+platforms) + startpoint);
			var platformWidth = Math.round(Math.random()*3+4-platforms);
			for (var k=Math.floor(platformWidth/-2);k<platformWidth/2;k++){
				s[f][calced+k] = 1;								//20/2+0	10/2+0, 10/2+10
			}
		}
	}
	return s;
}
//function generateVerticalPath(){
	
	//start at the bottom
	//generate jumpable platforms going upwards
	//stop at top, check pathable
	
//}
/*function generateRandomFloor(screen){
	screen[data.tilesY-1][0] = 1
	screen[data.tilesY-1][1] = 1
	screen[data.tilesY-1][data.tilesX-1] = 1;
	screen[data.tilesY-1][data.tilesX-2] = 1;
	for (var i=0;i<6;i++){
		var l = Math.floor(Math.random()*3) + 2;
		var y = Math.ceil(Math.random() * (data.tilesY-3) + 2)
		var x = Math.ceil(Math.random() * (data.tilesX-(5+l)) + 2)
		for (var j=0;j<l;j++){
			screen[y][x+j] = 1;
		}
	}
	return screen;
}*/


function switchMap(wY, wX, fromDir){
	var nm = data.maps[wY][wX];
	var p = getCurrentMap().player;
	var np = nm.player;
	
	if (fromDir == "left"){
		nm.start.x = 0-data.tileSize/2;
	} else if (fromDir == "right"){
		nm.start.x = (data.tilesX-0.5)*data.tileSize;
	} else {
		nm.start.x = p.x;
	}
	if (fromDir == "top"){
		nm.start.y = 0;
	} else if (fromDir == "bottom"){
		nm.start.y = (data.tilesY-1)*data.tileSize;
	} else {
		nm.start.y = p.y;
	}
	
	np = p;
	np.x = nm.start.x;
	np.y = nm.start.y;
	if (np.dashing) np.dashing.dashFrames = [];
	
	nm.player = np;
	data.currentMap = {y:wY,x:wX};
	resetParticles();
}