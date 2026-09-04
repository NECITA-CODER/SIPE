(() => {
  const gate = document.getElementById('auth-gate');
  const shell = document.getElementById('app-shell');
  const form = document.getElementById('login-form');
  const emailInput = document.getElementById('login-email');
  const passwordInput = document.getElementById('login-password');
  const loginButton = document.getElementById('login-button');
  const forgotButton = document.getElementById('forgot-password-button');
  const visitorButton = document.getElementById('visitor-login-button');
  const recoveryForm = document.getElementById('recovery-form');
  const newPasswordInput = document.getElementById('new-password');
  const confirmPasswordInput = document.getElementById('confirm-password');
  const recoveryButton = document.getElementById('recovery-button');
  const logoutButton = document.getElementById('logout-button');
  const message = document.getElementById('auth-message');
  const userName = document.getElementById('session-user-name');
  const userRole = document.getElementById('session-user-role');
  const config = window.SIMU_SUPABASE_CONFIG;
  const visitorSessionKey = 'simu_visitor_session';

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

  function describeAuthError(error) {
    const code = String(error?.code || '').toLowerCase();
    const detail = String(error?.message || '').toLowerCase();
    const status = Number(error?.status || 0);

    if (code.includes('invalid_credentials') || detail.includes('invalid login credentials')) {
      return 'Supabase rechazó las credenciales (invalid_credentials). El usuario existe, pero la contraseña registrada no coincide.';
    }
    if (code.includes('email_not_confirmed') || detail.includes('email not confirmed')) {
      return 'El correo del usuario todavía no está confirmado (email_not_confirmed).';
    }
    if (status === 429 || code.includes('over_request_rate_limit') || detail.includes('rate limit')) {
      return 'Supabase bloqueó temporalmente nuevos intentos por exceso de solicitudes. Espere antes de reintentar.';
    }
    if (detail.includes('failed to fetch') || detail.includes('network') || detail.includes('load failed')) {
      return 'El navegador no pudo comunicarse con Supabase. Revise la conexión o el bloqueo del navegador.';
    }
    if (detail.includes('api key') || detail.includes('jwt')) {
      return 'Supabase rechazó la clave pública de conexión. Se debe revisar la configuración del proyecto.';
    }
    return `Acceso rechazado por Supabase (${code || status || 'sin código'}).`;
  }

  function setAuthenticated(active) {
    document.body.classList.toggle('authenticated', active);
    gate.setAttribute('aria-hidden', String(active));
    shell.setAttribute('aria-hidden', String(!active));
  }

  function openVisitorSession() {
    sessionStorage.setItem(visitorSessionKey, 'active');
    userName.textContent = 'Usuario visitante';
    userRole.textContent = 'Visitante · Acceso demostrativo';
    document.body.dataset.userRole = 'g1';
    document.body.dataset.accessMode = 'visitor';
    setAuthenticated(true);
    setMessage('Acceso de visitante habilitado.', 'success');
    window.setTimeout(() => {
      if (typeof window.showView === 'function') window.showView('inicio');
      else document.querySelector('[data-view="inicio"]')?.click();
    }, 0);
  }

  visitorButton.addEventListener('click', openVisitorSession);

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
      if (sessionStorage.getItem(visitorSessionKey) === 'active') {
        openVisitorSession();
        return;
      }
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
    document.body.dataset.userRole = profile.rol;
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
      console.error('SIMU auth error', { code: error.code, status: error.status, message: error.message });
      setMessage(describeAuthError(error), 'error');
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
    sessionStorage.removeItem(visitorSessionKey);
    await client.auth.signOut();
    delete document.body.dataset.userRole;
    delete document.body.dataset.accessMode;
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
