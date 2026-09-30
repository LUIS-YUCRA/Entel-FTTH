const { query } = require('../config/db');

class Clientes {

  static async create(data) {

    const {
      user_id,
      ci,
      phone,
      address
    } = data;

    const result = await query(
      `INSERT INTO customers
      (user_id, ci, phone, address)
      VALUES ($1,$2,$3,$4)
      RETURNING *`,
      [user_id, ci, phone, address]
    );

    return result.rows[0];
  }
   static async findAll() {

    const result = await query(
      `SELECT customers.*,
      users.full_name,
      users.email
      FROM customers
      INNER JOIN users
      ON users.id = customers.user_id`
    );

    return result.rows;
  }
}

module.exports = Clientes;