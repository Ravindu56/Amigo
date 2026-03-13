const db = require('../models');
const Recording = db.recordings;
const Meeting   = db.meetings;

// ── 1. GET all recordings for current user ────────────────────────────────
// GET /api/recordings
exports.getMyRecordings = async (req, res) => {
  try {
    const recordings = await Recording.findAll({
      where: { hostId: req.user.id },
      include: [{ model: Meeting, as: 'meeting', attributes: ['id', 'title', 'roomId'] }],
      order: [['createdAt', 'DESC']],
    });
    res.json(recordings);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ── 2. CREATE a recording entry ───────────────────────────────────────────
// POST /api/recordings
exports.createRecording = async (req, res) => {
  try {
    const { meetingId, title, fileUrl, duration, fileSize } = req.body;
    if (!meetingId || !title) {
      return res.status(400).json({ message: 'meetingId and title are required' });
    }
    const recording = await Recording.create({
      meetingId,
      hostId:   req.user.id,
      title,
      fileUrl:  fileUrl  || '',
      duration: duration || 0,
      fileSize: fileSize || 0,
      status: 'available',
    });
    res.status(201).json(recording);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ── 3. DELETE a recording ─────────────────────────────────────────────────
// DELETE /api/recordings/:id
exports.deleteRecording = async (req, res) => {
  try {
    const recording = await Recording.findByPk(req.params.id);
    if (!recording) return res.status(404).json({ message: 'Recording not found' });
    if (recording.hostId !== req.user.id)
      return res.status(403).json({ message: 'Not authorised' });

    await recording.destroy();
    res.json({ message: 'Recording deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
