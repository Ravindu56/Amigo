const { v4: uuidv4 } = require('uuid');
const db = require('../models');
const Meeting = db.meetings;
const User    = db.users;
const { Op }  = db.Sequelize;

// Helper: generate a readable 9-digit room ID e.g. "844-922-101"
const generateRoomId = () => {
  const n = Math.floor(100000000 + Math.random() * 900000000).toString();
  return `${n.slice(0, 3)}-${n.slice(3, 6)}-${n.slice(6, 9)}`;
};

// ── 1. CREATE ─────────────────────────────────────────────────────────────
// POST /api/meetings
exports.createMeeting = async (req, res) => {
  try {
    const {
      title, passcode, scheduledAt, duration,
      hostVideoOn, participantVideoOn, usePMI,
    } = req.body;

    let roomId;
    if (usePMI) {
      roomId = req.user.pmi;
    } else {
      let exists = true;
      while (exists) {
        roomId = generateRoomId();
        const found = await Meeting.findOne({ where: { roomId } });
        if (!found) exists = false;
      }
    }

    const meeting = await Meeting.create({
      roomId,
      title:              title              || 'Instant Meeting',
      hostId:             req.user.id,
      passcode:           passcode           || '',
      scheduledAt:        scheduledAt        || null,
      duration:           duration           || 60,
      hostVideoOn:        hostVideoOn        ?? true,
      participantVideoOn: participantVideoOn ?? true,
      usePMI:             usePMI             || false,
      status:    scheduledAt ? 'scheduled' : 'ongoing',
      startedAt: scheduledAt ? null : new Date(),
    });

    res.status(201).json(meeting);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ── 2. GET MY UPCOMING MEETINGS ───────────────────────────────────────────
// GET /api/meetings/my
exports.getMyMeetings = async (req, res) => {
  try {
    const meetings = await Meeting.findAll({
      where: {
        hostId: req.user.id,
        status: { [Op.in]: ['scheduled', 'ongoing'] },
      },
      include: [{ model: User, as: 'host', attributes: ['id', 'fullName', 'email', 'avatar'] }],
      order: [['scheduledAt', 'ASC']],
    });
    res.json(meetings);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ── 3. GET HISTORY ────────────────────────────────────────────────────────
// GET /api/meetings/history
exports.getMeetingHistory = async (req, res) => {
  try {
    const meetings = await Meeting.findAll({
      where: { hostId: req.user.id, status: 'ended' },
      include: [{ model: User, as: 'host', attributes: ['id', 'fullName', 'email', 'avatar'] }],
      order: [['endedAt', 'DESC']],
    });
    res.json(meetings);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ── 4. GET ONE BY roomId ──────────────────────────────────────────────────
// GET /api/meetings/:roomId
exports.getMeetingByRoomId = async (req, res) => {
  try {
    const meeting = await Meeting.findOne({
      where: { roomId: req.params.roomId },
      include: [{ model: User, as: 'host', attributes: ['id', 'fullName', 'avatar'] }],
    });
    if (!meeting) return res.status(404).json({ message: 'Meeting not found' });
    res.json(meeting);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ── 5. START ──────────────────────────────────────────────────────────────
// PUT /api/meetings/:roomId/start
exports.startMeeting = async (req, res) => {
  try {
    const meeting = await Meeting.findOne({ where: { roomId: req.params.roomId } });
    if (!meeting) return res.status(404).json({ message: 'Meeting not found' });
    if (meeting.hostId !== req.user.id)
      return res.status(403).json({ message: 'Only the host can start this meeting' });

    await meeting.update({ status: 'ongoing', startedAt: new Date() });
    res.json(meeting);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ── 6. END ────────────────────────────────────────────────────────────────
// PUT /api/meetings/:roomId/end
exports.endMeeting = async (req, res) => {
  try {
    const meeting = await Meeting.findOne({ where: { roomId: req.params.roomId } });
    if (!meeting) return res.status(404).json({ message: 'Meeting not found' });
    if (meeting.hostId !== req.user.id)
      return res.status(403).json({ message: 'Only the host can end this meeting' });

    await meeting.update({ status: 'ended', endedAt: new Date() });
    res.json(meeting);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ── 7. UPDATE ─────────────────────────────────────────────────────────────
// PUT /api/meetings/:roomId
exports.updateMeeting = async (req, res) => {
  try {
    const meeting = await Meeting.findOne({ where: { roomId: req.params.roomId } });
    if (!meeting) return res.status(404).json({ message: 'Meeting not found' });
    if (meeting.hostId !== req.user.id)
      return res.status(403).json({ message: 'Not authorised' });

    const { title, passcode, scheduledAt, duration, hostVideoOn, participantVideoOn } = req.body;
    await meeting.update({
      title:              title              ?? meeting.title,
      passcode:           passcode           ?? meeting.passcode,
      scheduledAt:        scheduledAt        ?? meeting.scheduledAt,
      duration:           duration           ?? meeting.duration,
      hostVideoOn:        hostVideoOn        ?? meeting.hostVideoOn,
      participantVideoOn: participantVideoOn ?? meeting.participantVideoOn,
    });
    res.json(meeting);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ── 8. DELETE ─────────────────────────────────────────────────────────────
// DELETE /api/meetings/:roomId
exports.deleteMeeting = async (req, res) => {
  try {
    const meeting = await Meeting.findOne({ where: { roomId: req.params.roomId } });
    if (!meeting) return res.status(404).json({ message: 'Meeting not found' });
    if (meeting.hostId !== req.user.id)
      return res.status(403).json({ message: 'Not authorised' });

    await meeting.destroy();
    res.json({ message: 'Meeting deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ── 9. DASHBOARD STATS ────────────────────────────────────────────────────
// GET /api/meetings/stats
exports.getDashboardStats = async (req, res) => {
  try {
    const totalHosted = await Meeting.count({ where: { hostId: req.user.id } });
    const upcoming    = await Meeting.count({
      where: { hostId: req.user.id, status: 'scheduled' },
    });
    const ended       = await Meeting.count({
      where: { hostId: req.user.id, status: 'ended' },
    });
    const recentMeetings = await Meeting.findAll({
      where: { hostId: req.user.id },
      order: [['createdAt', 'DESC']],
      limit: 5,
      include: [{ model: User, as: 'host', attributes: ['id', 'fullName', 'avatar'] }],
    });
    res.json({ totalHosted, upcoming, ended, recentMeetings });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
