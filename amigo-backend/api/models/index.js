const dbConfig = require('../config/db.config.js');
const Sequelize = require('sequelize');

const sequelize = new Sequelize(dbConfig.DB, dbConfig.USER, dbConfig.PASSWORD, {
  host: dbConfig.HOST,
  dialect: dbConfig.dialect,
  operatorsAliases: 0,
  pool: {
    max: dbConfig.pool.max,
    min: dbConfig.pool.min,
    acquire: dbConfig.pool.acquire,
    idle: dbConfig.pool.idle,
  },
  logging: false,
});

const db = {};
db.Sequelize = Sequelize;
db.sequelize = sequelize;

// ── Models ───────────────────────────────────────────────────────────────
db.users       = require('./User.js')(sequelize, Sequelize);
db.meetings    = require('./Meeting.js')(sequelize, Sequelize);
db.recordings  = require('./Recording.js')(sequelize, Sequelize);
db.teams       = require('./Team.js')(sequelize, Sequelize);
db.teamMembers = require('./TeamMember.js')(sequelize, Sequelize);

// ── Associations ─────────────────────────────────────────────────────────

// User ↔ Meeting
db.users.hasMany(db.meetings,    { foreignKey: 'hostId', as: 'hostedMeetings' });
db.meetings.belongsTo(db.users,  { foreignKey: 'hostId', as: 'host' });

// Meeting ↔ Recording
db.meetings.hasMany(db.recordings,   { foreignKey: 'meetingId', as: 'recordings' });
db.recordings.belongsTo(db.meetings, { foreignKey: 'meetingId', as: 'meeting' });

// User ↔ Recording
db.users.hasMany(db.recordings,    { foreignKey: 'hostId', as: 'recordings' });
db.recordings.belongsTo(db.users,  { foreignKey: 'hostId', as: 'host' });

// User ↔ Team (creator)
db.users.hasMany(db.teams,   { foreignKey: 'createdBy', as: 'createdTeams' });
db.teams.belongsTo(db.users, { foreignKey: 'createdBy', as: 'creator' });

// Team ↔ TeamMember ↔ User
db.teams.hasMany(db.teamMembers,      { foreignKey: 'teamId', as: 'members' });
db.teamMembers.belongsTo(db.teams,    { foreignKey: 'teamId', as: 'team' });
db.teamMembers.belongsTo(db.users,    { foreignKey: 'userId', as: 'user' });
db.users.hasMany(db.teamMembers,      { foreignKey: 'userId', as: 'teamMemberships' });

module.exports = db;
