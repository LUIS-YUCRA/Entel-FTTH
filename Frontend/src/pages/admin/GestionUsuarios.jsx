import Pagination from '../../components/Pagination';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  FaEdit, FaEye, FaKey, FaSearch, FaTrash, FaUserCheck, FaUserPlus, FaUserSlash, FaUsers,
} from 'react-icons/fa';
import { userService } from '../../services/UserService';
import AdminHeader from '../../components/Header/AdminHeader';
import Footer from '../../components/Footer/Footer';
import ResponsiveFilterSelect from '../../components/ResponsiveFilterSelect';
import './GestionUsuarios.css';

const EMPTY_FORM = {
  fullName: '',
  email: '',
  password: '',
  userType: 'operador',
  employeeCode: '', area: 'Soporte técnico FTTH', technicianPhone: '', crew: '', zone: '',
};

const GestionUsuarios = () => {
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('');
  const [page, setPage] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [selected, setSelected] = useState(null);
  const [editing, setEditing] = useState(null);
  const formRef = useRef(null);

  const openForm = () => {
    setShowForm(true);
    setTimeout(() => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 0);
  };

  useEffect(() => {
    userService.list()
      .then((data) => setUsers(data.users))
      .catch((requestError) => setError(requestError.message));
  }, []);

  useEffect(() => {
    const closeFilter = event => {
      document.querySelectorAll('.usuarios-admin .usuarios-role-filter details').forEach(panel => {
        if (!panel.contains(event.target)) panel.open = false;
      });
    };
    document.addEventListener('pointerdown', closeFilter);
    document.addEventListener('focusin', closeFilter);
    return () => {
      document.removeEventListener('pointerdown', closeFilter);
      document.removeEventListener('focusin', closeFilter);
    };
  }, []);

  const orderedUsers = useMemo(() => [...users].sort((a, b) => Number(a.id) - Number(b.id)), [users]);
  const userNumbers = useMemo(() => new Map(orderedUsers.map((user, index) => [user.id, index + 1])), [orderedUsers]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return orderedUsers.filter((user) => (
      (!role || user.user_type === role)
      && (
        user.full_name.toLowerCase().includes(term)
        || user.email.toLowerCase().includes(term)
      )
    ));
  }, [orderedUsers, search, role]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / 10));
  const currentPage = Math.min(page, totalPages);
  const pageUsers = filtered.slice((currentPage - 1) * 10, currentPage * 10);

  const createUser = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      const data = await userService.create(form);
      setUsers((current) => [data.user, ...current]);
      setForm(EMPTY_FORM);
      setShowForm(false);
      setError('');
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  };

  const toggleUser = async (user) => {
    if (user.is_active && !window.confirm(`¿Confirmas desactivar la cuenta de ${user.full_name}?`)) return;
    try {
      const data = await userService.update(user.id, { isActive: !user.is_active });
      setUsers((current) => current.map((item) => item.id === user.id ? data.user : item));
      setError('');
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  const resetPassword = async (user) => {
    const password = window.prompt(`Nueva contraseña temporal para ${user.full_name}:`);
    if (!password) return;
    try {
      await userService.resetPassword(user.id, password);
      setError('');
      window.alert('Contraseña restablecida. Las sesiones anteriores fueron cerradas.');
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  const viewUser = (user) => {
    setSelected(user);
    setEditing(null);
    setError('');
  };

  const editUser = (value) => {
    setSelected(null);
    setEditing({
      id: value.id, fullName: value.full_name, email: value.email, userType: value.user_type,
      isActive: value.is_active, ci: value.ci || '', phone: value.phone || '', address: value.address || '',
      serviceNumber: value.service_number || '', zone: value.technician_zone || value.customer_zone || '',
      customerCategory: value.customer_category || 'HOGAR',
      employeeCode: value.employee_code || '', area: value.area || '', technicianPhone: value.technician_phone || '',
      crew: value.crew || '', specialty: value.specialty || 'FTTH general',
      maxActiveTickets: value.max_active_tickets || 8, isAvailable: value.is_available !== false,
    });
  };

  const saveUser = async (event) => {
    event.preventDefault(); setSaving(true);
    try {
      const data = await userService.update(editing.id, editing);
      setUsers((current) => current.map((item) => item.id === editing.id ? { ...item, ...data.user } : item));
      setEditing(null); setError('');
    } catch (requestError) { setError(requestError.message); } finally { setSaving(false); }
  };

  const deleteUser = async (user) => {
    if (!window.confirm(`¿Eliminar definitivamente la cuenta de ${user.full_name}? Esta acción es distinta de desactivar y no se puede deshacer.`)) return;
    try {
      await userService.remove(user.id);
      setUsers((current) => current.filter((item) => item.id !== user.id));
      setError('');
    } catch (requestError) { setError(requestError.message); }
  };

  return (
    <div className="usuarios-admin">
      <AdminHeader />
      <main className="usuarios-content">
        <div className="usuarios-header">
          <h1>Gestión de Usuarios</h1>
          <button type="button" className="btn-nuevo" onClick={openForm}>
            <FaUserPlus /> Nuevo Usuario
          </button>
        </div>
        {error && <div className="operator-error">{error}</div>}

        <div className="usuarios-stats">
          <div className="stat-card"><FaUsers /><h2>{users.length}</h2><span>Total usuarios</span></div>
          <div className="stat-card"><FaUserCheck /><h2>{users.filter((item) => item.is_active).length}</h2><span>Activos</span></div>
          <div className="stat-card"><FaUserSlash /><h2>{users.filter((item) => !item.is_active).length}</h2><span>Inactivos</span></div>
        </div>

        <div className="filters-card">
          <div className="search-box">
            <FaSearch />
            <input
              type="text"
              placeholder="Buscar usuario..."
              value={search}
              aria-label="Buscar usuario por nombre o correo"
              onChange={(event) => { setSearch(event.target.value); setPage(1); }}
            />
          </div>
          <div className="usuarios-role-filter" aria-label="Filtrar por rol">
          <ResponsiveFilterSelect id="user-role-filter" value={role} onChange={(event) => { setRole(event.target.value); setPage(1); }}>
            <option value="">Todos</option>
            <option value="cliente">Cliente</option>
            <option value="operador">Operador</option>
            <option value="tecnico">Técnico</option>
            <option value="administrador">Administrador</option>
          </ResponsiveFilterSelect>
          </div>
        </div>

        <div className="table-card">
          <table>
            <thead>
              <tr><th>N.º</th><th>Nombre</th><th>Rol</th><th>Correo</th><th>Estado</th><th>Acción</th></tr>
            </thead>
            <tbody>
              {pageUsers.map((user) => (
                <tr key={user.id}>
                  <td data-label="N.º">{userNumbers.get(user.id)}</td>
                  <td data-label="Nombre">{user.full_name}</td>
                  <td data-label="Rol">{user.user_type}</td>
                  <td data-label="Correo">{user.email}</td>
                  <td data-label="Estado">
                    <span className={`estado ${user.is_active ? 'activo' : 'inactivo'}`}>
                      {user.is_active ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td data-label="Acciones"><div className="user-actions">
                    <button type="button" className="btn-view" onClick={() => viewUser(user)} title="Ver ficha"><FaEye /></button>
                    <button type="button" className="btn-edit" onClick={() => editUser(user)} title="Editar usuario"><FaEdit /></button>
                    <button type="button" className="btn-edit" onClick={() => resetPassword(user)} title="Restablecer contraseña">
                      <FaKey />
                    </button>
                    <button type="button" className="btn-delete" onClick={() => deleteUser(user)} title="Eliminar definitivamente"><FaTrash /></button>
                    <button
                      type="button"
                      className={user.is_active ? 'btn-delete' : 'btn-edit'}
                      onClick={() => toggleUser(user)}
                      title={user.is_active ? 'Desactivar' : 'Activar'}
                    >
                      {user.is_active ? <FaUserSlash /> : <FaUserCheck />}
                    </button>
                  </div></td>
                </tr>
              ))}
              {!filtered.length && <tr><td colSpan={6} className="users-empty">No hay usuarios que coincidan con la búsqueda.</td></tr>}
            </tbody>
          </table>
        </div>

        {filtered.length > 0 && <Pagination page={currentPage} pageSize={10} total={filtered.length} noun="usuarios" onPageChange={setPage} />}

        {showForm && (
          <div className="inline-user-form" ref={formRef}>
            <form className="user-modal" onSubmit={createUser}>
              <div className="modal-header">
                <h2>Nuevo usuario</h2>
                <button type="button" aria-label="Cerrar formulario de nuevo usuario" onClick={() => setShowForm(false)}>×</button>
              </div>
              <label>
                Nombre completo
                <input required value={form.fullName} onChange={(event) => setForm({ ...form, fullName: event.target.value })} />
              </label>
              <label>
                Rol
                <div className="usuarios-role-filter user-form-role">
                <ResponsiveFilterSelect id="new-user-role" value={form.userType} onChange={(event) => setForm({ ...form, userType: event.target.value })}>
                  <option value="operador">Operador</option>
                  <option value="tecnico">Técnico</option>
                </ResponsiveFilterSelect>
                </div>
              </label>
              <label>
                Correo
                <input required type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} />
              </label>
              <label>
                Contraseña
                <input required type="password" minLength="8" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} />
              </label>
              <small>Debe incluir mayúscula, minúscula, número y símbolo.</small>
              <button type="submit" className="btn-nuevo" disabled={saving}>
                {saving ? 'Guardando...' : 'Crear usuario'}
              </button>
            </form>
          </div>
        )}
        {selected && <div className="modal-overlay"><section className="user-modal user-detail-card">
          <div className="modal-header"><h2>Ficha del usuario</h2><button type="button" onClick={() => setSelected(null)}>×</button></div>
          <p><strong>Nombre:</strong> {selected.full_name}</p><p><strong>Rol:</strong> {selected.user_type}</p>
          <p><strong>Correo:</strong> {selected.email}</p><p><strong>Estado:</strong> {selected.is_active ? 'Activo' : 'Inactivo'}</p>
          {selected.user_type === 'cliente' && <><p><strong>CI:</strong> {selected.ci || 'No registrado'}</p><p><strong>Teléfono:</strong> {selected.phone || 'No registrado'}</p><p><strong>Dirección:</strong> {selected.address || 'No registrada'}</p><p><strong>Número de servicio:</strong> {selected.service_number || 'No registrado'}</p><p><strong>Zona:</strong> {selected.customer_zone || 'No registrada'}</p></>}
          {selected.user_type === 'tecnico' && <><p><strong>Código:</strong> {selected.employee_code}</p><p><strong>Área:</strong> {selected.area}</p><p><strong>Teléfono:</strong> {selected.technician_phone || 'No registrado'}</p><p><strong>Cuadrilla:</strong> {selected.crew || 'No registrada'}</p><p><strong>Zona:</strong> {selected.technician_zone || 'No registrada'}</p><p><strong>Especialidad:</strong> {selected.specialty}</p></>}
        </section></div>}
        {editing && <div className="modal-overlay"><form className="user-modal" onSubmit={saveUser}>
          <div className="modal-header"><h2>Editar usuario</h2><button type="button" onClick={() => setEditing(null)}>×</button></div>
          <label>Nombre completo<input required value={editing.fullName} onChange={(e) => setEditing({ ...editing, fullName: e.target.value })} /></label>
          <label>Correo<input required type="email" value={editing.email} onChange={(e) => setEditing({ ...editing, email: e.target.value })} /></label>
          <label>Rol<select value={editing.userType} onChange={(e) => setEditing({ ...editing, userType: e.target.value })}><option value="cliente">Cliente</option><option value="operador">Operador</option><option value="tecnico">Técnico</option><option value="administrador">Administrador</option></select></label>
          {editing.userType === 'cliente' && <label>Tipo de cliente<select value={editing.customerCategory} onChange={(e)=>setEditing({...editing,customerCategory:e.target.value})}><option value="HOGAR">Hogar</option><option value="NEGOCIO">Negocio o empresa</option><option value="INSTITUCION">Institución o colegio</option></select></label>}
          {editing.userType === 'cliente' && <><label>CI<input value={editing.ci} onChange={(e) => setEditing({ ...editing, ci: e.target.value })} /></label><label>Teléfono<input value={editing.phone} onChange={(e) => setEditing({ ...editing, phone: e.target.value })} /></label><label>Dirección<input value={editing.address} onChange={(e) => setEditing({ ...editing, address: e.target.value })} /></label><label>Número de servicio<input value={editing.serviceNumber} onChange={(e) => setEditing({ ...editing, serviceNumber: e.target.value })} /></label><label>Zona<input value={editing.zone} onChange={(e) => setEditing({ ...editing, zone: e.target.value })} /></label></>}
          {editing.userType === 'tecnico' && <><label>Código de empleado<input required value={editing.employeeCode} onChange={(e) => setEditing({ ...editing, employeeCode: e.target.value })} /></label><label>Área<input required value={editing.area} onChange={(e) => setEditing({ ...editing, area: e.target.value })} /></label><label>Teléfono<input value={editing.technicianPhone} onChange={(e) => setEditing({ ...editing, technicianPhone: e.target.value })} /></label><label>Cuadrilla<input value={editing.crew} onChange={(e) => setEditing({ ...editing, crew: e.target.value })} /></label><label>Zona<input value={editing.zone} onChange={(e) => setEditing({ ...editing, zone: e.target.value })} /></label><label>Especialidad<input value={editing.specialty} onChange={(e) => setEditing({ ...editing, specialty: e.target.value })} /></label></>}
          <label><input type="checkbox" checked={editing.isActive} onChange={(e) => setEditing({ ...editing, isActive: e.target.checked })} /> Cuenta activa</label>
          <button className="btn-nuevo" disabled={saving}>{saving ? 'Guardando...' : 'Actualizar usuario'}</button>
        </form></div>}
      </main>
      <Footer />
    </div>
  );
};

export default GestionUsuarios;
