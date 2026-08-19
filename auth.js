(() => {
  const gate = document.getElementById('auth-gate');
  const shell = document.getElementById('app-shell');
  const form = document.getElementById('login-form');
  const emailInput = document.getElementById('login-email');
  const passwordInput = document.getElementById('login-password');
  const loginButton = document.getElementById('login-button');
  const logoutButton = document.getElementById('logout-button');
  const message = document.getElementById('auth-message');
  const userName = document.getElementById('session-user-name');
  const userRole = document.getElementById('session-user-role');
  const config = window.SIMU_SUPABASE_CONFIG;

  const roleLabels = {
    comandante: 'Comandante · Consulta',
    jefe_plana_mayor: 'Jefe de la Plana Mayor · Consulta',
    g1: 'Administrador G-1',
    auxiliar_g1: 'Auxiliar G-1',
    personal: 'Portal del personal'
  };

  function setMessage(text, type = '') {
    message.textContent = text;
    message.className = `auth-message ${type}`.trim();
  }

  function setAuthenticated(active) {
    document.body.classList.toggle('authenticated', active);
    gate.setAttribute('aria-hidden', String(active));
    shell.setAttribute('aria-hidden', String(!active));
  }

  if (!config || !config.url || !config.publishableKey || !config.publishableKey.startsWith('sb_publishable_')) {
    setMessage('La configuración pública de Supabase no está disponible.', 'error');
    loginButton.disabled = true;
    return;
  }

  if (!window.supabase || typeof window.supabase.createClient !== 'function') {
    setMessage('No fue posible cargar el servicio de autenticación. Verifique la conexión a Internet.', 'error');
    loginButton.disabled = true;
    return;
  }

  const client = window.supabase.createClient(config.url, config.publishableKey, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
  });
  window.simuSupabase = client;

  async function openSession(session) {
    if (!session?.user) {
      setAuthenticated(false);
      return;
    }

    const { data: profile, error } = await client
      .from('perfiles')
      .select('nombre_visible, rol, activo')
      .eq('id', session.user.id)
      .maybeSingle();

    if (error || !profile) {
      await client.auth.signOut();
      setAuthenticated(false);
      setMessage('El usuario no tiene un perfil habilitado en el SIMU.', 'error');
      return;
    }

    if (!profile.activo) {
      await client.auth.signOut();
      setAuthenticated(false);
      setMessage('El perfil se encuentra deshabilitado. Consulte al administrador G-1.', 'error');
      return;
    }

    userName.textContent = profile.nombre_visible || session.user.email;
    userRole.textContent = roleLabels[profile.rol] || profile.rol;
    setAuthenticated(true);
    setMessage('Sesión autorizada.', 'success');
    passwordInput.value = '';
  }

  form.addEventListener('submit', async event => {
    event.preventDefault();
    loginButton.disabled = true;
    setMessage('Verificando credenciales…');

    const { data, error } = await client.auth.signInWithPassword({
      email: emailInput.value.trim(),
      password: passwordInput.value
    });

    if (error) {
      setMessage('Correo o contraseña incorrectos.', 'error');
      loginButton.disabled = false;
      return;
    }

    await openSession(data.session);
    loginButton.disabled = false;
  });

  logoutButton.addEventListener('click', async () => {
    await client.auth.signOut();
    setAuthenticated(false);
    emailInput.focus();
    setMessage('La sesión se cerró correctamente.');
  });

  client.auth.onAuthStateChange((_event, session) => {
    window.setTimeout(() => openSession(session), 0);
  });

  client.auth.getSession().then(({ data }) => openSession(data.session));
})();
