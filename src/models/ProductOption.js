const { DataTypes } = require('sequelize');

/** Opções (variações) de um produto, ex.: tamanhos e cores. `values` é separado por vírgula. */
module.exports = (sequelize) =>
  sequelize.define(
    'ProductOption',
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      product_id: { type: DataTypes.INTEGER, allowNull: false },
      title: { type: DataTypes.STRING, allowNull: false },
      shape: { type: DataTypes.ENUM('square', 'circle'), allowNull: true, defaultValue: 'square' },
      radius: { type: DataTypes.INTEGER, allowNull: true, defaultValue: 0 },
      type: { type: DataTypes.ENUM('text', 'color'), allowNull: true, defaultValue: 'text' },
      values: { type: DataTypes.STRING, allowNull: false },
    },
    { tableName: 'product_options', timestamps: false },
  );
