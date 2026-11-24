const { DataTypes } = require('sequelize');

/** Tabela associativa N:N entre produtos e categorias. */
module.exports = (sequelize) =>
  sequelize.define(
    'ProductCategory',
    {
      product_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        primaryKey: true,
        references: { model: 'products', key: 'id' },
        onDelete: 'CASCADE',
      },
      category_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        primaryKey: true,
        references: { model: 'categories', key: 'id' },
        onDelete: 'CASCADE',
      },
    },
    { tableName: 'product_categories', timestamps: false },
  );
