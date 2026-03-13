module.exports = (sequelize, Sequelize) => {
  const Team = sequelize.define('team', {
    id: {
      type: Sequelize.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    name: {
      type: Sequelize.STRING,
      allowNull: false,
    },
    description: {
      type: Sequelize.TEXT,
      defaultValue: '',
    },
    createdBy: {
      type: Sequelize.INTEGER,
      allowNull: false,
    },
    avatarColor: {
      type: Sequelize.STRING,
      defaultValue: '#6366f1',
    },
  });

  return Team;
};
