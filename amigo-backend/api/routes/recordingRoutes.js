const express = require('express');
const router  = express.Router();
const protect = require('../middleware/protect');
const {
  getMyRecordings,
  createRecording,
  deleteRecording,
} = require('../controllers/recordingController');

router.use(protect);

router.get('/',       getMyRecordings);   // GET    /api/recordings
router.post('/',      createRecording);   // POST   /api/recordings
router.delete('/:id', deleteRecording);   // DELETE /api/recordings/:id

module.exports = router;
