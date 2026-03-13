module.exports = (sequelize, Sequelize) => {
  const Recording = sequelize.define('recording', {
    id: {
      type: Sequelize.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    meetingId: {
      type: Sequelize.INTEGER,
      allowNull: false,
    },
    hostId: {
      type: Sequelize.INTEGER,
      allowNull: false,
    },
    title: {
      type: Sequelize.STRING,
      allowNull: false,
    },
    fileUrl: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    duration: {
      type: Sequelize.INTEGER,
      defaultValue: 0,
    },
    fileSize: {
      type: Sequelize.BIGINT,
      defaultValue: 0,
    },
    status: {
      type: Sequelize.ENUM('processing', 'available', 'failed'),
      defaultValue: 'available',
    },
  });

  return Recording;
};
