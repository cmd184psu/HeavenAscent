function load(){	
	var save = localStorage.getItem(data.lskey);
	if (save){
		var saveObj = JSON.parse(save);
		if (saveObj){
			saveObj = versionCheck(saveObj);
			data.version = saveObj.version;
			data.sound = saveObj.sound
			data.music = saveObj.music
			data.screenshake = saveObj.screenshake
			for (var unlock in saveObj.unlocks){
				data.unlocks[unlock].unlocked = saveObj.unlocks[unlock].unlocked;
			}
		}
		return saveObj;
	}
	return false;
}
function saveExists(){
	return !!localStorage.getItem(data.lskey);
}
function save(){
	var saveObj = {
		version: data.version,
		sound: data.sound,
		music: data.music,
		screenshake: data.screenshake,
		unlocks: data.unlocks,
	}
	localStorage.setItem(data.lskey, JSON.stringify(saveObj));
	return saveExists();
};
function clearSave(){
	if (confirm("Really delete save?")) localStorage.removeItem(data.lskey);
}
//function setOS13KTrophy(icon,trophyName,message){
	//if (icon && trophyName) localStorage['OS13kTrophy,'+icon+',Heaven Ascent,'+trophyName] = message;
//}
function versionCheck(saveObj){
	//v1.0 -> v1.1
	//	no updates needed
	
	saveObj.version = data.version;
	return saveObj;
}