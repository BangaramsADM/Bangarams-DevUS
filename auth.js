// auth.js — Bangarams User Authentication (client-side prototype)
// For production, replace with server-side auth and hashed passwords.

const AUTH = (() => {
  const STORE = 'bg_users_v1';
  const SESS  = 'bg_sess';

  const ROLES = {
    site_admin:      { label:'Site Admin',        color:'#C8973F', bg:'rgba(200,151,63,0.18)' },
    artisan_ramouji: { label:'Artisan · Ramouji', color:'#A8B4BC', bg:'rgba(168,180,188,0.14)' },
    artisan_kira:    { label:'Artisan · Kira',    color:'#B8C8D8', bg:'rgba(184,200,216,0.14)' },
    support:         { label:'Support',            color:'#7FB069', bg:'rgba(127,176,105,0.14)' },
    sales:           { label:'Sales',              color:'#9B72CF', bg:'rgba(155,114,207,0.14)' },
  };

  // Default accounts — hashed on first init, plain text never stored
  const DEFAULTS = [
    { id:'1', name:'Site Administrator', email:'admin@bangarams.com',   username:'admin',   role:'site_admin',      pwd:'Admin@Bangarams2025' },
    { id:'2', name:'Ramouji',            email:'ramouji@bangarams.com', username:'ramouji', role:'artisan_ramouji', pwd:'Ramouji@Bangarams25' },
    { id:'3', name:'Kira',               email:'kira@bangarams.com',    username:'kira',    role:'artisan_kira',    pwd:'Kira@Bangarams2025'  },
    { id:'4', name:'Support Team',       email:'support@bangarams.com', username:'support', role:'support',         pwd:'Support@Bangarams25' },
    { id:'5', name:'Sales Team',         email:'sales@bangarams.com',   username:'sales',   role:'sales',           pwd:'Sales@Bangarams2025' },
  ];

  async function sha256(str) {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
    return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2,'0')).join('');
  }

  function getUsers() { return JSON.parse(localStorage.getItem(STORE) || '[]'); }
  function saveUsers(u) { localStorage.setItem(STORE, JSON.stringify(u)); }

  async function init() {
    if (localStorage.getItem(STORE)) return;
    const users = await Promise.all(DEFAULTS.map(async d => ({
      id: d.id, name: d.name, email: d.email, username: d.username, role: d.role,
      pwdHash: await sha256(d.pwd), active: true,
      created: new Date().toISOString(), lastLogin: null, mustReset: false
    })));
    saveUsers(users);
  }

  async function login(identifier, pwd) {
    await init();
    const users = getUsers();
    const hash  = await sha256(pwd);
    const u = users.find(u =>
      (u.username === identifier || u.email === identifier) &&
      u.pwdHash === hash && u.active
    );
    if (!u) return null;
    u.lastLogin = new Date().toISOString();
    saveUsers(users);
    const sess = { id:u.id, name:u.name, role:u.role, email:u.email, username:u.username, mustReset:u.mustReset };
    sessionStorage.setItem(SESS, JSON.stringify(sess));
    return sess;
  }

  function logout() {
    sessionStorage.removeItem(SESS);
    window.location.href = 'login.html';
  }

  function session() { return JSON.parse(sessionStorage.getItem(SESS) || 'null'); }

  function requireAuth(roles) {
    const s = session();
    if (!s) { window.location.href = 'login.html'; return null; }
    if (roles && !roles.includes(s.role)) { window.location.href = 'index.html'; return null; }
    return s;
  }

  async function changePassword(userId, newPwd) {
    const users = getUsers();
    const u = users.find(u => u.id === userId);
    if (!u) return false;
    u.pwdHash  = await sha256(newPwd);
    u.mustReset = false;
    saveUsers(users);
    const s = session();
    if (s && s.id === userId) { s.mustReset = false; sessionStorage.setItem(SESS, JSON.stringify(s)); }
    return true;
  }

  function genTempPwd() {
    const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#';
    return [...crypto.getRandomValues(new Uint8Array(12))].map(b => chars[b % chars.length]).join('');
  }

  async function resetPassword(userId) {
    const tmp   = genTempPwd();
    const users = getUsers();
    const u     = users.find(u => u.id === userId);
    if (!u) return null;
    u.pwdHash  = await sha256(tmp);
    u.mustReset = true;
    saveUsers(users);
    return tmp;
  }

  async function addUser(data) {
    await init();
    const users  = getUsers();
    const tmp    = genTempPwd();
    const id     = String(Date.now());
    users.push({
      id, name:data.name, email:data.email, username:data.username, role:data.role,
      pwdHash: await sha256(tmp), active:true,
      created: new Date().toISOString(), lastLogin:null, mustReset:true
    });
    saveUsers(users);
    return { id, tempPwd: tmp };
  }

  function updateUser(id, data) {
    const users = getUsers();
    const idx   = users.findIndex(u => u.id === id);
    if (idx < 0) return false;
    users[idx]  = { ...users[idx], ...data };
    saveUsers(users);
    return true;
  }

  function deleteUser(id) { saveUsers(getUsers().filter(u => u.id !== id)); }

  return { init, login, logout, session, requireAuth, changePassword, resetPassword,
           addUser, updateUser, deleteUser, getUsers, ROLES };
})();

AUTH.init(); // warm up on every page load
