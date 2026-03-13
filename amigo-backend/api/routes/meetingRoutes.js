const express = require('express');
const router  = express.Router();
const protect = require('../middleware/protect');
const {
  createMeeting,
  getMyMeetings,
  getMeetingHistory,
  getMeetingByRoomId,
  startMeeting,
  endMeeting,
  updateMeeting,
  deleteMeeting,
  getDashboardStats,
} = require('../controllers/meetingController');

// All routes require authentication
router.use(protect);

router.post('/',              createMeeting);      // POST   /api/meetings
router.get('/my',             getMyMeetings);      // GET    /api/meetings/my
router.get('/history',        getMeetingHistory);  // GET    /api/meetings/history
router.get('/stats',          getDashboardStats);  // GET    /api/meetings/stats
router.get('/:roomId',        getMeetingByRoomId); // GET    /api/meetings/:roomId
router.put('/:roomId',        updateMeeting);      // PUT    /api/meetings/:roomId
router.put('/:roomId/start',  startMeeting);       // PUT    /api/meetings/:roomId/start
router.put('/:roomId/end',    endMeeting);         // PUT    /api/meetings/:roomId/end
router.delete('/:roomId',     deleteMeeting);      // DELETE /api/meetings/:roomId

module.exports = router;
