document.addEventListener("DOMContentLoaded", () => {
  const supabase = window.supabase.createClient(
    "https://ttmrvogucsmujegurmvi.supabase.co",
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR0bXJ2b2d1Y3NtdWplZ3VybXZpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc0MDE2OTIsImV4cCI6MjA5Mjk3NzY5Mn0.8NrHzYYIXrTYOpdLJafAemXnZ8bJ1DhVwSU7hQx_3pQ"
  );

  // =============================================
  // VARIABLES Y CONSTANTES
  // =============================================
  let user = null;
  let currentProfile = null;
  let usernameRequired = false;
  let allLanguages = [];
  let languageLikes = new Map();
  let userLikedLanguages = new Set();
  
  // Constantes de roles
  const ROLES = {
    USER: 1,
    ADMIN: 2,
    OWNER: 3
  };

  const loginBtn = document.getElementById("boton_inicio_sesion");
  const logoutBtn = document.getElementById("boton_cerrar_sesion");
  const editProfileBtn = document.getElementById("boton_editar_perfil");
  const addLangBtn = document.getElementById("boton_agregar_lenguaje");
  const searchInput = document.getElementById("entrada_busqueda");
  const clearSearch = document.getElementById("boton_limpiar_busqueda");

  // =============================================
  // FUNCIONES DE AUDITORÍA
  // =============================================
  async function logAudit(actionType, entityType, entityId, description, oldValues = null, newValues = null) {
    if (!user) return;
    
    const { error } = await supabase
      .from('audit_logs')
      .insert([{
        user_id: user.id,
        action_type: actionType,
        entity_type: entityType,
        entity_id: entityId?.toString() || null,
        page_url: window.location.href,
        user_agent: navigator.userAgent,
        description,
        old_values: oldValues,
        new_values: newValues
      }]);
    
    if (error) console.warn('Error registrando auditoría:', error.message);
  }

  // =============================================
  // FUNCIONES DE PERMISOS
  // =============================================
  function canViewAdmin() {
    return currentProfile && (currentProfile.role_id === ROLES.ADMIN || currentProfile.role_id === ROLES.OWNER);
  }

  function isUsernameMissing(profile) {
    return !profile || !profile.username || !profile.username.trim();
  }

  // =============================================
  // MANEJADORES DE BOTONES
  // =============================================

  loginBtn.onclick = () => {
    window.location.href = 'login.html';
  };

  logoutBtn.onclick = async () => {
    if (user) {
      await logAudit('LOGOUT', 'user', user.id, 'Cierre de sesión');
    }
    await supabase.auth.signOut();
    localStorage.removeItem('user');
    localStorage.removeItem('session');
    location.reload();
  };

  // =============================================
  // GESTIÓN DE USUARIOS Y SESIÓN
  // =============================================
  async function getUser() {
    const storedUser = localStorage.getItem('user');
    const storedSession = localStorage.getItem('session');

    if (storedUser && storedSession) {
      user = JSON.parse(storedUser);
    } else {
      const { data } = await supabase.auth.getSession();
      user = data?.session?.user || null;

      if (user) {
        localStorage.setItem('user', JSON.stringify(user));
        localStorage.setItem('session', JSON.stringify(data.session));
      }
    }

    loginBtn.style.display = user ? "none" : "block";
    logoutBtn.style.display = user ? "block" : "none";
    addLangBtn.style.display = user ? "block" : "none";

    if (user) {
      const { data: perfil } = await supabase
        .from('perfiles')
        .select('role_id, username')
        .eq('id', user.id)
        .maybeSingle();

      currentProfile = perfil;

      if (isUsernameMissing(currentProfile)) {
        usernameRequired = true;
        addLangBtn.disabled = true;
        showProfileModal();
      } else {
        usernameRequired = false;
        addLangBtn.disabled = false;
      }

      // Mostrar botón Admin para Admin y Owner
      if (canViewAdmin()) {
        const adminBtn = document.createElement('button');
        adminBtn.className = 'boton_inicio';
        adminBtn.innerHTML = '<i class="fas fa-cog"></i> Admin';
        adminBtn.onclick = () => window.location.href = 'admin.html';
        document.querySelector('.acciones_encabezado').appendChild(adminBtn);
      }

      editProfileBtn.style.display = 'block';

      if (!perfil) {
        showProfileModal();
      }
    }
  }

  function showProfileModal() {
    const modal = document.getElementById('modal_perfil');
    const perfilInput = document.getElementById('usuario_perfil');
    perfilInput.value = currentProfile?.username || '';
    modal.style.display = 'block';
    document.getElementById('cerrar_modal_perfil').style.display = usernameRequired ? 'none' : 'flex';
  }

  function hideProfileModal() {
    if (usernameRequired) {
      return Swal.fire({
        icon: 'warning',
        title: 'Nombre de usuario requerido',
        text: 'Debes completar tu nombre antes de continuar.'
      });
    }
    document.getElementById('modal_perfil').style.display = 'none';
  }

  async function saveProfile() {
    const usernameValue = document.getElementById('usuario_perfil').value.trim();
    if (!usernameValue || usernameValue.length < 3) {
      return Swal.fire({
        icon: "warning",
        title: "Nombre inválido",
        text: "El nombre de usuario debe tener al menos 3 caracteres"
      });
    }

    let error = null;
    const oldValues = currentProfile ? { username: currentProfile.username } : null;
    const newValues = { username: usernameValue };

    if (currentProfile) {
      const result = await supabase
        .from('perfiles')
        .update({ username: usernameValue })
        .eq('id', user.id);
      error = result.error;
      if (!error) {
        await logAudit('UPDATE', 'perfil', user.id, `Username actualizado de ${currentProfile.username} a ${usernameValue}`, oldValues, newValues);
      }
    } else {
      const result = await supabase
        .from('perfiles')
        .insert({ id: user.id, username: usernameValue });
      error = result.error;
      if (!error) {
        await logAudit('INSERT', 'perfil', user.id, `Perfil creado: ${usernameValue}`, null, newValues);
      }
    }

    if (error) {
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "Error guardando el perfil: " + error.message
      });
      return;
    }

    currentProfile = { id: user.id, username: usernameValue };
    usernameRequired = false;
    editProfileBtn.style.display = 'block';
    hideProfileModal();

    Swal.fire({
      icon: 'success',
      title: 'Perfil guardado',
      text: 'Se recargará la página para aplicar los cambios.'
    }).then(() => {
      location.reload();
    });
  }

  // =============================================
  // CARGAR DATOS
  // =============================================
  async function loadLanguages() {
    const { data, error } = await supabase
      .from("languages")
      .select("*")
      .eq('is_active', true)
      .order("name");

    if (error) {
      console.error('Error cargando lenguajes:', error);
      return;
    }

    if (data) {
      allLanguages = data;
      await loadLanguageLikes(allLanguages.map((lang) => lang.id));
      allLanguages.sort((a, b) => {
        const aLikes = languageLikes.get(a.id) || 0;
        const bLikes = languageLikes.get(b.id) || 0;
        if (bLikes !== aLikes) return bLikes - aLikes;
        return (a.name || '').localeCompare(b.name || '');
      });
    } else {
      allLanguages = [];
    }

    renderLanguages(allLanguages);
  }

  async function loadLanguageLikes(languageIds) {
    if (!languageIds.length) {
      languageLikes = new Map();
      userLikedLanguages = new Set();
      return;
    }

    const { data: likeRows, error } = await supabase
      .from('likes_languages')
      .select('language_id, user_id')
      .in('language_id', languageIds);

    if (error) {
      console.warn('Error cargando likes de lenguajes:', error.message);
      languageLikes = new Map();
      userLikedLanguages = new Set();
      return;
    }

    const counts = new Map();
    const liked = new Set();

    (likeRows || []).forEach((row) => {
      counts.set(row.language_id, (counts.get(row.language_id) || 0) + 1);
      if (user && row.user_id === user.id) {
        liked.add(row.language_id);
      }
    });

    languageLikes = counts;
    userLikedLanguages = liked;
  }

  async function toggleLanguageLike(languageId) {
    if (!user || usernameRequired) {
      if (!user) {
        return Swal.fire({
          icon: "info",
          title: "Inicia sesión",
          text: "Debes iniciar sesión para dar like",
          confirmButtonText: "Entendido"
        });
      }
      showProfileModal();
      return;
    }

    const alreadyLiked = userLikedLanguages.has(languageId);

    if (alreadyLiked) {
      const { error } = await supabase
        .from('likes_languages')
        .delete()
        .match({ language_id: languageId, user_id: user.id });
      if (error) {
        return Swal.fire({
          icon: "error",
          title: "Error",
          text: "Error quitando like: " + error.message
        });
      }
      await logAudit('DELETE', 'likes_languages', `${languageId}-${user.id}`, `Like removido del lenguaje`);
    } else {
      const { error } = await supabase
        .from('likes_languages')
        .insert({ language_id: languageId, user_id: user.id });
      if (error) {
        return Swal.fire({
          icon: "error",
          title: "Error",
          text: "Error guardando like: " + error.message
        });
      }
      await logAudit('INSERT', 'likes_languages', `${languageId}-${user.id}`, `Like agregado al lenguaje`);
    }

    await loadLanguageLikes(allLanguages.map((lang) => lang.id));
    renderLanguages(allLanguages);
  }

  // =============================================
  // RENDERIZAR CONTENIDO
  // =============================================
  function renderLanguages(languages) {
    const grid = document.getElementById("rejilla_lenguajes");
    grid.innerHTML = "";

    languages.forEach((lang) => {
      const likeCount = languageLikes.get(lang.id) || 0;
      const liked = userLikedLanguages.has(lang.id);
      const el = document.createElement("div");
      el.className = "tarjeta_lenguaje";

      el.onclick = () => {
        window.location.href = `language.html?lang=${encodeURIComponent(lang.name)}`;
      };

      const descriptionHtml = lang.description 
        ? marked.parse(lang.description) 
        : "";

      el.innerHTML = `
<div class="tarjeta_lenguaje_header">
  <div class="icono_lenguaje">
    <i class="${lang.icon}"></i>
  </div>
  <div class="contenido_lenguaje">
    <h3>${lang.name}</h3>
    <div class="description-markdown">${descriptionHtml}</div>
  </div>
</div>
<div class="tarjeta_lenguaje_footer">
  <span class="conteo_megusta"><i class="fas fa-heart"></i> ${likeCount}</span>
  <div class="acciones_tarjeta_lenguaje">
    <button class="btn boton_megusta" data-language-id="${lang.id}" title="Like">${liked ? '<img src="icons/prueba 2 corazon fondo.svg" alt="" width="15px" height="15px">' : '🤍'}</button>
    <button class="btn boton_secundario boton_reporte_lenguaje" data-language-id="${lang.id}" data-language-name="${lang.name}" title="Reportar"><i class="fas fa-flag"></i></button>
  </div>
</div>
`;

      const likeButton = el.querySelector('.boton_megusta');
      likeButton.onclick = (event) => {
        event.stopPropagation();
        toggleLanguageLike(lang.id);
      };

      const reportBtn = el.querySelector('.boton_reporte_lenguaje');
      reportBtn.onclick = (event) => {
        event.stopPropagation();
        openReportModal('language', lang.id, lang.name, lang.user_id);
      };

      grid.appendChild(el);
    });

    updateCounter(languages);
  }

  function updateCounter(languages) {
    const total = languages.length;
    document.getElementById("contador_total").textContent = total;
    document.getElementById("texto_total").textContent = `${total} lenguajes disponibles`;
  }

  // =============================================
  // MODALES Y FORMULARIOS
  // =============================================
  const modal = document.getElementById("modal_ver_tarjeta");

  addLangBtn.onclick = () => {
    if (usernameRequired) {
      return showProfileModal();
    }

    // Limpiar campos
    document.getElementById("nombre_lenguaje").value = '';
    document.getElementById("icono_lenguaje_input").value = '';
    document.getElementById("descripcion_lenguaje").value = '';
    modal.style.display = "block";
  };

  document.getElementById("cerrar_modal").onclick = () => {
    modal.style.display = "none";
  };

  document.getElementById("boton_cancelar_modal").onclick = () => {
    modal.style.display = "none";
  };

  document.getElementById('cerrar_modal_perfil').onclick = hideProfileModal;
  document.getElementById('boton_guardar_perfil').onclick = saveProfile;
  editProfileBtn.onclick = showProfileModal;

  document.getElementById("boton_guardar_lenguaje").onclick = async () => {
    const name = document.getElementById("nombre_lenguaje").value.trim();
    const icon = document.getElementById("icono_lenguaje_input").value.trim();
    const desc = document.getElementById("descripcion_lenguaje").value.trim();

    // Validaciones
    if (!name) {
      return Swal.fire({
        icon: "warning",
        title: "Campo obligatorio",
        text: "El nombre es obligatorio"
      });
    }

    if (name.length < 2) {
      return Swal.fire({
        icon: "warning",
        title: "Nombre muy corto",
        text: "El nombre debe tener al menos 2 caracteres"
      });
    }

    if (icon.length < 3) {
      return Swal.fire({
        icon: "warning",
        title: "Icono inválido",
        text: "Proporciona un icono válido de Font Awesome (ej: fas fa-code)"
      });
    }

    const { error, data } = await supabase.from("languages").insert([
      {
        name,
        icon,
        description: desc,
        is_active: true,
        element_count: 0,
        user_id: user.id,
      },
    ]).select();

    if (error) {
      Swal.fire({
        icon: "error",
        title: "Error",
        text: error.message
      });
      return;
    }

    if (data && data[0]?.id) {
      await logAudit('INSERT', 'languages', data[0].id, `Nuevo lenguaje creado: ${name}`,
        null,
        {
          name,
          icon,
          description: desc,
          is_active: true,
          element_count: 0
        }
      );
    }
    modal.style.display = "none";
    loadLanguages();
    Swal.fire({
      icon: "success",
      title: "Éxito",
      text: "Lenguaje agregado correctamente"
    });
  };

  // =============================================
  // REPORTES
  // =============================================
  const reportModal = document.getElementById('modal_reporte');
  const closeReportModal = document.getElementById('cerrar_modal_reporte');
  const cancelReportBtn = document.getElementById('boton_cancelar_reporte');
  const submitReportBtn = document.getElementById('boton_enviar_reporte');
  let reportTarget = null;

  function openReportModal(entityType, targetId, targetName, targetOwnerId) {
    if (!user || usernameRequired) {
      if (!user) {
        return Swal.fire({
          icon: "info",
          title: "Inicia sesión",
          text: "Debes iniciar sesión para reportar",
          confirmButtonText: "Entendido"
        });
      }
      showProfileModal();
      return;
    }
    reportTarget = { entityType, targetId, targetName, targetOwnerId };
    document.getElementById('titulo_modal_reporte').textContent = `Reportar ${entityType}`;
    document.getElementById('objetivo_reporte').value = `${entityType}: ${targetName}`;
    document.getElementById('descripcion_reporte').value = '';
    reportModal.style.display = 'block';
  }

  closeReportModal.onclick = () => {
    reportModal.style.display = 'none';
    reportTarget = null;
  };
  
  cancelReportBtn.onclick = () => {
    reportModal.style.display = 'none';
    reportTarget = null;
  };

  submitReportBtn.onclick = async () => {
    const description = document.getElementById('descripcion_reporte').value.trim();
    
    if (!description) {
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "Describe claramente el motivo del reporte"
      });
      return;
    }

    if (!reportTarget) {
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "No hay objetivo de reporte"
      });
      return;
    }

    const { error, data } = await supabase.from('reports').insert([{ 
      entity_type: reportTarget.entityType,
      target_id: reportTarget.targetId.toString(),
      target_name: reportTarget.targetName,
      target_owner_id: reportTarget.targetOwnerId || null,
      reporter_id: user.id,
      description,
      status: 'pendiente'
    }]).select();

    if (error) {
      return Swal.fire({
        toast: true,
        position: "top-end",
        icon: "error",
        title: "Error enviando reporte: " + error.message,
        showConfirmButton: false,
        timer: 5000,
        timerProgressBar: true
      });
    }

    await logAudit('INSERT', 'reports', data[0].id, `Reporte creado: ${reportTarget.entityType} - ${reportTarget.targetName}`, null, {
      entity_type: reportTarget.entityType,
      target_id: reportTarget.targetId,
      target_name: reportTarget.targetName,
      target_owner_id: reportTarget.targetOwnerId || null,
      description,
      status: 'pendiente'
    });
    
    reportModal.style.display = 'none';
    
    Swal.fire({
      toast: true,
      position: "top-end",
      icon: "success",
      title: "Reporte enviado correctamente",
      showConfirmButton: false,
      timer: 3000,
      timerProgressBar: true
    });
  };

  // =============================================
  // BÚSQUEDA
  // =============================================
  searchInput.addEventListener("input", (e) => {
    const term = e.target.value.toLowerCase().trim();
    if (!term) return renderLanguages(allLanguages);

    const filtered = allLanguages.filter(
      (lang) =>
        (lang.name || "").toLowerCase().includes(term) ||
        (lang.description || "").toLowerCase().includes(term),
    );

    renderLanguages(filtered);
  });

  clearSearch.onclick = () => {
    searchInput.value = "";
    renderLanguages(allLanguages);
  };

  // =============================================
  // EVENTOS GLOBALES
  // =============================================
  window.onclick = (event) => {
    if (event.target === modal) {
      modal.style.display = "none";
    }
    if (event.target === document.getElementById('modal_perfil') && !usernameRequired) {
      hideProfileModal();
    }
    if (event.target === reportModal) {
      reportModal.style.display = 'none';
    }
  };

  // Iniciar aplicación
  getUser().then(loadLanguages);
});