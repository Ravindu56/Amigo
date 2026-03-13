import React, { useState, useEffect, useCallback } from 'react';
import Header from '../components/Header';
import {
  FaUserPlus, FaSearch, FaEnvelope, FaVideo,
  FaTrash, FaCrown, FaSpinner, FaUsers, FaTimes,
} from 'react-icons/fa';
import './styles/Team.css';
import Footer from '../components/Footer';
import { teamAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';

// Generate initials from a full name
const getInitials = (name = '') =>
  name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

// Pick a consistent gradient per user id
const GRADIENTS = [
  'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
  'linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)',
  'linear-gradient(135deg, #10b981 0%, #3b82f6 100%)',
  'linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%)',
  'linear-gradient(135deg, #06b6d4 0%, #6366f1 100%)',
];
const getGradient = (id) => GRADIENTS[id % GRADIENTS.length];

const Team = () => {
  const { user } = useAuth();

  const [teams,       setTeams]       = useState([]);
  const [activeTeam,  setActiveTeam]  = useState(null); // selected team object
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Create Team modal state
  const [showCreate, setShowCreate] = useState(false);
  const [newTeamName, setNewTeamName] = useState('');
  const [newTeamDesc, setNewTeamDesc] = useState('');
  const [creating,    setCreating]    = useState(false);

  // Add Member modal state
  const [showAddMember, setShowAddMember] = useState(false);
  const [inviteEmail,   setInviteEmail]   = useState('');
  const [addingMember,  setAddingMember]  = useState(false);
  const [memberError,   setMemberError]   = useState('');

  // Load all teams
  const loadTeams = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await teamAPI.getMy();
      setTeams(data);
      if (data.length > 0 && !activeTeam) setActiveTeam(data[0]);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadTeams(); }, [loadTeams]);

  // ── Create Team ────────────────────────────────────────────────────────
  const handleCreateTeam = async (e) => {
    e.preventDefault();
    if (!newTeamName.trim()) return;
    setCreating(true);
    try {
      const team = await teamAPI.create({ name: newTeamName, description: newTeamDesc });
      setTeams(prev => [...prev, team]);
      setActiveTeam(team);
      setShowCreate(false);
      setNewTeamName('');
      setNewTeamDesc('');
    } catch (err) {
      alert(err.message);
    } finally {
      setCreating(false);
    }
  };

  // ── Add Member ────────────────────────────────────────────────────────
  const handleAddMember = async (e) => {
    e.preventDefault();
    if (!activeTeam || !inviteEmail.trim()) return;
    setAddingMember(true);
    setMemberError('');
    try {
      const newMember = await teamAPI.addMember(activeTeam.id, { email: inviteEmail });
      // Refresh team list to get updated members
      const updated = await teamAPI.getMy();
      setTeams(updated);
      setActiveTeam(updated.find(t => t.id === activeTeam.id));
      setShowAddMember(false);
      setInviteEmail('');
    } catch (err) {
      setMemberError(err.message);
    } finally {
      setAddingMember(false);
    }
  };

  // ── Remove Member ─────────────────────────────────────────────────────
  const handleRemoveMember = async (teamId, userId) => {
    if (!window.confirm('Remove this member from the team?')) return;
    try {
      await teamAPI.removeMember(teamId, userId);
      const updated = await teamAPI.getMy();
      setTeams(updated);
      setActiveTeam(updated.find(t => t.id === teamId));
    } catch (err) {
      alert(err.message);
    }
  };

  // ── Delete Team ────────────────────────────────────────────────────────
  const handleDeleteTeam = async (teamId) => {
    if (!window.confirm('Delete this team permanently?')) return;
    try {
      await teamAPI.delete(teamId);
      const remaining = teams.filter(t => t.id !== teamId);
      setTeams(remaining);
      setActiveTeam(remaining[0] || null);
    } catch (err) {
      alert(err.message);
    }
  };

  // Members of the currently selected team
  const members = activeTeam?.members || [];
  const filteredMembers = members.filter(m =>
    m.user?.fullName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.user?.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="team-wrapper">
      <Header />
      <div className="team-container">

        {/* Header */}
        <div className="team-header">
          <div className="header-text">
            <h2>Team Management</h2>
            <p>Manage access, roles, and collaboration settings.</p>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            {activeTeam && activeTeam.createdBy === user?.id && (
              <button className="btn-invite" onClick={() => setShowAddMember(true)}>
                <FaUserPlus /> Invite Member
              </button>
            )}
            <button
              className="btn-invite"
              style={{ background: 'linear-gradient(135deg,#10b981,#3b82f6)' }}
              onClick={() => setShowCreate(true)}
            >
              <FaUsers /> New Team
            </button>
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
            <FaSpinner style={{ fontSize: '1.5rem', animation: 'spin 1s linear infinite' }} />
            <p style={{ marginTop: '0.5rem' }}>Loading teams...</p>
          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <p style={{ color: '#ef4444', padding: '2rem' }}>{error}</p>
        )}

        {/* Empty State */}
        {!loading && !error && teams.length === 0 && (
          <div style={{ textAlign: 'center', padding: '4rem', color: '#64748b' }}>
            <FaUsers style={{ fontSize: '2.5rem', marginBottom: '1rem', opacity: 0.3 }} />
            <h3>No teams yet</h3>
            <p>Create your first team to start collaborating.</p>
            <button className="btn-invite" style={{ marginTop: '1rem' }}
              onClick={() => setShowCreate(true)}>
              <FaUsers /> Create Team
            </button>
          </div>
        )}

        {/* Main Team UI */}
        {!loading && !error && teams.length > 0 && (
          <>
            {/* Team Selector Tabs */}
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
              {teams.map(t => (
                <button
                  key={t.id}
                  onClick={() => setActiveTeam(t)}
                  style={{
                    padding: '0.5rem 1rem', borderRadius: '99px', border: 'none',
                    cursor: 'pointer', fontWeight: 500, fontSize: '0.875rem',
                    background: activeTeam?.id === t.id ? (t.avatarColor || '#6366f1') : '#1e293b',
                    color: activeTeam?.id === t.id ? '#fff' : '#94a3b8',
                    transition: 'all 0.2s',
                  }}
                >
                  {t.name}
                </button>
              ))}
            </div>

            {/* Stats Bar */}
            <div className="stats-bar">
              <div className="stat-item">
                <span className="stat-value">{members.length}</span>
                <span className="stat-label">Members</span>
              </div>
              <div className="divider-v"></div>
              <div className="stat-item">
                <span className="stat-value">
                  {members.filter(m => m.role === 'admin').length}
                </span>
                <span className="stat-label">Admins</span>
              </div>
              <div className="divider-v"></div>
              <div className="stat-item">
                <span className="stat-value">
                  {activeTeam?.description || 'No description'}
                </span>
                <span className="stat-label">About</span>
              </div>
              {activeTeam?.createdBy === user?.id && (
                <>
                  <div className="divider-v"></div>
                  <div className="stat-item">
                    <button
                      style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '0.8rem' }}
                      onClick={() => handleDeleteTeam(activeTeam.id)}
                    >
                      <FaTrash /> Delete Team
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* Search */}
            <div className="controls-row">
              <div style={{ flex: 1 }}></div>
              <div className="search-pill">
                <FaSearch />
                <input
                  type="text"
                  placeholder="Find a member..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            {/* Members Grid */}
            <div className="team-grid">
              {filteredMembers.map((member) => (
                <div key={member.id} className="member-card">
                  <div className="card-top-actions">
                    <span style={{ fontSize: '0.7rem', color: '#64748b',
                      textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      {member.role}
                    </span>
                    {activeTeam.createdBy === user?.id && member.userId !== user?.id && (
                      <button
                        className="btn-icon-dots"
                        title="Remove member"
                        onClick={() => handleRemoveMember(activeTeam.id, member.userId)}
                        style={{ color: '#ef4444' }}
                      >
                        <FaTimes />
                      </button>
                    )}
                  </div>

                  <div className="member-avatar"
                    style={{ background: getGradient(member.userId) }}>
                    {member.user?.avatar
                      ? <img src={member.user.avatar} alt="" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                      : getInitials(member.user?.fullName)}
                  </div>

                  <h3 className="member-name">
                    {member.user?.fullName || 'Unknown'}
                    {member.role === 'admin' && <FaCrown className="crown-icon" title="Admin" />}
                  </h3>
                  <p className="member-email">{member.user?.email}</p>
                  <span className="member-role-badge">{member.role}</span>

                  <div className="hover-actions">
                    <button className="action-chip primary"><FaVideo /> Call</button>
                    <button className="action-chip secondary"
                      onClick={() => window.location.href = `mailto:${member.user?.email}`}>
                      <FaEnvelope /> Email
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
      <Footer />

      {/* ── CREATE TEAM MODAL ─────────────────────────────────────── */}
      {showCreate && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
        }}>
          <div style={{
            background: '#1e293b', borderRadius: '16px', padding: '2rem',
            width: '100%', maxWidth: '420px', boxShadow: '0 25px 50px rgba(0,0,0,0.5)',
          }}>
            <h3 style={{ marginBottom: '1.25rem', color: '#f1f5f9' }}>Create New Team</h3>
            <form onSubmit={handleCreateTeam}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.4rem', color: '#94a3b8', fontSize: '0.875rem' }}>Team Name *</label>
                <input
                  type="text" value={newTeamName}
                  onChange={e => setNewTeamName(e.target.value)}
                  placeholder="e.g. Engineering Team"
                  required autoFocus
                  style={{
                    width: '100%', padding: '0.75rem 1rem', borderRadius: '8px',
                    border: '1px solid #334155', background: '#0f172a',
                    color: '#f1f5f9', fontSize: '0.95rem', boxSizing: 'border-box',
                  }}
                />
              </div>
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', marginBottom: '0.4rem', color: '#94a3b8', fontSize: '0.875rem' }}>Description</label>
                <textarea
                  value={newTeamDesc}
                  onChange={e => setNewTeamDesc(e.target.value)}
                  placeholder="What is this team for?"
                  rows={3}
                  style={{
                    width: '100%', padding: '0.75rem 1rem', borderRadius: '8px',
                    border: '1px solid #334155', background: '#0f172a',
                    color: '#f1f5f9', fontSize: '0.95rem', resize: 'vertical', boxSizing: 'border-box',
                  }}
                />
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setShowCreate(false)}
                  style={{ padding: '0.6rem 1.2rem', borderRadius: '8px', border: '1px solid #334155',
                    background: 'transparent', color: '#94a3b8', cursor: 'pointer' }}>
                  Cancel
                </button>
                <button type="submit" disabled={creating}
                  style={{ padding: '0.6rem 1.4rem', borderRadius: '8px', border: 'none',
                    background: 'linear-gradient(135deg,#6366f1,#a855f7)', color: '#fff',
                    cursor: 'pointer', fontWeight: 600 }}>
                  {creating ? 'Creating...' : 'Create Team'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── ADD MEMBER MODAL ──────────────────────────────────────── */}
      {showAddMember && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
        }}>
          <div style={{
            background: '#1e293b', borderRadius: '16px', padding: '2rem',
            width: '100%', maxWidth: '420px', boxShadow: '0 25px 50px rgba(0,0,0,0.5)',
          }}>
            <h3 style={{ marginBottom: '0.5rem', color: '#f1f5f9' }}>Invite Member</h3>
            <p style={{ color: '#64748b', fontSize: '0.875rem', marginBottom: '1.25rem' }}>
              The user must already have an Amigo account.
            </p>
            <form onSubmit={handleAddMember}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.4rem', color: '#94a3b8', fontSize: '0.875rem' }}>Email Address *</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem',
                  background: '#0f172a', border: '1px solid #334155', borderRadius: '8px', padding: '0 0.75rem' }}>
                  <FaEnvelope style={{ color: '#64748b' }} />
                  <input
                    type="email" value={inviteEmail}
                    onChange={e => setInviteEmail(e.target.value)}
                    placeholder="member@amigo.com"
                    required autoFocus
                    style={{
                      flex: 1, padding: '0.75rem 0.25rem', border: 'none',
                      background: 'transparent', color: '#f1f5f9', fontSize: '0.95rem', outline: 'none',
                    }}
                  />
                </div>
              </div>
              {memberError && (
                <p style={{ color: '#ef4444', fontSize: '0.85rem', marginBottom: '1rem' }}>
                  {memberError}
                </p>
              )}
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => { setShowAddMember(false); setMemberError(''); setInviteEmail(''); }}
                  style={{ padding: '0.6rem 1.2rem', borderRadius: '8px', border: '1px solid #334155',
                    background: 'transparent', color: '#94a3b8', cursor: 'pointer' }}>
                  Cancel
                </button>
                <button type="submit" disabled={addingMember}
                  style={{ padding: '0.6rem 1.4rem', borderRadius: '8px', border: 'none',
                    background: 'linear-gradient(135deg,#6366f1,#a855f7)', color: '#fff',
                    cursor: 'pointer', fontWeight: 600 }}>
                  {addingMember ? 'Adding...' : 'Add Member'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Team;
