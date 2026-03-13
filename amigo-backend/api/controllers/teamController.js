const db = require('../models');
const Team       = db.teams;
const TeamMember = db.teamMembers;
const User       = db.users;

// ── 1. GET all teams user belongs to ─────────────────────────────────────
// GET /api/teams
exports.getMyTeams = async (req, res) => {
  try {
    const memberships = await TeamMember.findAll({
      where: { userId: req.user.id },
      include: [{
        model: Team,
        as: 'team',
        include: [{
          model: TeamMember,
          as: 'members',
          include: [{ model: User, as: 'user', attributes: ['id', 'fullName', 'email', 'avatar'] }],
        }],
      }],
    });
    const teams = memberships.map(m => m.team);
    res.json(teams);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ── 2. CREATE a team ──────────────────────────────────────────────────────
// POST /api/teams
exports.createTeam = async (req, res) => {
  try {
    const { name, description, avatarColor } = req.body;
    if (!name) return res.status(400).json({ message: 'Team name is required' });

    const team = await Team.create({
      name,
      description: description || '',
      avatarColor:  avatarColor  || '#6366f1',
      createdBy: req.user.id,
    });

    // Auto-add creator as admin
    await TeamMember.create({ teamId: team.id, userId: req.user.id, role: 'admin' });

    const fullTeam = await Team.findByPk(team.id, {
      include: [{
        model: TeamMember,
        as: 'members',
        include: [{ model: User, as: 'user', attributes: ['id', 'fullName', 'email', 'avatar'] }],
      }],
    });
    res.status(201).json(fullTeam);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ── 3. ADD member ─────────────────────────────────────────────────────────
// POST /api/teams/:teamId/members
exports.addMember = async (req, res) => {
  try {
    const { email } = req.body;
    const team = await Team.findByPk(req.params.teamId);
    if (!team) return res.status(404).json({ message: 'Team not found' });
    if (team.createdBy !== req.user.id)
      return res.status(403).json({ message: 'Only the team creator can add members' });

    const userToAdd = await User.findOne({ where: { email } });
    if (!userToAdd) return res.status(404).json({ message: 'No user found with that email' });

    const existing = await TeamMember.findOne({
      where: { teamId: team.id, userId: userToAdd.id },
    });
    if (existing) return res.status(400).json({ message: 'User is already a member' });

    const member = await TeamMember.create({ teamId: team.id, userId: userToAdd.id, role: 'member' });
    res.status(201).json({
      ...member.toJSON(),
      user: { id: userToAdd.id, fullName: userToAdd.fullName,
              email: userToAdd.email, avatar: userToAdd.avatar },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ── 4. REMOVE member ─────────────────────────────────────────────────────
// DELETE /api/teams/:teamId/members/:userId
exports.removeMember = async (req, res) => {
  try {
    const team = await Team.findByPk(req.params.teamId);
    if (!team) return res.status(404).json({ message: 'Team not found' });
    if (team.createdBy !== req.user.id)
      return res.status(403).json({ message: 'Only the team creator can remove members' });

    const member = await TeamMember.findOne({
      where: { teamId: req.params.teamId, userId: req.params.userId },
    });
    if (!member) return res.status(404).json({ message: 'Member not found' });

    await member.destroy();
    res.json({ message: 'Member removed' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ── 5. DELETE team ────────────────────────────────────────────────────────
// DELETE /api/teams/:teamId
exports.deleteTeam = async (req, res) => {
  try {
    const team = await Team.findByPk(req.params.teamId);
    if (!team) return res.status(404).json({ message: 'Team not found' });
    if (team.createdBy !== req.user.id)
      return res.status(403).json({ message: 'Not authorised' });

    await TeamMember.destroy({ where: { teamId: team.id } });
    await team.destroy();
    res.json({ message: 'Team deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ── 6. UPDATE team ────────────────────────────────────────────────────────
// PUT /api/teams/:teamId
exports.updateTeam = async (req, res) => {
  try {
    const team = await Team.findByPk(req.params.teamId);
    if (!team) return res.status(404).json({ message: 'Team not found' });
    if (team.createdBy !== req.user.id)
      return res.status(403).json({ message: 'Not authorised' });

    const { name, description, avatarColor } = req.body;
    await team.update({
      name:         name         ?? team.name,
      description:  description  ?? team.description,
      avatarColor:  avatarColor  ?? team.avatarColor,
    });
    res.json(team);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
