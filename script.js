//Версия: 1.3.3 (23.11.2023)

const GBL = {
  version: 3,
  savekey: "gbl3save"
};

const variables = {};

function parse(str) {
  const arr = str.split("\n");
  
  const info = {};
  const rooms = {};
  
  let room;
  let javascript = "";
  
  for (let i = 0; i < arr.length; i++) {
    const l = arr[i];
    
    if (!room && l.match(/^#/)) {
      const n = l.match(/^# (.*)/);
      const v = l.match(/^#v (.*)/);
      const a = l.match(/^#a (.*)/);
      const r = l.match(/^#r (.*)/);
      const i = l.match(/^#i (.*)/);
      const f = l.match(/^#f (.*)/);
      const c = l.match(/^#c (.*)/);
      const m = l.match(/^#m (.*)/);
      
      if (n) info.name = n[1];
      if (v) info.version = v[1];
      if (a) info.author = a[1];
      if (r) info.released = r[1];
      if (i) info.idea = i[1];
      if (f) info.first = f[1];
      if (m) info.music = m[1];
      if (c) {
        if (!info.credits) info.credits = [];
        info.credits.push(c[1]);
      }
    } else if (l.match(/^! (.*)/)) {
      const s = l.match(/^! (.*)/)[1]+"\n";
      
      if (room) room.javascript += s
      else javascript += s;
    } else if (l.match(/^@ (.*)/)) {
      const n = l.match(/^@ (.*)/)[1];
      
      room = {
        id: n,
        javascript: "",
        text: "",
        options: []
      };
      
      rooms[n] = room;
    } else if (room && l.match(/^\* (.*): (.*)/)) {
      const o = l.match(/^\* (.*): (.*)/);
      
      room.options.push({
        text: o[1],
        room: o[2]
      });
    } else if (room && l.match(/^\$\$\$\$\$/)) {
      room = null;
    } else if (room && l.length && !l.match(/^\/\/.*/)) room.text += l+"\n";
  }
  
  info.first ??= Object.keys(rooms)[0];
  info.music ??= "default";
  
  return {
    info,
    rooms,
    javascript
  };
}

function parsestr(arg, text) {
  return text.replace(/{(.*?)}/g, (m, c) => {
    try {
      return eval(c);
    } catch (e) {
      error(`Ошибка: не удалось выполнить код ${c} (${e.message})`);
      return "{Ошибка}";
    }
  });
}

function parseargs(text) {
  const m = text.match(/\((.*)\)/);
  
  try {
    return m ? JSON.parse("["+m[1]+"]"):[];
  } catch (e) {
    error(`Ошибка: не удалось прочитать параметры "${m[1]}"`);
    return [];
  }
}

function parseopt(room) {
  const m = room.match(/(.*) (\(.*\))/);
  
  return m ? {
    room: m[1],
    args: parseargs(m[2])
  }:{
    room,
    args: []
  };
}

const name = document.getElementById('name');
const text = document.getElementById('text');
const options = document.getElementById('options');
const title = document.getElementById('title');
const errorp = document.getElementById('error');
const reloadbtn = document.getElementById('reload');
const initial = document.getElementById('initial');
const game = document.getElementById('game');
const statep = document.getElementById('state');

var obj, roomid, code, stats;

function state(str) {
  if (typeof str == "undefined") return statep.innerHTML;
  else statep.innerHTML = str;
}

function error(e) {
  if (!errorp.innerHTML) errorp.innerHTML = e;
}

function read(file) {
  const r = new FileReader();
  
  r.readAsText(file);
  
  r.onload = function() {
    code = r.result;
    
    start();
  };
}

function start(start = true) {
  initial.style.display = "none";
  game.style.display = "block";
  
  obj = parse(code);
  
  stats = {
    rooms: Object.keys(obj.rooms).length
  };
  
  name.innerHTML = obj.info.name;
  title.innerHTML = obj.info.name;
  
  const musics = [
    "battle",
    "battle2",
    "default",
    "desert",
    "maze",
    "fast",
    "slow",
    "fun",
    "fun2",
    "fun3"
  ];
  
  if (obj.info.music != "off") {
    const music = new Audio(musics.includes(obj.info.music) ? "assets/"+obj.info.music+".mp3":obj.info.music);
    
    music.loop = true;
    
    music.addEventListener("loadeddata", () => music.play());
  }
  
  try {
    eval(obj.javascript);
  } catch (e) {
    error(`Ошибка: не удалось выполнить код (${e.message})`);
  }
  
  if (start) {
    const opt = parseopt(obj.info.first);
    toroom(opt.room, opt.args);
  }
}

function toroom(id, arg) {
  const room = obj.rooms[id];
  
  if (!room) return void error(`Ошибка: комната «${id}» не существует`);
  
  roomid = id;
  
  text.innerHTML = parsestr(arg, room.text);
  
  try {
    eval(room.javascript);
  } catch (e) {
    error(`Ошибка: не удалось выполнить код комнаты «${id}» (${e.message})`);
  }
  
  options.innerHTML = "";
  
  for (let i = 0; i < room.options.length; i++) {
    const o = room.options[i];
    const div = document.createElement("div");
    const btn = document.createElement("button");
    
    div.className = "optiondiv";
    btn.className = "optionbtn";
    
    btn.innerHTML = parsestr(arg, o.text);
    
    btn.onclick = function() {
      const r = parseopt(parsestr(arg, o.room));
      
      toroom(r.room, r.args);
    };
    
    div.appendChild(btn);
    options.appendChild(div);
  }
}

function save() {
  const o = {
    roomid,
    variables,
    code
  };
  
  localStorage.setItem(GBL.savekey, JSON.stringify(o));
}

function reload() {
  try {
    const o = JSON.parse(localStorage.getItem(GBL.savekey));
    
    code = o.code;
    
    const keys = Object.keys(o.variables);
    const vals = Object.values(o.variables);
    
    for (let i = 0; i < keys.length; i++) variables[keys[i]] = vals[i];
    
    start();
    
    toroom(o.roomid);
  } catch (e) {
    error(`Ошибка: не удалось открыть сохранение (${e.message})`);
  }
}

if (localStorage.getItem(GBL.savekey)) reloadbtn.style.display = "block";