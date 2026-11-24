/**
 * Inicializa a conexão do Sequelize, registra os models e suas associações.
 */
const { Sequelize } = require('sequelize');
const dbConfig = require('../config/database');
const { env } = require('../config/env');

const config = dbConfig[env] || dbConfig.development;
const sequelize = new Sequelize(config.database, config.username, config.password, config);

const User = require('./User')(sequelize);
const Category = require('./Category')(sequelize);
const Product = require('./Product')(sequelize);
const ProductImage = require('./ProductImage')(sequelize);
const ProductOption = require('./ProductOption')(sequelize);
const ProductCategory = require('./ProductCategory')(sequelize);

// Associações
Product.hasMany(ProductImage, { as: 'images', foreignKey: 'product_id', onDelete: 'CASCADE' });
ProductImage.belongsTo(Product, { foreignKey: 'product_id' });

Product.hasMany(ProductOption, { as: 'options', foreignKey: 'product_id', onDelete: 'CASCADE' });
ProductOption.belongsTo(Product, { foreignKey: 'product_id' });

Product.belongsToMany(Category, {
  through: ProductCategory,
  as: 'categories',
  foreignKey: 'product_id',
  otherKey: 'category_id',
});
Category.belongsToMany(Product, {
  through: ProductCategory,
  as: 'products',
  foreignKey: 'category_id',
  otherKey: 'product_id',
});

module.exports = {
  sequelize,
  Sequelize,
  User,
  Category,
  Product,
  ProductImage,
  ProductOption,
  ProductCategory,
};
