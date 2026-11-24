'use strict';

const bcrypt = require('bcrypt');

/**
 * Dados de demonstração: 1 usuário, categorias e produtos com opções.
 * Login de exemplo: admin@digitalstore.com / 123@123
 */
module.exports = {
  async up(queryInterface) {
    const now = new Date();

    await queryInterface.bulkInsert('users', [
      {
        id: 1,
        firstname: 'Admin',
        surname: 'Digital Store',
        email: 'admin@digitalstore.com',
        password: await bcrypt.hash('123@123', 10),
        created_at: now,
        updated_at: now,
      },
    ]);

    const categories = [
      ['Tênis', 'tenis', true],
      ['Corrida', 'corrida', true],
      ['Casual', 'casual', true],
      ['Ofertas', 'ofertas', true],
      ['Black Friday', 'black-friday', false],
    ];
    await queryInterface.bulkInsert(
      'categories',
      categories.map(([name, slug, useInMenu], index) => ({
        id: index + 1,
        name,
        slug,
        use_in_menu: useInMenu,
        created_at: now,
        updated_at: now,
      })),
    );

    const products = [
      ['K-Swiss V8 - Masculino', 200, 149.9, [1, 4]],
      ['Nike Air Jordan 1 Mid', 899.9, 749.9, [1, 5]],
      ['Adidas Ultraboost - Feminino', 699.9, 699.9, [2]],
      ['Puma Suede Classic', 349.9, 279.9, [3, 4]],
      ['Nike Revolution 7', 399.9, 399.9, [2]],
      ['Adidas Forum Low', 549.9, 429.9, [3, 5]],
    ];

    await queryInterface.bulkInsert(
      'products',
      products.map(([name, price, discount], index) => ({
        id: index + 1,
        enabled: true,
        name,
        slug: name
          .normalize('NFD')
          .replace(/[̀-ͯ]/g, '')
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)/g, ''),
        use_in_menu: false,
        stock: 10 + index,
        description: `Descrição do produto ${name}.`,
        price,
        price_with_discount: discount,
        created_at: now,
        updated_at: now,
      })),
    );

    await queryInterface.bulkInsert(
      'product_categories',
      products.flatMap(([, , , categoryIds], index) =>
        categoryIds.map((categoryId) => ({ product_id: index + 1, category_id: categoryId })),
      ),
    );

    await queryInterface.bulkInsert(
      'product_options',
      products.flatMap((_, index) => [
        { product_id: index + 1, title: 'Tamanho', shape: 'square', radius: 4, type: 'text', values: '39,40,41,42,43' },
        { product_id: index + 1, title: 'Cor', shape: 'circle', radius: 0, type: 'color', values: '#6FEEFF,#FF6969,#5E5E5E' },
      ]),
    );
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('product_options', null, {});
    await queryInterface.bulkDelete('product_categories', null, {});
    await queryInterface.bulkDelete('products', null, {});
    await queryInterface.bulkDelete('categories', null, {});
    await queryInterface.bulkDelete('users', null, {});
  },
};
