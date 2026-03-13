const express = require('express');
const router  = express.Router();
const protect = require('../middleware/protect');
const {
  getMyTeams,
  createTeam,
  addMember,
  removeMember,
  deleteTeam,
  updateTeam,
} = require('../controllers/teamController');

router.use(protect);

router.get('/',                           getMyTeams);    // GET    /api/teams
router.post('/',                          createTeam);    // POST   /api/teams
router.put('/:teamId',                    updateTeam);    // PUT    /api/teams/:teamId
router.delete('/:teamId',                 deleteTeam);    // DELETE /api/teams/:teamId
router.post('/:teamId/members',           addMember);     // POST   /api/teams/:teamId/members
router.delete('/:teamId/members/:userId', removeMember);  // DELETE /api/teams/:teamId/members/:userId

module.exports = router;
