module.exports = (sequelize, Sequelize) => {
  const TeamMember = sequelize.define('teamMember', {
    id: {
      type: Sequelize.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    teamId: {
      type: Sequelize.INTEGER,
      allowNull: false,
    },
    userId: {
      type: Sequelize.INTEGER,
      allowNull: false,
    },
    role: {
      type: Sequelize.ENUM('admin', 'member'),
      defaultValue: 'member',
    },
  });

  return TeamMember;
};
