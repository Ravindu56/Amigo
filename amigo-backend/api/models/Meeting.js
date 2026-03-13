module.exports = (sequelize, Sequelize) => {
  const Meeting = sequelize.define('meeting', {
    id: {
      type: Sequelize.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    roomId: {
      type: Sequelize.STRING,
      allowNull: false,
      unique: true,
    },
    title: {
      type: Sequelize.STRING,
      allowNull: false,
      defaultValue: 'Instant Meeting',
    },
    hostId: {
      type: Sequelize.INTEGER,
      allowNull: false,
    },
    passcode: {
      type: Sequelize.STRING,
      defaultValue: '',
    },
    scheduledAt: {
      type: Sequelize.DATE,
      allowNull: true,
    },
    duration: {
      type: Sequelize.INTEGER,
      defaultValue: 60,
    },
    status: {
      type: Sequelize.ENUM('scheduled', 'ongoing', 'ended'),
      defaultValue: 'scheduled',
    },
    hostVideoOn: {
      type: Sequelize.BOOLEAN,
      defaultValue: true,
    },
    participantVideoOn: {
      type: Sequelize.BOOLEAN,
      defaultValue: true,
    },
    usePMI: {
      type: Sequelize.BOOLEAN,
      defaultValue: false,
    },
    startedAt: {
      type: Sequelize.DATE,
      allowNull: true,
    },
    endedAt: {
      type: Sequelize.DATE,
      allowNull: true,
    },
  });

  return Meeting;
};
