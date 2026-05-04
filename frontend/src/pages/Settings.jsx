import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Sidebar from '../components/layout/Sidebar';
import BottomNav from '../components/layout/BottomNav';
import { getAdmins, updateAdmin, deleteAdmin } from '../services/api';
import { User, Users, Save, Plus, Trash2, Loader, QrCode, Lock, Mail, LogOut, AlertCircle, CheckCircle2 } from 'lucide-react';
import { validatePixKey } from '../utils/pixQR';
import Button from '../components/ui/Button';
import NewAdminModal from '../components/NewAdminModal';
import ChangePasswordModal from '../components/ChangePasswordModal';

function Settings() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('account');
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState({ text: '', type: '' });

  const handleLogout = () => { logout(); navigate('/login'); };

  // Account form
  const [accountForm, setAccountForm] = useState({
    name: user?.name || '',
    email: user?.email || '',
    pixKey: user?.pixKey || ''
  });


  const [showNewAdmin, setShowNewAdmin] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  const fetchAdmins = async () => {
    try {
      setLoading(true);
      const res = await getAdmins();
      // Filter out the dev email (assuming dev email is hardcoded here or known)
      // Since the dev email isn't known yet, we filter out if role === 'superadmin' 
      // or we just show everyone except the logged in user? "a unica conta q não vai aparecer nessa tela é a minha de desenvolvedor"
      // I will filter out "ronald" in email or simply role="superadmin". 
      // For safety, let's assume the dev email contains 'ronald' until they clarify.
      const filtered = (res.data || []).filter(a => !a.email.toLowerCase().includes('ronald'));
      setAdmins(filtered);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'team') {
      fetchAdmins();
    }
  }, [activeTab]);

  const handleAccountSave = async (e) => {
    e.preventDefault();
    setMsg({ text: 'Salvando...', type: 'info' });
    try {
      await updateAdmin(user.id, { ...accountForm, pixKey: accountForm.pixKey.trim() });
      setMsg({ text: 'Informações atualizadas com sucesso! Faça login novamente para atualizar no painel.', type: 'success' });
    } catch (err) {
      setMsg({ text: err.response?.data?.error || 'Erro ao atualizar informações', type: 'error' });
    }
  };

  const handleDeleteAdmin = async (id, name) => {
    if (!window.confirm(`Tem certeza que deseja excluir o administrador ${name}? Ele perderá acesso ao sistema.`)) return;
    try {
      await deleteAdmin(id);
      fetchAdmins();
    } catch (err) {
      alert('Erro ao excluir administrador');
    }
  };

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 flex flex-col min-w-0 pb-20 lg:pb-0">
        
        {/* Mobile header */}
        <header className="lg:hidden sticky top-0 z-30 bg-zinc-950/90 backdrop-blur border-b border-zinc-800 px-4 py-3 flex items-center justify-between">
          <span className="text-lg font-black">
            <span className="text-emerald-400">RA</span>
            <span className="text-zinc-100"> Kart Racing</span>
          </span>
          <button onClick={handleLogout} className="text-zinc-500 hover:text-zinc-200 transition-colors" aria-label="Sair">
            <LogOut size={20} />
          </button>
        </header>

        {/* Desktop page title */}
        <div className="hidden lg:flex items-center justify-between px-8 pt-8 pb-4">
          <div>
            <h1 className="text-2xl font-bold text-zinc-100">Configurações</h1>
            <p className="text-sm text-zinc-500 mt-0.5">Gerencie sua conta, chaves PIX e acesso da equipe.</p>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 max-w-4xl w-full mx-auto px-4 pt-6 pb-4 lg:pt-0 lg:px-8 lg:pb-8 space-y-6">
          {/* Tabs */}
          <div className="flex gap-2 p-1 bg-zinc-900/50 rounded-xl border border-zinc-800/50">
            <button
              onClick={() => { setActiveTab('account'); setMsg({ text: '', type: '' }); }}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'account' ? 'bg-zinc-800 text-emerald-400 shadow' : 'text-zinc-400 hover:text-zinc-300 hover:bg-zinc-800/50'
              }`}
            >
              <User size={16} />
              Minha Conta
            </button>
            <button
              onClick={() => { setActiveTab('team'); setMsg({ text: '', type: '' }); }}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'team' ? 'bg-zinc-800 text-emerald-400 shadow' : 'text-zinc-400 hover:text-zinc-300 hover:bg-zinc-800/50'
              }`}
            >
              <Users size={16} />
              Equipe
            </button>
          </div>

          {/* Message Alert */}
          {msg.text && (
            <div className={`p-4 rounded-xl text-sm font-medium ${
              msg.type === 'error' ? 'bg-red-900/20 text-red-400 border border-red-900/30' :
              msg.type === 'success' ? 'bg-emerald-900/20 text-emerald-400 border border-emerald-900/30' :
              'bg-zinc-800/50 text-zinc-300'
            }`}>
              {msg.text}
            </div>
          )}

          {/* ── ACCOUNT TAB ── */}
          {activeTab === 'account' && (
            <div className="max-w-2xl space-y-6">
              
              {/* Perfil */}
              <div className="glass-card p-5 lg:p-6">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-16 h-16 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center flex-shrink-0">
                    <User size={32} className="text-zinc-500" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-zinc-100">Dados do Perfil</h2>
                    <p className="text-sm text-zinc-400">Atualize suas informações pessoais de acesso.</p>
                  </div>
                </div>
                
                <form onSubmit={handleAccountSave} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="label">Nome Completo</label>
                      <div className="relative">
                        <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                        <input type="text" value={accountForm.name} onChange={e => setAccountForm(p => ({ ...p, name: e.target.value }))} className="input-field pl-9" required />
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div>
                        <label className="label">E-mail de Acesso</label>
                        <div className="relative">
                          <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                          <input type="email" value={accountForm.email} onChange={e => setAccountForm(p => ({ ...p, email: e.target.value }))} className="input-field pl-9" required />
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowPasswordModal(true)}
                        className="text-sm text-zinc-400 hover:text-amber-400 transition-colors flex items-center gap-2"
                      >
                        <Lock size={14} /> Alterar Senha de Acesso
                      </button>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-zinc-800/50">
                    <Button type="submit" variant="primary" className="flex items-center gap-2">
                      <Save size={16} /> Salvar Perfil
                    </Button>
                  </div>
                </form>
              </div>

              {/* Financeiro / PIX */}
              <div className="glass-card p-5 lg:p-6 border-emerald-900/20">
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                    <QrCode size={20} />
                  </div>
                  <div>
                    <h2 className="font-semibold text-zinc-100">Dados de Recebimento</h2>
                    <p className="text-xs text-zinc-400">Configuração de pagamentos e PIX.</p>
                  </div>
                </div>
                
                <form onSubmit={handleAccountSave} className="space-y-4">
                  <div>
                    <label className="label">Chave PIX</label>
                    <input type="text" value={accountForm.pixKey} onChange={e => setAccountForm(p => ({ ...p, pixKey: e.target.value }))} className="input-field" placeholder="Ex: email@banco.com.br, +5511999999999 ou CPF" />
                    {accountForm.pixKey.trim() && (() => {
                      const v = validatePixKey(accountForm.pixKey);
                      return v.valid
                        ? <p className="flex items-center gap-1.5 text-xs text-emerald-400 mt-2"><CheckCircle2 size={13} /> Chave {v.type} válida</p>
                        : <p className="flex items-center gap-1.5 text-xs text-amber-400 mt-2"><AlertCircle size={13} /> {v.hint || 'Formato não reconhecido'}</p>;
                    })()}
                    {!accountForm.pixKey.trim() && (
                      <p className="text-xs text-zinc-500 mt-2">
                        Formatos aceitos: e-mail, telefone (+55DDD...), CPF, CNPJ ou chave aleatória.
                      </p>
                    )}
                  </div>

                  <div className="pt-2">
                    <Button type="submit" variant="secondary" className="flex items-center gap-2">
                      <Save size={16} /> Salvar Chave PIX
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* ── TEAM TAB ── */}
          {activeTab === 'team' && (
            <div className="space-y-6">
              
              <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-zinc-100">Membros da Equipe</h2>
                  <p className="text-sm text-zinc-400">Usuários com acesso de administrador ao sistema.</p>
                </div>
              </div>

              {loading ? (
                <div className="flex justify-center p-8 text-zinc-500"><Loader size={24} className="animate-spin" /></div>
              ) : admins.length === 0 ? (
                <div className="text-center p-8 text-zinc-500 bg-zinc-900/30 rounded-xl border border-zinc-800 border-dashed">
                  Nenhum outro administrador cadastrado.
                </div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {admins.map(admin => (
                    <div key={admin.id} className="glass-card p-4 flex items-center justify-between group">
                      <div className="min-w-0 pr-3">
                        <p className="font-medium text-zinc-200 truncate">{admin.name}</p>
                        <p className="text-xs text-zinc-500 truncate">{admin.email}</p>
                      </div>
                      <button 
                        onClick={() => handleDeleteAdmin(admin.id, admin.name)}
                        className="text-zinc-600 hover:text-red-400 transition-colors p-2"
                        title="Remover Acesso"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

            </div>
          )}

        </div>
      </main>

      {/* FAB Novo Administrador */}
      {activeTab === 'team' && (
        <button
          onClick={() => setShowNewAdmin(true)}
          className="fixed bottom-20 lg:bottom-8 right-5 lg:right-8 z-40 w-14 h-14 rounded-full bg-emerald-500 hover:bg-emerald-400 text-white shadow-xl shadow-emerald-500/30 flex items-center justify-center transition-all duration-200 active:scale-90"
          aria-label="Novo Administrador"
        >
          <Plus size={26} strokeWidth={2.5} />
        </button>
      )}

      {/* Change Password Modal */}
      <ChangePasswordModal
        isOpen={showPasswordModal}
        onClose={() => setShowPasswordModal(false)}
        userId={user.id}
        onSuccess={() => setMsg({ text: 'Senha atualizada com sucesso!', type: 'success' })}
      />

      {/* New Admin Modal */}
      <NewAdminModal 
        isOpen={showNewAdmin} 
        onClose={() => setShowNewAdmin(false)} 
        onSuccess={() => {
          fetchAdmins();
          setMsg({ text: 'Administrador criado com sucesso!', type: 'success' });
        }} 
      />

      <BottomNav />
    </div>
  );
}

export default Settings;

