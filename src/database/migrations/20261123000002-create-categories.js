'use strict';

/** Requisito 02 — tabela de categorias. */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('categories', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      name: { type: Sequelize.STRING, allowNull: false },
      slug: { type: Sequelize.STRING, allowNull: false, unique: true },
      use_in_menu: { type: Sequelize.BOOLEAN, allowNull: true, defaultValue: false },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });

    // Acelera o filtro `use_in_menu=true` da busca de categorias.
    await queryInterface.addIndex('categories', ['use_in_menu']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('categories');
  },
};
