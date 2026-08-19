(() => {
  const gate = document.getElementById('auth-gate');
  const shell = document.getElementById('app-shell');
  const form = document.getElementById('login-form');
  const emailInput = document.getElementById('login-email');
  const passwordInput = document.getElementById('login-password');
  const loginButton = document.getElementById('login-button');
  const forgotButton = document.getElementById('forgot-password-button');
  const recoveryForm = document.getElementById('recovery-form');
  const newPasswordInput = document.getElementById('new-password');
  const confirmPasswordInput = document.getElementById('confirm-password');
  const recoveryButton = document.getElementById('recovery-button');
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
  let recoveryMode = window.location.hash.includes('type=recovery');

  function showRecoveryForm() {
    recoveryMode = true;
    setAuthenticated(false);
    form.hidden = true;
    recoveryForm.hidden = false;
    document.getElementById('auth-title').textContent = 'Crear nueva contraseña';
    setMessage('El enlace fue validado. Registre una contraseña nueva.', 'success');
    newPasswordInput.focus();
  }

  function showLoginForm() {
    recoveryMode = false;
    recoveryForm.hidden = true;
    form.hidden = false;
    document.getElementById('auth-title').textContent = 'Ingresar al SIMU';
  }

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

  forgotButton.addEventListener('click', async () => {
    const email = emailInput.value.trim();
    if (!email) {
      setMessage('Escriba primero su correo electrónico.', 'error');
      emailInput.focus();
      return;
    }
    forgotButton.disabled = true;
    setMessage('Solicitando el enlace de recuperación…');
    const { error } = await client.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}${window.location.pathname}`
    });
    forgotButton.disabled = false;
    if (error) {
      setMessage('No fue posible enviar el correo. Intente nuevamente en unos minutos.', 'error');
      return;
    }
    setMessage('Revise su correo y abra el enlace de recuperación.', 'success');
  });

  recoveryForm.addEventListener('submit', async event => {
    event.preventDefault();
    if (newPasswordInput.value !== confirmPasswordInput.value) {
      setMessage('Las contraseñas no coinciden.', 'error');
      return;
    }
    recoveryButton.disabled = true;
    setMessage('Actualizando contraseña…');
    const { error } = await client.auth.updateUser({ password: newPasswordInput.value });
    recoveryButton.disabled = false;
    if (error) {
      setMessage('No se pudo actualizar la contraseña. Solicite un nuevo enlace.', 'error');
      return;
    }
    await client.auth.signOut();
    newPasswordInput.value = '';
    confirmPasswordInput.value = '';
    window.history.replaceState({}, document.title, window.location.pathname);
    showLoginForm();
    setMessage('Contraseña actualizada. Ya puede iniciar sesión.', 'success');
    emailInput.focus();
  });

  logoutButton.addEventListener('click', async () => {
    await client.auth.signOut();
    setAuthenticated(false);
    emailInput.focus();
    setMessage('La sesión se cerró correctamente.');
  });

  client.auth.onAuthStateChange((event, session) => {
    if (event === 'PASSWORD_RECOVERY') {
      window.setTimeout(showRecoveryForm, 0);
      return;
    }
    if (!recoveryMode) window.setTimeout(() => openSession(session), 0);
  });

  client.auth.getSession().then(({ data }) => {
    if (!recoveryMode) openSession(data.session);
  });
})();
