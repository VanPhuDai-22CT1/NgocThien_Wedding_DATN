import { DataTypes } from 'sequelize';
import sequelize from '../config/database';
import logger from './logger';

export const ensureSchema = async () => {
  const queryInterface = sequelize.getQueryInterface();
  for (const table of ['shopping_carts', 'order_items']) {
    const columns = await queryInterface.describeTable(table);
    if (!columns.selection) await queryInterface.addColumn(table, 'selection', { type: DataTypes.JSON, allowNull: true });
    if (table === 'shopping_carts' && !columns.selection_key) await queryInterface.addColumn(table, 'selection_key', { type: DataTypes.STRING(64), allowNull: false, defaultValue: '' });
  }
  const indexes: any = await queryInterface.showIndex('shopping_carts');
  // Different packages or event details must remain separate cart lines.
  if (!indexes.some((index: any) => index.name === 'cart_user_product_selection')) {
    await queryInterface.addIndex('shopping_carts', ['user_id', 'product_id', 'selection_key'], { unique: true, name: 'cart_user_product_selection' });
  }
  for (const index of indexes) {
    if (index.unique && index.fields.length === 2 && ['user_id', 'product_id'].every((field) => index.fields.some((item: any) => item.attribute === field))) await queryInterface.removeIndex('shopping_carts', index.name);
  }
  const usersTable = await queryInterface.describeTable('users');

  if (!usersTable.avatar) {
    await queryInterface.addColumn('users', 'avatar', {
      type: DataTypes.STRING(255),
      allowNull: true,
    });
    logger.info('✅ Added users.avatar column');
  }

  const ordersTable = await queryInterface.describeTable('orders');
  const orderColumns = {
    customer_name: { type: DataTypes.STRING(255), allowNull: true },
    event_date: { type: DataTypes.DATEONLY, allowNull: true },
    note: { type: DataTypes.TEXT, allowNull: true },
  };
  for (const [name, definition] of Object.entries(orderColumns)) {
    if (!ordersTable[name]) await queryInterface.addColumn('orders', name, definition);
  }
};
