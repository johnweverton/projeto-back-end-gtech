'use strict';

/** Requisito 06 — tabela associativa entre produtos e categorias (N:N). */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('product_categories', {
      product_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        primaryKey: true,
        references: { model: 'products', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      category_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        primaryKey: true,
        references: { model: 'categories', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
    });

    // A PK composta (product_id, category_id) já indexa por produto; este índice cobre a busca por categoria.
    await queryInterface.addIndex('product_categories', ['category_id']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('product_categories');
  },
};
